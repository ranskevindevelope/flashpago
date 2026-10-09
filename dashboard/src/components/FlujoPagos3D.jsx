import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BarChart3, Brain, Camera, Check, Landmark, MessageCircle } from 'lucide-react';
import './FlujoPagos3D.css';

// "Así de fácil funciona": el recorrido de un comprobante, en el orden real, en 3D hecho solo con CSS.
// Escritorio: plataforma en perspectiva que se inclina con el mouse. Celular: escalera vertical con letra grande.
// Un comprobante bueno pasa por las cinco estaciones; otro igual (repetido) se frena en la IA.

const ESTACIONES = [
  { clave: 'comprobante', Icono: Camera, nombre: 'Comprobante', desc: 'El empleado fotografía el comprobante que le muestra el cliente.', ok: 'Foto del pago' },
  { clave: 'whatsapp', Icono: MessageCircle, nombre: 'WhatsApp', desc: 'La foto llega al bot de FlashPago. No hay que instalar nada.', ok: 'Llega al bot' },
  { clave: 'ia', Icono: Brain, nombre: 'IA y antifraude', desc: 'Lee monto, banco, referencia y fecha, y revisa que no esté repetido.', ok: 'Lee $48.500 · Nequi', mal: 'Repetido: no pasa' },
  { clave: 'banco', Icono: Landmark, nombre: 'Banco', desc: 'Confirma que el pago de verdad llegó a la cuenta del negocio.', ok: 'Pago confirmado ✓' },
  { clave: 'registro', Icono: BarChart3, nombre: 'Registro y reportes', desc: 'Queda en tu panel, con el cierre del día listo.', ok: 'Registrado en tu panel' },
];

// ─── Línea de tiempo (segundos) ───
const CICLO = 15.6;
// Paradas [llega, sale] de cada comprobante en cada estación. A: el bueno. B: el repetido, que se frena en la IA.
const A = { entra: 0.3, paradas: [[0.9, 1.7], [2.5, 3.7], [4.5, 6.1], [6.9, 8.3], [9.1, 9.4]], fin: 10.1 };
const B = { entra: 10.2, paradas: [[10.6, 10.6], [11.2, 11.2], [11.8, 13.3]], fin: 14.0 };
// Cuándo se enciende cada estación (también cuando B pasa de largo por las dos primeras).
const ACTIVA = [[[0.9, 1.7], [10.5, 10.9]], [[2.5, 3.7], [11.1, 11.5]], [[4.5, 6.1]], [[6.9, 8.3]], [[9.1, 10.9]]];
const MAL = [[11.8, 13.3]];
const BURBUJA = [[[1.0, 1.8]], [[2.6, 3.8]], [[4.6, 6.2]], [[7.0, 8.4]], [[9.3, 11.0]]];
const BURBUJA_MAL = [[11.9, 13.4]];

const pct = (t) => `${((t / CICLO) * 100).toFixed(3)}%`;

// Fotogramas clave de un elemento con un estado de reposo y otros que se aplican en ciertas ventanas de tiempo.
// `grupos`: [{ lista: [[desde, hasta], …], estilo }]. Las ventanas no deben solaparse.
function estados(nombre, grupos, reposo, transicion = 0.3) {
  const ventanasOrdenadas = grupos.flatMap(({ lista, estilo }) => lista.map(([a, b]) => ({ a, b, estilo }))).sort((x, y) => x.a - y.a);
  const p = [[0, reposo]];
  for (const { a, b, estilo } of ventanasOrdenadas) {
    const s = Math.min(transicion, (b - a) / 2);
    p.push([a, reposo], [a + s, estilo], [b - s, estilo], [b, reposo]);
  }
  p.push([CICLO, reposo]);
  return `@keyframes ${nombre}{${p.map(([t, e]) => `${pct(t)}{${e}}`).join('')}}`;
}
const ventanas = (nombre, lista, encendido, apagado) => estados(nombre, [{ lista, estilo: encendido }], apagado);

