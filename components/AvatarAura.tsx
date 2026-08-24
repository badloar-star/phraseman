import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, View, type ViewStyle } from 'react-native';
import { getAvatarAuraById } from '../constants/avatar_auras';
import { getApprovedAvatarAuraAsset } from '../app/avatar_aura_assets';
import { getSeasonAuraAssetForAvatarId } from '../app/season_pass_track_config';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LinearGradient as ExpoLinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import SeasonAuraRing from './SeasonAuraRing';

type Props = {
  auraId?: string | null;
  size: number;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Disable the loop for small avatars mounted in scrollable lists. */
  animate?: boolean;
  ownerActive?: boolean;
};

// Owner-approved midpoint between the too-small 1.92x and too-large 2.63x.
// Season Pass layers retain their established compact scale.
const APPROVED_AURA_RING_SCALE = 2.28;
const SEASON_AURA_RING_SCALE = 1.40;
const SEASON_AURA_LAYOUT_GUTTER = 12;

function AvatarAura({ auraId, size, children, style, animate = true, ownerActive }: Props) {
  const aura = getAvatarAuraById(auraId);
  const { themeMode } = useTheme();
  const approvedAsset = getApprovedAvatarAuraAsset(aura?.id);
  const seasonAsset = getSeasonAuraAssetForAvatarId(aura?.id, themeMode);
  const layeredAsset = approvedAsset ?? seasonAsset;
  const auraPhase = useRef(new Animated.Value(0)).current;
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const runtimeActive = isFocused && (ownerActive ?? true);

  // зачем: слои колец приходят из Storage (Фаза 4 «Бандл-диеты», 2026-08-24).
  // Пока базовый слой не отрисован — под ним живёт градиентный ореол ТОЙ ЖЕ
  // геометрии в цвете ауры. Пользователь видит ауру с первого кадра, вёрстка не
  // прыгает, спиннера нет; если слой так и не доехал, ореол остаётся навсегда
  // и выглядит как задуманный вид, а не как поломка.
  const [ringPainted, setRingPainted] = useState(false);
  const handleRingLoaded = useCallback(() => setRingPainted(true), []);
  // Ошибку не отличаем от ожидания: в обоих случаях показываем ореол.
  const handleRingFailed = useCallback(() => setRingPainted(false), []);

  // Смена ауры — снова ждём её слой, иначе новое кольцо унаследует «готово».
  useEffect(() => { setRingPainted(false); }, [aura?.id]);

  // Ореол крутится и когда ауры-картинки нет вовсе, и пока её слой едет.
  const haloVisible = layeredAsset === undefined || !ringPainted;
  const shouldAnimate = animate && runtimeActive && !reduceMotion && size >= 42 && aura !== undefined && haloVisible;

  useEffect(() => {
    if (!shouldAnimate) {
      auraPhase.setValue(0);
      return;
    }

    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      auraPhase.setValue(0);
      loop = Animated.loop(Animated.timing(auraPhase, {
        toValue: 1,
        duration: 7200,
        easing: Easing.linear,
        useNativeDriver: true,
      }));
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [auraPhase, shouldAnimate]);

  // Дыхание ореола-подложки: то же движение, что у обычного ореола, но глуше —
  // подложка не должна спорить с кольцом в момент проявления.
  const placeholderScale = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.98, 1.03, 0.98],
  });
  const placeholderOpacity = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.30, 0.46, 0.30],
  });

  if (!aura || size < 36) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        {children}
      </View>
    );
  }

  if (layeredAsset) {
    const outer = size + SEASON_AURA_LAYOUT_GUTTER;
    const ringScale = approvedAsset ? APPROVED_AURA_RING_SCALE : SEASON_AURA_RING_SCALE;
    const ringSize = Math.round(size * ringScale);
    return (
      <View
        style={[
          {
            width: outer,
            height: outer,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
          },
          style,
        ]}
      >
        {/* Ореол-подложка: держит цвет ауры, пока слой кольца едет из Storage.
            Живёт ПОД кольцом и не снимается до его отрисовки, поэтому подмена
            идёт без «моргания» и без скачка вёрстки — геометрия одна и та же. */}
        {haloVisible && (
          <Animated.View
            testID="avatar-aura-ring-placeholder"
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: outer,
              height: outer,
              borderRadius: outer / 2,
              opacity: placeholderOpacity,
              overflow: 'hidden',
              transform: [{ scale: placeholderScale }],
            }}
          >
            <ExpoLinearGradient
              colors={[aura.softColor, aura.color, aura.color2 ?? aura.color, aura.color3 ?? aura.color]}
              locations={[0, 0.34, 0.68, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%' }}
            />
          </Animated.View>
        )}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: ringSize,
            height: ringSize,
            left: (outer - ringSize) / 2,
            top: (outer - ringSize) / 2,
          }}
        >
          <SeasonAuraRing
            asset={layeredAsset}
            size={ringSize}
            active={animate && runtimeActive}
            onBaseLoaded={handleRingLoaded}
            onBaseFailed={handleRingFailed}
          />
        </View>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    );
  }

  const outer = size + 8;
  const haloScale = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.98, 1.04, 0.98],
  });
  const haloOpacity = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.34, 0.54, 0.34],
  });
  const softOuterOpacity = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.06, 0.13, 0.06],
  });
  const softInnerOpacity = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.12, 0.22, 0.12],
  });
  const rotation = auraPhase.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const bright = aura.color2 ?? aura.color;
  const deep = aura.color3 ?? aura.color;
  const isSatin = aura.material === 'satin';
  const satinColors = [deep, aura.color, bright, aura.color, deep] as const;
  const satinLocations = [0, 0.28, 0.5, 0.72, 1] as const;
  const haloColors = [aura.softColor, aura.color, bright, deep] as const;
  const haloLocations = [0, 0.34, 0.68, 1] as const;

  return (
    <View
      style={[
        {
          width: outer,
          height: outer,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        style,
      ]}
    >
      <Animated.View
        testID="avatar-aura-soft-edge-outer"
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer + 18,
          height: outer + 18,
          borderRadius: (outer + 18) / 2,
          backgroundColor: aura.color,
          opacity: softOuterOpacity,
          shadowColor: aura.color,
          shadowOpacity: 0.18,
          shadowRadius: 14,
          transform: [{ scale: haloScale }],
        }}
      />
      <Animated.View
        testID="avatar-aura-soft-edge-inner"
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer + 10,
          height: outer + 10,
          borderRadius: (outer + 10) / 2,
          backgroundColor: aura.color,
          opacity: softInnerOpacity,
          shadowColor: aura.color,
          shadowOpacity: 0.24,
          shadowRadius: 10,
          transform: [{ scale: haloScale }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          opacity: haloOpacity,
          overflow: 'hidden',
          shadowColor: aura.color,
          shadowOpacity: 0.2,
          shadowRadius: 9,
          transform: [{ rotate: rotation }, { scale: haloScale }],
        }}
      >
        <ExpoLinearGradient
          colors={isSatin ? satinColors : haloColors}
          locations={isSatin ? satinLocations : haloLocations}
          start={isSatin ? { x: 0, y: 0.35 } : { x: 0, y: 0 }}
          end={isSatin ? { x: 1, y: 0.65 } : { x: 1, y: 1 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

export default memo(AvatarAura);
