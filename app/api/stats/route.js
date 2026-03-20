import { google } from 'googleapis';
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

export async function GET() {
  try {
    const drive = getDriveService();
    const r = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id)',
      pageSize: 1000,
    });
    return NextResponse.json({ ok: true, total: r.data.files.length });
  } catch (e) {
    return NextResponse.json({ ok: false, total: 0 });
  }
}
