import type { V2TabBarItem } from '../components/v2/V2TabBar';
import type { PlannedTriLangCopy } from './i18n';

export type MainTabDefinition = {
  key: string;
  icon: V2TabBarItem['icon'];
  active: V2TabBarItem['activeIcon'];
  label: { ru: string; uk: string; es: string; en: string } & PlannedTriLangCopy;
  /** Свой градиент активной плашки и цвет значка на нём (только вкладка Plus). */
  capGradient?: V2TabBarItem['capGradient'];
  capInk?: V2TabBarItem['capInk'];
};

// One set of labels, icons and route identities for tab pages and their child screens.
export const MAIN_TABS: MainTabDefinition[] = [
  { key: 'home', icon: 'home-outline', active: 'home', label: {
    ru: 'Главная', uk: 'Головна', en: 'Home', es: 'Inicio', 'pt-BR': 'Início', vi: 'Trang chủ', id: 'Beranda', tr: 'Ana sayfa', pl: 'Start',
  } },
  { key: 'lessons', icon: 'book-outline', active: 'book', label: {
    ru: 'Обучение', uk: 'Навчання', en: 'Learn', es: 'Aprender', 'pt-BR': 'Aprender', vi: 'Học', id: 'Belajar', tr: 'Öğren', pl: 'Nauka',
  } },
  { key: 'video', icon: 'play-circle-outline', active: 'play-circle', label: {
    ru: 'Видео', uk: 'Відео', en: 'Videos', es: 'Videos', 'pt-BR': 'Vídeos', vi: 'Video', id: 'Video', tr: 'Videolar', pl: 'Filmy',
  } },
  { key: 'community', icon: 'people-outline', active: 'people', label: {
    ru: 'Сообщество', uk: 'Спільнота', en: 'Community', es: 'Comunidad', 'pt-BR': 'Comunidade', vi: 'Cộng đồng', id: 'Komunitas', tr: 'Topluluk', pl: 'Społeczność',
  } },
  { key: 'settings', icon: 'settings-outline', active: 'settings', label: {
    ru: 'Настройки', uk: 'Параметри', en: 'Settings', es: 'Ajustes', 'pt-BR': 'Ajustes', vi: 'Cài đặt', id: 'Setelan', tr: 'Ayarlar', pl: 'Ustawienia',
  } },
  // зачем (слово владельца 05.11): пятая иконка — Plus, ромб без подписи (подпись нужна только доступности); видна по правилу app/plus_tab_visibility.ts
  // зачем (владелец 11.11, макет plus-screens-duo-2026-11-11): активная плашка вкладки — градиент уровня Ultra, который выбран на экране по умолчанию.
  // theme-exempt: цвета — ровно DUO_TIER_COLORS.ultra / DUO_TIER_INK.ultra из пейвола «Два пути» (равенство держит tests/plus_screens_duo_2026_11_11);
  // значения продублированы, чтобы список вкладок не тянул на старте модуль пейвола.
  { key: 'plus', icon: 'diamond-outline', active: 'diamond', capGradient: ['#FF7A59', '#FF5F8F', '#FF4FD0'], capInk: '#2B0717', label: {
    ru: 'Plus', uk: 'Plus', en: 'Plus', es: 'Plus', 'pt-BR': 'Plus', vi: 'Plus', id: 'Plus', tr: 'Plus', pl: 'Plus',
  } },
];

