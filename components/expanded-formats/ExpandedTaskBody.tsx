// ═══════════════════════════════════════════════════════════════════════════
// ExpandedTaskBody.tsx — поле ответа для двенадцати новых механик.
//
// зачем: одна точка, где формат задания превращается в элементы ввода. Экран ничего не решает:
// нажатие уходит действием в чистую логику (modules/expanded-formats/draft.ts), вердикт приходит снаружи.
// Вид — перенос одобренного макета Кодекса peak-all-languages.html (размеры в expanded_styles.ts).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import type { ExpandedAction } from '../../modules/expanded-formats/draft';
import type { ExpandedExercise, ExpandedResponse } from '../../modules/expanded-formats/types';
import { alphaHex as lv2Alpha } from '../../constants/v2Style';
import { useSpirePalette } from '../spire/useSpirePalette';
import { useSpireShadow } from '../spire/useSpireShadow';
import V2Pressable from '../v2/V2Pressable';
import { expandedText } from './expanded_strings';
import { expandedStyles as s } from './expanded_styles';

/** idle — не выбрано; chosen — выбрано до проверки; ok / no — после проверки. */
type Tone = 'idle' | 'chosen' | 'ok' | 'no';

export type ExpandedBodyProps = Readonly<{
  lang: Lang;
  taskId: string;
  exercise: ExpandedExercise;
  response: ExpandedResponse;
  /** Ответ уже проверен: ввод закрыт, элементы подсвечены. */
  verdict: boolean | null;
  disabled: boolean;
  dispatch: (action: ExpandedAction) => void;
  /** Enter в поле ввода — то же, что «Проверить». */
  onSubmit: () => void;
}>;

function toneAfter(verdict: boolean | null, chosen: boolean, isKey: boolean): Tone {
  if (verdict === null) return chosen ? 'chosen' : 'idle';
  if (chosen) return isKey ? 'ok' : 'no';
  // зачем: после ошибки верный вариант подсвечивается, чтобы было видно, что надо было выбрать
  return !verdict && isKey ? 'ok' : 'idle';
}

type PartProps = Readonly<{ label: string; tone: Tone; disabled: boolean; dimmed?: boolean; onPress: () => void; testID: string }>;

/** Полноширинный вариант ответа (.option). */
const Option = memo(function Option({ label, tone, disabled, onPress, testID }: PartProps) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const bg = tone === 'ok' ? lv2Alpha(p.correct, 0.12) : tone === 'no' ? lv2Alpha(p.wrong, 0.12) : tone === 'chosen' ? p.control : p.card;
  return (
    <V2Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: tone !== 'idle' }}
      style={[s.option, { backgroundColor: bg }, tone === 'chosen' ? sh.plate : sh.nested]}
      testID={testID}
    >
      {tone === 'chosen' ? <Text style={[s.optionTick, { color: p.text }]}>✓</Text> : null}
      <Text style={[s.optionText, { color: p.text }]}>{label}</Text>
    </V2Pressable>
  );
});

/** Плитка-слово или плитка-вариант (.token). */
const Chip = memo(function Chip({ label, tone, disabled, dimmed, onPress, testID }: PartProps) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const bg = tone === 'ok' ? lv2Alpha(p.correct, 0.18) : tone === 'no' ? lv2Alpha(p.wrong, 0.18) : tone === 'chosen' ? p.cta : p.control;
  const ink = tone === 'ok' ? p.correct : tone === 'no' ? p.wrong : tone === 'chosen' ? p.ctaText : p.text;
  return (
    <V2Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: tone !== 'idle' }}
      style={[s.token, { backgroundColor: bg, opacity: dimmed ? 0.3 : 1 }, sh.nested]}
      testID={testID}
    >
      <Text style={[s.tokenText, { color: ink }]}>{label}</Text>
    </V2Pressable>
  );
});

