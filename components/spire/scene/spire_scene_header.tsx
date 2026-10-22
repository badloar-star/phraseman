// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_header.tsx — шапка «Сообщества» над «Сценой» Пика: цвет верха сцены за вкладками, белые вкладки, белая энергия справа.
//
// зачем (Пик v2; владелец 22.10: «чтобы пик не был отдельной частью в отдельном окошке»; эталон peak-scene-v2.html — сцена уходит под вкладки
// «Пик · Друзья · Наборы»; координатор: «только на вкладке Пик и только при SPIRE_SCENE_V2_ENABLED, при выключенном флаге — побайтно прежний
// вид»): тон решает чистая функция spireSceneHeaderTone — нет флага, не «Пик» или сцены нет на экране → null, и «Сообщество» рисует прежние
// цвета (через ?? к своим значениям), без подложки и без энергии справа. Цвет кладёт сама сцена (spire_scene_header_tint).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import HomeSceneEnergy from '../../home/v2/scene/HomeSceneEnergy';
import { SPIRE_SCENE_V2_ENABLED } from './spire_scene_flag';
import { spireSceneHeaderTone, useSpireSceneHeaderTint, type SpireSceneHeaderTone } from './spire_scene_header_tint';

export type SpireSceneHeader = Readonly<{
  tone: SpireSceneHeaderTone | null;
  /** Подложка цвета сцены за вкладками (первым ребёнком шапки); null — нет. */
  backdrop: React.ReactNode;
  /** Справа в шапке — энергия на свету сцены; null — нет. */
  right: React.ReactNode;
}>;

const EMPTY: SpireSceneHeader = Object.freeze({ tone: null, backdrop: null, right: null });

export function useSpireSceneHeader(onPeak: boolean): SpireSceneHeader {
  const tint = useSpireSceneHeaderTint();
  const tone = spireSceneHeaderTone({ enabled: SPIRE_SCENE_V2_ENABLED, onPeak, tint });
  const toneTint = tone ? tone.tint : null;
  return useMemo(() => (toneTint === null || tone === null ? EMPTY : Object.freeze({
    tone,
    backdrop: <View pointerEvents="none" testID="spire-scene-header-tint" style={[StyleSheet.absoluteFill, { backgroundColor: toneTint }]} />,
    right: <HomeSceneEnergy />,
  // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: tone — новый объект на каждый рендер, сравниваем по цвету
  })), [toneTint]);
}
