// зачем (координатор 26.10, NIGHT_BACKLOG 🔴 «ключ отписки открытой переменной у 9 функций content»): ключи EMAIL_UNSUBSCRIBE_*
// уехали в env всех content-функций из локального functions-content/.env, когда content выкладывали из рабочего дерева.
// Исправлено в b0b425334 (скрипт берёт только functions-content/.env.<проект>). Сторож держит правило:
// - скрипт чистой выкладки никогда не копирует голый functions-content/.env;
// - сторож «похоже на секрет» перед копированием на месте;
// - код content не читает ключи отписки — им там делать нечего;
// - ключ в default читается только через defineSecret.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const script = read('scripts/deploy_from_clean_head.sh');

test('чистая выкладка content берёт только functions-content/.env.<проект>, голый .env — никогда', () => {
  const envFileLines = script.split(/\r?\n/).filter((l) => /ENV_FILES(\+)?=/.test(l));
  assert.ok(envFileLines.length >= 2, 'ожидались строки ENV_FILES=… и ENV_FILES+=…');
  for (const line of envFileLines) {
    assert.doesNotMatch(line, /functions-content\/\.env(?!\.)/, `голый functions-content/.env в: ${line.trim()}`);
  }
  assert.match(script, /ENV_FILES\+=\("functions-content\/\.env\.\$ENV_PROJECT"\)/);
  // копируется только то, что в ENV_FILES (никакого второго cp dotenv в обход списка)
  const dotenvCopies = script.split(/\r?\n/).filter((l) => /^\s*cp\b/.test(l) && /(\.env|\$envf)/.test(l));
  assert.deepEqual(dotenvCopies.map((l) => l.trim()), ['cp "$ROOT/$envf" "$X/$envf"']);
});

test('перед копированием любой dotenv проверяется на имена, похожие на секрет', () => {
  assert.match(script, /grep -iE 'SECRET\|KEY\|TOKEN\|PASSWORD'/);
  assert.match(script, /ОТКАЗ: в \$envf ключ, похожий на секрет/);
});

test('код content не читает ключи отписки', () => {
  const files = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      const rel = `${dir}/${name}`;
      if (['node_modules', 'lib'].includes(name)) continue;
      if (fs.statSync(path.join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(ts|js)$/.test(name)) files.push(rel);
    }
  };
  walk('functions-content');
  assert.ok(files.length > 0);
  const hits = files.filter((rel) => /EMAIL_UNSUBSCRIBE/.test(read(rel)));
  assert.deepEqual(hits, []);
});

// зачем (Ревизор 26.10 на 5d0cf5884): новый ключ в кнопке ротации не должен остаться на диске — ни после успеха, ни при ошибке
test('кнопка ротации: новый ключ во временном файле mktemp + umask 077, удаляется trap на выходе и сразу после записи', () => {
  const pack = read('docs/work/release/server-deploy-pack-2026-10-26.md');
  const line = pack.split(/\r?\n/).find((l) => /gcloud secrets versions add EMAIL_UNSUBSCRIBE_SECRET /.test(l));
  assert.ok(line, 'нет команды записи нового ключа');
  assert.match(line, /umask 077/);
  assert.match(line, /EU_NEW="\$\(mktemp\)"/);
  assert.match(line, /trap 'rm -f "\$EU_NEW"' EXIT/);
  assert.match(line, /--data-file="\$EU_NEW"[^;]*; rm -f "\$EU_NEW"/);
  assert.doesNotMatch(pack, /\$TEMP\/eu_new/); // прежний постоянный путь не вернулся
  // значение нигде не печатается: генерация только в файл, прошлый ключ — трубой
  assert.doesNotMatch(line, /\becho\b|\bcat\b/);
});

test('в default ключ отписки читается только через defineSecret, не из process.env', () => {
  const src = read('functions/src/email_unsubscribe.ts');
  assert.match(src, /defineSecret\('EMAIL_UNSUBSCRIBE_SECRET'\)/);
  assert.match(src, /defineSecret\(\s*'EMAIL_UNSUBSCRIBE_PREVIOUS_SECRET'/);
  assert.doesNotMatch(src, /process\.env\.EMAIL_UNSUBSCRIBE/);
});
