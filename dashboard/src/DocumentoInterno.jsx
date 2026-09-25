import { ArrowLeft } from 'lucide-react';

const ORANGE = '#F57C00';
const MUTED = '#8888a8';

function Card({ title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.2rem' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: '#fff' }}>{title}</div>
      <p style={{ margin: 0, fontSize: '0.88rem', color: MUTED, lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}

function Paso({ n, titulo, children }) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', background: ORANGE, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
        fontSize: '0.85rem', flexShrink: 0, fontFamily: "'Space Grotesk',sans-serif",
      }}>{n}</div>
      <div>
        <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.15rem' }}>{titulo}</div>
        <div style={{ fontSize: '0.9rem', color: MUTED, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

function Stat({ valor, label }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.1rem', flex: 1, minWidth: 140 }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '1.6rem', color: ORANGE }}>{valor}</div>
      <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: '0.15rem', lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}

const BANCOS = ['Bancolombia', 'Nequi', 'Bre-B', 'Davivienda', 'Daviplata', 'AV Villas', 'Transfiya', 'Nu'];

export default function DocumentoInterno({ onVolver }) {
  const h2 = { fontFamily: "'Space Grotesk',sans-serif", color: '#fff', fontSize: '1.3rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem' };
  const num = { fontSize: '0.7rem', color: ORANGE, background: 'rgba(245,124,0,0.12)', borderRadius: 6, padding: '3px 8px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 };
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: '#1A1A2E', minHeight: '100vh', color: '#e0e0e0' }}>
      <nav style={{ background: 'rgba(26,26,46,0.97)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)' }}>
        <button onClick={onVolver} style={{ background: 'none', border: 'none', color: ORANGE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.9rem' }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: ORANGE }}>
          Flash<span style={{ color: '#fff' }}>Pago</span>
        </span>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 2rem 5rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Space Grotesk',sans-serif",
          fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: ORANGE, background: 'rgba(245,124,0,0.12)', borderRadius: 999, padding: '0.35rem 0.8rem', marginBottom: '1rem',
        }}>
          Documento interno — no compartir públicamente
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '2.2rem', color: '#fff', marginBottom: '0.5rem' }}>
          Brief de producto
        </h1>
        <p style={{ color: MUTED, marginBottom: '2.5rem', lineHeight: 1.6, maxWidth: 640 }}>
          Qué es FlashPago, a quién le sirve y por qué importa — base para armar mensajes y estrategia de marketing.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', lineHeight: 1.8, fontSize: '0.95rem' }}>

          <section>
            <h2 style={h2}><span style={num}>01</span> El problema</h2>
            <p>En Colombia, la mayoría de pequeños negocios reciben pagos por transferencia (Nequi, Bancolombia, Bre-B, Daviplata...) y los verifican <strong>a ojo</strong>: un empleado mira la foto del comprobante que manda el cliente y decide si entregar el pedido.</p>
            <p style={{ marginBottom: '1rem' }}>Eso abre huecos que le cuestan plata al negocio todos los días:</p>
            <div style={grid2}>
              <Card title="🖼️ Comprobantes falsos">Capturas editadas o inventadas. A simple vista se ven idénticas a una real.</Card>
              <Card title="♻️ Comprobantes reutilizados">La misma transferencia (real) se reenvía para "pagar" un segundo pedido distinto.</Card>
              <Card title="⏱️ Verificación lenta">Revisar el banco a mano toma minutos que, en hora pico, se traducen en filas.</Card>
              <Card title="😰 Riesgo humano">El empleado que decide es el mismo que puede estar apurado, cansado o coludido con el cliente.</Card>
              <Card title="🔕 Notificación tardía">El push/SMS del banco a veces llega tarde o no llega — el negocio queda "a ciegas" sin saber si el pago ya entró.</Card>
            </div>
          </section>

          <section>
            <h2 style={h2}><span style={num}>02</span> Qué es FlashPago</h2>
            <p>Un bot de WhatsApp con inteligencia artificial que lee el comprobante, lo cruza contra la notificación real del banco, y le dice al empleado — en segundos — si el pago existe de verdad.</p>
            <p>No reemplaza el WhatsApp que el negocio ya usa: se conecta a él. El empleado no aprende una herramienta nueva ni instala nada.</p>
          </section>

          <section>
            <h2 style={h2}><span style={num}>03</span> Cómo funciona</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <Paso n={1} titulo="El cliente paga y manda la captura">Por cualquiera de los 8 bancos/billeteras soportados — el empleado la reenvía al WhatsApp de FlashPago.</Paso>
              <Paso n={2} titulo="La IA lee el comprobante">Extrae banco, monto, referencia y fecha de la imagen automáticamente.</Paso>
              <Paso n={3} titulo="Se cruza contra el banco real">FlashPago revisa el correo de notificaciones del negocio y confirma que la plata sí entró — no confía en la imagen, confía en el banco.</Paso>
              <Paso n={4} titulo="Respuesta en segundos">"Pago confirmado" o una alerta clara si algo no cuadra.</Paso>
            </div>
          </section>

          <section>
            <h2 style={h2}><span style={num}>04</span> Protección anti-fraude</h2>
            <div style={grid2}>
              <Card title="Comprobante falso">Si el banco nunca recibió esa transferencia, FlashPago no la confirma — sin importar qué tan real se vea la imagen.</Card>
              <Card title="Comprobante reutilizado">El mismo comprobante no se puede usar dos veces — el sistema lo reconoce y bloquea el segundo intento.</Card>
            </div>
          </section>

          <section>
            <h2 style={h2}><span style={num}>05</span> Lo que ve el dueño del negocio</h2>
            <p style={{ marginBottom: '0.6rem' }}>Además del bot, cada negocio tiene un panel web donde el dueño controla todo:</p>
            <ul style={{ margin: 0, paddingLeft: '1.3rem', color: '#e0e0e0' }}>
              <li style={{ marginBottom: '0.4rem' }}><strong>Pagos en tiempo real</strong> — total del día, del mes, ticket promedio, tasa de éxito.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Pendientes y duplicados</strong> — todo lo que necesita revisión manual, en un solo lugar.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Cierre de caja</strong> — ventas, gastos y efectivo esperado del turno.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Equipo</strong> — administra qué empleados pueden usar el bot.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Reportes automáticos</strong> — un resumen del día por WhatsApp al cerrar (desde Premium).</li>
              <li><strong>Exportar a Excel</strong> — los pagos del mes, listos para contabilidad.</li>
            </ul>
          </section>

          <section>
            <h2 style={h2}><span style={num}>06</span> A quién le sirve</h2>
            <div style={{ background: 'rgba(245,124,0,0.08)', borderLeft: `3px solid ${ORANGE}`, borderRadius: 10, padding: '0.9rem 1.1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <strong style={{ color: ORANGE }}>El filtro real: volumen de transferencias.</strong> No es el tipo de negocio ni el tamaño — es cuántas transferencias reciben al día/semana. Un negocio chico con buen volumen sí sirve; uno grande con bajo volumen (ej. casi todo efectivo), no. Validado ofreciendo a negocios de bajo volumen: no justifica el esfuerzo de venta, aunque tengan varios empleados.
            </div>
            <ul style={{ margin: '0 0 1rem', paddingLeft: '1.3rem', color: '#e0e0e0' }}>
              <li style={{ marginBottom: '0.4rem' }}>Restaurantes y comida rápida (caso piloto: <strong>Vinson Burgers</strong> — buen volumen de transferencias, 3 empleados + 1 domiciliario)</li>
              <li style={{ marginBottom: '0.4rem' }}>Tiendas y minimarkets</li>
              <li style={{ marginBottom: '0.4rem' }}>Peluquerías, spas y servicios con turnos</li>
              <li style={{ marginBottom: '0.4rem' }}>Domicilios y ventas por WhatsApp/redes sociales</li>
              <li>Cualquier negocio con más de un empleado recibiendo pagos, donde el dueño no puede estar mirando todo el día</li>
            </ul>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.88rem', color: MUTED }}>
              Excepciones donde sí vale la pena aunque el volumen sea bajo: monto alto por transferencia, ya sufrieron una estafa antes, les interesa más el resto de la herramienta (cierre de caja/gastos/estadísticas) que el antifraude, o llegan referidos.
            </p>
            <div style={{ background: 'rgba(245,124,0,0.08)', borderLeft: `3px solid ${ORANGE}`, borderRadius: 10, padding: '0.9rem 1.1rem', fontSize: '0.9rem' }}>
              <strong style={{ color: ORANGE }}>El dolor central:</strong> negocios que ya perdieron plata al menos una vez por un comprobante falso o reutilizado — ahí FlashPago deja de ser "un lujo" y pasa a ser obvio.
            </div>
          </section>

          <section>
            <h2 style={h2}><span style={num}>07</span> Bancos y billeteras soportados</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {BANCOS.map((b) => (
                <span key={b} style={{ fontSize: '0.8rem', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '0.3rem 0.75rem', color: MUTED }}>{b}</span>
              ))}
            </div>
          </section>

          <section>
            <h2 style={h2}><span style={num}>08</span> Modelo de negocio</h2>
            <p>Suscripción mensual o anual por negocio, según volumen de comprobantes verificados al mes. Prueba gratis de 15 días con todas las funciones activas, sin pedir tarjeta.</p>
            <ul style={{ margin: '0.6rem 0 1rem', paddingLeft: '1.3rem', color: '#e0e0e0' }}>
              <li style={{ marginBottom: '0.4rem' }}><strong>Básico</strong> — un solo punto de venta, volumen bajo-medio al mes.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Premium</strong> — más movimiento y varios empleados enviando comprobantes.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Premium Plus</strong> — volumen alto, hasta 3.000 comprobantes al mes.</li>
              <li><strong>Empresarial</strong> — cadenas o multi-sucursal, sin tope de comprobantes ni usuarios (uso razonable de 10.000 al mes por sede).</li>
            </ul>
            <p>El pago de la suscripción se hace con tarjeta/PSE (Wompi) o por transferencia bancaria directa.</p>
          </section>

          <section>
            <h2 style={h2}><span style={num}>09</span> Por qué es distinto</h2>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <Stat valor="0" label="apps nuevas que instalar — todo pasa por WhatsApp" />
              <Stat valor="2" label="fraudes reales detectados automáticamente" />
              <Stat valor="15" label="días de prueba gratis, sin tarjeta" />
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.3rem', color: '#e0e0e0' }}>
              <li style={{ marginBottom: '0.4rem' }}><strong>No confía en la imagen, confía en el banco.</strong> Cruza contra la notificación real por correo, no solo "lee" la foto.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>No depende de que el push llegue rápido.</strong> Si la notificación del banco al celular se demora o falla, FlashPago igual confirma porque lee el correo directamente.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Cero fricción de adopción.</strong> El canal (WhatsApp) ya lo usan el dueño, los empleados y los clientes.</li>
              <li><strong>Pensado para el mercado colombiano</strong>, no una adaptación genérica: reconoce los 8 bancos/billeteras más usados del país.</li>
            </ul>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)' }} />

          <section>
            <h2 style={h2}>Insumos para mensajes de marketing</h2>
            <p style={{ marginBottom: '0.6rem' }}>Ángulos ya respaldados por lo que el producto realmente hace:</p>
            <ol style={{ margin: 0, paddingLeft: '1.3rem', color: '#e0e0e0' }}>
              <li style={{ marginBottom: '0.4rem' }}><strong>Miedo al fraude</strong> — "¿Y si ese comprobante es falso?", para el dueño que ya perdió plata así una vez.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Velocidad operativa</strong> — de "esperar a que alguien revise el banco" a "confirmado en segundos".</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Cero curva de aprendizaje</strong> — "tu equipo ya sabe usarlo: es WhatsApp."</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>Control sin estar presente</strong> — el dueño ve todo desde el panel, sin tener que estar parado detrás del empleado.</li>
              <li style={{ marginBottom: '0.4rem' }}><strong>"Yo reviso yo mismo"</strong> — validar que sí revisan, pero mostrar que a simple vista ya no se distinguen los comprobantes falsos de los reales, y que en hora pico no alcanza a revisar todo.</li>
              <li><strong>Caso propio como prueba</strong> — Vinson Burgers: buen volumen de transferencias, 3 empleados + domiciliario, resolvió tanto el fraude como las notificaciones tardías del banco y la contabilidad en volumen alto. Hablar desde la experiencia propia vende más que la demo.</li>
            </ol>
          </section>

        </div>
      </div>
    </div>
  );
}
