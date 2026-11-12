/**
 * Пункты и тексты платного экрана по утверждённому макету «Все окна Plus» (37 окон, вариант 3; слово владельца 05.11: «макеты пейволов одобряю! внести 1 в 1»).
 * Источник макета: docs/work/mockups/paywall-contexts-2026-11-05/paywall_all_contexts.html (артефакт «Все окна Plus»).
 *
 * зачем: у каждого окна три пункта — первый свой по месту входа (русский текст дословно по макету), второй и третий общие («Курс дальше», «Больше практики»).
 * На остальных 8 языках первый пункт берёт утверждённую «первую выгоду» контекста (paywall_context_texts, 9 языков) одной строкой без пояснения: пояснения
 * переводит Переводчик (черновик не выдумываем). Чистые данные — без React и сети.
 */
import type { Lang } from '../constants/i18n';
import { paywallV3Body } from './paywall_language_add_copy';

export type PaywallV3Row = Readonly<{ title: string; detail: string }>;

/** Первый пункт по контекстам — русский дословно по макету. */
const FIRST_ROW_RU: Readonly<Record<string, readonly [string, string]>> = {
  no_energy: ['Занятия без ожидания', 'Энергия не тратится'],
  onboarding_plan: ['Весь курс целиком', 'Все 32 урока вместо первых 3'],
  course_after_lesson3: ['Урок 4 и дальше', 'Курс идёт до урока 32'],
  lesson_b1: ['Все уроки уровня B1', 'Продолжаешь с того места, где остановился'],
  flashcard_limit: ['Карточки без ограничений', 'Сохраняй сколько хочешь'],
  flashcard_training: ['Свои фразы', 'С переводом и озвучкой'],
  flashcard_create: ['Свои фразы', 'С переводом и озвучкой'],
  pack_create: ['Свой набор', 'Под поездку, работу или сериал'],
  streak: ['Серия под защитой', 'Не сгорает, если пропустишь день'],
  club: ['Занятия без дневных лимитов', 'Курс, разговоры и тренировки'],
  dialog_limit: ['Диалоги без месячного лимита', 'Все сценарии открыты'],
  dialog_locked_level: ['Все сценарии сразу', 'Не ждёшь следующего ранга'],
  dialog_analysis: ['Разбор твоей речи', 'Где звучало неестественно и как сказать живее'],
  ai_voice_input: ['Отвечай голосом', 'Микрофон прямо в поле ответа'],
  speaking: ['Говори вслух сколько нужно', 'Повторяй, пока не получится'],
  mistake_practice: ['Ошибки без лимита', 'Все из уроков и карточек в одном месте'],
  mastery: ['Повтор любого раунда', 'Без списания монет'],
  stats: ['Весь год на одном экране', 'Карта активности: 365 дней'],
  heatmap: ['Каждый день виден', 'Где была серия, а где перерыв'],
  patterns: ['Что забывается чаще всего', 'Тренировка из слабых тем'],
  percentiles: ['Ты среди других учеников', 'Серия и темп на их фоне'],
  intro_ended: ['Полный доступ возвращается', 'Курс, разговоры и статистика'],
  level_up: ['Весь курс', 'Не останавливайся на этом уровне'],
  premium_expired: ['Всё на месте', 'Серия, фразы и уроки сохранены'],
  vip_expired: ['Курс и практика снова открыты', 'Как во время бонуса'],
  notification_upsell: ['Весь курс целиком', 'Вернись и открой остальные уроки'],
  language_add: ['Языки на выбор', 'Дополнительные языки с Plus'],
  ai_explain: ['ИИ объясняет каждую ошибку', 'Что не так и как сказать верно'],
  weekly_review: ['Итог недели', 'Что укрепилось и где проседает'],
  avatar_aura: ['Аура вокруг аватара', 'Видна друзьям и в списках'],
  free_lessons_complete: ['Все 32 урока курса', 'Бесплатно — уроки 1–3'],
  winback: ['Всё открыто с первого дня', 'Начни с короткого урока'],
  referral_ended: ['Всё, чем пользовался', 'Снова открыто'],
  combined_lesson: ['Темы на выбор', 'Урок соберётся под тебя'],
  home_discount_badge: ['Та же подписка', 'Цена ниже'],
  plus_server_refused: ['Восстановить покупки', 'Если подписка уже оформлена — бесплатно'],
  generic: ['Говоришь вслух с первого дня', 'Весь курс, разговоры и тренировки'],
};

