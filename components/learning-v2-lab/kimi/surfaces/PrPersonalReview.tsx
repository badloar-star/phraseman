// зачем: дословный RN-порт source/src/surfaces/modes2/PrPersonalReview.tsx —
// персональное повторение (SB-13). Бриф «6 заданий · около 5 минут» с причиной
// («2 фразы после вчерашнего урока…»), затем очередь заданий обычными строками
// выбора — без особых «визуалов повторения». Тон спокойный: «Повторим 5 фраз»,
// никогда «5 ошибок». Обратная связь — одна причина и одна подсказка.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActivityShell } from '../ActivityShell';
import { Chip, FeedbackNote, OptionGrid } from '../components';
import { prPersonalReviewFixture } from '../fixtures/modes2';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, STATE_META, TEXT, WEIGHT } from '../tokens';

export const PrPersonalReview = memo(function PrPersonalReview() {
  const lab = useLab();
  const surfaceId = 'pr-personal-review';
  const vm = prPersonalReviewFixture;
  const state = lab.canonicalState;
  const meta = STATE_META[state];
  const { online } = lab.conditions;

  const [itemIdx, setItemIdx] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const item = vm.items[itemIdx] ?? vm.items[0];
  const reveal = state === 'success' || state === 'needs_work';

  return (
    <ActivityShell
      surfaceId={surfaceId}
      state={state}
      mode="missing-word"
      title={vm.title}
      subtitle={`${vm.brief.sizeDisplay} · ${vm.positionDisplay}`}
      prompt={
        state === 'prompt' ? (
          <GraphemeText
            text={`${vm.brief.copyLine} — ${vm.brief.reasonDisplay}`}
            maxGraphemes={150}
            style={s.promptText}
          />
        ) : undefined
      }
      statusMessage={state === 'success' ? vm.completion.summary : (vm.copy.statusMessages[state] ?? '')}
      feedback={
        <View style={s.feedbackStack}>
          <FeedbackNote
            state={state}
            success={`✓ ${vm.completion.summary}`}
            recovery={`↺ ${vm.copy.statusMessages.recovery}`}
          />
          {state === 'needs_work' ? (
            <View style={s.card}>
              <GraphemeText text={item.reason} maxGraphemes={90} style={s.note} />
              <GraphemeText text={`💡 ${item.hint}`} maxGraphemes={110} style={s.note} />
            </View>
          ) : null}
          {!online ? <GraphemeText text={vm.offlineNote} maxGraphemes={120} style={s.note} /> : null}
        </View>
      }
      primaryAction={{
        label: vm.copy.primaryActions[state] ?? meta.label,
        intent: meta.primaryIntent,
        payload: { itemId: item.id, selectedOptionId, state, online },
      }}
      secondaryAction={
        state === 'active' && item.optional
          ? { label: vm.skipLabel, intent: 'review.skip_item', payload: { itemId: item.id } }
          : undefined
      }
      onIntent={lab.logIntent}
    >
      <View style={s.wrap}>
        {state === 'prompt' ? (
          <View style={s.card} accessibilityLabel={vm.queueLabel}>
            <View style={s.chipsRow}>
              <Chip text={vm.brief.sizeDisplay} tone="info" />
              <Chip text={vm.brief.reasonDisplay} tone="muted" />
            </View>
          </View>
        ) : (
          <>
            <View style={s.card} accessibilityLabel={item.promptLabel}>
              <View style={s.chipsRow}>
                <Chip text={item.typeLabel} tone="muted" />
                <Chip text={item.dueReason} tone="info" />
              </View>
              <GraphemeText text={item.promptLabel} maxGraphemes={110} style={s.promptText} />
              <OptionGrid
                surfaceId={surfaceId}
                options={item.options}
                correctOptionId={item.correctOptionId}
                selectedId={selectedOptionId}
                onSelected={setSelectedOptionId}
                enabled={state === 'active'}
                reveal={reveal}
                intentType="review.answer"
              />
              <View style={s.chipsRow} accessibilityLabel="Навигация по очереди">
                <IntentButton
                  surfaceId={surfaceId}
                  intent="review.item_prev"
                  payload={{ itemIdx }}
                  onIntent={lab.logIntent}
                  onPress={() => {
                    setItemIdx((i) => Math.max(0, i - 1));
                    setSelectedOptionId(null);
                  }}
                  variant="ghost"
                  disabled={itemIdx === 0}
                  accessibilityLabel="Предыдущее задание"
                >
                  ← Назад
                </IntentButton>
                <IntentButton
                  surfaceId={surfaceId}
                  intent="review.item_next"
                  payload={{ itemIdx }}
                  onIntent={lab.logIntent}
                  onPress={() => {
                    setItemIdx((i) => Math.min(vm.items.length - 1, i + 1));
                    setSelectedOptionId(null);
                  }}
                  variant="ghost"
                  disabled={itemIdx >= vm.items.length - 1}
                  accessibilityLabel="Следующее задание"
                >
                  Дальше →
                </IntentButton>
              </View>
            </View>

            <View style={s.queue} accessibilityLabel={vm.queueLabel}>
              {vm.items.map((entry, index) => (
                <View key={entry.id} style={[s.queueItem, index === itemIdx ? s.queueItemCurrent : null]}>
                  <Chip text={entry.typeLabel} tone={index === itemIdx ? 'info' : 'muted'} />
                  <View style={s.queueMeta}>
                    <GraphemeText text={entry.promptLabel} maxGraphemes={44} style={s.queueTitle} />
                    <GraphemeText text={entry.dueReason} maxGraphemes={44} style={s.queueReason} />
                  </View>
                  {entry.optional ? <Chip text="можно пропустить" tone="muted" /> : null}
                </View>
              ))}
            </View>
          </>
        )}
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
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
  queue: { gap: SPACE.s2 },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSubtle,
  },
  queueItemCurrent: { backgroundColor: C.accentSoft },
  queueMeta: { flex: 1, gap: 2 },
  queueTitle: { fontSize: TEXT.sm, color: C.fgPrimary },
  queueReason: { fontSize: TEXT.xs, color: C.fgSecondary },
  note: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  promptText: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  feedbackStack: { gap: SPACE.s2 },
});
