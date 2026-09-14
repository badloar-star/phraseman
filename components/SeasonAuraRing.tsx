import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, PixelRatio, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { SeasonAuraAsset } from '../app/season_pass_track_config';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';

// зачем: слои аур больше не все лежат в бандле — 111 из 117 приходят из Storage
// (Фаза 4 «Бандл-диеты», 2026-08-24). RN-Image для удалённых URL полагается на
// платформенный HTTP-кэш, который не гарантирует, что кольцо переживёт
// перезапуск. expo-image с cachePolicy="memory-disk" даёт настоящий дисковый
// кэш: скачали один раз — дальше кольцо рисуется офлайн и мгновенно.
//
// зачем (регрессия 2026-08-25): раньше здесь был Animated.createAnimatedComponent(ExpoImage) —
// анимация ложилась прямо на native-view expo-image. На SDK 54 это надёжно
// НЕ прокидывает opacity/transform через native driver: картинка грузится и
// стоит на месте (владелец сообщил — кольцо застыло сразу после вчерашнего
// переезда слоёв на CDN). Теперь Animated.View снаружи держит opacity/
// transform как обычно, а внутри — простой, ничем не анимированный ExpoImage
// на всю площадь. Тот же визуал, без риска, что exotic native-view проглотит
// анимацию.

export type SeasonAuraVisibleLayers = Readonly<{
  base?: boolean;
  flow?: boolean;
  particles?: boolean;
}>;

interface Props {
  asset: SeasonAuraAsset;
  size: number;
  active?: boolean;
  visibleLayers?: SeasonAuraVisibleLayers;
  /**
   * Базовый слой отрисован. Пока false, AvatarAura держит под кольцом свой
   * градиентный ореол той же геометрии — пользователь видит ауру в её цвете,
   * а не пустоту, и вёрстка не прыгает при подмене.
   */
  onBaseLoaded?: () => void;
  /** Базовый слой не смог загрузиться — остаёмся на ореоле навсегда. */
  onBaseFailed?: () => void;
}

/**
 * Порог перехода на HD-слои, в физических пикселях стороны кольца.
 *
 * зачем (владелец 2026-09-14, «апскейл рамок»): 320-px слой начинает мылить,
 * когда его растягивают заметно больше чем вдвое. 420 px — это ×1.31 от
 * источника; ниже порога картинка и так честная, и грузить второй файл незачем.
 * Кто попадает в HD: Главная (156 pt → 468 px на 3x) и сцена студии (270 pt →
 * 810 px). Кто НЕ попадает: каталог студии (91 pt → 273 px) и списки друзей
 * (90–131 pt) — им 320 px хватает, и лишнего трафика они не создают.
 *
 * Решение принимается ЗДЕСЬ, по фактическим пикселям, а не по имени экрана:
 * любой новый крупный экран получит HD сам, без правки его кода.
 */
const AURA_HD_MIN_PX = 420;

function rotation(value: Animated.Value, reverse: boolean) {
  return value.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'],
  });
}