/** Контексты, где в макете нет пробного периода («без пробного периода», кнопка «Подключить Plus»). */
export const PAYWALL_V3_NO_TRIAL_CONTEXTS: ReadonlySet<string> = new Set([
  'intro_ended', 'premium_expired', 'vip_expired', 'referral_ended', 'winback', 'plus_server_refused', 'home_discount_badge',
]);

/** Три пункта окна: свой первый + общие второй и третий. firstBenefit — утверждённая «первая выгода» контекста на языке интерфейса. */
export function paywallV3Rows(context: string, lang: Lang, firstBenefit: string): ReadonlyArray<PaywallV3Row> {
  const shared = paywallV3Body(lang).benefits;
  const ru = FIRST_ROW_RU[context] ?? FIRST_ROW_RU.generic!;
  const first: PaywallV3Row = lang === 'ru'
    ? { title: ru[0], detail: ru[1] }
    : { title: firstBenefit || shared[0]!.title, detail: '' };
  return [first, shared[1]!, shared[2]!];
}

type Nine = Readonly<Record<Lang, string>>;

/** Строка в плитке без пробного периода. */
export const PAYWALL_V3_NO_TRIAL_LINE: Nine = {
  ru: 'без пробного периода', uk: 'без пробного періоду', en: 'no trial period', es: 'sin periodo de prueba', 'pt-BR': 'sem período de teste',
  vi: 'không dùng thử', id: 'tanpa masa percobaan', tr: 'deneme süresi yok', pl: 'bez okresu próbnego',
};

/** Кнопка при доступном пробном периоде (дни — в плитке). */
export const PAYWALL_V3_CTA_TRIAL: Nine = {
  ru: 'Начать бесплатно', uk: 'Почати безкоштовно', en: 'Start free', es: 'Empezar gratis', 'pt-BR': 'Começar grátis',
  vi: 'Bắt đầu miễn phí', id: 'Mulai gratis', tr: 'Ücretsiz başla', pl: 'Zacznij za darmo',
};

/** Строка про автопродление над кнопкой. */
export const PAYWALL_V3_AUTO_RENEW: Nine = {
  ru: 'Подписка продлевается автоматически. Отменить можно в настройках магазина.',
  uk: 'Підписка продовжується автоматично. Скасувати можна в налаштуваннях магазину.',
  en: 'The subscription renews automatically. You can cancel in your store settings.',
  es: 'La suscripción se renueva automáticamente. Puedes cancelarla en los ajustes de la tienda.',
  'pt-BR': 'A assinatura renova automaticamente. Você pode cancelar nas configurações da loja.',
  vi: 'Gói đăng ký tự động gia hạn. Bạn có thể hủy trong phần cài đặt của cửa hàng.',
  id: 'Langganan diperpanjang otomatis. Kamu bisa membatalkannya di pengaturan toko.',
  tr: 'Abonelik otomatik olarak yenilenir. Mağaza ayarlarından iptal edebilirsin.',
  pl: 'Subskrypcja odnawia się automatycznie. Możesz ją anulować w ustawieniach sklepu.',
};

/** Ссылка «Восстановить покупки». */
export const PAYWALL_V3_RESTORE: Nine = {
  ru: 'Восстановить покупки', uk: 'Відновити покупки', en: 'Restore purchases', es: 'Restaurar compras', 'pt-BR': 'Restaurar compras',
  vi: 'Khôi phục giao dịch mua', id: 'Pulihkan pembelian', tr: 'Satın alımları geri yükle', pl: 'Przywróć zakupy',
};

/* expo-router: служебный модуль в app/ не должен становиться экраном */
export default function __PaywallV3RowsRouteShim() { return null; }
