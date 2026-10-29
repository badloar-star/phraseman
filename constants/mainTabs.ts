import type { V2TabBarItem } from '../components/v2/V2TabBar';
import type { PlannedTriLangCopy } from './i18n';

export type MainTabDefinition = {
  key: string;
  icon: V2TabBarItem['icon'];
  active: V2TabBarItem['activeIcon'];
  label: { ru: string; uk: string; es: string; en: string } & PlannedTriLangCopy;
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
];

