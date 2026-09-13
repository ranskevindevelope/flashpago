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
  // efecto de abajo, éste se reconstruía por completo (borra y vuelve a
  // dibujar el botón de Google desde cero) en cada tecla que se escribiera
  // en CUALQUIER campo del formulario, no solo al redimensionar. Guardarla
  // en un ref deja el efecto sin depender de su identidad.
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
    // aunque el ancho real no hubiera cambiado. El margen de 20px además
    // ignora el "resize" real pero chico que dispara la barra de scroll al
    // aparecer/desaparecer (~15-17px) — por ejemplo justo cuando el botón
    // recién insertado hace crecer el alto de la página.
    const TOLERANCIA_PX = 20;
    let ultimoAncho = null;
    const renderizar = () => {
      if (cancelado || !contenedorRef.current || !window.google?.accounts?.id) return;
      const nuevoAncho = anchoEfectivo();
      if (ultimoAncho !== null && Math.abs(nuevoAncho - ultimoAncho) < TOLERANCIA_PX) return;
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
    // Con ResizeObserver en vez de "resize" de window: solo avisa cuando el
    // propio contenedor cambia de tamaño (no cualquier resize de la ventana,
    // como el que dispara el teclado del celular al abrirse), y el navegador
    // agrupa varios cambios seguidos en un solo aviso en vez de dispararlos
    // sueltos — eso evitaba que, justo al abrir la página, el botón se
    // redibujara 2-3 veces mientras el layout terminaba de acomodarse
    // (aparece la barra de scroll, cargan las fuentes, etc.).
    const observer = new ResizeObserver(() => renderizar());
    if (contenedorRef.current) observer.observe(contenedorRef.current);
    return () => { cancelado = true; observer.disconnect(); };
  }, [clientId, ancho]);

  // Sin Client ID configurado (todavía no se activó en el backend): no se
  // muestra nada, en vez de un botón roto que no hace nada al hacerle clic.
  if (noDisponible || !clientId) return null;

  return <div ref={contenedorRef} style={{ display: 'flex', justifyContent: 'center', width: '100%' }} />;
}