function SeasonAuraRing({ asset, size, active = true, visibleLayers = {}, onBaseLoaded, onBaseFailed }: Props) {
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const shouldAnimate = active && isFocused && !reduceMotion;
  const breath = useRef(new Animated.Value(0)).current;
  const baseTurn = useRef(new Animated.Value(0)).current;
  const flowTurn = useRef(new Animated.Value(0)).current;
  const particlesTurn = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const values = [breath, baseTurn, flowTurn, particlesTurn, twinkle];
    if (!shouldAnimate) {
      values.forEach((value) => value.setValue(0));
      return;
    }

    let loops: Animated.CompositeAnimation[] = [];
    const makeLoop = (value: Animated.Value, duration: number, easing = Easing.linear) =>
      Animated.loop(Animated.timing(value, {
        toValue: 1,
        duration,
        easing,
        useNativeDriver: true,
      }));
    const start = () => {
      if (loops.length > 0) return;
      loops = [
        makeLoop(breath, asset.pulseMs, Easing.inOut(Easing.sin)),
        makeLoop(flowTurn, asset.flowSpinMs),
        makeLoop(particlesTurn, asset.particlesSpinMs),
        makeLoop(twinkle, Math.max(2600, Math.round(asset.pulseMs * 0.62)), Easing.inOut(Easing.sin)),
      ];
      if (asset.baseSpinMs > 0) loops.push(makeLoop(baseTurn, asset.baseSpinMs));
      loops.forEach((loop) => loop.start());
    };
    const stop = () => {
      loops.forEach((loop) => loop.stop());
      loops = [];
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
  }, [asset, baseTurn, breath, flowTurn, particlesTurn, shouldAnimate, twinkle]);

  const baseScale = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.98, 1.025, 0.98] });
  const baseOpacity = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.82, 1, 0.82] });
  const flowScale = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.015, 0.985, 1.015] });
  const flowOpacity = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.68, 1, 0.68] });
  const particlesScale = twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.96, 1.04, 0.96] });
  const particlesOpacity = twinkle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.34, 1, 0.34] });
  const layerStyle = { position: 'absolute' as const, width: size, height: size };

  // ── Выбор тира арта ────────────────────────────────────────────────────────
  // зачем: владелец 2026-09-14 — «апскейл рамок, но чтобы вес сильно не вырос».
  // Крупные кольца берут 768-px слои, мелкие остаются на 320-px. Ни один
  // экран не решает это сам — решает фактический размер в пикселях.
  const wantsHd = Math.round(size * PixelRatio.get()) >= AURA_HD_MIN_PX
    && asset.baseSourceHd !== undefined;

  // HD рисуется ПОВЕРХ уже показанного SD и снимает его только после onLoad.
  // Так пустого кольца не бывает даже на медленной сети: пользователь всегда
  // видит картинку, она лишь становится чётче. Тот же приём, что у ореола под
  // SD-слоем в AvatarAura.
  const [hdPaintedFor, setHdPaintedFor] = useState<string | null>(null);
  const hdKey = wantsHd ? String((asset.baseSourceHd as { uri?: string })?.uri ?? '') : '';
  const hdKeyRef = useRef(hdKey);
  hdKeyRef.current = hdKey;

  const handleHdLoaded = useCallback(() => {
    // Принимаем колбэк только текущего HD-слоя: поздний ответ предыдущей ауры
    // не должен снимать SD у новой (известный в проекте класс бага).
    setHdPaintedFor(hdKeyRef.current || null);
    // зачем: ореол-подложку в AvatarAura гасит onBaseLoaded от SD-слоя. Если HD
    // приехал ПЕРВЫМ (он мог лежать в дисковом кэше, а SD — нет), SD снимается
    // не успев доложить о себе, и ореол остался бы висеть под уже чётким
    // кольцом навсегда. Поэтому HD докладывает за него — вызов идемпотентен,
    // состояние там хранит id ауры, а не счётчик.
    onBaseLoaded?.();
  }, [onBaseLoaded]);
  const handleHdFailed = useCallback(() => {
    // зачем: немой catch запрещён. Не доехал HD — остаёмся на SD навсегда,
    // и это выглядит ровно как раньше, а не как поломка.
    setHdPaintedFor(null);
  }, []);

  const hdPainted = wantsHd && hdKey !== '' && hdPaintedFor === hdKey;
  // SD снимается только когда HD реально отрисован.
  const sdVisible = !hdPainted;

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      {visibleLayers.base !== false ? (
        <Animated.View
          style={[
            layerStyle,
            {
              opacity: baseOpacity,
              transform: [{ scale: baseScale }, { rotate: rotation(baseTurn, false) }],
            },
          ]}
        >
          {sdVisible ? (
            <ExpoImage
              source={asset.baseSource}
              contentFit="contain"
              cachePolicy="memory-disk"
              // Мягкое проявление поверх ореола — подмена не «моргает».
              transition={180}
              onLoad={onBaseLoaded}
              onError={onBaseFailed}
              style={{ width: '100%', height: '100%' }}
            />
          ) : null}
          {wantsHd ? (
            <ExpoImage
              source={asset.baseSourceHd}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
              onLoad={handleHdLoaded}
              onError={handleHdFailed}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
          ) : null}
        </Animated.View>
      ) : null}
      {visibleLayers.flow !== false ? (
        <Animated.View
          style={[
            layerStyle,
            {
              opacity: flowOpacity,
              transform: [{ scale: flowScale }, { rotate: rotation(flowTurn, asset.flowReverse) }],
            },
          ]}
        >
          {sdVisible ? (
            <ExpoImage
              source={asset.flowSource}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={180}
              style={{ width: '100%', height: '100%' }}
            />
          ) : null}
          {wantsHd ? (
            <ExpoImage
              source={asset.flowSourceHd}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
          ) : null}
        </Animated.View>
      ) : null}
      {visibleLayers.particles !== false ? (
        <Animated.View
          style={[
            layerStyle,
            {
              opacity: particlesOpacity,
              transform: [{ scale: particlesScale }, { rotate: rotation(particlesTurn, asset.particlesReverse) }],
            },
          ]}
        >
          {sdVisible ? (
            <ExpoImage
              source={asset.particlesSource}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={180}
              style={{ width: '100%', height: '100%' }}
            />
          ) : null}
          {wantsHd ? (
            <ExpoImage
              source={asset.particlesSourceHd}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

export default memo(SeasonAuraRing);
