// Mints a short-lived Google OAuth access token from the firebase-tools stored
// refresh token, so REST uploads to GCS can authenticate without ADC/gcloud.
// Prints ONLY the access token to stdout (nothing secret beyond that).
import fs from 'fs';
import os from 'os';
import path from 'path';

const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const refresh = cfg?.tokens?.refresh_token;
if (!refresh) {
  console.error('No refresh_token in firebase-tools config. Run `firebase login`.');
  process.exit(1);
}

// firebase-tools' public OAuth client (same one the CLI uses; not a secret).
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

const body = new URLSearchParams({
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  refresh_token: refresh,
  grant_type: 'refresh_token',
});

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: body.toString(),
});
const json = await res.json();
if (!res.ok || !json.access_token) {
  console.error('Token exchange failed:', res.status, JSON.stringify(json).slice(0, 300));
  process.exit(1);
}
process.stdout.write(json.access_token);
