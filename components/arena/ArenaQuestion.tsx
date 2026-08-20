import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { V2Card, V2Chip, V2Cta, type ChipVerdict } from '../tournament/tournament_v2_ui';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { adaptArenaTask, encodeArenaSelection } from '../../modules/arena/task_adapter';
import type { ArenaPublicTask } from '../../modules/arena/contract';
import { useArenaFontScale } from '../../hooks/use_arena_font_scale';
import { useArenaSound } from '../../hooks/use_arena_sound';
import { arenaQuestionLayout } from '../../modules/arena/question_layout';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';

type Props = Readonly<{
  task: ArenaPublicTask;
  locked: boolean;
  verdict?: 'correct' | 'wrong' | null;
  submitLabel: string;
  onSubmit: (answer: unknown) => void;
  onSpeedAttempt: (pairIndex: number, selectedIndex: number) => Promise<boolean>;
  onMatchingComplete?: () => void;
}>;

export function ArenaQuestion({ task, locked, verdict, submitLabel, onSubmit, onSpeedAttempt, onMatchingComplete }: Props) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  // Высота строки числом не растёт вместе с системным шрифтом — сам вопрос
  // при полуторном кегле наезжал строка на строку. См. use_arena_font_scale.
  const fontScale = useArenaFontScale();
  // Звук нажатия варианта. Он числился «озвученным общим компонентом
  // вопроса» — а общий компонент звука не играет вовсе, только отдаёт
  // вибрацию. Файла ещё нет, директор такие события молча пропускает,
  // поэтому вызов стоит заранее и зазвучит без правок экрана.
  const playSound = useArenaSound();
  const promptStyle = { color: P.text, lineHeight: 29 * fontScale };
  const view = useMemo(() => adaptArenaTask(task), [task]);
  const layout = arenaQuestionLayout(view.mode);
  const instruction = layout.instructionKey ? arenaText(lang, layout.instructionKey) : null;
  const [choice, setChoice] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number[]>([]);
  const [left, setLeft] = useState<number | null>(null);
  const [matchedLeft, setMatchedLeft] = useState<Set<number>>(() => new Set());
  const [matchedRight, setMatchedRight] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setChoice(null);
    setTokens([]);
    setLeft(null);
    setMatchedLeft(new Set());
    setMatchedRight(new Set());
  }, [task.taskId]);

  if (view.type === 'matching') {
    return (
      <View style={styles.immersive}>
        <Text style={[styles.prompt, styles.promptImmersive, promptStyle]}>{view.prompt}</Text>
        {instruction ? (
          <>
            {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- the approved immersive instruction is intentionally capped at two wrapped lines */}
            <Text accessibilityLiveRegion="polite" numberOfLines={2}
              style={[styles.instruction, { color: P.muted }]}
            >
              {instruction}
            </Text>
          </>
        ) : null}
        <View style={styles.matchGrid}>
          <View style={styles.column}>
            {view.left.map((item, index) => (
              <V2Chip
                key={`${item}-${index}`}
                style={styles.touchChip}
                selected={left === index}
                disabled={locked || matchedLeft.has(index)}
                accessibilityLabel={item}
                onPress={() => setLeft(index)}
              >
                {matchedLeft.has(index)
                  ? <View style={styles.matched}><Ionicons name="checkmark-circle" size={18} color={P.accent} /><Text numberOfLines={2} ellipsizeMode="tail" style={[styles.matchedText, { color: P.text }]}>{item}</Text></View>
                  // Длинное слово на доске пар не должно растягивать колонку:
                  // тогда нижние пары уезжают за край и становятся нетыкаемыми.
                  : <Text numberOfLines={2} ellipsizeMode="tail">{item}</Text>}
              </V2Chip>
            ))}
          </View>
          <View style={styles.column}>
            {view.right.map((item, index) => (
              <V2Chip
                key={`${item}-${index}`}
                style={styles.touchChip}
                disabled={locked || left === null || matchedRight.has(index)}
                accessibilityLabel={item}
                onPress={() => {
                  if (left === null) return;
                  const pairIndex = left;
                  setLeft(null);
                  void onSpeedAttempt(pairIndex, index).then((correct) => {
                    if (!correct) return;
                    setMatchedLeft((old) => {
                      const next = new Set(old).add(pairIndex);
                      if (next.size === view.left.length) onMatchingComplete?.();
                      return next;
                    });
                    setMatchedRight((old) => new Set(old).add(index));
                  });
                }}
              >
                {matchedRight.has(index)
                  ? <View style={styles.matched}><Ionicons name="checkmark-circle" size={18} color={P.accent} /><Text numberOfLines={2} ellipsizeMode="tail" style={[styles.matchedText, { color: P.text }]}>{item}</Text></View>
                  : <Text numberOfLines={2} ellipsizeMode="tail">{item}</Text>}
              </V2Chip>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (view.type === 'builder') {
    const selected = tokens.length > 0;
    return (
      <View style={styles.immersive}>
        <Text style={[styles.prompt, styles.promptImmersive, promptStyle]}>{view.prompt}</Text>
        {instruction ? (
          <>
            {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- the approved immersive instruction is intentionally capped at two wrapped lines */}
            <Text accessibilityLiveRegion="polite" numberOfLines={2}
              style={[styles.instruction, { color: P.muted }]}
            >
              {instruction}
            </Text>
          </>
        ) : null}
        <View style={[styles.answerTray, { backgroundColor: P.elev }]}>
          {tokens.map((index, tokenIndex) => (
            <V2Chip
              key={`${index}-${tokenIndex}`}
              style={styles.touchChip}
              accessibilityLabel={view.tokens[index]}
              onPress={() => !locked && setTokens((old) => old.filter((_, itemIndex) => itemIndex !== tokenIndex))}
            >
              {view.tokens[index]}
            </V2Chip>
          ))}
        </View>
        <ScrollView
          style={styles.builderScroll}
          contentContainerStyle={styles.builder}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.tokenCloud}>
            {view.tokens.map((token, index) => (
              <V2Chip
                key={`${token}-${index}`}
                style={styles.touchChip}
                disabled={locked || tokens.includes(index)}
                accessibilityLabel={token}
                onPress={() => setTokens((old) => [...old, index])}
              >
                {token}
              </V2Chip>
            ))}
          </View>
        </ScrollView>
        <V2Cta
          disabled={!selected || locked}
          onPress={() => onSubmit(encodeArenaSelection(view, tokens))}
        >
          {submitLabel}
        </V2Cta>
      </View>
    );
  }

  const selected = choice !== null;
  return (
    <V2Card style={styles.card}>
      <Text style={[styles.prompt, promptStyle]}>{view.prompt}</Text>
      {(
        /**
         * Варианты прокручиваются, если не помещаются.
         *
         * Экран матча не скроллится намеренно — таймер и счёт обязаны быть
         * видны всегда. Но длинные варианты на узком экране от этого просто
         * уезжали за край: нижний вариант становился НЕНАЖИМАЕМЫМ, то есть
         * задание нельзя было ответить. Потерянное задание из-за вёрстки —
         * худший вид потери.
         */
        <ScrollView
          style={styles.optionsScroll}
          contentContainerStyle={styles.options}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {view.options.map((option, index) => {
            const chipVerdict: ChipVerdict = choice !== index || !verdict ? 'idle' : verdict === 'correct' ? 'ok' : 'bad';
            return (
              <V2Chip
                key={`${option}-${index}`}
                block
                selected={choice === index}
                verdict={chipVerdict}
                disabled={locked}
                accessibilityLabel={option}
                onPress={() => { playSound('optionTap'); setChoice(index); }}
              >
                {/* Один длинный вариант не должен съедать экран целиком:
                    больше трёх строк не показываем. */}
                <Text numberOfLines={3} ellipsizeMode="tail">{option}</Text>
              </V2Chip>
            );
          })}
        </ScrollView>
      )}
      <V2Cta
        disabled={!selected || locked}
        onPress={() => onSubmit(encodeArenaSelection(view, view.type === 'choices' ? choice : tokens))}
      >{submitLabel}</V2Cta>
    </V2Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  immersive: { flex: 1, minHeight: 0, gap: 10 },
  // Высота строки задаётся на месте: она умножается на системный масштаб.
  prompt: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  promptImmersive: { fontSize: 19 },
  instruction: { fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  options: { gap: 10 },
  // Прокрутка занимает только то место, что осталось: таймер и счёт выше
  // остаются на экране при любой длине вариантов.
  optionsScroll: { flexShrink: 1 },
  builderScroll: { flex: 1, minHeight: 0 },
  builder: { gap: 12 },
  answerTray: { minHeight: 68, borderRadius: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, padding: 10 },
  tokenCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  matchGrid: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 8, justifyContent: 'space-between' },
  touchChip: { minHeight: 48 },
  matched: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  // Отгаданная пара стоит в строке рядом со значком. Без сжатия длинное слово
  // на экране в 320 pt вылезало за край фишки: колонка узкая, а строка в ряду
  // по умолчанию не сжимается.
  matchedText: { flexShrink: 1 },
});
