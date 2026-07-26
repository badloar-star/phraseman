// зачем: дословный RN-порт source/src/surfaces/mobile/PbPhraseBuilder.tsx.
// Сборка EN-фразы по русскому переводу: тап по чипу банка ставит слово в строку
// ответа, тап по поставленному — возвращает. needs_work подчёркивает неверный слот
// с коротким запечённым объяснением. «Проверить» неактивна, пока строка не полна.
import React, { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ComposerShell } from '../ComposerShell';
import { ComposerInput } from '../ComposerInput';
import { pbPhraseBuilderFixture } from '../fixtures/core';
import { useLab } from '../LabState';
import { GraphemeText } from '../primitives';
import { C, LEADING, SPACE, TEXT, WEIGHT } from '../tokens';

export const PbPhraseBuilder = memo(function PbPhraseBuilder() {
  const lab = useLab();
  const surfaceId = 'pb-phrase-builder';
  const vm = pbPhraseBuilderFixture;
  const state = lab.canonicalState;

  const [answer, setAnswer] = useState<readonly string[]>([]);

  const complete = answer.length === vm.targetTokens.length;
  const revealWrong = state === 'needs_work';

  // Объяснение берём для первого несовпавшего слота (позиции из фикстуры Kimi).
  const firstMismatch = answer.findIndex((chip, index) => chip !== vm.targetTokens[index]);
  const slotExplanation = !revealWrong
    ? undefined
    : firstMismatch === 1
      ? vm.slotExplanations?.wrongVerb
      : firstMismatch === 5
        ? vm.slotExplanations?.wrongPrep
        : undefined;

  return (
    <ComposerShell
      surfaceId={surfaceId}
      mode="phrase-build"
      title="Собери фразу"
      subtitle="Phrase Builder · EN"
      copy={vm.copy}
      promptZone={
        <View style={s.prompt}>
          <GraphemeText text={vm.translationLabel ?? ''} maxGraphemes={120} style={s.translation} />
        </View>
      }
      successNote={vm.successNote}
      missHint={vm.missHint}
      recoveryNote={vm.copy.statusMessages.recovery}
      primaryPayload={{ answer }}
      primaryDisabled={state === 'active' && !complete}
      secondaryAction={{ label: 'Подсказка', intent: 'pb.show_hint', payload: { state } }}
    >
      <ComposerInput
        bankChips={vm.bankChips}
        targetTokens={vm.targetTokens}
        answer={answer}
        onAnswerChange={setAnswer}
        enabled={state === 'active'}
        revealWrong={revealWrong}
        slotExplanation={slotExplanation}
        onChipIntent={(intent, payload) => lab.logIntent({ surfaceId, intent, payload })}
      />
    </ComposerShell>
  );
});

const s = StyleSheet.create({
  prompt: { gap: SPACE.s2 },
  translation: {
    fontSize: TEXT.xl,
    fontWeight: WEIGHT.semibold,
    color: C.fgPrimary,
    textAlign: 'center',
    lineHeight: TEXT.xl * LEADING.snug,
  },
});
