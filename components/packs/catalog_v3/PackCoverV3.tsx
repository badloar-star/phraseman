// ═══════════════════════════════════════════════════════════════════════════
// PackCoverV3.tsx — обложка набора: градиент в тоне темы и крупный значок; без картинок (ничего не «не прогружается»).
//
// зачем (владелец 26.10: «картинки не прогружены» про забракованную доску; плитка — игровая, обложка в тоне темы): обложка рисуется сразу из токенов
// темы (packCoverPaint), без сети и без загрузки изображений — первый кадр уже готовый. Свет сверху-слева — мягкий блик, как у блоков пьедестала.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import type { PackCoverPaint } from './packs_catalog_v3_tokens';

type Props = Readonly<{
  paint: PackCoverPaint;
  /** Сторона значка, dp. */
  glyphSize: number;
  style?: StyleProp<ViewStyle>;
}>;

const SHINE = colorWithAlpha(SPIRE_SCENE_INK.text, 0.22);

function PackCoverV3({ paint, glyphSize, style }: Props) {
  return (
    <View style={[s.cover, style]}>
      <LinearGradient colors={[paint.from, paint.to]} start={paint.angle} end={{ x: 1 - paint.angle.x, y: 1 - paint.angle.y }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[SHINE, SPIRE_SCENE_INK.clear]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <Ionicons name={paint.glyph} size={glyphSize} color={paint.glyphColor} />
    </View>
  );
}

export default memo(PackCoverV3);

const s = StyleSheet.create({
  cover: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
