/**
 * Сброс модульных кэшей в памяти при смене ВЛАДЕЛЬЦА аккаунта (выход A → вход B, смена аккаунта) без перезапуска JS.
 *
 * зачем (координатор 15.10, разбор docs/phraseman-2.0/handoff/LOGOUT_WIPE_AUDIT_2026-10-15.md, 🔴 №1 к сборке 16.10): стирание
 * хранилища не трогает память модулей — медали, аналитика 365 дней, «Сегодня», серия дня, голосовой лимит, кэш статистики
 * прошлого аккаунта оставались на экранах следующего. Подписка на поколение аккаунта срабатывает на КАЖДОЙ смене фазы, поэтому
 * сбрасываем только когда stableId сменился с непустого на другой: холодный старт и фазы одного владельца кэш не трогают
 * (иначе мигал бы первый кадр — правило «каждый раздел открывается мгновенно»). Журнал: [ACC-SWITCH-WIPE] memory_reset.
 */
import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';

export function onAccountOwnerChanged(name: string, reset: () => void): void {
  let owner: string | null = null;
  try {
    owner = captureAccountGeneration()?.stableId?.trim() || null;
  } catch (error: unknown) {
    // зачем: модуль зовут при загрузке десятка модулей — сбой (частичный мок в тесте, ранний старт) не должен ронять импорт.
    console.warn(`[ACC-SWITCH-WIPE] memory_reset owner_read_failed cache=${name} reason=${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof subscribeAccountGeneration !== 'function') {
    console.warn(`[ACC-SWITCH-WIPE] memory_reset subscribe_unavailable cache=${name} — сброс при смене владельца не подключён`);
    return;
  }
  subscribeAccountGeneration((token) => {
    const next = token?.stableId?.trim() || null;
    if (next === owner) return;
    const previous = owner;
    owner = next;
    if (previous === null) return; // первый владелец после старта — кэш и так его
    try {
      reset();
      console.log(`[ACC-SWITCH-WIPE] memory_reset cache=${name} reason=owner_changed to=${next ? 'other' : 'none'}`); // guard-ok: одна строка на смену владельца
    } catch (error: unknown) {
      console.warn(`[ACC-SWITCH-WIPE] memory_reset_failed cache=${name} reason=${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/* expo-router: keep this utility from being treated as a screen */
export default function __AccountOwnerChangeRouteShim() {
  return null;
}
