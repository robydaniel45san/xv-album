import { google } from 'googleapis';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';

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
  if (!safe) return parentId;

  const res = await drive.files.list({
    q: `name='${safe}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (res.data.files.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: {
      name: safe,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  return folder.data.id;
}

export async function POST(request) {
  try {
    const form     = await request.formData();
    const file     = form.get('file');
    const fileName = form.get('fileName');
    const guest    = form.get('guest') || '';

    if (!file || !fileName)
      return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });

    const drive = getDriveService();

    let target = FOLDER_ID;
    if (guest.trim()) {
      try {
        target = await getOrCreateFolder(drive, FOLDER_ID, guest.trim());
      } catch {
        target = FOLDER_ID;
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const mimeType    = file.type || 'image/jpeg';
    const stream      = new Readable();
    stream.push(buffer);
    stream.push(null);

    const { data } = await drive.files.create({
      requestBody: { name: fileName, parents: [target] },
      media: { mimeType, body: stream },
      fields: 'id, name',
      supportsAllDrives: true,
    });

    return NextResponse.json({ ok: true, id: data.id, name: data.name });

  } catch (e) {
    console.error('[upload error]', e.message, e?.response?.data);
    return NextResponse.json({
      ok: false,
      error: e.message,
      details: e?.response?.data || null,
    }, { status: 500 });
  }
}

export const maxDuration = 60;
