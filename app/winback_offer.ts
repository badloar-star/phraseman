/**
 * winback_offer.ts — возврат «спящих» пользователей (план #7).
 *
 * Education: 22% конверсий отложены на Day 1–31+ (RevenueCat SOSA 2026), поэтому
 * ретаргет вернувшихся особенно важен. Показываем winback-оффер (скидка через
 * отдельный RevenueCat offering) только тем, кто:
 *   - не premium;
 *   - отсутствовал WINBACK_INACTIVITY_MS+;
 *   - ещё не видел winback в этом окне неактивности.
 *
 * Скидка обесценивает цену, если давать всем → строго точечно по неактивности.
 * Гейт чистый: статус premium передаётся аргументом.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { IS_STORE_RELEASE } from './config';

const LAST_ACTIVE_KEY = 'winback_last_active_at_v1';
const WINBACK_SHOWN_AT_KEY = 'winback_shown_at_v1';

/** 7 дней неактивности до показа winback. */
export const WINBACK_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

// зачем (координатор 14.10, [WINBACK-FREEZE]): dev-ссылка с replace на пейвол обходит настоящий путь (гейт по дням отсутствия →
// push из _layout). Подмена «не заходил N дней» позволяет Сверке пройти НАСТОЯЩИЙ путь без ожидания недели. Только память dev-сборки,
// в стор-сборке установка отклоняется; «уже показывали» при подмене не учитывается, чтобы повторять способы закрытия.
let devAwayDaysOverride: number | null = null;

function devWinbackAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** DEV: подменить «дней без активности» для гейта winback (null — снять). Возвращает true, если применено. */
export function setDevWinbackAwayDays(days: number | null): boolean {
  if (!devWinbackAvailable()) {
    console.warn('[DEV-STATE] winbackaway: отклонено — не dev-сборка', { days }); // guard-ok: ранний выход логируется
    return false;
  }
  devAwayDaysOverride = days !== null && Number.isFinite(days) && days > 0 ? days : null;
  console.log(`[DEV-STATE] winbackaway=${devAwayDaysOverride ?? 'off'} (гейт winback считает, что человек не заходил столько дней; только память; сверни и разверни приложение — проверка на возврате)`); // guard-ok: единичный лог на ссылку
  return true;
}

export interface ShouldShowWinbackParams {
  isPremium: boolean;
  nowMs: number;
}

/** Фиксирует время последней активности (звать на app foreground). */
export async function recordLastActive(nowMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(nowMs));
  } catch (e) {
      // no-op
      DebugLogger.error('winback_offer:recordLastActive', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export async function shouldShowWinback({ isPremium, nowMs }: ShouldShowWinbackParams): Promise<boolean> {
  if (isPremium) {
    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} gate no reason=premium`); // guard-ok: ранний выход называет причину
    return false;
  }
  try {
    const [[, lastRaw], [, shownRaw]] = await AsyncStorage.multiGet([
      LAST_ACTIVE_KEY,
      WINBACK_SHOWN_AT_KEY,
    ]);
    const devAway = devWinbackAvailable() ? devAwayDaysOverride : null;
    const last = devAway !== null ? nowMs - devAway * 86_400_000 : (parseInt(lastRaw ?? '0', 10) || 0);
    if (devAway !== null) console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} gate dev_override awayDays=${devAway} (хранилище: last=${lastRaw ?? 'none'} shown=${shownRaw ?? 'none'})`); // guard-ok: dev-подмена логируется
    if (!last) {
      console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} gate no reason=no_last_active`); // guard-ok: ранний выход называет причину
      return false; // нет данных об активности — не навязываемся
    }
    const awayDays = Math.round(((nowMs - last) / 86_400_000) * 10) / 10;
    if (nowMs - last < WINBACK_INACTIVITY_MS) {
      console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} gate no reason=recent awayDays=${awayDays}`); // guard-ok: ранний выход называет причину
      return false;
    }

    // не показывать дважды в одном окне: если winback показывали ПОСЛЕ последней активности — стоп
    const shown = devAway !== null ? 0 : (parseInt(shownRaw ?? '0', 10) || 0);
    if (shown > last) {
      console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} gate no reason=already_shown awayDays=${awayDays}`); // guard-ok: ранний выход называет причину
      return false;
    }

    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} gate YES awayDays=${awayDays} shownAt=${shown || 'never'}`); // guard-ok: решение показа
    return true;
  } catch (error) {
    // зачем (правило владельца: немой catch запрещён): причина отказа видна в журнале.
    console.warn(`[WINBACK-FREEZE] t=${Date.now() % 100000} gate no reason=storage_error ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch логирует причину
    return false;
  }
}

export async function markWinbackShown(nowMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(WINBACK_SHOWN_AT_KEY, String(nowMs));
  } catch (e) {
      // no-op
      DebugLogger.error('winback_offer:markWinbackShown', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}
