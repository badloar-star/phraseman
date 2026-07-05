// ════════════════════════════════════════════════════════════════════════════
// constellations/bots.ts — серверные человекоподобные боты (спек B4/B5).
//
// ПРАВИЛО B5: ни одно поле, доступное клиенту, не выдаёт бота. uid выглядит
// как настоящий Firestore push id, имя — из того же стиля пула, что у людей
// (scripts/gen-bot-names.mjs; здесь серверная копия среза пула — функции не
// импортируют app/*). Флаг isBot живёт ТОЛЬКО в серверном документе матча,
// закрытом правилами Firestore.
//
// Человечность: точность lerp(50%→85%) под ранг с шумом, тайминги 4–20 сек,
// изредка «пропущенный идеальный захват», стратегия расширение → добивание →
// Полярная. Всё детерминировано от переданного rand (тестируемость).
// ════════════════════════════════════════════════════════════════════════════

import type { ConstellationConfig } from './config';
import {
  legalTargets,
  type MatchState,
  type PlayerSlot,
} from './engine';
import { hexKey, neighborsInMap, parseHexKey, ringOf } from './hex';

// Серверный срез пула ников (тот же генератор, что app/constants/bot_names.ts).
const BOT_NAME_POOL: readonly string[] = [
  'ночь_nx22', 'onyx_v251', 'краб', 'фпс_rex785', 'дождь196', 'npc-нет', 'пульс897',
  'zip_owl18', 'снег_nx169', 'nx_кот332', 'печ84', 'ветер_gl', 'пинг_x584', 'prod_ok',
  'px_блин15', 'flake77', 'ночь750', 'kx_замок', 'opalx', 'wave44', 'rx_sol309',
  'fx_кот58', 'розетка246', 'град298', 'blur513', 'hx_день45', 'melon_qt39', 'lime182',
  'patch28', 'кофеёк', 'устрица62', 'mx_лис75', 'волк193', 'demo92', 'fox_рис57',
  'краб326', 'блин', 'экран11', 'юзер_pro', 'hue83', 'bruh17', 'plum347', 'утка165',
  'teal_pro63', 'баги63', 'sepia654', 'пинг903', 'ключ_fox48', 'byte89', 'фпс281',
  'cyan_ru350', 'ключ75', 'kai_nx47', 'flip_v320', 'рулон43', 'dash_ru994', 'код_oz30',
  'лук_fox63', 'чай_nx', 'rex_gl726', 'чат_qt', 'flip98', 'лифт_x', 'искра359',
  'quad56', 'rust356', 'mute418', 'mint903', 'зефир982', 'void869', 'sync14',
];

// «npc-нет» — защита от случайного попадания слова npc в пул: вырезаем на входе.
const SAFE_NAME_POOL = BOT_NAME_POOL.filter((n) => !/bot|npc|ai/i.test(n));

const PUSH_ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Верхний индекс ранга для lerp точности (Bronze I = 0 … Legend III = 23, как rankToIndex). */
const RANK_INDEX_MAX = 23;

/** Шанс «пропустить» идеальный захват при всех верных ответах (человечность). */
const SKIP_PERFECT_CHANCE = 0.3;

export interface BotProfile {
  uid: string;
  name: string;
  avatarLevel: number;
  accuracy: number;
}

function fakePushId(rand: () => number): string {
  let id = '';
  for (let i = 0; i < 20; i += 1) {
    id += PUSH_ID_ALPHABET[Math.floor(rand() * PUSH_ID_ALPHABET.length)];
  }
  return id;
}

/**
 * Синтез профилей ботов под ранг матча: точность lerp(min→max) по rankIndex
 * с шумом ±0.05 (в границах конфига), правдоподобный уровень аватара.
 */
