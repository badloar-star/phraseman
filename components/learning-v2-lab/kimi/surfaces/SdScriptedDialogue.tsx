// зачем: дословный RN-порт source/src/surfaces/modes2/SdScriptedDialogue.tsx (SB-11).
// Пять записанных заранее реплик: строка партнёра (портрет, субтитры, повтор,
// медленнее) → твоя реплика (ожидаемая функция, зона микрофона, фраза-поддержка) →
// нейтральная обработка → партнёр переспрашивает с частичной подсказкой при
// needs_work → итог с выполненными функциями, сложной репликой и звёздами.
// ОТЛИЧИЕ от поставки: микрофон НАСТОЯЩИЙ (владелец), а не кнопка-симуляция —
// цель распознавания биасится фразой-поддержкой текущей реплики.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActivityShell } from '../ActivityShell';
import { Chip, FeedbackNote } from '../components';
import { sdScriptedDialogueFixture } from '../fixtures/modes2';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, STATE_META, TEXT, TOUCH_MIN, WEIGHT } from '../tokens';
import { useVoiceCapture } from '../use_voice_capture';

export const SdScriptedDialogue = memo(function SdScriptedDialogue() {
  const lab = useLab();
  const surfaceId = 'sd-scripted-dialogue';
  const vm = sdScriptedDialogueFixture;
  const state = lab.canonicalState;
  const meta = STATE_META[state];
  const { permission } = lab.conditions;

  const [turnIdx, setTurnIdx] = useState(0);
  const [supportOpen, setSupportOpen] = useState(false);

  const turn = vm.turns[turnIdx] ?? vm.turns[0];
  const capture = useVoiceCapture({ targetText: turn.yourTurn.supportPhrase.en });

  const micBlocked = permission === 'denied' || capture.status === 'permission_denied';
  const micOn = capture.status === 'listening';
  const interactive = state === 'active';

  return (
    <ActivityShell
      surfaceId={surfaceId}
      state={state}
      mode="pronunciation"
      title={vm.title}
      subtitle={`${vm.brief.role} · ${vm.brief.turnsDisplay}`}
      prompt={
        state === 'prompt' ? (
          <GraphemeText text={vm.brief.situation} maxGraphemes={140} style={s.promptText} />
        ) : undefined
      }
      statusMessage={vm.copy.statusMessages[state] ?? ''}
      feedback={
        <View style={s.feedbackStack}>
          <FeedbackNote
            state={state}
            success={`✓ ${vm.summary.title}`}
            recovery={`↺ ${vm.copy.statusMessages.recovery}`}
          />
          {state === 'needs_work' ? (
            <View style={s.card}>
              <GraphemeText text={vm.repair.cue} maxGraphemes={140} style={s.note} />
              <Chip text={vm.repair.partialLabel} tone="info" />
            </View>
          ) : null}
          {micBlocked && (state === 'active' || state === 'recovery') ? (
            <View style={s.permPanel} accessibilityRole="alert">
              <GraphemeText text={vm.permissionPanel.title} maxGraphemes={60} style={s.permTitle} />
              <GraphemeText text={vm.permissionPanel.body} maxGraphemes={160} style={s.permBody} />
              <IntentButton
                surfaceId={surfaceId}
                intent="permission.open_settings"
                payload={{}}
                onIntent={lab.logIntent}
                variant="secondary"
                accessibilityLabel={vm.permissionPanel.actionLabel}
              >
                {vm.permissionPanel.actionLabel}
              </IntentButton>
            </View>
          ) : null}
        </View>
      }
      primaryAction={{
        label: vm.copy.primaryActions[state] ?? meta.label,
        intent: meta.primaryIntent,
        payload: { turnId: turn.id, micOn, supportOpen, state, permission },
      }}
      onIntent={lab.logIntent}
    >
      <View style={s.wrap}>
        {state === 'prompt' ? (
          <View style={s.card} accessibilityLabel={vm.title}>
            <View style={s.chipsRow}>
              <Chip text={vm.brief.turnsDisplay} tone="info" />
              <Chip text={`✓ ${vm.brief.offlineChip}`} tone="ok" />
            </View>
            <GraphemeText text={vm.fallbackNote} maxGraphemes={140} style={s.note} />
          </View>
        ) : (
          <>
            <View style={s.partner}>
              <View style={s.portrait} accessibilityRole="image" accessibilityLabel={vm.partner.portraitAlt}>
                <Text style={s.portraitGlyph}>👩‍💼</Text>
              </View>
              <View style={s.bubble}>
                <Text style={s.bubbleName}>{vm.partner.name}</Text>
                <GraphemeText text={turn.partner.en} maxGraphemes={120} style={s.bubbleEn} />
                <GraphemeText text={turn.partner.ru} maxGraphemes={120} style={s.bubbleRu} />
                <View style={s.bubbleControls}>
                  <IntentButton
                    surfaceId={surfaceId}
                    intent="dialogue.repeat"
                    payload={{ turnId: turn.id }}
                    onIntent={lab.logIntent}
                    variant="ghost"
                    accessibilityLabel={vm.controls.repeatLabel}
                  >
                    {`↻ ${vm.controls.repeatLabel}`}
                  </IntentButton>
                  <IntentButton
                    surfaceId={surfaceId}
                    intent="dialogue.slower"
                    payload={{ turnId: turn.id }}
                    onIntent={lab.logIntent}
                    variant="ghost"
                    accessibilityLabel={vm.controls.slowerLabel}
                  >
                    {`🐢 ${vm.controls.slowerLabel}`}
                  </IntentButton>
                </View>
              </View>
            </View>

            <View style={s.turn}>
              <GraphemeText text={turn.yourTurn.functionLabel} maxGraphemes={80} style={s.turnFunction} />
              <IntentButton
                surfaceId={surfaceId}
                intent="mic.toggle"
                payload={{ turnId: turn.id, on: !micOn }}
                onIntent={lab.logIntent}
                onPress={() => {
                  // зачем: настоящая запись вместо симуляции — отклик мгновенный,
                  // движок стартует локально и ничего не отправляет по сети
                  if (micOn) capture.stop();
                  else void capture.start();
                }}
                variant={micOn ? 'secondary' : 'primary'}
                disabled={!interactive || micBlocked}
                pressed={micOn}
                style={s.mic}
                accessibilityLabel={
                  micOn ? 'Остановить запись' : `${vm.controls.micLabel}: ${vm.controls.micHint}`
                }
              >
                {micOn ? '⏹ Идёт запись…' : `🎙 ${vm.controls.micLabel}`}
              </IntentButton>
              {/* зачем: живой текст сразу показывает, что микрофон слышит */}
              {micOn && capture.partial ? (
                <GraphemeText text={capture.partial} maxGraphemes={120} style={s.partial} />
              ) : null}
              <IntentButton
                surfaceId={surfaceId}
                intent="support.toggle"
                payload={{ turnId: turn.id, open: !supportOpen }}
                onIntent={lab.logIntent}
                onPress={() => setSupportOpen((v) => !v)}
                variant="ghost"
                pressed={supportOpen}
                accessibilityLabel={vm.controls.supportLabel}
              >
                {`💬 ${vm.controls.supportLabel}`}
              </IntentButton>
              {supportOpen ? (
                <View style={s.support}>
                  <GraphemeText text={turn.yourTurn.supportPhrase.en} maxGraphemes={80} style={s.supportEn} />
                  <GraphemeText text={turn.yourTurn.supportPhrase.ru} maxGraphemes={80} style={s.supportRu} />
                </View>
              ) : null}
              <View style={s.chipsRow} accessibilityLabel="Реплики диалога">
                <IntentButton
                  surfaceId={surfaceId}
                  intent="dialogue.turn_prev"
                  payload={{ turnIdx }}
                  onIntent={lab.logIntent}
                  onPress={() => {
                    setTurnIdx((i) => Math.max(0, i - 1));
                    capture.reset();
                  }}
                  variant="ghost"
                  disabled={turnIdx === 0}
                  accessibilityLabel={vm.controls.prevTurnLabel}
                >
                  {`← ${vm.controls.prevTurnLabel}`}
                </IntentButton>
                <Chip text={`${turnIdx + 1} / ${vm.turns.length}`} tone="muted" />
                <IntentButton
                  surfaceId={surfaceId}
                  intent="dialogue.turn_next"
                  payload={{ turnIdx }}
                  onIntent={lab.logIntent}
                  onPress={() => {
                    setTurnIdx((i) => Math.min(vm.turns.length - 1, i + 1));
                    capture.reset();
                  }}
                  variant="ghost"
                  disabled={turnIdx >= vm.turns.length - 1}
                  accessibilityLabel={vm.controls.nextTurnLabel}
                >
                  {`${vm.controls.nextTurnLabel} →`}
                </IntentButton>
              </View>
            </View>
          </>
        )}

        {state === 'success' ? (
          <View style={s.card} accessibilityLabel={vm.summary.title}>
            <Text style={s.sectionLabel}>{vm.summary.title}</Text>
            <Text style={s.note}>{vm.summary.functionsLabel}</Text>
            <View style={s.list}>
              {vm.summary.functionsDone.map((fn) => (
                <View key={fn} style={s.listItem}>
                  <Text style={s.listCheck}>✓</Text>
                  <GraphemeText text={fn} maxGraphemes={60} style={s.listLabel} />
                </View>
              ))}
            </View>
            <Text style={s.note}>{vm.summary.hardLineLabel}</Text>
            <GraphemeText text={vm.summary.hardLine.en} maxGraphemes={90} style={s.promptText} />
            <GraphemeText text={vm.summary.hardLine.ru} maxGraphemes={90} style={s.note} />
            <IntentButton
              surfaceId={surfaceId}
              intent="dialogue.repeat_hard_line"
              payload={{}}
              onIntent={lab.logIntent}
              variant="secondary"
              accessibilityLabel={vm.summary.repeatLineLabel}
            >
              {`↻ ${vm.summary.repeatLineLabel}`}
            </IntentButton>
            <View style={s.stars}>
              {vm.summary.stars.map((slot) => (
                <View key={slot.id} style={s.starSlot}>
                  <Text style={[s.starGlyph, slot.state === 'earned' ? s.starEarned : null]}>
                    {slot.state === 'earned' ? '★' : '☆'}
                  </Text>
                  <GraphemeText
                    text={slot.state === 'earned' ? slot.earnedLabel : slot.unlockHint}
                    maxGraphemes={70}
                    style={s.starLabel}
                  />
                </View>
              ))}
            </View>
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
  sectionLabel: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.fgSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
  partner: { flexDirection: 'row', gap: SPACE.s3, alignItems: 'flex-start' },
  portrait: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitGlyph: { fontSize: 22 },
  bubble: {
    flex: 1,
    gap: SPACE.s1,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  bubbleName: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.fgSecondary,
    letterSpacing: 0.5,
  },
  bubbleEn: { fontSize: TEXT.md, fontWeight: WEIGHT.medium, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  bubbleRu: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  bubbleControls: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2, marginTop: SPACE.s1 },
  turn: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.card3,
    alignItems: 'flex-start',
  },
  turnFunction: { fontSize: TEXT.md, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  mic: { minHeight: TOUCH_MIN, alignSelf: 'stretch' },
  partial: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  support: {
    gap: SPACE.s1,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.accentSoft,
    alignSelf: 'stretch',
  },
  supportEn: { fontSize: TEXT.md, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  supportRu: { fontSize: TEXT.sm, color: C.fgSecondary },
  list: { gap: SPACE.s2 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s2 },
  listCheck: { fontSize: TEXT.sm, color: C.correct, fontWeight: WEIGHT.bold },
  listLabel: { flex: 1, fontSize: TEXT.sm, color: C.fgPrimary, lineHeight: TEXT.sm * LEADING.snug },
  stars: { gap: SPACE.s2 },
  starSlot: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s2 },
  starGlyph: { fontSize: TEXT.lg, color: C.fgSecondary },
  starEarned: { color: C.gold },
  starLabel: { flex: 1, fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  note: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  promptText: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  feedbackStack: { gap: SPACE.s2 },
  permPanel: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: '#2A1B2B',
    alignItems: 'flex-start',
  },
  permTitle: { fontWeight: WEIGHT.bold, fontSize: TEXT.md, color: C.wrong },
  permBody: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
});
