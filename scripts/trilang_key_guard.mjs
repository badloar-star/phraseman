// trilang_key_guard.mjs — сторож ключей языков в словарях triLang(lang, { … }).
//
// зачем (координатор 29.10, Переводчик): в components/DailyPhraseFriendsRow.tsx стоял ключ `pt:` вместо `'pt-BR':` — triLang не находил
// перевод, и бразилец видел английский (исправлено в bb52ebd23). Ни сторож непереведённого текста, ни типы этого не ловили:
// Partial<Record<…>> пропускает лишний ключ. Здесь две проверки:
//   (а) ключ верхнего уровня не из списка языков → ОШИБКА (ловит pt / ptBr / pt_BR / опечатки);
//   (б) в словаре нет en или нет ни одного из pt-BR / vi / id / tr / pl → «слабый словарь». Такие строки triLang отдаёт этим языкам
//       через запасной путь (en, а без него — русский). Только ПРЕДУПРЕЖДЕНИЕ с базой config/trilang-weak-dicts-baseline.json
//       (Ревизор 29.10: неполный словарь иногда законно падает на en; ошибкой остаётся только (а)).
import fs from 'node:fs';
import path from 'node:path';

// зачем (Ревизор 29.10): язык интерфейса — один источник. Тип Lang в constants/i18n.ts = RegisteredInterfaceSourceLocale | 'en',
// а RegisteredInterfaceSourceLocale собирается из массивов app/source_locales.ts. Читаем их отсюда, а не держим свой список:
// при новом языке сторож не начнёт ругаться на правильный ключ.
const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function readArray(src, name) {
  const m = src.match(new RegExp(`export const ${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  if (!m) throw new Error(`[TRILANG-KEYS] в app/source_locales.ts не найден массив ${name} — список языков не прочитан`);
  return [...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1]);
}

/** Языки интерфейса = тип Lang: BASE + HEISENBERG из app/source_locales.ts, плюс 'en', если Lang его добавляет. */
export function interfaceLangs(root = ROOT_DIR) {
  const locales = fs.readFileSync(path.join(root, 'app', 'source_locales.ts'), 'utf8');
  const i18n = fs.readFileSync(path.join(root, 'constants', 'i18n.ts'), 'utf8');
  const langs = [...readArray(locales, 'BASE_SOURCE_LOCALES'), ...readArray(locales, 'HEISENBERG_BATCH_SOURCE_LOCALES')];
  if (/export type Lang\s*=[^;]*'en'/.test(i18n)) langs.push('en');
  return langs;
}

/** Не языки интерфейса, но законные ключи словарей: целевые языки «Диалогов» (французский, немецкий) — с причиной. */
export const EXTRA_DICT_KEYS = Object.freeze({
  fr: 'целевой язык «Диалогов» (французский курс): текст на изучаемом языке, triLang по языку интерфейса его не выбирает',
  de: 'целевой язык «Диалогов» (немецкий курс): то же',
});

export const KNOWN_LANG_KEYS = Object.freeze([...interfaceLangs(), ...Object.keys(EXTRA_DICT_KEYS)]);
const FIVE = ['pt-BR', 'vi', 'id', 'tr', 'pl'].filter((k) => KNOWN_LANG_KEYS.includes(k));

/** Файлы, где словари не на 9 языков намеренно (с причиной). Тесты и дев-превью отсекаются отдельно, по имени. */
export const TRILANG_KEY_GUARD_EXEMPT = Object.freeze({
  'components/lesson_help_theory_data.tsx': 'старая теория классических уроков: только ru/uk, другим языкам lesson_help показывает свою версию',
  'app/exam_target_gate.ts': 'тексты закрытого французского курса — открыт только для ru/uk',
  'app/diagnostic_target_gate.ts': 'тексты закрытого французского курса — открыт только для ru/uk',
  'app/daily_phrase_target_gate.ts': 'тексты закрытого французского курса — открыт только для ru/uk',
  'app/lesson_support_target_gate.ts': 'тексты закрытого французского курса — открыт только для ru/uk',
});

export function isTriLangGuardSkipped(rel) {
  const f = rel.replace(/\\/g, '/');
  if (TRILANG_KEY_GUARD_EXEMPT[f]) return true;
  return /(^|\/)(__tests__|tests?)\//.test(f) || /\.(test|spec)\.[jt]sx?$/.test(f) || /(^|\/)dev_[^/]*$/.test(f) || /_preview\.[jt]sx?$/.test(f);
}

/** Конец объектного литерала, начинающегося после «{» в позиции start (учитывает строки, шаблоны и вложенные скобки). */
function objectEnd(src, start) {
  let depth = 1; let q = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** Ключи верхнего уровня объекта: только там, где перед ключом стоит «{» или «,» (так тернарник `a ? 'x' : 'y'` ключом не считается). */
export function topLevelKeys(body) {
  const keys = []; let depth = 0; let q = null; let prev = '{';
  for (let j = 0; j < body.length; j++) {
    const c = body[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (/\s/.test(c)) continue;
    // комментарии между ключами (// … и /* … */) — не текст и не ключ, «prev» не трогаем
    if (c === '/' && body[j + 1] === '/') { const nl = body.indexOf('\n', j); j = nl < 0 ? body.length : nl; continue; }
    if (c === '/' && body[j + 1] === '*') { const e = body.indexOf('*/', j + 2); j = e < 0 ? body.length : e + 1; continue; }
    if (depth === 0 && (prev === '{' || prev === ',')) {
      const k = body.slice(j).match(/^(?:(['"])([\w-]+)\1|([A-Za-z_$][\w$]*))\s*:/);
      if (k) { keys.push(k[2] ?? k[3]); j += k[0].length - 1; prev = ':'; continue; }
      if (body.startsWith('...', j)) { keys.push('...'); }
    }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    prev = c;
  }
  return keys;
}

/** Находки в одном исходнике: [{ line, bad: [...], weak: bool, missing: [...] }]. Словари без ru и uk (не языковые) пропускаются. */
export function findTriLangKeyIssues(source) {
  const out = []; const re = /\btriLang\s*\(\s*[\w.]+\s*,\s*\{/g; let m;
  while ((m = re.exec(source))) {
    const end = objectEnd(source, re.lastIndex); if (end < 0) continue;
    const keys = topLevelKeys(source.slice(re.lastIndex, end));
    if (keys.includes('...') || !keys.includes('ru') || !keys.includes('uk')) continue;
    const bad = keys.filter((k) => !KNOWN_LANG_KEYS.includes(k));
    const missing = ['en', ...FIVE].filter((k) => !keys.includes(k));
    const weak = !keys.includes('en') || FIVE.every((k) => !keys.includes(k));
    if (!bad.length && !weak) continue;
    out.push({ line: source.slice(0, m.index).split('\n').length, bad, weak, missing });
  }
  return out;
}

const SCAN_DIRS = ['app', 'components', 'modules', 'hooks', 'constants'];
const SKIP_DIR = /^(node_modules|__tests__|\.git|\.claude|\.codex-tmp|\.worktrees|tmp)$/;

function walk(root, dir, out) {
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIR.test(e.name)) walk(root, abs, out); continue; }
    if (/\.(tsx?|jsx?)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(path.relative(root, abs).replace(/\\/g, '/'));
  }
  return out;
}

/** Все находки по дереву (или по списку относительных путей). */
export function scanTriLangKeys(root, files = null) {
  const list = (files ?? SCAN_DIRS.flatMap((d) => walk(root, path.join(root, d), []))).filter((f) => /\.(tsx?|jsx?)$/.test(f) && !isTriLangGuardSkipped(f));
  const findings = [];
  for (const rel of list) {
    let src; try { src = fs.readFileSync(path.join(root, rel), 'utf8'); } catch { continue; }
    if (!src.includes('triLang')) continue;
    for (const issue of findTriLangKeyIssues(src)) findings.push({ file: rel, ...issue });
  }
  return findings;
}
