import { useState, useEffect, useRef } from "react";
import {
  Zap, MessageCircle, Lock, Camera, Bot, CheckCircle2, Shield, BarChart3,
  Search, RefreshCw, Clock, AlertTriangle, Building2, Database,
  FileText, Landmark, Smartphone, TrendingUp, Users, FileSpreadsheet,
  Headphones, Star, Check, Minus, Hourglass, Volume2, Rocket,
  // Nuevos íconos para las secciones agregadas
  ShieldX, ImageOff, Copy, ArrowLeftRight, Brain, ShieldCheck
} from "lucide-react";

const COLORS = {
  naranja: "#F57C00",
  naranjaFuerte: "#E65100",
  naranjaSuave: "#FFB74D",
  oscuro: "#1A1A2E",
  oscuro2: "#16213E",
  grisTxt: "#4a4a68",
  grisClaro: "#f0f0f5",
  blanco: "#ffffff",
  verde: "#2ecc71",
  rojo: "#E53935",
  morado: "#7E57C2",
};

const APP_URL = "https://app.flashpago.co/";

function IconBadge({ icon: Icon, bg, color, size = 22, boxSize = 44 }) {
  return (
    <div style={{
      width: boxSize, height: boxSize, background: bg, borderRadius: 12,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon size={size} color={color} strokeWidth={2} />
    </div>
  );
}

// ─── NAV ─────────────────────────────────
function Nav({ onLogin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, width: "100%", zIndex: 100,
      background: scrolled ? "rgba(26,26,46,0.97)" : "rgba(26,26,46,0.92)",
      backdropFilter: "blur(12px)", padding: "1rem 2rem",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      transition: "background 0.3s", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button className="menu-toggle-btn" onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: "none", background: "none", border: "none", cursor: "pointer", flexDirection: "column", gap: 5 }}>
          <span style={{ width: 22, height: 2.5, background: COLORS.blanco, borderRadius: 2, display: "block" }} />
          <span style={{ width: 22, height: 2.5, background: COLORS.blanco, borderRadius: 2, display: "block" }} />
          <span style={{ width: 22, height: 2.5, background: COLORS.blanco, borderRadius: 2, display: "block" }} />
        </button>
        <a href="#" style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.5rem", color: COLORS.naranja, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
          <Zap size={24} fill={COLORS.naranja} />
          Flash<span style={{ color: COLORS.blanco }}>Pago</span>
        </a>
      </div>

      <ul className="nav-links-list" style={{
        gap: "1.5rem", listStyle: "none", alignItems: "center", margin: 0, padding: 0,
        ...(menuOpen ? { display: "flex", flexDirection: "column", position: "absolute", top: "100%", left: 0, right: 0, background: "rgba(26,26,46,0.98)", padding: "1.5rem 2rem", zIndex: 200 } : {}),
      }}>
        {[["#como-funciona", "Cómo funciona"], ["#beneficios", "Beneficios"], ["#planes", "Planes"]].map(([href, label]) => (
          <li key={href}>
            <a href={href} onClick={() => setMenuOpen(false)} style={{ color: "#b0b0c8", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>{label}</a>
          </li>
        ))}
        <li className="nav-login-mobile-item">
          <button onClick={() => { setMenuOpen(false); window.location.href = APP_URL; }} style={{ background: "none", border: "none", color: "#b0b0c8", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
            <Lock size={15} /> Iniciar sesión
          </button>
        </li>
      </ul>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button className="nav-login-btn" onClick={() => { window.location.href = APP_URL; }} style={{ background: "transparent", border: "2px solid rgba(255,255,255,0.2)", color: COLORS.blanco, padding: "0.45rem 1.1rem", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <Lock size={15} /> Iniciar sesión
        </button>
        <a href="#contacto" className="btn-contactar-peel">
          <span className="btn-contactar-peel__corner btn-contactar-peel__corner--tr">
            <span className="btn-contactar-peel__corner-fold" />
          </span>
          <span className="btn-contactar-peel__corner btn-contactar-peel__corner--bl">
            <span className="btn-contactar-peel__corner-fold" />
          </span>
          <span className="btn-contactar-peel__wipe" />
          <span className="btn-contactar-peel__label">Contactar</span>
        </a>
      </div>
    </nav>
  );
}

// ─── ANIMACION DE CHAT ────────────────
function PhoneMockup() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [];
    function run() {
      setStep(0);
      timers.push(setTimeout(() => setStep(1), 500));
      timers.push(setTimeout(() => setStep(2), 1500));
      timers.push(setTimeout(() => setStep(3), 4000));
      timers.push(setTimeout(() => setStep(4), 5000));
      timers.push(setTimeout(() => run(), 10000));
    }
    run();
    return () => timers.forEach(clearTimeout);
  }, []);

  const bubbleBase = { padding: "0.75rem 1rem", borderRadius: 12, marginBottom: "0.75rem", fontSize: "0.85rem", maxWidth: "85%", transition: "all 0.4s ease-out" };
  const hidden = { opacity: 0, transform: "translateY(15px)" };
  const visible = { opacity: 1, transform: "translateY(0)" };

  return (
    <div style={{ background: COLORS.oscuro, border: "2px solid rgba(255,255,255,0.1)", borderRadius: 32, padding: "1.5rem", width: "100%", maxWidth: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "1rem" }}>
        <div style={{ width: 40, height: 40, background: COLORS.naranja, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={20} color="white" fill="white" />
        </div>
        <div>
          <div style={{ color: COLORS.blanco, fontWeight: 600, fontSize: "0.95rem" }}>FlashPago</div>
          <div style={{ color: COLORS.verde, fontSize: "0.75rem" }}>● en línea</div>
        </div>
      </div>

      <div style={{ minHeight: 280 }}>
        <div style={{ ...bubbleBase, background: "#005c4b", color: "white", marginLeft: "auto", borderBottomRightRadius: 4, display: "flex", alignItems: "center", gap: 6, ...(step >= 1 ? visible : hidden) }}>
          <Camera size={16} /> [Comprobante de pago]
        </div>

        <div style={{ ...bubbleBase, background: "rgba(255,255,255,0.08)", color: "#e0e0e0", borderBottomLeftRadius: 4, ...(step >= 2 ? visible : hidden) }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Hourglass size={14} /> Verificando el pago...</span>
          {step === 2 && (
            <div style={{ display: "inline-flex", gap: 4, paddingTop: 6 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 7, height: 7, background: "#b0b0c8", borderRadius: "50%", display: "inline-block", animation: `typingDot 1.4s infinite ${i * 0.2}s` }} />
              ))}
            </div>
          )}
        </div>

        {step >= 3 && (
          <div style={{ ...bubbleBase, background: "rgba(255,255,255,0.08)", color: "#e0e0e0", borderBottomLeftRadius: 4, ...visible }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ display: "inline-flex", animation: "popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)" }}>
                <CheckCircle2 size={18} color={COLORS.verde} />
              </span>
              <strong>PAGO VERIFICADO</strong>
            </div>
            <div style={{ lineHeight: 1.8 }}>
              Monto: <strong>$53.300</strong><br />
              Banco: Nequi<br />
              Cliente: María López<br />
              Fecha: 22/07/2026
            </div>
          </div>
        )}

        {step >= 4 && (
          <div style={{ background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)", color: COLORS.verde, padding: "0.5rem 1rem", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600, textAlign: "center", marginTop: "0.75rem", animation: "fadeIn 0.5s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Zap size={14} /> Verificado en 6 segundos — Ahorra 3 min por pago
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HUB SVG DIAGRAM ─────────────────────
function HubDiagram() {
  const nodos = [
    { x: 100, y: 80, Icon: MessageCircle, label: "WhatsApp" },
    { x: 500, y: 80, Icon: Landmark, label: "Banco" },
    { x: 80, y: 240, Icon: Camera, label: "Comprobante" },
    { x: 520, y: 240, Icon: Shield, label: "Anti-fraude" },
    { x: 160, y: 350, Icon: BarChart3, label: "Reportes" },
    { x: 440, y: 350, Icon: Database, label: "Registro" },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "2rem 0 3rem" }}>
      <svg viewBox="0 0 600 400" width="100%" style={{ maxWidth: 650 }} xmlns="http://www.w3.org/2000/svg">
        {nodos.map((n, i) => (
          <g key={`line-${i}`}>
            <line x1="300" y1="200" x2={n.x} y2={n.y} stroke="#F57C00" strokeWidth="2" strokeDasharray="8,4" opacity="0.3">
              <animate attributeName="opacity" values="0.1;0.5;0.1" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
            </line>
            <circle r="4" fill="#FFB74D">
              <animateMotion dur="2s" begin={`${i * 0.5}s`} repeatCount="indefinite" path={`M300,200 L${n.x},${n.y}`} />
            </circle>
          </g>
        ))}
        {nodos.map((n, i) => (
          <g key={n.label}>
            <rect x={n.x - 28} y={n.y - 28} width="56" height="56" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(245,124,0,0.4)" strokeWidth="1.5" />
            <foreignObject x={n.x - 14} y={n.y - 14} width="28" height="28">
              <n.Icon size={28} color="#FFB74D" strokeWidth={1.8} />
            </foreignObject>
            <text x={n.x} y={n.y + 45} textAnchor="middle" fill="#b0b0c8" fontSize="11" fontFamily="Inter,sans-serif">{n.label}</text>
          </g>
        ))}
        <circle cx="300" cy="200" r="55" fill="none" stroke="#F57C00" strokeWidth="1" opacity="0.2">
          <animate attributeName="r" values="55;65;55" dur="2s" repeatCount="indefinite" />
        </circle>
        <rect x="258" y="158" width="84" height="84" rx="20" fill="#F57C00" />
        <foreignObject x="284" y="172" width="32" height="32">
          <Zap size={32} color="white" fill="white" />
        </foreignObject>
        <text x="300" y="226" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.9)" fontFamily="Space Grotesk,sans-serif" fontWeight="600">FlashPago</text>
      </svg>
    </div>
  );
}

// ─── NUEVO: FEED DE PAGOS EN TIEMPO REAL ──────
function LivePaymentFeed() {
  const feedRef = useRef(null);
  const [cards, setCards] = useState([]);
  const [counter, setCounter] = useState(465);
  const idxRef = useRef(0);

  const payments = [
    { s: "ok", t: "Pago verificado", b: "Nequi", c: "María L.", a: "$45.000" },
    { s: "ok", t: "Pago verificado", b: "Bancolombia", c: "Carlos R.", a: "$32.500" },
    { s: "wait", t: "Verificando...", b: "BBVA", c: "Ana M.", a: "$28.000" },
    { s: "ok", t: "Pago verificado", b: "Nequi", c: "Pedro G.", a: "$51.000" },
    { s: "fail", t: "No encontrado", b: "Bancolombia", c: "Juan D.", a: "$15.000" },
    { s: "ok", t: "Pago verificado", b: "BBVA", c: "Laura S.", a: "$67.200" },
    { s: "ok", t: "Pago verificado", b: "Nequi", c: "Diego F.", a: "$42.800" },
    { s: "wait", t: "Verificando...", b: "Bancolombia", c: "Sofía R.", a: "$19.500" },
    { s: "ok", t: "Pago verificado", b: "Nequi", c: "Andrés M.", a: "$88.000" },
    { s: "ok", t: "Pago verificado", b: "BBVA", c: "Camila T.", a: "$33.700" },
  ];

  const times = ["2s", "5s", "8s", "12s", "15s", "18s", "22s", "25s", "28s", "32s"];

  useEffect(() => {
    function addCard() {
      const p = payments[idxRef.current % payments.length];
      const time = times[idxRef.current % times.length];
      const id = Date.now() + Math.random();
      setCards(prev => [{ ...p, time, id }, ...prev].slice(0, 5));
      setCounter(prev => prev + 1);
      idxRef.current++;
    }

    addCard();
    const t1 = setTimeout(addCard, 500);
    const t2 = setTimeout(addCard, 1000);
    const interval = setInterval(addCard, 2200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(interval); };
  }, []);

  const iconMap = { ok: CheckCircle2, wait: Clock, fail: AlertTriangle };
  const colorMap = {
    ok: { bg: "rgba(46,204,113,0.15)", color: "#2ecc71" },
    wait: { bg: "rgba(255,183,77,0.15)", color: "#FFB74D" },
    fail: { bg: "rgba(229,57,53,0.15)", color: "#E53935" },
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
      {/* Feed izquierda */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", padding: "0 0.25rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e0e0e0", display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={16} color={COLORS.naranja} /> Feed de pagos
          </div>
          <div style={{ fontSize: "0.75rem", color: COLORS.verde, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.verde, animation: "blink 1.5s infinite" }} /> En vivo
          </div>
        </div>
        <div ref={feedRef} style={{ display: "flex", flexDirection: "column", gap: 8, height: 280, overflow: "hidden", position: "relative" }}>
          {cards.map((card) => {
            const StatusIcon = iconMap[card.s];
            const colors = colorMap[card.s];
            return (
              <div key={card.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, animation: "slideInCard 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
              }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <StatusIcon size={14} color={colors.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#e0e0e0" }}>{card.t}</div>
                  <div style={{ fontSize: "0.7rem", color: "#8888a8", marginTop: 1 }}>{card.b} · {card.c}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>{card.a}</div>
                  <div style={{ fontSize: "0.65rem", color: "#6868a0", marginTop: 1 }}>Hace {card.time}</div>
                </div>
              </div>
            );
          })}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(transparent, rgba(22,33,62,0.95))", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Stats derecha */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {[
          { icon: CheckCircle2, iconColor: COLORS.verde, label: "Pagos verificados", value: counter.toLocaleString("es-CO"), sub: "y contando", subColor: COLORS.verde, subIcon: TrendingUp },
          { icon: Zap, iconColor: COLORS.naranja, label: "Monto protegido", value: "$24.6M", sub: "Pesos colombianos", subColor: COLORS.naranjaSuave, subIcon: TrendingUp },
          { icon: ShieldX, iconColor: COLORS.rojo, label: "Fraudes bloqueados", value: "5", valueColor: COLORS.rojo, sub: "Comprobantes falsos", subColor: COLORS.rojo, subIcon: AlertTriangle },
          { icon: Clock, iconColor: COLORS.naranjaSuave, label: "Verificación", value: "<8s", sub: "Promedio", subColor: COLORS.naranjaSuave, subIcon: Zap },
        ].map((stat, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#8888a8", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
              <stat.icon size={13} color={stat.iconColor} /> {stat.label}
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.6rem", fontWeight: 700, color: stat.valueColor || "#fff" }}>{stat.value}</div>
            <div style={{ fontSize: "0.72rem", marginTop: 3, display: "flex", alignItems: "center", gap: 4, color: stat.subColor }}>
              <stat.subIcon size={11} /> {stat.sub}
            </div>
          </div>
        ))}
        {/* Bancos - fila ancha */}
        <div style={{ gridColumn: "1 / -1", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem 1.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#8888a8", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <Landmark size={13} color="#b0b0c8" /> Bancos conectados
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {["Nequi", "Bancolombia", "BBVA"].map(b => (
              <span key={b} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 14px", fontSize: "0.8rem", color: "#e0e0e0", fontWeight: 500 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FLUJO VERIFICACIÓN ANIMADO ──────
function AnimatedVerificationFlow() {
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    let step = -1;
    function run() {
      step = -1;
      setActiveStep(-1);
      const interval = setInterval(() => {
        step++;
        if (step > 6) { // 4 pasos + 3 flechas = 7 beats
          clearInterval(interval);
          setTimeout(run, 2000); // pausa y reinicia
          return;
        }
        setActiveStep(step);
      }, 700);
      return interval;
    }
    const id = run();
    return () => clearInterval(id);
  }, []);

  const pasos = [
    { Icon: Camera, bg: "#FFF3E0", color: "#F57C00", label: "Recibe foto", sub: "Por WhatsApp" },
    { Icon: Brain, bg: "#E3F2FD", color: "#1E88E5", label: "IA lo lee", sub: "Extrae datos" },
    { Icon: ShieldCheck, bg: "#FFEBEE", color: "#E53935", label: "Cruza con banco", sub: "Tiempo real" },
    { Icon: CheckCircle2, bg: "#E8F5E9", color: "#2ecc71", label: "Verificado", sub: "En menos de 8 seg" },
  ];

  // Cada paso ocupa beat 0,2,4,6 y cada flecha 1,3,5
  return (
    <div className="verif-flow-card" style={{ background: COLORS.grisClaro, border: "1px solid #e8e8f0", borderRadius: 16 }}>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: COLORS.grisTxt, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 6 }}>
        <Zap size={15} color={COLORS.naranja} /> Cómo funciona la verificación
      </div>
      <div className="verif-flow-row">
        {pasos.map((p, i) => {
          const stepBeat = i * 2;
          const arrowBeat = i * 2 + 1;
          const isActive = activeStep >= stepBeat;
          const arrowActive = activeStep >= arrowBeat;
          const isLast = i === pasos.length - 1;

          return (
            <div key={p.label} style={{ display: "contents" }}>
              <div className="verif-flow-step">
                <div className="verif-flow-icon-wrap">
                  <div style={{
                    width: "100%", height: "100%", borderRadius: "50%", background: p.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transform: isActive ? "scale(1)" : "scale(0)",
                    opacity: isActive ? 1 : 0,
                    transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s",
                  }}>
                    <p.Icon size={24} color={p.color} />
                  </div>
                  {isActive && (
                    <div style={{
                      position: "absolute", inset: -5, borderRadius: "50%",
                      border: `2px solid ${p.color}`, opacity: 0.3,
                      animation: "pulseVerif 1.5s ease-out forwards",
                    }} />
                  )}
                  {isLast && isActive && (
                    <div style={{
                      position: "absolute", bottom: -2, right: -2, width: 20, height: 20,
                      borderRadius: "50%", background: "#2ecc71",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      animation: "popIn 0.3s 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
                    }}>
                      <CheckCircle2 size={12} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: "0.88rem", fontWeight: 600, color: COLORS.oscuro,
                  opacity: isActive ? 1 : 0, transform: isActive ? "translateY(0)" : "translateY(8px)",
                  transition: "all 0.4s ease",
                }}>{p.label}</div>
                <div style={{
                  fontSize: "0.75rem", color: "#8888a8", marginTop: 3,
                  opacity: isActive ? 1 : 0, transform: isActive ? "translateY(0)" : "translateY(8px)",
                  transition: "all 0.4s 0.1s ease",
                }}>{p.sub}</div>
              </div>

              {!isLast && (
                <div className="verif-flow-arrow">
                  <div className="verif-flow-arrow-track">
                    <div
                      className="verif-flow-arrow-fill"
                      style={{
                        background: `linear-gradient(90deg, ${p.color}, ${pasos[i + 1].color})`,
                        '--fill-pct': arrowActive ? '100%' : '0%',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────
export default function FlashPagoLanding({ onLogin, onRegistro, onTerminos, onPrivacidad }) {
  const handleLogin = () => {
    if (onLogin) onLogin();
  };

  const [facturacionAnual, setFacturacionAnual] = useState(true);

  const stats = [
    ["<8s", "Verificación"],
    ["5", "Bancos soportados"],
    ["24/7", "Disponible"],
  ];

  const problemas = [
    { Icon: Clock, bg: "#FFF3E0", color: "#F57C00", title: "Pierdes tiempo", desc: "Cada comprobante requiere abrir la app del banco, buscar el pago, comparar montos. Minutos que se acumulan cada día." },
    { Icon: AlertTriangle, bg: "#FFEBEE", color: "#E53935", title: "Comprobantes falsos", desc: "Capturas editadas, comprobantes viejos reutilizados, pagos que nunca llegaron. Sin verificación, cualquiera puede estafarte." },
    { Icon: BarChart3, bg: "#EDE7F6", color: "#7E57C2", title: "Sin control", desc: "No sabes cuánto vendiste hoy, quién pagó, ni tienes un registro ordenado. Al final del día, las cuentas no cuadran." },
  ];

  // ★ NUEVO: datos para la sección anti-fraude
  const fraudes = [
    {
      Icon: ImageOff, bg: "#FFEBEE", border: "#FFCDD2", iconBg: "#FFCDD2", iconColor: "#E53935",
      title: "Comprobante falso",
      desc: "El cliente manda una captura editada o inventada. FlashPago la cruza con el banco y el pago no existe.",
      badge: "No encontrado", badgeBg: "#FFCDD2", badgeColor: "#C62828", BadgeIcon: AlertTriangle,
    },
    {
      Icon: Copy, bg: "#FFF3E0", border: "#FFE0B2", iconBg: "#FFE0B2", iconColor: "#F57C00",
      title: "Comprobante reutilizado",
      desc: "Alguien manda el mismo comprobante que ya usó antes, o que usó otro cliente. FlashPago lo reconoce.",
      badge: "Duplicado detectado", badgeBg: "#FFE0B2", badgeColor: "#E65100", BadgeIcon: RefreshCw,
    },
    {
      Icon: ArrowLeftRight, bg: "#EDE7F6", border: "#D1C4E9", iconBg: "#D1C4E9", iconColor: "#7E57C2",
      title: "Monto alterado",
      desc: "El comprobante dice $50.000 pero el pago real es de $30.000. FlashPago compara y detecta la diferencia.",
      badge: "Monto no coincide", badgeBg: "#D1C4E9", badgeColor: "#4527A0", BadgeIcon: AlertTriangle,
    },
  ];

  const pasos = [
    { Icon: Camera, title: "Envía la foto", desc: "El empleado toma la foto del comprobante que le muestra el cliente y la envía al bot por WhatsApp." },
    { Icon: Bot, title: "La IA lo analiza", desc: "FlashPago lee el comprobante con inteligencia artificial, extrae el monto, banco, referencia y fecha automáticamente." },
    { Icon: CheckCircle2, title: "Verificación al instante", desc: "El bot cruza los datos con el banco para confirmar que el pago realmente llegó a tu cuenta. Respuesta en segundos." },
  ];

  const beneficios = [
    { Icon: Shield, bg: "#E3F2FD", color: "#1E88E5", title: "Protección contra fraudes", desc: "Detecta comprobantes falsos, editados o reutilizados. Nunca más te engañan con un pago que no existe." },
    { Icon: Zap, bg: "#FFF3E0", color: "#F57C00", title: "Verificación en menos de 10 segundos", desc: "Lo que te tomaba minutos ahora tarda segundos. Tu empleado solo envía la foto y listo." },
    { Icon: BarChart3, bg: "#E8F5E9", color: "#43A047", title: "Reportes automáticos", desc: "Recibe el cierre del día en tu WhatsApp sin pedirlo. Total de ventas, pagos confirmados y más." },
    { Icon: Search, bg: "#EDE7F6", color: "#7E57C2", title: "Registro completo de pagos", desc: "Cada pago queda guardado con nombre del cliente, monto, fecha, hora y foto del comprobante." },
    { Icon: RefreshCw, bg: "#FFEBEE", color: "#E53935", title: "Detección de duplicados", desc: "Si alguien intenta usar el mismo comprobante dos veces, FlashPago lo detecta y lo bloquea." },
    { Icon: MessageCircle, bg: "#E0F7FA", color: "#00ACC1", title: "Funciona por WhatsApp", desc: "No necesitas instalar apps nuevas. Todo se hace desde WhatsApp, que tu equipo ya usa todos los días." },
  ];

  const bancos = [
    { Icon: Landmark, label: "Bancolombia" },
    { Icon: Smartphone, label: "Nequi" },
    { Icon: Building2, label: "BBVA" },
  ];

  const planes = [
    {
      name: "Básico", precioMensual: 39900, precioAnual: 359000,
      features: ["Verificación de pagos por WhatsApp", "300 comprobantes/mes", "Lectura con IA (3 bancos)", "Detección de duplicados", "Registro de pagos", "Dashboard web", "Soporte por WhatsApp"],
      disabled: ["Reportes automáticos"],
    },
    {
      name: "Premium", precioMensual: 79900, precioAnual: 669000, popular: true,
      features: ["Todo lo del plan Básico", "1,000 comprobantes/mes", "Reportes diarios automáticos", "Búsqueda de clientes", "Fotos de comprobantes", "Estadísticas del negocio", "Soporte prioritario"],
      disabled: [],
    },
    {
      name: "Premium Plus", precioMensual: 109900, precioAnual: 859000,
      features: ["Todo lo del plan Premium", "Comprobantes ilimitados", "Soporte prioritario"],
      disabled: [],
    },
  ];

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: COLORS.oscuro, lineHeight: 1.6, overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        .nav-links-list { display: flex; flex-direction: row; }
        .nav-login-mobile-item { display: none; }

        /* Botón "Contactar" del nav — estilo de Uiverse.io (Itskrish01):
           esquinas que se despegan y fondo que se desliza al pasar el mouse. */
        .btn-contactar-peel {
          position: relative; display: inline-flex; align-items: center;
          padding: 0.5rem 1.1rem; overflow: hidden; border-radius: 8px;
          background: ${COLORS.naranja}; font-weight: 600; font-size: 0.85rem;
          white-space: nowrap; text-decoration: none;
        }
        .btn-contactar-peel__corner {
          position: absolute; width: 16px; height: 16px; background: ${COLORS.naranjaFuerte};
          border-radius: 4px; overflow: hidden; transition: margin 0.5s ease;
        }
        .btn-contactar-peel__corner--tr { top: 0; right: 0; }
        .btn-contactar-peel__corner--bl { bottom: 0; left: 0; transform: rotate(180deg); }
        .btn-contactar-peel:hover .btn-contactar-peel__corner--tr { margin: -16px -16px 0 0; }
        .btn-contactar-peel:hover .btn-contactar-peel__corner--bl { margin: 0 0 -16px -16px; }
        .btn-contactar-peel__corner-fold {
          position: absolute; top: 0; right: 0; width: 20px; height: 20px;
          background: #fff; transform: translate(50%, -50%) rotate(45deg);
        }
        .btn-contactar-peel__wipe {
          position: absolute; inset: 0; border-radius: 8px;
          background: ${COLORS.naranjaFuerte}; transform: translateX(-100%);
          transition: transform 0.5s ease 0.2s;
        }
        .btn-contactar-peel:hover .btn-contactar-peel__wipe { transform: translateX(0); }
        .btn-contactar-peel__label { position: relative; z-index: 1; color: #fff; }
        @keyframes typingDot { 0%,60%,100%{opacity:.3;transform:scale(.8)} 30%{opacity:1;transform:scale(1.1)} }
        @keyframes popIn { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes pulseVerif { 0%{transform:scale(0.8);opacity:0.6} 100%{transform:scale(1.4);opacity:0} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideInCard { 0%{transform:scale(0.3) translateY(-10px);opacity:0} 60%{transform:scale(1.03)} 100%{transform:scale(1);opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .voz-pulse-ring { position:absolute; width:100%; height:100%; border-radius:50%; border:2px solid rgba(245,124,0,0.4); animation: vozPulso 2.4s ease-out infinite; }
        @keyframes vozPulso { 0%{ transform:scale(0.6); opacity:0.8; } 100%{ transform:scale(1.4); opacity:0; } }

        /* ═══ Billetes flotantes del CTA final — de Uiverse.io/CodePen ═══
           ("Floating Cloud Background" de Shaw), con nubes cambiadas por
           signos de peso y recoloreadas a naranja de marca. */
        .cta-money-bg {
          position: absolute; inset: 0; margin: auto; height: 75%;
          overflow: hidden; pointer-events: none;
          animation: cta-money-fadein 3.1s ease-out;
        }
        @keyframes cta-money-fadein { from{ opacity:0; } to{ opacity:1; } }
        .money {
          position: absolute; left: 0; width: 100%; display: flex; align-items: center;
          animation-iteration-count: infinite; animation-fill-mode: forwards;
          animation-timing-function: linear; animation-name: cta-money-float, cta-money-fade;
        }
        .money::before {
          content: "$"; font-family: 'Space Grotesk',sans-serif; font-weight: 700;
          color: ${COLORS.naranjaSuave};
        }
        .money--fg::before { opacity: 0.9; }
        .money--bg::before { opacity: 0.3; }
        @keyframes cta-money-float { from{ transform:translateX(100%); } to{ transform:translateX(-15%); } }
        @keyframes cta-money-fade { 0%,100%{ opacity:0; } 6%,90%{ opacity:1; } }

        .money--1  { top: 4%;  font-size: 26px; animation-duration: 116s, 116s; animation-delay: -18.5s, -18.5s; }
        .money--2  { top: 12%; font-size: 14px; animation-duration: 176s, 176s; animation-delay: -37s,   -37s; }
        .money--3  { top: 20%; font-size: 30px; animation-duration: 108s, 108s; animation-delay: -55.5s, -55.5s; }
        .money--4  { top: 28%; font-size: 15px; animation-duration: 168s, 168s; animation-delay: -74s,   -74s; }
        .money--5  { top: 36%; font-size: 34px; animation-duration: 100s, 100s; animation-delay: -92.5s, -92.5s; }
        .money--6  { top: 44%; font-size: 16px; animation-duration: 160s, 160s; animation-delay: -111s,  -111s; }
        .money--7  { top: 52%; font-size: 17px; animation-duration: 152s, 152s; animation-delay: -129.5s,-129.5s; }
        .money--8  { top: 62%; font-size: 38px; animation-duration: 92s,  92s;  animation-delay: -148s,  -148s; }
        .money--9  { top: 72%; font-size: 18px; animation-duration: 144s, 144s; animation-delay: -166.5s,-166.5s; }
        .money--10 { top: 82%; font-size: 19px; animation-duration: 136s, 136s; animation-delay: -185s,  -185s; }
        /* ═══ Glow ambiental del Hero — de CodePen, con el navy/naranja de ═══
           marca en vez de azul/naranja genérico. */
        .hero-glow {
          position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
        }
        .hero-glow-ball {
          --delay: 0s; --size: 0.4; --speed: 20s;
          aspect-ratio: 1; width: calc(150% * var(--size));
          background: linear-gradient(259.53deg, ${COLORS.oscuro2} 6.53%, ${COLORS.naranja} 95.34%);
          filter: blur(10vw); border-radius: 50%;
          position: absolute; top: 0; left: 0;
          animation: hero-glow-loop var(--speed) infinite linear;
          animation-delay: var(--delay);
          transform-origin: 50% 50%;
          opacity: 0.55;
        }
        @keyframes hero-glow-loop {
          0%   { transform: translate3d(0%, 51%, 0) rotate(0deg); }
          5%   { transform: translate3d(8%, 31%, 0) rotate(18deg); }
          10%  { transform: translate3d(22%, 13%, 0) rotate(36deg); }
          15%  { transform: translate3d(40%, 2%, 0) rotate(54deg); }
          20%  { transform: translate3d(46%, 21%, 0) rotate(72deg); }
          25%  { transform: translate3d(50%, 47%, 0) rotate(90deg); }
          30%  { transform: translate3d(53%, 80%, 0) rotate(108deg); }
          35%  { transform: translate3d(59%, 98%, 0) rotate(125deg); }
          40%  { transform: translate3d(84%, 89%, 0) rotate(144deg); }
          45%  { transform: translate3d(92%, 68%, 0) rotate(162deg); }
          50%  { transform: translate3d(99%, 47%, 0) rotate(180deg); }
          55%  { transform: translate3d(97%, 21%, 0) rotate(198deg); }
          60%  { transform: translate3d(80%, 7%, 0) rotate(216deg); }
          65%  { transform: translate3d(68%, 25%, 0) rotate(234deg); }
          70%  { transform: translate3d(59%, 41%, 0) rotate(251deg); }
          75%  { transform: translate3d(50%, 63%, 0) rotate(270deg); }
          80%  { transform: translate3d(38%, 78%, 0) rotate(288deg); }
          85%  { transform: translate3d(21%, 92%, 0) rotate(306deg); }
          90%  { transform: translate3d(3%, 79%, 0) rotate(324deg); }
          100% { transform: translate3d(0%, 51%, 0) rotate(360deg); }
        }
        /* ═══ Flujo "Cómo funciona la verificación" — fila en desktop, ═══
           columna en celular (ver el media query de 768px). */
        .verif-flow-card { padding: 2rem 2.5rem; }
        .verif-flow-row { display:flex; align-items:flex-start; }
        .verif-flow-step { flex:1; text-align:center; }
        .verif-flow-icon-wrap { position:relative; width:60px; height:60px; margin:0 auto 0.7rem; }
        .verif-flow-arrow { flex:0 0 50px; display:flex; align-items:center; height:60px; }
        .verif-flow-arrow-track { width:100%; height:2px; background:#e0e0e0; border-radius:2px; position:relative; overflow:hidden; }
        .verif-flow-arrow-fill { height:100%; border-radius:2px; width:var(--fill-pct); transition:width 0.5s ease; }

        @media(max-width:1024px) {
          .hero-grid { gap:2rem !important; }
          .grid-3 { grid-template-columns:repeat(2,1fr) !important; }
          .planes-grid-wrap { grid-template-columns:repeat(2,1fr) !important; }
          .live-grid { grid-template-columns:1fr !important; }
        }
        @media(max-width:768px) {
          .menu-toggle-btn { display:flex !important; }
          .nav-links-list { display:none; }
          .nav-login-mobile-item { display:list-item !important; }
          .nav-login-btn { display:none !important; }
          .hero-grid { grid-template-columns:1fr !important; text-align:center; }
          .hero-visual-wrap { order:-1; }
          .hero-h1 { font-size:2.2rem !important; }
          .hero-buttons-wrap { justify-content:center; }
          .hero-stats-wrap { justify-content:center; }
          .grid-3 { grid-template-columns:1fr !important; }
          .grid-2 { grid-template-columns:1fr !important; }
          .voz-grid { grid-template-columns:1fr !important; text-align:center; }
          .voz-lista { align-items:center; }
          .planes-grid-wrap { grid-template-columns:1fr !important; max-width:400px; margin:1rem auto 0; }
          .cta-h2 { font-size:1.8rem !important; }
          .fraude-grid { grid-template-columns:1fr !important; }
          .live-grid { grid-template-columns:1fr !important; }
          .live-stats-grid { grid-template-columns:1fr 1fr !important; }
          .verif-flow-card { padding: 1.5rem 1.25rem !important; }
          .verif-flow-row { flex-direction:column; align-items:center; }
          .verif-flow-step { width:100%; }
          .verif-flow-icon-wrap { width:52px; height:52px; }
          .verif-flow-arrow { flex:0 0 28px; }
          .verif-flow-arrow-track { width:2px; height:100%; }
          .verif-flow-arrow-fill { width:100%; height:var(--fill-pct); transition:height 0.5s ease; }
        }
        @media(max-width:480px) {
          .hero-h1 { font-size:1.8rem !important; }
          .cta-h2 { font-size:1.5rem !important; }
        }
      `}</style>

      <Nav onLogin={handleLogin} />

      {/* ─── HERO ─── */}
      <section style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${COLORS.oscuro} 0%, ${COLORS.oscuro2} 100%)`, display: "flex", alignItems: "center", padding: "8rem 2rem 4rem", position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
        <div className="hero-glow" aria-hidden="true">
          <div className="hero-glow-ball" />
          <div className="hero-glow-ball" style={{ '--delay': '-12s', '--size': 0.35, '--speed': '25s' }} />
          <div className="hero-glow-ball" style={{ '--delay': '-10s', '--size': 0.3, '--speed': '15s' }} />
        </div>
        <div className="hero-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center", position: "relative", zIndex: 1, width: "100%" }}>
          <div>
            <h1 className="hero-h1" style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "3.5rem", fontWeight: 700, lineHeight: 1.1, color: COLORS.blanco, marginBottom: "1.5rem", marginTop: 0 }}>
              Verifica pagos por transferencia{" "}
              <span style={{ background: `linear-gradient(135deg, ${COLORS.naranja}, ${COLORS.naranjaSuave})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>en segundos</span>
            </h1>
            <p style={{ fontSize: "1.2rem", color: "#b0b0c8", marginBottom: "2rem", maxWidth: 500 }}>
              Bot de WhatsApp con inteligencia artificial que lee comprobantes, verifica pagos reales y protege tu negocio contra fraudes.
            </p>
            <div className="hero-buttons-wrap" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="#contacto" style={{ background: COLORS.naranja, color: "white", padding: "1rem 2rem", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: "1.05rem", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <MessageCircle size={18} /> Quiero probarlo
              </a>
              <a href="#como-funciona" style={{ background: "transparent", color: COLORS.blanco, padding: "1rem 2rem", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: "1.05rem", border: "2px solid rgba(255,255,255,0.2)" }}>
                ¿Cómo funciona?
              </a>
            </div>
            <div className="hero-stats-wrap" style={{ display: "flex", gap: "2rem", marginTop: "2.5rem" }}>
              {stats.map(([num, label]) => (
                <div key={label}>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.8rem", fontWeight: 700, color: COLORS.naranja }}>{num}</div>
                  <div style={{ fontSize: "0.8rem", color: "#8888a8", marginTop: "0.2rem" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-visual-wrap" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ─── PROBLEMA ─── */}
      <section style={{ padding: "6rem 2rem", background: COLORS.blanco, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: COLORS.naranja, textTransform: "uppercase", letterSpacing: 2, marginBottom: "1rem" }}>El problema</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem", lineHeight: 1.2, marginTop: 0 }}>¿Te ha pasado esto?</h2>
          <p style={{ fontSize: "1.1rem", color: COLORS.grisTxt, maxWidth: 650, marginBottom: "3rem" }}>Miles de negocios en Colombia pierden tiempo y dinero verificando transferencias manualmente.</p>
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "2rem" }}>
            {problemas.map(p => (
              <div key={p.title} style={{ background: COLORS.grisClaro, borderRadius: 16, padding: "2rem" }}>
                <div style={{ marginBottom: "1.25rem" }}>
                  <IconBadge icon={p.Icon} bg={p.bg} color={p.color} size={24} boxSize={48} />
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: 0 }}>{p.title}</h3>
                <p style={{ fontSize: "0.95rem", color: COLORS.grisTxt, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ★ NUEVO: ANTI-FRAUDE ─── */}
      <section style={{ padding: "6rem 2rem", background: COLORS.grisClaro, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: COLORS.rojo, textTransform: "uppercase", letterSpacing: 2, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 6 }}>
            <Shield size={14} /> Protección anti-fraude
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem", lineHeight: 1.2, marginTop: 0 }}>3 fraudes que FlashPago detecta por ti</h2>
          <p style={{ fontSize: "1.1rem", color: COLORS.grisTxt, maxWidth: 650, marginBottom: "3rem" }}>Cada comprobante se cruza con tu banco en tiempo real. Si algo no cuadra, lo bloquea al instante.</p>

          <div className="fraude-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem", marginBottom: "3rem" }}>
            {fraudes.map(f => (
              <div key={f.title} style={{ background: f.bg, border: `1px solid ${f.border}`, borderRadius: 16, padding: "2rem" }}>
                <div style={{ marginBottom: "1.25rem" }}>
                  <IconBadge icon={f.Icon} bg={f.iconBg} color={f.iconColor} size={22} boxSize={48} />
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: 0 }}>{f.title}</h3>
                <p style={{ fontSize: "0.95rem", color: COLORS.grisTxt, margin: 0, marginBottom: "1rem" }}>{f.desc}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 600, background: f.badgeBg, color: f.badgeColor, padding: "0.3rem 0.85rem", borderRadius: 50 }}>
                  <f.BadgeIcon size={12} /> {f.badge}
                </span>
              </div>
            ))}
          </div>

          {/* Flujo visual */}
          <AnimatedVerificationFlow />
        </div>
      </section>

      {/* ─── CÓMO FUNCIONA ─── */}
      <section id="como-funciona" style={{ padding: "6rem 2rem", background: COLORS.oscuro, color: COLORS.blanco, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: COLORS.naranja, textTransform: "uppercase", letterSpacing: 2, marginBottom: "1rem" }}>La solución</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 700, color: COLORS.blanco, marginBottom: "1.5rem", lineHeight: 1.2, marginTop: 0 }}>Así de fácil funciona</h2>
          <p style={{ fontSize: "1.1rem", color: "#b0b0c8", maxWidth: 650, marginBottom: "1rem" }}>Tu empleado envía el comprobante al bot por WhatsApp. FlashPago hace el resto.</p>
          <HubDiagram />
          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "2rem", marginTop: "1rem" }}>
            {pasos.map((p, i) => (
              <div key={p.title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "2.5rem 2rem", textAlign: "center", position: "relative" }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "3rem", fontWeight: 700, color: COLORS.naranja, opacity: 0.3, position: "absolute", top: "1rem", right: "1.5rem" }}>{i + 1}</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                  <IconBadge icon={p.Icon} bg="rgba(245,124,0,0.15)" color={COLORS.naranjaSuave} size={26} boxSize={56} />
                </div>
                <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: 0 }}>{p.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "#b0b0c8", margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFICIOS ─── */}
      <section id="beneficios" style={{ padding: "6rem 2rem", background: COLORS.blanco, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: COLORS.naranja, textTransform: "uppercase", letterSpacing: 2, marginBottom: "1rem" }}>Por qué FlashPago</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem", lineHeight: 1.2, marginTop: 0 }}>Todo lo que tu negocio necesita</h2>
          <p style={{ fontSize: "1.1rem", color: COLORS.grisTxt, maxWidth: 650, marginBottom: "3rem" }}>Más que un bot — es el sistema de verificación de pagos de tu negocio.</p>
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1.5rem" }}>
            {beneficios.map(b => (
              <div key={b.title} style={{ display: "flex", gap: "1rem", padding: "1.5rem", borderRadius: 12 }}>
                <IconBadge icon={b.Icon} bg={b.bg} color={b.color} size={20} boxSize={44} />
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.05rem", fontWeight: 600, marginBottom: "0.3rem", marginTop: 0 }}>{b.title}</h3>
                  <p style={{ fontSize: "0.9rem", color: COLORS.grisTxt, margin: 0 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ★ NUEVO: EN TIEMPO REAL ─── */}
      <section style={{ padding: "6rem 2rem", background: `linear-gradient(135deg, ${COLORS.oscuro} 0%, ${COLORS.oscuro2} 100%)`, boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-30%", right: "-10%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(245,124,0,0.1) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: COLORS.naranja, textTransform: "uppercase", letterSpacing: 2, marginBottom: "1rem" }}>En tiempo real</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 700, color: COLORS.blanco, marginBottom: "1.5rem", lineHeight: 1.2, marginTop: 0 }}>Así trabaja FlashPago por ti</h2>
          <p style={{ fontSize: "1.1rem", color: "#b0b0c8", maxWidth: 650, marginBottom: "3rem" }}>Cada comprobante pasa por inteligencia artificial, se cruza con el banco y te da la respuesta en segundos.</p>
          <div className="live-grid">
            <LivePaymentFeed />
          </div>
        </div>
      </section>

      {/* ─── VOZ ─── */}
      <section style={{ padding: "6rem 2rem", background: `linear-gradient(135deg, ${COLORS.oscuro} 0%, ${COLORS.oscuro2} 100%)`, boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-30%", left: "-10%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(245,124,0,0.12) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="voz-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "auto 1fr", gap: "3.5rem", alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="voz-pulse-ring" style={{ animationDelay: "0s" }} />
              <span className="voz-pulse-ring" style={{ animationDelay: "0.8s" }} />
              <span className="voz-pulse-ring" style={{ animationDelay: "1.6s" }} />
              <div style={{ width: 84, height: 84, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.naranja}, ${COLORS.naranjaFuerte})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2, boxShadow: "0 8px 30px rgba(245,124,0,0.4)" }}>
                <Volume2 size={36} color="#fff" strokeWidth={2} />
              </div>
            </div>
          </div>
          <div>
            <span style={{ display: "inline-block", background: "rgba(245,124,0,0.15)", color: COLORS.naranjaSuave, fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.75rem", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", padding: "0.4rem 0.9rem", borderRadius: 50, marginBottom: "1rem" }}>Nuevo</span>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.2rem", fontWeight: 700, color: COLORS.blanco, marginBottom: "1rem", marginTop: 0, lineHeight: 1.2 }}>
              Tu negocio ahora también <span style={{ color: COLORS.naranjaSuave }}>habla</span>
            </h2>
            <p style={{ fontSize: "1.05rem", color: "#b0b0c8", marginBottom: "1.5rem", maxWidth: 560 }}>
              Cada vez que se confirma un pago, FlashPago lo anuncia en voz alta al instante — como una caja
              registradora inteligente. Tu equipo sabe que el pago entró sin mirar el celular.
            </p>
            <div className="voz-lista" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                "Anuncio de voz instantáneo al confirmar cada pago",
                "Sin hardware adicional — funciona en cualquier computador",
                "Elige entre varias voces en español",
              ].map((txt) => (
                <div key={txt} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle2 size={18} color={COLORS.naranjaSuave} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.95rem", color: "#d0d0e0" }}>{txt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── BANCOS ─── */}
      <section style={{ padding: "4rem 2rem", background: COLORS.grisClaro, textAlign: "center", boxSizing: "border-box" }}>
        <p style={{ fontSize: "1rem", color: COLORS.grisTxt, marginBottom: "2rem", marginTop: 0 }}>Compatible con los principales bancos y billeteras de Colombia</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          {bancos.map(b => (
            <span key={b.label} style={{ background: COLORS.blanco, padding: "0.75rem 1.5rem", borderRadius: 50, fontWeight: 600, fontSize: "0.9rem", color: COLORS.oscuro, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <b.Icon size={16} color={COLORS.naranja} /> {b.label}
            </span>
          ))}
        </div>
      </section>

      {/* ─── PLANES ─── */}
      <section id="planes" style={{ padding: "6rem 2rem", background: COLORS.blanco, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: COLORS.naranja, textTransform: "uppercase", letterSpacing: 2, marginBottom: "1rem" }}>Planes</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem", lineHeight: 1.2, marginTop: 0 }}>Elige el plan para tu negocio</h2>
          <p style={{ fontSize: "1.1rem", color: COLORS.grisTxt, maxWidth: 650, marginBottom: "2rem" }}>Sin contratos largos. Cancela cuando quieras.</p>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "2.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: !facturacionAnual ? 600 : 400, color: !facturacionAnual ? COLORS.oscuro : COLORS.grisTxt }}>Mensual</span>
            <button
              type="button"
              onClick={() => setFacturacionAnual(v => !v)}
              aria-label="Cambiar entre facturación mensual y anual"
              style={{ width: 46, height: 26, borderRadius: 999, border: "none", cursor: "pointer", background: facturacionAnual ? "linear-gradient(135deg, #F57C00, #E65100)" : "#d8d8e4", position: "relative", padding: 0, transition: "background 0.2s" }}
            >
              <span style={{ position: "absolute", top: 3, left: facturacionAnual ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
            </button>
            <span style={{ fontSize: "0.9rem", fontWeight: facturacionAnual ? 600 : 400, color: facturacionAnual ? COLORS.oscuro : COLORS.grisTxt }}>Anual</span>
          </div>

          <div className="planes-grid-wrap" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "2rem" }}>
            {planes.map(plan => {
              const precioMostrado = facturacionAnual ? plan.precioAnual : plan.precioMensual;
              const descuentoPct = Math.round((1 - plan.precioAnual / (plan.precioMensual * 12)) * 100);
              const mesesGratis = Math.round((1 - plan.precioAnual / (plan.precioMensual * 12)) * 12 * 10) / 10;
              return (
                <div key={plan.name} style={{ border: `2px solid ${plan.popular ? COLORS.naranja : "#e8e8f0"}`, borderRadius: 20, padding: "2.5rem 2rem", position: "relative", ...(plan.popular ? { background: "linear-gradient(180deg, rgba(245,124,0,0.03) 0%, transparent 100%)" } : {}) }}>
                  {plan.popular && (
                    <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: COLORS.naranja, color: "white", padding: "0.3rem 1.2rem", borderRadius: 50, fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                      <Star size={12} fill="white" /> Más popular
                    </div>
                  )}
                  {facturacionAnual && !plan.popular && (
                    <div style={{
                      position: "absolute", top: 16, left: 16,
                      background: "#FFF3E0", color: COLORS.naranja, fontSize: "0.68rem", fontWeight: 700,
                      padding: "0.22rem 0.6rem", borderRadius: 999, letterSpacing: 0.2,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <Rocket size={10} /> Lanzamiento
                    </div>
                  )}
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>{plan.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: "0.25rem" }}>
                    <div style={{
                      fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 700, transition: "color .2s",
                      ...(facturacionAnual
                        ? { backgroundImage: "linear-gradient(135deg, #F57C00, #E65100)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
                        : { color: COLORS.naranja }),
                    }}>
                      ${precioMostrado.toLocaleString('es-CO')}
                    </div>
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700, color: "white", background: COLORS.verde,
                      padding: "0.2rem 0.55rem", borderRadius: 999, whiteSpace: "nowrap",
                      visibility: facturacionAnual ? "visible" : "hidden",
                    }}>
                      -{descuentoPct}%
                    </span>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: COLORS.grisTxt, marginBottom: "0.35rem" }}>
                    COP / {facturacionAnual ? "año" : "mes"}
                  </div>
                  <div style={{
                    fontSize: "0.85rem", fontWeight: 600, color: COLORS.verde, marginBottom: "2rem",
                    visibility: facturacionAnual ? "visible" : "hidden",
                  }}>
                    Equivale a {mesesGratis} meses gratis
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, marginBottom: "2rem", margin: "0 0 2rem 0" }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ padding: "0.5rem 0", fontSize: "0.9rem", color: COLORS.grisTxt, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <Check size={16} color={COLORS.naranja} strokeWidth={3} style={{ flexShrink: 0, marginTop: 3 }} /> {f}
                      </li>
                    ))}
                    {plan.disabled?.map(f => (
                      <li key={f} style={{ padding: "0.5rem 0", fontSize: "0.9rem", color: COLORS.grisTxt, opacity: 0.4, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <Minus size={16} color="#ccc" style={{ flexShrink: 0, marginTop: 3 }} /> {f}
                      </li>
                    ))}
                    {plan.pronto?.map(f => (
                      <li key={f} style={{ padding: "0.5rem 0", fontSize: "0.9rem", color: COLORS.grisTxt, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <Hourglass size={16} color={COLORS.naranjaSuave} style={{ flexShrink: 0, marginTop: 3 }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={onRegistro} style={{ display: "block", width: "100%", padding: "0.9rem", borderRadius: 12, fontWeight: 600, fontSize: "1rem", textAlign: "center", textDecoration: "none", cursor: "pointer", boxSizing: "border-box", fontFamily: "'Inter',sans-serif", border: "none", ...(plan.popular ? { background: COLORS.naranja, color: "white" } : { background: "transparent", color: COLORS.naranja, border: `2px solid ${COLORS.naranja}` }) }}>
                    Empezar
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "2rem", border: "1px solid #e8e8f0", borderRadius: 16, padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: COLORS.grisClaro }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.25rem" }}>¿Tienes varias sucursales?</div>
              <div style={{ fontSize: "0.9rem", color: COLORS.grisTxt }}>El plan Empresarial (multi-sucursal, usuarios ilimitados) se arma a la medida de tu negocio.</div>
            </div>
            <a href={`https://wa.me/573167064671?text=${encodeURIComponent('Hola, quiero conocer el plan Empresarial de FlashPago')}`} target="_blank" rel="noopener noreferrer" style={{ background: COLORS.naranja, color: "white", padding: "0.8rem 1.5rem", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              <MessageCircle size={16} /> Hablar con ventas
            </a>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section id="contacto" style={{ padding: "6rem 2rem", background: `linear-gradient(135deg, ${COLORS.oscuro} 0%, ${COLORS.oscuro2} 100%)`, textAlign: "center", position: "relative", overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ position: "absolute", bottom: "-30%", left: "-10%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(245,124,0,0.1) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="cta-money-bg" aria-hidden="true">
          <div className="money money--fg money--1" />
          <div className="money money--bg money--2" />
          <div className="money money--fg money--3" />
          <div className="money money--bg money--4" />
          <div className="money money--fg money--5" />
          <div className="money money--bg money--6" />
          <div className="money money--bg money--7" />
          <div className="money money--fg money--8" />
          <div className="money money--bg money--9" />
          <div className="money money--bg money--10" />
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <h2 className="cta-h2" style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2.5rem", fontWeight: 700, color: COLORS.blanco, marginBottom: "1rem", marginTop: 0 }}>¿Listo para proteger tu negocio?</h2>
          <p style={{ fontSize: "1.1rem", color: "#b0b0c8", marginBottom: "2rem", maxWidth: 550, marginLeft: "auto", marginRight: "auto" }}>Escríbenos por WhatsApp y te activamos FlashPago en menos de 24 horas. Sin contratos, sin complicaciones.</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`https://wa.me/573167064671?text=${encodeURIComponent('Hola, quiero conocer más sobre FlashPago')}`} target="_blank" rel="noopener noreferrer" style={{ background: COLORS.naranja, color: "white", padding: "1rem 2rem", borderRadius: 12, textDecoration: "none", fontWeight: 600, fontSize: "1.05rem", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <MessageCircle size={18} /> Escribir por WhatsApp
            </a>
            <button onClick={() => { window.location.href = APP_URL; }} style={{ background: "transparent", color: COLORS.blanco, padding: "1rem 2rem", borderRadius: 12, fontWeight: 600, fontSize: "1.05rem", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Inter',sans-serif" }}>
              <Lock size={17} /> Ir al Panel
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: "#0d0d1a", padding: "2.5rem 2rem", textAlign: "center", boxSizing: "border-box" }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "1.2rem", color: COLORS.naranja, marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Zap size={18} fill={COLORS.naranja} />
          Flash<span style={{ color: COLORS.blanco }}>Pago</span>
        </div>
        <p style={{ color: "#6868a0", fontSize: "0.85rem", margin: "0 0 0.75rem 0" }}>Verificación de pagos con inteligencia artificial — Hecho en Colombia 🇨🇴</p>
        <p style={{ color: "#6868a0", fontSize: "0.75rem", marginTop: "0.75rem" }}>
          © 2026 FlashPago. Todos los derechos reservados. | {' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onTerminos(); }} style={{ color: "#8888a8", textDecoration: "underline", cursor: "pointer" }}>
            Términos y Condiciones
          </a>
          {' '}|{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); onPrivacidad(); }} style={{ color: "#8888a8", textDecoration: "underline", cursor: "pointer" }}>
            Política de Privacidad
          </a>
        </p>
      </footer>
    </div>
  );
}