/** Ячейки ответа + банк плиток: «порядок реплик» и «сборка с лишними словами». */
function OrderBody({ taskId, exercise, response, verdict, disabled, dispatch, wide }: ExpandedBodyProps & { wide: boolean }) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  if ((exercise.format !== 'dialogue_order' && exercise.format !== 'sentence_build_noise') || response.format !== exercise.format) return null;
  const order = (response as { order: readonly number[] }).order;
  const bank = exercise.bank;
  const key = exercise.key;
  const cellCount = exercise.format === 'sentence_build_noise' ? exercise.need : bank.length;
  return (
    <View>
      <View style={s.cells}>
        {Array.from({ length: cellCount }, (_unused, at) => {
          const bankIndex = order[at];
          const filled = bankIndex !== undefined;
          const right = filled && bank[bankIndex] === bank[key[at]];
          const ink = verdict === null ? p.text : right ? p.correct : p.wrong;
          const fill = verdict === null ? p.cardRaised : lv2Alpha(right ? p.correct : p.wrong, 0.18);
          return (
            // guard-ok: число ячеек фиксировано на задание, порядок не меняется
            <View key={`${taskId}:cell${at}`} style={[s.cell, filled && wide ? s.cellWide : null, { backgroundColor: lv2Alpha(p.text, 0.06) }]} testID={`expanded-cell-${at}`}>
              {filled ? (
                <V2Pressable
                  onPress={() => dispatch({ type: 'take', position: at })}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={bank[bankIndex]}
                  style={[s.cellToken, { backgroundColor: fill }, verdict === null ? sh.nested : null]}
                >
                  <Text style={[s.tokenText, { color: ink }]}>{bank[bankIndex]}</Text>
                </V2Pressable>
              ) : (
                <Text style={[s.cellNum, { color: p.textSecondary }]} accessibilityLabel={String(at + 1)}>{at + 1}</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={[s.bank, s.bankBelow]}>
        {bank.map((label, index) => {
          const used = order.includes(index);
          return (
            <Chip
              key={`${taskId}:bank${index}`}
              label={label}
              tone="idle"
              dimmed={used}
              disabled={disabled || used || order.length >= cellCount}
              onPress={() => dispatch({ type: 'tap', index })}
              testID={`expanded-bank-${index}`}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Пары вопрос–ответ: нажать вопрос, затем ответ. Выбранный вопрос живёт только на экране. */
function PairsBody({ taskId, exercise, response, verdict, disabled, dispatch }: ExpandedBodyProps) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const pairs = response.format === 'reply_pairs' ? response.pairs : [];
  const tapLeft = useCallback((index: number) => {
    // зачем (макет): нажатие на вопрос, уже стоящий в паре, разбирает пару и берёт вопрос заново
    if (pairs[index] !== null && pairs[index] !== undefined) dispatch({ type: 'assign', slot: index, value: null });
    setActiveLeft((current) => (current === index ? null : index));
  }, [dispatch, pairs]);
  const tapRight = useCallback((index: number) => {
    if (activeLeft === null) return;
    dispatch({ type: 'assign', slot: activeLeft, value: index });
    setActiveLeft(null);
  }, [activeLeft, dispatch]);
  if (exercise.format !== 'reply_pairs') return null;

  const tileColors = (paired: boolean, active: boolean, right: boolean | null) => {
    if (verdict !== null && right !== null) return { bg: lv2Alpha(right ? p.correct : p.wrong, 0.18), ink: right ? p.correct : p.wrong };
    if (active) return { bg: lv2Alpha(p.accentGraphic, 0.32), ink: p.text };
    if (paired) return { bg: p.control, ink: p.textSecondary };
    return { bg: p.card, ink: p.text };
  };
  return (
    <View style={s.pairsGrid} testID="expanded-pairs">
      <View style={s.pairColumn}>
        {exercise.questions.map((question, index) => {
          const paired = pairs[index] !== null && pairs[index] !== undefined;
          const colors = tileColors(paired, activeLeft === index, paired ? pairs[index] === exercise.key[index] : null);
          return (
            <V2Pressable
              key={`${taskId}:q${index}`}
              onPress={() => tapLeft(index)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={question}
              accessibilityState={{ disabled, selected: activeLeft === index }}
              style={[s.pairTile, { backgroundColor: colors.bg }, sh.nested]}
              testID={`expanded-pair-left-${index}`}
            >
              <Text style={[s.pairText, { color: colors.ink }]}>{paired ? `${index + 1} · ${question}` : question}</Text>
            </V2Pressable>
          );
        })}
      </View>
      <View style={s.pairColumn}>
        {exercise.replies.map((reply, index) => {
          const owner = pairs.findIndex((value) => value === index);
          const paired = owner >= 0;
          const colors = tileColors(paired, false, paired ? exercise.key[owner] === index : null);
          return (
            <V2Pressable
              key={`${taskId}:r${index}`}
              onPress={() => tapRight(index)}
              disabled={disabled || activeLeft === null || paired}
              accessibilityRole="button"
              accessibilityLabel={reply}
              accessibilityState={{ disabled: disabled || activeLeft === null || paired }}
              style={[s.pairTile, { backgroundColor: colors.bg }, sh.nested]}
              testID={`expanded-pair-right-${index}`}
            >
              <Text style={[s.pairText, { color: colors.ink }]}>{paired ? `${owner + 1} · ${reply}` : reply}</Text>
            </V2Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ExpandedTaskBody(props: ExpandedBodyProps) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const { lang, taskId, exercise, response, verdict, disabled, dispatch, onSubmit } = props;
  if (exercise.format !== response.format) return null;

  switch (exercise.format) {
    case 'context_choice':
    case 'evidence_choice': {
      const picked = (response as { picked: number | null }).picked;
      return (
        <View style={s.stack}>
          {exercise.options.map((label, index) => (
            <Option key={`${taskId}:o${index}`} label={label} tone={toneAfter(verdict, picked === index, exercise.key === index)} disabled={disabled} onPress={() => dispatch({ type: 'tap', index })} testID={`expanded-opt-${index}`} />
          ))}
        </View>
      );
    }
    case 'multi_select': {
      const picked = (response as { picked: readonly number[] }).picked;
      return (
        <View style={s.stack}>
          {exercise.options.map((label, index) => (
            <Option key={`${taskId}:o${index}`} label={label} tone={toneAfter(verdict, picked.includes(index), exercise.key.includes(index))} disabled={disabled} onPress={() => dispatch({ type: 'tap', index })} testID={`expanded-opt-${index}`} />
          ))}
        </View>
      );
    }
    case 'dialogue_order':
      return <OrderBody {...props} wide />;
    case 'sentence_build_noise':
      return <OrderBody {...props} wide={false} />;
    case 'word_repair': {
      const answer = response as { wordIndex: number | null; replacementIndex: number | null };
      return (
        <View>
          <View style={s.bank}>
            {exercise.words.map((label, index) => (
              <Chip key={`${taskId}:w${index}`} label={label} tone={toneAfter(verdict, answer.wordIndex === index, exercise.key.word === index)} disabled={disabled} onPress={() => dispatch({ type: 'tap', index })} testID={`expanded-word-${index}`} />
            ))}
          </View>
          <Text style={[s.gapLabel, { color: p.text }]}>{expandedText(lang, 'replaceWith')}</Text>
          <View style={s.bank}>
            {exercise.replacements.map((label, index) => (
              <Chip key={`${taskId}:r${index}`} label={label} tone={toneAfter(verdict, answer.replacementIndex === index, exercise.key.replacement === index)} disabled={disabled} onPress={() => dispatch({ type: 'replacement', index })} testID={`expanded-replacement-${index}`} />
            ))}
          </View>
        </View>
      );
    }
    case 'linked_gaps': {
      const picked = (response as { picked: readonly (number | null)[] }).picked;
      return (
        <View>
          {exercise.slots.map((options, slot) => (
            <View key={`${taskId}:g${slot}`} accessibilityRole="radiogroup" accessibilityLabel={expandedText(lang, 'gapN', { n: slot + 1 })}>
              <Text style={[s.gapLabel, slot === 0 ? s.gapLabelFirst : null, { color: p.text }]}>{expandedText(lang, 'gapN', { n: slot + 1 })}</Text>
              <View style={s.bank}>
                {options.map((label, index) => (
                  <Chip key={`${taskId}:g${slot}:${index}`} label={label} tone={toneAfter(verdict, picked[slot] === index, exercise.key[slot] === index)} disabled={disabled} onPress={() => dispatch({ type: 'assign', slot, value: index })} testID={`expanded-gap-${slot}-${index}`} />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'typed_word':
    case 'sentence_transform': {
      const label = expandedText(lang, exercise.format === 'typed_word' ? 'missingWord' : 'yourSentence');
      const value = (response as { text: string }).text;
      const ink = verdict === null ? p.text : verdict ? p.correct : p.wrong;
      return (
        <View>
          <Text style={[s.gapLabel, s.gapLabelFirst, { color: p.text }]}>{label}</Text>
          {/* зачем: плашка поля (фон, тень, скругление) — на обёртке; у TextInput только текстовые стили, тень вида ему не подходит по типу */}
          <View style={[s.inputPlate, { backgroundColor: p.card }, sh.nested]}>
          <TextInput
            value={value}
            onChangeText={(text) => dispatch({ type: 'text', value: text })}
            onSubmitEditing={onSubmit}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            returnKeyType="done"
            accessibilityLabel={label}
            selectionColor={p.accentGraphic}
            style={[s.input, { color: ink }]}
            testID="expanded-input"
          />
          </View>
        </View>
      );
    }
    case 'classify_function': {
      const assignments = (response as { assignments: readonly (number | null)[] }).assignments;
      return (
        <View style={s.stack}>
          {exercise.items.map((item, itemIndex) => (
            <View key={`${taskId}:c${itemIndex}`} style={[s.classifyCard, { backgroundColor: p.cardRaised }, sh.plate]} accessibilityRole="radiogroup" accessibilityLabel={item}>
              <Text style={[s.classifyText, { color: p.text }]}>{item}</Text>
              <View style={s.bank}>
                {exercise.groups.map((group, groupIndex) => (
                  <Chip key={`${taskId}:c${itemIndex}:${groupIndex}`} label={group} tone={toneAfter(verdict, assignments[itemIndex] === groupIndex, exercise.key[itemIndex] === groupIndex)} disabled={disabled} onPress={() => dispatch({ type: 'assign', slot: itemIndex, value: groupIndex })} testID={`expanded-classify-${itemIndex}-${groupIndex}`} />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'reply_pairs':
      return <PairsBody {...props} />;
    case 'remove_intruder': {
      const removed = (response as { removed: number | null }).removed;
      return (
        <View style={s.bank}>
          {exercise.words.map((label, index) => (
            <Chip key={`${taskId}:w${index}`} label={label} tone={toneAfter(verdict, removed === index, exercise.key === index)} disabled={disabled} onPress={() => dispatch({ type: 'tap', index })} testID={`expanded-word-${index}`} />
          ))}
        </View>
      );
    }
    default:
      return null;
  }
}

export default memo(ExpandedTaskBody);
