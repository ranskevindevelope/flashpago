import { ArrowLeft } from 'lucide-react';

export default function Terminos({ onVolver }) {
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: "#1A1A2E", minHeight: "100vh", color: "#e0e0e0" }}>
      <nav style={{ background: "rgba(26,26,46,0.97)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <button onClick={onVolver} style={{ background: "none", border: "none", color: "#F57C00", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "0.9rem" }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F57C00" }}>
          Flash<span style={{ color: "#fff" }}>Pago</span>
        </span>
      </nav>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "3rem 2rem" }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "2rem", color: "#fff", marginBottom: "0.5rem" }}>
          Términos y Condiciones
        </h1>
        <p style={{ color: "#8888a8", marginBottom: "2.5rem" }}>Última actualización: Septiembre 2026 · Versión 2</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", lineHeight: 1.8, fontSize: "0.95rem" }}>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>1. Identificación del prestador del servicio</h2>
            <p>
              FlashPago es operado por <strong>Rodolfo de Jesús Ramírez Gómez</strong>, identificado con cédula de
              ciudadanía No. <strong>70118928</strong> (NIT <strong>70118928-2</strong>), actuando bajo el nombre
              comercial <strong>Vinson Burgers</strong> (matrícula mercantil No. 290874, Cámara de Comercio Aburrá
              Sur), con domicilio en La Estrella, Antioquia, Colombia. Contacto: correo{' '}
              <strong>contacto@flashpago.co</strong>, WhatsApp <strong>+57 316 7064671</strong>.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>2. Aceptación de los términos</h2>
            <p>
              Estos términos se aceptan de forma expresa y verificable: al registrarte marcas voluntariamente una
              casilla (no premarcada) confirmando que los leíste y los aceptas, quedando registrada la fecha, la
              versión aceptada y tu cuenta. Sin esa aceptación explícita no es posible completar el registro.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Si no estás de acuerdo con estos términos, no debes registrarte ni usar el Servicio.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>3. Descripción del servicio</h2>
            <p>FlashPago es un servicio de verificación de comprobantes de pago por WhatsApp que utiliza inteligencia artificial para leer y validar transferencias bancarias. El servicio incluye lectura de comprobantes, detección de duplicados, reportes automáticos y panel de administración según el plan contratado.</p>
            <p style={{ marginTop: "0.75rem" }}>
              FlashPago es exclusivamente un proveedor de software de verificación. <strong>No recibe, administra,
              retiene, transfiere ni ejecuta pagos por cuenta de terceros</strong>, no tiene acceso a los fondos ni
              a las claves o credenciales bancarias del negocio, y no actúa como entidad financiera, pasarela de
              pagos ni Sociedad Especializada en Depósitos y Pagos Electrónicos (SEDPE). El dinero se transfiere
              siempre directamente entre el cliente y la cuenta bancaria del negocio, fuera de la plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>4. Uso del servicio</h2>
            <p>El usuario se compromete a usar FlashPago únicamente para verificar pagos legítimos de su negocio. Está prohibido usar el servicio para actividades ilegales, fraude, lavado de activos o cualquier actividad contraria a la ley colombiana.</p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>5. Precisión de la verificación</h2>
            <p>FlashPago utiliza inteligencia artificial para leer comprobantes. Aunque la precisión es alta, no garantizamos que la lectura sea 100% correcta en todos los casos. El usuario es responsable de confirmar pagos críticos directamente con su entidad bancaria.</p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>6. Tratamiento de datos personales</h2>
            <p>
              FlashPago recolecta y trata datos personales (datos de la cuenta, de las transacciones verificadas y
              técnicos) para el funcionamiento del servicio. El detalle completo — responsable, finalidades,
              encargados del tratamiento (incluyendo el proveedor de inteligencia artificial y Google), transferencia
              internacional, tiempo de conservación, medidas de seguridad y el procedimiento para ejercer tus
              derechos (conocer, actualizar, rectificar, suprimir y revocar la autorización) — está en nuestra{' '}
              <a href="/?vista=privacidad" target="_blank" rel="noopener noreferrer" style={{ color: "#F57C00" }}>
                Política de Tratamiento de Datos Personales
              </a>, que forma parte integral de estos Términos y Condiciones.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>7. Integración con Gmail y acceso a notificaciones bancarias</h2>
            <p>FlashPago utiliza la API de Gmail de Google para verificar pagos en tiempo real. Para que el servicio funcione, el titular del negocio debe conceder acceso de lectura a la cuenta de Gmail donde recibe las notificaciones bancarias (Bancolombia, Nequi, Daviplata, etc.).</p>
            <p style={{ marginTop: "0.75rem" }}>
              Al autorizar el acceso, FlashPago lee únicamente los correos de notificación de transacciones
              bancarias, y extrae de ellos solo el monto, la referencia, el banco y la fecha necesarios para cruzar
              esa información con el comprobante enviado por WhatsApp. FlashPago <strong>NO lee, almacena ni accede</strong>{' '}
              a correos personales, contactos, ni ningún otro dato de la cuenta de Gmail.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Esta información se conserva mientras la cuenta del negocio esté activa, conforme al tiempo de
              conservación descrito en la Política de Tratamiento de Datos Personales. El usuario puede revocar el
              acceso a Gmail en cualquier momento desde su cuenta de Google (myaccount.google.com → Seguridad →
              Aplicaciones de terceros). Al revocar el acceso, la verificación automática de pagos dejará de
              funcionar, y FlashPago deja de tener cualquier acceso nuevo a esa cuenta de Gmail desde ese momento.
            </p>
            <p style={{ marginTop: "0.75rem" }}>FlashPago cumple con las políticas de uso de la API de Gmail de Google, incluyendo los requisitos de Uso Limitado ("Limited Use"), y no comparte los datos obtenidos con terceros salvo lo estrictamente necesario para prestar el Servicio.</p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>8. Planes, precios y facturación</h2>
            <p>
              Los precios están en pesos colombianos (COP), e incluyen los impuestos aplicables salvo que se indique
              lo contrario. Según el plan y la opción elegida al momento de la contratación, la facturación es{' '}
              <strong>mensual o anual</strong>, y se renueva automáticamente al finalizar cada periodo por el mismo
              medio de pago registrado, salvo que el usuario cancele antes de la fecha de renovación.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Cada plan tiene un límite mensual de comprobantes verificados. Si el negocio supera ese límite, se le
              notificará para que actualice de plan; el Servicio no queda suspendido de inmediato por exceder el
              límite. En caso de falta de pago en la fecha de renovación, el acceso al Servicio puede suspenderse
              hasta que se regularice el pago, sin que ello implique la eliminación inmediata de los datos del
              negocio.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>9. Cancelación, reembolsos, retracto y reversión</h2>
            <p>
              El servicio puede cancelarse en cualquier momento sin penalización, desde el panel de administración o
              contactando a soporte. Salvo lo indicado en esta sección, no se realizan reembolsos por días no
              utilizados del periodo ya facturado y efectivamente prestado.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Esta regla de no reembolso <strong>no aplica</strong> cuando FlashPago incumple sus obligaciones,
              suspende el servicio de forma injustificada, o no presta el servicio contratado total o parcialmente;
              en esos casos procede el reintegro proporcional al tiempo no prestado.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <strong>Derecho de retracto:</strong> si contrataste el Servicio por primera vez a través de un medio
              electrónico, tienes derecho a retractarte dentro de los cinco (5) días hábiles siguientes a la
              contratación, siempre que no hayas hecho uso efectivo del Servicio durante ese periodo, conforme a la
              Ley 1480 de 2011. Para ejercerlo, contáctanos por los medios indicados en la sección 14.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <strong>Reversión de pago:</strong> si el cobro de tu suscripción corresponde a una operación
              fraudulenta, no autorizada, o el Servicio contratado no fue provisto, puedes solicitar la reversión del
              pago ante FlashPago o directamente ante Wompi (la pasarela de pagos), conforme al procedimiento
              aplicable a medios de pago electrónicos en Colombia.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>10. Disponibilidad</h2>
            <p>FlashPago funciona 24/7, sin embargo, pueden existir interrupciones por mantenimiento, actualizaciones o causas de fuerza mayor. FlashPago no responde por pérdidas derivadas de interrupciones temporales que no le sean imputables, sin perjuicio de lo dispuesto en la sección 11.</p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>11. Responsabilidad</h2>
            <p>
              FlashPago es una herramienta de apoyo para la verificación de pagos; la decisión final de aceptar o
              rechazar un pago es responsabilidad del usuario, quien debe confirmar operaciones críticas directamente
              con su entidad bancaria. FlashPago no se hace responsable por pérdidas económicas derivadas de pagos
              fraudulentos que la herramienta no haya podido detectar, siempre que el Servicio se haya prestado de
              acuerdo con lo aquí descrito.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Esta limitación <strong>no exonera</strong> a FlashPago de responsabilidad en casos de dolo, culpa
              grave, fallas de seguridad atribuibles a FlashPago, tratamiento indebido de datos personales, o
              incumplimiento de las obligaciones propias del Servicio descritas en estos términos, frente a los
              cuales FlashPago responde conforme a la ley colombiana.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>12. Propiedad intelectual</h2>
            <p>FlashPago, su logo, diseño y tecnología son propiedad de sus creadores. Queda prohibida la reproducción, distribución o modificación del servicio sin autorización.</p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>13. Modificaciones a estos términos</h2>
            <p>
              Podemos actualizar estos términos para reflejar cambios en el Servicio o en la normativa aplicable.
              Los cambios menores (ej. correcciones de redacción o de contacto) se publican con la fecha de
              actualización visible. Los cambios sustanciales — que afecten precio, alcance del servicio,
              responsabilidad, tratamiento de datos o condiciones de terminación — se notificarán a los usuarios
              registrados por correo electrónico o WhatsApp con antelación razonable, y requerirán una nueva
              aceptación expresa para seguir aplicando al usuario ya registrado.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>14. Peticiones, quejas y reclamos (PQR)</h2>
            <p>
              Puedes presentar peticiones, quejas o reclamos relacionados con el Servicio al correo{' '}
              <strong>contacto@flashpago.co</strong> o al WhatsApp <strong>+57 316 7064671</strong>, indicando tu
              nombre, el negocio asociado y el motivo de la solicitud. Toda PQR recibida se confirma con un acuse de
              recibo (fecha y hora de radicación) y se resuelve en un plazo máximo de quince (15) días hábiles,
              conforme a la Ley 1480 de 2011 (Estatuto del Consumidor).
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>15. Contacto</h2>
            <p>
              Para preguntas sobre estos términos, contáctanos al correo <strong>contacto@flashpago.co</strong> o por
              WhatsApp al <strong>+57 316 7064671</strong>.
            </p>
          </section>

        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "3rem", paddingTop: "1.5rem", textAlign: "center", color: "#6868a0", fontSize: "0.8rem" }}>
          © 2026 FlashPago. Todos los derechos reservados. Hecho en Colombia 🇨🇴
        </div>
      </div>
    </div>
  );
}
