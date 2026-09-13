import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

// Cajitas de un código de un solo uso — misma UX para el correo y el
// WhatsApp del registro: auto-avance al escribir, retrocede con Backspace,
// navega con las flechas, pega el código completo si lo copian (Ctrl+V), y
// si tocan una casilla adelantada salta a la primera vacía para no dejar
// huecos a mitad del código.
//
// El dígito visible no es el texto del <input> (ese queda transparente):
// es un <span> animado encima, para poder darle la animación de "rollo" al
// aparecer/desaparecer, más un caret propio que se desliza a la casilla
// vacía enfocada — inspirado en el OTP Input de RareUI (rareui.com), pero
// con los colores/tamaños de FlashPago en vez de Tailwind.
//
// Estado interno, no controlado desde afuera: el padre solo recibe el
// código armado por `onChange` (se llama con cada dígito, no solo al
// completarlo, para que el padre pueda habilitar/deshabilitar su botón).
// Para resetear las cajitas desde el padre (código incorrecto, reenviar),
// cambiar el prop `key` fuerza un remount limpio — es más simple que exponer
// un método imperativo para un caso tan puntual.
const ROLL_SPRING = { type: 'spring', stiffness: 500, damping: 34 };
const CARET_SPRING = { type: 'spring', stiffness: 500, damping: 40 };
const BLINK = { duration: 1.1, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: 'linear' };
const SHAKE = [0, -5, 4, -2, 0];
const ROLL = {
  initial: { y: '110%' },
  exit: (limpiado) => ({ y: limpiado ? '110%' : '-110%' }),
};

export default function CodigoOTP({
  longitud = 6, onChange, onEnterCompleto, tamano = 'grande', autoFocus = true, disabled = false, status = 'idle',
}) {
  const [digitos, setDigitos] = useState(() => Array(longitud).fill(''));
  const [limpiado, setLimpiado] = useState(false);
  const [enfocado, setEnfocado] = useState(null);
  const [caretX, setCaretX] = useState(0);
  const inputsRef = useRef([]);
  const celdasRef = useRef([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
    // Solo al montar: es el remount por `key` el que dispara este efecto de nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onChange?.(digitos.join(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digitos]);

  const enfocar = (i) => { inputsRef.current[i]?.focus(); inputsRef.current[i]?.select(); };

  const cambiar = (i, valorCrudo) => {
    const valor = valorCrudo.replace(/\D/g, '').slice(-1);
    setLimpiado(!valor);
    setDigitos((prev) => {
      const nuevo = [...prev];
      nuevo[i] = valor;
      return nuevo;
    });
    if (valor && i < longitud - 1) enfocar(i + 1);
  };

  const manejarKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digitos[i]) {
        setLimpiado(true);
        setDigitos((prev) => { const n = [...prev]; n[i] = ''; return n; });
      } else if (i > 0) {
        setLimpiado(true);
        setDigitos((prev) => { const n = [...prev]; n[i - 1] = ''; return n; });
        enfocar(i - 1);
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); enfocar(i - 1); }
    if (e.key === 'ArrowRight' && i < longitud - 1) { e.preventDefault(); enfocar(i + 1); }
    if (e.key === 'Enter' && digitos.join('').length === longitud) onEnterCompleto?.(digitos.join(''));
  };

  const manejarPaste = (e) => {
    e.preventDefault();
    const texto = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, longitud);
    if (!texto) return;
    setLimpiado(false);
    setDigitos(Array.from({ length: longitud }, (_, i) => texto[i] || ''));
    enfocar(Math.min(texto.length, longitud - 1));
  };

  // Clic "inteligente": si tocan una casilla más adelante de la primera
  // vacía, salta a esa primera vacía en vez de dejar un hueco a mitad del
  // código.
  const manejarClic = (i, e) => {
    const primeraVacia = digitos.findIndex((d) => !d);
    const destino = primeraVacia === -1 ? i : Math.min(i, primeraVacia);
    if (destino !== i) {
      e.preventDefault();
      enfocar(destino);
    }
  };

  const tam = tamano === 'chico'
    ? { caja: 26, fuente: 13, radio: 7, gap: 4, caret: 14 }
    : { caja: 46, fuente: 22, radio: 10, gap: 8, caret: 24 };

  const bordeError = status === 'error';
  const caretVisible = enfocado !== null && !digitos[enfocado];

  return (
    <motion.div
      animate={{ x: bordeError && !reduceMotion ? SHAKE : 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center',
        gap: tam.gap, flexWrap: 'wrap', justifyContent: 'center',
      }}
      onFocus={(e) => {
        const i = inputsRef.current.indexOf(e.target);
        setEnfocado(i);
        const celda = celdasRef.current[i];
        if (celda) setCaretX(celda.offsetLeft + celda.offsetWidth / 2);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setEnfocado(null);
      }}
    >
      {digitos.map((d, i) => (
        <div key={i} ref={(el) => { celdasRef.current[i] = el; }} style={{ position: 'relative', width: tam.caja, height: tam.caja }}>
          <input
            ref={(el) => { inputsRef.current[i] = el; }}
            value={d}
            onChange={(e) => cambiar(i, e.target.value)}
            onKeyDown={(e) => manejarKeyDown(i, e)}
            onPaste={i === 0 ? manejarPaste : undefined}
            onPointerDown={(e) => manejarClic(i, e)}
            onFocus={(e) => e.target.select()}
            maxLength={1}
            inputMode="numeric"
            disabled={disabled}
            aria-label={`Dígito ${i + 1} de ${longitud}`}
            style={{
              width: '100%', height: '100%', borderRadius: tam.radio, boxSizing: 'border-box',
              textAlign: 'center', fontSize: tam.fuente, fontWeight: 600, fontFamily: 'inherit',
              color: 'transparent', caretColor: 'transparent',
              background: d ? '#FFF8F0' : '#fff',
              border: `2px solid ${bordeError ? '#FF3B30' : (d ? '#F57C00' : '#e8e8f0')}`,
              outline: 'none', transition: 'border-color 0.15s, background 0.15s',
            }}
          />
          <span style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            overflow: 'hidden', pointerEvents: 'none', borderRadius: tam.radio,
          }}>
            <AnimatePresence initial={false} custom={limpiado}>
              {d && (
                <motion.span
                  key={i + '-' + d}
                  custom={limpiado}
                  variants={ROLL}
                  initial={reduceMotion ? false : 'initial'}
                  animate={{ y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : 'exit'}
                  transition={reduceMotion ? { duration: 0 } : ROLL_SPRING}
                  style={{ fontSize: tam.fuente, fontWeight: 600, color: '#1A1A2E' }}
                >
                  {d}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </div>
      ))}

      {caretVisible && (
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: caretX - 1, y: '-50%', opacity: [1, 1, 0, 0] }}
          transition={{ x: reduceMotion ? { duration: 0 } : CARET_SPRING, opacity: BLINK }}
          style={{
            position: 'absolute', left: 0, top: '50%', width: 2, height: tam.caret,
            borderRadius: 999, background: '#1A1A2E', pointerEvents: 'none',
          }}
        />
      )}
    </motion.div>
  );
}
