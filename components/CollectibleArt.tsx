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
  /** Размеры области рендера. Картинка вписывается contain. */
  width: DimensionValue;
  height: DimensionValue;
  /** Чем рисовать букву-фолбэк, когда нет ни картинки, ни SVG. */
  fallback?: React.ReactNode;
  accessibilityLabel?: string;
}

/**
 * Арт карточки коллекции. Картинки имеют viewBox-пропорцию 1024×819 ≈ 200×160,
 * совпадающую с контейнерами карточек, поэтому contentFit="contain" не искажает.
 */
export default function CollectibleArt({
  cardId,
  svg,
  width,
  height,
  fallback = null,
  accessibilityLabel,
}: CollectibleArtProps) {
  const image = collectibleCardImage(cardId);

  if (image) {
    return (
      <Image
        source={image}
        style={{ width, height }}
        contentFit="contain"
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
