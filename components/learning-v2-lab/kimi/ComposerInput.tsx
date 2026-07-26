// зачем: RN-порт source/src/surfaces/mobile/shared/ComposerInput.tsx — общий
// tap-to-place композер для Phrase Builder и Listen & Build. Тап по чипу банка
// ставит его в строку ответа, тап по поставленному — возвращает. Компонент НИЧЕГО
// не валидирует сам: вердикт приносит состояние (needs_work подчёркивает слот).
import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import TapScale from '../../TapScale';
import { GraphemeText } from './primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, TOUCH_MIN } from './tokens';

export interface ComposerInputProps {
  readonly bankChips: readonly string[];
  readonly targetTokens: readonly string[];
  readonly answer: readonly string[];
  readonly onAnswerChange: (next: readonly string[]) => void;
  readonly enabled: boolean;
  /** needs_work → подчеркнуть несовпавшие слоты с пояснением из фикстуры. */
  readonly revealWrong: boolean;
  readonly slotExplanation?: string;
  readonly onChipIntent: (type: string, payload: Record<string, unknown>) => void;
}

export const ComposerInput = memo(function ComposerInput(props: ComposerInputProps) {
  const {
    bankChips,
    targetTokens,
    answer,
    onAnswerChange,
    enabled,
    revealWrong,
    slotExplanation,
    onChipIntent,
  } = props;

  const place = useCallback(
    (chip: string) => {
      if (!enabled) return;
      // зачем: отклик мгновенный — строка ответа меняется локально, без ожиданий
      onAnswerChange([...answer, chip]);
      onChipIntent('composer.place_chip', { chip, position: answer.length });
    },
    [enabled, answer, onAnswerChange, onChipIntent],
  );

  const unplace = useCallback(
    (index: number) => {
      if (!enabled) return;
      const chip = answer[index];
      onAnswerChange(answer.filter((_, i) => i !== index));
      onChipIntent('composer.remove_chip', { chip, position: index });
    },
    [enabled, answer, onAnswerChange, onChipIntent],
  );

  const complete = answer.length === targetTokens.length;

  /** Доступность по числу копий: чип гаснет, когда все его копии расставлены. */
  const usedMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const chip of bankChips) {
      const copiesInBank = bankChips.filter((c) => c === chip).length;
      const copiesPlaced = answer.filter((c) => c === chip).length;
      map.set(chip, copiesPlaced >= copiesInBank);
    }
    return map;
  }, [bankChips, answer]);

  return (
    <View style={s.wrap}>
      <View
        style={[s.answer, complete ? s.answerComplete : null]}
        accessibilityLabel="Строка ответа"
      >
        {answer.length === 0 ? (
          <Text style={s.placeholder}>Нажимай на слова внизу…</Text>
        ) : (
          answer.map((chip, index) => (
            <Chip
              key={`${chip}-${index}`}
              text={chip}
              placed
              wrong={revealWrong && chip !== targetTokens[index]}
              disabled={!enabled}
              onPress={() => unplace(index)}
              accessibilityLabel={`Убрать ${chip}`}
            />
          ))
        )}
      </View>

      {revealWrong && slotExplanation ? (
        <View style={s.explanation}>
          <GraphemeText text={slotExplanation} maxGraphemes={120} style={s.explanationText} />
        </View>
      ) : null}

      <View style={s.bank} accessibilityLabel="Набор слов">
        {bankChips.map((chip, index) => {
          const used = usedMap.get(chip) ?? false;
          return (
            <Chip
              key={`${chip}-${index}`}
              text={chip}
              used={used}
              disabled={!enabled || used}
              onPress={() => place(chip)}
              accessibilityLabel={`Добавить ${chip}`}
            />
          );
        })}
      </View>
    </View>
  );
});

const Chip = memo(function Chip(props: {
  readonly text: string;
  readonly placed?: boolean;
  readonly wrong?: boolean;
  readonly used?: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
}) {
  const { text, placed, wrong, used, disabled, onPress, accessibilityLabel } = props;
  return (
    <TapScale
      onPress={onPress}
      disabled={disabled}
      // зачем: чип — плитка, а не управляющая кнопка: владелец просит здесь вибрацию
      withHaptic
      scaleTo={0.94}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[s.chip, placed ? s.chipPlaced : null, wrong ? s.chipWrong : null, used ? s.chipUsed : null]}
    >
      <GraphemeText
        text={text}
        maxGraphemes={24}
        style={[s.chipText, wrong ? s.chipTextWrong : null]}
      />
    </TapScale>
  );
});

const s = StyleSheet.create({
  wrap: { gap: SPACE.s3 },
  answer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.s2,
    alignItems: 'center',
    // зачем: высота строки ответа зарезервирована заранее — первый поставленный
    // чип не должен сдвигать банк слов вниз (layout-stability контракт репо)
    minHeight: 56,
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s2,
    // guard-ok: односторонняя линия строки ответа (.composer__answer из base.css)
    borderBottomWidth: 2,
    borderBottomColor: C.borderStrong,
    borderStyle: 'dashed', // guard-ok: пунктир строки ответа Kimi (.composer__answer), не обводка блока
  },
  answerComplete: {
    borderStyle: 'solid', // guard-ok: та же одна линия, сплошная при заполненной строке
    borderBottomColor: C.accentEdge,
  },
  placeholder: {
    fontSize: TEXT.sm,
    color: C.fgSecondary,
    paddingHorizontal: SPACE.s2,
  },
  chip: {
    minHeight: TOUCH_MIN,
    paddingVertical: SPACE.s1,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.pill,
    backgroundColor: C.bgSurface,
    justifyContent: 'center',
  },
  chipPlaced: { backgroundColor: C.accentSoft },
  chipWrong: { backgroundColor: '#2A2729' },
  chipUsed: { opacity: 0.35 },
  chipText: { fontSize: TEXT.md, color: C.fgPrimary },
  // зачем: волнистого подчёркивания в RN нет — Kimi метит ошибочный слот цветом
  // needs_work; сохраняем смысл (жёлтая метка), не выдумывая свою обводку
  chipTextWrong: { color: C.gold, textDecorationLine: 'underline' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  explanation: {
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    backgroundColor: '#2A2729',
  },
  explanationText: { fontSize: TEXT.sm, color: C.gold, lineHeight: TEXT.sm * LEADING.snug },
});
