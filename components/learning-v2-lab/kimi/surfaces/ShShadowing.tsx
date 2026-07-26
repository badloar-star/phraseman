// зачем: дословный RN-порт source/src/surfaces/modes2/ShShadowing.tsx (SB-08).
// Фраза по кускам с дорожками ударения / ритма / пауз. По умолчанию — отложенное
// повторение («эхо»: сначала эталон, потом повтор); одновременное чтение требует
// наушников (только заметка). При needs_work повтор фокусируется на ОДНОМ куске
// (retryChunkId из фикстуры). Строки обратной связи показывают лишь проверяемые
// признаки — никаких заявлений про акцент.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { shShadowingFixture } from '../fixtures/voice';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from '../tokens';
import { useVoiceCapture } from '../use_voice_capture';
import { VoiceActivityShell } from '../VoiceShell';

export const ShShadowing = memo(function ShShadowing() {
  const lab = useLab();
  const surfaceId = 'sh-shadowing';
  const vm = shShadowingFixture;
  const state = lab.canonicalState;
  const { signal } = lab.conditions;
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);

  const retryChunk = vm.phrase.chunks.find((c) => c.id === vm.retryChunkId) ?? vm.phrase.chunks[0];
  // Фокусный повтор пишет только один кусок — цель биасится под него.
  const capture = useVoiceCapture({
    targetText: state === 'needs_work' ? retryChunk.text : vm.phrase.text,
  });

  const busy = state === 'processing' || capture.status === 'evaluating';
  const refPlaying = signal === 'playing';

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
          <View style={s.chunks}>
            {vm.phrase.chunks.map((chunk, index) => (
              <IntentButton
                key={chunk.id}
                surfaceId={surfaceId}
                intent="voice.chunk.select"
                payload={{ chunkId: chunk.id }}
                onIntent={lab.logIntent}
                onPress={() => setSelectedChunkId(chunk.id)}
                variant="ghost"
                pressed={selectedChunkId === chunk.id}
                style={s.chunkBtn}
                accessibilityLabel={`Кусок ${index + 1}: ${chunk.text}, ударение ${chunk.stress}`}
              >
                <View style={s.chunkBody}>
                  <GraphemeText
                    text={chunk.text}
                    maxGraphemes={40}
                    style={[s.chunkText, refPlaying ? s.chunkPlaying : null]}
                  />
                  <Text style={s.chunkStress}>{chunk.stress}</Text>
                </View>
              </IntentButton>
            ))}
          </View>
          <GraphemeText text={vm.phrase.meaningRu} maxGraphemes={90} style={s.refMeaning} />

          {/* Дорожки просодии — ударение / ритм / паузы, только отображение */}
          <View style={s.lanes}>
            {vm.lanes.map((lane) => (
              <View key={lane.id} style={s.lane}>
                <GraphemeText text={lane.label} maxGraphemes={20} style={s.laneLabel} />
                <GraphemeText text={lane.display} maxGraphemes={60} style={s.laneDisplay} />
              </View>
            ))}
          </View>

          <View style={s.controls}>
            <IntentButton
              surfaceId={surfaceId}
              intent={refPlaying ? 'voice.reference.pause' : 'voice.reference.play'}
              payload={{ target: 'phrase' }}
              onIntent={lab.logIntent}
              variant="secondary"
              disabled={busy}
              accessibilityLabel={refPlaying ? 'Пауза эталона' : 'Прослушать эталон'}
            >
              {`${refPlaying ? '⏸' : '▶'} Прослушать эталон`}
            </IntentButton>
          </View>
          <GraphemeText text={vm.modeNote} maxGraphemes={160} style={s.note} />
        </View>
      }
    >
      <View style={s.wrap}>
        {state === 'needs_work' ? (
          <View style={s.focus}>
            <GraphemeText text={vm.voice.retryScopeLabel} maxGraphemes={60} style={s.focusLabel} />
            <View style={s.focusChunk}>
              <GraphemeText text={retryChunk.text} maxGraphemes={40} style={s.focusChunkText} />
              <Text style={s.chunkStress}>{retryChunk.stress}</Text>
            </View>
            <IntentButton
              surfaceId={surfaceId}
              intent="voice.reference.play"
              payload={{ target: 'chunk', chunkId: retryChunk.id }}
              onIntent={lab.logIntent}
              variant="ghost"
              accessibilityLabel={`Прослушать кусок: ${retryChunk.text}`}
            >
              {`▶ ${retryChunk.text}`}
            </IntentButton>
          </View>
        ) : null}

        {state === 'success' ? (
          <View style={s.resultLanes}>
            {vm.result.rows.map((row) => (
              <View key={row.id} style={s.lane}>
                <GraphemeText text={row.label} maxGraphemes={20} style={s.laneLabel} />
                <GraphemeText text={row.display} maxGraphemes={60} style={s.laneDisplay} />
              </View>
            ))}
            <GraphemeText text={vm.result.evidenceLabel} maxGraphemes={120} style={s.note} />
          </View>
        ) : null}
      </View>
    </VoiceActivityShell>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s3 },
  ref: { gap: SPACE.s2, alignItems: 'flex-start' },
  chunks: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  chunkBtn: { paddingHorizontal: SPACE.s2, paddingVertical: SPACE.s1 },
  chunkBody: { alignItems: 'flex-start', gap: 2 },
  chunkText: { fontSize: TEXT.lg, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  chunkPlaying: { color: C.accentPrimary },
  chunkStress: { fontSize: TEXT.xs, color: C.fgSecondary, letterSpacing: 0.5 },
  refMeaning: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  lanes: { gap: SPACE.s1, width: '100%' },
  resultLanes: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  lane: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.s2 },
  laneLabel: { fontSize: TEXT.xs, color: C.fgSecondary, minWidth: 72 },
  laneDisplay: { flex: 1, fontSize: TEXT.sm, color: C.fgPrimary, lineHeight: TEXT.sm * LEADING.snug },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  note: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  focus: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: '#2A2729',
    alignItems: 'flex-start',
  },
  focusLabel: { fontSize: TEXT.sm, fontWeight: WEIGHT.semibold, color: C.gold },
  focusChunk: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.s2 },
  focusChunkText: { fontSize: TEXT.xl, fontWeight: WEIGHT.bold, color: C.fgPrimary },
});
