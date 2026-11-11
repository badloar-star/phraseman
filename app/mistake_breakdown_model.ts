/**
 * Чистая модель ИИ-разбора ошибки «по полям» (без React и без сети).
 *
 * зачем (владелец 11.11, аудит разбора → «Да, внедряй»): сервер теперь отдаёт не абзац, а поля —
 * какое слово не то, какое нужно, правило одной строкой, пояснение. Здесь две вещи, которые нужны
 * экрану и которые удобно проверять тестом отдельно от вёрстки:
 *   1) проверка пришедших полей на границе (ответ сервера и локальный кэш — недоверенные данные);
 *   2) разметка фразы: «I don't have [some → any] money» — промах виден одним словом, а не
 *      зачёркнутой фразой целиком.
 */

export type MistakeVerdict = 'no_mistake' | 'one' | 'several';

export interface MistakeSwap {
  wrong: string;
  right: string;
}

export interface MistakeBreakdown {
  verdict: MistakeVerdict;
  wrong: string;
  right: string;
  rule: string;
  why: string;
  youSaid: string;
  pair: string[];
  also: MistakeSwap[];
  simple: string;
}

const MAX_PAIR_ITEMS = 2;
const MAX_ALSO = 4;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Недоверенный объект (ответ функции / локальный кэш) → поля разбора, либо null. */
export function coerceMistakeBreakdown(value: unknown): MistakeBreakdown | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Partial<Record<keyof MistakeBreakdown, unknown>>;
  const verdict = raw.verdict;
  if (verdict !== 'no_mistake' && verdict !== 'one' && verdict !== 'several') return null;
  const why = text(raw.why);
  if (!why) return null;
  const pair = Array.isArray(raw.pair) ? raw.pair.map(text).filter(Boolean).slice(0, MAX_PAIR_ITEMS) : [];
  const also = Array.isArray(raw.also)
    ? raw.also
      .map((swap) => ({
        wrong: text((swap as Partial<MistakeSwap> | null)?.wrong),
        right: text((swap as Partial<MistakeSwap> | null)?.right),
      }))
      .filter((swap) => swap.wrong || swap.right)
      .slice(0, MAX_ALSO)
    : [];
  return {
    verdict,
    wrong: text(raw.wrong),
    right: text(raw.right),
    rule: text(raw.rule),
    why,
    youSaid: text(raw.youSaid),
    // Пара показывает контраст только целиком: один пример без второго ничего не объясняет.
    pair: pair.length === MAX_PAIR_ITEMS ? pair : [],
    also,
    simple: text(raw.simple),
  };
}

export function serializeMistakeBreakdown(breakdown: MistakeBreakdown): string {
  return JSON.stringify(breakdown);
}

/** Строка локального кэша → поля. Битая запись — это просто «полей нет», экран покажет текст. */
export function parseStoredMistakeBreakdown(raw: string | null | undefined): MistakeBreakdown | null {
  if (!raw) return null;
  try {
    return coerceMistakeBreakdown(JSON.parse(raw));
  } catch (error) {
    // Немой catch запрещён: битая запись кэша — причина, по которой карточка откатится к сплошному тексту.
    console.warn(`[AI-EXPLAIN] breakdown:local_cache_corrupt chars=${raw.length} reason=${String((error as Error)?.message ?? error).slice(0, 80)}`); // guard-ok: ранний выход логируется и в релизе
    return null;
  }
}

export type BreakdownSegmentTone = 'plain' | 'wrong' | 'right';

export interface BreakdownSegment {
  text: string;
  tone: BreakdownSegmentTone;
}

function foldForSearch(value: string): string {
  // Длина строки сохраняется (замены 1:1), поэтому найденный индекс годится для исходной строки.
  return value.toLowerCase().replace(/[‘’ʼ`]/g, "'");
}

/** Индекс фрагмента как ЦЕЛОГО слова/группы слов; -1, если его нет. */
function indexOfWholeFragment(sentence: string, fragment: string): number {
  const haystack = foldForSearch(sentence);
  const needle = foldForSearch(fragment);
  if (!needle) return -1;
  const isWordChar = (ch: string | undefined): boolean => Boolean(ch) && /[\p{L}\p{N}']/u.test(ch as string);
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) return -1;
    // «a» не должно находиться внутри «have»: по краям фрагмента — не буква.
    if (!isWordChar(haystack[at - 1]) && !isWordChar(haystack[at + needle.length])) return at;
    from = at + 1;
  }
  return -1;
}

function pushPlain(segments: BreakdownSegment[], value: string): void {
  if (value) segments.push({ text: value, tone: 'plain' });
}

/**
 * Фраза с выделенным промахом. Основа — правильная фраза: на месте нужного слова стоят рядом
 * «не то» (зачёркнутое) и «нужно». Пустой массив = выделить нечем (ошибки нет, сервер не указал
 * слова или их нет во фразе) — экран показывает фразы обычным текстом.
 */
export function buildBreakdownSentence(input: {
  userAnswer: string;
  targetAnswer: string;
  breakdown: MistakeBreakdown | null;
}): BreakdownSegment[] {
  const { breakdown } = input;
  if (!breakdown || breakdown.verdict === 'no_mistake') return [];
  const target = String(input.targetAnswer ?? '').trim();
  const user = String(input.userAnswer ?? '').trim();
  const { wrong, right } = breakdown;
  const segments: BreakdownSegment[] = [];

  if (right) {
    const at = indexOfWholeFragment(target, right);
    if (at < 0) return [];
    pushPlain(segments, target.slice(0, at));
    if (wrong) segments.push({ text: wrong, tone: 'wrong' }, { text: ' ', tone: 'plain' });
    segments.push({ text: target.slice(at, at + right.length), tone: 'right' });
    pushPlain(segments, target.slice(at + right.length));
    return segments;
  }

  // Нужного слова нет — значит, в ответе лишнее: показываем ответ ученика с зачёркнутым лишним.
  if (!wrong) return [];
  const at = indexOfWholeFragment(user, wrong);
  if (at < 0) return [];
  pushPlain(segments, user.slice(0, at));
  segments.push({ text: user.slice(at, at + wrong.length), tone: 'wrong' });
  pushPlain(segments, user.slice(at + wrong.length));
  return segments;
}

export interface QuotedTextPart {
  text: string;
  quoted: boolean;
}

/**
 * Делит пояснение на обычный текст и слова изучаемого языка в кавычках ("any", «any», “any”) —
 * экран выделяет их цветом, а сами кавычки не печатает.
 */
export function splitQuotedText(value: string): QuotedTextPart[] {
  const source = String(value ?? '');
  const parts: QuotedTextPart[] = [];
  const pattern = /"([^"\n]+)"|“([^”\n]+)”|«([^»\n]+)»/g;
  let last = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    if (match.index > last) parts.push({ text: source.slice(last, match.index), quoted: false });
    parts.push({ text: match[1] ?? match[2] ?? match[3] ?? '', quoted: true });
    last = match.index + match[0].length;
  }
  if (last < source.length) parts.push({ text: source.slice(last), quoted: false });
  return parts;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
