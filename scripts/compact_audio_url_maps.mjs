// ════════════════════════════════════════════════════════════════════════════
// compact_audio_url_maps.mjs — сжатие сгенерированных карт аудио-URL.
//
// зачем (владелец, 2026-08-24, программа «бандл −70%»): два generated-файла
// хранили ~5.5 тыс. ПОЛНЫХ URL Firebase Storage (~1.75 МБ текста в JS-бандле).
// Всё в URL выводится из ключа, КРОМЕ случайной части (storage-токен / v-хэш).
// Скрипт переписывает файлы в компактный формат: хранится только случайная
// часть, полная карта восстанавливается на первом импорте (~1-3 мс).
// Экспорты и поведение модулей НЕ меняются — потребители не трогаются.
//
// Самопроверка: скрипт восстанавливает карту из нового формата и сравнивает
// 1:1 с исходной; файл перезаписывается ТОЛЬКО при полном совпадении.
// Идемпотентен: уже компактный файл (маркер COMPACT_URL_MAP_V2) пропускается.
//
// Если карты когда-нибудь регенерируются заново (полными URL) — просто
// запустить: node scripts/compact_audio_url_maps.mjs
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const MARKER = 'COMPACT_URL_MAP_V2';

function readMapLiteral(source, constName) {
  const anchor = source.indexOf(`export const ${constName}`);
  if (anchor < 0) throw new Error(`no ${constName} in source`);
  const start = source.indexOf('{', anchor);
  const end = source.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error(`cannot slice ${constName} literal`);
  const literal = source.slice(start, end + 2).replace(/,\s*}/, '\n}').replace(/;$/, '');
  return JSON.parse(literal);
}

function deepEqualMaps(a, b) {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return `key count ${ka.length} != ${kb.length}`;
  for (const k of ka) {
    if (a[k] !== b[k]) return `mismatch at ${JSON.stringify(k)}:\n  ${a[k]}\n  ${b[k]}`;
  }
  return null;
}

