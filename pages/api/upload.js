import { google } from 'googleapis';
import { Readable } from 'stream';

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

const FOLDER_ID = process.env.FOLDER_ID;

function getDriveService() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error('GOOGLE_CREDENTIALS no configurado');
  const creds = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
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
    if (!fileName || !base64) return res.status(400).json({ ok: false, error: 'Datos incompletos' });

    const drive   = getDriveService();
    const target  = guest?.trim()
      ? await getOrCreateFolder(drive, FOLDER_ID, guest.trim())
      : FOLDER_ID;

    const buffer  = Buffer.from(base64, 'base64');
    const stream  = Readable.from(buffer);

    const uploaded = await drive.files.create({
      requestBody: { name: fileName, parents: [target] },
      media: { mimeType: fileType || 'image/jpeg', body: stream },
      fields: 'id, name',
    });

    res.json({ ok: true, id: uploaded.data.id, name: uploaded.data.name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
}
