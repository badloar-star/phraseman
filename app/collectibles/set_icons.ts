// Маппинг «иконка сета из каталога» → имя Ionicons.
// В catalog_data у каждого сета поле icon — короткое смысловое имя (paw, fork,
// cloud…). Здесь сопоставляем его реальному имени из набора Ionicons, чтобы
// экран коллекции мог нарисовать иконку рядом с названием сета.
import type React from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Все 30 значений icon из catalog_data → ближайшая иконка Ionicons.
const SET_ICON_MAP: Record<string, IoniconName> = {
  paw: 'paw',
  fork: 'restaurant',
  cloud: 'cloud',
  coin: 'cash',
  fire: 'flame',
  clock: 'time',
  hand: 'hand-left',
  plane: 'airplane',
  briefcase: 'briefcase',
  home: 'home',
  heart: 'heart',
  trophy: 'trophy',
  note: 'musical-notes',
  book: 'book',
  palette: 'color-palette',
  shirt: 'shirt',
  wave: 'water',
  star: 'star',
  leaf: 'leaf',
  building: 'business',
  moon: 'moon',
  clover: 'leaf',
  scale: 'scale',
  shield: 'shield',
  bulb: 'bulb',
  chat: 'chatbubbles',
  people: 'people',
  gift: 'gift',
  hearts: 'heart-circle',
  flag: 'flag',
};

const FALLBACK_ICON: IoniconName = 'albums';

/** Имя иконки Ionicons для сета (или нейтральный фолбэк, если ключ незнаком). */
export function ioniconForSetIcon(icon: string): IoniconName {
  return SET_ICON_MAP[icon] ?? FALLBACK_ICON;
}
