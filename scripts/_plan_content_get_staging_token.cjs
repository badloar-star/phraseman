// Генерирует короткоживущий OAuth access token из service-account.json
// со scope для Google Cloud Storage (read/write). Печатает ТОЛЬКО токен в stdout.
const admin = require('firebase-admin');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const keyPath = path.resolve(__dirname, '..', 'service-account.json');

async function main() {
  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/devstorage.read_write'],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse && tokenResponse.token ? tokenResponse.token : '';
  if (!token) {
    process.stderr.write('FAILED: no token\n');
    process.exit(1);
  }
  process.stdout.write(token);
}

main().catch((e) => {
  process.stderr.write('ERROR: ' + (e && e.message ? e.message : String(e)) + '\n');
  process.exit(1);
});