export function synthesizeBotProfiles(
  count: number,
  rankIndex: number,
  botsCfg: ConstellationConfig['bots'],
  rand: () => number,
): BotProfile[] {
  const t = Math.min(1, Math.max(0, rankIndex / RANK_INDEX_MAX));
  const baseAccuracy = botsCfg.accuracyMin + t * (botsCfg.accuracyMax - botsCfg.accuracyMin);
  const usedNames = new Set<string>();
  const profiles: BotProfile[] = [];
  for (let i = 0; i < count; i += 1) {
    let name = SAFE_NAME_POOL[Math.floor(rand() * SAFE_NAME_POOL.length)];
    while (usedNames.has(name)) {
      name = SAFE_NAME_POOL[Math.floor(rand() * SAFE_NAME_POOL.length)];
    }
    usedNames.add(name);
    const noise = (rand() - 0.5) * 0.1;
    const accuracy = Math.min(
      botsCfg.accuracyMax,
      Math.max(botsCfg.accuracyMin, baseAccuracy + noise),
    );
    const avatarLevel = Math.max(1, Math.round(rankIndex * 4 + rand() * 12));
    profiles.push({ uid: fakePushId(rand), name, avatarLevel, accuracy });
  }
  return profiles;
}

export interface BotAnswerPlan {
  correct: boolean[];
  timesMs: number[];
  /** Идеальный захват: все верно И бот «не смазал» (шанс пропуска — человечность). */
  perfect: boolean;
}

/**
 * План ответов бота на цепочку вопросов: Bernoulli по точности, человеческие
 * тайминги с шумом. Время ответа синтезированное — показывается в live-
 * индикаторах раунда как у людей (B4).
 */
export function botAnswerPlan(
  profile: BotProfile,
  questionCount: number,
  rand: () => number,
  focusBoost: number = 0,
): BotAnswerPlan {
  // Адаптация под давление (аудит): в критический момент (защита дома, добивание)
  // бот «собирается» — точность растёт на focusBoost, как человек, который
  // старается сильнее. Кап 0.97, чтобы бот не стал идеальной машиной.
  const effAccuracy = Math.min(0.97, profile.accuracy + Math.max(0, focusBoost));
  const correct: boolean[] = [];
  const timesMs: number[] = [];
  for (let i = 0; i < questionCount; i += 1) {
    correct.push(rand() < effAccuracy);
    const spread = 4000 + rand() * 16000; // 4–20 сек
    timesMs.push(Math.round(spread));
  }
  const allCorrect = correct.every(Boolean);
  const perfect = allCorrect && rand() >= SKIP_PERFECT_CHANCE;
  return { correct, timesMs, perfect };
}

/**
 * Насколько бот «собран» в этом ходу (аудит: адаптация под угрозу). Даёт буст
 * точности, когда ставка высока: свой дом под угрозой (мало ядер) ИЛИ бот
 * добивает чужой дом. Чистая функция от состояния — детерминированно.
 */
export function botFocusBoost(state: MatchState, slot: PlayerSlot, targetKey: string | null): number {
  const me = state.players[slot];
  if (!me || me.status !== 'alive') return 0;
  // Защита: мой дом уязвим (ядер ≤1) — я собран.
  if (me.cores <= 1) return 0.15;
  // Атака ва-банк: добиваю чужой дом с последним ядром.
  if (targetKey) {
    const victim = state.players.find(
      (p) => p.status === 'alive' && p.slot !== slot && p.homeStarKey === targetKey && p.cores === 1,
    );
    if (victim) return 0.12;
  }
  return 0;
}

const POLAR_KEY = '0,0';

/**
 * Стратегия цели (B4): добить слабого соседа-дом → Полярная → расширение к
 * дорогим кольцам → случайная легальная. Иногда (10%) ходит «неоптимально» —
 * идеальные машины палятся.
 */
/** Стиль бота — определяет ЛИЧНОСТЬ поведения (разнообразие, не «все в центр»). */
export type BotStyle = 'centrist' | 'expander' | 'aggressor';

/** Детерминированный стиль по uid бота — стабилен весь матч, у ботов РАЗНЫЕ. */
export function botStyle(uid: string): BotStyle {
  const styles: BotStyle[] = ['centrist', 'expander', 'aggressor'];
  let h = 0;
  for (let i = 0; i < uid.length; i += 1) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return styles[h % styles.length];
}

