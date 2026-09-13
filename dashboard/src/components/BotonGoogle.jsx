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

  // `onResultado` llega como función nueva en cada render del padre (Login/
  // Registro no la envuelven en useCallback) — si quedara en las deps del
  // efecto de abajo, éste se reconstruía por completo en cada tecla que se
  // escribiera en cualquier campo del formulario. Guardarla en un ref deja
  // el efecto sin depender de su identidad.
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

    // Google no acepta un ancho en porcentaje, solo un número fijo de px.
    // Si se usa `ancho` tal cual en pantallas angostas, el botón se sale del
    // contenedor y desborda el layout en móvil. Por eso se mide el espacio
    // real disponible una sola vez y se limita entre el mínimo (200) y
    // máximo (400) que soporta el botón de Google.
    const anchoEfectivo = () => {
      const disponible = contenedorRef.current?.getBoundingClientRect().width || ancho;
      return Math.max(200, Math.min(ancho, Math.floor(disponible)));
    };

    // Google mismo desaconseja llamar initialize()/renderButton() más de una
    // vez sobre el mismo elemento — volver a redibujarlo (como se hacía
    // antes, reaccionando a cada resize) es justo lo que causaba que el
    // botón parpadeara/temblara. Por eso ahora se dibuja UNA sola vez, y ya:
    // ni el teclado del celular, ni la barra de scroll, ni nada más lo
    // vuelve a tocar. requestAnimationFrame espera un frame a que el layout
    // esté asentado antes de medir, para no quedarse con un ancho de 0 o
    // incorrecto tomado a mitad de un reflow.
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

  // Sin Client ID configurado (todavía no se activó en el backend): no se
  // muestra nada, en vez de un botón roto que no hace nada al hacerle clic.
  if (noDisponible || !clientId) return null;

  // minHeight fijo (alto real del botón "large" de Google): reserva el
  // espacio desde antes de que el iframe termine de cargar su propio ícono
  // y su fuente, para que ese ajuste interno no empuje el resto de la
  // página.
  return <div ref={contenedorRef} style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: 44 }} />;
}
