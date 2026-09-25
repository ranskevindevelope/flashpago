// bot/plantillas.js — Plantillas de mensajes proactivos de WhatsApp.
// Los avisos de vencimiento salen fuera de la ventana de 24h de Meta, que ahi
// solo acepta plantillas aprobadas (error 131047, manejado en openwa.js).
// `cuerpo` debe ser EXACTAMENTE el texto registrado en el panel de Meta, en la
// cuenta del número del bot. `ejemplo` son las muestras que Meta pide al crearla
// (scripts/crear-plantillas-meta.js las crea desde aquí).

// "Spanish (COL)" en Meta. Tiene que coincidir exacto: con otro código Meta
// responde que la plantilla no existe.
const IDIOMA = 'es_CO';

const PLANTILLAS = {
  // Variable de plantilla no admite saltos de línea, así que la versión de
  // Meta va resumida (cifras, sin detalle); openwa manda el texto completo.
  reporte_diario: {
    nombre: 'reporte_diario',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del negocio', 'cantidad de pagos', 'total recibido'],
    ejemplo: ['Vinson Burgers', '25', '850.000'],
    cuerpo:
      'Cierre del día en {{1}}: {{2}} pagos confirmados por un total de ${{3}} COP. ' +
      'Puedes ver el detalle en flashpago.co/panel.',
  },

  verificacion_nocturna: {
    nombre: 'verificacion_nocturna',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del negocio', 'cantidad de pagos', 'total recuperado'],
    ejemplo: ['Vinson Burgers', '2', '45.000'],
    cuerpo:
      'Verificación automática en {{1}}: se confirmaron {{2}} pago(s) que estaban pendientes, ' +
      'por un total de ${{3}} COP. Puedes ver el detalle en flashpago.co/panel.',
  },

  pagos_no_confirmados: {
    nombre: 'pagos_no_confirmados',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del negocio', 'cantidad de pagos'],
    ejemplo: ['Vinson Burgers', '2'],
    cuerpo:
      'En {{1}} quedaron {{2}} pago(s) sin confirmar: no aparecieron en las notificaciones del banco. ' +
      'Revísalos en la app de tu banco. Puedes ver cuáles son en flashpago.co/panel.',
  },

  ingresos_sin_comprobante: {
    nombre: 'ingresos_sin_comprobante',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del negocio', 'cantidad de transferencias', 'total sin comprobante'],
    ejemplo: ['Vinson Burgers', '3', '120.000'],
    cuerpo:
      'En {{1}} entraron {{2}} transferencia(s) por ${{3}} COP sin comprobante registrado. ' +
      'Pídele los comprobantes a tu equipo para registrarlos.',
  },

  plan_por_vencer: {
    nombre: 'plan_por_vencer',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del admin', 'nombre del plan', 'fecha de vencimiento'],
    ejemplo: ['Kevin', 'Básico', '28/9/2026'],
    cuerpo:
      'Hola {{1}}, tu plan {{2}} de FlashPago vence el {{3}}. ' +
      'Renueva en flashpago.co/panel para que el bot siga verificando tus pagos sin interrupción.',
  },

  plan_vencido: {
    nombre: 'plan_vencido',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del admin', 'fecha de vencimiento'],
    ejemplo: ['Kevin', '28/9/2026'],
    cuerpo:
      'Hola {{1}}, tu plan de FlashPago venció el {{2}} y el bot dejó de verificar comprobantes. ' +
      'Tus empleados no podrán validar pagos hasta que renueves en flashpago.co/panel.',
  },

  // Periodo de prueba: solo informan el estado de la cuenta. Con "prueba gratis"
  // o "elige un plan" Meta las clasifica como Marketing.
  prueba_por_terminar: {
    nombre: 'prueba_por_terminar',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del admin', 'fecha de fin de la prueba'],
    ejemplo: ['Bryan', '28/9/2026'],
    cuerpo:
      'Hola {{1}}, el periodo de prueba de tu cuenta de FlashPago termina el {{2}}. ' +
      'A partir de esa fecha el bot dejará de verificar comprobantes. ' +
      'Puedes revisar el estado de tu cuenta en flashpago.co/panel.',
  },

  prueba_terminada: {
    nombre: 'prueba_terminada',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del admin', 'fecha de fin de la prueba'],
    ejemplo: ['Bryan', '28/9/2026'],
    cuerpo:
      'Hola {{1}}, el periodo de prueba de tu cuenta de FlashPago terminó el {{2}} y el bot dejó de verificar comprobantes. ' +
      'Tus datos siguen guardados. Puedes revisar el estado de tu cuenta en flashpago.co/panel.',
  },

  limite_alcanzado: {
    nombre: 'limite_alcanzado',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del admin', 'nombre del negocio', 'límite del plan', 'comprobantes de cortesía'],
    ejemplo: ['Kevin', 'Vinson Burgers', '300', '30'],
    cuerpo:
      'Hola {{1}}, {{2}} llegó a los {{3}} comprobantes incluidos en su plan este mes. ' +
      'El bot seguirá verificando {{4}} comprobantes adicionales de cortesía y después se detendrá hasta el próximo mes. ' +
      'Puedes ver el uso de tu cuenta en flashpago.co/panel.',
  },

  limite_agotado: {
    nombre: 'limite_agotado',
    idioma: IDIOMA,
    categoria: 'UTILITY',
    variables: ['nombre del admin', 'nombre del negocio', 'comprobantes usados'],
    ejemplo: ['Kevin', 'Vinson Burgers', '330'],
    cuerpo:
      'Hola {{1}}, {{2}} usó los {{3}} comprobantes de su plan de este mes, incluida la cortesía, ' +
      'y el bot dejó de verificar pagos. La verificación se reactiva el primer día del próximo mes ' +
      'o cuando actualices tu plan en flashpago.co/panel.',
  },
};