// El comprobante viaja de estación en estación; sus posiciones (--y1 … --y5) las pone cada versión.
function recorrido(nombre, p) {
  const pos = (i) => `transform:translate3d(0,var(--y${i + 1},0px),0);`;
  const b = ['0%{' + pos(0) + '}'];
  p.paradas.forEach(([llega, sale], i) => {
    b.push(`${pct(llega)}{${pos(i)}animation-timing-function:ease-in-out}`);
    b.push(`${pct(sale)}{${pos(i)}animation-timing-function:ease-in-out}`);
  });
  b.push('100%{' + pos(p.paradas.length - 1) + '}');
  return `@keyframes ${nombre}{${b.join('')}}`;
}

// Aparece al entrar y se deshace al final (A: se hunde en el registro; B: se rompe en rojo).
function aparicion(nombre, p, solo) {
  const llega = p.paradas[0][0];
  const quedaHasta = p.paradas[p.paradas.length - 1][1];
  const fuera = solo ? 'opacity:0' : 'opacity:0;transform:scale(.25) translateY(18px)';
  const dentro = solo ? 'opacity:1' : 'opacity:1;transform:scale(1) translateY(0)';
  const fin = solo ? 'opacity:0' : nombre.endsWith('b') ? 'opacity:0;transform:scale(1.3) translateY(-8px)' : 'opacity:0;transform:scale(.5) translateY(30px)';
  return `@keyframes ${nombre}{0%{${fuera}}${pct(p.entra)}{${fuera}}${pct(llega)}{${dentro}}${pct(quedaHasta)}{${dentro}}${pct(p.fin)}{${fin}}100%{${fin}}}`;
}

// El repetido tiembla y se pone rojo cuando la IA lo frena.
const sacudida = () => {
  const [llega] = B.paradas[2];
  const t = (k) => pct(llega + k);
  return `@keyframes fp3d-sacude-b{0%,${t(0)}{translate:0 0}${t(0.1)}{translate:-6px 0}${t(0.2)}{translate:6px 0}${t(0.3)}{translate:-5px 0}${t(0.4)}{translate:4px 0}${t(0.5)}{translate:0 0}100%{translate:0 0}}`;
};
const rojo = () => {
  const [llega] = B.paradas[2];
  return `@keyframes fp3d-rojo-b{0%,${pct(llega)}{box-shadow:var(--sombra-recibo),0 0 0 2px rgba(255,183,77,.9)}${pct(llega + 0.35)},${pct(B.fin - 0.2)}{box-shadow:var(--sombra-recibo),0 0 0 3px #e5484d,0 0 24px rgba(229,57,53,.85)}100%{box-shadow:var(--sombra-recibo),0 0 0 3px #e5484d}}`;
};

