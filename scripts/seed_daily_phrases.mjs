import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'phraseman-ea0b3';
const DB = '(default)';
const dryRun = !process.argv.includes('--apply');

function safeId(s) {
  const base = String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return base || `phrase-${Date.now()}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateKey, n) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function fsValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fsValue) } };
  if (typeof value === 'object') return { mapValue: { fields: toFsFields(value) } };
  return { stringValue: String(value) };
}

function toFsFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value !== undefined) fields[key] = fsValue(value);
  }
  return fields;
}

function fromFsValue(v) {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
  if ('mapValue' in v) return fromFsFields(v.mapValue.fields || {});
  if ('timestampValue' in v) return v.timestampValue;
  return undefined;
}

function fromFsFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) out[key] = fromFsValue(value);
  return out;
}

function docName(collection, id) {
  return `projects/${PROJECT_ID}/databases/${DB}/documents/${collection}/${id}`;
}

function docId(docNameValue) {
  return docNameValue.split('/').pop();
}

async function getAccessToken() {
  const authPath = join(process.env.APPDATA, 'npm', 'node_modules', 'firebase-tools', 'lib', 'auth.js');
  const auth = await import(pathToFileURL(authPath).href);
  const configPath = join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const refreshToken = config?.tokens?.refresh_token;
  if (!refreshToken) throw new Error('Firebase CLI refresh token not found');
  const token = await auth.getAccessToken(refreshToken, []);
  return token.access_token || token;
}

async function api(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function listCollection(collection) {
  const out = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({ pageSize: '700' });
    if (pageToken) qs.set('pageToken', pageToken);
    const json = await api(`projects/${PROJECT_ID}/databases/${DB}/documents/${collection}?${qs}`);
    for (const d of json.documents || []) out.push({ id: docId(d.name), data: fromFsFields(d.fields) });
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return out;
}

async function commitWrites(writes) {
  if (dryRun || writes.length === 0) return;
  for (let i = 0; i < writes.length; i += 400) {
    await api(`projects/${PROJECT_ID}/databases/${DB}/documents:commit`, {
      method: 'POST',
      body: { writes: writes.slice(i, i + 400) },
    });
  }
}

async function main() {
  const seed = JSON.parse(readFileSync('admin/daily_phrases_seed.json', 'utf8'));
  if (!Array.isArray(seed) || seed.length === 0) throw new Error('admin/daily_phrases_seed.json is empty');

  const existing = new Map((await listCollection('daily_phrases')).map((x) => [x.id, x.data]));
  const start = Math.floor(Date.now() / 86400000) % seed.length;
  const queue = seed.slice(start).concat(seed.slice(0, start));
  const now = new Date().toISOString();
  const mask = [
    'english',
    'literal',
    'meaning',
    'text',
    'literal_uk',
    'meaning_uk',
    'text_uk',
    'order',
    'scheduledDate',
    'active',
    'allowSave',
    'savedCount',
    'sourceId',
    'updatedAt',
  ];

  const writes = queue.map((x, idx) => {
    const id = safeId(x.english || `phrase-${idx + 1}`);
    const prev = existing.get(id) || {};
    const data = {
      english: String(x.english || ''),
      literal: String(x.literal || ''),
      meaning: String(x.meaning || ''),
      text: String(x.text || ''),
      literal_uk: String(x.literal_uk || ''),
      meaning_uk: String(x.meaning_uk || ''),
      text_uk: String(x.text_uk || ''),
      order: idx + 1,
      scheduledDate: addDays(todayKey(), idx),
      active: true,
      allowSave: prev.allowSave !== false,
      savedCount: Number(prev.savedCount) || 0,
      sourceId: x.id ?? null,
      updatedAt: now,
    };
    return {
      update: { name: docName('daily_phrases', id), fields: toFsFields(data) },
      updateMask: { fieldPaths: mask },
    };
  });

  console.log(`${dryRun ? 'Dry run' : 'Applying'} ${writes.length} daily phrase writes to ${PROJECT_ID}`);
  console.log(`Today: ${todayKey()}, first phrase: ${queue[0]?.english || '-'}`);
  await commitWrites(writes);
  console.log(dryRun ? 'No writes sent. Re-run with --apply.' : 'Daily phrases seeded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
