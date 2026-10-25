// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_backdrop.tsx — один фон «Сцены» Пика от верха экрана: градиент и свет темы.
//
// зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10: «нигде верхняя часть не должна отличаться, она должна быть цельной»; опись Сверки: шапка Пика
// плоская 81,76,166, сцена под ней 140,114,202): шапка «Сообщества» стоит над сценой, а свет сцены начинался от её собственного верха —
// плоский цвет шапки не совпадал со сценой. Теперь сцена и слой шапки рисуют ОДИН и тот же фон высотой «от верха экрана до низа сцены»:
// сцена — сдвинутым вверх на расстояние до верха экрана (лишнее обрезает её рамка), шапка — его верхнюю часть. Стык совпадает пиксель в пиксель.
// ═══════════════════════════════════════════════════════════════════════════
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo, useSyncExternalStore } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export type { SpireSceneBackdropSpec } from './spire_scene_backdrop_math';
import { spireTopShadeAlpha, type SpireSceneBackdropSpec } from './spire_scene_backdrop_math';

let spec: SpireSceneBackdropSpec | null = null;
const listeners = new Set<() => void>();

/** Сцена Пика публикует свой фон для слоя шапки; null — сцены нет. */
export function setSpireSceneBackdrop(next: SpireSceneBackdropSpec | null): void {
  if (next === spec || (next && spec && next.top === spec.top && next.bottom === spec.bottom && next.glow === spec.glow && next.evening === spec.evening && next.bleed === spec.bleed && next.sceneH === spec.sceneH)) return;
  spec = next;
  console.log('[TOP-BAND]', JSON.stringify({ at: 'spire_backdrop', spec })); // guard-ok: одна строка на смену фона — чем закрыт верх Пика
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[TOP-BAND] spire backdrop listener failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch называет причину
    }
  });
}

const peek = (): SpireSceneBackdropSpec | null => spec;
const subscribe = (listener: () => void): (() => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function useSpireSceneBackdrop(): SpireSceneBackdropSpec | null {
  return useSyncExternalStore(subscribe, peek, peek);
}

/** Фон высотой bleed + sceneH; offsetTop — насколько поднять его над своим контейнером (сцена: bleed, шапка: 0). */
function SpireSceneBackdrop({ spec: b, offsetTop }: Readonly<{ spec: SpireSceneBackdropSpec; offsetTop: number }>) {
  const height = b.bleed + b.sceneH;
  const { width } = useWindowDimensions();
  const shade = useMemo(() => spireTopShadeAlpha(b, width), [b, width]);
  return (
    <View pointerEvents="none" style={[s.fill, { top: -offsetTop, height }]}>
      <LinearGradient colors={[b.top, b.bottom]} start={{ x: 0.22, y: 0 }} end={{ x: 0.78, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="spireBackdropLight" cx={b.evening ? '82%' : '18%'} cy="0%" rx="70%" ry="50%" fx={b.evening ? '82%' : '18%'} fy="0%">
            <Stop offset="0" stopColor={b.glow} stopOpacity="1" />
            <Stop offset="1" stopColor={b.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#spireBackdropLight)" />
      </Svg>
      {shade > 0 ? (
        <LinearGradient
          colors={[`rgba(0,0,0,${shade})`, `rgba(0,0,0,${shade})`, 'rgba(0,0,0,0)']} // theme-exempt: затемнение — только альфа над фоном темы
          locations={[0, Math.min(0.99, b.bleed / (b.bleed + 48)), 1]}
          style={[s.shade, { height: b.bleed + 48 }]}
        />
      ) : null}
    </View>
  );
}

export default memo(SpireSceneBackdrop);

const s = StyleSheet.create({ fill: { position: 'absolute', left: 0, right: 0 }, shade: { position: 'absolute', left: 0, right: 0, top: 0 } });
