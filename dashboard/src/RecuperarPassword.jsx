import React, { useState } from 'react';
import { Zap, Mail, KeyRound, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';

import { PASSWORD_VALIDA, PASSWORD_ERROR } from './utils/password';
import './components/ui/ui.css';
import PanelMarca, { MarcaMovil } from './components/PanelMarca';

function RecuperarPassword({ onVolver }) {
  const [paso, setPaso] = useState(1); // 1: email, 2: código + nueva contraseña, 3: éxito
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const solicitarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const res = await fetch('/api/recuperar/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMensaje(data.mensaje || 'Si el email está registrado, recibirás un código en unos minutos');
        setPaso(2);
      } else {
        setError(data.error || 'No se pudo enviar el código');
      }
    } catch (err) {
      setError('Error conectando al servidor');
    }
    setCargando(false);
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!PASSWORD_VALIDA.test(password)) {
      setError(PASSWORD_ERROR);
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/recuperar/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), codigo, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setPaso(3);
      } else {
        setError(data.error || 'Código incorrecto o expirado');
      }
    } catch (err) {
      setError('Error conectando al servidor');
    }
    setCargando(false);
  };

  const inputStyle = {
    width: '100%', padding: '0.85rem 0.85rem 0.85rem 2.8rem', border: '2px solid #e8e8f0',
    borderRadius: 12, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.3s',
  };
  const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a4a68', marginBottom: '0.4rem' };
  const focus = (e) => e.target.style.borderColor = '#F57C00';
  const blur = (e) => e.target.style.borderColor = '#e8e8f0';

  return (
    <div className="recuperar-root" style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>
      {/* Franja de marca (solo celular) */}
      <MarcaMovil />

      {/* IZQUIERDA - FORMULARIO */}
      <div className="recuperar-form-col" style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '2rem', background: '#fff',
      }}>
        <div className="recuperar-form-anim" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="recuperar-marca-fila" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
              <Zap size={28} color="#F57C00" fill="#F57C00" />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '1.8rem' }}>
                <span style={{ color: '#F57C00' }}>Flash</span><span style={{ color: '#1A1A2E' }}>Pago</span>
              </span>
            </div>
            <p style={{ color: '#8888a8', fontSize: '0.95rem', margin: 0 }}>
              {paso === 1 && 'Recupera el acceso a tu panel'}
              {paso === 2 && 'Ingresa el código y tu nueva contraseña'}
              {paso === 3 && 'Contraseña actualizada'}
            </p>
          </div>

          {error && (
            <div style={{
              background: '#FFF3E0', color: '#E65100', padding: '0.75rem 1rem',
              borderRadius: 10, fontSize: '0.85rem', marginBottom: '1.25rem',
              border: '1px solid #FFE0B2',
            }}>
              {error}
            </div>
          )}

          {/* PASO 1: EMAIL */}
          {paso === 1 && (
            <form onSubmit={solicitarCodigo}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Email de tu cuenta</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#999" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@negocio.com"
                    required
                    style={inputStyle}
                    onFocus={focus}
                    onBlur={blur}
                  />
                </div>
              </div>

              <button type="submit" disabled={cargando} className="btn-recuperar-anim" style={{
                width: '100%', padding: '0.9rem', background: '#F57C00', color: 'white',
                border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600,
                cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1,
                transition: 'all 0.3s', fontFamily: "'Inter',sans-serif",
              }}>
                {cargando
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}><span className="fp-btn__spinner" aria-hidden="true" /> Enviando...</span>
                  : 'Enviar código'}
              </button>
            </form>
          )}

          {/* PASO 2: CÓDIGO + NUEVA CONTRASEÑA */}
          {paso === 2 && (
            <form onSubmit={cambiarPassword}>
              {mensaje && (
                <div style={{
                  background: '#FFF8F0', color: '#F57C00', padding: '0.75rem 1rem',
                  borderRadius: 10, fontSize: '0.85rem', marginBottom: '1.25rem',
                  border: '1px solid #FFE0B2',
                }}>
                  {mensaje}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Código de verificación</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} color="#999" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    maxLength={6}
                    style={{ ...inputStyle, letterSpacing: 4, fontWeight: 600 }}
                    onFocus={focus}
                    onBlur={blur}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Nueva contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#999" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={verPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mín. 8, con Mayús. y minús."
                    required
                    style={{ ...inputStyle, paddingRight: '3rem' }}
                    onFocus={focus}
                    onBlur={blur}
                  />
                  <button type="button" onClick={() => setVerPassword(!verPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {verPassword ? <EyeOff size={18} color="#999" /> : <Eye size={18} color="#999" />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Mínimo 8 caracteres, con mayúsculas y minúsculas</div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Confirmar contraseña</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#999" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={verPassword ? 'text' : 'password'}
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    style={inputStyle}
                    onFocus={focus}
                    onBlur={blur}
                  />
                </div>
              </div>

              <button type="submit" disabled={cargando} className="btn-recuperar-anim" style={{
                width: '100%', padding: '0.9rem', background: '#F57C00', color: 'white',
                border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600,
                cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1,
                transition: 'all 0.3s', fontFamily: "'Inter',sans-serif",
              }}>
                {cargando
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}><span className="fp-btn__spinner" aria-hidden="true" /> Guardando...</span>
                  : 'Cambiar contraseña'}
              </button>

              <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button type="button" onClick={() => setPaso(1)} style={{
                  background: 'none', border: 'none', color: '#F57C00',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                }}>
                  ¿No te llegó? Solicitar de nuevo
                </button>
              </p>
            </form>
          )}

          {/* PASO 3: ÉXITO */}
          {paso === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#E8F5E9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
              }}>
                <CheckCircle2 size={32} color="#43A047" />
              </div>
              <p style={{ color: '#4a4a68', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <button onClick={onVolver} style={{
                width: '100%', padding: '0.9rem', background: '#F57C00', color: 'white',
                border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter',sans-serif",
              }}>
                Ir a iniciar sesión
              </button>
            </div>
          )}

          {paso !== 3 && (
            <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: '1.5rem' }}>
              <button onClick={onVolver} style={{
                background: 'none', border: 'none', color: '#666', display: 'inline-flex',
                alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
              }}>
                <ArrowLeft size={14} /> Volver a iniciar sesión
              </button>
            </p>
          )}

          <p style={{ textAlign: 'center', color: '#b0b0c8', fontSize: '0.8rem', marginTop: '1rem' }}>
            © 2026 FlashPago — Verificación de pagos con IA
          </p>
        </div>
      </div>

      {/* DERECHA - PANEL DE MARCA */}
      <PanelMarca />

      <style>{`
        .recuperar-form-anim {
          animation: recSlideUp 0.6s ease both;
        }
        @keyframes recSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .btn-recuperar-anim {
          box-shadow: 0 4px 15px rgba(245,124,0,0.3);
        }
        .btn-recuperar-anim:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(245,124,0,0.4);
        }
        .btn-recuperar-anim:active {
          transform: translateY(0);
        }

        /* Celular: franja de marca arriba y formulario como hoja blanca que sube sobre ella */
        @media (max-width: 768px) {
          .recuperar-root { flex-direction: column; }
          .recuperar-form-col { margin-top: -26px; border-radius: 26px 26px 0 0; position: relative; z-index: 2; justify-content: flex-start !important; padding-top: 2rem !important; }
          .recuperar-marca-fila { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default RecuperarPassword;
