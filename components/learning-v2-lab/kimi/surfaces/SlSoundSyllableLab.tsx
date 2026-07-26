// зачем: дословный RN-порт source/src/surfaces/modes2/SlSoundSyllableLab.tsx (SB-05).
// Только направляемое «слушай и повторяй»: НИКАКОЙ акустической оценки, никаких
// фонемных чипов и звёзд за звук — пока нет утверждённой калибровки. Контролы:
// Слово / Звук / Моя запись / Повторить + статичная карточка артикуляции.
// Микрофон настоящий (запись на устройстве), но вердикт по звуку не выносится —
// ровно как написано в guidedNote фикстуры.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { slSoundSyllableLabFixture } from '../fixtures/voice';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from '../tokens';
import { useVoiceCapture } from '../use_voice_capture';
import { VoiceActivityShell } from '../VoiceShell';

type PlayTarget = 'word' | 'sound' | 'own' | null;

export const SlSoundSyllableLab = memo(function SlSoundSyllableLab() {
  const lab = useLab();
  const surfaceId = 'sl-sound-syllable-lab';
  const vm = slSoundSyllableLabFixture;
  const state = lab.canonicalState;
  const [playing, setPlaying] = useState<PlayTarget>(null);

  // Настоящая запись: цель биасит движок на слово «think».
  const capture = useVoiceCapture({ targetText: vm.word.text });

  const ownEnabled =
    capture.result !== null || state === 'success' || state === 'needs_work' || state === 'recovery';
  const busy = state === 'processing' || capture.status === 'evaluating';
  const toggle = (target: Exclude<PlayTarget, null>) => () =>
    setPlaying((current) => (current === target ? null : target));

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
      captureStatus={capture.status}
      capturePartial={capture.partial}
      onMicStart={capture.start}
      onMicStop={capture.stop}
      reference={
        <View style={s.ref}>
          <GraphemeText text={vm.word.targetNote} maxGraphemes={60} style={s.refNote} />
          <GraphemeText text={vm.word.text} maxGraphemes={40} style={s.refPhrase} />
          <GraphemeText text={vm.word.meaningRu} maxGraphemes={60} style={s.refMeaning} />
          <Text style={s.refIpa}>
            {vm.word.ipa} <Text style={s.refIpaTarget}>{vm.word.targetSound}</Text>
          </Text>
        </View>
      }
    >
      <View style={s.wrap}>
        {/* Статичная карточка артикуляции — у схемы есть текстовое описание */}
        <View style={s.hint}>
          <Svg viewBox="0 0 64 40" width={64} height={40} accessibilityLabel={vm.soundHint.diagramAlt}>
            <Path d="M8 14 Q20 8 32 14 T56 14" fill="none" stroke={C.accentPrimary} strokeWidth={2} strokeLinecap="round" />
            <Path d="M14 20 h36" stroke={C.accentPrimary} strokeWidth={2} strokeLinecap="round" strokeDasharray="3 3" />
            <Path d="M40 22 q8 4 6 10" fill="none" stroke={C.accentPrimary} strokeWidth={2} strokeLinecap="round" />
            <Circle cx="52" cy="12" r="2.5" fill={C.accentPrimary} />
          </Svg>
          <View style={s.hintTexts}>
            <GraphemeText text={vm.soundHint.title} maxGraphemes={60} style={s.hintTitle} />
            <GraphemeText text={vm.soundHint.body} maxGraphemes={180} style={s.hintBody} />
          </View>
        </View>

        <GraphemeText text={vm.guidedNote} maxGraphemes={160} style={s.note} />

        <View style={s.controls} accessibilityLabel="Прослушать и сравнить">
          <IntentButton
            surfaceId={surfaceId}
            intent="voice.reference.play"
            payload={{ target: 'word' }}
            onIntent={lab.logIntent}
            onPress={toggle('word')}
            variant={playing === 'word' ? 'secondary' : 'ghost'}
            disabled={busy}
            accessibilityLabel={`Прослушать слово: ${vm.word.text}`}
          >
            {`${playing === 'word' ? '⏸' : '▶'} ${vm.controls.wordLabel}`}
          </IntentButton>
          <IntentButton
            surfaceId={surfaceId}
            intent="voice.reference.play"
            payload={{ target: 'sound' }}
            onIntent={lab.logIntent}
            onPress={toggle('sound')}
            variant={playing === 'sound' ? 'secondary' : 'ghost'}
            disabled={busy}
            accessibilityLabel={`Прослушать звук ${vm.word.targetSound}`}
          >
            {`${playing === 'sound' ? '⏸' : '▶'} ${vm.controls.soundLabel}`}
          </IntentButton>
          <IntentButton
            surfaceId={surfaceId}
            intent="voice.own.play"
            payload={{}}
            onIntent={lab.logIntent}
            onPress={toggle('own')}
            variant={playing === 'own' ? 'secondary' : 'ghost'}
            disabled={busy || !ownEnabled}
            accessibilityLabel="Прослушать мою запись"
          >
            {`${playing === 'own' ? '⏸' : '▶'} ${vm.controls.ownLabel}`}
          </IntentButton>
          <IntentButton
            surfaceId={surfaceId}
            intent="voice.retry.focused"
            payload={{ scope: vm.word.text }}
            onIntent={lab.logIntent}
            onPress={capture.reset}
            variant="ghost"
            disabled={busy}
            accessibilityLabel="Повторить попытку"
          >
            {`↺ ${vm.controls.retryLabel}`}
          </IntentButton>
        </View>
      </View>
    </VoiceActivityShell>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s3 },
  ref: { gap: SPACE.s1, alignItems: 'flex-start' },
  refNote: { fontSize: TEXT.xs, color: C.fgSecondary },
  refPhrase: { fontSize: TEXT.xxl, fontWeight: WEIGHT.bold, color: C.fgPrimary },
  refMeaning: { fontSize: TEXT.sm, color: C.fgSecondary },
  refIpa: { fontSize: TEXT.md, color: C.fgPrimary, letterSpacing: 0.5 },
  refIpaTarget: { color: C.accentPrimary, fontWeight: WEIGHT.bold },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  hintTexts: { flex: 1, gap: SPACE.s1 },
  hintTitle: { fontSize: TEXT.md, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  hintBody: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  note: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
});