// ─── План-аудио ──────────────────────────────────────────────────────────────
function compactPlanMap() {
  const file = path.join(ROOT, 'app', 'plan_audio_url_map.generated.ts');
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(MARKER)) { console.log('plan map: already compact, skip'); return; }
  const original = readMapLiteral(src, 'PLAN_AUDIO_URL_MAP');

  const BASE = 'https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/plan-audio%2F';
  const KEY_ROOT = 'assets/audio/personal-plans-runtime/';
  const keyRe = /^assets\/audio\/personal-plans-runtime\/([a-z]+)\/runtime\/\1-d(\d{3})-listen-audio\/\1-d\2-content-unit-phrase-(\d+)\.mp3$/;

  const tokens = {}; // plan -> [ [tokPhrase1..], ... ] index = day-1
  const overrides = {};
  for (const [key, val] of Object.entries(original)) {
    const m = key.match(keyRe);
    let placed = false;
    if (m) {
      const [, plan, ddd, nStr] = m;
      const n = Number(nStr);
      const stem = `${plan}-d${ddd}-listen-audio`;
      const expected = `${BASE}${plan}%2F${stem}%2F${plan}-d${ddd}-content-unit-phrase-${n}.mp3?alt=media&token=`;
      if (val.startsWith(expected)) {
        const token = val.slice(expected.length);
        if (/^[0-9a-f-]{36}$/.test(token)) {
          tokens[plan] ??= [];
          const dayIdx = Number(ddd) - 1;
          tokens[plan][dayIdx] ??= [];
          tokens[plan][dayIdx][n - 1] = token;
          placed = true;
        }
      }
    }
    if (!placed) overrides[key] = val;
  }
  // дырки в массивах -> '' (builder пропускает пустые)
  for (const plan of Object.keys(tokens)) {
    const days = tokens[plan];
    for (let d = 0; d < days.length; d++) {
      days[d] ??= [];
      for (let p = 0; p < days[d].length; p++) days[d][p] ??= '';
    }
  }

  const emitDays = (days) => days.map((day) => `    ${JSON.stringify(day)},`).join('\n');
  const body = Object.keys(tokens).sort().map((plan) =>
    `  ${plan}: [\n${emitDays(tokens[plan])}\n  ],`).join('\n');

  const out = `// AUTO-GENERATED — DO NOT EDIT BY HAND. ${MARKER}
// Компактная форма карты «локальный uri -> Firebase Storage URL» для аудио
// персональных планов (${Object.keys(original).length} записей). Полные URL занимали ~0.9 МБ в
// JS-бандле; всё в URL выводится из (план, день, фраза), кроме случайного
// storage-токена — храним только токены, карта восстанавливается на первом
// импорте (~1 мс). Пересжатие после регенерации: node scripts/compact_audio_url_maps.mjs
// Потребитель: app/personal_plan_listening_playback_contract.ts (getPlanAudioUrl).

const BASE = '${BASE}';
const KEY_ROOT = '${KEY_ROOT}';

/** tokens[план][день-1][фраза-1] = storage-токен ('' = записи нет). */
const PLAN_DAY_TOKENS: Readonly<Record<string, ReadonlyArray<ReadonlyArray<string>>>> = {
${body}
};

/** Записи, не подходящие под общий шаблон (перенесены как есть). */
const URL_OVERRIDES: Readonly<Record<string, string>> = ${JSON.stringify(overrides, null, 2)};

function buildPlanAudioUrlMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const plan of Object.keys(PLAN_DAY_TOKENS)) {
    const days = PLAN_DAY_TOKENS[plan];
    for (let d = 0; d < days.length; d += 1) {
      const ddd = String(d + 1).padStart(3, '0');
      const stem = \`\${plan}-d\${ddd}-listen-audio\`;
      const day = days[d];
      for (let p = 0; p < day.length; p += 1) {
        const token = day[p];
        if (!token) continue;
        const file = \`\${plan}-d\${ddd}-content-unit-phrase-\${p + 1}.mp3\`;
        map[\`\${KEY_ROOT}\${plan}/runtime/\${stem}/\${file}\`] =
          \`\${BASE}\${plan}%2F\${stem}%2F\${file}?alt=media&token=\${token}\`;
      }
    }
  }
  return Object.assign(map, URL_OVERRIDES);
}

export const PLAN_AUDIO_URL_MAP: Readonly<Record<string, string>> = buildPlanAudioUrlMap();

export function getPlanAudioUrl(localUri: string): string | undefined {
  if (!localUri) return undefined;
  return PLAN_AUDIO_URL_MAP[localUri.trim().replace(/\\\\/g, '/')];
}
`;

  // самопроверка: восстановить и сравнить 1:1
  const rebuilt = {};
  for (const plan of Object.keys(tokens)) {
    const days = tokens[plan];
    for (let d = 0; d < days.length; d += 1) {
      const ddd = String(d + 1).padStart(3, '0');
      const stem = `${plan}-d${ddd}-listen-audio`;
      for (let p = 0; p < days[d].length; p += 1) {
        const token = days[d][p];
        if (!token) continue;
        const f = `${plan}-d${ddd}-content-unit-phrase-${p + 1}.mp3`;
        rebuilt[`${KEY_ROOT}${plan}/runtime/${stem}/${f}`] = `${BASE}${plan}%2F${stem}%2F${f}?alt=media&token=${token}`;
      }
    }
  }
  Object.assign(rebuilt, overrides);
  const diff = deepEqualMaps(original, rebuilt);
  if (diff) throw new Error(`plan map self-check FAILED: ${diff}`);

  fs.writeFileSync(file, out);
  console.log(`plan map: OK — ${Object.keys(original).length} записей, overrides: ${Object.keys(overrides).length}, ${(src.length / 1048576).toFixed(2)} МБ -> ${(out.length / 1048576).toFixed(2)} МБ`);
}

