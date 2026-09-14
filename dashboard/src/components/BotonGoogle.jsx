import { useEffect, useRef, useState } from 'react';

// Botón de Google (usado en Login y Registro). El backend decide login vs.
// registro nuevo según si el correo ya existe (POST /api/auth/google); este
// componente solo consigue el token y pasa la respuesta.
export default function BotonGoogle({ onResultado, ancho = 360 }) {
  const contenedorRef = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [noDisponible, setNoDisponible] = useState(false);

  // Ref para no depender de la identidad de `onResultado` (llega nueva en
  // cada render y reconstruiría el efecto de abajo en cada tecla escrita).
  const onResultadoRef = useRef(onResultado);
  useEffect(() => { onResultadoRef.current = onResultado; }, [onResultado]);

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
        onResultadoRef.current(data);
      } catch (err) {
        onResultadoRef.current({ ok: false, error: 'Error de conexión con Google' });
      }
    };

    // Google solo acepta ancho fijo en px (no %); se mide el espacio real
    // para no desbordar en móvil, limitado al rango que soporta su botón.
    const anchoEfectivo = () => {
      const disponible = contenedorRef.current?.getBoundingClientRect().width || ancho;
      return Math.max(200, Math.min(ancho, Math.floor(disponible)));
    };

    // Se dibuja UNA sola vez (Google desaconseja re-render, causaba parpadeo
    // en cada resize). requestAnimationFrame espera a que el layout se
    // asiente antes de medir el ancho.
    const dibujar = () => {
      if (cancelado || !contenedorRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: manejarCredencial });
      window.google.accounts.id.renderButton(contenedorRef.current, {
        theme: 'outline', size: 'large', width: anchoEfectivo(), text: 'continue_with', logo_alignment: 'center',
      });
    };

    const montar = () => requestAnimationFrame(dibujar);

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
  }, [clientId, ancho]);

  // Sin Client ID configurado (no se activó en el backend): no se muestra
  // nada, en vez de un botón roto que no hace nada al hacerle clic.
  if (noDisponible) return null;

  // El contenedor se reserva desde el primer render, con clientId o sin él
  // — así el espacio ya existe cuando resuelve /api/config-publica y carga
  // el script de Google, y no hay un salto de 0 a 44px a mitad de página.
  return (
    <div
      ref={contenedorRef}
      className="boton-google-hover"
      style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: 44 }}
    />
  );
}
