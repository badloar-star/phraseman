/**
 * Выгрузка записей озвучки курса в хранилище: output/course-voice/publish/course-v1/<язык>/<ключ>.mp3
 * → phrase-audio/course-v1/<язык>/<ключ>.mp3 (папка phrase-audio открыта только на чтение, storage.rules).
 *
 * зачем (владелец 11.11.2026, «чисто, дальше»): записи одобрены на слух, приложение качает их с сервера, а не
 * носит в сборке («не в бандле, потому что вес будет большой»).
 *
 * Возобновляемая: файл того же размера на сервере не перезаливается. Чужие файлы не трогает и ничего не удаляет.
 *   node scripts/course_voice_upload.cjs [--dry-run] [--lang=en]
 */
const fs = require('fs');
const path = require('path');

const TAG = '[COURSE-VOICE-UPLOAD]';
const ROOT = path.resolve(__dirname, '..');
const GENERATION = 'course-v1';
const LOCAL_DIR = path.join(ROOT, 'output', 'course-voice', 'publish', GENERATION);
const REMOTE_PREFIX = `phrase-audio/${GENERATION}/`;
const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const CONCURRENCY = 8;
const MAX_ATTEMPTS = 4;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_LANG = (args.find((a) => a.startsWith('--lang=')) || '').slice(7) || null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!fs.existsSync(LOCAL_DIR)) throw new Error(`${TAG} нет папки ${LOCAL_DIR} — сначала scripts/course_voice_publish_build.cts`);
  const keyFile = path.join(ROOT, 'service-account.json');
  if (!fs.existsSync(keyFile)) throw new Error(`${TAG} нет ${keyFile} — выгрузка идёт только с правами администратора проекта`);
  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(require(keyFile)), storageBucket: BUCKET });
  const bucket = admin.storage().bucket();

  const local = [];
  for (const lang of fs.readdirSync(LOCAL_DIR)) {
    if (ONLY_LANG && lang !== ONLY_LANG) continue;
    for (const name of fs.readdirSync(path.join(LOCAL_DIR, lang))) {
      if (!name.endsWith('.mp3')) continue;
      const file = path.join(LOCAL_DIR, lang, name);
      local.push({ file, remote: `${REMOTE_PREFIX}${lang}/${name}`, size: fs.statSync(file).size });
    }
  }

  const [existing] = await bucket.getFiles({ prefix: REMOTE_PREFIX });
  const remoteSize = new Map(existing.map((f) => [f.name, Number(f.metadata.size)]));
  const todo = local.filter((item) => remoteSize.get(item.remote) !== item.size);
  const bytes = todo.reduce((sum, item) => sum + item.size, 0);
  console.log(`${TAG} локально ${local.length}, на сервере уже ${existing.length}, выгрузить ${todo.length} (${(bytes / 1024 / 1024).toFixed(1)} МБ), dryRun=${DRY_RUN}`);
  if (DRY_RUN || todo.length === 0) return;

  const failed = [];
  let done = 0;
  let cursor = 0;
  const started = Date.now();
  async function worker() {
    while (cursor < todo.length) {
      const item = todo[cursor];
      cursor += 1;
      let lastError = '';
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          await bucket.upload(item.file, {
            destination: item.remote,
            resumable: false,
            // зачем: имя файла вычислено из текста и поколения — содержимое под этим именем не меняется, телефон и CDN могут хранить его год
            metadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' },
          });
          lastError = '';
          break;
        } catch (error) {
          lastError = `${error.code || error.name}: ${error.message}`;
          console.warn(`${TAG} повтор ${attempt}/${MAX_ATTEMPTS} ${item.remote}: ${lastError}`);
          await sleep(1000 * attempt * attempt);
        }
      }
      if (lastError) { failed.push({ remote: item.remote, reason: lastError }); console.error(`${TAG} ОТКАЗ ${item.remote}: ${lastError}`); }
      done += 1;
      if (done % 500 === 0) console.log(`${TAG} ${done}/${todo.length}, отказов ${failed.length}, ${Math.round((Date.now() - started) / 1000)} с`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`${TAG} готово: выгружено ${done - failed.length}, отказов ${failed.length}, ${Math.round((Date.now() - started) / 1000)} с`);
  if (failed.length) { fs.writeFileSync(path.join(ROOT, 'output', 'course-voice', 'upload-failed.json'), JSON.stringify(failed, null, 1)); process.exitCode = 1; }
}

main().catch((error) => { console.error(`${TAG} аварийный выход: ${error.stack || error}`); process.exit(1); });
