import React, { useCallback, useEffect, useState } from 'react';
import { Landmark, MessageCircle, BarChart3, Sparkles, ShieldCheck, Clock } from 'lucide-react';
import './PanelMarca.css';

// Panel de marca de las pantallas de acceso (login y recuperar contraseña): cae un rayo, aparece el logo
// y la energía se reparte por la red. Se ve completo la primera vez de la sesión; después queda en su
// estado final. Con "reducir movimiento" nunca se anima. Un clic en el logo o en la mascota: otro rayo.
const CLAVE_SESION = 'fp_intro_marca';

const sinMovimiento = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function yaVista() {
  try { return sessionStorage.getItem(CLAVE_SESION) === '1'; } catch { return false; }
}

function useIntro() {
  const [animar, setAnimar] = useState(() => !yaVista() && !sinMovimiento());
  const [clave, setClave] = useState(0);
  useEffect(() => {
    try { sessionStorage.setItem(CLAVE_SESION, '1'); } catch { /* sin almacenamiento: se anima siempre */ }
  }, []);
  const reproducir = useCallback(() => {
    if (sinMovimiento()) return;
    setAnimar(true);
    setClave((c) => c + 1);
  }, []);
  return { animar, clave, reproducir };
}

// Trazo del rayo en un lienzo de 200×700; la punta (abajo, al centro) cae sobre el centro del logo.
const TRONCO = 'M112,0 L92,70 L124,140 L84,236 L120,320 L80,420 L114,500 L90,590 L100,700';
const RAMAS = ['M120,320 L158,360 L150,410', 'M84,236 L48,292 L58,338', 'M114,500 L148,540 L142,584', 'M92,70 L64,110'];

function Rayo() {
  return (
    <svg className="pm-rayo" viewBox="0 0 200 700" aria-hidden="true">
      {['pm-r-brillo', 'pm-r-medio', 'pm-r-nucleo'].map((capa) => (
        <g key={capa} className={capa}>
          <path className="pm-r-tronco" d={TRONCO} pathLength="1" />
          {RAMAS.map((d, i) => <path key={i} className="pm-r-rama" style={{ '--i': i }} d={d} pathLength="1" />)}
        </g>
      ))}
    </svg>
  );
}

const CHISPAS = [
  { x: -90, y: -60 }, { x: 85, y: -55 }, { x: -70, y: 75 }, { x: 95, y: 60 }, { x: -45, y: -95 },
  { x: 55, y: 88 }, { x: -105, y: 12 }, { x: 108, y: -14 }, { x: 0, y: -110 }, { x: -20, y: 100 },
];

const NODOS = [
  { Icono: Landmark, texto: 'Banco', x: -205, y: -78 },
  { Icono: MessageCircle, texto: 'WhatsApp', x: 205, y: -78 },
  { Icono: BarChart3, texto: 'Panel', x: -205, y: 78 },
  { Icono: Sparkles, texto: 'IA', x: 205, y: 78 },
];

// Red que se enciende desde el logo hacia el banco, WhatsApp, el panel y la IA.
function Red() {
  return (
    <div className="pm-red" aria-hidden="true">
      <svg className="pm-red-lineas" viewBox="0 0 520 300">
        {NODOS.map((n, i) => (
          <g key={n.texto}>
            <line className="pm-linea" x1="260" y1="150" x2={260 + n.x} y2={150 + n.y} />
            <line className="pm-pulso" style={{ '--i': i }} x1="260" y1="150" x2={260 + n.x} y2={150 + n.y} pathLength="1" />
          </g>
        ))}
      </svg>
      {NODOS.map((n, i) => (
        <div key={n.texto} className="pm-nodo" style={{ left: 260 + n.x, top: 150 + n.y, '--i': i, '--dx': `${-n.x * 0.3}px`, '--dy': `${-n.y * 0.3}px` }}>
          <span className="pm-nodo-icono"><n.Icono size={20} /></span>
          <span className="pm-nodo-texto">{n.texto}</span>
        </div>
      ))}
    </div>
  );
}

function Arco({ clase }) {
  return (
    <svg className={`pm-arco ${clase}`} viewBox="0 0 40 40" aria-hidden="true">
      <polyline points="2,36 14,22 9,20 24,7 19,5 38,2" />
    </svg>
  );
}

function LogoRayo({ tam, animar, red, onClick }) {
  return (
    <div className="pm-logo-wrap" style={{ '--t': `${tam}px` }}>
      {red && <Red />}
      {animar && (
        <>
          <Rayo />
          <div className="pm-impacto" />
          <div className="pm-onda pm-onda-1" />
          <div className="pm-onda pm-onda-2" />
          {CHISPAS.map((c, i) => (
            <i key={i} className={i % 3 === 0 ? 'pm-chispa pm-chispa-clara' : 'pm-chispa'}
              style={{ '--sx': `${(c.x * tam) / 140}px`, '--sy': `${(c.y * tam) / 140}px`, '--i': i }} />
          ))}
        </>
      )}
      <button type="button" className="pm-logo" onClick={onClick} aria-label="FlashPago" title="¿Otro rayo?">
        <img src="/logo-320.webp" alt="" width="320" height="320" decoding="async" />
      </button>
      <Arco clase="pm-arco-1" />
      <Arco clase="pm-arco-2" />
    </div>
  );
}

