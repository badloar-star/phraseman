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
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}>;

export const THEME_DISPLAY_NAMES: Readonly<Record<string, ThemeDisplayName>> = Object.freeze({
  indigo: { ru: 'Индиго', uk: 'Індиго', es: 'Índigo', 'pt-BR': 'Índigo', vi: 'Chàm', id: 'Indigo', tr: 'İndigo', pl: 'Indygo' },
  sagePorcelain: { ru: 'Нефрит', uk: 'Нефрит', es: 'Jade', 'pt-BR': 'Jade', vi: 'Ngọc bích', id: 'Giok', tr: 'Yeşim', pl: 'Jadeit' },
  olive: { ru: 'Олива', uk: 'Олива', es: 'Oliva', 'pt-BR': 'Oliva', vi: 'Ô liu', id: 'Zaitun', tr: 'Zeytin', pl: 'Oliwka' },
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
  return names ? triLang(lang, names) : '';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
