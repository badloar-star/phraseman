// ═══════════════════════════════════════════════════════════════════════════
// ExpandedTaskView.tsx — одно задание любой из двенадцати новых механик.
//
// зачем (владелец 11.11.2026): механики нужны и в Пике, и в экзаменах. Этот экран — общий:
// подпись задания, плашка вопроса, условие, поле ответа, «Проверить», разбор.
// Проверка — только по кнопке и только полного ответа; вердикт считает чистая логика
// (modules/expanded-formats/grade.ts) мгновенно, без сети. Родителю уходит один вызов onAnswer.
// После ответа ввод закрыт, выбранное подсвечено, показан разбор именно допущенной ошибки.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { applyExpandedAction, type ExpandedAction } from '../../modules/expanded-formats/draft';
import { expandedFeedbackText } from '../../modules/expanded-formats/feedback';
import {
  emptyExpandedResponse,
  expandedCorrectText,
  gradeExpanded,
  isExpandedResponseComplete,
} from '../../modules/expanded-formats/grade';
import type { ExpandedResponse, ExpandedTask } from '../../modules/expanded-formats/types';
import { alphaHex as lv2Alpha } from '../../constants/v2Style';
import { useSpirePalette } from '../spire/useSpirePalette';
import { useSpireShadow } from '../spire/useSpireShadow';
import V2Pressable from '../v2/V2Pressable';
import ExpandedTaskBody from './ExpandedTaskBody';
import { expandedText } from './expanded_strings';
import { expandedStyles as s } from './expanded_styles';

export type ExpandedAnswer = Readonly<{ response: ExpandedResponse; correct: boolean }>;

type Props = Readonly<{
  lang: Lang;
  task: ExpandedTask;
  /** Ввод закрыт снаружи (пауза, время вышло). */
  disabled?: boolean;
  /** Ответ проверен. Вызывается один раз на задание. */
  onAnswer: (answer: ExpandedAnswer) => void;
  /** Есть — под разбором показывается «Дальше» (экзамен). Нет — родитель идёт дальше сам (Пик). */
  onNext?: () => void;
  /** Пик сам показывает «Правильно: …» и «Дальше» — здесь остаётся только разбор ошибки, без заголовка. */
  explanationOnly?: boolean;
}>;

