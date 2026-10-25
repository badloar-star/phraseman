// ═══════════════════════════════════════════════════════════════════════════
// learning_v2_intro_text_roles.ts — разбор текста вступления на роли ПРИ ПОКАЗЕ: английский / частица / перевод / формула.
//
// зачем (владелец 25.10 утвердил «МАКСИМУМ И ПОДЛОЖКА»; координатор): одна чистая функция для абзацев вступления (части plain
// и bodyByLocale без частей) и ситуации «Скажи так». Латиница → английский; служебные слова (am/is/are, a/an/the, this/these,
// there, do/does, will, to, not) и окончания -s/-es у английских слов → частица; «+» и «→» → формула; кириллица → перевод.
// Разметка курса (semantic у частей) главнее — сюда попадает только обычный текст. Результат кэшируется по строке.
// ═══════════════════════════════════════════════════════════════════════════

export type IntroTextRole = 'lang' | 'particle' | 'gloss' | 'formula' | 'plain';
export type IntroRoleSegment = Readonly<{ text: string; role: IntroTextRole }>;

const PARTICLES: ReadonlySet<string> = new Set(['am', 'is', 'are', 'a', 'an', 'the', 'this', 'these', 'there', 'do', 'does', 'will', 'to', 'not']);
// английские слова на -s, у которых это не окончание (не дробим)
const S_EXCEPTIONS: ReadonlySet<string> = new Set([
  'is', 'was', 'has', 'his', 'this', 'its', 'yes', 'us', 'bus', 'plus', 'gas', 'class', 'glass', 'grass', 'pass', 'boss', 'kiss', 'miss', 'less', 'mess',
  'dress', 'address', 'process', 'success', 'business', 'bonus', 'focus', 'status', 'virus', 'campus', 'menu', 'always', 'perhaps', 'news', 'series',
  'species', 'does', 'goes', 'thanks', 'lens', 'chaos', 'canvas', 'atlas', 'alias', 'basis', 'crisis', 'analysis', 'thus', 'besides', 'towards', 'whereas',
  'ours', 'yours', 'hers', 'theirs', 'as', 'was', 'cos', 'yes', 'gas', 'tennis', 'physics', 'maths', 'economics', 'politics', 'christmas', 'paris', 'texas',
]);

const LATIN = /[A-Za-z]/;
const CYRILLIC = /[Ѐ-ӿ]/;
const TOKEN = /([A-Za-z]+(?:['’][A-Za-z]+)?|[Ѐ-ӿ]+(?:-[Ѐ-ӿ]+)*|[+→]|\s+|[^A-Za-zЀ-ӿ+→\s]+)/g;

/** Английское слово → [основа, окончание] или null, если окончания -s/-es нет. */
function splitEnding(word: string): readonly [string, string] | null {
  const lower = word.toLowerCase();
  if (word.length < 4 || S_EXCEPTIONS.has(lower) || PARTICLES.has(lower) || /['’]/.test(word)) return null;
  if (/(?:s|x|z|ch|sh|o)es$/i.test(word)) return [word.slice(0, -2), word.slice(-2)];
  if (/[^su]s$/i.test(word) && !/ss$/i.test(word)) return [word.slice(0, -1), word.slice(-1)];
  return null;
}

function tokenize(text: string): IntroRoleSegment[] {
  const out: IntroRoleSegment[] = [];
  const push = (t: string, role: IntroTextRole): void => {
    const last = out[out.length - 1];
    if (last && last.role === role && role !== 'particle') out[out.length - 1] = { text: last.text + t, role };
    else out.push({ text: t, role });
  };
  for (const m of text.matchAll(TOKEN)) {
    const t = m[0];
    if (t === '+' || t === '→') { push(t, 'formula'); continue; }
    if (/^\s+$/.test(t) || (!LATIN.test(t) && !CYRILLIC.test(t))) {
      // пробел/знак между двумя английскими кусками остаётся «английским» (одна фраза), иначе — нейтральный
      push(t, 'plain');
      continue;
    }
    if (CYRILLIC.test(t)) { push(t, 'gloss'); continue; }
    if (PARTICLES.has(t.toLowerCase())) { push(t, 'particle'); continue; }
    const ending = splitEnding(t);
    if (ending) { push(ending[0], 'lang'); push(ending[1], 'particle'); continue; }
    push(t, 'lang');
  }
  return out;
}

const CACHE_LIMIT = 500;
const cache = new Map<string, readonly IntroRoleSegment[]>();

/** Сегменты строки по ролям; один и тот же текст разбирается один раз (кэш по строке). */
export function splitIntroTextRoles(text: string): readonly IntroRoleSegment[] {
  const hit = cache.get(text);
  if (hit) return hit;
  const segments = Object.freeze(tokenize(text).map((s) => Object.freeze(s)));
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(text, segments);
  return segments;
}

// expo-router видит файлы app/ как маршруты — пустая заглушка, как у соседних модулей (coin_spend_gap.ts)
export default function __RouteShim() { return null; }
