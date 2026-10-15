import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

// зачем (координатор 05.10, ae0345685…841297d48): на ПК владельца core.autocrlf=true — рабочая копия в CRLF,
// индекс в LF. Сторож исходника, который читает файл и сверяет его с многострочным литералом или регуляркой
// («\n»), ложно краснеет, хотя код на месте. Все такие сторожа переведены на normalizeEol/readSource
// (tests/helpers/read_source.ts, read_source_esm.mjs). Этот сторож не даёт завести новый мимо помощника.
// Сработал — оберни чтение в normalizeEol(…) или читай через readSource(…); не расширяй список ниже без причины.

const ROOT = join(__dirname, '..');
const TESTS_DIR = join(ROOT, 'tests');

/** Осознанные исключения: путь → причина. */
const ALLOWED_RAW_READS: Readonly<Record<string, string>> = {
  // Точные байты важны (хеши, sha256) — нормализация изменила бы результат.
  'tests/account_provision_lock_android_runtime_entrypoint.test.ts': 'хеши по точным байтам',
  'tests/account_sqlcipher_android_runtime_entrypoint.test.ts': 'хеши по точным байтам',
  'tests/asset_hygiene_safe.test.ts': 'хеши по точным байтам',
  'tests/flashcards_liquid_hub_source_contract.test.mjs': 'хеши по точным байтам',
  'tests/global_broadcast_privacy_rollout_contract.test.ts': 'хеши по точным байтам',
  'tests/learning_v2_lesson1_local_audio.test.ts': 'хеши по точным байтам',
  'tests/session_result_liquid_glass_source_contract.test.mjs': 'хеши по точным байтам',
  'tests/settings_notifications_liquid_glass.test.mjs': 'хеши по точным байтам',
  'tests/tournament_pool_migration_scripts.test.ts': 'хеши по точным байтам',
  'tests/visual_parity_gate.test.mjs': 'хеши по точным байтам',
  // Зона Codex: входы hash-lock, править нельзя.
  'tests/gustav_french_curriculum_contract.test.ts': 'зона Codex (hash-lock)',
  'tests/gustav_french_dev_surface_parity.test.ts': 'зона Codex (hash-lock)',
  // Были в работе у другой сессии на момент перевода (05.10) — перевести при следующей правке.
  'tests/daily_phrase_quiz_content_gate.test.mjs': 'в работе у другой сессии 05.10',
  'tests/daily_phrase_source_link_gate.test.mjs': 'в работе у другой сессии 05.10',
  'tests/render_daily_phrase_content_preview.test.mjs': 'в работе у другой сессии 05.10',
};

function listTestFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__snapshots__' || name === 'helpers') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) listTestFiles(full, out);
    else if (/\.test\.(ts|tsx|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

// 15.10 (разбор красных): split('\r\n').join('\n') и split(String.fromCharCode(13, 10)) — тоже нормализация, а не сырое чтение
const NORMALIZES = /normalizeEol\(|readSource\(|replace\(\s*\/\\r\\n\??\/g\s*,|replace\(\s*\/\\r\/g|\\r\?\\n|split\(\s*['"]\\r\\n['"]\s*\)|fromCharCode\(13,\s*10\)/;
// Аргументы вызова бывают с вложенными скобками (join(…)) — проверяем вызов и текстовую кодировку раздельно.
const isTextRead = (text: string) => /readFileSync\(/.test(text) && /['"]utf-?8['"]/i.test(text);
const MULTILINE_EXPECTATION = [
  /(toContain|toMatch|indexOf|includes|toBe|startsWith|endsWith)\(\s*(['"`])(?:(?!\2).)*\\n/,
  /\/[^/\n]*\\n[^/\n]*\/[gimsuy]*/,
];

test('source guards that compare multiline text read files through normalizeEol/readSource', () => {
  const offenders: string[] = [];
  for (const file of listTestFiles(TESTS_DIR)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    if (rel === 'tests/source_guard_eol_normalized_contract.test.ts' || ALLOWED_RAW_READS[rel]) continue;
    const text = readFileSync(file, 'utf8');
    if (!isTextRead(text)) continue;
    if (!MULTILINE_EXPECTATION.some((pattern) => pattern.test(text))) continue;
    if (NORMALIZES.test(text)) continue;
    offenders.push(rel);
  }
  expect(offenders).toEqual([]);
});

test('allowlisted files still exist (stale entries are removed, not kept)', () => {
  const missing = Object.keys(ALLOWED_RAW_READS).filter((rel) => {
    try { return !statSync(join(ROOT, rel)).isFile(); } catch { return true; }
  });
  expect(missing).toEqual([]);
});
