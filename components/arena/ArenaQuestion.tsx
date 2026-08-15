import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { V2Card, V2Chip, V2Cta, type ChipVerdict } from '../tournament/tournament_v2_ui';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { adaptArenaTask, encodeArenaSelection } from '../../modules/arena/task_adapter';
import type { ArenaPublicTask } from '../../modules/arena/contract';
import { useArenaFontScale } from '../../hooks/use_arena_font_scale';
import { useArenaSound } from '../../hooks/use_arena_sound';

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
      <V2Card style={styles.card}>
        <Text style={[styles.prompt, promptStyle]}>{view.prompt}</Text>
        <View style={styles.matchGrid}>
          <View style={styles.column}>
            {view.left.map((item, index) => (
              <V2Chip key={`${item}-${index}`} selected={left === index} disabled={locked || matchedLeft.has(index)} onPress={() => setLeft(index)}>
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
                disabled={locked || left === null || matchedRight.has(index)}
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
      </V2Card>
    );
  }

  const selected = view.type === 'choices' ? choice !== null : tokens.length > 0;
  return (
    <V2Card style={styles.card}>
      <Text style={[styles.prompt, promptStyle]}>{view.prompt}</Text>
      {view.type === 'choices' ? (
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
      ) : (
        /**
         * Поднос ответа и банк слов прокручиваются ВМЕСТЕ, а кнопка отправки
         * остаётся снаружи. Иначе при длинных словах банк вырастал и выдавливал
         * кнопку за край: игрок собрал перевод и не мог его отправить — то есть
         * терял задание, сделав всё правильно.
         */
        <ScrollView
          style={styles.optionsScroll}
          contentContainerStyle={styles.builder}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.answerTray, { backgroundColor: P.elev }]}>
            {tokens.map((index) => <V2Chip key={`${index}-${tokens.indexOf(index)}`} onPress={() => !locked && setTokens((old) => old.filter((_, i) => i !== old.indexOf(index)))}>{view.tokens[index]}</V2Chip>)}
          </View>
          <View style={styles.tokenCloud}>
            {view.tokens.map((token, index) => (
              <V2Chip key={`${token}-${index}`} disabled={locked || tokens.includes(index)} onPress={() => setTokens((old) => [...old, index])}>{token}</V2Chip>
            ))}
          </View>
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
  // Высота строки задаётся на месте: она умножается на системный масштаб.
  prompt: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  options: { gap: 10 },
  // Прокрутка занимает только то место, что осталось: таймер и счёт выше
  // остаются на экране при любой длине вариантов.
  optionsScroll: { flexShrink: 1 },
  builder: { gap: 12 },
  answerTray: { minHeight: 68, borderRadius: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, padding: 10 },
  tokenCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  matchGrid: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 8 },
  matched: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  // Отгаданная пара стоит в строке рядом со значком. Без сжатия длинное слово
  // на экране в 320 pt вылезало за край фишки: колонка узкая, а строка в ряду
  // по умолчанию не сжимается.
  matchedText: { flexShrink: 1 },
});
