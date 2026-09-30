// ═══ Простой фильтр мата для текста визитки «Про» (ru / uk / en) ═══════════════
// зачем (владелец 2026-09-30): свой текст на визитке видят ВСЕ игроки, открывшие
// визитку. Модерация — жалоба на игрока (причина «неприемлемый текст визитки»);
// этот фильтр — первая, грубая линия: отсекает очевидный мат ещё на записи.
//
// Сознательно НЕ пытаемся быть полным словарём: короткий список корней + нормализация
// обходов («x.у.й», «пи3да», латинские двойники кириллицы). Ложное срабатывание
// хуже пропуска — человек не сможет написать безобидную фразу. Поэтому:
//  • корни ищем только В НАЧАЛЕ слова или целым словом, где у корня есть безобидные
//    соседи («хлебать» ⊃ «еба», «мандарин» ⊃ «манда», «сукно» ⊃ «сук»);
//  • точки/дефисы/звёздочки убираем ТОЛЬКО внутри слова, пробелы не склеиваем
//    («мех уйти» не должен превратиться в «мехуйти»).

const LATIN_TO_CYRILLIC: Readonly<Record<string, string>> = {
  a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
};

const LEET_TO_LATIN: Readonly<Record<string, string>> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's',
};

const LEET_TO_CYRILLIC: Readonly<Record<string, string>> = {
  '0': 'о', '3': 'з', '4': 'ч', '6': 'б', '@': 'а',
};

/** Слово = последовательность букв/цифр/маскирующих знаков внутри слова. */
const WORD_RE = /[\p{L}\p{N}@$*._-]+/gu;
const IN_WORD_MASK_RE = /[*._-]+/g;

/**
 * Корни, запрещённые В НАЧАЛЕ слова (после необязательной приставки).
 * Кириллица проверяется по «кириллическому» виду слова, латиница — по латинскому.
 */
const CYRILLIC_PREFIXES = '(?:вы|за|на|от|по|у|до|раз|рас|съ|под|при|про|пере|недо|о|об|вз|из|ис)?';

const CYRILLIC_ROOT_PATTERNS: readonly RegExp[] = [
  // ru/uk: основной мат
  new RegExp(`^${CYRILLIC_PREFIXES}ху[йяеиюё]`),
  new RegExp(`^${CYRILLIC_PREFIXES}п[иі]зд`),
  new RegExp(`^${CYRILLIC_PREFIXES}(?:е|ё|є|ї|йо)б(?:а|у|л|н|т|и|ё|ись|ыв)`),
  /(?:^|[аеиоуыэюяё])еб(?:ан|ал|ат|ун|ыр)/, // долбоёб, заебал в середине слова после гласной
  /долбо(?:е|ё)б/,
  /^бл(?:ять|ядь|ядин|ядск|ят)/,
  /^бля$/,
  /^сук(?:а|и|у|ой|е|ин|ины|ами)$/,
  /^мудак/,
  /^мудил/,
  /^мудо[зх]в/,
  /^п[иеі]д(?:о|а)р/,
  /^пидр/,
  /^педик/,
  /^гандон/,
  /^гондон/,
  /^шлюх/,
  /^залуп/,
  /^дроч/,
  /^манд(?:а|ы|у|ой)$/,
  /^курв/,
  /^шмар/,
  /^говн/,
  /^ублюд/,
  /^уеб/,
  /^уёб/,
];

const LATIN_ROOT_PATTERNS: readonly RegExp[] = [
  /^(?:mother)?fu+c?k/,
  /^fck/,
  /^f+u+k+/,
  /^sh[i1]t/,
  /^bullsh[i1]t/,
  /^cunt/,
  /^bitch/,
  /^n[i1]gg(?:er|a|az|ers)/,
  /^fag(?:got|gots|s)?$/,
  /^whore/,
  /^slut/,
  /^asshole/,
  /^dickhead/,
  /^motherf/,
  /^wank/,
  /^twat/,
];

function mapChars(word: string, table: Readonly<Record<string, string>>): string {
  let out = '';
  for (const ch of word) out += table[ch] ?? ch;
  return out;
}

/** Кириллический вид слова: латинские двойники и «цифры-буквы» → кириллица. */
function cyrillicView(word: string): string {
  return mapChars(mapChars(word, LEET_TO_CYRILLIC), LATIN_TO_CYRILLIC).replace(/ё/g, 'е');
}

/** Латинский вид слова: цифры/символы-маски → латиница. */
function latinView(word: string): string {
  return mapChars(word, LEET_TO_LATIN);
}

/** Разбивает текст на нормализованные слова (без масок внутри слова). */
export function profanityWords(text: string): string[] {
  const lowered = text.normalize('NFKC').toLowerCase();
  const words = lowered.match(WORD_RE) ?? [];
  return words
    .map((word) => word.replace(IN_WORD_MASK_RE, ''))
    .filter((word) => word.length > 0);
}

/**
 * true — в тексте есть явный мат. Проверка на слово: кириллические корни по
 * кириллическому виду, латинские — по латинскому.
 */
export function containsProfanity(text: string): boolean {
  for (const word of profanityWords(text)) {
    const cyr = cyrillicView(word);
    if (CYRILLIC_ROOT_PATTERNS.some((pattern) => pattern.test(cyr))) return true;
    const lat = latinView(word);
    if (LATIN_ROOT_PATTERNS.some((pattern) => pattern.test(lat))) return true;
  }
  return false;
}
