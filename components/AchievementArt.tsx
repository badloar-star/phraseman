// Единый рендер арта достижения.
//
// зачем: иконки достижений переехали в Firebase Storage (−5.5 МБ из бандла), но
// пользователь не должен НИКОГДА увидеть пустое место вместо награды. Этот
// компонент — единственная точка показа арта, и он даёт гарантию тремя слоями:
//   1) арт «первых» достижений лежит в бандле (constants/achievementCoreArt.ts) —
//      рисуется мгновенно и офлайн, даже на самом первом запуске;
//   2) остальной арт стримится по URL и кэшируется на диск (memory-disk); кэш
//      прогревается в фоне при старте (app/achievement_art_prefetch.ts), поэтому
//      к моменту получения награды картинка почти всегда уже на устройстве;
//   3) если сети не было ни разу — вместо пустоты рисуется щит в цвете категории
//      с векторной иконкой. Это выглядит как осознанный дизайн, а не как поломка.
//
// Заглушка рендерится ПОД картинкой и не снимается до её загрузки, поэтому
// подмена происходит без «моргания» и без скачка вёрстки: геометрия слоёв
// совпадает с первого кадра.
import React, { useEffect, useState } from 'react';
import { View, Image as RNImage, type DimensionValue } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { achievementImageSource } from '../constants/achievementImageAssets';

const SHIELD = require('../assets/images/levels/achivement.webp');

interface AchievementArtProps {
  /** id достижения — ключ к арту (бандл или удалённый URL). */
  achievementId: string;
  /** Сторона квадратной области рендера. */
  size: number;
  /** Высота тела арта, если она отличается от size (экран достижений). */
  bodyHeight?: number;
  /** Векторная иконка для заглушки (Ionicons). */
  fallbackIconName?: string;
  /** Цвет щита-заглушки — обычно цвет категории достижения. */
  tintColor?: string;
  /** Цвет векторной иконки внутри щита. */
  iconColor?: string;
  /** Прозрачность арта (заблокированные/в процессе достижения приглушены). */
  opacity?: number;
  accessibilityLabel?: string;
  borderRadius?: number;
}

export default function AchievementArt({
  achievementId,
  size,
  bodyHeight,
  fallbackIconName = 'star',
  tintColor = '#6E6E7A',
  iconColor = '#FFFFFF',
  opacity = 1,
  accessibilityLabel,
  borderRadius = 0,
}: AchievementArtProps) {
  const source = achievementImageSource(achievementId);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Смена достижения — сбрасываем состояние, иначе новая картинка унаследует
  // «упало»/«загружено» от предыдущей (тост переиспользует один компонент).
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [achievementId]);

  const h = bodyHeight ?? size;
  const showArt = !!source && !failed;

  return (
    <View style={{ width: size, height: h, alignItems: 'center', justifyContent: 'center' }}>
      {/* Слой заглушки: виден, пока арт не загрузился или не смог загрузиться. */}
      {(!showArt || !loaded) && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', width: size, height: h, alignItems: 'center', justifyContent: 'center' }}
        >
          <RNImage
            source={SHIELD}
            style={{ width: size, height: h, tintColor, opacity: 0.82 }}
            resizeMode="contain"
            fadeDuration={0}
          />
          <Ionicons
            name={fallbackIconName as any}
            size={Math.round(size * 0.42)}
            color={iconColor}
            style={{ position: 'absolute' }}
          />
        </View>
      )}

      {showArt && (
        <ExpoImage
          source={source}
          style={{ width: size, height: h, opacity, borderRadius }}
          contentFit="contain"
          // memory-disk: первый показ требует сети, дальше арт живёт офлайн.
          cachePolicy="memory-disk"
          // Мягкое проявление поверх заглушки — подмена не «моргает».
          transition={150}
          accessibilityLabel={accessibilityLabel}
          accessible={!!accessibilityLabel}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}
