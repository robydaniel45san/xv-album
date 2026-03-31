import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const FOLDER_ID = process.env.FOLDER_ID;

function getOAuth2Client() {
  const oauth2 = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });
  return oauth2;
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

// Devuelve una URL de subida resumible de Google Drive.
// El cliente sube el archivo directamente a esa URL (sin pasar por Vercel).
export async function POST(request) {
  try {
    const { fileName, fileType, fileSize, guest } = await request.json();

    if (!fileName || !fileType)
      return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });

    const auth  = getOAuth2Client();
    const drive = google.drive({ version: 'v3', auth });

    // Obtener access token vigente
    const { token: accessToken } = await auth.getAccessToken();

    // Carpeta destino
    let target = FOLDER_ID;
    if (guest?.trim()) {
      try {
        target = await getOrCreateFolder(drive, FOLDER_ID, guest.trim());
      } catch {
        target = FOLDER_ID;
      }
    }

    // Iniciar sesión de subida resumible en Google Drive
    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': fileType,
          ...(fileSize ? { 'X-Upload-Content-Length': String(fileSize) } : {}),
        },
        body: JSON.stringify({ name: fileName, parents: [target] }),
      }
    );

    if (!initRes.ok) {
      const detail = await initRes.text();
      return NextResponse.json({ ok: false, error: 'No se pudo iniciar la subida', detail }, { status: 500 });
    }

    const uploadUrl = initRes.headers.get('location');
    return NextResponse.json({ ok: true, uploadUrl });

  } catch (e) {
    console.error('[upload error]', e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export const maxDuration = 30;
