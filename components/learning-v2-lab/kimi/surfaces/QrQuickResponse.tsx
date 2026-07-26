// зачем: дословный RN-порт source/src/surfaces/modes2/QrQuickResponse.tsx (SB-07).
// Коммуникативная цель («Скажи, что ты хочешь заказать»), таймера нет, подсказка
// по желанию. Карточка подтверждения («Мы услышали: …») с Изменить / Записать
// ещё раз / Отправить. Ввод текстом доступен всегда и честно подписан.
//
// ДВА отличия от поставки, оба продиктованы выбором владельца «микрофон настоящий,
// распознавание ТОЛЬКО на устройстве»:
//  1) текст в карточке — РЕАЛЬНО распознанный, а не запечённый в фикстуре;
//  2) карточка согласия на сетевую обработку НЕ показывается: запись никуда не
//     уходит, обещать передачу на сервер было бы неправдой (и разошлось бы с
//     политикой приватности).
import React, { memo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '../components';
import { qrQuickResponseFixture } from '../fixtures/voice';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN, WEIGHT } from '../tokens';
import { useVoiceCapture } from '../use_voice_capture';
import { VoiceActivityShell } from '../VoiceShell';

export const QrQuickResponse = memo(function QrQuickResponse() {
  const lab = useLab();
  const surfaceId = 'qr-quick-response';
  const vm = qrQuickResponseFixture;
  const state = lab.canonicalState;
  const [supportRevealed, setSupportRevealed] = useState(false);
  const [edited, setEdited] = useState(false);
  const [typedOpen, setTypedOpen] = useState(false);
  const [typedText, setTypedText] = useState('');

  // Свободная реплика: заранее известного текста нет — движок работает в режиме
  // диктовки, опорой служит фраза-подсказка.
  const capture = useVoiceCapture({ targetText: vm.goal.supportPhrase, freeSpeech: true });

  const busy = state === 'processing' || capture.status === 'evaluating';
  const hasAttempt =
    capture.result !== null || state === 'processing' || state === 'success' || state === 'needs_work';
  // Показываем то, что услышал микрофон; фикстура — только запасной пример.
  const heardText = capture.result?.transcript || capture.partial || vm.transcript.text;

  return (
    <VoiceActivityShell
      surfaceId={surfaceId}
      vm={vm}
      state={state}
      conditions={{
        online: lab.conditions.online,
        permission: lab.conditions.permission,
        signal: lab.conditions.signal,
        result: 'none',
      }}
      onIntent={lab.logIntent}
      typedFallbackLabel={vm.typed.label}
      captureStatus={capture.status}
      capturePartial={capture.partial}
      onMicStart={capture.start}
      onMicStop={capture.stop}
      reference={
        <View style={s.ref}>
          <GraphemeText text={vm.goal.contextLabel} maxGraphemes={60} style={s.refNote} />
          <GraphemeText text={vm.goal.promptLabel} maxGraphemes={80} style={s.refGoal} />
          <View style={s.controls}>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.hint.reveal"
              payload={{ revealed: !supportRevealed }}
              onIntent={lab.logIntent}
              onPress={() => setSupportRevealed(!supportRevealed)}
              variant="ghost"
              disabled={busy}
              pressed={supportRevealed}
              accessibilityLabel={vm.goal.supportLabel}
            >
              {`${supportRevealed ? '−' : '+'} ${vm.goal.supportLabel}`}
            </IntentButton>
          </View>
          {supportRevealed ? (
            <View style={s.support}>
              <GraphemeText text={vm.goal.supportPhrase} maxGraphemes={60} style={s.supportPhrase} />
              <GraphemeText text={vm.goal.supportNote} maxGraphemes={100} style={s.supportNote} />
            </View>
          ) : null}
        </View>
      }
    >
      <View style={s.wrap}>
        {hasAttempt ? (
          <View style={s.transcript}>
            <GraphemeText text={vm.transcript.heardLabel} maxGraphemes={30} style={s.transcriptHeard} />
            <GraphemeText text={`«${heardText}»`} maxGraphemes={120} style={s.transcriptText} />
            <Chip
              text={edited ? vm.transcript.editedNote : vm.transcript.originLabel}
              tone={edited ? 'warn' : 'muted'}
            />
            <View style={s.transcriptActions}>
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.transcript.edit"
                payload={{}}
                onIntent={lab.logIntent}
                onPress={() => {
                  setEdited(true);
                  setTypedText(heardText);
                  setTypedOpen(true);
                }}
                variant="ghost"
                disabled={busy}
                accessibilityLabel={vm.transcript.editLabel}
              >
                {`✎ ${vm.transcript.editLabel}`}
              </IntentButton>
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.rerecord"
                payload={{}}
                onIntent={lab.logIntent}
                onPress={() => {
                  capture.reset();
                  setEdited(false);
                }}
                variant="ghost"
                disabled={busy}
                accessibilityLabel={vm.transcript.rerecordLabel}
              >
                {`↺ ${vm.transcript.rerecordLabel}`}
              </IntentButton>
              <IntentButton
                surfaceId={surfaceId}
                intent="voice.transcript.send"
                payload={{ edited, origin: edited ? 'learner_edited' : 'asr_raw' }}
                onIntent={lab.logIntent}
                variant="secondary"
                disabled={busy}
                accessibilityLabel={vm.transcript.sendLabel}
              >
                {`➤ ${vm.transcript.sendLabel}`}
              </IntentButton>
            </View>
          </View>
        ) : null}

        {state === 'success' ? (
          <View style={s.result}>
            <GraphemeText text={`✓ ${vm.result.goalMetLabel}`} maxGraphemes={80} style={s.resultGoal} />
            <GraphemeText text={vm.result.evidenceLabel} maxGraphemes={100} style={s.resultLine} />
            <GraphemeText text={vm.result.naturalnessTip} maxGraphemes={120} style={s.resultTip} />
          </View>
        ) : null}

        {typedOpen ? (
          <View style={s.typed}>
            <Text style={s.typedLabel}>{vm.typed.label}</Text>
            <TextInput
              style={s.typedInput}
              value={typedText}
              onChangeText={setTypedText}
              placeholder={vm.typed.placeholder}
              placeholderTextColor={C.fgSecondary}
              multiline
              accessibilityLabel={vm.typed.label}
            />
            <GraphemeText text={vm.typed.note} maxGraphemes={120} style={s.typedNote} />
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.typed.submit"
              payload={{ origin: 'typed', text: typedText }}
              onIntent={lab.logIntent}
              variant="secondary"
              accessibilityLabel={vm.typed.submitLabel}
            >
              {vm.typed.submitLabel}
            </IntentButton>
          </View>
        ) : (
          <IntentButton
            surfaceId={surfaceId}
            intent="voice.typed.open"
            payload={{}}
            onIntent={lab.logIntent}
            onPress={() => setTypedOpen(true)}
            variant="ghost"
            accessibilityLabel={vm.typed.label}
          >
            {`⌨ ${vm.typed.label}`}
          </IntentButton>
        )}
      </View>
    </VoiceActivityShell>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s3 },
  ref: { gap: SPACE.s2, alignItems: 'flex-start' },
  refNote: { fontSize: TEXT.xs, color: C.fgSecondary },
  refGoal: { fontSize: TEXT.xl, fontWeight: WEIGHT.semibold, color: C.fgPrimary, lineHeight: TEXT.xl * LEADING.snug },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  support: {
    gap: SPACE.s1,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.accentSoft,
  },
  supportPhrase: { fontSize: TEXT.md, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  supportNote: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  transcript: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
    alignItems: 'flex-start',
  },
  transcriptHeard: { fontSize: TEXT.xs, color: C.fgSecondary },
  transcriptText: { fontSize: TEXT.lg, color: C.fgPrimary, lineHeight: TEXT.lg * LEADING.snug },
  transcriptActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  result: {
    gap: SPACE.s1,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: '#182B31',
  },
  resultGoal: { fontSize: TEXT.md, fontWeight: WEIGHT.bold, color: C.correct },
  resultLine: { fontSize: TEXT.sm, color: C.fgPrimary },
  resultTip: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  typed: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  typedLabel: { fontSize: TEXT.sm, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  typedInput: {
    minHeight: TOUCH_MIN + 16,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSubtle,
    color: C.fgPrimary,
    fontSize: TEXT.base,
    textAlignVertical: 'top',
  },
  typedNote: { fontSize: TEXT.xs, color: C.fgSecondary, lineHeight: TEXT.xs * LEADING.normal },
});
