// зачем: дословный RN-порт source/src/surfaces/mobile/LbListenBuild.tsx — диктант
// «слушай и собирай». Транскрипт (цель) скрыт до первой попытки. Клавиатурный ввод —
// презентационный запасной вариант (поле зеркалит собранный ответ, только чтение).
// Оффлайн работает: аудио на устройстве (чип offlineNote).
import React, { memo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ComposerShell } from '../ComposerShell';
import { ComposerInput } from '../ComposerInput';
import { Chip, SignalButton } from '../components';
import { lbListenBuildFixture } from '../fixtures/core';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN } from '../tokens';

export const LbListenBuild = memo(function LbListenBuild() {
  const lab = useLab();
  const surfaceId = 'lb-listen-build';
  const vm = lbListenBuildFixture;
  const state = lab.canonicalState;

  const [answer, setAnswer] = useState<readonly string[]>([]);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [slowRate, setSlowRate] = useState(false);

  const complete = answer.length === vm.targetTokens.length;
  const attempted = state === 'processing' || state === 'success' || state === 'needs_work';

  return (
    <ComposerShell
      surfaceId={surfaceId}
      mode="listen"
      title="Слушай и собирай"
      subtitle="Listen & Build · EN"
      copy={vm.copy}
      promptZone={
        <View style={s.player}>
          <SignalButton surfaceId={surfaceId} label={vm.signalLabel ?? ''} disabled={state === 'processing'} />
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
          <GraphemeText text={vm.promptLabel ?? ''} maxGraphemes={120} style={s.prompt} />
          {!lab.conditions.online && vm.offlineNote ? (
            <Chip text={`✓ ${vm.offlineNote}`} tone="ok" />
          ) : null}
        </View>
      }
      successNote={vm.successNote}
      missHint={vm.missHint}
      recoveryNote={vm.copy.statusMessages.recovery}
      primaryPayload={{ answer, rate: slowRate ? 0.75 : 1, input: keyboardOpen ? 'keyboard' : 'chips' }}
      primaryDisabled={state === 'active' && !complete}
    >
      <ComposerInput
        bankChips={vm.bankChips}
        targetTokens={vm.targetTokens}
        answer={answer}
        onAnswerChange={setAnswer}
        enabled={state === 'active' && !keyboardOpen}
        revealWrong={state === 'needs_work'}
        onChipIntent={(intent, payload) => lab.logIntent({ surfaceId, intent, payload })}
      />
      <View style={s.keyboard}>
        <IntentButton
          surfaceId={surfaceId}
          intent="composer.keyboard_toggle"
          payload={{ open: !keyboardOpen, simulated: true }}
          onIntent={lab.logIntent}
          onPress={() => setKeyboardOpen(!keyboardOpen)}
          variant="ghost"
          disabled={state !== 'active'}
          pressed={keyboardOpen}
          accessibilityLabel="Клавиатурный ввод"
        >
          ⌨ {vm.keyboardFallbackLabel ?? ''}
        </IntentButton>
        {keyboardOpen ? (
          <TextInput
            style={s.keyboardInput}
            value={answer.join(' ')}
            editable={false}
            accessibilityLabel="Строка ответа (клавиатурный ввод — демо)"
          />
        ) : null}
      </View>
      {attempted && vm.transcript ? (
        <View style={s.transcript}>
          <GraphemeText text={vm.transcript} maxGraphemes={180} style={s.transcriptText} />
          {vm.transcriptNote ? (
            <GraphemeText text={vm.transcriptNote} maxGraphemes={80} style={s.transcriptNote} />
          ) : null}
        </View>
      ) : null}
    </ComposerShell>
  );
});

const s = StyleSheet.create({
  player: { gap: SPACE.s2 },
  playerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  prompt: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  keyboard: { marginTop: SPACE.s2, gap: SPACE.s2, alignItems: 'flex-start' },
  keyboardInput: {
    width: '100%',
    minHeight: TOUCH_MIN,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSurface,
    color: C.fgPrimary,
    fontSize: TEXT.base,
  },
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
