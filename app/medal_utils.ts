import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { COURSE_LEVEL_RANGES } from './course_levels';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type MedalTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface MedalInfo {
  tier:        MedalTier;
  bestScore:   number;    // 0.0 – 5.0
  passCount:   number;    // сколько раз пройден урок
}

// CEFR диапазоны уроков
export const CEFR_RANGES: Record<string, [number, number]> = {
  ...COURSE_LEVEL_RANGES,
};

// ─── Tier расчёт ──────────────────────────────────────────────────────────────

export const getMedalTier = (score: number): MedalTier => {
  if (score >= 5.0) return 'gold';
  if (score >= 4.5) return 'silver';
  if (score >= 2.5) return 'bronze';
  return 'none';
};

// Сколько правильных ответов нужно для следующего тира (возвращает 0 если уже gold)
export const getCorrectNeededForNextTier = (score: number): number => {
  const current = score / 5 * 50;
  const tier = getMedalTier(score);
  if (tier === 'gold')   return 0;
  if (tier === 'silver') return Math.ceil(50 - current);       // нужно 50/50
  if (tier === 'bronze') return Math.ceil(45 - current);       // нужно 45/50 для Silver
  return Math.ceil(25 - current);                              // нужно 25 для Bronze
};

/** RU: «1 верный ответ» / «2 верных ответа» / «5 верных ответов» (не «1 правильных»). */
function ruVerneOtvetyPhrase(need: number): string {
  const n = Math.floor(need);
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} верный ответ`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} верных ответа`;
  return `${n} верных ответов`;
}

/** UK: «1 вірна відповідь» / «2 вірні відповіді» / «5 вірних відповідей». */
function ukVirniVidpovidiPhrase(need: number): string {
  const n = Math.floor(need);
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} вірна відповідь`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} вірні відповіді`;
  return `${n} вірних відповідей`;
}

/** ES: «1 respuesta correcta más» / «N respuestas correctas más». */
function esRespuestasCorrectasPhrase(need: number): string {
  const n = Math.floor(need);
  return n === 1 ? '1 respuesta correcta más' : `${n} respuestas correctas más`;
}

// Подсказка «ещё N для X» для lesson_menu
export const getNextMedalHint = (score: number, lang: Lang): string | null => {
  const tier = getMedalTier(score);
  if (tier === 'gold') return null;
  const need = getCorrectNeededForNextTier(score);
  if (need <= 0) return null;
  if (lang === 'uk') {
    const p = ukVirniVidpovidiPhrase(need);
    if (tier === 'silver') return `Ще ${p} → Золото`;
    if (tier === 'bronze') return `Ще ${p} → Срібло`;
    return `Ще ${p} → Бронза`;
  }
  if (lang === 'es') {
    const p = esRespuestasCorrectasPhrase(need);
    if (tier === 'silver') return `${p} → Oro`;
    if (tier === 'bronze') return `${p} → Plata`;
    return `${p} → Bronce`;
  }
  const p = ruVerneOtvetyPhrase(need);
  if (tier === 'silver') return `Ещё ${p} → Золото`;
  if (tier === 'bronze') return `Ещё ${p} → Серебро`;
  return `Ещё ${p} → Бронза`;
};

// ─── AsyncStorage helpers ─────────────────────────────────────────────────────

const parseStoredScore = (raw: unknown): number => {
  const n = parseFloat(String(raw ?? '0'));
  return Number.isFinite(n) ? n : 0;
};

