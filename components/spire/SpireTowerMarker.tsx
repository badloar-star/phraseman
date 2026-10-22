// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerMarker.tsx — своя метка на башне Пика: своя монета без кольца, ореола, свечения и кольца Plus — и на «Сцене», и в прежнем
// окне; на «Сцене» тап по ней открывает свою карточку.
//
// зачем (координатор 22.10: сторож «каждый файл Пика ≤ 400 строк» — вынести часть SpireTower): положение и перелёт на этаж выше
// остаются в SpireTower (Animated.View на нативном драйвере), здесь только вид.
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «вот тут я сказал убрать обводку!!!!» — вокруг своей монеты на башне НЕТ никакого кольца: ни кольца «Ты здесь»
// цвета темы, ни ореола, ни цветного свечения, ни кольца Plus (новое слово владельца главнее записи №6 от 21.10; Plus виден в шапке,
// аккаунте и визитке). Сторож — tests/owner_locks_spire_2026_10_22.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Lang } from '../../constants/i18n';
import AvatarView from '../AvatarView';
import V2Pressable from '../v2/V2Pressable';
import { spireText } from './spire_strings';

/** Метка прежнего окна башни — своя монета, dp (по нему SpireTower ставит метку на этаж). */
export const SPIRE_MARKER_SIZE = 40;
/** Своя монета на «Сцене» — ×1,1 от метки (владелец 22.10: «ВОТ ТАК НЕ НАДО» про монету в цветном круге). */
const MARKER_SCENE_SIZE = 44;

type Props = Readonly<{
  lang: Lang;
  /** «Сцена» Пика — монета крупнее и нажимается; иначе — метка прежнего окна. */
  sceneMode: boolean;
  myCoinRank: number | null;
  /** Только «Сцена»: тап по своей монете — своя карточка. */
  onPressMe?: () => void;
}>;

function SpireTowerMarker({ lang, sceneMode, myCoinRank, onPressMe }: Props) {
  if (sceneMode) {
    // своя монета крупнее (×1,1); тап — своя карточка (отклик — только масштаб V2Pressable, зона 44); TalkBack читает «Вы»
    return (
      <V2Pressable disabled={!onPressMe} onPress={onPressMe} scaleTo={0.94} accessibilityRole={onPressMe ? 'button' : undefined} accessibilityLabel={spireText(lang, 'you')} style={s.scene}>
        {myCoinRank !== null ? <AvatarView avatar="" coinRank={myCoinRank} size={MARKER_SCENE_SIZE} plus={false} /> : null}
      </V2Pressable>
    );
  }
  return (
    <View style={s.window}>
      {myCoinRank !== null ? <AvatarView avatar="" coinRank={myCoinRank} size={SPIRE_MARKER_SIZE} plus={false} /> : null}
    </View>
  );
}

export default memo(SpireTowerMarker);

const s = StyleSheet.create({
  scene: { width: MARKER_SCENE_SIZE, height: MARKER_SCENE_SIZE, borderRadius: MARKER_SCENE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  window: { width: SPIRE_MARKER_SIZE, height: SPIRE_MARKER_SIZE, alignItems: 'center', justifyContent: 'center' },
});
