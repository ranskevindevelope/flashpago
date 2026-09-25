// scripts/revisar-plantillas-meta.js — Qué cuenta de WhatsApp Business usa el bot y qué plantillas tiene.
//
// Uso (en la carpeta del bot):
//   node scripts/revisar-plantillas-meta.js
//   node scripts/revisar-plantillas-meta.js --waba <id>   (si no detecta la cuenta sola)
// Lee META_ACCESS_TOKEN y META_PHONE_NUMBER_ID del .env. No muestra el token.

require('dotenv').config();

const VERSION = process.env.META_API_VERSION || 'v20.0';
const TOKEN = process.env.META_ACCESS_TOKEN;
const NUMERO_ID = process.env.META_PHONE_NUMBER_ID;

async function graph(ruta, params = {}) {
  const url = new URL(`https://graph.facebook.com/${VERSION}/${ruta}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  if (data.error) throw new Error(`${ruta}: ${data.error.message}`);
  return data;
}

async function main() {
  if (!TOKEN || !NUMERO_ID) throw new Error('Faltan META_ACCESS_TOKEN o META_PHONE_NUMBER_ID en el .env');

  const numero = await graph(NUMERO_ID, { fields: 'display_phone_number,verified_name' });
  console.log(`Número del bot: ${numero.display_phone_number} (${numero.verified_name}), id ${NUMERO_ID}`);

  const token = (await graph('debug_token', { input_token: TOKEN })).data;
  const caduca = token.expires_at ? new Date(token.expires_at * 1000).toLocaleString('es-CO') : 'nunca';
  console.log(`Token: ${token.is_valid ? 'válido' : 'NO válido'}, caduca: ${caduca}\n`);

  // Las cuentas (WABA) a las que el token tiene acceso vienen en sus permisos.
  const i = process.argv.indexOf('--waba');
  const wabas = i > -1
    ? [process.argv[i + 1]]
    : [...new Set((token.granular_scopes || [])
      .filter((s) => s.scope.startsWith('whatsapp_business'))
      .flatMap((s) => s.target_ids || []))];
  if (!wabas.length) throw new Error('No pude detectar la cuenta. Pásala con --waba <id> (sale en WhatsApp Manager).');

  for (const waba of wabas) {
    const numeros = (await graph(`${waba}/phone_numbers`, { fields: 'id,display_phone_number' })).data;
    const delBot = numeros.some((n) => n.id === NUMERO_ID);
    console.log(`Cuenta ${waba} ${delBot ? '<- ESTA es la que usa el bot' : '(el bot no usa esta)'}`);
    for (const n of numeros) console.log(`  número: ${n.display_phone_number} (id ${n.id})`);

    const plantillas = (await graph(`${waba}/message_templates`, { fields: 'name,language,status', limit: 100 })).data;
    for (const p of plantillas) console.log(`  ${p.name.padEnd(28)} ${p.language.padEnd(7)} ${p.status}`);
    console.log('');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
