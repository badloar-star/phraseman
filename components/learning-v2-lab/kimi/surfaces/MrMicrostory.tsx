// зачем: дословный RN-порт source/src/surfaces/modes2/MrMicrostory.tsx —
// микроистория/радио (SB-09). Обложка «Новые фразы: 4» → плеер (строка субтитров,
// скорость, −5 с, симулированный сигнал) → одна проверка понимания → попап фразы
// (тап по фразе → перевод + повтор + «Сохранить») → результат can-do.
// Оффлайн показывает размер загрузки; скачанные эпизоды работают без сети.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActivityShell } from '../ActivityShell';
import { Chip, FeedbackNote, OptionGrid, SignalButton } from '../components';
import { mrMicrostoryFixture } from '../fixtures/modes2';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, STATE_META, TEXT, TOUCH_MIN, WEIGHT } from '../tokens';

export const MrMicrostory = memo(function MrMicrostory() {
  const lab = useLab();
  const surfaceId = 'mr-microstory';
  const vm = mrMicrostoryFixture;
  const state = lab.canonicalState;
  const meta = STATE_META[state];
  const { online } = lab.conditions;

  const [captionsOn, setCaptionsOn] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [openPhraseId, setOpenPhraseId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const reveal = state === 'success' || state === 'needs_work';
  const currentCaption = vm.captions.find((c) => c.phraseId) ?? vm.captions[0];
  const openPhrase = openPhraseId ? vm.phraseFocus[openPhraseId] : null;
  const downloaded = vm.download.state === 'downloaded';

  const downloadBlock = !online ? (
    <View style={s.chipsRow}>
      {downloaded ? (
        <Chip text={`✓ ${vm.download.downloadedChip}`} tone="ok" />
      ) : (
        <>
          <Chip text={`⬇ ${vm.download.neededChip} · ${vm.download.sizeDisplay}`} tone="warn" />
          <IntentButton
            surfaceId={surfaceId}
            intent="pack.queue_download"
            payload={{ episodeId: vm.id, sizeDisplay: vm.download.sizeDisplay, simulated: true }}
            onIntent={lab.logIntent}
            variant="ghost"
            accessibilityLabel={vm.download.actionLabel}
          >
            {vm.download.actionLabel}
          </IntentButton>
        </>
      )}
    </View>
  ) : null;

  return (
    <ActivityShell
      surfaceId={surfaceId}
      state={state}
      mode="listen"
      title={vm.title}
      subtitle={`${vm.cover.durationDisplay} · ${vm.cover.newPhrasesDisplay}`}
      prompt={<GraphemeText text={vm.cover.goal} maxGraphemes={120} style={s.promptText} />}
      statusMessage={vm.copy.statusMessages[state] ?? ''}
      feedback={
        <View style={s.feedbackStack}>
          <FeedbackNote
            state={state}
            success={`✓ ${vm.completion.canDo}`}
            needsWork="↺ Ответ спрятан в первой части истории — дослушай начало ещё раз."
            recovery={`↺ ${vm.copy.statusMessages.recovery}`}
          />
          {state === 'success' ? (
            <View style={s.chipsRow}>
              <Chip text={vm.completion.phrasesSavedDisplay} tone="info" />
              <IntentButton
                surfaceId={surfaceId}
                intent="story.relisten"
                payload={{ simulated: true }}
                onIntent={lab.logIntent}
                variant="ghost"
                accessibilityLabel={vm.completion.relistenLabel}
              >
                {vm.completion.relistenLabel}
              </IntentButton>
            </View>
          ) : null}
        </View>
      }
      primaryAction={{
        label: state === 'success' ? vm.completion.continueLabel : (vm.copy.primaryActions[state] ?? meta.label),
        intent: meta.primaryIntent,
        payload: { selectedOptionId, state, online },
      }}
      onIntent={lab.logIntent}
    >
      <View style={s.wrap}>
        {state === 'prompt' ? (
          <View style={s.card} accessibilityLabel={vm.title}>
            <View style={s.art} accessibilityRole="image" accessibilityLabel={vm.cover.illustrationAlt}>
              <GraphemeText text={vm.cover.illustrationAlt} maxGraphemes={90} style={s.artText} />
            </View>
            <View style={s.chipsRow}>
              <Chip text={`⏱ ${vm.cover.durationDisplay}`} tone="info" />
              <Chip text={vm.cover.newPhrasesDisplay} tone="ok" />
            </View>
            {downloadBlock}
          </View>
        ) : (
          <View style={s.player}>
            <View style={s.progress}>
              <View style={[s.progressFill, { width: `${vm.player.progressPercent}%` }]} />
            </View>
            <View style={s.progressMeta}>
              <Text style={s.progressMetaText}>{vm.player.progressDisplay}</Text>
              <Text style={s.progressMetaText}>{vm.player.speedOptions[speedIdx]}</Text>
            </View>

            <View style={s.captionWrap}>
              {openPhrase ? (
                <View style={s.popover} accessibilityLabel={`Фраза: ${openPhrase.phrase}`}>
                  <GraphemeText text={openPhrase.phrase} maxGraphemes={40} style={s.popoverPhrase} />
                  <GraphemeText text={openPhrase.translation} maxGraphemes={60} style={s.popoverTranslation} />
                  <GraphemeText text={openPhrase.note} maxGraphemes={90} style={s.note} />
                  <View style={s.popoverActions}>
                    <IntentButton
                      surfaceId={surfaceId}
                      intent="phrase.replay_segment"
                      payload={{ phraseId: openPhrase.id, simulated: true }}
                      onIntent={lab.logIntent}
                      variant="ghost"
                      accessibilityLabel={openPhrase.replayLabel}
                    >
                      {openPhrase.replayLabel}
                    </IntentButton>
                    <IntentButton
                      surfaceId={surfaceId}
                      intent="phrase.save"
                      payload={{ phraseId: openPhrase.id }}
                      onIntent={lab.logIntent}
                      variant="secondary"
                      accessibilityLabel={openPhrase.saveLabel}
                    >
                      {openPhrase.saveLabel}
                    </IntentButton>
                    <IntentButton
                      surfaceId={surfaceId}
                      intent="phrase.close_focus"
                      payload={{ phraseId: openPhrase.id }}
                      onIntent={lab.logIntent}
                      onPress={() => setOpenPhraseId(null)}
                      variant="ghost"
                      accessibilityLabel="Закрыть перевод фразы"
                    >
                      ✕
                    </IntentButton>
                  </View>
                </View>
              ) : null}

              {captionsOn ? (
                <View style={s.caption}>
                  <GraphemeText text={currentCaption.en} maxGraphemes={120} style={s.captionEn} />
                  {currentCaption.phraseId ? (
                    <IntentButton
                      surfaceId={surfaceId}
                      intent="phrase.open_focus"
                      payload={{ phraseId: currentCaption.phraseId }}
                      onIntent={lab.logIntent}
                      onPress={() => {
                        const id = currentCaption.phraseId ?? null;
                        setOpenPhraseId((prev) => (prev === id ? null : id));
                      }}
                      variant="ghost"
                      style={s.phraseChip}
                      accessibilityLabel={`Фраза: ${vm.phraseFocus[currentCaption.phraseId].phrase} — открыть перевод`}
                    >
                      {vm.phraseFocus[currentCaption.phraseId].phrase}
                    </IntentButton>
                  ) : null}
                  <GraphemeText text={currentCaption.ru} maxGraphemes={90} style={s.captionRu} />
                </View>
              ) : (
                <Text style={s.captionRu}>
                  Субтитры выключены — текст можно вернуть кнопкой «{vm.player.captionsToggleLabel}».
                </Text>
              )}
            </View>

            <SignalButton surfaceId={surfaceId} label={vm.player.signalLabel} disabled={state === 'processing'} />
            <View style={s.controls}>
              <IntentButton
                surfaceId={surfaceId}
                intent="player.seek_back"
                payload={{ seconds: 5, simulated: true }}
                onIntent={lab.logIntent}
                variant="secondary"
                accessibilityLabel="Назад на 5 секунд"
              >
                {vm.player.backLabel}
              </IntentButton>
              <IntentButton
                surfaceId={surfaceId}
                intent="player.speed"
                payload={{ speed: vm.player.speedOptions[(speedIdx + 1) % vm.player.speedOptions.length] }}
                onIntent={lab.logIntent}
                onPress={() => setSpeedIdx((i) => (i + 1) % vm.player.speedOptions.length)}
                variant="secondary"
                accessibilityLabel={`Скорость воспроизведения, сейчас ${vm.player.speedOptions[speedIdx]}`}
              >
                {vm.player.speedOptions[speedIdx]}
              </IntentButton>
              <IntentButton
                surfaceId={surfaceId}
                intent="captions.toggle"
                payload={{ on: !captionsOn }}
                onIntent={lab.logIntent}
                onPress={() => setCaptionsOn((v) => !v)}
                variant="ghost"
                pressed={captionsOn}
                accessibilityLabel={vm.player.captionsToggleLabel}
              >
                {vm.player.captionsToggleLabel}
              </IntentButton>
            </View>
            {downloadBlock}

            <View style={s.card} accessibilityLabel={vm.comprehension.title}>
              <Text style={s.sectionLabel}>{vm.comprehension.title}</Text>
              <GraphemeText text={vm.comprehension.question} maxGraphemes={90} style={s.promptText} />
              <OptionGrid
                surfaceId={surfaceId}
                options={vm.comprehension.options}
                correctOptionId={vm.comprehension.correctOptionId}
                selectedId={selectedOptionId}
                onSelected={setSelectedOptionId}
                enabled={state === 'active'}
                reveal={reveal}
                intentType="story.answer"
              />
              <GraphemeText text={vm.comprehension.resumeNote} maxGraphemes={90} style={s.note} />
            </View>
          </View>
        )}
      </View>
    </ActivityShell>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s4 },
  card: {
    gap: SPACE.s3,
    paddingVertical: SPACE.s4,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  art: {
    justifyContent: 'flex-end',
    minHeight: 132,
    padding: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.accentSoft,
  },
  artText: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
  player: { gap: SPACE.s3 },
  progress: { height: 8, borderRadius: RADIUS.pill, backgroundColor: C.bgSubtle, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: C.accentEdge },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACE.s2 },
  progressMetaText: { fontSize: TEXT.xs, color: C.fgSecondary, letterSpacing: 0.5 },
  captionWrap: { position: 'relative' },
  caption: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s1 },
  captionEn: {
    fontSize: TEXT.lg,
    lineHeight: TEXT.lg * LEADING.snug,
    fontWeight: WEIGHT.medium,
    color: C.fgPrimary,
  },
  captionRu: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  phraseChip: {
    minHeight: TOUCH_MIN - 4,
    paddingHorizontal: SPACE.s2,
    borderRadius: RADIUS.sm,
    backgroundColor: C.accentSoft,
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
  // зачем: попап Kimi всплывает НАД строкой субтитров и не двигает её — держим
  // абсолютное позиционирование, иначе весь плеер прыгает при открытии фразы
  popover: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    zIndex: 6,
    marginBottom: SPACE.s2,
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.card3,
  },
  popoverPhrase: { fontSize: TEXT.lg, fontWeight: WEIGHT.bold, color: C.fgPrimary },
  popoverTranslation: { fontSize: TEXT.md, color: C.fgPrimary },
  popoverActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  note: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  sectionLabel: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.fgSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  promptText: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  feedbackStack: { gap: SPACE.s2 },
});
