/**
 * cards-2.0 (E6): fuzzy-сравнение письменного ввода (§3.6 мастер-плана).
 *
 * Слои (по нарастанию «мягкости»):
 *  1. Точное совпадение через существующий isCorrectAnswer (constants/contractions):
 *     don't == do not, BrE→AmE, curly-апострофы, хвостовая пунктуация — НЕ ломаем.
 *  2. Эквивалентности письма поверх (1): ё→е, укр. і/ї/є и латинская i,
 *     внутренняя пунктуация, дефисы, множественные пробелы. Артикли НЕ убираем.
 *  3. Опечатка: Левенштейн ≤1 на слово длиной ≥5 (короткие слова — строго),
 *     число слов должно совпадать. Засчитывается как верно с пометкой typo
 *     («Почти! Правильно: …»).
 *
 * Варианты правильного ответа: split по «;» и «/» (плюс исходная строка целиком —
 * «he/she is» не ломается).
 */
import { isCorrectAnswer, normalizeLessonAssemblyAnswer } from '../../constants/contractions';

/** Слово короче этого порога сравнивается строго (без Левенштейна). */
export const FUZZY_MIN_TYPO_WORD_LEN = 5;

/**
 * Полная нормализация ответа: contractions-пайплайн (trim, lowercase, апострофы,
 * don't→do not, BrE→AmE, хвостовая пунктуация) + эквивалентности письма:
 * ё→е, укр. і/ї → латинская i, є→е, дефисы/тире → пробел, внутренняя пунктуация
 * снимается, пробелы схлопываются. Артикли сознательно НЕ трогаем (§3.6).
 */
export function normalizeAnswer(text: string): string {
  // Порядок важен: письменные эквивалентности снимаем ДО contractions-пайплайна,
  // иначе его собственная нормализация кириллицы разводит «ещё» и «еще».
  const pre = String(text ?? '')
    .replace(/[ёѐ]/g, 'е')
    .replace(/ї/g, 'і') // ї → і
    .replace(/є/g, 'е'); // є → е
  const base = normalizeLessonAssemblyAnswer(pre);
  return base
    .replace(/[іi]/g, 'i') // кир. і и лат. i → один символ (симметрично обеим сторонам)
    .replace(/[–—-]/g, ' ') // дефис/тире → пробел («ice-cream» == «ice cream»)
    .replace(/[.,!?;:…"«»„“”()[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Варианты правильного ответа: split по «;» и «/». Исходная строка всегда
 * включена целиком — «он/она» матчится и как единое написание.
 */
export function splitAnswerVariants(correctAnswer: string): string[] {
  const raw = String(correctAnswer ?? '').trim();
  if (!raw) return [];
  const parts = raw
    .split(/[;/]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return [...new Set([raw, ...parts])];
}

/** Расстояние Левенштейна ≤1? Компактно: один проход двумя указателями. */
export function withinLevenshtein1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  const short = la <= lb ? a : b;
  const long = la <= lb ? b : a;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (short.length === long.length) {
      i++; // замена символа
      j++;
    } else {
      j++; // вставка/удаление — сдвигаем только длинную строку
    }
  }
  return edits + (long.length - j) + (short.length - i) <= 1;
}

/** Пословный typo-матч: слова 1:1, каждое либо равно, либо ≥5 букв и Левенштейн ≤1. */
function typoMatchNormalized(userNorm: string, correctNorm: string): boolean {
  if (!userNorm || !correctNorm || userNorm === correctNorm) return false;
  const uw = userNorm.split(' ');
  const cw = correctNorm.split(' ');
  if (uw.length !== cw.length) return false;
  let typos = 0;
  for (let k = 0; k < cw.length; k++) {
    const u = uw[k]!;
    const c = cw[k]!;
    if (u === c) continue;
    if (c.length < FUZZY_MIN_TYPO_WORD_LEN || !withinLevenshtein1(u, c)) return false;
    typos++;
  }
  return typos > 0;
}

export type FuzzyVerdict = {
  /** Засчитывать как верный ответ (exact ИЛИ typo). */
  ok: boolean;
  /** Совпадение без опечаток (после нормализаций). */
  exact: boolean;
  /** Верно с опечаткой — UI показывает «Почти! Правильно: …». */
  typo: boolean;
};

/**
 * Главная точка входа: ввод против correctAnswer (+ явные alternatives).
 * contractions-логика — первым слоем, без изменений её поведения.
 */
export function isFuzzyCorrect(
  input: string,
  correctAnswer: string,
  alternatives?: string[],
): FuzzyVerdict {
  const variants = [
    ...new Set([...splitAnswerVariants(correctAnswer), ...(alternatives ?? [])]),
  ].filter((v) => v.trim().length > 0);
  if (!String(input ?? '').trim() || variants.length === 0) {
    return { ok: false, exact: false, typo: false };
  }

  // 1) Существующая строгая логика (contractions/BrE→AmE) — не ломаем.
  for (const v of variants) {
    if (isCorrectAnswer(input, v)) return { ok: true, exact: true, typo: false };
  }

  // 2) Эквивалентности письма (ё/е, і/ї/є, пунктуация, дефисы).
  const userNorm = normalizeAnswer(input);
  if (!userNorm) return { ok: false, exact: false, typo: false };
  const variantNorms = variants.map((v) => normalizeAnswer(v)).filter((v) => v.length > 0);
  for (const vn of variantNorms) {
    if (userNorm === vn) return { ok: true, exact: true, typo: false };
  }

  // 3) Опечатка: Левенштейн ≤1 на слово длиной ≥5.
  for (const vn of variantNorms) {
    if (typoMatchNormalized(userNorm, vn)) return { ok: true, exact: false, typo: true };
  }
  return { ok: false, exact: false, typo: false };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
