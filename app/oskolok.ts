import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';
import { PEARL_ICONS } from './coin_icons';

/**
 * Иконка валюты по количеству. Валюта в приложении одна — ЖЕМЧУГ.
 *
 * зачем (2026-07-26, владелец): текст везде уже говорил «жемчужин», а рисовались
 * синие кристаллы-осколки из assets/images/shards/** — старая валюта. Вместо правки
 * 61 вызова в 23 экранах меняем ОДИН источник здесь: все функции ниже сохранены
 * с прежними именами и сигнатурами, поэтому вызывающий код не трогаем.
 *
 * Ярусы по количеству (single/80/180/420) больше не нужны: жемчужина — единый
 * предмет, а не «кучка», её размер не зависит от суммы. Число рядом с иконкой —
 * всегда главный индикатор (см. app/coin_icons.ts).
 *
 * Доступность: VoiceOver/TalkBack-текст обязателен («Баланс: 42 жемчужины»),
 * на картинку не полагаемся.
 */
type OskolokThemeMode = ThemeMode;

/** Все жемчужные спрайты — для прогрева кэша изображений на старте. */
export const OSKOLOK_IMAGE_SOURCES: readonly ImageSourcePropType[] = Object.values(PEARL_ICONS);

let currentOskolokThemeMode: OskolokThemeMode = 'indigo';

export function setOskolokThemeMode(themeMode: OskolokThemeMode): void {
  currentOskolokThemeMode = themeMode;
}

function pearlForTheme(themeMode: OskolokThemeMode): ImageSourcePropType {
  return PEARL_ICONS[themeMode] ?? PEARL_ICONS.indigo;
}

/**
 * Иконка валюты для любого количества. Сигнатура сохранена ради 60+ вызовов;
 * аргумент `shards` теперь на картинку не влияет — жемчужина одна и та же.
 */
export function oskolokImageForPackShards(_shards: number, themeMode: OskolokThemeMode = currentOskolokThemeMode): ImageSourcePropType {
  return pearlForTheme(themeMode);
}

/** Иконка строки IAP-пакета в магазине. */
export function oskolokImageForShardIapRow(_pack: { id: string; shards: number }, themeMode: OskolokThemeMode = currentOskolokThemeMode): ImageSourcePropType {
  return pearlForTheme(themeMode);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
