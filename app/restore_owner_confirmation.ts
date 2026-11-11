// ═══════════════════════════════════════════════════════════════════════════
// restore_owner_confirmation.ts — «Восстановить покупки» выдаёт Plus только аккаунту-владельцу (U23).
//
// зачем (владелец 2026-11-09, контракт «подписка только на исходном аккаунте», проверка U23 от 11.11):
// после ручного «Восстановить покупки» RevenueCat может вернуть активную подписку ЛЮБОМУ аккаунту на этом
// телефоне — покупка привязана к Apple ID / Google, а не к аккаунту приложения. Телефон сам отличить
// «мою» покупку от перенесённой не может (после переноса RevenueCat называет владельцем нового).
// Знает только сервер: у него неизменяемый владелец линии оплаты. Поэтому доступ после восстановления
// записываем лишь тогда, когда сервер подтвердил, что аккаунт — владелец. Иначе доступа нет и человеку
// честно говорим, где его Plus.
//
// Стоимость: один вызов функции на РУЧНОЕ нажатие «Восстановить» (редкое действие); удачный ответ
// помнится на процесс внутри syncRevenueCatProjectionForAccount — повторное нажатие сеть не трогает.
// Префикс журнала: [RESTORE-OWNER].
// ═══════════════════════════════════════════════════════════════════════════
import { actionToastTri } from './events';
import { syncRevenueCatProjectionForAccount } from './revenuecat_projection_sync';

const LOG = '[RESTORE-OWNER]';

/**
 * confirmed     — сервер подтвердил: этот аккаунт владеет активной покупкой;
 * not_confirmed — сервер ответил, но владельцем этот аккаунт не назвал;
 * check_failed  — сервер не ответил или отказал. Отказ «покупка чужая» сервер тоже отдаёт ошибкой,
 *                 поэтому доступ не выдаём в обоих случаях: молчание сервера — не подтверждение.
 */
export type RestoreOwnerVerdict = 'confirmed' | 'not_confirmed' | 'check_failed';

export type RestoreOwnerCheck = Readonly<{ verdict: RestoreOwnerVerdict; ms: number }>;

/** Никогда не бросает: любой сбой — это «не подтверждено», с причиной в журнале. */
export async function confirmRestoreOwnerOnServer(
  stableId: string | null | undefined,
  surface: string,
): Promise<RestoreOwnerCheck> {
  const startedAt = Date.now();
  const account = String(stableId ?? '').trim();
  if (!account) {
    console.warn(`${LOG} verdict=check_failed reason=no_account surface=${surface}`); // guard-ok: ранний выход с причиной
    return { verdict: 'check_failed', ms: 0 };
  }
  console.log(`${LOG} start surface=${surface}`); // guard-ok: вход денежного пути, без идентификаторов
  try {
    const confirmed = await syncRevenueCatProjectionForAccount(account);
    const ms = Date.now() - startedAt;
    const verdict: RestoreOwnerVerdict = confirmed ? 'confirmed' : 'not_confirmed';
    console.warn(`${LOG} verdict=${verdict} serverSaidOwner=${String(confirmed)} surface=${surface} ms=${ms}`); // guard-ok: решение и значение, которое его дало
    return { verdict, ms };
  } catch (error) {
    const ms = Date.now() - startedAt;
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG} verdict=check_failed surface=${surface} ms=${ms} reason=${reason.slice(0, 160)}`); // guard-ok: catch называет причину
    return { verdict: 'check_failed', ms };
  }
}

/** Тост «Plus не подтверждён для этого аккаунта»: один текст для «чужая покупка» и «сервер не ответил» — верен в обоих случаях. */
export function restoreOwnerNotConfirmedToast() {
  return actionToastTri('error', {
    ru: 'Plus работает только на аккаунте, где его оформили. Для этого аккаунта покупка не подтверждена.',
    uk: 'Plus працює лише на акаунті, де його оформили. Для цього акаунта покупку не підтверджено.',
    en: 'Plus works only on the account it was bought on. The purchase isn’t confirmed for this account.',
    es: 'Plus solo funciona en la cuenta donde se compró. La compra no está confirmada para esta cuenta.',
    'pt-BR': 'O Plus só funciona na conta em que foi comprado. A compra não foi confirmada para esta conta.',
    vi: 'Plus chỉ hoạt động trên tài khoản đã mua. Giao dịch chưa được xác nhận cho tài khoản này.',
    id: 'Plus hanya berlaku di akun tempat pembeliannya. Pembelian belum dikonfirmasi untuk akun ini.',
    tr: 'Plus yalnızca satın alındığı hesapta çalışır. Satın alma bu hesap için doğrulanmadı.',
    pl: 'Plus działa tylko na koncie, na którym go kupiono. Zakup nie został potwierdzony dla tego konta.',
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
