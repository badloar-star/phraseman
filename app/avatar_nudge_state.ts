// ─── Намёк «загляни в раздел внешнего вида» ───────────────────────────────
// зачем: владелец (2026-08-27) — «люди не открывают раздел аватара, надо
// намекнуть анимацией: нажми на меня». Намёк живёт ТОЛЬКО у того, кто ни разу
// не заходил в /avatar_select, и обязан сам замолчать, если человеку это
// неинтересно — иначе вечно дёргающаяся аватарка превращается в раздражитель.
//
// Правила владельца, зафиксированные в этом файле:
//   • зашёл в раздел один раз → намёк выключен НАВСЕГДА;
//   • не зашёл → сдаёмся после 5 сессий (SESSION_BUDGET).
//
// Firebase не участвует: оба факта локальные, на диске. Ноль чтений/записей
// Firestore — состояние ничего не стоит и не требует сети.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration } from './account_generation';
import { DebugLogger } from './debug-logger';

const STORAGE_PREFIX = 'avatar_nudge_v1';

/** Сколько сессий подряд намёк пытается достучаться, прежде чем замолчать сам. */
export const AVATAR_NUDGE_SESSION_BUDGET = 5;

// зачем: «уже заходил» обязано пережить перезапуск приложения (AsyncStorage,
// не память), но НЕ обязано переживать смену аккаунта на том же телефоне —
// новый игрок должен снова получить намёк. Тот же паттерн ключа, что у
// feature_intro_registry.ts: stableId текущего поколения аккаунта, 'anon' —
// до входа/для гостя.
function scopedKey(suffix: string): string {
  const stableId = captureAccountGeneration().stableId ?? 'anon';
  return `${STORAGE_PREFIX}::${stableId}::${suffix}`;
}

const VISITED_KEY = 'visited';
const SESSIONS_KEY = 'sessions';

export type AvatarNudgeState = Readonly<{
  /** Показывать ли намёк в этой сессии. */
  active: boolean;
  /** Номер текущей сессии среди тех, где намёк показывался (1..BUDGET). */
  session: number;
}>;

const SILENT: AvatarNudgeState = { active: false, session: 0 };

/**
 * Считает состояние намёка и, если он ещё жив, ЗАСЧИТЫВАЕТ текущую сессию.
 * Вызывать один раз за вход на Главную.
 *
 * Диск недоступен → молчим. Здесь это осознанно строже, чем в
 * feature_intro_registry (там «лучше лишний показ»): интро показывается один
 * раз и его нельзя пропустить, а намёк повторяется каждые 20 секунд — лишний
 * показ из-за сбоя диска надоедает сильнее, чем пропущенный.
 */
export async function claimAvatarNudgeSession(): Promise<AvatarNudgeState> {
  try {
    const [[, visitedRaw], [, sessionsRaw]] = await AsyncStorage.multiGet([
      scopedKey(VISITED_KEY),
      scopedKey(SESSIONS_KEY),
    ]);

    if (visitedRaw === '1') return SILENT;

    const spent = Number.parseInt(sessionsRaw ?? '0', 10);
    const safeSpent = Number.isFinite(spent) && spent > 0 ? spent : 0;
    if (safeSpent >= AVATAR_NUDGE_SESSION_BUDGET) return SILENT;

    const session = safeSpent + 1;
    await AsyncStorage.setItem(scopedKey(SESSIONS_KEY), String(session));
    return { active: true, session };
  } catch {
    return SILENT;
  }
}

/**
 * Человек открыл раздел внешнего вида — намёк больше не нужен никогда.
 * Вызывается из самого экрана /avatar_select, а не из обработчика нажатия на
 * Главной: в раздел попадают ещё и из модалок подарков за уровень, и оттуда
 * намёк тоже обязан замолчать.
 */
export async function markAvatarSectionVisited(): Promise<void> {
  try {
    await AsyncStorage.setItem(scopedKey(VISITED_KEY), '1');
  } catch (e) {
      // Не критично: в худшем случае намёк доживёт свой бюджет сессий и стихнет сам.
      DebugLogger.error('avatar_nudge_state:markAvatarSectionVisited', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/** Только для дев-витрины: вернуть намёк в исходное состояние. */
export async function resetAvatarNudgeState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([scopedKey(VISITED_KEY), scopedKey(SESSIONS_KEY)]);
  } catch (e) {
      // dev-only утилита — тихий отказ достаточен.
      DebugLogger.error('avatar_nudge_state:resetAvatarNudgeState', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}