export function chooseBotTarget(
  state: MatchState,
  slot: PlayerSlot,
  rand: () => number,
  style: BotStyle = 'expander',
): string | null {
  const targets = legalTargets(state, slot);
  if (targets.length === 0) return null;
  // Небольшая доля «неоптимальных» ходов, чтобы бот не был идеальной машиной.
  if (rand() < 0.05) return targets[Math.floor(rand() * targets.length)];

  // 1. Добивание: дом живого соперника с 1 ядром — берут ВСЕ стили (это выгодно).
  const finisher = targets.find((key) => state.players.some(
    (p) => p.status === 'alive' && p.slot !== slot && p.homeStarKey === key && p.cores === 1,
  ));
  if (finisher) return finisher;

  // 1b. Самозащита (аудит: боты не должны слепо атаковать под угрозой вылета).
  // Если мой дом уязвим (ядер ≤1) и рядом с ним стоит вражеская звезда —
  // приоритетно бью именно её: отодвигаю фронт от дома, а не иду за очками.
  const me = state.players[slot];
  if (me && me.status === 'alive' && me.cores <= 1) {
    const homeNeighbors = new Set(
      neighborsInMap(parseHexKey(me.homeStarKey)).map((n) => hexKey(n)),
    );
    const threat = targets.find((key) => {
      const owner = state.stars[key]?.owner;
      return homeNeighbors.has(key) && owner !== null && owner !== slot;
    });
    // 75% времени защищаемся; изредка всё же жадничаем (человечность).
    if (threat && rand() < 0.75) return threat;
  }

  // 2. Полярная — тянет ТОЛЬКО центрового сильно; расширенец/агрессор идут туда
  //    редко (разнообразие: не все рвутся в центр, жалоба владельца).
  const polarPull = style === 'centrist' ? 0.85 : style === 'aggressor' ? 0.2 : 0.15;
  if (targets.includes(POLAR_KEY) && state.stars[POLAR_KEY].owner !== slot && rand() < polarPull) {
    return POLAR_KEY;
  }

  // Лидер по числу звёзд (1.7): агрессор кусает лидера сильнее всех.
  const starCounts = new Map<PlayerSlot, number>();
  for (const star of Object.values(state.stars)) {
    if (star.owner !== null) starCounts.set(star.owner, (starCounts.get(star.owner) ?? 0) + 1);
  }
  let leaderSlot: PlayerSlot | null = null;
  let leaderCount = -1;
  for (const [s, c] of starCounts) if (c > leaderCount) { leaderCount = c; leaderSlot = s; }
  const iAmLeader = leaderSlot === slot;

  // 3. Расширение со СТИЛЕВЫМИ весами — разные боты играют по-разному:
  //   centrist  — тянется к дорогим кольцам (центр);
  //   expander  — жадный до нейтральных звёзд по краю (безопасный рост);
  //   aggressor — предпочитает чужие звёзды и ганк лидера (конфликт).
  const ringWeight = { outer: 0.4, middle: 0.8, inner: 1.2, polar: 1.6 } as const;
  const styleWeights = {
    centrist: { neutral: 2, enemy: 0.4, gank: 1, ambitionMul: 2.2 },
    expander: { neutral: 3.5, enemy: 0.3, gank: 0.8, ambitionMul: 0.7 },
    aggressor: { neutral: 1.5, enemy: 2.2, gank: 3, ambitionMul: 1 },
  }[style];
  const weighted = targets.map((key) => {
    const star = state.stars[key];
    const neutralBonus = star.owner === null ? styleWeights.neutral : 0;
    const enemyOwnedBonus = star.owner !== null && star.owner !== slot ? styleWeights.enemy : 0;
    const gankLeaderBonus = !iAmLeader && star.owner === leaderSlot ? styleWeights.gank : 0;
    const armorPenalty = star.radiance * 1.5;
    const ambition = ringWeight[ringOf(parseHexKey(key))] * styleWeights.ambitionMul;
    return {
      key,
      weight: Math.max(0.15, neutralBonus + enemyOwnedBonus + gankLeaderBonus + ambition - armorPenalty + rand() * 0.5),
    };
  });
  weighted.sort((a, b) => b.weight - a.weight);
  return weighted[0].key;
}
