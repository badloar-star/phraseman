/**
 * Раскрытие условий подписки на языке человека (требование App Store / Google Play: цена, период, автопродление и отмена
 * показываются до оформления — и на языке интерфейса).
 *
 * зачем (координатор 12.10): buildSubscriptionDisclosureRu в paywall_trial_info.ts отдаёт только русский — англо- и украиноязычный
 * человек видел условия подписки по-русски. Здесь все 9 языков интерфейса; для русского текст совпадает с прежним байт в байт
 * (проверяет tests/paywall_subscription_disclosure.test.ts). Цену форматирует магазин и передаёт готовой строкой.
 */
import type { Lang } from '../constants/i18n';
import { onboardingDaysWord, onboardingLangKey, type OnboardingLangKey } from '../components/onboarding/clean_onboarding_dates';

export type SubscriptionDisclosurePeriod = 'year' | 'month';

type Copy = Readonly<{
  /** «3 дня бесплатно, затем {price} в {period}.» */
  withTrial: (days: string, price: string, period: string) => string;
  /** «{price} в {period}.» */
  noTrial: (price: string, period: string) => string;
  periodYear: string;
  periodMonth: string;
  renewal: string;
}>;

const COPY: Readonly<Record<OnboardingLangKey, Copy>> = {
  ru: {
    withTrial: (days, price, period) => `${days} бесплатно, затем ${price} в ${period}.`,
    noTrial: (price, period) => `${price} в ${period}.`,
    periodYear: 'год',
    periodMonth: 'месяц',
    renewal: 'Подписка продлевается автоматически. Отменить можно в настройках магазина.',
  },
  uk: {
    withTrial: (days, price, period) => `${days} безкоштовно, потім ${price} на ${period}.`,
    noTrial: (price, period) => `${price} на ${period}.`,
    periodYear: 'рік',
    periodMonth: 'місяць',
    renewal: 'Підписка продовжується автоматично. Скасувати можна в налаштуваннях магазину.',
  },
  en: {
    withTrial: (days, price, period) => `${days} free, then ${price} per ${period}.`,
    noTrial: (price, period) => `${price} per ${period}.`,
    periodYear: 'year',
    periodMonth: 'month',
    renewal: 'The subscription renews automatically. You can cancel in your store settings.',
  },
  es: {
    withTrial: (days, price, period) => `${days} gratis, luego ${price} al ${period}.`,
    noTrial: (price, period) => `${price} al ${period}.`,
    periodYear: 'año',
    periodMonth: 'mes',
    renewal: 'La suscripción se renueva automáticamente. Puedes cancelarla en los ajustes de la tienda.',
  },
  'pt-BR': {
    withTrial: (days, price, period) => `${days} grátis, depois ${price} por ${period}.`,
    noTrial: (price, period) => `${price} por ${period}.`,
    periodYear: 'ano',
    periodMonth: 'mês',
    renewal: 'A assinatura é renovada automaticamente. Você pode cancelar nas configurações da loja.',
  },
  vi: {
    withTrial: (days, price, period) => `Miễn phí ${days}, sau đó ${price} mỗi ${period}.`,
    noTrial: (price, period) => `${price} mỗi ${period}.`,
    periodYear: 'năm',
    periodMonth: 'tháng',
    renewal: 'Gói đăng ký tự động gia hạn. Bạn có thể hủy trong phần cài đặt của cửa hàng.',
  },
  id: {
    withTrial: (days, price, period) => `Gratis ${days}, lalu ${price} per ${period}.`,
    noTrial: (price, period) => `${price} per ${period}.`,
    periodYear: 'tahun',
    periodMonth: 'bulan',
    renewal: 'Langganan diperpanjang otomatis. Kamu bisa membatalkannya di pengaturan toko.',
  },
  tr: {
    withTrial: (days, price, period) => `${days} ücretsiz, sonra ${period} ${price}.`,
    noTrial: (price, period) => `${period} ${price}.`,
    periodYear: 'yıllık',
    periodMonth: 'aylık',
    renewal: 'Abonelik otomatik olarak yenilenir. Mağaza ayarlarından iptal edebilirsin.',
  },
  pl: {
    withTrial: (days, price, period) => `${days} za darmo, potem ${price} ${period}.`,
    noTrial: (price, period) => `${price} ${period}.`,
    periodYear: 'rocznie',
    periodMonth: 'miesięcznie',
    renewal: 'Subskrypcja odnawia się automatycznie. Możesz ją anulować w ustawieniach sklepu.',
  },
};

export function buildSubscriptionDisclosure(
  lang: Lang | string,
  {
    trialDays,
    price,
    period,
  }: {
    trialDays: number | null;
    price: string;
    period: SubscriptionDisclosurePeriod;
  },
): string {
  const key = onboardingLangKey(lang);
  const copy = COPY[key];
  const periodWord = period === 'year' ? copy.periodYear : copy.periodMonth;
  const head = trialDays
    ? copy.withTrial(`${trialDays} ${onboardingDaysWord(trialDays, key)}`, price, periodWord)
    : copy.noTrial(price, periodWord);
  return `${head} ${copy.renewal}`;
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