// Reglas que Meta aplica al aprobar una plantilla. Se validan en los tests para
// no descubrir el rechazo cuando ya estemos migrando con prisa.
function validarCuerpo(cuerpo) {
  const errores = [];
  if (cuerpo !== cuerpo.trim()) errores.push('no puede empezar ni terminar con espacios o saltos de linea');
  if (cuerpo.length > 1024) errores.push('supera los 1024 caracteres');
  if (/\{\{\d+\}\}\s*\{\{\d+\}\}/.test(cuerpo)) errores.push('tiene dos variables seguidas');
  if (/^\s*\{\{\d+\}\}/.test(cuerpo)) errores.push('empieza con una variable');
  if (/\{\{\d+\}\}\s*$/.test(cuerpo)) errores.push('termina con una variable');

  const numeros = [...cuerpo.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  const esperado = numeros.map((_, i) => i + 1);
  if (numeros.join(',') !== esperado.join(',')) {
    errores.push('las variables deben ir numeradas 1,2,3... sin saltos ni repeticiones');
  }
  return errores;
}

function obtener(clave) {
  const plantilla = PLANTILLAS[clave];
  if (!plantilla) throw new Error(`Plantilla desconocida: ${clave}`);
  return plantilla;
}

// Texto ya sustituido, para openwa (que manda texto libre).
function renderizar(clave, variables = []) {
  const { cuerpo, variables: nombres } = obtener(clave);
  if (variables.length !== nombres.length) {
    throw new Error(`Plantilla ${clave} espera ${nombres.length} variables y recibio ${variables.length}`);
  }
  return cuerpo.replace(/\{\{(\d+)\}\}/g, (_, n) => String(variables[Number(n) - 1] ?? ''));
}

// Carga JSON tal como la espera la API de Meta.
function cargaMeta(clave, variables = [], destino) {
  const plantilla = obtener(clave);
  renderizar(clave, variables); // valida el numero de variables antes de armar nada
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: destino,
    type: 'template',
    template: {
      name: plantilla.nombre,
      language: { code: plantilla.idioma },
      components: [
        {
          type: 'body',
          parameters: variables.map((v) => ({ type: 'text', text: String(v) })),
        },
      ],
    },
  };
}

module.exports = { PLANTILLAS, obtener, renderizar, cargaMeta, validarCuerpo };
