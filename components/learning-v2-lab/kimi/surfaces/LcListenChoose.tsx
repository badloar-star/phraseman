// зачем: дословный RN-порт source/src/surfaces/mobile/LcListenChoose.tsx (Kimi V5).
// Симулированный плеер: большая play/pause, статичный прогресс, replay + 0.75×.
// Transcript скрыт до первой попытки; раскрытие ответа — только в success; промах
// повторяет спокойную подсказку. «Проверить» неактивна, пока вариант не выбран.
import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoiceShell } from '../ChoiceShell';
import { Chip, OptionGrid, SignalButton } from '../components';
import { lcListenChooseFixture } from '../fixtures/core';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, TEXT } from '../tokens';

export const LcListenChoose = memo(function LcListenChoose() {
  const lab = useLab();
  const surfaceId = 'lc-listen-choose';
  const vm = lcListenChooseFixture;
  const state = lab.canonicalState;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [slowRate, setSlowRate] = useState(false);

  const attempted = state === 'processing' || state === 'success' || state === 'needs_work';
  const reveal = state === 'success';

  return (
    <ChoiceShell
      surfaceId={surfaceId}
      mode="listen"
      title="Слушай и выбирай"
      subtitle="Listen & Choose · EN"
      copy={vm.copy}
      promptZone={
        <View style={s.player}>
          <SignalButton surfaceId={surfaceId} label={vm.signalLabel} disabled={state === 'processing'} />
          <View style={s.progress}>
            <View style={s.progressFill} />
          </View>
          <View style={s.playerActions}>
            <IntentButton
              surfaceId={surfaceId}
              intent="signal.replay"
              payload={{ simulated: true }}
              onIntent={lab.logIntent}
              variant="ghost"
              disabled={state === 'processing'}
              accessibilityLabel="Проиграть ещё раз"
            >
              ↺ Ещё раз
            </IntentButton>
            <IntentButton
              surfaceId={surfaceId}
              intent="signal.rate"
              payload={{ rate: slowRate ? 1 : 0.75, simulated: true }}
              onIntent={lab.logIntent}
              onPress={() => setSlowRate(!slowRate)}
              variant="ghost"
              disabled={state === 'processing'}
              pressed={slowRate}
              accessibilityLabel="Переключить скорость 0.75×"
            >
              {slowRate ? '1× скорость' : '0.75× медленнее'}
            </IntentButton>
          </View>
          <GraphemeText text={vm.promptLabel} maxGraphemes={120} style={s.prompt} />
          {!lab.conditions.online ? <Chip text={`✓ ${vm.offlineNote}`} tone="ok" /> : null}
        </View>
      }
      successNote={vm.contrastNote}
      missHint={vm.missHint}
      recoveryNote={vm.copy.statusMessages.recovery}
      primaryPayload={{ selectedOptionId, rate: slowRate ? 0.75 : 1 }}
      primaryDisabled={state === 'active' && selectedOptionId === null}
      secondaryAction={{ label: 'Почему этот ответ?', intent: 'activity.explain', payload: { state } }}
    >
      <OptionGrid
        surfaceId={surfaceId}
        options={vm.options}
        correctOptionId={vm.correctOptionId}
        selectedId={selectedOptionId}
        onSelected={setSelectedOptionId}
        enabled={state === 'active'}
        reveal={reveal}
      />
      {attempted ? (
        <View style={s.transcript}>
          <GraphemeText text={vm.transcript} maxGraphemes={180} style={s.transcriptText} />
          <GraphemeText text={vm.transcriptNote} maxGraphemes={80} style={s.transcriptNote} />
        </View>
      ) : null}
    </ChoiceShell>
  );
});

const s = StyleSheet.create({
  player: { gap: SPACE.s2 },
  progress: {
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
    overflow: 'hidden',
  },
  progressFill: {
    width: '42%',
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: C.accentPrimary,
  },
  playerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  prompt: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  transcript: {
    marginTop: SPACE.s3,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.md,
    // guard-ok: односторонний акцент-маркер транскрипта (.lc__transcript из base.css)
    borderLeftWidth: 3,
    borderLeftColor: C.accentPrimary,
    backgroundColor: C.bgSubtle,
    gap: SPACE.s1,
  },
  transcriptText: { fontSize: TEXT.md, lineHeight: TEXT.md * LEADING.normal, color: C.fgPrimary },
  transcriptNote: { fontSize: TEXT.xs, color: C.fgSecondary },
});
