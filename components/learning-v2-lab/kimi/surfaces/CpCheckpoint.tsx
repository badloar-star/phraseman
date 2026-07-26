// зачем: дословный RN-порт source/src/surfaces/modes2/CpCheckpoint.tsx —
// чекпоинт/проверка (SB-14). Вступление о готовности (список can-do, знакомые типы
// заданий, подсказки скрыты, никаких обещаний CEFR) → смешанная последовательность
// с видимым общим прогрессом и БЕЗ таймера → неуверенность распознавания даёт
// бесплатную эквивалентную попытку (никогда не отметку «неверно») → пауза/возврат →
// разбор результата can-do с конкретным планом повторения. Тон спокойный:
// никакого «экзамен провален», заработанные звёзды не отбираются.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActivityShell } from '../ActivityShell';
import { Chip, FeedbackNote, OptionGrid } from '../components';
import { cpCheckpointFixture } from '../fixtures/modes2';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, STATE_META, TEXT, WEIGHT } from '../tokens';

export const CpCheckpoint = memo(function CpCheckpoint() {
  const lab = useLab();
  const surfaceId = 'cp-checkpoint';
  const vm = cpCheckpointFixture;
  const state = lab.canonicalState;
  const meta = STATE_META[state];

  const [taskIdx, setTaskIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const task = vm.tasks[taskIdx] ?? vm.tasks[0];
  const reveal = state === 'success' || state === 'needs_work';

  return (
    <ActivityShell
      surfaceId={surfaceId}
      state={state}
      mode="natural-choice"
      title={vm.title}
      subtitle={vm.intro.mixedNote}
      prompt={
        state === 'prompt' ? (
          <GraphemeText
            text={`${vm.intro.hintsHiddenNotice} · ${vm.intro.noCertNote}`}
            maxGraphemes={160}
            style={s.promptText}
          />
        ) : undefined
      }
      statusMessage={vm.copy.statusMessages[state] ?? ''}
      feedback={
        <View style={s.feedbackStack}>
          <FeedbackNote
            state={state}
            success={`✓ ${vm.result.title}`}
            needsWork={vm.copy.statusMessages.needs_work}
          />
          {state === 'needs_work' ? (
            <View style={s.card}>
              <GraphemeText text={vm.voiceUncertainty.title} maxGraphemes={60} style={s.cardTitle} />
              <GraphemeText text={vm.voiceUncertainty.body} maxGraphemes={140} style={s.note} />
              <IntentButton
                surfaceId={surfaceId}
                intent="checkpoint.alt_attempt"
                payload={{ taskId: task.id, free: true }}
                onIntent={lab.logIntent}
                variant="secondary"
                accessibilityLabel={vm.voiceUncertainty.retryLabel}
              >
                {vm.voiceUncertainty.retryLabel}
              </IntentButton>
            </View>
          ) : null}
          {state === 'recovery' ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>{vm.pause.pausedTitle}</Text>
              <GraphemeText text={vm.pause.pausedBody} maxGraphemes={120} style={s.note} />
            </View>
          ) : null}
        </View>
      }
      primaryAction={{
        label: vm.copy.primaryActions[state] ?? meta.label,
        intent: state === 'recovery' ? 'checkpoint.resume' : meta.primaryIntent,
        payload: { taskId: task.id, selectedOptionId, state },
      }}
      secondaryAction={
        state === 'active'
          ? { label: vm.pause.pauseLabel, intent: 'checkpoint.pause', payload: { taskId: task.id } }
          : undefined
      }
      onIntent={lab.logIntent}
    >
      <View style={s.wrap}>
        {state === 'prompt' ? (
          <View style={s.card} accessibilityLabel={vm.intro.canDoLabel}>
            <Text style={s.sectionLabel}>{vm.intro.canDoLabel}</Text>
            <View style={s.list}>
              {vm.intro.canDoList.map((cando) => (
                <View key={cando} style={s.listItem}>
                  <Text style={s.listBullet}>•</Text>
                  <GraphemeText text={cando} maxGraphemes={70} style={s.listLabel} />
                </View>
              ))}
            </View>
            <View style={s.chipsRow}>
              <Chip text={vm.intro.hintsHiddenNotice} tone="warn" />
              <Chip text="без таймера" tone="muted" />
            </View>
          </View>
        ) : (
          <View style={s.card} accessibilityLabel={task.promptLabel}>
            <View style={s.chipsRow}>
              <Chip text={task.typeLabel} tone="info" />
              <Chip text={vm.progressDisplay} tone="muted" />
            </View>
            <View style={s.bar}>
              <View style={[s.barFill, { width: `${vm.progressPercent}%` }]} />
            </View>
            <GraphemeText text={task.promptLabel} maxGraphemes={140} style={s.promptText} />
            <OptionGrid
              surfaceId={surfaceId}
              options={task.options}
              correctOptionId={task.correctOptionId}
              selectedId={selectedOptionId}
              onSelected={setSelectedOptionId}
              enabled={state === 'active'}
              reveal={reveal}
              intentType="checkpoint.answer"
            />
            <View style={s.chipsRow} accessibilityLabel="Навигация по заданиям">
              <IntentButton
                surfaceId={surfaceId}
                intent="checkpoint.task_prev"
                payload={{ taskIdx }}
                onIntent={lab.logIntent}
                onPress={() => {
                  setTaskIdx((i) => Math.max(0, i - 1));
                  setSelectedOptionId(null);
                }}
                variant="ghost"
                disabled={taskIdx === 0}
                accessibilityLabel="Предыдущее задание"
              >
                ← Назад
              </IntentButton>
              <IntentButton
                surfaceId={surfaceId}
                intent="checkpoint.task_next"
                payload={{ taskIdx }}
                onIntent={lab.logIntent}
                onPress={() => {
                  setTaskIdx((i) => Math.min(vm.tasks.length - 1, i + 1));
                  setSelectedOptionId(null);
                }}
                variant="ghost"
                disabled={taskIdx >= vm.tasks.length - 1}
                accessibilityLabel="Следующее задание"
              >
                Дальше →
              </IntentButton>
            </View>
          </View>
        )}

        {state === 'success' || state === 'needs_work' ? (
          <View style={s.card} accessibilityLabel={vm.result.title}>
            <Text style={s.sectionLabel}>{vm.result.title}</Text>
            <View style={s.list}>
              {vm.result.rows.map((row) => (
                <View key={row.id} style={s.candoRow}>
                  <Text style={[s.candoBadge, row.status === 'can' ? s.candoBadgeCan : s.candoBadgePractice]}>
                    {row.status === 'can' ? '✓' : '↺'}
                  </Text>
                  <View style={s.candoTexts}>
                    <GraphemeText text={row.label} maxGraphemes={70} style={s.candoLabel} />
                    <GraphemeText text={row.note} maxGraphemes={70} style={s.candoNote} />
                  </View>
                </View>
              ))}
            </View>
            <Text style={s.sectionLabel}>{vm.result.evidenceLabel}</Text>
            <View style={s.chipsRow}>
              {vm.result.evidenceRows.map((row) => (
                <Chip key={row} text={row} tone="muted" />
              ))}
            </View>
            <Text style={s.sectionLabel}>{vm.result.reinforcementTitle}</Text>
            <View style={s.list}>
              {vm.result.reinforcementItems.map((row) => (
                <View key={row} style={s.listItem}>
                  <Text style={s.listBullet}>•</Text>
                  <GraphemeText text={row} maxGraphemes={70} style={s.listLabel} />
                </View>
              ))}
            </View>
            <GraphemeText text={vm.result.calmNote} maxGraphemes={140} style={s.note} />
          </View>
        ) : null}
      </View>
    </ActivityShell>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s3 },
  card: {
    gap: SPACE.s3,
    paddingVertical: SPACE.s4,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  cardTitle: { fontSize: TEXT.md, fontWeight: WEIGHT.bold, color: C.fgPrimary },
  sectionLabel: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.fgSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
  bar: { height: 8, borderRadius: RADIUS.pill, backgroundColor: C.bgSubtle, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: C.accentEdge },
  list: { gap: SPACE.s2 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s2 },
  listBullet: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  listLabel: { flex: 1, fontSize: TEXT.sm, color: C.fgPrimary, lineHeight: TEXT.sm * LEADING.snug },
  candoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s2 },
  candoBadge: { fontSize: TEXT.md, fontWeight: WEIGHT.bold },
  candoBadgeCan: { color: C.correct },
  candoBadgePractice: { color: C.gold },
  candoTexts: { flex: 1, gap: 2 },
  candoLabel: { fontSize: TEXT.sm, color: C.fgPrimary, lineHeight: TEXT.sm * LEADING.snug },
  candoNote: { fontSize: TEXT.xs, color: C.fgSecondary },
  note: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  promptText: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  feedbackStack: { gap: SPACE.s2 },
});
