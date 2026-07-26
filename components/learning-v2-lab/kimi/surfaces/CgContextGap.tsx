// зачем: дословный RN-порт source/src/surfaces/mobile/CgContextGap.tsx.
// Грамматический пропуск внутри живой ситуации: выбрать верную форму для слота.
// Пояснение к слоту запечено на каждый вариант и показывается после попытки.
// Раскрытие — только в success; при промахе спокойная подсказка + заметка варианта.
import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ComposerShell } from '../ComposerShell';
import { Chip, OptionGrid } from '../components';
import { cgContextGapFixture } from '../fixtures/core';
import { useLab } from '../LabState';
import { GraphemeText } from '../primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from '../tokens';

export const CgContextGap = memo(function CgContextGap() {
  const lab = useLab();
  const surfaceId = 'cg-context-gap';
  const vm = cgContextGapFixture;
  const state = lab.canonicalState;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const correct = vm.sentence.slotOptions.find((option) => option.correct);
  const selected = vm.sentence.slotOptions.find((option) => option.id === selectedOptionId);
  const reveal = state === 'success';
  const attempted = state === 'processing' || state === 'success' || state === 'needs_work';

  const [beforePart, afterPart] = useMemo(() => vm.sentence.before.split('___'), [vm.sentence.before]);

  return (
    <ComposerShell
      surfaceId={surfaceId}
      mode="missing-word"
      title="Слово в контексте"
      subtitle="Contextual Gap · EN"
      copy={vm.copy}
      promptZone={
        <View style={s.situation}>
          <Chip text={vm.situationLabel} tone="muted" />
          {/* зачем: слот внутри строки — Text с вложенным Text, чтобы перенос шёл
              по словам вместе с предложением, а не отдельным блоком */}
          <Text style={s.sentence}>
            {beforePart}
            <Text style={[s.slot, selected ? s.slotFilled : null]}>
              {selected ? selected.label : '___'}
            </Text>
            {afterPart ?? vm.sentence.after}
          </Text>
          <GraphemeText text={vm.sentenceRu} maxGraphemes={120} style={s.sentenceRu} />
        </View>
      }
      successNote={vm.successNote}
      missHint={vm.missHint}
      recoveryNote={vm.copy.statusMessages.recovery}
      primaryPayload={{ selectedOptionId }}
      primaryDisabled={state === 'active' && selectedOptionId === null}
      secondaryAction={{ label: 'Почему эта форма?', intent: 'activity.explain', payload: { state } }}
    >
      <OptionGrid
        surfaceId={surfaceId}
        options={vm.sentence.slotOptions.map((option) => ({ id: option.id, label: option.label }))}
        correctOptionId={correct?.id}
        selectedId={selectedOptionId}
        onSelected={setSelectedOptionId}
        enabled={state === 'active'}
        reveal={reveal}
        columns={2}
      />
      {attempted && selectedOptionId && vm.slotFeedback[selectedOptionId] ? (
        <View style={s.slotNote}>
          <GraphemeText text={vm.slotFeedback[selectedOptionId]} maxGraphemes={140} style={s.slotNoteText} />
        </View>
      ) : null}
    </ComposerShell>
  );
});

const s = StyleSheet.create({
  situation: { gap: SPACE.s2, alignItems: 'flex-start' },
  sentence: {
    fontSize: TEXT.lg,
    lineHeight: TEXT.lg * LEADING.relaxed,
    color: C.fgPrimary,
  },
  slot: {
    paddingHorizontal: SPACE.s2,
    fontWeight: WEIGHT.semibold,
    color: C.accentPrimary,
    textAlign: 'center',
  },
  slotFilled: {
    backgroundColor: C.accentSoft,
    color: C.fgPrimary,
  },
  sentenceRu: { fontSize: TEXT.sm, color: C.fgSecondary },
  slotNote: {
    marginTop: SPACE.s3,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    // guard-ok: односторонний акцент-маркер заметки слота (.cg__slot-note из base.css)
    borderLeftWidth: 3,
    borderLeftColor: C.accentPrimary,
    backgroundColor: C.bgSubtle,
  },
  slotNoteText: { fontSize: TEXT.sm, color: C.fgPrimary, lineHeight: TEXT.sm * LEADING.snug },
});
