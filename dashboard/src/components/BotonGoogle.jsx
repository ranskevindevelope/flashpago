import { useEffect, useRef, useState } from 'react';

// Botón de "Iniciar sesión con Google" (Google Identity Services) — se usa
// igual en Login y Registro. El backend decide si es un inicio de sesión o
// el arranque de un registro nuevo según si el correo ya existe (ver
// POST /api/auth/google); este componente solo consigue el token de Google
// y le pasa la respuesta del servidor a quien lo use.
export default function BotonGoogle({ onResultado, ancho = 360 }) {
  const contenedorRef = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [noDisponible, setNoDisponible] = useState(false);

  useEffect(() => {
    fetch('/api/config-publica')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.googleClientId) setClientId(data.googleClientId);
        else setNoDisponible(true);
      })
      .catch(() => setNoDisponible(true));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelado = false;

    const manejarCredencial = async (respuesta) => {
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: respuesta.credential }),
        });
        const data = await res.json();
        onResultado(data);
      } catch (err) {
        onResultado({ ok: false, error: 'Error de conexión con Google' });
      }
    };

    const montar = () => {
      if (cancelado || !contenedorRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: manejarCredencial });
      window.google.accounts.id.renderButton(contenedorRef.current, {
        theme: 'outline', size: 'large', width: ancho, text: 'continue_with', logo_alignment: 'center',
      });
    };

    if (window.google?.accounts?.id) {
      montar();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = montar;
      document.head.appendChild(script);
    }

    return () => { cancelado = true; };
  }, [clientId, ancho, onResultado]);

  // Sin Client ID configurado (todavía no se activó en el backend): no se
  // muestra nada, en vez de un botón roto que no hace nada al hacerle clic.
  if (noDisponible || !clientId) return null;

  return <div ref={contenedorRef} style={{ display: 'flex', justifyContent: 'center' }} />;
}
