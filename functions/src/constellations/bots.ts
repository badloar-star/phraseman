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
import { parseHexKey, ringOf } from './hex';

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

/** Верхний индекс ранга для lerp точности (Bronze I → Legend III ≈ 0..11). */
const RANK_INDEX_MAX = 11;

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
): BotAnswerPlan {
  const correct: boolean[] = [];
  const timesMs: number[] = [];
  for (let i = 0; i < questionCount; i += 1) {
    correct.push(rand() < profile.accuracy);
    const spread = 4000 + rand() * 16000; // 4–20 сек
    timesMs.push(Math.round(spread));
  }
  const allCorrect = correct.every(Boolean);
  const perfect = allCorrect && rand() >= SKIP_PERFECT_CHANCE;
  return { correct, timesMs, perfect };
}

const POLAR_KEY = '0,0';

/**
 * Стратегия цели (B4): добить слабого соседа-дом → Полярная → расширение к
 * дорогим кольцам → случайная легальная. Иногда (10%) ходит «неоптимально» —
 * идеальные машины палятся.
 */
export function chooseBotTarget(
  state: MatchState,
  slot: PlayerSlot,
  rand: () => number,
): string | null {
  const targets = legalTargets(state, slot);
  if (targets.length === 0) return null;
  const suboptimal = rand() < 0.1;
  if (suboptimal) return targets[Math.floor(rand() * targets.length)];

  // 1. Добивание: дом живого соперника с 1 ядром в пределах досягаемости.
  const finisher = targets.find((key) => state.players.some(
    (p) => p.status === 'alive' && p.slot !== slot && p.homeStarKey === key && p.cores === 1,
  ));
  if (finisher) return finisher;

  // 2. Полярная звезда, если доступна и ещё не наша.
  if (targets.includes(POLAR_KEY) && state.stars[POLAR_KEY].owner !== slot) {
    if (rand() < 0.75) return POLAR_KEY;
  }

  // 3. Расширение: предпочитаем дорогие кольца и нейтральные звёзды, избегаем
  //    брони — взвешенный случайный выбор, чтобы ходы не были механическими.
  const ringWeight = { outer: 1, middle: 2, inner: 3, polar: 4 } as const;
  const weighted = targets.map((key) => {
    const star = state.stars[key];
    const base = ringWeight[ringOf(parseHexKey(key))];
    const neutralBonus = star.owner === null ? 1 : 0;
    const armorPenalty = star.radiance;
    return { key, weight: Math.max(0.2, base + neutralBonus - armorPenalty + rand() * 0.5) };
  });
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let roll = rand() * total;
  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) return w.key;
  }
  return weighted[weighted.length - 1].key;
}
