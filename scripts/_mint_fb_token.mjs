// Mints a short-lived Google OAuth access token for REST uploads to GCS.
// Prints ONLY the access token to stdout (nothing secret beyond that).
//
// зачем (2026-08-25): раньше был единственный путь — обмен firebase-tools'
// refresh_token на access_token, который требует PHRASEMAN_FIREBASE_TOOLS_
// CLIENT_SECRET в окружении. Этот секрет нигде не хранится в репозитории (и не
// должен), поэтому агент, работающий без интерактивного доступа к машине
// владельца, не может им воспользоваться. Добавлен приоритетный путь через
// `gcloud auth print-access-token` — если на машине уже есть авторизованный
// gcloud (у владельца это service account firebase-adminsdk-fbsvc@<project>,
// видно по `gcloud auth list`), токен получается БЕЗ секрета вообще. Старый
// путь остаётся резервным для машин без gcloud.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function tryGcloud() {
  try {
    // зачем: на Windows `gcloud` — это .cmd-обёртка. execFileSync без shell:true
    // не резолвит PATHEXT и падает с ENOENT, даже если `gcloud` работает в
    // обычном shell. shell:true чинит это на Windows и не меняет поведение на
    // POSIX (там gcloud — обычный исполняемый файл).
    const token = execFileSync('gcloud', ['auth', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: true,
    }).trim();
    return token || null;
  } catch {
    return null;
  }
}

function viaFirebaseToolsRefreshToken() {
  const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const refresh = cfg?.tokens?.refresh_token;
  if (!refresh) {
    console.error('No refresh_token in firebase-tools config. Run `firebase login`.');
    process.exit(1);
  }

  // firebase-tools' public OAuth client ID. The companion credential is supplied
  // locally so the repository never contains a key-shaped value.
  const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
  const CLIENT_SECRET = String(process.env.PHRASEMAN_FIREBASE_TOOLS_CLIENT_SECRET ?? '').trim();
  if (!CLIENT_SECRET) {
    console.error('Neither `gcloud` nor PHRASEMAN_FIREBASE_TOOLS_CLIENT_SECRET is available.');
    console.error('Either run `gcloud auth login` (or activate a service account), or set the env var.');
    process.exit(1);
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refresh,
    grant_type: 'refresh_token',
  });

  return fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }).then(async (res) => {
    const json = await res.json();
    if (!res.ok || !json.access_token) {
      console.error('Token exchange failed:', res.status, JSON.stringify(json).slice(0, 300));
      process.exit(1);
    }
    return json.access_token;
  });
}

const gcloudToken = tryGcloud();
const token = gcloudToken ?? await viaFirebaseToolsRefreshToken();
process.stdout.write(token);
