import { google } from 'googleapis';

export default async function handler(req, res) {
  const info = {
    FOLDER_ID:    process.env.FOLDER_ID     ? '✅ set' : '❌ missing',
    CLIENT_ID:    process.env.OAUTH_CLIENT_ID     ? '✅ set' : '❌ missing',
    CLIENT_SECRET:process.env.OAUTH_CLIENT_SECRET ? '✅ set' : '❌ missing',
    REFRESH_TOKEN:process.env.OAUTH_REFRESH_TOKEN ? '✅ set' : '❌ missing',
  };

  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.OAUTH_CLIENT_ID,
      process.env.OAUTH_CLIENT_SECRET,
    );
    oauth2.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });

    // Paso 1: obtener access token
    const tokenRes = await oauth2.getAccessToken();
    info.accessToken = tokenRes.token ? '✅ obtenido' : '❌ no obtenido';

    // Paso 2: listar archivos en la carpeta
    const drive = google.drive({ version: 'v3', auth: oauth2 });
    const list  = await drive.files.list({
      q: `'${process.env.FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 3,
    });
    info.folderAccess = '✅ carpeta accesible';
    info.filesFound   = list.data.files.length;

  } catch (e) {
    info.error       = e.message;
    info.errorStatus = e?.response?.status;
    info.errorData   = e?.response?.data;
  }

  res.json(info);
}
