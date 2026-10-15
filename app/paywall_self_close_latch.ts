/**
 * Отметка «пейвол закрывает себя сам» — R58 #12 (аудит кнопок 15.10, денежный путь).
 *
 * зачем: после покупки/восстановления доступ становится Plus, и диспетчер /premium_modal переключал решение
 * show → dismiss: размонтировал пейвол ДО шага «Напомнить о конце пробного?» (шаг терялся) и закрывал маршрут
 * вторым вызовом поверх собственного закрытия пейвола (двойной dismiss мог снять экран под пейволом).
 * Когда доступ применила СОБСТВЕННАЯ покупка/восстановление этого пейвола, закрытием владеет пейвол; Plus, пришедший
 * другим путём (подарок, облако), закрывает окно как раньше. Отметка живёт до размонтирования экрана пейвола.
 */
let ownsCloseSince: number | null = null;
let ownsCloseReason: string | null = null;

export function markPaywallOwnsClose(reason: 'purchase' | 'restore'): void {
  ownsCloseSince = Date.now();
  ownsCloseReason = reason;
  console.log(`[PAYWALL-DISPATCH] owns_close set reason=${reason}`); // guard-ok: одна строка на покупку/восстановление
}

export function clearPaywallOwnsClose(reason: string): void {
  if (ownsCloseSince === null) return;
  console.log(`[PAYWALL-DISPATCH] owns_close clear reason=${reason} heldMs=${Date.now() - ownsCloseSince} by=${ownsCloseReason}`); // guard-ok: итог
  ownsCloseSince = null;
  ownsCloseReason = null;
}

export function paywallOwnsClose(): boolean {
  return ownsCloseSince !== null;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __PaywallSelfCloseLatchRouteShim() {
  return null;
}