const parseStoredPassCount = (raw: unknown): number => {
  const n = parseInt(String(raw ?? '0'), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const normalizeLessonPassCount = (storedPassCount: number, bestScore: number): number =>
  Math.max(storedPassCount, bestScore >= 4.5 ? 1 : 0);

export const loadMedalInfo = async (lessonId: number): Promise<MedalInfo> => {
  try {
    const [scoreRaw, passRaw] = await AsyncStorage.multiGet([
      `lesson${lessonId}_best_score`,
      `lesson${lessonId}_pass_count`,
    ]);
    const bestScore = parseStoredScore(scoreRaw[1]);
    const storedPassCount = parseStoredPassCount(passRaw[1]);
    const passCount = normalizeLessonPassCount(storedPassCount, bestScore);
    return { tier: getMedalTier(bestScore), bestScore, passCount };
  } catch {
    return { tier: 'none', bestScore: 0, passCount: 0 };
  }
};

// Вызывается при завершении урока. Возвращает { newTier, prevTier, isNewBest }.
export const saveMedalProgress = async (
  lessonId: number,
  currentScore: number,
  progressArr: string[],
): Promise<{
  newTier: MedalTier;
  prevTier: MedalTier;
  isNewBest: boolean;
  prevPassCount: number;
  newPassCount: number;
  passCountIncreased: boolean;
}> => {
  try {
    const progressTotal = Array.isArray(progressArr) && progressArr.length > 0
      ? Math.min(progressArr.length, 50)
      : 50;
    const progressCorrect = Array.isArray(progressArr)
      ? progressArr.filter(x => x === 'correct' || x === 'replay_correct').length
      : 0;
    const scoreForPass = Number.isFinite(currentScore)
      ? currentScore
      : parseFloat(((Math.min(progressCorrect, progressTotal) / progressTotal) * 5).toFixed(1));
    const [scoreRaw, passRaw] = await AsyncStorage.multiGet([
      `lesson${lessonId}_best_score`,
      `lesson${lessonId}_pass_count`,
    ]);
    const prevBest  = parseStoredScore(scoreRaw[1]);
    const storedPrevPass = parseStoredPassCount(passRaw[1]);
    const prevPass  = normalizeLessonPassCount(storedPrevPass, prevBest);
    const prevTier  = getMedalTier(prevBest);

    const isNewBest = scoreForPass > prevBest;
    const newBest   = isNewBest ? scoreForPass : prevBest;
    const newPass   = prevPass + 1;
    const newTier   = getMedalTier(newBest);

    // Save best score for lesson medal/unlock state. Count a pass for strong silver+ runs.
    const passCountIncreased = scoreForPass >= 4.5;
    const writes: [string, string][] = [
      [`lesson${lessonId}_best_score`, String(newBest)],
    ];
    if (passCountIncreased) {
      writes.push([`lesson${lessonId}_pass_count`, String(newPass)]);
    }
    await AsyncStorage.multiSet(writes);
    invalidateMedalsCache();

    return {
      newTier,
      prevTier,
      isNewBest,
      prevPassCount: prevPass,
      newPassCount: passCountIncreased ? newPass : prevPass,
      passCountIncreased,
    };
  } catch {
    const tier = getMedalTier(currentScore);
    return {
      newTier: tier,
      prevTier: 'none',
      isNewBest: true,
      prevPassCount: 0,
      newPassCount: currentScore >= 4.5 ? 1 : 0,
      passCountIncreased: currentScore >= 4.5,
    };
  }
};

// In-memory cache for loadAllMedals
let _medalsCache: MedalTier[] | null = null;

/** Invalidate medal cache (call after saveMedalProgress / saveExamProgress) */
export const invalidateMedalsCache = () => { _medalsCache = null; };

// Загружает медали для всех 32 уроков разом (cached in memory)
export const loadAllMedals = async (): Promise<MedalTier[]> => {
  if (_medalsCache) return _medalsCache;
  try {
    const keys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_best_score`);
    const pairs = await AsyncStorage.multiGet(keys);
    _medalsCache = pairs.map(([, v]) => getMedalTier(parseFloat(v ?? '0') || 0));
    return _medalsCache;
  } catch {
    return new Array(32).fill('none');
  }
};

// Считает медали по типам
export const countMedals = (medals: MedalTier[]) => ({
  bronze: medals.filter(m => m === 'bronze').length,
  silver: medals.filter(m => m === 'silver').length,
  gold:   medals.filter(m => m === 'gold').length,
});

// ─── Gem achievements (проходы по CEFR-уровню) ───────────────────────────────

export type GemType = 'ruby' | 'emerald' | 'diamond';

// Возвращает гем-достижения, которые нужно разблокировать после saveMedalProgress
export const checkGemAchievements = async (
  lessonId: number,
): Promise<{ level: string; gem: GemType }[]> => {
  try {
    const results: { level: string; gem: GemType }[] = [];

    for (const [lvl, [from, to]] of Object.entries(CEFR_RANGES)) {
      if (lessonId < from || lessonId > to) continue;

      // Читаем pass_count всех уроков этого уровня
      const lessonIds = Array.from({ length: to - from + 1 }, (_, i) => from + i);
      const keys = lessonIds.flatMap(id => [
        `lesson${id}_pass_count`,
        `lesson${id}_best_score`,
      ]);
      const pairs = await AsyncStorage.multiGet(keys);
      const map = Object.fromEntries(pairs);
      const passCounts = lessonIds.map(id =>
        normalizeLessonPassCount(
          parseStoredPassCount(map[`lesson${id}_pass_count`]),
          parseStoredScore(map[`lesson${id}_best_score`]),
        ),
      );
      const minPasses = Math.min(...passCounts);

      if (minPasses >= 2) results.push({ level: lvl, gem: 'ruby' });
      if (minPasses >= 3) results.push({ level: lvl, gem: 'emerald' });
      if (minPasses >= 4) results.push({ level: lvl, gem: 'diamond' });
    }

    return results;
  } catch { return []; }
};

// ─── Exam medal helpers ───────────────────────────────────────────────────────

export const getExamMedalTier = (pct: number): MedalTier => {
  if (pct >= 90) return 'gold';
  if (pct >= 70) return 'silver';
  if (pct >= 50) return 'bronze';
  return 'none';
};

// Сохраняет результат экзамена, возвращает { newTier, prevTier, newPassCount }
export const saveExamProgress = async (
  lvl: string,
  pct: number,
): Promise<{ newTier: MedalTier; prevTier: MedalTier; newPassCount: number }> => {
  try {
    const [bestRaw, passRaw] = await AsyncStorage.multiGet([
      `level_exam_${lvl}_best_pct`,
      `level_exam_${lvl}_pass_count`,
    ]);
    const prevBest  = parseInt(bestRaw[1] ?? '0') || 0;
    const prevPass  = parseInt(passRaw[1] ?? '0') || 0;
    const newBest   = Math.max(prevBest, pct);
    // Рубин/изумруд/бриллиант на карточке зачёта — только за идеальные (100%) прохождения
    const newPass   = prevPass + (pct === 100 ? 1 : 0);
    await AsyncStorage.multiSet([
      [`level_exam_${lvl}_best_pct`,    String(newBest)],
      [`level_exam_${lvl}_pass_count`,  String(newPass)],
    ]);
    return {
      newTier:      getExamMedalTier(newBest),
      prevTier:     getExamMedalTier(prevBest),
      newPassCount: newPass,
    };
  } catch {
    return { newTier: getExamMedalTier(pct), prevTier: 'none', newPassCount: 1 };
  }
};

// Загружает медаль и pass_count для одного экзамена
export const loadExamMedalInfo = async (lvl: string): Promise<{ tier: MedalTier; passCount: number }> => {
  try {
    const [bestRaw, passRaw] = await AsyncStorage.multiGet([
      `level_exam_${lvl}_best_pct`,
      `level_exam_${lvl}_pass_count`,
    ]);
    const best = parseInt(bestRaw[1] ?? '0') || 0;
    const pass = parseInt(passRaw[1] ?? '0') || 0;
    return { tier: getExamMedalTier(best), passCount: pass };
  } catch { return { tier: 'none', passCount: 0 }; }
};

// ─── Dot colors for overlapping medal display ─────────────────────────────────
export const MEDAL_DOT_COLOR: Record<string, string> = {
  bronze:  '#CD7F32',
  silver:  '#C0C0C0',
  gold:    '#FFD700',
  ruby:    '#E53935',
  emerald: '#50C878',
  diamond: '#4FC3F7',
};

// Returns list of earned dot keys for a lesson
export const getEarnedDots = (medalTier: MedalTier, passCount: number): string[] => {
  const dots: string[] = [];
  // Все медали по счёту — накопительно (бронза → серебро → золото)
  if (medalTier === 'bronze' || medalTier === 'silver' || medalTier === 'gold') dots.push('bronze');
  if (medalTier === 'silver' || medalTier === 'gold') dots.push('silver');
  if (medalTier === 'gold') dots.push('gold');
  // Медали за повторные прохождения — накопительно
  if (passCount >= 2) dots.push('ruby');
  if (passCount >= 3) dots.push('emerald');
  if (passCount >= 4) dots.push('diamond');
  return dots;
};

// ─── Цвет прогресс-бара клетки в зависимости от passCount и статуса
export const getProgressCellColor = (
  status: string,
  passCount: number,
  t: { correct: string; wrong: string; accent: string; bgSurface2: string },
  isCurrentCell: boolean,
): string => {
  // Текущая ячейка (под стрелкой) — белая, чтобы не путаться с зелёным "правильно"
  if (isCurrentCell) return 'rgba(255,255,255,0.85)';
  if (status === 'wrong') return t.wrong;
  if (status === 'correct' || status === 'replay_correct') {
    if (passCount >= 4) return '#4FC3F7';  // diamond blue
    if (passCount >= 3) return '#50C878';  // emerald green
    if (passCount >= 2) return '#E53935';  // ruby red
    return t.correct;                      // first pass — цвет темы
  }
  return t.bgSurface2;
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
