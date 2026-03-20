import { google } from 'googleapis';
import { Readable } from 'stream';

export default async function handler(req, res) {
  const info = {
    vars: {
      FOLDER_ID:     process.env.FOLDER_ID          ? '✅' : '❌ missing',
      CLIENT_ID:     process.env.OAUTH_CLIENT_ID     ? '✅' : '❌ missing',
      CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET ? '✅' : '❌ missing',
      REFRESH_TOKEN: process.env.OAUTH_REFRESH_TOKEN ? '✅' : '❌ missing',
    }
  };

  try {
    // ── 1. Auth ───────────────────────────────────────────
    const oauth2 = new google.auth.OAuth2(
      process.env.OAUTH_CLIENT_ID,
      process.env.OAUTH_CLIENT_SECRET,
    );
    oauth2.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });
    const tokenRes = await oauth2.getAccessToken();
    info.step1_auth = tokenRes.token ? '✅ token OK' : '❌ sin token';

    const drive = google.drive({ version: 'v3', auth: oauth2 });

    // ── 2. Listar carpeta ─────────────────────────────────
    const list = await drive.files.list({
      q: `'${process.env.FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id,name)',
      pageSize: 3,
    });
    info.step2_folder = `✅ accesible (${list.data.files.length} archivos)`;

    // ── 3. Intentar subir archivo de prueba ───────────────
    // PNG 1x1 pixel (67 bytes)
    const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(testBase64, 'base64');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const upload = await drive.files.create({
      requestBody: {
        name:    'test-vercel.png',
        parents: [process.env.FOLDER_ID],
      },
      media: {
        mimeType: 'image/png',
        body: stream,
      },
      fields: 'id, name',
    });

    info.step3_upload = `✅ archivo subido: ${upload.data.name} (id: ${upload.data.id})`;

    // ── 4. Borrar el archivo de prueba ────────────────────
    await drive.files.delete({ fileId: upload.data.id });
    info.step4_cleanup = '✅ archivo de prueba eliminado';

  } catch (e) {
    info.ERROR         = e.message;
    info.ERROR_STATUS  = e?.response?.status  || 'N/A';
    info.ERROR_DETAILS = e?.response?.data    || 'N/A';
    info.ERROR_STEP    = 'ver campo ERROR arriba';
  }

  res.json(info);
}
