// зачем: дословный RN-порт source/src/surfaces/mobile/VdVisualDiscovery.tsx.
// Собственная сцена аэропорта (inline SVG, без стоковых картинок). SB-01: при
// промахе правильный ответ НЕ раскрывается — только спокойная подсказка; раскрытие
// происходит в success (карточка + EN-фраза с русским переводом под сценой).
import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { ChoiceShell } from '../ChoiceShell';
import { OptionGrid } from '../components';
import { vdVisualDiscoveryFixture } from '../fixtures/core';
import { useLab } from '../LabState';
import { GraphemeText } from '../primitives';
import { C, LEADING, MODE_ACCENT, RADIUS, SPACE, TEXT, WEIGHT, withAlpha } from '../tokens';

/** Сцена аэропорта — перенос SVG Kimi (классы .vd__art-* → цвета cinema-темы). */
const AirportScene = memo(function AirportScene({ altRu }: { readonly altRu: string }) {
  return (
    <Svg
      viewBox="0 0 320 180"
      style={s.sceneArt}
      accessibilityRole="image"
      accessibilityLabel={altRu}
    >
      {/* окно / табло вылетов */}
      <Rect x="0" y="0" width="320" height="180" rx="12" fill={C.bgSubtle} />
      <Rect x="196" y="18" width="104" height="54" rx="6" fill={withAlpha(C.accentPrimary, 0.16)} />
      <Rect x="206" y="28" width="84" height="6" rx="3" fill={C.fgSecondary} opacity={0.6} />
      <Rect x="206" y="40" width="60" height="6" rx="3" fill={C.fgSecondary} opacity={0.6} />
      <Rect x="206" y="52" width="72" height="6" rx="3" fill={C.fgSecondary} opacity={0.6} />
      {/* пол */}
      <Rect x="0" y="140" width="320" height="40" rx="12" fill={C.borderStrong} opacity={0.5} />
      {/* стойка регистрации */}
      <Rect x="150" y="96" width="150" height="46" rx="6" fill={C.bgSurface} stroke={C.borderStrong} strokeWidth={1} />
      <Rect x="150" y="96" width="150" height="10" rx="5" fill={C.accentPrimary} opacity={0.55} />
      {/* сотрудник за стойкой */}
      <Circle cx="232" cy="66" r="12" fill={C.fgSecondary} />
      <Rect x="220" y="78" width="24" height="22" rx="8" fill={C.fgSecondary} />
      {/* путешественник с чемоданом */}
      <Circle cx="84" cy="58" r="13" fill={MODE_ACCENT['natural-choice']} />
      <Rect x="70" y="72" width="28" height="48" rx="10" fill={MODE_ACCENT['natural-choice']} />
      <Rect x="104" y="104" width="26" height="34" rx="5" fill={C.fgSecondary} />
      <Rect x="112" y="96" width="10" height="10" rx="3" fill="none" stroke={C.fgSecondary} strokeWidth={2} />
      <Circle cx="110" cy="141" r="4" fill={C.bgSurface} stroke={C.fgSecondary} strokeWidth={1.5} />
      <Circle cx="124" cy="141" r="4" fill={C.bgSurface} stroke={C.fgSecondary} strokeWidth={1.5} />
      {/* посадочный талон в руке */}
      <Rect x="96" y="82" width="18" height="10" rx="2" fill={C.bgSurface} stroke={C.borderStrong} strokeWidth={1} />
    </Svg>
  );
});

export const VdVisualDiscovery = memo(function VdVisualDiscovery() {
  const lab = useLab();
  const surfaceId = 'vd-visual-discovery';
  const vm = vdVisualDiscoveryFixture;
  const state = lab.canonicalState;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // SB-01: ответ никогда не раскрывается при промахе — только в success.
  const reveal = state === 'success';

  return (
    <ChoiceShell
      surfaceId={surfaceId}
      mode="natural-choice"
      title="Визуальное открытие"
      subtitle="Visual Discovery · EN"
      copy={vm.copy}
      promptZone={
        <View style={s.scene}>
          <AirportScene altRu={vm.scene.altRu} />
          <GraphemeText text={vm.scene.promptLabel} maxGraphemes={80} style={s.scenePrompt} />
        </View>
      }
      successNote={vm.reveal.note}
      missHint={vm.missHint}
      recoveryNote={vm.copy.statusMessages.recovery}
      primaryPayload={{ selectedCardId }}
      primaryDisabled={state === 'active' && selectedCardId === null}
      secondaryAction={{ label: 'Подсказка', intent: 'vd.show_hint', payload: { sceneId: vm.scene.id } }}
    >
      <OptionGrid
        surfaceId={surfaceId}
        options={vm.cards.map((card) => ({ id: card.id, label: card.label, hint: card.note || undefined }))}
        correctOptionId={vm.correctCardId}
        selectedId={selectedCardId}
        onSelected={setSelectedCardId}
        enabled={state === 'active'}
        reveal={reveal}
      />
      {reveal ? (
        <View style={s.reveal}>
          <GraphemeText text={vm.reveal.phrase} maxGraphemes={80} style={s.revealPhrase} />
          <GraphemeText text={vm.reveal.phraseRu} maxGraphemes={80} style={s.revealRu} />
        </View>
      ) : null}
    </ChoiceShell>
  );
});

const s = StyleSheet.create({
  scene: { gap: SPACE.s2 },
  sceneArt: {
    width: '100%',
    aspectRatio: 320 / 180,
    borderRadius: RADIUS.lg,
  },
  scenePrompt: {
    fontSize: TEXT.lg,
    fontWeight: WEIGHT.semibold,
    color: C.fgPrimary,
    textAlign: 'center',
    lineHeight: TEXT.lg * LEADING.snug,
  },
  reveal: {
    marginTop: SPACE.s3,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.md,
    backgroundColor: '#182B31',
    gap: SPACE.s1,
  },
  revealPhrase: { fontSize: TEXT.lg, fontWeight: WEIGHT.bold, color: C.correct },
  revealRu: { fontSize: TEXT.sm, color: C.fgSecondary },
});
