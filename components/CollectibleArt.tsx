// Единый рендер арта карточки «Сокровищницы».
// Приоритет: webp-картинка с сервера (Firebase Storage, грузится по URL и
// дисково кэшируется) → инлайн-SVG из каталога (офлайн-фолбэк) → буквенный/
// звёздочный фолбэк. webp больше НЕ бандлятся в приложение (−71 МБ): арт лежит
// в облаке (collectible_image_url_map.generated.ts), а при отсутствии сети или
// URL карточка показывает свой инлайн-SVG.
import React, { useState } from 'react';
import { View, type DimensionValue } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { getCollectibleImageUrl } from '../app/collectibles/collectible_image_url_map.generated';

interface CollectibleArtProps {
  /** id карточки из каталога (ключ к webp-картинке). */
  cardId: string;
  /** Инлайн-SVG из каталога — фолбэк, если картинки нет/нет сети. */
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
 * без обрезки и убирает зазор между картинкой и рамкой. Картинка стримится с
 * сервера и кэшируется на диск (expo-image cachePolicy memory-disk) — первый
 * показ требует сети, дальше работает офлайн; пока её нет — рисуется инлайн-SVG.
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
  const url = getCollectibleImageUrl(cardId);
  const [failed, setFailed] = useState(false);

  // 1) URL есть и загрузка не падала → удалённая webp (стрим + дисковый кэш).
  if (url && !failed) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width, height, borderRadius }}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        accessibilityLabel={accessibilityLabel}
        accessible={!!accessibilityLabel}
        transition={120}
        onError={() => setFailed(true)}
      />
    );
  }

  // 2) Нет URL / нет сети / ошибка загрузки → инлайн-SVG из каталога.
  if (svg) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <SvgXml xml={svg} width="100%" height="100%" />
      </View>
    );
  }

  // 3) Совсем ничего нет → буквенный фолбэк.
  return <>{fallback}</>;
}
