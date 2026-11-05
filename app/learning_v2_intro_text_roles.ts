// ═══════════════════════════════════════════════════════════════════════════
// learning_v2_intro_text_roles.ts — разбор текста вступления на роли ПРИ ПОКАЗЕ: изучаемый язык / перевод / формула.
//
// зачем (владелец 25.10 утвердил «МАКСИМУМ И ПОДЛОЖКА»; координатор): одна чистая функция для абзацев вступления (части plain
// и bodyByLocale без частей) и ситуации «Скажи так». Латиница → английский; служебные слова (am/is/are, a/an/the, this/these,
// there, do/does, will, to, not) и окончания -s/-es у английских слов → частица; «+» и «→» → формула; кириллица → перевод.
// Разметка курса (semantic у частей) главнее — сюда попадает только обычный текст. Результат кэшируется по строке.
// ═══════════════════════════════════════════════════════════════════════════

// зачем (решение владельца 05.11, макет target_lang_one_color_approved): частей речи, подсветки частиц и окончаний -s/-es больше нет — вся латиница = изучаемый язык одним цветом lang
export type IntroTextRole = 'lang' | 'gloss' | 'formula' | 'plain';
export type IntroRoleSegment = Readonly<{ text: string; role: IntroTextRole }>;

const LATIN = /[A-Za-z]/;
const CYRILLIC = /[Ѐ-ӿ]/;
const TOKEN = /([A-Za-z]+(?:['’][A-Za-z]+)?|[Ѐ-ӿ]+(?:-[Ѐ-ӿ]+)*|[+→]|\s+|[^A-Za-zЀ-ӿ+→\s]+)/g;

function tokenize(text: string): IntroRoleSegment[] {
  const out: IntroRoleSegment[] = [];
  const push = (t: string, role: IntroTextRole): void => {
    const last = out[out.length - 1];
    if (last && last.role === role) out[out.length - 1] = { text: last.text + t, role };
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
