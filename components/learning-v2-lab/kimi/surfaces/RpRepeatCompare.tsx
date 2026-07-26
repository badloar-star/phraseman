// зачем: дословный RN-порт source/src/surfaces/modes2/RpRepeatCompare.tsx (SB-06).
// Эталонная фраза с разбивкой на куски, повтор и замедление. Вердикт ЧЕСТНЫЙ:
// «Фраза распознана» подтверждает только слова и их порядок — никаких заявлений
// про акцент. «Моя запись» и «Эталон» стоят рядом, текущий источник подписан.
// ОТЛИЧИЕ от поставки: чипы слов подсвечиваются по РЕАЛЬНО услышанному
// (владелец выбрал настоящий микрофон), а не по запечённому списку.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { rpRepeatCompareFixture } from '../fixtures/voice';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from '../tokens';
import { useVoiceCapture } from '../use_voice_capture';
import { VoiceActivityShell } from '../VoiceShell';

type Source = 'own' | 'ref' | null;

export const RpRepeatCompare = memo(function RpRepeatCompare() {
  const lab = useLab();
  const surfaceId = 'rp-repeat-compare';
  const vm = rpRepeatCompareFixture;
  const state = lab.canonicalState;
  const { signal } = lab.conditions;
  const [nowPlaying, setNowPlaying] = useState<Source>(null);
  const [slower, setSlower] = useState(false);

  const capture = useVoiceCapture({ targetText: vm.phrase.text });

  const busy = state === 'processing' || capture.status === 'evaluating';
  const ownEnabled =
    capture.result !== null || state === 'success' || state === 'needs_work' || state === 'recovery';
  const refPlaying = signal === 'playing' || nowPlaying === 'ref';
  const showChips = state === 'success' || capture.result !== null;

  return (
    <VoiceActivityShell
      surfaceId={surfaceId}
      vm={vm}
      state={state}
      conditions={{
        online: lab.conditions.online,
        permission: lab.conditions.permission,
        signal: lab.conditions.signal,
        result: capture.result ? (capture.result.allMatched ? 'correct' : 'incorrect') : 'none',
      }}
      onIntent={lab.logIntent}
      captureStatus={capture.status}
      capturePartial={capture.partial}
      onMicStart={capture.start}
      onMicStop={capture.stop}
      reference={
        <View style={s.ref}>
          <View style={s.chunks}>
            {vm.phrase.chunks.map((chunk) => (
              <GraphemeText
                key={chunk.id}
                text={chunk.text}
                maxGraphemes={40}
                style={[s.chunk, refPlaying ? s.chunkPlaying : null]}
              />
            ))}
          </View>
          <GraphemeText text={vm.phrase.meaningRu} maxGraphemes={80} style={s.refMeaning} />
          <GraphemeText text={vm.phrase.ipa} maxGraphemes={60} style={s.refIpa} />
          <View style={s.controls} accessibilityLabel="Эталон">
            <IntentButton
              surfaceId={surfaceId}
              intent={refPlaying ? 'voice.reference.pause' : 'voice.reference.play'}
              payload={{ target: 'phrase' }}
              onIntent={lab.logIntent}
              onPress={() => setNowPlaying(refPlaying ? null : 'ref')}
              variant="secondary"
              disabled={busy}
              accessibilityLabel={refPlaying ? 'Пауза эталона' : 'Прослушать эталон'}
            >
              {`${refPlaying ? '⏸' : '▶'} ${vm.compare.refLabel}`}
            </IntentButton>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.reference.slower"
              payload={{ slower: !slower }}
              onIntent={lab.logIntent}
              onPress={() => setSlower(!slower)}
              variant={slower ? 'secondary' : 'ghost'}
              disabled={busy}
              pressed={slower}
              accessibilityLabel="Медленнее"
            >
              {`0.75× ${vm.compare.slowerLabel}`}
            </IntentButton>
          </View>
        </View>
      }
    >
      <View style={s.wrap}>
        {showChips ? (
          <View style={s.chips}>
            {/* зачем: подсветка по фактически услышанным словам — живая обратная
                связь вместо запечённого списка (микрофон настоящий) */}
            {vm.wordChips.map((word, index) => {
              const heard = capture.matchedFlags[index] ?? false;
              return (
                <View key={word} style={[s.chipWord, heard ? s.chipWordHeard : null]}>
                  <Text style={[s.chipMark, heard ? s.chipMarkHeard : null]}>{heard ? '✓' : '·'}</Text>
                  <GraphemeText text={word} maxGraphemes={16} style={s.chipText} />
                </View>
              );
            })}
          </View>
        ) : null}

        {/* «Моя запись» vs «Эталон» — рядом, текущий источник подписан */}
        <View style={s.rows} accessibilityLabel="Сравнение записей">
          {/* зачем: строка «сейчас играет» зарезервирована всегда — иначе при
              старте воспроизведения строки сравнения прыгают вниз */}
          <Text style={s.nowPlaying} numberOfLines={1}>
            {nowPlaying
              ? `${vm.compare.nowPlayingLabel}: ${nowPlaying === 'own' ? vm.compare.ownLabel : vm.compare.refLabel}`
              : ' '}
          </Text>
          <View style={s.row}>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.own.play"
              payload={{}}
              onIntent={lab.logIntent}
              onPress={() => setNowPlaying(nowPlaying === 'own' ? null : 'own')}
              variant="secondary"
              disabled={busy || !ownEnabled}
              accessibilityLabel={`Прослушать: ${vm.compare.ownLabel}`}
            >
              {`${nowPlaying === 'own' ? '⏸' : '▶'} ${vm.compare.ownLabel}`}
            </IntentButton>
            <View style={s.rowBar}>
              <View style={[s.rowFill, { width: nowPlaying === 'own' ? '62%' : '0%' }]} />
            </View>
            <Text style={s.rowDur}>{vm.compare.ownDurationDisplay}</Text>
          </View>
          <View style={s.row}>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.reference.play"
              payload={{ target: 'phrase' }}
              onIntent={lab.logIntent}
              onPress={() => setNowPlaying(nowPlaying === 'ref' ? null : 'ref')}
              variant="secondary"
              disabled={busy}
              accessibilityLabel={`Прослушать: ${vm.compare.refLabel}`}
            >
              {`${nowPlaying === 'ref' ? '⏸' : '▶'} ${vm.compare.refLabel}`}
            </IntentButton>
            <View style={s.rowBar}>
              <View style={[s.rowFill, { width: nowPlaying === 'ref' ? '62%' : '0%' }]} />
            </View>
            <Text style={s.rowDur}>{vm.compare.refDurationDisplay}</Text>
          </View>
        </View>
      </View>
    </VoiceActivityShell>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s3 },
  ref: { gap: SPACE.s2, alignItems: 'flex-start' },
  chunks: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  chunk: { fontSize: TEXT.xl, fontWeight: WEIGHT.semibold, color: C.fgPrimary, lineHeight: TEXT.xl * LEADING.snug },
  chunkPlaying: { color: C.accentPrimary },
  refMeaning: { fontSize: TEXT.sm, color: C.fgSecondary },
  refIpa: { fontSize: TEXT.sm, color: C.fgSecondary, letterSpacing: 0.5 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  chipWord: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s1,
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s2,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
  },
  chipWordHeard: { backgroundColor: '#182B31' },
  chipMark: { fontSize: TEXT.sm, color: C.fgSecondary },
  chipMarkHeard: { color: C.correct, fontWeight: WEIGHT.bold },
  chipText: { fontSize: TEXT.sm, color: C.fgPrimary },
  rows: { gap: SPACE.s2 },
  nowPlaying: { fontSize: TEXT.xs, color: C.fgSecondary, minHeight: TEXT.xs * LEADING.normal },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s2 },
  rowBar: { flex: 1, height: 6, borderRadius: RADIUS.pill, backgroundColor: C.bgSubtle, overflow: 'hidden' },
  rowFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: C.accentEdge },
  rowDur: { fontSize: TEXT.xs, color: C.fgSecondary, letterSpacing: 0.5 },
});
