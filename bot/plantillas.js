// bot/plantillas.js — Plantillas de mensajes proactivos de WhatsApp.
//
// Un aviso de vencimiento se envia sin que el cliente haya escrito antes, o sea
// fuera de la ventana de 24 h de Meta. Ahi la API solo acepta plantillas
// aprobadas (el error 131047 que ya maneja openwa.js). Hoy salimos por openwa,
// que no es oficial y puede caerse; el dia que toque migrar, el cambio debe ser
// WA_PROVIDER=meta y nada mas.
//
// Por eso `cuerpo` es EXACTAMENTE el texto que se registra en el panel de Meta,
// con sus variables numeradas. No se reescribe aqui ni alla: se copia y pega.

const PLANTILLAS = {
  // Los mensajes proactivos de reportes.js llevan hoy la lista de cada pago.
  // Una variable de plantilla no admite saltos de linea, asi que la version de
  // Meta va en resumen: cifras, sin detalle. Con openwa se sigue mandando el
  // texto completo (ver `textoOpenwa` en enviarPlantilla).
  reporte_diario: {
    nombre: 'reporte_diario',
    idioma: 'es',
    categoria: 'UTILITY',
    variables: ['nombre del negocio', 'cantidad de pagos', 'total recibido'],
    cuerpo:
      'Cierre del día en {{1}}: {{2}} pagos confirmados por un total de ${{3}} COP. ' +
      'Responde a este mensaje para ver el detalle.',
  },

  verificacion_nocturna: {
    nombre: 'verificacion_nocturna',
    idioma: 'es',
    categoria: 'UTILITY',
    variables: ['nombre del negocio', 'cantidad de pagos', 'total recuperado'],
    cuerpo:
      'Verificación automática en {{1}}: se confirmaron {{2}} pago(s) que estaban pendientes, ' +
      'por un total de ${{3}} COP. Responde a este mensaje para ver el detalle.',
  },

  pagos_no_confirmados: {
    nombre: 'pagos_no_confirmados',
    idioma: 'es',
    categoria: 'UTILITY',
    variables: ['nombre del negocio', 'cantidad de pagos'],
    cuerpo:
      'En {{1}} quedaron {{2}} pago(s) sin confirmar: no aparecieron en las notificaciones del banco. ' +
      'Revísalos manualmente en la app de tu banco o responde a este mensaje para ver cuáles son.',
  },

  ingresos_sin_comprobante: {
    nombre: 'ingresos_sin_comprobante',
    idioma: 'es',
    categoria: 'UTILITY',
    variables: ['nombre del negocio', 'cantidad de transferencias', 'total sin comprobante'],
    cuerpo:
      'En {{1}} entraron {{2}} transferencia(s) por ${{3}} COP sin comprobante registrado. ' +
      'Pide los comprobantes o responde a este mensaje para ver el detalle.',
  },

  plan_por_vencer: {
    nombre: 'plan_por_vencer',
    idioma: 'es',
    categoria: 'UTILITY',
    variables: ['nombre del admin', 'nombre del plan', 'fecha de vencimiento'],
    cuerpo:
      'Hola {{1}}, tu plan {{2}} de FlashPago vence el {{3}}. ' +
      'Renueva en flashpago.co/panel para que el bot siga verificando tus pagos sin interrupción.',
  },

  plan_vencido: {
    nombre: 'plan_vencido',
    idioma: 'es',
    categoria: 'UTILITY',
    variables: ['nombre del admin', 'fecha de vencimiento'],
    cuerpo:
      'Hola {{1}}, tu plan de FlashPago venció el {{2}} y el bot dejó de verificar comprobantes. ' +
      'Tus empleados no podrán validar pagos hasta que renueves en flashpago.co/panel.',
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
