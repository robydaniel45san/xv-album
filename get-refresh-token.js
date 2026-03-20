/**
 * Ejecuta este script UNA SOLA VEZ para obtener tu refresh token.
 *
 * Pasos previos en Google Cloud Console:
 * 1. Ve a: APIs y servicios → Credenciales
 * 2. Crear credencial → ID de cliente OAuth 2.0
 * 3. Tipo: Aplicación web
 * 4. Agrega URI de redireccionamiento autorizado: http://localhost:3333/callback
 * 5. Descarga el JSON → copia client_id y client_secret abajo
 */

const { google } = require('googleapis');
const http       = require('http');
const url        = require('url');

// ── Pon aquí tus datos OAuth2 ──────────────────────────────
const CLIENT_ID     = 'PEGA_TU_CLIENT_ID_AQUI';
const CLIENT_SECRET = 'PEGA_TU_CLIENT_SECRET_AQUI';
// ──────────────────────────────────────────────────────────

const REDIRECT = 'http://localhost:3333/callback';

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt:      'consent',
  scope:       ['https://www.googleapis.com/auth/drive'],
});

console.log('\n📋 Abre esta URL en tu navegador:\n');
console.log(authUrl);
console.log('\n⏳ Esperando autorización...\n');

const server = http.createServer(async (req, res) => {
  const qs = url.parse(req.url, true).query;
  if (!qs.code) return;

  try {
    const { tokens } = await oauth2.getToken(qs.code);
    console.log('\n✅ ¡Listo! Copia estos valores en Vercel y .env.local:\n');
    console.log('OAUTH_CLIENT_ID     =', CLIENT_ID);
    console.log('OAUTH_CLIENT_SECRET =', CLIENT_SECRET);
    console.log('OAUTH_REFRESH_TOKEN =', tokens.refresh_token);
    res.end('<h2>✅ ¡Autorizado! Cierra esta ventana y revisa la terminal.</h2>');
  } catch (e) {
    console.error('Error:', e.message);
    res.end('<h2>❌ Error: ' + e.message + '</h2>');
  } finally {
    server.close();
  }
});

server.listen(3333, () => {
  console.log('Servidor local escuchando en http://localhost:3333\n');
});
