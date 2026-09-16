// scripts/prerender.mjs — Genera build/landing.html con el HTML ya resuelto
// de la landing (no la app del dashboard), para que bots que no ejecutan
// JavaScript (WhatsApp, Twitter, buscadores con IA) vean el contenido real
// en vez del <div id="root"></div> vacío. Corre automáticamente después de
// `npm run build` (ver "postbuild" en package.json).
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const buildDir = join(__dirname, '..', 'build');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.woff2': 'font/woff2',
};

// Servidor estático mínimo sobre el build ya generado — sin esto habría que
// levantar el backend completo (con base de datos, etc.) solo para leer HTML.
function servirEstatico(root) {
  return createServer(async (req, res) => {
    const rutaLimpia = decodeURIComponent(req.url.split('?')[0]);
    let filePath = join(root, rutaLimpia === '/' ? 'index.html' : rutaLimpia);
    try {
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      try {
        const data = await readFile(join(root, 'index.html')); // fallback de SPA
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    }
  });
}

const TITULO = 'FlashPago — Verifica pagos por transferencia en segundos';
const DESCRIPCION = 'Bot de WhatsApp con inteligencia artificial que lee comprobantes, verifica pagos reales y protege tu negocio contra fraudes.';

async function main() {
  const server = servirEstatico(buildDir);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  // Deja que las animaciones de entrada terminen, para no capturar el texto
  // a mitad de una transición de opacidad.
  await page.waitForTimeout(2500);
  let html = await page.content();
  await browser.close();
  server.close();

  const metaExtra = `
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="FlashPago">
    <meta property="og:title" content="${TITULO}">
    <meta property="og:description" content="${DESCRIPCION}">
    <meta property="og:image" content="https://flashpago.co/logo.png">
    <meta property="og:url" content="https://flashpago.co/">
    <meta name="twitter:card" content="summary_large_image">
  `;
  html = html
    .replace(/<title>.*?<\/title>/i, `<title>${TITULO}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${DESCRIPCION}">${metaExtra}`);

  await writeFile(join(buildDir, 'landing.html'), html);
  console.log(`[prerender] landing.html generado (${(html.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('[prerender] Error:', err.message);
  process.exit(1);
});
