import { ArrowLeft } from 'lucide-react';

export default function Privacidad({ onVolver }) {
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
          Política de Tratamiento de Datos Personales
        </h1>
        <p style={{ color: "#8888a8", marginBottom: "2.5rem" }}>Última actualización: Septiembre 2026 · Versión 2</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", lineHeight: 1.8, fontSize: "0.95rem" }}>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>1. Responsable del tratamiento</h2>
            <p>
              <strong>Rodolfo de Jesús Ramírez Gómez</strong>, persona natural, identificado con cédula de
              ciudadanía No. <strong>70118928</strong> (NIT <strong>70118928-2</strong>), propietario del
              establecimiento de comercio <strong>Vinson Burgers</strong> (matrícula mercantil No. 290874, Cámara
              de Comercio Aburrá Sur — Vinson Burgers no es una persona jurídica distinta, es el nombre comercial
              bajo el cual opera Rodolfo de Jesús Ramírez Gómez), con dirección comercial en{' '}
              <strong>CR 62 #77 Sur 56, La Estrella, Antioquia, Colombia</strong>, correo de contacto{' '}
              <strong>contacto@flashpago.co</strong> y WhatsApp <strong>+57 316 7064671</strong>, en calidad de
              responsable del tratamiento de los datos personales de los negocios registrados en la plataforma{' '}
              <strong>FlashPago</strong> (sitio web, panel de administración y bot de WhatsApp), en adelante
              "FlashPago" o "el Servicio".
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>2. Marco legal aplicable</h2>
            <p>
              Esta política se rige por la <strong>Constitución Política de Colombia (artículo 15)</strong>, la{' '}
              <strong>Ley Estatutaria 1581 de 2012</strong> ("Ley de Protección de Datos Personales" o Habeas Data), el{' '}
              <strong>Decreto 1377 de 2013</strong> (compilado en el <strong>Decreto Único Reglamentario 1074 de 2015</strong>,
              Título 2, Capítulo 25) y la <strong>Circular Externa 002 de 2015</strong> de la Superintendencia de
              Industria y Comercio (SIC), así como las demás normas que las modifiquen, adicionen o sustituyan.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>3. Responsable vs. encargado: dos roles distintos</h2>
            <p>
              FlashPago presta el Servicio a distintos negocios. Frente a los datos de la <strong>cuenta del
              negocio</strong> (nombre, WhatsApp, correo, credenciales de acceso), FlashPago actúa como{' '}
              <strong>responsable del tratamiento</strong>: decide para qué se usan esos datos.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Frente a los datos de <strong>los clientes de cada negocio</strong> (por ejemplo, el nombre de la
              persona que hizo una transferencia y aparece en un comprobante), es <strong>el negocio registrado</strong>{' '}
              quien decide recolectar y verificar esa información para su propia operación comercial — el negocio
              actúa como responsable de esos datos, y FlashPago actúa como <strong>encargado del tratamiento</strong>:
              los procesa únicamente por instrucción del negocio y para la finalidad de verificar ese pago, sin
              decidir sobre ellos de forma independiente.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>4. Datos personales que recopilamos</h2>
            <p>Según cómo se use el Servicio, recopilamos:</p>
            <p style={{ marginTop: "0.75rem" }}>
              <strong>De los negocios registrados y sus empleados:</strong> nombre, número de WhatsApp, correo
              electrónico, ciudad, banco principal, y un <strong>usuario y contraseña propios de FlashPago</strong>{' '}
              para iniciar sesión en el panel (nunca credenciales bancarias — FlashPago nunca solicita ni almacena
              claves de acceso a cuentas bancarias; la conexión con el banco se hace por lectura de notificaciones
              vía Gmail, ver sección 7). La contraseña de FlashPago nunca se almacena en texto plano (ver sección 11).
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <strong>De las transacciones verificadas (datos de clientes del negocio):</strong> monto, referencia
              bancaria, banco, fecha y hora, nombre del cliente que realizó el pago (cuando aparece en el
              comprobante o en la notificación bancaria), y la imagen del comprobante enviado por WhatsApp.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <strong>Datos técnicos:</strong> dirección IP, fecha y hora de acceso, y registros (logs) de uso del
              Servicio, con fines de seguridad y prevención de fraude.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>5. Finalidades del tratamiento</h2>
            <p>Los datos recolectados se usan exclusivamente para:</p>
            <p style={{ marginTop: "0.75rem" }}>
              a) Verificar la autenticidad de comprobantes de pago mediante inteligencia artificial y cruce con
              notificaciones bancarias.<br />
              b) Detectar comprobantes duplicados o fraudulentos.<br />
              c) Generar reportes, estadísticas y el panel de administración de cada negocio.<br />
              d) Enviar notificaciones operativas por WhatsApp o correo electrónico (confirmaciones, alertas,
              códigos de verificación, reportes diarios).<br />
              e) Gestionar el registro, autenticación y facturación de las cuentas.<br />
              f) Cumplir obligaciones legales y atender requerimientos de autoridades competentes.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              No usamos los datos personales para fines publicitarios de terceros ni los vendemos ni los cedemos a
              cambio de una contraprestación.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>6. Cómo se obtiene su autorización</h2>
            <p>
              La autorización para el tratamiento de datos se obtiene de forma previa, expresa e informada al momento
              del registro en la plataforma, mediante la aceptación explícita (casilla no premarcada) de esta
              Política y de los <strong>Términos y Condiciones</strong>. En el caso de la conexión con Gmail, la
              autorización adicional se otorga directamente a través del flujo de consentimiento (OAuth) de Google,
              y puede revocarse en cualquier momento desde la cuenta de Google del negocio.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>7. Encargados del tratamiento y proveedores</h2>
            <p>
              Para operar el Servicio, algunos datos se comparten con proveedores tecnológicos que actúan como{' '}
              <strong>encargados del tratamiento</strong> (procesan los datos por instrucción nuestra, para las
              mismas finalidades descritas en la sección 5, no como responsables independientes):
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              <strong>Anthropic (lectura del comprobante):</strong> recibe únicamente la imagen del comprobante para
              extraer monto, banco, referencia y fecha. Procesa en servidores fuera de Colombia (Estados Unidos),
              bajo sus propios términos de servicio para clientes empresariales, que incluyen obligaciones de
              confidencialidad y no usar los datos para entrenar sus modelos de IA. No conserva la imagen más allá
              de lo necesario para procesar cada solicitud.<br />
              <strong>Google (Gmail API):</strong> el negocio autoriza el acceso de lectura a su bandeja de correo
              para que FlashPago compare comprobantes con notificaciones bancarias. Procesa en servidores fuera de
              Colombia, bajo la Google API Services User Data Policy (ver detalle en sección 9).<br />
              <strong>Wompi (cobro de la suscripción):</strong> pasarela de pagos vigilada en Colombia; procesa el
              pago de tu plan. FlashPago nunca ve ni almacena el número de tu tarjeta — eso lo maneja Wompi
              directamente, bajo sus propias políticas de seguridad (PCI-DSS).<br />
              <strong>OpenWA (envío y recepción de mensajes):</strong> intermediario técnico autoalojado por
              FlashPago para enviar y recibir los mensajes del bot de WhatsApp; los datos permanecen en la
              infraestructura de FlashPago.<br />
              <strong>Proveedor de hosting:</strong> almacena la base de datos y las imágenes de comprobantes de
              forma segura en el servidor donde opera FlashPago.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Con cada encargado que procesa datos por fuera de la infraestructura propia de FlashPago (Anthropic,
              Google, Wompi), el tratamiento se sujeta a los términos contractuales de servicio para clientes
              empresariales de dicho proveedor, que incluyen compromisos de confidencialidad y seguridad de la
              información. FlashPago revisa estos términos antes de integrar un proveedor nuevo.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>8. Transmisión y transferencia internacional de datos</h2>
            <p>
              Anthropic y Google procesan información en servidores ubicados fuera de Colombia, actuando en ambos
              casos como <strong>encargados del tratamiento</strong> por instrucción de FlashPago y para las
              finalidades descritas en esta Política — esto constituye una <strong>transmisión internacional</strong>{' '}
              (no una transferencia a un responsable distinto), que conforme al artículo 26 de la Ley 1581 de 2012
              no requiere autorización separada del titular cuando existe un contrato de transmisión que garantice
              el cumplimiento de la ley colombiana, como es el caso.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Al aceptar esta Política, el titular es informado de esta transmisión y de que se realiza únicamente
              para las finalidades aquí descritas y bajo los estándares de protección exigidos por la legislación
              colombiana.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>9. Tiempo de conservación por categoría</h2>
            <p>
              Los datos se conservan por categoría de la siguiente forma, y siempre mientras la cuenta del negocio
              esté activa como mínimo:
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              a) <strong>Comprobantes de pago e imágenes:</strong> mientras la cuenta esté activa, y hasta 5 años
              después de su registro por posibles requerimientos contables o fiscales.<br />
              b) <strong>Registros técnicos (logs):</strong> hasta 12 meses, con fines de seguridad.<br />
              c) <strong>Datos de facturación:</strong> según los términos exigidos por la normativa tributaria
              colombiana vigente.<br />
              d) <strong>Autorización (token) de acceso a Gmail:</strong> mientras el negocio no revoque el acceso;
              se elimina inmediatamente al revocarse o al eliminar la cuenta.<br />
              e) <strong>Reclamos y PQR:</strong> hasta 2 años después de resueltos, como constancia de atención.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Al solicitar la eliminación de una cuenta, los datos personales se eliminan o anonimizan, salvo
              aquellos que debamos conservar por mandato legal según lo indicado arriba.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>10. Derechos del titular de los datos</h2>
            <p>Como titular de datos personales, usted tiene derecho a:</p>
            <p style={{ marginTop: "0.75rem" }}>
              a) Conocer, actualizar y rectificar sus datos personales.<br />
              b) Solicitar prueba de la autorización otorgada.<br />
              c) Ser informado sobre el uso que se le ha dado a sus datos.<br />
              d) Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.<br />
              e) Revocar la autorización y/o solicitar la supresión de sus datos, cuando no exista un deber legal
              o contractual que impida eliminarlos.<br />
              f) Acceder de forma gratuita a sus datos personales que hayan sido objeto de tratamiento.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>11. Medidas de seguridad y respuesta a incidentes</h2>
            <p>
              Aplicamos medidas técnicas y administrativas razonables para proteger los datos personales, entre
              ellas: contraseñas almacenadas mediante funciones de cifrado unidireccional con sal aleatoria (nunca
              en texto plano), control de acceso basado en roles y por negocio, límite de intentos de inicio de
              sesión, comunicación cifrada (HTTPS) para el acceso al panel de administración, y copias de seguridad
              periódicas de la base de datos.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              El acceso administrativo a los datos de los negocios está restringido al personal estrictamente
              necesario para operar y dar soporte al Servicio. En caso de una violación de la seguridad que
              comprometa la confidencialidad, integridad o disponibilidad de los datos personales, FlashPago la
              reportará a la Superintendencia de Industria y Comercio y, cuando exista riesgo para los titulares, se
              lo informará a los negocios afectados, conforme a los plazos y condiciones exigidos por la ley.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>12. Cómo ejercer sus derechos y procedimiento de reclamos</h2>
            <p>
              Las solicitudes relacionadas con sus datos personales (consultas, reclamos, actualización,
              rectificación o supresión) pueden enviarse al correo <strong>contacto@flashpago.co</strong> o al
              WhatsApp <strong>+57 316 7064671</strong>, indicando como mínimo: nombre completo, identificación,
              el negocio asociado, una descripción clara de los hechos y, si aplica, los documentos que quiera
              hacer valer.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Si el reclamo está incompleto, se le requerirá dentro de los cinco (5) días siguientes al recibo para
              que subsane las fallas; si no lo hace dentro de los dos (2) meses siguientes, se entenderá desistido.
              Recibido el reclamo completo, se incluirá en la base de datos una leyenda de <strong>"reclamo en
              trámite"</strong> y el motivo, hasta que se decida sobre él. Si FlashPago no es competente para
              resolverlo, lo trasladará al responsable competente en un plazo máximo de dos (2) días hábiles e
              informará de la situación al titular.
            </p>
            <p style={{ marginTop: "0.75rem" }}>
              Las consultas se atenderán en un plazo máximo de <strong>10 días hábiles</strong> (prorrogable 5 días
              hábiles más, informando el motivo) y los reclamos en un plazo máximo de <strong>15 días
              hábiles</strong> desde su recibo, conforme al artículo 14 de la Ley 1581 de 2012.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>13. Menores de edad</h2>
            <p>
              FlashPago está dirigido a negocios y personas mayores de edad, y no recolectamos intencionalmente
              datos de menores de edad. Si un comprobante de pago llegara a contener accidentalmente datos de un
              menor (por ejemplo, el nombre de quien hizo la transferencia), esos datos se tratan con la protección
              reforzada que exige la Ley 1581 de 2012 para niños, niñas y adolescentes: se usan únicamente para la
              finalidad de verificar esa transacción puntual, y el titular (o su representante legal) puede
              solicitar en cualquier momento su rectificación o supresión por los canales de la sección 12, los
              cuales se atenderán de forma prioritaria.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>14. Sesión y datos guardados en tu navegador</h2>
            <p>
              Para que no tengas que escribir tu contraseña en cada página, guardamos en tu navegador la
              información mínima que te mantiene con la sesión iniciada, incluida una cookie. Esa información
              se queda en tu dispositivo, caduca a las 24 horas y se borra cuando cierras sesión.
            </p>
            <p>
              No usamos cookies de publicidad ni de seguimiento.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>15. Autoridad de control</h2>
            <p>
              La autoridad competente en Colombia para vigilar el cumplimiento de la normativa de protección de
              datos personales es la <strong>Superintendencia de Industria y Comercio (SIC)</strong>, Delegatura
              para la Protección de Datos Personales.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>16. Cambios a esta política</h2>
            <p>
              Esta Política puede actualizarse para reflejar cambios en el Servicio o en la normativa aplicable.
              Los cambios sustanciales se notificarán a los usuarios registrados por correo electrónico o WhatsApp
              antes de su entrada en vigencia, y requerirán una nueva aceptación expresa cuando afecten las
              finalidades, los proveedores encargados del tratamiento, o los derechos del titular aquí descritos.
            </p>
          </section>

          <section>
            <h2 style={{ color: "#F57C00", fontSize: "1.1rem", marginBottom: "0.5rem" }}>17. Contacto</h2>
            <p>
              Para preguntas sobre esta Política o el tratamiento de sus datos personales, contáctenos en{' '}
              <strong>contacto@flashpago.co</strong> o por WhatsApp al <strong>+57 316 7064671</strong>.
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
