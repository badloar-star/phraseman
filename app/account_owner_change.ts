/**
 * Сброс модульных кэшей в памяти при смене ВЛАДЕЛЬЦА аккаунта (выход A → вход B, смена аккаунта) без перезапуска JS.
 *
 * зачем (координатор 15.10, разбор docs/phraseman-2.0/handoff/LOGOUT_WIPE_AUDIT_2026-10-15.md, 🔴 №1 к сборке 16.10): стирание
 * хранилища не трогает память модулей — медали, аналитика 365 дней, «Сегодня», серия дня, голосовой лимит, кэш статистики
 * прошлого аккаунта оставались на экранах следующего. Подписка на поколение аккаунта срабатывает на КАЖДОЙ смене фазы, поэтому
 * сбрасываем только когда stableId сменился с непустого на другой: холодный старт и фазы одного владельца кэш не трогают
 * (иначе мигал бы первый кадр — правило «каждый раздел открывается мгновенно»). Журнал: [ACC-SWITCH-WIPE] memory_reset.
 *
 * зачем (ревью Авторизации 15.10, окно A → null → B): сброс на A→null срабатывает ДО конца стирания; если модуль в этом окне
 * перечитал хранилище (там ещё данные A), кэш снова наполнялся A и доживал до B. Поэтому сбрасываем и на null→X, когда X не
 * последний непустой владелец. A→null→A второй раз не сбрасывает; холодный старт (последнего владельца ещё нет) — тоже.
 */
import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';

export function onAccountOwnerChanged(name: string, reset: () => void): void {
  let owner: string | null = null;
  let lastNonNullOwner: string | null = null;
  try {
    owner = captureAccountGeneration()?.stableId?.trim() || null;
  } catch (error: unknown) {
    // зачем: модуль зовут при загрузке десятка модулей — сбой (частичный мок в тесте, ранний старт) не должен ронять импорт.
    console.warn(`[ACC-SWITCH-WIPE] memory_reset owner_read_failed cache=${name} reason=${error instanceof Error ? error.message : String(error)}`);
  }
  lastNonNullOwner = owner;
  if (typeof subscribeAccountGeneration !== 'function') {
    console.warn(`[ACC-SWITCH-WIPE] memory_reset subscribe_unavailable cache=${name} — сброс при смене владельца не подключён`);
    return;
  }
  subscribeAccountGeneration((token) => {
    const next = token?.stableId?.trim() || null;
    if (next === owner) return;
    const previous = owner;
    const lastOwner = lastNonNullOwner;
    owner = next;
    if (next !== null) lastNonNullOwner = next;
    // previous === null: первый владелец после старта (кэш и так его) или возврат того же владельца после выхода — без сброса
    if (previous === null && (lastOwner === null || lastOwner === next)) return;
    const reason = previous === null ? 'owner_arrived_after_other' : 'owner_changed';
    try {
      reset();
      console.log(`[ACC-SWITCH-WIPE] memory_reset cache=${name} reason=${reason} to=${next ? 'other' : 'none'}`); // guard-ok: одна строка на смену владельца
    } catch (error: unknown) {
      console.warn(`[ACC-SWITCH-WIPE] memory_reset_failed cache=${name} reason=${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/* expo-router: keep this utility from being treated as a screen */
export default function __AccountOwnerChangeRouteShim() {
  return null;
}
