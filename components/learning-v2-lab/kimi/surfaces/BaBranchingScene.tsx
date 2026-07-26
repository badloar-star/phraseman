// зачем: дословный RN-порт source/src/surfaces/modes2/BaBranchingScene.tsx —
// ветвящаяся сцена/приключение (SB-10). Бриф миссии с целями → статичная сцена
// вокзала с четырьмя большими точками (≥48 px, всегда дублируются списком) →
// уточнение в характере персонажа («Ты хотел билет на сегодня?», НЕ экран ошибки) →
// проверка цели + чип возврата к узлу. Оффлайн заменяет сцену текстовым сценарием.
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActivityShell } from '../ActivityShell';
import { Chip, FeedbackNote } from '../components';
import { baBranchingSceneFixture } from '../fixtures/modes2';
import { useLab } from '../LabState';
import { GraphemeText, IntentButton } from '../primitives';
import { C, LEADING, RADIUS, SPACE, STATE_META, TEXT, TOUCH_MIN, WEIGHT } from '../tokens';

export const BaBranchingScene = memo(function BaBranchingScene() {
  const lab = useLab();
  const surfaceId = 'ba-branching-scene';
  const vm = baBranchingSceneFixture;
  const state = lab.canonicalState;
  const meta = STATE_META[state];
  const { online } = lab.conditions;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [listView, setListView] = useState(false);
  const [activeHotspotId, setActiveHotspotId] = useState(vm.scene.hotspots[0]?.id ?? '');
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

  const hotspot = vm.scene.hotspots.find((h) => h.id === activeHotspotId) ?? vm.scene.hotspots[0];
  const interactive = state === 'active';
  const doneCount = vm.mission.objectives.filter((o) => o.done).length;

  const objectivesList = (
    <View style={s.objectives} accessibilityLabel={vm.mission.objectivesLabel}>
      {vm.mission.objectives.map((obj) => (
        <View key={obj.id} style={s.objectiveItem}>
          <Text style={[s.objectiveCheck, obj.done ? s.objectiveCheckDone : null]}>✓</Text>
          <GraphemeText
            text={obj.label}
            maxGraphemes={60}
            style={[s.objectiveLabel, obj.done ? s.objectiveLabelDone : null]}
          />
        </View>
      ))}
    </View>
  );

  const phraseChips = (
    <View style={s.chipsRow}>
      {vm.mission.knownPhrases.map((phrase) => (
        <Chip key={phrase} text={phrase} tone="muted" />
      ))}
    </View>
  );

  return (
    <ActivityShell
      surfaceId={surfaceId}
      state={state}
      mode="natural-choice"
      title={vm.title}
      subtitle={`${vm.mission.objectivesLabel}: ${doneCount} из ${vm.mission.objectives.length}`}
      prompt={
        state === 'prompt' ? (
          <GraphemeText text={vm.mission.brief} maxGraphemes={140} style={s.promptText} />
        ) : undefined
      }
      statusMessage={vm.copy.statusMessages[state] ?? ''}
      feedback={
        <View style={s.feedbackStack}>
          <FeedbackNote state={state} success={`✓ ${vm.objectiveDoneNote}`} />
          {state === 'needs_work' ? (
            <View style={s.repairLine}>
              <Text style={s.lineSpeaker}>{vm.repair.speaker}</Text>
              <GraphemeText text={vm.repair.en} maxGraphemes={80} style={s.lineEn} />
              <GraphemeText text={vm.repair.ru} maxGraphemes={80} style={s.lineRu} />
              <GraphemeText text={vm.repair.note} maxGraphemes={90} style={s.note} />
            </View>
          ) : null}
          {state === 'recovery' ? (
            <View style={s.chipsRow}>
              <Chip text={`⏸ ${vm.resume.chip}`} tone="info" />
              <GraphemeText text={vm.resume.savedNote} maxGraphemes={90} style={s.note} />
            </View>
          ) : null}
          {!online ? (
            <View style={s.banner}>
              <GraphemeText text={vm.offlineFallbackNote} maxGraphemes={140} style={s.bannerText} />
            </View>
          ) : null}
        </View>
      }
      primaryAction={{
        label: vm.copy.primaryActions[state] ?? meta.label,
        intent: meta.primaryIntent,
        payload: { hotspotId: hotspot.id, selectedChoiceId, state, online },
      }}
      secondaryAction={{
        label: `${vm.mission.objectivesLabel} (${vm.mission.objectives.length - doneCount} осталось)`,
        intent: 'objectives.toggle',
        payload: { open: !drawerOpen },
      }}
      onIntent={lab.logIntent}
    >
      <View style={s.wrap}>
        {state === 'prompt' ? (
          <View style={s.card} accessibilityLabel={vm.mission.briefLabel}>
            <Text style={s.sectionLabel}>{vm.mission.briefLabel}</Text>
            {objectivesList}
            <Text style={s.sectionLabel}>{vm.mission.phrasesLabel}</Text>
            {phraseChips}
          </View>
        ) : (
          <View style={s.stage}>
            <View accessibilityLabel={vm.scene.hotspotsLabel}>
              <View style={s.drawerHead}>
                <Text style={s.sectionLabel}>{vm.scene.hotspotsLabel}</Text>
                <IntentButton
                  surfaceId={surfaceId}
                  intent="scene.view_toggle"
                  payload={{ listView: !listView }}
                  onIntent={lab.logIntent}
                  onPress={() => setListView((v) => !v)}
                  variant="ghost"
                  pressed={listView}
                  accessibilityLabel={listView ? vm.scene.sceneViewLabel : vm.scene.listViewLabel}
                >
                  {listView ? vm.scene.sceneViewLabel : vm.scene.listViewLabel}
                </IntentButton>
              </View>
              {listView ? (
                <View style={s.hotspotList} accessibilityLabel={vm.scene.altRu}>
                  {vm.scene.hotspots.map((h) => (
                    <IntentButton
                      key={h.id}
                      surfaceId={surfaceId}
                      intent="hotspot.open"
                      payload={{ hotspotId: h.id }}
                      onIntent={lab.logIntent}
                      onPress={() => {
                        setActiveHotspotId(h.id);
                        setSelectedChoiceId(null);
                      }}
                      variant="secondary"
                      disabled={!interactive}
                      pressed={h.id === activeHotspotId}
                      accessibilityLabel={`Точка: ${h.label}`}
                    >
                      {`${h.icon} ${h.label}`}
                    </IntentButton>
                  ))}
                </View>
              ) : (
                <View style={s.scene} accessibilityLabel={vm.scene.altRu}>
                  {vm.scene.hotspots.map((h) => (
                    <View
                      key={h.id}
                      // зачем: точки расставлены в процентах сцены (как в макете),
                      // поэтому позиционируем абсолютно — сцена не «плывёт» при смене узла
                      style={[s.hotspotAnchor, { left: `${h.x}%`, top: `${h.y}%` }]}
                    >
                      <IntentButton
                        surfaceId={surfaceId}
                        intent="hotspot.open"
                        payload={{ hotspotId: h.id }}
                        onIntent={lab.logIntent}
                        onPress={() => {
                          setActiveHotspotId(h.id);
                          setSelectedChoiceId(null);
                        }}
                        variant={h.id === activeHotspotId ? 'secondary' : 'ghost'}
                        disabled={!interactive}
                        pressed={h.id === activeHotspotId}
                        style={s.hotspot}
                        accessibilityLabel={`Точка: ${h.label}`}
                      >
                        {`${h.icon} ${h.label}`}
                      </IntentButton>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={s.line} accessibilityLabel={`Реплика: ${hotspot.line.speaker}`}>
              <Text style={s.lineSpeaker}>{hotspot.line.speaker}</Text>
              <GraphemeText text={hotspot.line.en} maxGraphemes={90} style={s.lineEn} />
              <GraphemeText text={hotspot.line.ru} maxGraphemes={90} style={s.lineRu} />
              <View style={s.choices} accessibilityLabel="Твой ответ">
                {hotspot.choices.map((choice) => (
                  <IntentButton
                    key={choice.id}
                    surfaceId={surfaceId}
                    intent="scene.choose"
                    payload={{ hotspotId: hotspot.id, choiceId: choice.id }}
                    onIntent={lab.logIntent}
                    onPress={() => setSelectedChoiceId(choice.id)}
                    variant="option"
                    disabled={!interactive}
                    pressed={selectedChoiceId === choice.id}
                    accessibilityLabel={choice.label}
                  >
                    <View style={s.choiceBody}>
                      <GraphemeText text={choice.label} maxGraphemes={60} style={s.choiceLabel} />
                      {choice.hint ? (
                        <GraphemeText text={choice.hint} maxGraphemes={48} style={s.choiceHint} />
                      ) : null}
                    </View>
                  </IntentButton>
                ))}
              </View>
            </View>

            {drawerOpen ? (
              <View style={s.card} accessibilityLabel={vm.mission.objectivesLabel}>
                <View style={s.drawerHead}>
                  <Text style={s.sectionLabel}>{vm.mission.objectivesLabel}</Text>
                  <IntentButton
                    surfaceId={surfaceId}
                    intent="objectives.close"
                    payload={{}}
                    onIntent={lab.logIntent}
                    onPress={() => setDrawerOpen(false)}
                    variant="ghost"
                    accessibilityLabel="Закрыть цели"
                  >
                    ✕
                  </IntentButton>
                </View>
                {objectivesList}
                <Text style={s.sectionLabel}>{vm.mission.phrasesLabel}</Text>
                {phraseChips}
              </View>
            ) : null}
          </View>
        )}

        {state === 'success' ? (
          <View style={s.card} accessibilityLabel={vm.completion.title}>
            <Text style={s.sectionLabel}>{vm.completion.title}</Text>
            <GraphemeText text={vm.completion.summary} maxGraphemes={120} style={s.promptText} />
            <View style={s.chipsRow}>
              <Chip text={vm.completion.objectivesDisplay} tone="ok" />
            </View>
          </View>
        ) : null}
      </View>
    </ActivityShell>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s4 },
  stage: { gap: SPACE.s3 },
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
  objectives: { gap: SPACE.s2 },
  objectiveItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s2 },
  objectiveCheck: { fontSize: TEXT.sm, color: C.fgSecondary, opacity: 0.4 },
  objectiveCheckDone: { color: C.correct, opacity: 1 },
  objectiveLabel: { flex: 1, fontSize: TEXT.sm, color: C.fgSecondary },
  objectiveLabelDone: { color: C.fgPrimary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.s2 },
  drawerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.s2,
    marginBottom: SPACE.s2,
  },
  hotspotList: { gap: SPACE.s2 },
  // зачем: у сцены фиксированная пропорция — точки в процентах не расползаются
  // при разной ширине телефона, геометрия совпадает с макетом
  scene: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.accentSoft,
    overflow: 'hidden',
  },
  hotspotAnchor: { position: 'absolute' },
  hotspot: { minHeight: TOUCH_MIN, backgroundColor: C.bgSurface },
  line: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  repairLine: {
    gap: SPACE.s1,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: '#2A2729',
  },
  lineSpeaker: {
    fontSize: TEXT.xs,
    fontWeight: WEIGHT.bold,
    color: C.fgSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lineEn: { fontSize: TEXT.lg, fontWeight: WEIGHT.medium, color: C.fgPrimary, lineHeight: TEXT.lg * LEADING.snug },
  lineRu: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  choices: { gap: SPACE.s2 },
  choiceBody: { flex: 1, gap: 2 },
  choiceLabel: { fontSize: TEXT.md, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  choiceHint: { fontSize: TEXT.sm, color: C.fgSecondary },
  banner: {
    gap: SPACE.s2,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: '#2A2729',
  },
  bannerText: { fontSize: TEXT.sm, color: C.gold, lineHeight: TEXT.sm * LEADING.snug },
  note: { fontSize: TEXT.sm, color: C.fgSecondary, lineHeight: TEXT.sm * LEADING.snug },
  promptText: { fontSize: TEXT.md, color: C.fgPrimary, lineHeight: TEXT.md * LEADING.snug },
  feedbackStack: { gap: SPACE.s2 },
});
