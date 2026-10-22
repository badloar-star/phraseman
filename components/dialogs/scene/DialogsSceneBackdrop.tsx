// ═══════════════════════════════════════════════════════════════════════════
// DialogsSceneBackdrop.tsx — подложка «Сцены» «Диалогов»: основа bgTop → bg и свет bgGlow из токенов темы (эталон dialogs-scene-states.html, `.sc .light`).
//
// зачем (владелец 22.10: верх листа согласия «живой мини-диалог» на свету темы): одна и та же подложка у сцены хаба и у верха листа согласия — вынесена из DialogsSceneStage,
// чтобы не дублировать градиенты. Заполняет родителя (absoluteFill), касаний не ловит. idPrefix разводит id градиентов, когда две подложки на экране одновременно (сцена под листом).
// ═══════════════════════════════════════════════════════════════════════════
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { DialogsSceneColors } from './dialogs_scene_tokens';

type Props = Readonly<{ colors: DialogsSceneColors; idPrefix: string }>;

function DialogsSceneBackdrop({ colors: c, idPrefix }: Props) {
  const r = `${idPrefix}GlowR`;
  const l = `${idPrefix}GlowL`;
  const b = `${idPrefix}GlowB`;
  return (
    <>
      <LinearGradient pointerEvents="none" colors={[c.top, c.bottom]} start={{ x: 0.42, y: 0 }} end={{ x: 0.58, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id={r} cx="84%" cy="14%" rx="70%" ry="46%" fx="84%" fy="14%">
            <Stop offset="0" stopColor={c.glowRight} stopOpacity="1" />
            <Stop offset="1" stopColor={c.glowRight} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id={l} cx="8%" cy="0%" rx="60%" ry="42%" fx="8%" fy="0%">
            <Stop offset="0" stopColor={c.glowLeft} stopOpacity="1" />
            <Stop offset="1" stopColor={c.glowLeft} stopOpacity="0" />
          </RadialGradient>
          {c.glowBottom ? (
            <RadialGradient id={b} cx="50%" cy="100%" rx="80%" ry="50%" fx="50%" fy="100%">
              <Stop offset="0" stopColor={c.glowBottom} stopOpacity="1" />
              <Stop offset="1" stopColor={c.glowBottom} stopOpacity="0" />
            </RadialGradient>
          ) : null}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${r})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${l})`} />
        {c.glowBottom ? <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${b})`} /> : null}
      </Svg>
    </>
  );
}

export default memo(DialogsSceneBackdrop);
