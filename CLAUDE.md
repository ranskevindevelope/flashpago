# CLAUDE.md

Guía rápida para trabajar en este repo con Claude Code. La documentación completa (flujo, endpoints, esquema de datos, configuración) está en [README.md](README.md) — léelo ahí antes de pedir que se explore el proyecto desde cero.

## Qué es

**FlashPago**: plataforma de verificación automática de pagos, no un bot — usa WhatsApp (vía OpenWA) como canal de entrada de comprobantes. Esta instancia está desplegada para Vinson Burgers: recibe comprobantes de pago, los procesa con Claude (OCR), los verifica contra Gmail y los registra en SQLite (`vinsonbot.db`). Incluye un dashboard React servido por el mismo backend Express.

## Dónde vive el código

- Backend: raíz del repo — `index.js` (entrypoint), `config.js`, `auth.js`, `db.js`, `ocr.js`, `gmail.js`, `verificador.js`.
- Rutas: `routes/api.js` (dashboard/API), `routes/webhook.js` (WhatsApp).
- Lógica del bot: `bot/` (`comandos.js`, `pendientes.js`, `reportes.js`, `festivos.js`, `state.js`, `openwa.js`, `utils.js`).
- Frontend: `dashboard/` (React, con su propio `package.json`).

## Comandos

```bash
node index.js              # backend (raíz)
cd dashboard && npm start  # dashboard en desarrollo
cd dashboard && npm run build  # build servido por el backend en /panel
```

`npm test` corre los tests de `test/` (node:test) contra la BD local, con negocios de prueba que se crean y se borran. `test/` no está en git.

## Cosas a tener en cuenta

- **Sin migraciones formales**: el esquema de `pagos` y `usuarios` se crea directamente en `db.js`. Cambios de esquema van ahí.
- **Verificación de pagos**: Gmail exige monto exacto y un correo confirma un solo pago (`gmail_id` único). Si no confirma, queda "no encontrado" y `bot/pendientes.js` lo sigue buscando 15 minutos, solo con correos que llegaron en ese plazo (Prometeo ya no se usa).
- **Festivos/fines de semana**: `bot/festivos.js` aplica la Ley Emiliani colombiana; `index.js` decide si sale el cierre de turno (15 min después de la hora de cierre de cada negocio) según las variables `HABILITAR_*` del `.env`.
- **Endpoint legado**: `/pago-recibido` está retirado (responde 410); no reintroducir lógica de MacroDroid/SMS/Android.
- **Remitentes autorizados**: el webhook solo procesa empleados de la tabla `usuarios` con el WhatsApp confirmado desde el dashboard (`confirmar <código>`). No hay listas de números en el código.
- **Proveedor de WhatsApp**: `WA_PROVIDER` (`.env`) switchea entre `openwa` (default, no oficial) y `meta` (API oficial, de respaldo por si banean el número). El switch vive en `bot/openwa.js` (envío) y `routes/webhook.js` (recepción + verificación de firma/handshake). Detalle completo en el README, sección "Respaldo: migrar a la API oficial de Meta".

## Seguridad y datos sensibles

- `vinsonbot.db` contiene pagos y datos de clientes reales — no lo leas/imprimas salvo que sea necesario para depurar un bug puntual, y nunca lo subas ni lo incluyas en salidas.
- `.env`, `credentials.json`, `token.json` y `comprobantes/` contienen secretos/material sensible (ya están en `.gitignore`). No los muestres en texto plano ni los uses fuera del propio proceso local.
- `JWT_SECRET` es obligatorio; el servidor no arranca sin él.

## Nota sobre la carpeta

Este repo (`.git`) vive en `burger-bot-openwa/burger-bot-openwa/`. La carpeta padre `burger-bot-openwa/` también contiene `burger-bot-openwa-backup/` (copia de respaldo, no es el repo activo) y `OpenWA/` (proyecto externo de la librería). Trabaja siempre dentro de esta carpeta, no en la de backup.
