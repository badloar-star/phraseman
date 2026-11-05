// зачем (слово владельца ~19:40 05.11, вариант Б; правила App Store 3.1.2 / Google Play): под кнопкой вкладки Plus — строка автопродления выбранного плана.
// Подпись макета «Цена и пробный период — из магазина. Отмена в любой момент.» остаётся как есть, эта строка идёт ПОД ней. 9 языков приложения.
import type { Lang } from '../../constants/i18n';

type Nine = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>;

export const PLUS_TAB_RENEWS_YEAR: Nine = {
  ru: 'Продлевается автоматически каждый год.', uk: 'Подовжується автоматично щороку.', en: 'Renews automatically every year.',
  es: 'Se renueva automáticamente cada año.', 'pt-BR': 'Renova automaticamente todo ano.', vi: 'Tự động gia hạn mỗi năm.',
  id: 'Diperpanjang otomatis setiap tahun.', tr: 'Her yıl otomatik olarak yenilenir.', pl: 'Odnawia się automatycznie co rok.',
};

export const PLUS_TAB_RENEWS_MONTH: Nine = {
  ru: 'Продлевается автоматически каждый месяц.', uk: 'Подовжується автоматично щомісяця.', en: 'Renews automatically every month.',
  es: 'Se renueva automáticamente cada mes.', 'pt-BR': 'Renova automaticamente todo mês.', vi: 'Tự động gia hạn mỗi tháng.',
  id: 'Diperpanjang otomatis setiap bulan.', tr: 'Her ay otomatik olarak yenilenir.', pl: 'Odnawia się automatycznie co miesiąc.',
};

/** Строка автопродления выбранного плана: год (Ultra) или месяц (Plus); незнакомый язык — английский. */
export function plusTabRenewsLine(lang: Lang | string, plan: string): string {
  const table = plan === 'yearly' ? PLUS_TAB_RENEWS_YEAR : PLUS_TAB_RENEWS_MONTH;
  return (table as Readonly<Record<string, string>>)[lang] ?? table.en;
}
