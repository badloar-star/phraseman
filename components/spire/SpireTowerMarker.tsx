// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerMarker.tsx — своя метка на башне Пика: на «Сцене» — своя монета без колец со свечением темы (тап — своя карточка),
// в прежнем окне — монета в кольце «Ты здесь».
//
// зачем (координатор 22.10: сторож «каждый файл Пика ≤ 400 строк» — вынести часть SpireTower; маркер на литералах #F2F1F6 / #0C0C0D /
// белый ореол → цвета темы, как маркер моментов у 8 · МОМЕНТЫ; закон владельца «цвета строго оттенками текущей темы»): кольцо — главная
// заливка темы (cta), монета на её чернилах (ctaText), ореол — та же cta 12 % (в «Графите» это прежние #F2F1F6 / #0C0C0D). Положение и
// перелёт на этаж выше остаются в SpireTower (Animated.View на нативном драйвере), здесь только вид.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Lang } from '../../constants/i18n';
import AvatarView from '../AvatarView';
import { colorWithAlpha } from '../v2/plateAlpha';
import V2Pressable from '../v2/V2Pressable';
import { spireText } from './spire_strings';

/** Метка прежнего окна башни (кольцо «Ты здесь»), dp. */
export const SPIRE_MARKER_SIZE = 40;
/** Своя монета на «Сцене» без колец — ×1,1 от метки (владелец 22.10: «ВОТ ТАК НЕ НАДО» про монету в цветном круге). */
const MARKER_SCENE_SIZE = 44;
/** Ореол метки окна — по 12 dp вокруг кольца, тон cta 12 % (как у маркера моментов). */
const HALO = 12;
const HALO_ALPHA = 0.12;

type Props = Readonly<{
  lang: Lang;
  /** «Сцена» Пика — своя монета без колец; иначе — метка прежнего окна. */
  sceneMode: boolean;
  myCoinRank: number | null;
  /** Plus у меня — кольцо Plus у монеты в метке окна (владелец 21.10, реестр №6). */
  myIsPlus: boolean;
  /** Главная заливка темы и её чернила (useSpirePalette: cta / ctaText). */
  cta: string;
  ctaText: string;
  /** Только «Сцена»: мягкое свечение своей монеты — цвет сцены из темы. */
  glow?: string;
  /** Только «Сцена»: тап по своей монете — своя карточка. */
  onPressMe?: () => void;
}>;

function SpireTowerMarker({ lang, sceneMode, myCoinRank, myIsPlus, cta, ctaText, glow, onPressMe }: Props) {
  if (sceneMode) {
    // зачем (владелец 22.10: «ВОТ ТАК НЕ НАДО» — монета в цветном круге): на «Сцене» своя монета без колец — крупнее (×1,1) и с мягким
    // свечением цвета сцены из темы; тап — своя карточка (отклик — только масштаб V2Pressable, зона 44); TalkBack читает «Вы»
    return (
      <V2Pressable disabled={!onPressMe} onPress={onPressMe} scaleTo={0.94} accessibilityRole={onPressMe ? 'button' : undefined} accessibilityLabel={spireText(lang, 'you')} style={[s.scene, glow ? { boxShadow: `0 0 18px 2px ${glow}` } : null]}>
        {myCoinRank !== null ? <AvatarView avatar="" coinRank={myCoinRank} size={MARKER_SCENE_SIZE} plus={false} /> : null}
      </V2Pressable>
    );
  }
  return (
    <>
      <View style={[s.halo, { backgroundColor: colorWithAlpha(cta, HALO_ALPHA) }]} />
      <View style={[s.ring, { backgroundColor: cta }]}>
        <View style={[s.inner, { backgroundColor: ctaText }]}>
          {myCoinRank !== null ? <AvatarView avatar="" coinRank={myCoinRank} size={SPIRE_MARKER_SIZE - 6} /* guard-ok: размер монеты 40 − 6 dp, не баланс */ plus={myIsPlus} plusKind="flat" /> : null}
        </View>
      </View>
    </>
  );
}

export default memo(SpireTowerMarker);

const s = StyleSheet.create({
  scene: { width: MARKER_SCENE_SIZE, height: MARKER_SCENE_SIZE, borderRadius: MARKER_SCENE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: SPIRE_MARKER_SIZE + HALO * 2, height: SPIRE_MARKER_SIZE + HALO * 2, borderRadius: SPIRE_MARKER_SIZE / 2 + HALO },
  ring: { width: SPIRE_MARKER_SIZE, height: SPIRE_MARKER_SIZE, borderRadius: SPIRE_MARKER_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  inner: { width: SPIRE_MARKER_SIZE - 4, height: SPIRE_MARKER_SIZE - 4, borderRadius: (SPIRE_MARKER_SIZE - 4) / 2, alignItems: 'center', justifyContent: 'center' },
});
