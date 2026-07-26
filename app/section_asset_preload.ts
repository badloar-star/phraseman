import { Image as RNImage, type ImageSourcePropType } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Asset } from 'expo-asset';
import type { ThemeMode } from '../constants/theme';
import { getHomeMenuImages } from './home_menu_icons';
import { FLASHCARDS_MODE_ICON_ASSETS } from './flashcards/FlashcardsCategoryHub';

/**
 * Предзагрузка ассетов РАЗДЕЛОВ (не главной).
 *
 * зачем: владелец: «открываю раздел — он чуть подпрыгивает, как будто ассеты
 * прогружаются и занимают чуть больше места; хочу как в Bevel — открыл и статично».
 * Иконки разделов (home_menu_icons — 10 на тему) и плитки хаба карточек
 * (FLASHCARDS_MODE_ICON_ASSETS — 6 на тему) НЕ входили в app/image_preload.ts, который
 * грел только клубы/медали/подарки/осколки. Поэтому при первом заходе в раздел
 * декодирование картинки происходило уже во время показа экрана — первый кадр рисовался
 * без неё, второй с ней, и это читалось как «подпрыгнуло».
 *
 * Греем ТОЛЬКО активную тему: 12 тем × 16 иконок = 192 файла, гнать всё — бессмысленный
 * трафик и память. При смене темы вызываем повторно (см. вызов в app/_layout.tsx).
 *
 * Вызывается ПОСЛЕ первого кадра главной, в фоне: пользователь уже видит главную, а к
 * моменту тапа по разделу картинки лежат в памяти expo-image и в кэше RN.
 */

/** Уже прогретые темы — повторный вызов на той же теме не делает работу дважды. */
const warmedThemes = new Set<ThemeMode>();

function sectionAssetsForTheme(themeMode: ThemeMode): ImageSourcePropType[] {
  const menu = getHomeMenuImages(themeMode);
  const hub = FLASHCARDS_MODE_ICON_ASSETS[themeMode];
  return [
    // Разделы с главной: уроки, карточки, вызовы дня, лига, тест, практика, диалоги,
    // экзамен, магазин, карта героя.
    menu.lesson, menu.cards, menu.dayTasks, menu.league, menu.test,
    menu.practice, menu.dialogs, menu.exam, menu.shop, menu.heroMap,
    // Плитки внутри раздела «Карточки».
    ...(hub ? [hub.saved, hub.custom, hub.training, hub.audio, hub.arena, hub.collection] : []),
  ];
}

/**
 * Прогревает и декодер expo-image (им рисуются плитки хаба), и RN-реестр ассетов
 * (LightSketchMenuImage на главной). Обе стороны нужны: они держат независимые кэши.
 */
async function warmSectionSources(sources: readonly ImageSourcePropType[]): Promise<void> {
  const unique = Array.from(new Set(sources));
  const expoUris: string[] = [];
  for (const source of unique) {
    try {
      const resolved = RNImage.resolveAssetSource(source);
      if (resolved?.uri) expoUris.push(resolved.uri);
    } catch {
      // Сбой одного ассета не должен ломать прогрев остальных.
    }
  }
  await Promise.all([
    Asset.loadAsync(unique as never).catch(() => []),
    expoUris.length > 0
      ? ExpoImage.prefetch(expoUris, { cachePolicy: 'memory-disk' }).catch(() => false)
      : Promise.resolve(false),
  ]);
}

/** Греет ассеты разделов для активной темы. Идемпотентно в рамках сессии. */
export async function preloadSectionAssets(themeMode: ThemeMode): Promise<void> {
  if (warmedThemes.has(themeMode)) return;
  // Помечаем ДО await: два параллельных вызова (смена темы + фокус) не должны
  // запускать один и тот же прогрев дважды.
  warmedThemes.add(themeMode);
  try {
    await warmSectionSources(sectionAssetsForTheme(themeMode));
  } catch {
    // Прогрев — best-effort ускорение первого кадра раздела, не источник правды.
    warmedThemes.delete(themeMode);
  }
}

export function resetSectionAssetPreloadForTests(): void {
  warmedThemes.clear();
}

export default function __RouteShim() { return null; }