// Todo el CSS que depende de los tiempos de arriba. Se genera una sola vez.
const CSS_TIEMPOS = (() => {
  let css = '';
  const apagadoBurbuja = 'opacity:0;transform:translateX(-50%) translateY(10px)';
  const encendidoBurbuja = 'opacity:1;transform:translateX(-50%) translateY(0)';
  const apagadoRes = 'opacity:0;transform:translateY(6px)';
  const encendidoRes = 'opacity:1;transform:translateY(0)';
  const REPOSO_RES = 'opacity:.4'; // el resultado de cada tarjeta se ve apagado y se enciende al llegar el comprobante
  for (let n = 1; n <= 5; n++) {
    css += ventanas(`fp3d-act-${n}`, ACTIVA[n - 1], 'opacity:1', 'opacity:0');
    css += ventanas(`fp3d-ico-${n}`, ACTIVA[n - 1], 'color:#fff;translate:0 -9px', 'color:#FFB74D;translate:0 0');
    css += ventanas(`fp3d-bur-${n}`, BURBUJA[n - 1], encendidoBurbuja, apagadoBurbuja);
    // En la tarjeta de la IA, el resultado normal se oculta mientras se muestra el del repetido (ocupan el mismo sitio).
    css += estados(`fp3d-res-${n}`, [{ lista: BURBUJA[n - 1], estilo: 'opacity:1' }, ...(n === 3 ? [{ lista: BURBUJA_MAL, estilo: 'opacity:0' }] : [])], REPOSO_RES);
    const sel = `[data-n="${n}"]`;
    css += `.fp3d-est${sel} .fp3d-brillo-ok,.fp3d-est${sel} .fp3d-chip-icono::before,.fp3d-est${sel} .fp3d-poste::after,.fp3d-tarjeta${sel} .fp3d-tarjeta-brillo,.fp3d-tarjeta${sel} .fp3d-tarjeta-icono::before,.fp3d-tarjeta${sel} .fp3d-punto{animation:fp3d-act-${n} var(--ciclo) linear infinite}`;
    css += `.fp3d-est${sel} .fp3d-chip-icono,.fp3d-tarjeta${sel} .fp3d-tarjeta-icono{animation:fp3d-ico-${n} var(--ciclo) ease-in-out infinite}`;
    css += `.fp3d-est${sel} .fp3d-burbuja-ok{animation:fp3d-bur-${n} var(--ciclo) ease-out infinite}`;
    css += `.fp3d-tarjeta${sel} .fp3d-res-ok{animation:fp3d-res-${n} var(--ciclo) ease-out infinite}`;
  }
  css += ventanas('fp3d-mal', MAL, 'opacity:1', 'opacity:0');
  css += ventanas('fp3d-bur-mal', BURBUJA_MAL, encendidoBurbuja, apagadoBurbuja);
  css += ventanas('fp3d-res-mal', BURBUJA_MAL, encendidoRes, apagadoRes);
  css += `.fp3d-est[data-n="3"] .fp3d-brillo-mal,.fp3d-est[data-n="3"] .fp3d-chip-icono::after,.fp3d-tarjeta[data-n="3"] .fp3d-tarjeta-brillo-mal,.fp3d-tarjeta[data-n="3"] .fp3d-tarjeta-icono::after{animation:fp3d-mal var(--ciclo) linear infinite}`;
  css += `.fp3d-burbuja-mal{animation:fp3d-bur-mal var(--ciclo) ease-out infinite}.fp3d-res-mal{animation:fp3d-res-mal var(--ciclo) ease-out infinite}`;
  css += recorrido('fp3d-paq-a', A) + recorrido('fp3d-paq-b', B);
  css += aparicion('fp3d-recibo-a', A) + aparicion('fp3d-recibo-b', B);
  css += aparicion('fp3d-sombra-a', A, true) + aparicion('fp3d-sombra-b', B, true);
  css += sacudida() + rojo();
  css += `.fp3d-paq-a,.fp3d-paq-m-a{animation:fp3d-paq-a var(--ciclo) linear infinite}.fp3d-paq-b,.fp3d-paq-m-b{animation:fp3d-paq-b var(--ciclo) linear infinite}`;
  css += `.fp3d-paq-a .fp3d-recibo,.fp3d-paq-m-a .fp3d-recibo{animation:fp3d-recibo-a var(--ciclo) linear infinite}`;
  css += `.fp3d-paq-b .fp3d-recibo,.fp3d-paq-m-b .fp3d-recibo{animation:fp3d-recibo-b var(--ciclo) linear infinite,fp3d-rojo-b var(--ciclo) linear infinite,fp3d-sacude-b var(--ciclo) linear infinite}`;
  css += `.fp3d-paq-a .fp3d-paq-sombra{animation:fp3d-sombra-a var(--ciclo) linear infinite}.fp3d-paq-b .fp3d-paq-sombra{animation:fp3d-sombra-b var(--ciclo) linear infinite}`;
  return css;
})();

// ─── Utilidades ───
function useMediaQuery(consulta) {
  const [coincide, setCoincide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches);
  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const cambia = () => setCoincide(mq.matches);
    cambia();
    mq.addEventListener('change', cambia);
    return () => mq.removeEventListener('change', cambia);
  }, [consulta]);
  return coincide;
}

