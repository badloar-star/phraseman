// ═══════════════════════════════════════════════════════════════════════════
// home_trial_row.ts — строка «Попробуй Plus бесплатно» в карточке «Сегодня»: когда показывать и какие тексты.
//
// зачем (владелец 29.10: «когда у юзера доступен триал подписки, вместо опроса появляется задание «Попробуй Plus бесплатно»»): строка стоит ПЕРВОЙ,
// вместо анкеты и опроса, пока триал доступен и Plus нет; опрос возвращается, когда триал недоступен, использован или Plus куплен.
// Решение — чистая функция над сигналами, которые уже есть (PremiumContext, локальный кулдаун); сеть и Firestore не трогаются.
// ═══════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../constants/i18n';

export type HomeTrialRowReason =
  | 'first_offer_day3' | 'reoffer_eligible_again'
  | 'hidden_has_plus' | 'hidden_not_eligible' | 'hidden_access_unresolved' | 'hidden_started_locally' | 'hidden_before_day3' | 'hidden_dismissed';

/** Не раньше 3-го календарного дня с первого входа (владелец 29.10: первые два дня не давим). */
export const HOME_TRIAL_ROW_FIRST_DAY = 3;
/** На сколько прячем строку после ✕, потом она возвращается, если триал всё ещё доступен (владелец может поменять). */
export const HOME_TRIAL_ROW_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export type HomeTrialRowInput = Readonly<{
  /** isPremium || isVip || isPro — любой доступ Plus. */
  hasPlus: boolean;
  trialEligible: boolean;
  /** Пока статус доступа не определён, строку не показываем: подписчик не должен увидеть её мельком. */
  accessResolved: boolean;
  /** Локально отмечен старт триала или покупки (premium_trial_eligibility) — скрываем мгновенно, не дожидаясь сервера. */
  startedLocally: boolean;
  /** Брал ли человек триал или покупку раньше (маркер premium_trial_eligibility): тогда это повторное предложение, 3-й день не ждём. */
  hadTrialBefore?: boolean;
  /** Календарный день с первого входа (1 = день регистрации); null — даты нет (старый пользователь): не считаем новым. */
  dayNumber?: number | null;
  /** Когда нажали ✕ (мс); null — не отклоняли. */
  dismissedAtMs?: number | null;
  nowMs?: number;
}>;

/** Номер календарного дня с первого входа по местному времени: день регистрации = 1. null — даты нет или она из будущего. */
export function homeTrialRowDayNumber(firstEntryMs: number | null, nowMs: number): number | null {
  if (firstEntryMs === null || !Number.isFinite(firstEntryMs) || firstEntryMs <= 0 || firstEntryMs > nowMs + 5 * 60 * 1000) return null;
  const a = new Date(firstEntryMs);
  const b = new Date(nowMs);
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

export function homeTrialRowDecision(input: HomeTrialRowInput): Readonly<{ show: boolean; reason: HomeTrialRowReason }> {
  if (input.hasPlus) return { show: false, reason: 'hidden_has_plus' };
  if (input.startedLocally) return { show: false, reason: 'hidden_started_locally' };
  if (!input.accessResolved) return { show: false, reason: 'hidden_access_unresolved' };
  if (!input.trialEligible) return { show: false, reason: 'hidden_not_eligible' };
  if (typeof input.dismissedAtMs === 'number' && typeof input.nowMs === 'number' && input.nowMs - input.dismissedAtMs < HOME_TRIAL_ROW_DISMISS_MS) return { show: false, reason: 'hidden_dismissed' };
  // зачем: решение только от текущих условий, без вечного флага «уже показывали» — повтор возвращается, когда условия снова допускают триал
  if (input.hadTrialBefore === true) return { show: true, reason: 'reoffer_eligible_again' };
  if (typeof input.dayNumber === 'number' && input.dayNumber < HOME_TRIAL_ROW_FIRST_DAY) return { show: false, reason: 'hidden_before_day3' };
  return { show: true, reason: 'first_offer_day3' };
}

/** Целое число дней триала из магазина; всё остальное (нет, 0, дробь, строка) — null и подпись без числа. */
export function homeTrialRowDays(days: unknown): number | null {
  return typeof days === 'number' && Number.isSafeInteger(days) && days > 0 && days <= 365 ? days : null;
}

export function homeTrialRowCopy(lang: Lang, days?: unknown): Readonly<{ title: string; subtitle: string }> {
  const n = homeTrialRowDays(days);
  const title = triLang(lang, {
    ru: 'Попробуй Plus бесплатно', uk: 'Спробуй Plus безкоштовно', en: 'Try Plus for free', es: 'Prueba Plus gratis', 'pt-BR': 'Experimente o Plus de graça',
    vi: 'Dùng thử Plus miễn phí', id: 'Coba Plus gratis', tr: "Plus'ı ücretsiz dene", pl: 'Wypróbuj Plus za darmo',
  });
  // зачем (макет plus-task, владелец 29.10): подпись фиксированная — «Сейчас ничего не спишем»; число дней триала в строку не выводим
  void n;
  const subtitle = triLang(lang, {
    ru: 'Сейчас ничего не спишем', uk: 'Зараз нічого не спишемо', en: 'Nothing charged today', es: 'Hoy no se cobra nada', 'pt-BR': 'Nada será cobrado agora',
    vi: 'Hôm nay không bị trừ tiền', id: 'Tidak ada tagihan sekarang', tr: 'Şimdilik ücret alınmaz', pl: 'Teraz nic nie pobieramy',
  });
  return { title, subtitle };
}

/** Подпись кнопки ✕ для доступности (озвучка экранным читателем). */
export function homeTrialRowDismissLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });
}
