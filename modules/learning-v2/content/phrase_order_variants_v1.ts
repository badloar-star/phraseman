// phrase_order_variants_v1.ts — допустимые порядки слов для «собери фразу».
// зачем (координатор 28.10 по сканеру Теории, 211 заданий): «Yesterday she found the keys» засчитывалось ошибкой — проверка принимала
// только порядок автора. Обстоятельство времени (и короткий список мест) на одном конце фразы засчитывается и на другом, если остальной
// порядок верен. Капсула проверки сравнивает после нормализации (регистр и пунктуация не важны) и принимает до 32 вариантов.

const LOG = '[PHRASE-ORDER]';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const PERIODS = ['night', 'week', 'month', 'year', 'morning', 'afternoon', 'evening', 'weekend', 'summer', 'winter', 'spring', 'autumn', 'time', ...WEEKDAYS];

/** Обстоятельства, которые можно ставить в начало или в конец. Только время и места без смены смысла (не here / there). */
const ADVERBIALS: readonly (readonly string[])[] = [
  ['yesterday'], ['today'], ['tomorrow'], ['tonight'], ['sometimes'],
  ...['last', 'next', 'this'].flatMap((w) => PERIODS.map((p) => [w, p])),
  ...['day', 'morning', 'evening', 'night', 'week', 'month', 'year', 'summer', 'weekend', ...WEEKDAYS].map((p) => ['every', p]),
  ...WEEKDAYS.map((d) => ['on', d]),
  ['in', 'the', 'morning'], ['in', 'the', 'afternoon'], ['in', 'the', 'evening'], ['at', 'night'], ['at', 'the', 'weekend'],
  ['at', 'home'], ['at', 'work'], ['at', 'school'],
].sort((a, b) => b.length - a.length);

// связка перед обстоятельством — это часть сказуемого («Arrival is tomorrow»), переносить нельзя
const LINKING = new Set(['is', 'are', 'was', 'were', 'am', 'be', 'been', "it's", "that's"]);
// вопрос: «Did you call yesterday?» → «Yesterday did you call?» неверно
const QUESTION_START = new Set(['do', 'does', 'did', 'is', 'are', 'was', 'were', 'am', 'will', 'would', 'can', 'could', 'should', 'shall', 'may',
  'have', 'has', 'had', 'where', 'what', 'when', 'why', 'how', 'who', 'which', 'whose']);

const word = (token: string): string => token.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

function matchAt(words: readonly string[], start: number): number {
  for (const phrase of ADVERBIALS) {
    if (start + phrase.length > words.length) continue;
    if (phrase.every((w, i) => words[start + i] === w)) return phrase.length;
  }
  return 0;
}

function matchEnd(words: readonly string[]): number {
  for (const phrase of ADVERBIALS) {
    const start = words.length - phrase.length;
    if (start < 0) continue;
    if (phrase.every((w, i) => words[start + i] === w)) return phrase.length;
  }
  return 0;
}

/** Принятые ответы для «собери фразу»: порядок автора и, если можно, тот же порядок с обстоятельством на другом конце. */
export function phraseBuilderAcceptedOrdersV1(tokens: readonly string[], interactionId = ''): readonly string[] {
  const authored = tokens.join(' ');
  const words = tokens.map(word);
  if (words.length < 3) return [authored];
  if (QUESTION_START.has(words[0] ?? '')) {
    if (matchEnd(words) > 0) console.log(LOG, 'skip:question', JSON.stringify({ interactionId, first: words[0] })); // guard-ok: ранний выход с причиной
    return [authored];
  }
  const variants: string[] = [];
  const tail = matchEnd(words);
  if (tail > 0 && words.length - tail >= 2) {
    const before = words[words.length - tail - 1] ?? '';
    if (LINKING.has(before)) {
      console.log(LOG, 'skip:linking', JSON.stringify({ interactionId, before, adverbial: words.slice(-tail).join(' ') })); // guard-ok: «Arrival is tomorrow» — часть сказуемого
    } else {
      variants.push([...tokens.slice(-tail), ...tokens.slice(0, -tail)].join(' '));
    }
  }
  const head = matchAt(words, 0);
  if (head > 0 && words.length - head >= 2) variants.push([...tokens.slice(head), ...tokens.slice(0, head)].join(' '));
  if (variants.length > 0) console.log(LOG, 'variant', JSON.stringify({ interactionId, authored, variants })); // guard-ok: какой порядок добавлен и откуда
  return [authored, ...variants.filter((v) => v !== authored)];
}
