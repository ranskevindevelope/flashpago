import React, { useState, useEffect } from 'react';
import { Zap, Lock, User, Eye, EyeOff } from 'lucide-react';
import BotonGoogle from './components/BotonGoogle';
import PanelMarca, { MarcaMovil } from './components/PanelMarca';

function Login({ onLogin , onRegistro, onRecuperar }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await res.json();

      if (data.ok) {
        localStorage.setItem('fp_token', data.token);
        localStorage.setItem('fp_user', JSON.stringify(data.user));
        onLogin();
      } else {
        setError(data.error || 'Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error conectando al servidor');
    }

    setCargando(false);
  };

  const manejarResultadoGoogle = (data) => {
    setError('');
    if (data.ok && data.accion === 'login') {
      localStorage.setItem('fp_token', data.token);
      localStorage.setItem('fp_user', JSON.stringify(data.user));
      onLogin();
    } else if (data.ok && data.accion === 'registro_pendiente') {
      onRegistro({
        googleToken: data.googleToken,
        email: data.email,
        nombre: data.nombre,
      });
    } else {
      setError(data.error || 'No se pudo continuar con Google');
    }
  };

  return (
    <div className="login-root" style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter',sans-serif" }}>
      {/* Franja de marca (solo celular) */}
      <MarcaMovil />

      {/* IZQUIERDA - LOGIN */}
      <div className="login-form-col" style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '2rem', background: '#fff',
      }}>
        <div className="login-form-anim" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="login-marca-fila" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
              <Zap size={28} color="#F57C00" fill="#F57C00" />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '1.8rem' }}>
                <span style={{ color: '#F57C00' }}>Flash</span><span style={{ color: '#1A1A2E' }}>Pago</span>
              </span>
            </div>
            <p style={{ color: '#8888a8', fontSize: '0.95rem', margin: 0 }}>Ingresa a tu panel de administración</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a4a68', marginBottom: '0.4rem' }}>Usuario</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#999" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Tu usuario"
                  required
                  style={{
                    width: '100%', padding: '0.85rem 0.85rem 0.85rem 2.8rem', border: '2px solid #e8e8f0',
                    borderRadius: 12, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#F57C00'}
                  onBlur={(e) => e.target.style.borderColor = '#e8e8f0'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a4a68', marginBottom: '0.4rem' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#999" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '0.85rem 3rem 0.85rem 2.8rem', border: '2px solid #e8e8f0',
                    borderRadius: 12, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#F57C00'}
                  onBlur={(e) => e.target.style.borderColor = '#e8e8f0'}
                />
                <button type="button" onClick={() => setVerPassword(!verPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {verPassword ? <EyeOff size={18} color="#999" /> : <Eye size={18} color="#999" />}
                </button>
              </div>
              <p style={{ textAlign: 'right', margin: '0.5rem 0 0' }}>
                <button type="button" onClick={onRecuperar} style={{
                  background: 'none', border: 'none', color: '#F57C00',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
                }}>
                  ¿Olvidaste tu contraseña?
                </button>
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

            <button type="submit" disabled={cargando} className="btn-login-anim" style={{
              width: '100%', padding: '0.9rem', background: '#F57C00', color: 'white',
              border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600,
              cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.7 : 1,
              transition: 'all 0.3s', fontFamily: "'Inter',sans-serif",
            }}>
              {cargando ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e8e8f0' }} />
            <span style={{ fontSize: 11, color: '#999' }}>o continúa con</span>
            <div style={{ flex: 1, height: 1, background: '#e8e8f0' }} />
          </div>
          <BotonGoogle onResultado={manejarResultadoGoogle} ancho={400} />

                    <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: '1.5rem' }}>
            ¿No tienes cuenta?{' '}
            <button onClick={() => onRegistro()} style={{
              background: 'none', border: 'none', color: '#F57C00',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
            }}>
              Crear cuenta
            </button>
          </p>

          <p style={{ textAlign: 'center', color: '#b0b0c8', fontSize: '0.8rem', marginTop: '1rem' }}>
            © 2026 FlashPago — Verificación de pagos con IA
          </p>
        
        </div>
      </div>

      {/* DERECHA - PANEL DE MARCA: cae un rayo y aparece el logo */}
      <PanelMarca />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

        /* ─── Formulario izquierdo ─── */
        .login-form-anim {
          animation: slideUp 0.8s ease both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(25px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ═══ Botón hover ═══ */
        .btn-login-anim {
          box-shadow: 0 4px 15px rgba(245,124,0,0.3);
        }
        .btn-login-anim:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(245,124,0,0.4);
        }
        .btn-login-anim:active {
          transform: translateY(0);
        }

        /* Celular: franja de marca arriba y formulario como hoja blanca que sube sobre ella */
        @media (max-width: 768px) {
          .login-root { flex-direction: column; }
          .login-form-col { margin-top: -26px; border-radius: 26px 26px 0 0; position: relative; z-index: 2; justify-content: flex-start !important; padding-top: 2rem !important; }
          .login-marca-fila { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default Login;