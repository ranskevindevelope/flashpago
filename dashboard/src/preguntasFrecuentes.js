// Preguntas frecuentes de la landing. Una sola fuente: las usa la sección de la página (Flashpagolanding.jsx)
// y los datos estructurados FAQPage que genera scripts/prerender.mjs para buscadores y agentes de IA.
export const PREGUNTAS = [
  {
    p: '¿Qué es FlashPago?',
    r: 'FlashPago es un bot de WhatsApp con inteligencia artificial que verifica en segundos las transferencias que recibe tu negocio. Lee el comprobante que manda el cliente, lo cruza con el banco y te dice si el pago es real, no existe o ya fue usado.',
  },
  {
    p: '¿Cómo funciona?',
    r: 'El cliente paga por transferencia y manda el comprobante. Tu cajero reenvía la captura al WhatsApp de FlashPago y en segundos recibe la respuesta: pago confirmado, no encontrado o duplicado.',
  },
  {
    p: '¿Con qué bancos funciona?',
    r: 'Con Nequi, Bancolombia y BBVA. Hoy funciona con bancos y billeteras de Colombia.',
  },
  {
    p: '¿Cuánto cuesta?',
    r: 'El plan Básico cuesta $39.900 al mes, el Premium $79.900 y el Premium Plus $109.900 (precios en pesos colombianos). Pagando por año tienes 2 meses gratis. Si tienes varias sucursales, el plan Empresarial se arma a la medida.',
  },
  {
    p: '¿Hay prueba gratis?',
    r: 'Sí. Al registrarte por primera vez tienes 15 días de prueba gratis para usar FlashPago con tus propios pagos. Al terminar eliges el plan que prefieras.',
  },
  {
    p: '¿Detecta comprobantes falsos o repetidos?',
    r: 'Sí. FlashPago cruza cada comprobante con el banco: si el pago no existe, responde que no lo encuentra, y si el comprobante ya se usó antes, avisa que está duplicado. Así detecta capturas editadas, comprobantes de apps falsas y comprobantes reutilizados.',
  },
  {
    p: '¿Qué pasa si el banco demora en mostrar el pago?',
    r: 'FlashPago sigue revisando unos minutos y te avisa por WhatsApp apenas el pago aparece, sin que tengas que reenviar el comprobante.',
  },
  {
    p: '¿Cuántas personas pueden usarlo?',
    r: 'El plan Básico permite hasta 3 usuarios, el Premium hasta 5 y el Premium Plus hasta 8. El plan Empresarial no tiene límite de usuarios.',
  },
  {
    p: '¿Cuánto tarda en estar listo?',
    r: 'Escríbenos por WhatsApp y te activamos FlashPago en menos de 24 horas.',
  },
];