// "FlashPago" letra por letra: las cinco primeras (Flash) salen cargadas de energía.
function Marca({ clase = '' }) {
  return (
    <h2 className={`pm-marca ${clase}`} aria-label="FlashPago">
      {'FlashPago'.split('').map((l, i) => (
        <span key={i} aria-hidden="true" className={i < 5 ? 'pm-letra pm-letra-flash' : 'pm-letra'} style={{ '--i': i }}>{l}</span>
      ))}
    </h2>
  );
}

function Decoracion() {
  return (
    <>
      <div className="pm-circulo" style={{ top: '-15%', right: '-15%', width: 300, height: 300, borderColor: 'rgba(245,124,0,0.08)' }} />
      <div className="pm-circulo" style={{ top: '-5%', right: '-5%', width: 250, height: 250, borderColor: 'rgba(245,124,0,0.12)' }} />
      <div className="pm-circulo" style={{ bottom: '-20%', left: '-10%', width: 350, height: 350, borderColor: 'rgba(245,124,0,0.06)' }} />
      <div className="pm-circulo" style={{ bottom: '-10%', left: '0%', width: 280, height: 280, borderColor: 'rgba(245,124,0,0.1)' }} />
      {[
        { top: '20%', left: '15%', t: 6, c: 'rgba(245,124,0,0.4)' }, { top: '35%', right: '20%', t: 4, c: 'rgba(245,124,0,0.3)' },
        { bottom: '25%', left: '25%', t: 5, c: 'rgba(245,124,0,0.35)' }, { top: '15%', right: '35%', t: 3, c: 'rgba(255,183,77,0.4)' },
        { bottom: '40%', right: '15%', t: 7, c: 'rgba(245,124,0,0.2)' }, { top: '60%', left: '10%', t: 4, c: 'rgba(255,183,77,0.3)' },
      ].map(({ t, c, ...pos }, i) => (
        <div key={i} className="pm-punto" style={{ ...pos, width: t, height: t, background: c, animationDelay: `${i * 0.5}s` }} />
      ))}
    </>
  );
}

const PILLS = [
  { Icono: ShieldCheck, color: '#2ecc71', texto: 'Anti-fraude con IA' },
  { Icono: Clock, color: '#F57C00', texto: 'Verificación en segundos' },
  { Icono: BarChart3, color: '#3498db', texto: 'Dashboard en tiempo real' },
];

// Panel de escritorio (en celular se oculta y se ve MarcaMovil).
export default function PanelMarca() {
  const { animar, clave, reproducir } = useIntro();
  const [llegaAlInicio] = useState(animar); // la llegada de la mascota solo ocurre en la primera carga
  return (
    <div className={`pm pm-panel ${animar ? 'pm-anima' : 'pm-fijo'}`}>
      <Decoracion />
      <div key={clave} className="pm-escena">
        <div className="pm-nubes" />
        {animar && <div className="pm-destello" />}
        <div className="pm-contenido">
          <LogoRayo tam={140} animar={animar} red onClick={reproducir} />
          <Marca />
          <p className="pm-lema">Verificación de pagos<br />con inteligencia artificial</p>
          <div className="pm-pills">
            {PILLS.map(({ Icono, color, texto }, i) => (
              <div key={texto} className="pm-pill" style={{ '--i': i }}>
                <Icono size={16} color={color} />
                <span>{texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Secreto: la mascota se asoma por la esquina (solo escritorio, sin pista ni texto). Un clic suyo también llama al rayo. */}
      <div className={llegaAlInicio ? 'pm-mascota-wrap pm-mascota-llega' : 'pm-mascota-wrap'} onClick={reproducir}>
        <img className="pm-mascota" src="/mascota-login.webp" alt="" aria-hidden="true" width="220" height="222" decoding="async" />
      </div>
    </div>
  );
}

// Franja de marca para celular, arriba del formulario.
export function MarcaMovil() {
  const { animar, clave, reproducir } = useIntro();
  return (
    <div className={`pm pm-movil ${animar ? 'pm-anima' : 'pm-fijo'}`}>
      <div key={clave} className="pm-escena">
        <div className="pm-nubes" />
        {animar && <div className="pm-destello" />}
        <div className="pm-contenido">
          <LogoRayo tam={84} animar={animar} onClick={reproducir} />
          <Marca clase="pm-marca-movil" />
          <p className="pm-lema pm-lema-movil">Verificación de pagos con IA</p>
        </div>
      </div>
    </div>
  );
}
