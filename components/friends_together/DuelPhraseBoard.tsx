/**
 * «Дуэль на 5 фраз» (идея 3) — одна фраза хода: «Собери фразу», ситуация из урока, цель, строка ответа и банк слов;
 * после «Проверить» банк уступает место разбору «Верно · 7 секунд» / «Не совсем · Правильно: …».
 *
 * зачем (макет docs/design/v2-app/friends-full.html, «Фраза 2 из 5» и «Верно»: .todo, .sit, .goal, .ans, .bank, .lane):
 * задание — то же «Собери фразу», что в уроке: плитки и разбор — общие детали заданий (Lv2Chip, токены разбора), тексты —
 * из курса без переписывания. Подсказок нет: в дуэли считается первая попытка. Только вид — состояние держит экран.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FlowText } from '../text-integrity';
import { Lv2Chip, lv2Alpha, useLv2Glass } from '../learning-v2/LearningV2Glass';
import {
  LV2_TASK_LAYOUT,
  LV2_TASK_VERDICT_BLOCK,
  lv2TaskTitleTileColor,
  lv2TaskVerdictBlockLook,
} from '../learning-v2/learning_v2_task_layout_tokens';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { Lang } from '../../constants/i18n';
import type { DuelPhrase, DuelPhraseVerdict } from '../../app/friends_together/duel_phrases';
import { duelCorrectAnswerLine, duelPlayCopy, duelVerdictTitle } from '../../app/friends_together/duel_play_copy';

type Props = Readonly<{
  phrase: DuelPhrase;
  picked: readonly string[];
  verdict: DuelPhraseVerdict | null;
  lang: Lang;
  textScale: number;
  onAppend: (responseId: string) => void;
  onRemoveAt: (index: number) => void;
}>;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Разбор появляется мягко снизу (200 мс); при «уменьшить движение» — сразу. */
function VerdictLane({ verdict, phrase, lang, textScale }: Readonly<{ verdict: DuelPhraseVerdict; phrase: DuelPhrase; lang: Lang; textScale: number }>) {
  const g = useLv2Glass();
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return undefined;
    }
    const run = Animated.timing(enter, { toValue: 1, duration: 200, easing: EASE_OUT, useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [enter, reduceMotion]);
  const look = lv2TaskVerdictBlockLook(g, verdict.correct);
  // Верно — пояснение автора, если есть; неверно — правильная фраза и разбор отвлекающего слова.
  const lines = verdict.correct
    ? [verdict.detail].filter((line): line is string => !!line)
    : [duelCorrectAnswerLine(lang, phrase.targetPhrase), verdict.detail].filter((line): line is string => !!line);
  return (
    <Animated.View
      testID="friend-duel-verdict"
      accessibilityLiveRegion="polite"
      style={[
        styles.lane,
        { backgroundColor: look.backgroundColor, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <FlowText testID="friend-duel-verdict-title" provenance="authored" style={[styles.laneTitle, { color: look.titleColor, fontSize: LV2_TASK_VERDICT_BLOCK.titleSize * textScale, lineHeight: LV2_TASK_VERDICT_BLOCK.titleLine * textScale }]}>
        {duelVerdictTitle(lang, verdict.correct, verdict.ms)}
      </FlowText>
      {lines.map((line, index) => (
        <FlowText key={`${index}-${line}`} testID={`friend-duel-verdict-line-${index}`} provenance="authored" style={[styles.laneBody, { color: look.bodyColor, fontSize: 16 * textScale, lineHeight: 21 * textScale }]}>
          {line}
        </FlowText>
      ))}
    </Animated.View>
  );
}

function DuelPhraseBoard({ phrase, picked, verdict, lang, textScale, onAppend, onRemoveAt }: Props) {
  const g = useLv2Glass();
  const textById = new Map(phrase.tiles.map((tile) => [tile.responseId, tile.text]));
  const pickedSet = new Set(picked);

  return (
    <View testID="friend-duel-board">
      <View style={styles.todo}>
        <View style={[styles.todoTile, { backgroundColor: lv2TaskTitleTileColor(g) }]}>
          <Ionicons name="extension-puzzle-outline" size={LV2_TASK_LAYOUT.title.tileIcon} color={g.text} accessible={false} />
        </View>
        <FlowText testID="friend-duel-task-title" provenance="authored" accessibilityRole="header" style={[styles.todoText, { color: g.text, fontSize: LV2_TASK_LAYOUT.title.textSize * textScale, lineHeight: LV2_TASK_LAYOUT.title.textLine * textScale }]}>
          {duelPlayCopy(lang, 'buildPhrase')}
        </FlowText>
      </View>

      {phrase.situation ? (
        <View style={[styles.situation, { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g) }]}>
          {/* `.sit`: 9 % акцента поверх карточки — тон, не рамка */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.situationTint, { backgroundColor: lv2Alpha(g.accent.slice(0, 7), 0.09) }]} />
          <View style={styles.situationKicker}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={g.secondary} accessible={false} />
            <FlowText testID="friend-duel-situation-label" provenance="authored" style={[styles.kicker, { color: g.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{/* guard-ok: метка карточки «Ситуация» (.sit .k макета), не расшифровка */}
              {duelPlayCopy(lang, 'situation')}
            </FlowText>
          </View>
          <FlowText testID="friend-duel-situation" provenance="authored" style={[styles.situationText, { color: g.text, fontSize: 16 * textScale, lineHeight: 22 * textScale }]}>
            {phrase.situation}
          </FlowText>
        </View>
      ) : null}

      {phrase.goal ? (
        <View style={styles.goal}>
          <FlowText testID="friend-duel-goal-label" provenance="authored" style={[styles.kicker, styles.center, { color: g.secondary, fontSize: 13 * textScale, lineHeight: 17 * textScale }]}>{/* guard-ok: метка цели «Скажи по-английски» (.goal .k макета) */}
            {duelPlayCopy(lang, 'sayInEnglish')}
          </FlowText>
          <FlowText testID="friend-duel-goal" provenance="authored" style={[styles.goalText, styles.center, { color: g.text, fontSize: 28 * textScale, lineHeight: 34 * textScale }]}>
            {phrase.goal}
          </FlowText>
        </View>
      ) : null}

      {/* `.ans`: высота зарезервирована — первый кадр уже финальной геометрии, плитки не толкают экран */}
      <View style={[styles.answer, { borderBottomColor: g.glassEdge }]}>
        {picked.length === 0 ? (
          <FlowText testID="friend-duel-answer-placeholder" provenance="authored" style={{ color: g.mutedText, fontSize: 16 * textScale, lineHeight: 21 * textScale }}>
            {duelPlayCopy(lang, 'tapWords')}
          </FlowText>
        ) : (
          picked.map((responseId, index) => {
            const text = textById.get(responseId) ?? '';
            // После разбора: верно — все зелёные; неверно — на своих местах зелёные, остальные приглушены (без красного упрёка).
            const chipVerdict = verdict === null ? 'idle' : verdict.correct || phrase.orderedTokens[index] === text ? 'ok' : 'dim';
            return (
              <Lv2Chip key={`${responseId}-${index}`} accessibilityLabel={text} verdict={chipVerdict} disabled={verdict !== null} onPress={() => onRemoveAt(index)}>
                {text}
              </Lv2Chip>
            );
          })
        )}
      </View>

      {verdict === null ? (
        <View style={styles.bank}>
          {phrase.tiles.map((tile) => {
            const used = pickedSet.has(tile.responseId);
            return (
              // `.chip.gh`: взятое слово остаётся тенью на своём месте — банк не перестраивается
              <View key={tile.responseId} style={{ opacity: used ? 0.22 : 1 }}>
                <Lv2Chip accessibilityLabel={tile.text} disabled={used} onPress={() => onAppend(tile.responseId)}>
                  {tile.text}
                </Lv2Chip>
              </View>
            );
          })}
        </View>
      ) : (
        <VerdictLane verdict={verdict} phrase={phrase} lang={lang} textScale={textScale} />
      )}
    </View>
  );
}

export default memo(DuelPhraseBoard);

const styles = StyleSheet.create({
  // `.todo` дуэли: отступ сверху 10, плитка-значок 40 / радиус 12, название 22/27 800.
  todo: { flexDirection: 'row', alignItems: 'center', gap: LV2_TASK_LAYOUT.title.gap, marginTop: 10 },
  todoTile: { width: LV2_TASK_LAYOUT.title.tile, height: LV2_TASK_LAYOUT.title.tile, borderRadius: LV2_TASK_LAYOUT.title.tileRadius, alignItems: 'center', justifyContent: 'center' },
  todoText: { flex: 1, fontWeight: '800', letterSpacing: LV2_TASK_LAYOUT.title.letterSpacing },
  // `.sit`: отступ 14, радиус 18, поля 13/16/14.
  situation: { marginTop: 14, borderRadius: 18, paddingTop: 13, paddingHorizontal: 16, paddingBottom: 14, overflow: 'hidden' },
  situationTint: { borderRadius: 18 },
  situationKicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { fontWeight: '700' },
  situationText: { marginTop: 5 },
  // `.goal`: отступ 18, по центру; фраза 28/34 800.
  goal: { marginTop: 18 },
  goalText: { marginTop: 4, fontWeight: '800', letterSpacing: -0.4 },
  center: { textAlign: 'center' },
  // `.ans`: от 64, отступ 20, линия снизу, поля 10/4, зазор 8.
  answer: {
    minHeight: 64,
    marginTop: 20,
    borderBottomWidth: 1, // shadow-ok: линия-подчёркивание зоны ответа `.ans`, не контейнер
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  // `.bank`: отступ 20, зазор 10.
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  // `.lane` дуэли: отступ 16, радиус и поля — общий блок разбора заданий.
  lane: { marginTop: 16, borderRadius: LV2_TASK_VERDICT_BLOCK.radius, paddingVertical: LV2_TASK_VERDICT_BLOCK.padV, paddingHorizontal: LV2_TASK_VERDICT_BLOCK.padH },
  laneTitle: { fontWeight: '700' },
  laneBody: { marginTop: LV2_TASK_VERDICT_BLOCK.bodyGap },
});
