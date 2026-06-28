// ═══════════════════════════════════════════════════════════════════════════
// verb_letter_bank.ts — логика «собери форму из букв» (word-bank, как Duolingo)
//
// Чистая логика без UI: разложить целевую форму на буквы, подмешать несколько
// правдоподобных лишних букв, перемешать. UI собирает слово тапами.
//
// Активный recall (воспроизведение) даёт более прочный след памяти, чем выбор
// из готовых вариантов (recognition) — generation effect.
// ═══════════════════════════════════════════════════════════════════════════

export interface LetterTile {
  /** Стабильный id для React-key и трекинга (буква может повторяться). */
  id: string;
  char: string;
}

/** Буквы, которыми разумно «зашумлять» (частые в неправильных формах). */
const DECOY_POOL = 'aeioutdnrshwgklmbpcf'.split('');

function seededShuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Сколько лишних букв подмешать в зависимости от длины слова.
 * Короткие (was, did) — без лишних или 1; длинные — до 3.
 */
function decoyCountForLength(len: number): number {
  if (len <= 3) return 1;
  if (len <= 5) return 2;
  return 3;
}

/**
 * Строит набор плиток-букв для целевого слова: его буквы + лишние, перемешано.
 * @param target — правильная форма (lowercase ожидается на входе)
 * @param rnd — генератор [0,1) (для тестов можно детерминированный)
 */
export function buildLetterBank(target: string, rnd: () => number = Math.random): LetterTile[] {
  const clean = target.trim().toLowerCase();
  const letters = clean.split('');
  const decoyCount = decoyCountForLength(letters.length);

  const inWord = new Set(letters);
  const decoys: string[] = [];
  let guard = 0;
  while (decoys.length < decoyCount && guard < 200) {
    guard += 1;
    const c = DECOY_POOL[Math.floor(rnd() * DECOY_POOL.length)];
    // Не добавляем букву, которой ещё нет в слове, чтобы не было «двух правильных путей»
    // и чтобы лишняя буква действительно сбивала (её нет в ответе).
    if (!inWord.has(c) && !decoys.includes(c)) decoys.push(c);
  }

  const tiles: LetterTile[] = [
    ...letters.map((char, i) => ({ id: `t${i}_${char}`, char })),
    ...decoys.map((char, i) => ({ id: `d${i}_${char}`, char })),
  ];
  return seededShuffle(tiles, rnd);
}

/** Собранное слово из выбранных плиток. */
export function assembledWord(selected: LetterTile[]): string {
  return selected.map(t => t.char).join('');
}

/**
 * Проверка: собранное слово совпадает с одной из допустимых форм.
 * @param acceptedForms — все верные формы (включая варианты was|were)
 */
export function isAssemblyCorrect(assembled: string, acceptedForms: string[]): boolean {
  const norm = assembled.trim().toLowerCase();
  if (!norm) return false;
  return acceptedForms.some(f => f.trim().toLowerCase() === norm);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
