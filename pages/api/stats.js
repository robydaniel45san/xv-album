import { google } from 'googleapis';

const FOLDER_ID = process.env.FOLDER_ID;

function getDriveService() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error('GOOGLE_CREDENTIALS no configurado');
  const creds = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

export default async function handler(req, res) {
  try {
    const drive = getDriveService();
    const r = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id)',
      pageSize: 1000,
    });
    res.json({ ok: true, total: r.data.files.length });
  } catch (e) {
    res.json({ ok: false, total: 0 });
  }
}
