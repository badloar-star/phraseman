// ═══════════════════════════════════════════════════════════════════════════
// ExpandedExamQuestion.tsx — задание новой механики внутри экзамена уровня.
//
// зачем (владелец 11.11.2026): в экзамене, в отличие от Пика, ответ не проверяется на месте —
// его можно менять до «Продолжить», баллы считаются в конце. Поэтому здесь нет кнопки «Проверить»
// и вердикта: поле ответа (общее с Пиком, ExpandedTaskBody) управляется сохранённым черновиком попытки.
// Подпись и главная фраза задания рисует рамка экзамена (LevelExamQuestionFrame).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LevelExamExpandedTask } from '../../app/level_exam_types';
import type { Lang } from '../../constants/i18n';
import { applyExpandedAction, type ExpandedAction } from '../../modules/expanded-formats/draft';
import type { ExpandedResponse } from '../../modules/expanded-formats/types';
import ExpandedTaskBody from '../expanded-formats/ExpandedTaskBody';
import { expandedText } from '../expanded-formats/expanded_strings';
import { useSpirePalette } from '../spire/useSpirePalette';

type Props = Readonly<{
  lang: Lang;
  task: LevelExamExpandedTask;
  response: ExpandedResponse;
  onChange: (next: ExpandedResponse) => void;
}>;

const noop = (): void => undefined;

function ExpandedExamQuestion({ lang, task, response, onChange }: Props) {
  const p = useSpirePalette();
  const dispatch = useCallback((action: ExpandedAction) => {
    const next = applyExpandedAction(task.exercise, response, action);
    // зачем: действие, ничего не изменившее (третий вариант при «выберите два»), не пишет попытку в хранилище
    if (next !== response) onChange(next);
  }, [onChange, response, task.exercise]);

  const exercise = task.exercise;
  const passage = exercise.format === 'evidence_choice' ? exercise.passage : '';
  const count = exercise.format === 'multi_select' && response.format === 'multi_select'
    ? expandedText(lang, 'countPicked', { k: response.picked.length, n: exercise.key.length })
    : exercise.format === 'dialogue_order' && response.format === 'dialogue_order'
      ? expandedText(lang, 'countOrder', { k: response.order.length, n: exercise.bank.length })
      : exercise.format === 'sentence_build_noise' && response.format === 'sentence_build_noise'
        ? expandedText(lang, 'countWords', { k: response.order.length, n: exercise.need })
        : '';

  return (
    <View testID={`level-exam-expanded-${exercise.format}`}>
      {task.context ? <Text style={[s.context, { color: p.textSecondary }]}>{task.context}</Text> : null}
      {passage ? <Text style={[s.context, { color: p.textSecondary }]}>{passage}</Text> : null}
      <View style={task.context || passage ? s.body : null}>
        <ExpandedTaskBody
          lang={lang}
          taskId={task.id}
          exercise={exercise}
          response={response}
          verdict={null}
          disabled={false}
          dispatch={dispatch}
          onSubmit={noop}
        />
      </View>
      {count ? <Text style={[s.count, { color: p.textSecondary }]}>{count}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  context: { fontSize: 16, lineHeight: 22 },
  body: { marginTop: 18 },
  count: { marginTop: 10, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});

export default memo(ExpandedExamQuestion);
