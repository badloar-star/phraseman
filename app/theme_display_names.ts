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
  en: string;
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
  // зачем (владелец 2026-10-04): «Сирень» и «Орхидея» отданы градиентным темам, старые переименованы.
  lavender: { ru: 'Туманность', uk: 'Туманність', en: 'Nebula', es: 'Nebulosa', 'pt-BR': 'Nebulosa', vi: 'Tinh vân', id: 'Nebula', tr: 'Bulutsu', pl: 'Mgławica' },
  iris: { ru: 'Комета', uk: 'Комета', en: 'Comet', es: 'Cometa', 'pt-BR': 'Cometa', vi: 'Sao chổi', id: 'Komet', tr: 'Kuyruklu yıldız', pl: 'Kometa' },
  rose: { ru: 'Рассвет', uk: 'Світанок', en: 'Dawn', es: 'Amanecer', 'pt-BR': 'Amanhecer', vi: 'Bình minh', id: 'Fajar', tr: 'Şafak', pl: 'Świt' },
  terracotta: { ru: 'Закат', uk: 'Захід сонця', en: 'Sunset', es: 'Atardecer', 'pt-BR': 'Pôr do sol', vi: 'Hoàng hôn', id: 'Senja', tr: 'Gün batımı', pl: 'Zachód słońca' },
  taupe: { ru: 'Дюна', uk: 'Дюна', en: 'Dune', es: 'Duna', 'pt-BR': 'Duna', vi: 'Đụn cát', id: 'Bukit pasir', tr: 'Kumul', pl: 'Wydma' },
  sage: { ru: 'Мята', uk: 'М’ята', en: 'Mint', es: 'Menta', 'pt-BR': 'Menta', vi: 'Bạc hà', id: 'Mint', tr: 'Nane', pl: 'Mięta' },
  eucalyptus: { ru: 'Лагуна', uk: 'Лагуна', en: 'Lagoon', es: 'Laguna', 'pt-BR': 'Lagoa', vi: 'Đầm phá', id: 'Laguna', tr: 'Lagün', pl: 'Laguna' },
  marine: { ru: 'Океан', uk: 'Океан', en: 'Ocean', es: 'Océano', 'pt-BR': 'Oceano', vi: 'Đại dương', id: 'Samudra', tr: 'Okyanus', pl: 'Ocean' },
  // зачем (владелец 2026-10-04, themes-gradient.html): 10 градиентных тем, имена — из макета.
  grad_aurora: { ru: 'Аврора', uk: 'Аврора', en: 'Aurora', es: 'Aurora', 'pt-BR': 'Aurora', vi: 'Cực quang', id: 'Aurora', tr: 'Kutup ışığı', pl: 'Zorza polarna' },
  grad_iris: { ru: 'Ирис', uk: 'Ірис', en: 'Iris', es: 'Iris', 'pt-BR': 'Íris', vi: 'Diên vĩ', id: 'Iris', tr: 'Süsen', pl: 'Irys' },
  grad_magma: { ru: 'Магма', uk: 'Магма', en: 'Magma', es: 'Magma', 'pt-BR': 'Magma', vi: 'Dung nham', id: 'Magma', tr: 'Magma', pl: 'Magma' },
  grad_midnight: { ru: 'Полночь', uk: 'Північ', en: 'Midnight', es: 'Medianoche', 'pt-BR': 'Meia-noite', vi: 'Nửa đêm', id: 'Tengah malam', tr: 'Gece yarısı', pl: 'Północ' },
  grad_champagne: { ru: 'Шампань', uk: 'Шампань', en: 'Champagne', es: 'Champán', 'pt-BR': 'Champanhe', vi: 'Sâm panh', id: 'Sampanye', tr: 'Şampanya', pl: 'Szampan' },
  grad_jade: { ru: 'Нефрит', uk: 'Нефрит', en: 'Jade', es: 'Jade', 'pt-BR': 'Jade', vi: 'Ngọc bích', id: 'Giok', tr: 'Yeşim', pl: 'Jadeit' },
  grad_orchid: { ru: 'Орхидея', uk: 'Орхідея', en: 'Orchid', es: 'Orquídea', 'pt-BR': 'Orquídea', vi: 'Hoa lan', id: 'Anggrek', tr: 'Orkide', pl: 'Orchidea' },
  grad_ice: { ru: 'Лёд', uk: 'Лід', en: 'Ice', es: 'Hielo', 'pt-BR': 'Gelo', vi: 'Băng', id: 'Es', tr: 'Buz', pl: 'Lód' },
  grad_coral: { ru: 'Коралл', uk: 'Корал', en: 'Coral', es: 'Coral', 'pt-BR': 'Coral', vi: 'San hô', id: 'Koral', tr: 'Mercan', pl: 'Koral' },
  grad_lilac: { ru: 'Сирень', uk: 'Бузок', en: 'Lilac', es: 'Lila', 'pt-BR': 'Lilás', vi: 'Tử đinh hương', id: 'Lilak', tr: 'Leylak', pl: 'Bez' },
  grad_full_olive: { ru: 'Керамика', uk: 'Кераміка', en: 'Ceramic', es: 'Cerámica', 'pt-BR': 'Cerâmica', vi: 'Ceramic', id: 'Keramik', tr: 'Seramik', pl: 'Ceramika' },
  grad_full_ref_signal_lime: { ru: 'Обсидиан', uk: 'Обсидіан', en: 'Obsidian', es: 'Obsidiana', 'pt-BR': 'Obsidiana', vi: 'Obsidian', id: 'Obsidian', tr: 'Obsidyen', pl: 'Obsydian' },
  grad_full_ref_storm_violet: { ru: 'Аметист', uk: 'Аметист', en: 'Amethyst', es: 'Amatista', 'pt-BR': 'Ametista', vi: 'Amethyst', id: 'Ametis', tr: 'Ametist', pl: 'Ametyst' },
  grad_full_titanium: { ru: 'Титан', uk: 'Титан', en: 'Titanium', es: 'Titanio', 'pt-BR': 'Titânio', vi: 'Titan', id: 'Titanium', tr: 'Titanyum', pl: 'Tytan' },
  grad_full_horizon: { ru: 'Атмосфера', uk: 'Атмосфера', en: 'Atmosphere', es: 'Atmósfera', 'pt-BR': 'Atmosfera', vi: 'Atmosphere', id: 'Atmosfer', tr: 'Atmosfer', pl: 'Atmosfera' },
  grad_full_ref_gravity_blue: { ru: 'Сингулярность', uk: 'Сингулярність', en: 'Singularity', es: 'Singularidad', 'pt-BR': 'Singularidade', vi: 'Singularity', id: 'Singularitas', tr: 'Tekillik', pl: 'Osobliwość' },
  indigo: { ru: 'Индиго', uk: 'Індиго', en: 'Indigo', es: 'Índigo', 'pt-BR': 'Índigo', vi: 'Chàm', id: 'Indigo', tr: 'İndigo', pl: 'Indygo' },
  sagePorcelain: { ru: 'Нефрит', uk: 'Нефрит', en: 'Jade', es: 'Jade', 'pt-BR': 'Jade', vi: 'Ngọc bích', id: 'Giok', tr: 'Yeşim', pl: 'Jadeit' },
  olive: { ru: 'Саванна', uk: 'Савана', en: 'Savanna', es: 'Sabana', 'pt-BR': 'Savana', vi: 'Thảo nguyên', id: 'Sabana', tr: 'Savan', pl: 'Sawanna' },
  midnight: { ru: 'Полночь', uk: 'Північ', en: 'Midnight', es: 'Medianoche', 'pt-BR': 'Meia-noite', vi: 'Nửa đêm', id: 'Tengah malam', tr: 'Gece yarısı', pl: 'Północ' },
  ember: { ru: 'Янтарь', uk: 'Бурштин', en: 'Amber', es: 'Ámbar', 'pt-BR': 'Âmbar', vi: 'Hổ phách', id: 'Amber', tr: 'Kehribar', pl: 'Bursztyn' },
  aurora: { ru: 'Сияние', uk: 'Сяйво', en: 'Aurora', es: 'Aurora', 'pt-BR': 'Aurora', vi: 'Cực quang', id: 'Aurora', tr: 'Aurora', pl: 'Zorza' },
  volt: { ru: 'Лайм', uk: 'Лайм', en: 'Lime', es: 'Lima', 'pt-BR': 'Lima', vi: 'Chanh', id: 'Lime', tr: 'Limon', pl: 'Limetka' },
  dark: { ru: 'Форест', uk: 'Форест', en: 'Forest', es: 'Forest', 'pt-BR': 'Floresta', vi: 'Rừng', id: 'Hutan', tr: 'Orman', pl: 'Las' },
  gold: { ru: 'Золото', uk: 'Золото', en: 'Gold', es: 'Oro', 'pt-BR': 'Ouro', vi: 'Vàng', id: 'Emas', tr: 'Altın', pl: 'Złoto' },
});

/** Имя темы на языке интерфейса. Пустая строка — тема неизвестна. */
export function themeDisplayName(mode: string, lang: Lang): string {
  const names = THEME_DISPLAY_NAMES[mode];
  return names ? (triLang(lang, names) ?? names.ru) : '';
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