// Pausa todas las animaciones mientras la sección no se ve en pantalla.
function usePausaFuera(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observador = new IntersectionObserver(([e]) => { el.dataset.pausa = e.isIntersecting ? '0' : '1'; }, { rootMargin: '120px' });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
}

const RX = 58;
const RZ = -62;
const limita = (n, a, b) => Math.min(b, Math.max(a, n));

// Con mouse, la plataforma se inclina un poco hacia el cursor. No se activa con pantalla táctil ni con "reducir movimiento".
function useInclinacion(ref, desactivada) {
  useEffect(() => {
    const el = ref.current;
    if (!el || desactivada || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const seccion = el.closest('section') || el;
    let objX = 0, objY = 0, x = 0, y = 0, cuadro = 0;
    const aplica = () => {
      x += (objX - x) * 0.09;
      y += (objY - y) * 0.09;
      const quieto = Math.abs(objX - x) < 0.002 && Math.abs(objY - y) < 0.002;
      if (quieto) { x = objX; y = objY; }
      el.style.setProperty('--rz', (RZ + x * 9).toFixed(2));
      el.style.setProperty('--rx', (RX - y * 5).toFixed(2));
      cuadro = quieto ? 0 : requestAnimationFrame(aplica);
    };
    const mueve = (e) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      objX = limita((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
      objY = limita((e.clientY - (r.top + r.height / 2)) / 360, -1, 1);
      if (!cuadro) cuadro = requestAnimationFrame(aplica);
    };
    const sale = () => { objX = 0; objY = 0; if (!cuadro) cuadro = requestAnimationFrame(aplica); };
    seccion.addEventListener('pointermove', mueve);
    seccion.addEventListener('pointerleave', sale);
    return () => {
      seccion.removeEventListener('pointermove', mueve);
      seccion.removeEventListener('pointerleave', sale);
      cancelAnimationFrame(cuadro);
    };
  }, [ref, desactivada]);
}

// ─── Escritorio: plataforma 3D ───
const POS_Y = [-440, -220, 0, 220, 440];
const ESTILO_POS = Object.fromEntries(POS_Y.map((y, i) => [`--y${i + 1}`, `${y}px`]));

// Capas apiladas: dan grosor a una forma redondeada sin tener que armar caras.
function Capas({ n, paso, clase, base = 0 }) {
  return Array.from({ length: n }, (_, k) => (
    <div key={k} className={`${clase} ${k === n - 1 ? `${clase}-top` : `${clase}-capa`}`} style={{ '--k': k, transform: `translateZ(${base + (k - (n - 1)) * paso}px)` }} />
  ));
}

function Estacion({ e, i }) {
  const { Icono } = e;
  return (
    <div className="fp3d-3d fp3d-est" data-n={i + 1} style={{ transform: `translate3d(0, var(--y${i + 1}), 0)` }}>
      <Capas n={3} paso={3} clase="fp3d-pad" base={8} />
      <div className="fp3d-pad-brillo fp3d-brillo-ok" />
      {e.mal && <div className="fp3d-pad-brillo fp3d-brillo-mal" />}
      <div className="fp3d-sombra-chip" />
      <div className="fp3d-cartel fp3d-cartel-chip">
        <div className="fp3d-chip">
          <div className="fp3d-burbuja fp3d-burbuja-ok">{e.ok}</div>
          {e.mal && <div className="fp3d-burbuja fp3d-burbuja-mal">{e.mal}</div>}
          <div className="fp3d-chip-tip">{e.desc}</div>
          <div className="fp3d-chip-icono"><Icono size={32} strokeWidth={1.9} /></div>
          <div className="fp3d-chip-nombre">{e.nombre}</div>
          <div className="fp3d-poste" />
        </div>
      </div>
    </div>
  );
}

function Recibo() {
  return (
    <div className="fp3d-recibo">
      <div className="fp3d-recibo-cab"><Check size={10} strokeWidth={3.6} /> Pago</div>
      <div className="fp3d-recibo-monto">$48.500</div>
      <i /><i className="fp3d-recibo-corta" />
    </div>
  );
}

function Paquete({ clave }) {
  return (
    <div className={`fp3d-3d fp3d-paq fp3d-paq-${clave}`}>
      <div className="fp3d-paq-sombra" />
      <div className="fp3d-cartel fp3d-cartel-paq"><Recibo /></div>
    </div>
  );
}

function Plataforma({ quieto }) {
  const ref = useRef(null);
  useInclinacion(ref, quieto);
  // La escena se diseñó para 1180 px de ancho: se escala para que quepa en pantallas menores.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const mide = () => el.style.setProperty('--esc', limita(el.clientWidth / 1180, 0.5, 1.1).toFixed(3));
    mide();
    const ro = new ResizeObserver(mide);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="fp3d" aria-hidden="true" style={ESTILO_POS}>
      <div className="fp3d-camara">
        <div className="fp3d-3d">
          <div className="fp3d-losa-sombra" />
          <Capas n={8} paso={3.5} clase="fp3d-losa" />
          <div className="fp3d-ruta" />
        </div>
        {ESTACIONES.map((e, i) => <Estacion key={e.clave} e={e} i={i} />)}
        <Paquete clave="a" />
        <Paquete clave="b" />
      </div>
    </div>
  );
}

// ─── Celular: escalera vertical ───
function Escalera() {
  const ref = useRef(null);
  // El comprobante baja por el riel: se mide dónde queda el ícono de cada tarjeta.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const mide = () => {
      const base = el.getBoundingClientRect().top;
      el.querySelectorAll('.fp3d-tarjeta-icono').forEach((ico, i) => {
        const r = ico.getBoundingClientRect();
        el.style.setProperty(`--y${i + 1}`, `${(r.top + r.height / 2 - base).toFixed(1)}px`);
      });
    };
    mide();
    const ro = new ResizeObserver(mide);
    ro.observe(el);
    document.fonts?.ready.then(mide);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="fp3d-escalera">
      <span className="fp3d-riel" aria-hidden="true" />
      <div className="fp3d-paq-m fp3d-paq-m-a" aria-hidden="true"><Recibo /></div>
      <div className="fp3d-paq-m fp3d-paq-m-b" aria-hidden="true"><Recibo /></div>
      <ol className="fp3d-lista">
        {ESTACIONES.map((e, i) => {
          const { Icono } = e;
          return (
            <li key={e.clave} className="fp3d-tarjeta" data-n={i + 1}>
              <span className="fp3d-punto" aria-hidden="true" />
              <span className="fp3d-tarjeta-brillo" aria-hidden="true" />
              {e.mal && <span className="fp3d-tarjeta-brillo fp3d-tarjeta-brillo-mal" aria-hidden="true" />}
              <span className="fp3d-tarjeta-icono"><Icono size={25} strokeWidth={1.9} /></span>
              <div className="fp3d-tarjeta-texto">
                <h3>{e.nombre}</h3>
                <p>{e.desc}</p>
                <div className="fp3d-res-slot" aria-hidden="true">
                  <span className="fp3d-res fp3d-res-ok">{e.ok}</span>
                  {e.mal && <span className="fp3d-res fp3d-res-mal">{e.mal}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function FlujoPagos3D() {
  const movil = useMediaQuery('(max-width: 899px)');
  const quieto = useMediaQuery('(prefers-reduced-motion: reduce)');
  const raiz = useRef(null);
  usePausaFuera(raiz);
  return (
    <div ref={raiz} className="fp3d-raiz" data-quieto={quieto ? '1' : '0'} style={{ '--ciclo': `${CICLO}s` }}>
      <style>{CSS_TIEMPOS}</style>
      {movil ? <Escalera /> : (
        <>
          <Plataforma quieto={quieto} />
          <ol className="fp3d-lectores">
            {ESTACIONES.map((e) => <li key={e.clave}><strong>{e.nombre}.</strong> {e.desc}</li>)}
          </ol>
        </>
      )}
    </div>
  );
}
