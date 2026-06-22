// Единый рендер арта карточки «Сокровищницы».
// Приоритет: сгенерированная webp-картинка (DALL-E, 1024×819) → инлайн-SVG из
// каталога → буквенный/звёздочный фолбэк. Так экран и модалки рисуют арт
// одинаково, а подключение картинок — в одном месте.
import React from 'react';
import { View, type DimensionValue } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { collectibleCardImage } from '../app/collectibles/card_images.generated';

interface CollectibleArtProps {
  /** id карточки из каталога (ключ к webp-картинке). */
  cardId: string;
  /** Инлайн-SVG из каталога — фолбэк, если картинки нет. */
  svg?: string | null;
  /** Размеры области рендера. */
  width: DimensionValue;
  height: DimensionValue;
  /**
   * Как вписывать webp-картинку. 'cover' — заполнить ячейку без полей (грид,
   * модалки), 'contain' — вписать целиком (если важны края рисунка).
   * SVG-фолбэк всегда рисуется contain (у него прозрачный фон).
   */
  contentFit?: 'cover' | 'contain';
  /** Скругление углов картинки (совпадает со скруглением контейнера-карточки). */
  borderRadius?: number;
  /** Чем рисовать букву-фолбэк, когда нет ни картинки, ни SVG. */
  fallback?: React.ReactNode;
  accessibilityLabel?: string;
}

/**
 * Арт карточки коллекции. webp-картинки имеют пропорцию 1024×819 ≈ 200×160,
 * совпадающую с контейнерами карточек, поэтому 'cover' заполняет ячейку почти
 * без обрезки и убирает зазор между картинкой и рамкой.
 */
export default function CollectibleArt({
  cardId,
  svg,
  width,
  height,
  contentFit = 'cover',
  borderRadius = 0,
  fallback = null,
  accessibilityLabel,
}: CollectibleArtProps) {
  const image = collectibleCardImage(cardId);

  if (image) {
    return (
      <Image
        source={image}
        style={{ width, height, borderRadius }}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        accessibilityLabel={accessibilityLabel}
        accessible={!!accessibilityLabel}
        transition={120}
      />
    );
  }

  if (svg) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <SvgXml xml={svg} width="100%" height="100%" />
      </View>
    );
  }

  return <>{fallback}</>;
}
