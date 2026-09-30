// ═══════════════════════════════════════════════════════════════════════════
// theme_display_names.ts — названия тем оформления на всех языках интерфейса.
//
// зачем (владелец 2026-08-26): с добавлением темы в награды спина имя темы
// понадобилось ВТОРОМУ месту — карточке подарка. Раньше словарь жил внутри
// экрана настроек (`settings_themes.tsx`), и подарочная система не могла его
// взять: импорт экрана тянет за собой ThemeContext, палитры и превью — лишний
// вес в бандле плюс риск цикла импортов.
//
// Модуль намеренно пустой по зависимостям (только типы i18n), поэтому его
// дёшево импортировать откуда угодно. Копий словаря быть не должно: копии
// названий тем уже разъезжались в других местах приложения.
// ═══════════════════════════════════════════════════════════════════════════

import { triLang, type Lang } from '../constants/i18n';

export type ThemeDisplayName = Readonly<{
  ru: string;
  uk: string;
  en?: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}>;

// зачем (владелец 2026-09-30, темы 2.0): имена 13 тем — набор «Небо и природа»
// (старые «Графит/Сланец/…» отменены). Ключи прежние, чтобы выбор пользователей не слетел.
export const THEME_DISPLAY_NAMES: Readonly<Record<string, ThemeDisplayName>> = Object.freeze({
  graphite: { ru: 'Затмение', uk: 'Затемнення', en: 'Eclipse', es: 'Eclipse', 'pt-BR': 'Eclipse', vi: 'Nhật thực', id: 'Gerhana', tr: 'Tutulma', pl: 'Zaćmienie' },
  polar: { ru: 'Иней', uk: 'Іній', en: 'Frost', es: 'Escarcha', 'pt-BR': 'Geada', vi: 'Sương giá', id: 'Embun beku', tr: 'Kırağı', pl: 'Szron' },
  slate: { ru: 'Шторм', uk: 'Шторм', en: 'Storm', es: 'Tormenta', 'pt-BR': 'Tempestade', vi: 'Bão', id: 'Badai', tr: 'Fırtına', pl: 'Burza' },
  ink: { ru: 'Сумерки', uk: 'Сутінки', en: 'Twilight', es: 'Crepúsculo', 'pt-BR': 'Crepúsculo', vi: 'Chạng vạng', id: 'Temaram', tr: 'Alacakaranlık', pl: 'Zmierzch' },
  lavender: { ru: 'Сирень', uk: 'Бузок', en: 'Lilac', es: 'Lila', 'pt-BR': 'Lilás', vi: 'Tử đinh hương', id: 'Lilak', tr: 'Leylak', pl: 'Bez' },
  iris: { ru: 'Орхидея', uk: 'Орхідея', en: 'Orchid', es: 'Orquídea', 'pt-BR': 'Orquídea', vi: 'Hoa lan', id: 'Anggrek', tr: 'Orkide', pl: 'Orchidea' },
  rose: { ru: 'Рассвет', uk: 'Світанок', en: 'Dawn', es: 'Amanecer', 'pt-BR': 'Amanhecer', vi: 'Bình minh', id: 'Fajar', tr: 'Şafak', pl: 'Świt' },
  terracotta: { ru: 'Закат', uk: 'Захід сонця', en: 'Sunset', es: 'Atardecer', 'pt-BR': 'Pôr do sol', vi: 'Hoàng hôn', id: 'Senja', tr: 'Gün batımı', pl: 'Zachód słońca' },
  taupe: { ru: 'Дюна', uk: 'Дюна', en: 'Dune', es: 'Duna', 'pt-BR': 'Duna', vi: 'Đụn cát', id: 'Bukit pasir', tr: 'Kumul', pl: 'Wydma' },
  sage: { ru: 'Мята', uk: 'М’ята', en: 'Mint', es: 'Menta', 'pt-BR': 'Menta', vi: 'Bạc hà', id: 'Mint', tr: 'Nane', pl: 'Mięta' },
  eucalyptus: { ru: 'Лагуна', uk: 'Лагуна', en: 'Lagoon', es: 'Laguna', 'pt-BR': 'Lagoa', vi: 'Đầm phá', id: 'Laguna', tr: 'Lagün', pl: 'Laguna' },
  marine: { ru: 'Океан', uk: 'Океан', en: 'Ocean', es: 'Océano', 'pt-BR': 'Oceano', vi: 'Đại dương', id: 'Samudra', tr: 'Okyanus', pl: 'Ocean' },
  indigo: { ru: 'Индиго', uk: 'Індиго', es: 'Índigo', 'pt-BR': 'Índigo', vi: 'Chàm', id: 'Indigo', tr: 'İndigo', pl: 'Indygo' },
  sagePorcelain: { ru: 'Нефрит', uk: 'Нефрит', es: 'Jade', 'pt-BR': 'Jade', vi: 'Ngọc bích', id: 'Giok', tr: 'Yeşim', pl: 'Jadeit' },
  olive: { ru: 'Саванна', uk: 'Савана', en: 'Savanna', es: 'Sabana', 'pt-BR': 'Savana', vi: 'Thảo nguyên', id: 'Sabana', tr: 'Savan', pl: 'Sawanna' },
  midnight: { ru: 'Полночь', uk: 'Північ', es: 'Medianoche', 'pt-BR': 'Meia-noite', vi: 'Nửa đêm', id: 'Tengah malam', tr: 'Gece yarısı', pl: 'Północ' },
  ember: { ru: 'Янтарь', uk: 'Бурштин', es: 'Ámbar', 'pt-BR': 'Âmbar', vi: 'Hổ phách', id: 'Amber', tr: 'Kehribar', pl: 'Bursztyn' },
  aurora: { ru: 'Сияние', uk: 'Сяйво', es: 'Aurora', 'pt-BR': 'Aurora', vi: 'Cực quang', id: 'Aurora', tr: 'Aurora', pl: 'Zorza' },
  volt: { ru: 'Лайм', uk: 'Лайм', es: 'Lima', 'pt-BR': 'Lima', vi: 'Chanh', id: 'Lime', tr: 'Limon', pl: 'Limetka' },
  dark: { ru: 'Форест', uk: 'Форест', es: 'Forest', 'pt-BR': 'Floresta', vi: 'Rừng', id: 'Hutan', tr: 'Orman', pl: 'Las' },
  gold: { ru: 'Золото', uk: 'Золото', es: 'Oro', 'pt-BR': 'Ouro', vi: 'Vàng', id: 'Emas', tr: 'Altın', pl: 'Złoto' },
});

/** Имя темы на языке интерфейса. Пустая строка — тема неизвестна. */
export function themeDisplayName(mode: string, lang: Lang): string {
  const names = THEME_DISPLAY_NAMES[mode];
  return names ? (triLang(lang, names) ?? names.ru) : '';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
