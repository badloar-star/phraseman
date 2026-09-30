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

export const THEME_DISPLAY_NAMES: Readonly<Record<string, ThemeDisplayName>> = Object.freeze({
  graphite: { ru: 'Графит', uk: 'Графіт', en: 'Graphite', es: 'Grafito', 'pt-BR': 'Grafite', vi: 'Than chì', id: 'Grafit', tr: 'Grafit', pl: 'Grafit' },
  polar: { ru: 'Полярная', uk: 'Полярна', en: 'Polar', es: 'Polar', 'pt-BR': 'Polar', vi: 'Cực', id: 'Kutub', tr: 'Kutup', pl: 'Polarna' },
  slate: { ru: 'Сланец', uk: 'Сланець', en: 'Slate', es: 'Pizarra', 'pt-BR': 'Ardósia', vi: 'Đá phiến', id: 'Batu sabak', tr: 'Arduvaz', pl: 'Łupek' },
  ink: { ru: 'Чернильная', uk: 'Чорнильна', en: 'Ink', es: 'Tinta', 'pt-BR': 'Tinta', vi: 'Mực', id: 'Tinta', tr: 'Mürekkep', pl: 'Atramentowa' },
  lavender: { ru: 'Лаванда', uk: 'Лаванда', en: 'Lavender', es: 'Lavanda', 'pt-BR': 'Lavanda', vi: 'Oải hương', id: 'Lavender', tr: 'Lavanta', pl: 'Lawenda' },
  iris: { ru: 'Ирис', uk: 'Ірис', en: 'Iris', es: 'Iris', 'pt-BR': 'Íris', vi: 'Diên vĩ', id: 'Iris', tr: 'Süsen', pl: 'Irys' },
  rose: { ru: 'Пыльная роза', uk: 'Пильна троянда', en: 'Dusty Rose', es: 'Rosa empolvado', 'pt-BR': 'Rosa empoeirada', vi: 'Hồng phấn', id: 'Mawar berdebu', tr: 'Toz pembe', pl: 'Przygaszony róż' },
  terracotta: { ru: 'Мягкая терракота', uk: 'М’яка теракота', en: 'Soft Terracotta', es: 'Terracota suave', 'pt-BR': 'Terracota suave', vi: 'Đất nung dịu', id: 'Terakota lembut', tr: 'Yumuşak terracotta', pl: 'Miękka terakota' },
  taupe: { ru: 'Тауп', uk: 'Тауп', en: 'Taupe', es: 'Topo', 'pt-BR': 'Taupe', vi: 'Taupe', id: 'Taupe', tr: 'Vizon', pl: 'Taupe' },
  sage: { ru: 'Шалфей', uk: 'Шавлія', en: 'Sage', es: 'Salvia', 'pt-BR': 'Sálvia', vi: 'Xô thơm', id: 'Sage', tr: 'Adaçayı', pl: 'Szałwia' },
  eucalyptus: { ru: 'Эвкалипт', uk: 'Евкаліпт', en: 'Eucalyptus', es: 'Eucalipto', 'pt-BR': 'Eucalipto', vi: 'Bạch đàn', id: 'Eukaliptus', tr: 'Okaliptüs', pl: 'Eukaliptus' },
  marine: { ru: 'Морская', uk: 'Морська', en: 'Marine', es: 'Marina', 'pt-BR': 'Marinha', vi: 'Biển sâu', id: 'Laut', tr: 'Deniz', pl: 'Morska' },
  indigo: { ru: 'Индиго', uk: 'Індиго', es: 'Índigo', 'pt-BR': 'Índigo', vi: 'Chàm', id: 'Indigo', tr: 'İndigo', pl: 'Indygo' },
  sagePorcelain: { ru: 'Нефрит', uk: 'Нефрит', es: 'Jade', 'pt-BR': 'Jade', vi: 'Ngọc bích', id: 'Giok', tr: 'Yeşim', pl: 'Jadeit' },
  olive: { ru: 'Олива', uk: 'Олива', en: 'Olive', es: 'Oliva', 'pt-BR': 'Oliva', vi: 'Ô liu', id: 'Zaitun', tr: 'Zeytin', pl: 'Oliwka' },
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