// ─── Фразовое аудио ──────────────────────────────────────────────────────────
function compactPhraseMap() {
  const file = path.join(ROOT, 'app', 'phrase_audio_url_map.generated.ts');
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(MARKER)) { console.log('phrase map: already compact, skip'); return; }
  const original = readMapLiteral(src, 'PHRASE_AUDIO_URL_MAP');

  const BASE = 'https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/phrase-audio%2F';
  const valRe = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/phraseman-ea0b3\.firebasestorage\.app\/o\/phrase-audio%2F([A-Za-z0-9_-]+)%2F([A-Za-z0-9._-]+)\.mp3\?alt=media&v=([0-9a-f]+)$/;

  const folders = [];
  const folderIdx = new Map();
  const entries = {};
  const overrides = {};
  for (const [key, val] of Object.entries(original)) {
    const m = val.match(valRe);
    if (!m) { overrides[key] = val; continue; }
    const [, folder, fileName, v] = m;
    if (!folderIdx.has(folder)) { folderIdx.set(folder, folders.length); folders.push(folder); }
    entries[key] = `${folderIdx.get(folder)}|${fileName}|${v}`;
  }

  const out = `// AUTO-GENERATED — DO NOT EDIT BY HAND. ${MARKER}
// Компактная форма карты «нормализованная фраза -> Firebase Storage mp3 URL»
// (OpenAI TTS, голос "echo"; ${Object.keys(original).length} записей). Полные URL занимали ~0.85 МБ в
// JS-бандле; общий префикс и структура URL постоянны — храним только
// «папка|файл|v-хэш», карта восстанавливается на первом импорте (~3 мс).
// Пересжатие после регенерации: node scripts/compact_audio_url_maps.mjs
// Потребители: hooks/phrase_audio_player.ts, hooks/phrase_audio_prefetch.ts.

const BASE = '${BASE}';
const FOLDERS: ReadonlyArray<string> = ${JSON.stringify(folders)};

/** значение: "индекс-папки|имя-файла|v-хэш" */
const ENTRIES: Readonly<Record<string, string>> = {
${Object.entries(entries).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};

/** Записи, не подходящие под общий шаблон (перенесены как есть). */
const URL_OVERRIDES: Readonly<Record<string, string>> = ${JSON.stringify(overrides, null, 2)};

function buildPhraseAudioUrlMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key of Object.keys(ENTRIES)) {
    const packed = ENTRIES[key];
    const first = packed.indexOf('|');
    const last = packed.lastIndexOf('|');
    const folder = FOLDERS[Number(packed.slice(0, first))];
    const file = packed.slice(first + 1, last);
    const v = packed.slice(last + 1);
    map[key] = \`\${BASE}\${folder}%2F\${file}.mp3?alt=media&v=\${v}\`;
  }
  return Object.assign(map, URL_OVERRIDES);
}

export const PHRASE_AUDIO_URL_MAP: Readonly<Record<string, string>> = buildPhraseAudioUrlMap();

export function normalizePhraseAudioKey(text: string): string {
  return text.trim().toLowerCase().replace(/\\s+/g, ' ');
}

export function getPhraseAudioUrl(text: string): string | undefined {
  if (!text) return undefined;
  return PHRASE_AUDIO_URL_MAP[normalizePhraseAudioKey(text)];
}
`;

  // самопроверка 1:1
  const rebuilt = {};
  for (const [key, packed] of Object.entries(entries)) {
    const first = packed.indexOf('|');
    const last = packed.lastIndexOf('|');
    rebuilt[key] = `${BASE}${folders[Number(packed.slice(0, first))]}%2F${packed.slice(first + 1, last)}.mp3?alt=media&v=${packed.slice(last + 1)}`;
  }
  Object.assign(rebuilt, overrides);
  const diff = deepEqualMaps(original, rebuilt);
  if (diff) throw new Error(`phrase map self-check FAILED: ${diff}`);

  fs.writeFileSync(file, out);
  console.log(`phrase map: OK — ${Object.keys(original).length} записей, overrides: ${Object.keys(overrides).length}, ${(src.length / 1048576).toFixed(2)} МБ -> ${(out.length / 1048576).toFixed(2)} МБ`);
}

compactPlanMap();
compactPhraseMap();
