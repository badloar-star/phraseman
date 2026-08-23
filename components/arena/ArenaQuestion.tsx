import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
// зачем: v2_ui/v2_theme переехали из components/tournament в components/ui (2d5e95032) — старый путь мёртвый, Metro не резолвил модуль
import { V2Chip, V2Cta, type ChipVerdict } from '../ui/v2_ui';
import { hexToRgba, useTournamentPalette } from '../ui/v2_theme';
import { adaptArenaTask, encodeArenaSelection } from '../../modules/arena/task_adapter';
import type { ArenaPublicTask } from '../../modules/arena/contract';
import { useArenaFontScale } from '../../hooks/use_arena_font_scale';
import { useArenaSound } from '../../hooks/use_arena_sound';
import {
  arenaQuestionLayout,
  arenaQuestionViewportLayout,
} from '../../modules/arena/question_layout';
import { ArenaBilingualText } from './ArenaBilingualText';
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
  const { height: windowHeight, fontScale: systemFontScale } = useWindowDimensions();
  const viewport = arenaQuestionViewportLayout(windowHeight, systemFontScale);
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
      <ScrollView
        style={styles.immersiveScroll}
        contentContainerStyle={styles.immersiveContent}
        showsVerticalScrollIndicator={viewport.compactHeight}
        nestedScrollEnabled
        bounces={false}
      >
        <ArenaBilingualText style={[styles.prompt, styles.promptImmersive, promptStyle]}>{view.prompt}</ArenaBilingualText>
        {instruction ? (
          <>
            {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- the approved immersive instruction is intentionally capped at two wrapped lines */}
            <Text accessibilityLiveRegion="polite" numberOfLines={2}
              style={[styles.instruction, { color: P.muted, lineHeight: 18 * fontScale }]}
            >
              {instruction}
            </Text>
          </>
        ) : null}
        <View style={[styles.matchGrid, viewport.compactHeight && styles.matchGridCompact]}>
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
      </ScrollView>
    );
  }

  if (view.type === 'builder') {
    const selected = tokens.length > 0;
    return (
      <ScrollView
        style={styles.immersiveScroll}
        contentContainerStyle={styles.immersiveContent}
        showsVerticalScrollIndicator={viewport.compactHeight}
        nestedScrollEnabled
        bounces={false}
      >
        <ArenaBilingualText style={[styles.prompt, styles.promptImmersive, promptStyle]}>{view.prompt}</ArenaBilingualText>
        {instruction ? (
          <>
            {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- the approved immersive instruction is intentionally capped at two wrapped lines */}
            <Text accessibilityLiveRegion="polite" numberOfLines={2}
              style={[styles.instruction, { color: P.muted, lineHeight: 18 * fontScale }]}
            >
              {instruction}
            </Text>
          </>
        ) : null}
        <ScrollView
          // зачем: лоток — зона сброса, её видно обязательно (иначе пустой лоток
          // непонятен), но плотная подложка P.elev делала из неё карточку-контейнер.
          // Даём деликатный тон из цвета текста: углубление читается, контейнера нет.
          style={[styles.answerTrayScroll, { maxHeight: viewport.answerTrayMaxHeight, backgroundColor: hexToRgba(P.text, 0.05) }]}
          contentContainerStyle={styles.answerTray}
          showsVerticalScrollIndicator={viewport.compactHeight}
          nestedScrollEnabled
          bounces={false}
        >
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
        </ScrollView>
        <View style={styles.builder}>
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
        </View>
        <V2Cta
          disabled={!selected || locked}
          onPress={() => onSubmit(encodeArenaSelection(view, tokens))}
        >
          {submitLabel}
        </V2Cta>
      </ScrollView>
    );
  }

  const selected = choice !== null;
  return (
    // зачем: вопрос — главный объект экрана, а не карточка в списке; владелец
    // просил задание без контейнера, тон задаёт фон экрана (контракт
    // arena_owner_requested_ui_contract). Режим matching уже так и устроен.
    <View style={styles.body}>
      <ArenaBilingualText style={[styles.prompt, promptStyle]}>{view.prompt}</ArenaBilingualText>
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
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  immersiveScroll: { flex: 1, minHeight: 0 },
  immersiveContent: { flexGrow: 1, gap: 10, paddingBottom: 2 },
  // Высота строки задаётся на месте: она умножается на системный масштаб.
  prompt: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  promptImmersive: { fontSize: 19 },
  instruction: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  options: { gap: 8 },
  // Прокрутка занимает только то место, что осталось: таймер и счёт выше
  // остаются на экране при любой длине вариантов.
  optionsScroll: { flexShrink: 1 },
  builder: { gap: 12 },
  answerTrayScroll: { flexShrink: 1, minHeight: 68, borderRadius: 18 },
  answerTray: { minHeight: 68, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, padding: 10 },
  tokenCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  matchGrid: { flexDirection: 'row', gap: 10 },
  matchGridCompact: { gap: 8 },
  column: { flex: 1, gap: 8, justifyContent: 'space-between' },
  touchChip: { minHeight: 48 },
  matched: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  // Отгаданная пара стоит в строке рядом со значком. Без сжатия длинное слово
  // на экране в 320 pt вылезало за край фишки: колонка узкая, а строка в ряду
  // по умолчанию не сжимается.
  matchedText: { flexShrink: 1 },
});
