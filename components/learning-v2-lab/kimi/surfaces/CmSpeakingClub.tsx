// зачем: дословный RN-порт source/src/surfaces/modes2/CmSpeakingClub.tsx (SB-12) —
// капстоун «клуб разговоров»: бриф миссии, реплика партнёра, редактируемый превью
// транскрипта («Мы услышали»), чек-лист целей, разбор звёзд, оффлайн-баннер.
//
// ВАЖНОЕ ОТЛИЧИЕ от поставки: у Kimi вход в миссию — экран согласия на СЕТЕВУЮ
// обработку голоса (сервер, хранение 30 дней). Владелец выбрал распознавание
// ТОЛЬКО на устройстве, поэтому показывать тот экран нельзя: он обещал бы
// передачу и хранение, которых нет, и разошёлся бы с политикой приватности.
// Вместо него — правдивая сводка onDevicePrivacy: голос не покидает телефон.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ActivityShell } from '../ActivityShell';
import { Chip, FeedbackNote } from '../components';
import { cmSpeakingClubFixture } from '../fixtures/modes2';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, STATE_META, TEXT, TOUCH_MIN, WEIGHT } from '../tokens';
import { useVoiceCapture } from '../use_voice_capture';

export const CmSpeakingClub = memo(function CmSpeakingClub() {
  const lab = useLab();
  const surfaceId = 'cm-speaking-club';
  const vm = cmSpeakingClubFixture;
  const state = lab.canonicalState;
  const meta = STATE_META[state];
  const { online, permission } = lab.conditions;

  const [transcript, setTranscript] = useState(vm.transcriptPreview.text);
  const [edited, setEdited] = useState(false);

  // Свободная реплика: заранее известного текста нет, опора — полезные фразы.
  const capture = useVoiceCapture({
    targetText: vm.mission.usefulPhrases[0] ?? '',
    freeSpeech: true,
  });

  const micBlocked = permission === 'denied' || capture.status === 'permission_denied';
  const micOn = capture.status === 'listening';
  const interactive = state === 'active';

  // Живой транскрипт замещает запечённый, как только микрофон что-то услышал.
  const heard = capture.result?.transcript || capture.partial;
  const shownTranscript = edited ? transcript : heard || transcript;

  return (
    <ActivityShell
      surfaceId={surfaceId}
      state={state}
      mode="pronunciation"
      title={vm.title}
      subtitle={`${vm.mission.durationDisplay} · ${vm.mission.objectives.length} цели`}
      prompt={
        state === 'prompt' ? (
          <GraphemeText text={vm.mission.scenario} maxGraphemes={160} style={s.promptText} />
        ) : undefined
      }
      statusMessage={vm.copy.statusMessages[state] ?? ''}
      feedback={
        <View style={s.feedbackStack}>
          <FeedbackNote
            state={state}
            success={`✓ ${vm.starBreakdown.title}`}
            recovery={`↺ ${vm.copy.statusMessages.recovery}`}
          />
          {state === 'needs_work' ? (
            <View style={s.card}>
              <Text style={s.sectionLabel}>{vm.correctionsLabel}</Text>
              {vm.corrections.map((correction) => (
                <View key={correction.id} style={s.correction}>
                  <GraphemeText text={correction.label} maxGraphemes={40} style={s.correctionLabel} />
                  <GraphemeText text={correction.body} maxGraphemes={140} style={s.note} />
                </View>
              ))}
            </View>
          ) : null}
          {!online ? (
            <View style={s.banner}>
              <Text style={s.bannerTitle}>{vm.offlineBanner.title}</Text>
              <GraphemeText text={vm.offlineBanner.body} maxGraphemes={160} style={s.bannerBody} />
              <View style={s.chipsRow}>
                <IntentButton
                  surfaceId={surfaceId}
                  intent="club.offline.scripted"
                  payload={{}}
                  onIntent={lab.logIntent}
                  variant="secondary"
                  accessibilityLabel={vm.offlineBanner.scriptedLabel}
                >
                  {vm.offlineBanner.scriptedLabel}
                </IntentButton>
                <IntentButton
                  surfaceId={surfaceId}
                  intent="club.offline.later"
                  payload={{}}
                  onIntent={lab.logIntent}
                  variant="ghost"
                  accessibilityLabel={vm.offlineBanner.laterLabel}
                >
                  {vm.offlineBanner.laterLabel}
                </IntentButton>
              </View>
            </View>
          ) : null}
        </View>
      }
      primaryAction={{
        label: vm.copy.primaryActions[state] ?? meta.label,
        intent: meta.primaryIntent,
        payload: {
          transcript: shownTranscript,
          origin: edited ? 'learner_edited' : 'asr_raw',
          route: 'on_device',
          state,
          online,
        },
      }}
      onIntent={lab.logIntent}
    >
      <View style={s.wrap}>
        {state === 'prompt' ? (
          <>
            <View style={s.card} accessibilityLabel={vm.mission.objectivesLabel}>
              <Text style={s.sectionLabel}>{vm.mission.objectivesLabel}</Text>
              <View style={s.list}>
                {vm.mission.objectives.map((obj) => (
                  <View key={obj.id} style={s.listItem}>
                    <Text style={[s.listCheck, obj.done ? s.listCheckDone : null]}>✓</Text>
                    <GraphemeText
                      text={obj.label}
                      maxGraphemes={60}
                      style={[s.listLabel, obj.done ? s.listLabelDone : null]}
                    />
                  </View>
                ))}
              </View>
              <Text style={s.sectionLabel}>{vm.mission.phrasesLabel}</Text>
              <View style={s.chipsRow}>
                {vm.mission.usefulPhrases.map((phrase) => (
                  <Chip key={phrase} text={phrase} tone="muted" />
                ))}
              </View>
            </View>

            {/* Правдивая сводка вместо сетевого согласия: голос остаётся в телефоне */}
            <View style={s.card} accessibilityLabel={vm.onDevicePrivacy.title}>
              <Text style={s.sectionLabel}>{vm.onDevicePrivacy.title}</Text>
              <GraphemeText text={vm.onDevicePrivacy.summary} maxGraphemes={160} style={s.note} />
              <View style={s.kvList}>
                {vm.onDevicePrivacy.rows.map((row) => (
                  <View key={row.id} style={s.kvRow}>
                    <GraphemeText text={row.label} maxGraphemes={30} style={s.kvLabel} />
                    <GraphemeText text={row.value} maxGraphemes={60} style={s.kvValue} />
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={s.partner}>
              <View style={s.portrait} accessibilityRole="image" accessibilityLabel={vm.partner.portraitAlt}>
                <Text style={s.portraitGlyph}>👩‍🍳</Text>
              </View>
              <View style={s.bubble}>
                <Text style={s.bubbleName}>{vm.partner.name}</Text>
                {state === 'processing' ? (
                  <Text style={s.typing} accessibilityLabel={vm.transcriptPreview.thinkingLabel}>
                    {vm.transcriptPreview.thinkingLabel}
                  </Text>
                ) : (
                  <>
                    <GraphemeText text={vm.partner.line.en} maxGraphemes={120} style={s.bubbleEn} />
                    <GraphemeText text={vm.partner.line.ru} maxGraphemes={120} style={s.bubbleRu} />
                  </>
                )}
                <View style={s.bubbleControls}>
                  <IntentButton
                    surfaceId={surfaceId}
                    intent="club.repeat"
                    payload={{}}
                    onIntent={lab.logIntent}
                    variant="ghost"
                    accessibilityLabel="Повторить"
                  >
                    ↻ Повторить
                  </IntentButton>
                  <IntentButton
                    surfaceId={surfaceId}
                    intent="club.slower"
                    payload={{}}
                    onIntent={lab.logIntent}
                    variant="ghost"
                    accessibilityLabel="Медленнее"
                  >
                    🐢 Медленнее
                  </IntentButton>
                </View>
              </View>
            </View>

            <View style={s.turn}>
              <IntentButton
                surfaceId={surfaceId}
                intent="mic.toggle"
                payload={{ on: !micOn }}
                onIntent={lab.logIntent}
                onPress={() => {
                  if (micOn) capture.stop();
                  else void capture.start();
                }}
                variant={micOn ? 'secondary' : 'primary'}
                disabled={!interactive || micBlocked}
                pressed={micOn}
                style={s.mic}
                accessibilityLabel={micOn ? 'Остановить запись' : 'Говорить'}
              >
                {micOn ? '⏹ Идёт запись…' : '🎙 Говорить'}
              </IntentButton>
              {micBlocked ? (
                <Text style={s.note}>Микрофон выключен — можно продолжить текстом.</Text>
              ) : null}

              <View style={s.transcriptBox}>
                <Text style={s.transcriptLabel}>{vm.transcriptPreview.heardLabel}</Text>
                <TextInput
                  style={s.transcriptArea}
                  value={shownTranscript}
                  onChangeText={(next) => {
                    setTranscript(next);
                    setEdited(true);
                  }}
                  editable={interactive}
                  multiline
                  accessibilityLabel="Расшифровка твоей реплики — можно поправить"
                />
                <View style={s.chipsRow}>
                  <Chip
                    text={edited ? vm.transcriptPreview.originEditedLabel : vm.transcriptPreview.originAsrLabel}
                    tone={edited ? 'warn' : 'info'}
                  />
                  <IntentButton
                    surfaceId={surfaceId}
                    intent="transcript.save_edit"
                    payload={{ origin: 'learner_edited' }}
                    onIntent={lab.logIntent}
                    onPress={() => setEdited(true)}
                    variant="ghost"
                    disabled={!interactive}
                    accessibilityLabel={vm.transcriptPreview.saveEditLabel}
                  >
                    {vm.transcriptPreview.saveEditLabel}
                  </IntentButton>
                </View>
                <GraphemeText text={vm.transcriptPreview.editHint} maxGraphemes={90} style={s.note} />
              </View>
            </View>

            <View style={s.card} accessibilityLabel={vm.objectivesDrawerLabel}>
              <Text style={s.sectionLabel}>{vm.objectivesDrawerLabel}</Text>
              <View style={s.list}>
                {vm.mission.objectives.map((obj) => (
                  <View key={obj.id} style={s.listItem}>
                    <Text style={[s.listCheck, obj.done ? s.listCheckDone : null]}>✓</Text>
                    <GraphemeText
                      text={obj.label}
                      maxGraphemes={60}
                      style={[s.listLabel, obj.done ? s.listLabelDone : null]}
                    />
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {state === 'success' ? (
          <View style={s.card} accessibilityLabel={vm.starBreakdown.title}>
            <Text style={s.sectionLabel}>{vm.starBreakdown.title}</Text>
            <View style={s.stars}>
              {vm.starBreakdown.slots.map((slot) => (
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
            <GraphemeText text={vm.starBreakdown.voiceNote} maxGraphemes={140} style={s.note} />
            <GraphemeText text={vm.starBreakdown.textFallbackNote} maxGraphemes={140} style={s.note} />
            <IntentButton
              surfaceId={surfaceId}
              intent="club.repeat_key_line"
              payload={{}}
              onIntent={lab.logIntent}
              variant="secondary"
              accessibilityLabel={vm.starBreakdown.repeatKeyLineLabel}
            >
              {`↻ ${vm.starBreakdown.repeatKeyLineLabel}: «${vm.starBreakdown.keyLine.en}»`}
            </IntentButton>
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
  list: { gap: SPACE.s2 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s2 },
  listCheck: { fontSize: TEXT.sm, color: C.fgSecondary, opacity: 0.4 },
  listCheckDone: { color: C.correct, opacity: 1 },
  listLabel: { flex: 1, fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  listLabelDone: { color: C.fgPrimary },
  kvList: { gap: SPACE.s2 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACE.s3 },
  kvLabel: { fontSize: TEXT.sm, color: C.fgSecondary },
  kvValue: { flex: 1, fontSize: TEXT.sm, color: C.fgPrimary, textAlign: 'right' },
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
  bubbleName: { fontSize: TEXT.xs, fontWeight: WEIGHT.bold, color: C.fgSecondary, letterSpacing: 0.5 },
  bubbleEn: { fontSize: TEXT.md, fontWeight: WEIGHT.medium, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  bubbleRu: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  bubbleControls: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2, marginTop: SPACE.s1 },
  // зачем: «печатает…» занимает ту же строку, что и реплика — пузырь не прыгает
  typing: { fontSize: TEXT.md, color: C.fgSecondary, lineHeight: TEXT.md * LEADING.snug },
  turn: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.card3,
  },
  mic: { minHeight: TOUCH_MIN },
  transcriptBox: { gap: SPACE.s2 },
  transcriptLabel: { fontSize: TEXT.xs, color: C.fgSecondary },
  transcriptArea: {
    minHeight: TOUCH_MIN + 16,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: C.bgSubtle,
    color: C.fgPrimary,
    fontSize: TEXT.base,
    textAlignVertical: 'top',
  },
  correction: { gap: SPACE.s1 },
  correctionLabel: { fontSize: TEXT.sm, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  stars: { gap: SPACE.s2 },
  starSlot: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.s2 },
  starGlyph: { fontSize: TEXT.lg, color: C.fgSecondary },
  starEarned: { color: C.gold },
  starLabel: { flex: 1, fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  banner: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: '#2A2729',
  },
  bannerTitle: { fontSize: TEXT.md, fontWeight: WEIGHT.bold, color: C.gold },
  bannerBody: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  note: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  promptText: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  feedbackStack: { gap: SPACE.s2 },
});
