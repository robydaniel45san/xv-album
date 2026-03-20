import { google } from 'googleapis';

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

const FOLDER_ID = process.env.FOLDER_ID;

function getDriveService() {
  const oauth2 = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth2 });
}

async function getOrCreateFolder(drive, parentId, name) {
  const safe = name.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 40);
  const res = await drive.files.list({
    q: `name='${safe}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });
  if (res.data.files.length > 0) return res.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: {
      name: safe,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return folder.data.id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  try {
    const { fileName, fileType, base64, guest } = req.body;
    if (!fileName || !base64)
      return res.status(400).json({ ok: false, error: 'Datos incompletos' });

    const drive  = getDriveService();
    const target = guest?.trim()
      ? await getOrCreateFolder(drive, FOLDER_ID, guest.trim())
      : FOLDER_ID;

    // Convertir base64 a Buffer y subirlo usando uploadType=multipart
    const buffer   = Buffer.from(base64, 'base64');
    const mimeType = fileType || 'image/jpeg';

    const { data } = await drive.files.create({
      requestBody: {
        name    : fileName,
        parents : [target],
      },
      media: {
        mimeType,
        body: require('stream').Readable.from(buffer),
      },
      fields: 'id, name',
    });

    res.json({ ok: true, id: data.id, name: data.name });
  } catch (e) {
    console.error('[upload error]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
}
