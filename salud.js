// salud.js — Registro de fallas recientes del procesamiento de pagos.
// Antes se adivinaba si el bot estaba vivo preguntándole a la API de
// WhatsApp (falsos positivos); acá se mide si algo *falló de verdad*.
// Vive en memoria a propósito: interesa el estado de ahora, arranca
// limpio en cada despliegue.

const VENTANA_MS = 15 * 60 * 1000; // se considera "reciente" lo de 15 minutos
const MAX_GUARDADOS = 40;

const incidentes = [];

// No se registra Gmail: que un correo del banco no aparezca es normal — el
// correo se demora y la verificación nocturna lo recupera. Alertar por eso
// prendería la alarma todos los días sin motivo.
const ETIQUETAS = {
  ocr: 'lectura de comprobantes',
  conexion: 'conexión con el servidor de WhatsApp',
  sesion: 'la sesión de WhatsApp (puede necesitar reconectarse)',
  envio: 'envío de mensajes por WhatsApp',
  webhook: 'procesamiento de comprobantes',
};

// Nunca lanza: registrar una falla jamás debe provocar otra.
function registrar(tipo, detalle, negocio_id) {
  try {
    incidentes.push({
      tipo,
      detalle: typeof detalle === 'string' ? detalle.slice(0, 200) : '',
      negocio_id: negocio_id || null,
      en: Date.now(),
    });
    if (incidentes.length > MAX_GUARDADOS) incidentes.splice(0, incidentes.length - MAX_GUARDADOS);
  } catch {
    // sin ruido
  }
}

// "a", "a y b", "a, b y c"
function enumerar(items) {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

// Solo estos dos son "de toda la plataforma" (sin sesión/conexión, nadie
// envía ni recibe nada); "envio" es puntual a un destinatario.
const TIPOS_PLATAFORMA = ['sesion', 'conexion'];

// Resumen para el dashboard. `incluirPlataforma` va en false para negocios
// sin Gmail conectado, a quienes no tiene sentido alarmar por eso.
function resumen(negocio_id, { incluirPlataforma = true } = {}) {
  const desde = Date.now() - VENTANA_MS;
  const recientes = incidentes.filter((i) => {
    if (i.en < desde) return false;
    if (!negocio_id) return true; // vista global (admin de plataforma)
    if (i.negocio_id === negocio_id) return true;
    if (!i.negocio_id && incluirPlataforma && TIPOS_PLATAFORMA.includes(i.tipo)) return true;
    return false;
  });

  if (recientes.length === 0) return { hayFallas: false, cantidad: 0 };

  const tipos = [...new Set(recientes.map((i) => i.tipo))];
  const ultimo = recientes[recientes.length - 1];

  return {
    hayFallas: true,
    cantidad: recientes.length,
    tipos,
    afectado: enumerar(tipos.map((t) => ETIQUETAS[t] || t)),
    ultimoDetalle: ultimo.detalle || null,
    haceSegundos: Math.round((Date.now() - ultimo.en) / 1000),
  };
}

module.exports = { registrar, resumen };
