/**
 * cards-2.0 (E13): XP-буст ×1.5 за perfect session (§4 мастер-плана).
 *
 * `fc_stars_v1.xpBoostUntil` ставится в stars_system.awardSessionStars при 3★
 * (E4); здесь — чистое чтение множителя для xp_manager.registerXP.
 * Буст действует только на источники раздела карточек (тренер/review) —
 * уроки/квизы/арена экономику XP не меняют.
 *
 * Модуль намеренно без импорта stars_system (тот тянет firestore/cloud):
 * только AsyncStorage-ключ + константы stars_config. Чистая
 * fcXpBoostMultiplierFromRaw — для юнит-тестов (tests/fc_xp_boost).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PERFECT_SESSION_XP_BOOST_MULT } from './stars_config';

/** Источники XP, на которые действует буст (§4: трейнер + review). */
export const FC_XP_BOOST_SOURCES = ['trainer_answer', 'review_answer'] as const;
export type FcXpBoostSource = (typeof FC_XP_BOOST_SOURCES)[number];

export function isFcXpBoostSource(source: string): source is FcXpBoostSource {
  return (FC_XP_BOOST_SOURCES as readonly string[]).includes(source);
}

/** xpBoostUntil из сырого JSON fc_stars_v1 (битое/чужое → 0). Чистая. */
export function parseXpBoostUntil(raw: string | null | undefined): number {
  if (!raw || !raw.trim()) return 0;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return 0;
    const v = p.xpBoostUntil;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/**
 * Множитель буста для источника XP: ×1.5, если буст активен и источник —
 * тренер/review; иначе 1. Чистая (raw + now инжектятся для тестов).
 */
export function fcXpBoostMultiplierFromRaw(
  raw: string | null | undefined,
  source: string,
  nowMs: number = Date.now(),
): number {
  if (!isFcXpBoostSource(source)) return 1;
  const until = parseXpBoostUntil(raw);
  return until > nowMs ? PERFECT_SESSION_XP_BOOST_MULT : 1;
}

/** Боевой путь для xp_manager: чтение fc_stars_v1 (fail-soft → 1). */
export async function getFcXpBoostMultiplier(source: string): Promise<number> {
  if (!isFcXpBoostSource(source)) return 1;
  try {
    const raw = await AsyncStorage.getItem('fc_stars_v1');
    return fcXpBoostMultiplierFromRaw(raw, source);
  } catch {
    return 1;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
