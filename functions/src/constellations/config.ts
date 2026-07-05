// ════════════════════════════════════════════════════════════════════════════
// constellations/config.ts — все правила-константы «Созвездий» (спек A12).
//
// ОДИН источник правды: документ admin_runtime_config/constellations. Админка
// (вкладка «Созвездия», G1) пишет оверрайды, сервер и клиент читают live.
// Дефолты ниже — точная копия решений спека specs/constellations.md; менять
// значения ТОЛЬКО через спек (контракт-тест config.test.ts закрепляет их).
//
// Парсер constellationConfigFromData никогда не бросает и портит ничего:
// битое значение игнорируется ТОЧЕЧНО, остальные оверрайды применяются.
// Правило валидации: скалярные числа — конечные и ≥ 0 (все ручки — счётчики/
// секунды/проценты); массивы чисел (дельты мест) — конечные любого знака,
// длина как у дефолта; булевы — только boolean.
// ════════════════════════════════════════════════════════════════════════════

export const CONSTELLATION_DEFAULTS = {
  // ── Раунд и фазы (A3) ──────────────────────────────────────────────────
  roundsTotal: 10,
  choosePhaseSec: 12,
  answerPhaseSec: 38,
  questionMaxSec: 15,

  // ── Дуэль «Столкновение» (A4a) ─────────────────────────────────────────
  duel: {
    targetScore: 3,
    questionSec: 10,
  },

  // ── Вопросы по кольцам (A2) ────────────────────────────────────────────
  questionsPerRing: { outer: 1, middle: 2, inner: 2, polar: 3 },
  attackQuestionsCap: 4,

  // ── Родная звезда и штурмы (A6) ────────────────────────────────────────
  homeCores: 3,
  bossAssaultQuestions: 3,

  // ── Сияние и Щит (A5/A5a) ──────────────────────────────────────────────
  shieldPerMatch: 1,
  radiance: { perfectCapture: 1, max: 2 },

  // ── Очки (A7/A7a/A8, F4) ───────────────────────────────────────────────
  scoring: {
    starPoints: { outer: 10, middle: 20, inner: 30, polar: 50 },
    polarHoldPerRound: 5,
    eliminationBonus: 40,
    constellationBonusPerRound: 2,
    constellationMinSize: 3,
    lastRoundCaptureMultiplier: 2,
  },

  // ── Звёздная пыль Полярной (A7/E5) ─────────────────────────────────────
  polarDust: { perRounds: 3, matchCap: 2, dailyCap: 4 },

  // ── Ранняя победа (A9) ─────────────────────────────────────────────────
  earlyWin: { mapSharePct: 70 },

  // ── Возрождение «Падающая звезда» (A11) ────────────────────────────────
  // minRoundsLeftToFall: падение доступно, если до конца матча БОЛЬШЕ 3
  // раундов, т.е. осталось ≥ 4 — иначе сразу экран поражения.
  rebirth: { correctToRespawn: 2, minRoundsLeftToFall: 4, maxPerMatch: 1 },

  // ── Матчмейкинг (B1–B3) ────────────────────────────────────────────────
  matchmaking: { botFillDelaySec: 30, minHumans: 1 },

  // ── Человечность ботов (B4) ────────────────────────────────────────────
  bots: { accuracyMin: 0.5, accuracyMax: 0.85, answerMsMin: 4000, answerMsMax: 20000 },

  // ── Бонус-матч «Звездопад» (C1) ────────────────────────────────────────
  starfall: {
    chancePct: 5,
    pityMatches: 25,
    perCapture: 1,
    perPolarRound: 1,
    perDuelWin: 2,
    winnerMultiplier: 1.5,
    matchCap: 12,
    dailyCap: 20,
  },

  // ── Награды и прогрессия (E1–E3, D10) ──────────────────────────────────
  rewards: {
    xpByPlace: [60, 40, 25, 15],
    // Утешительные осколки 2-3 месту (этап 1.6): без них низ таблицы не имеет
    // экономического прогресса и отваливается. 4-е — 0 (проигрыш должен ощущаться).
    shardsByPlace: [3, 1, 1, 0],
    starDeltaByPlace: [1, 0, 0, -1],
    srDeltaByPlace: [25, 10, -5, -20],
    reviewXp: 5,
  },
  newbieProtectionMatches: 5,

  // ── Ставка (C3) ────────────────────────────────────────────────────────
  wager: { winMultiplier: 3 },

  // ── Коллекционный дроп (E4) ────────────────────────────────────────────
  collectibleDropPct: 20,

  // ── Эмоуты (F10) ───────────────────────────────────────────────────────
  emotes: { perRoundCap: 2 },

  // ── Квизы (D4–D6) ──────────────────────────────────────────────────────
  quizzes: {
    cachePct: 90,
    cacheTargetPerLevel: 300,
    antiRepeatWindow: 200,
    minAnswerMs: 800,
  },

  // ── Ретеншн-пуш «месть» (E10) ──────────────────────────────────────────
  revengePush: { enabled: true, dailyCap: 1 },
};

export type ConstellationConfig = typeof CONSTELLATION_DEFAULTS;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function mergeNumberArray(def: number[], raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length !== def.length) return [...def];
  const parsed = raw.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null));
  if (parsed.some((v) => v === null)) return [...def];
  return parsed as number[];
}

function mergeSection<T extends Record<string, unknown>>(defaults: T, raw: unknown): T {
  const out: Record<string, unknown> = {};
  const source = isPlainObject(raw) ? raw : {};
  for (const key of Object.keys(defaults)) {
    const def = defaults[key];
    const value = source[key];
    if (typeof def === 'number') {
      out[key] = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : def;
    } else if (typeof def === 'boolean') {
      out[key] = typeof value === 'boolean' ? value : def;
    } else if (Array.isArray(def)) {
      out[key] = mergeNumberArray(def as number[], value);
    } else if (isPlainObject(def)) {
      out[key] = mergeSection(def as Record<string, unknown>, value);
    } else {
      out[key] = def;
    }
  }
  return out as T;
}

/**
 * Толерантный парсер сырых данных admin_runtime_config/constellations:
 * никогда не бросает, всегда возвращает СВЕЖУЮ полную копию конфига.
 */
export function constellationConfigFromData(raw: unknown): ConstellationConfig {
  return mergeSection(CONSTELLATION_DEFAULTS, raw);
}

const RUNTIME_CONFIG_COLLECTION = 'admin_runtime_config';
const RUNTIME_CONFIG_DOC = 'constellations';

/**
 * Читает конфиг из admin_runtime_config/constellations. НИКОГДА не бросает:
 * при ошибке/отсутствии — дефолты (матч обязан стартовать всегда).
 */
export async function resolveConstellationConfig(
  db: FirebaseFirestore.Firestore,
): Promise<ConstellationConfig> {
  try {
    const snap = await db.collection(RUNTIME_CONFIG_COLLECTION).doc(RUNTIME_CONFIG_DOC).get();
    return constellationConfigFromData(snap.data());
  } catch (e) {
    console.warn('resolveConstellationConfig failed, using defaults', e);
    return constellationConfigFromData(undefined);
  }
}