function ExpandedTaskView({ lang, task, disabled = false, onAnswer, onNext, explanationOnly = false }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const [response, setResponse] = useState<ExpandedResponse>(() => emptyExpandedResponse(task.exercise));
  const [verdict, setVerdict] = useState<boolean | null>(null);
  // зачем (двойной тап): «Проверить» и Enter на клавиатуре могут прийти в один кадр — ответ уходит родителю ровно один раз
  const answeredRef = useRef(false);

  // зачем: экран переиспользуется для следующего задания — черновик и вердикт прежнего не должны переехать
  useEffect(() => {
    answeredRef.current = false;
    setResponse(emptyExpandedResponse(task.exercise));
    setVerdict(null);
  }, [task.id, task.exercise]);

  const locked = disabled || verdict !== null;
  const complete = isExpandedResponseComplete(task.exercise, response);

  const dispatch = useCallback((action: ExpandedAction) => {
    if (answeredRef.current) return;
    setResponse((current) => applyExpandedAction(task.exercise, current, action));
  }, [task.exercise]);

  const check = useCallback(() => {
    if (answeredRef.current || disabled) {
      console.warn('[EXPANDED] check ignored', JSON.stringify({ taskId: task.id, answered: answeredRef.current, disabled })); // guard-ok: ранний выход, причина обязана быть в журнале
      return;
    }
    if (!isExpandedResponseComplete(task.exercise, response)) {
      console.warn('[EXPANDED] check ignored: incomplete', JSON.stringify({ taskId: task.id, format: task.exercise.format })); // guard-ok: ранний выход
      return;
    }
    answeredRef.current = true;
    const correct = gradeExpanded(task.exercise, response, task.studyTarget);
    setVerdict(correct);
    onAnswer({ response, correct });
  }, [disabled, onAnswer, response, task.exercise, task.id, task.studyTarget]);

  const format = task.exercise.format;
  const countLine = verdict !== null ? ''
    : format === 'dialogue_order' && response.format === 'dialogue_order'
      ? expandedText(lang, 'countOrder', { k: response.order.length, n: task.exercise.format === 'dialogue_order' ? task.exercise.bank.length : 0 })
      : format === 'sentence_build_noise' && response.format === 'sentence_build_noise'
        ? expandedText(lang, 'countWords', { k: response.order.length, n: task.exercise.format === 'sentence_build_noise' ? task.exercise.need : 0 })
        : format === 'multi_select' && response.format === 'multi_select'
          ? expandedText(lang, 'countPicked', { k: response.picked.length, n: task.exercise.format === 'multi_select' ? task.exercise.key.length : 0 })
          : '';

  const explanation = verdict === null ? '' : expandedFeedbackText(task, response, verdict);
  const passage = task.exercise.format === 'evidence_choice' ? task.exercise.passage : '';

  return (
    <View testID="expanded-task">
      <View style={s.overRow}>
        <View style={[s.overLine, { backgroundColor: p.divider }]} />
        <Text style={[s.overline, { color: p.textSecondary }]}>{task.instruction.toUpperCase()}</Text>
        <View style={[s.overLine, { backgroundColor: p.divider }]} />
      </View>
      <View style={[s.question, { backgroundColor: p.cardRaised }, sh.plate]}>
        <Text accessibilityRole="header" style={[s.phrase, { color: p.text }]}>{task.prompt}</Text>
      </View>
      {task.context ? <Text style={[s.context, { color: p.textSecondary }]}>{task.context}</Text> : null}
      {passage ? <Text style={[s.context, s.passage, { color: p.textSecondary }]}>{passage}</Text> : null}

      <View style={s.body}>
        <ExpandedTaskBody
          lang={lang}
          taskId={task.id}
          exercise={task.exercise}
          response={response}
          verdict={verdict}
          disabled={locked}
          dispatch={dispatch}
          onSubmit={check}
        />
      </View>

      {verdict === null ? (
        <>
          <V2Pressable
            onPress={check}
            disabled={disabled || !complete}
            accessibilityRole="button"
            accessibilityLabel={expandedText(lang, 'check')}
            accessibilityState={{ disabled: disabled || !complete }}
            style={[s.check, complete ? [{ backgroundColor: p.cta }, sh.action(p.cta)] : [{ backgroundColor: p.control }, sh.nested]]}
            testID="expanded-check"
          >
            <Text style={[s.checkText, { color: complete ? p.ctaText : p.textSecondary }]}>{expandedText(lang, 'check')}</Text>
          </V2Pressable>
          {countLine ? <Text style={[s.count, { color: p.textSecondary }]} testID="expanded-count">{countLine}</Text> : null}
        </>
      ) : explanationOnly && !explanation ? null : (
        <View
          style={[s.feedback, { backgroundColor: lv2Alpha(verdict ? p.correct : p.wrong, 0.14) }, sh.plate]}
          accessibilityLiveRegion="polite"
          testID={verdict ? 'expanded-feedback-ok' : 'expanded-feedback-no'}
        >
          {explanationOnly ? null : (
            <Text style={[s.feedbackHead, { color: p.text }]}>
              {verdict ? expandedText(lang, 'right') : expandedText(lang, 'correctIs', { x: expandedCorrectText(task.exercise) })}
            </Text>
          )}
          {explanation ? <Text style={[s.feedbackText, { color: p.text }]}>{explanation}</Text> : null}
          {onNext ? (
            <V2Pressable
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={expandedText(lang, 'next')}
              style={[s.onward, { backgroundColor: p.cta }, sh.action(p.cta)]}
              testID="expanded-next"
            >
              <Text style={[s.checkText, { color: p.ctaText }]}>{`${expandedText(lang, 'next')} →`}</Text>
            </V2Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

export default memo(ExpandedTaskView);
