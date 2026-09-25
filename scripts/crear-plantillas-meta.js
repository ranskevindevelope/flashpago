// scripts/crear-plantillas-meta.js — Crea en Meta las plantillas de bot/plantillas.js que falten
// en la cuenta de WhatsApp Business del número del bot.
//
// Uso (en la carpeta del bot, con el código actualizado):
//   node scripts/crear-plantillas-meta.js           (modo prueba: solo muestra qué crearía)
//   node scripts/crear-plantillas-meta.js --crear   (las crea de verdad)
// Lee META_ACCESS_TOKEN y META_PHONE_NUMBER_ID del .env. No muestra el token.

require('dotenv').config();
const { PLANTILLAS } = require('../bot/plantillas');

const VERSION = process.env.META_API_VERSION || 'v20.0';
const TOKEN = process.env.META_ACCESS_TOKEN;
const NUMERO_ID = process.env.META_PHONE_NUMBER_ID;

async function graph(ruta, { params = {}, body } = {}) {
  const url = new URL(`https://graph.facebook.com/${VERSION}/${ruta}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.error_user_msg || data.error.message);
  return data;
}

// La cuenta (WABA) que contiene el número del bot: ahí tienen que estar las plantillas.
async function cuentaDelBot() {
  const token = (await graph('debug_token', { params: { input_token: TOKEN } })).data;
  const wabas = [...new Set((token.granular_scopes || [])
    .filter((s) => s.scope.startsWith('whatsapp_business'))
    .flatMap((s) => s.target_ids || []))];
  for (const waba of wabas) {
    const numeros = (await graph(`${waba}/phone_numbers`, { params: { fields: 'id' } })).data;
    if (numeros.some((n) => n.id === NUMERO_ID)) return waba;
  }
  throw new Error('No encontré la cuenta del número del bot. Pásala con --waba <id>.');
}

async function main() {
  if (!TOKEN || !NUMERO_ID) throw new Error('Faltan META_ACCESS_TOKEN o META_PHONE_NUMBER_ID en el .env');
  const crear = process.argv.includes('--crear');
  const i = process.argv.indexOf('--waba');
  const waba = i > -1 ? process.argv[i + 1] : await cuentaDelBot();
  console.log(`Cuenta del bot: ${waba}${crear ? '' : '  (modo prueba: no se crea nada)'}\n`);

  const existentes = (await graph(`${waba}/message_templates`, { params: { fields: 'name,language', limit: 100 } })).data;
  const yaEstan = new Set(existentes.map((p) => `${p.name}|${p.language}`));

  for (const p of Object.values(PLANTILLAS)) {
    if (yaEstan.has(`${p.nombre}|${p.idioma}`)) {
      console.log(`= ${p.nombre}: ya existe`);
      continue;
    }
    if (!crear) {
      console.log(`+ ${p.nombre}: se crearía`);
      continue;
    }
    try {
      const r = await graph(`${waba}/message_templates`, {
        body: {
          name: p.nombre,
          language: p.idioma,
          category: p.categoria,
          components: [{ type: 'BODY', text: p.cuerpo, example: { body_text: [p.ejemplo] } }],
        },
      });
      const aviso = r.category && r.category !== p.categoria ? `  <- OJO: Meta la pasó a ${r.category}` : '';
      console.log(`+ ${p.nombre}: creada, estado ${r.status}${aviso}`);
    } catch (err) {
      console.log(`! ${p.nombre}: no se pudo crear: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
