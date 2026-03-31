import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type MedalTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface MedalInfo {
  tier:        MedalTier;
  bestScore:   number;    // 0.0 – 5.0
  passCount:   number;    // сколько раз пройден урок
}

// CEFR диапазоны уроков
export const CEFR_RANGES: Record<string, [number, number]> = {
  A1: [1,  8],
  A2: [9,  16],
  B1: [17, 24],
  B2: [25, 32],
};

// ─── Tier расчёт ──────────────────────────────────────────────────────────────

export const getMedalTier = (score: number): MedalTier => {
  if (score >= 5.0) return 'gold';
  if (score >= 3.5) return 'silver';
  if (score >= 2.5) return 'bronze';
  return 'none';
};

// Сколько правильных ответов нужно для следующего тира (возвращает 0 если уже gold)
export const getCorrectNeededForNextTier = (score: number): number => {
  const current = score / 5 * 50;
  const tier = getMedalTier(score);
  if (tier === 'gold')   return 0;
  if (tier === 'silver') return Math.ceil(50 - current);       // нужно 50/50
  if (tier === 'bronze') return Math.ceil(35 - current);       // нужно 35 для Silver
  return Math.ceil(25 - current);                              // нужно 25 для Bronze
};

// Подсказка «ещё N для X» для lesson_menu
export const getNextMedalHint = (score: number, lang: 'ru' | 'uk'): string | null => {
  const tier = getMedalTier(score);
  if (tier === 'gold') return null;
  const need = getCorrectNeededForNextTier(score);
  if (need <= 0) return null;
  if (lang === 'uk') {
    if (tier === 'silver') return `Ще ${need} правильних → Золото`;
    if (tier === 'bronze') return `Ще ${need} правильних → Срібло`;
    return `${need} правильних → Бронза`;
  }
  if (tier === 'silver') return `Ещё ${need} правильных → Золото`;
  if (tier === 'bronze') return `Ещё ${need} правильных → Серебро`;
  return `${need} правильных → Бронза`;
};

// ─── AsyncStorage helpers ─────────────────────────────────────────────────────

export const loadMedalInfo = async (lessonId: number): Promise<MedalInfo> => {
  try {
    const [scoreRaw, passRaw] = await AsyncStorage.multiGet([
      `lesson${lessonId}_best_score`,
      `lesson${lessonId}_pass_count`,
    ]);
    const bestScore = parseFloat(scoreRaw[1] ?? '0') || 0;
    const passCount = parseInt(passRaw[1]   ?? '0') || 0;
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
): Promise<{ newTier: MedalTier; prevTier: MedalTier; isNewBest: boolean }> => {
  try {
    const [scoreRaw, passRaw] = await AsyncStorage.multiGet([
      `lesson${lessonId}_best_score`,
      `lesson${lessonId}_pass_count`,
    ]);
    const prevBest  = parseFloat(scoreRaw[1] ?? '0') || 0;
    const prevPass  = parseInt(passRaw[1]    ?? '0') || 0;
    const prevTier  = getMedalTier(prevBest);

    const isNewBest = currentScore > prevBest;
    const newBest   = isNewBest ? currentScore : prevBest;
    const newPass   = prevPass + 1;
    const newTier   = getMedalTier(newBest);

    // Проверяем завершённость: урок считается пройдённым если ≥45 ответов правильные
    const correct = progressArr.filter(x => x === 'correct' || x === 'replay_correct').length;
    if (correct >= 45) {
      await AsyncStorage.multiSet([
        [`lesson${lessonId}_best_score`, String(newBest)],
        [`lesson${lessonId}_pass_count`, String(newPass)],
      ]);
      invalidateMedalsCache();
    }

    return { newTier, prevTier, isNewBest };
  } catch {
    return { newTier: getMedalTier(currentScore), prevTier: 'none', isNewBest: true };
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
      const keys = Array.from({ length: to - from + 1 }, (_, i) => `lesson${from + i}_pass_count`);
      const pairs = await AsyncStorage.multiGet(keys);
      const passCounts = pairs.map(([, v]) => parseInt(v ?? '0') || 0);
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
    const newPass   = prevPass + 1;
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
  if (medalTier !== 'none') dots.push(medalTier);
  if (passCount >= 4)      dots.push('diamond');
  else if (passCount >= 3) dots.push('emerald');
  else if (passCount >= 2) dots.push('ruby');
  return dots;
};

// ─── Цвет прогресс-бара клетки в зависимости от passCount и статуса
export const getProgressCellColor = (
  status: string,
  passCount: number,
  t: { correct: string; wrong: string; accent: string; bgSurface2: string },
  isCurrentCell: boolean,
): string => {
  if (isCurrentCell) return t.accent;
  if (status === 'wrong') return t.wrong;
  if (status === 'correct' || status === 'replay_correct') {
    if (passCount >= 4) return '#4FC3F7';  // diamond blue
    if (passCount >= 3) return '#50C878';  // emerald green
    if (passCount >= 2) return '#E53935';  // ruby red
    return t.correct;                      // first pass green
  }
  return t.bgSurface2;
};
