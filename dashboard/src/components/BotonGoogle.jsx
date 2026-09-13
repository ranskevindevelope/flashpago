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

    // Google no acepta un ancho en porcentaje, solo un número fijo de px.
    // Si se usa `ancho` tal cual en pantallas angostas, el botón se sale del
    // contenedor y desborda el layout en móvil (se ve cortado a la derecha).
    // Por eso se mide el espacio real disponible y se limita entre el
    // mínimo (200) y máximo (400) que soporta el botón de Google.
    const anchoEfectivo = () => {
      const disponible = contenedorRef.current?.getBoundingClientRect().width || ancho;
      return Math.max(200, Math.min(ancho, Math.floor(disponible)));
    };

    // En móvil, abrir/cerrar el teclado dispara "resize" (cambia el alto de
    // la ventana, no el ancho) — sin este chequeo, el botón se borraba y
    // volvía a dibujar cada vez que tocabas cualquier campo del formulario,
    // aunque el ancho real no hubiera cambiado.
    let ultimoAncho = null;
    const renderizar = () => {
      if (cancelado || !contenedorRef.current || !window.google?.accounts?.id) return;
      const nuevoAncho = anchoEfectivo();
      if (nuevoAncho === ultimoAncho) return;
      ultimoAncho = nuevoAncho;
      contenedorRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(contenedorRef.current, {
        theme: 'outline', size: 'large', width: nuevoAncho, text: 'continue_with', logo_alignment: 'center',
      });
    };

    const montar = () => {
      if (cancelado || !contenedorRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: manejarCredencial });
      renderizar();
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

    // Reajusta el ancho si cambia el tamaño de pantalla (ej: rotar el celular).
    window.addEventListener('resize', renderizar);
    return () => { cancelado = true; window.removeEventListener('resize', renderizar); };
  }, [clientId, ancho, onResultado]);

  // Sin Client ID configurado (todavía no se activó en el backend): no se
  // muestra nada, en vez de un botón roto que no hace nada al hacerle clic.
  if (noDisponible || !clientId) return null;

  return <div ref={contenedorRef} style={{ display: 'flex', justifyContent: 'center', width: '100%' }} />;
}
