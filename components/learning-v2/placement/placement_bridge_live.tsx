// placement_bridge_live.tsx — живой мост теста «Не хочу с начала» на данных Learning V2 (app/learning_v2_placement_v1.ts).
// зачем (Learning V2 24.10): вопросы, названия тем и запись итога — их функции; вопрос рисуется тем же компонентом, что вопрос экзамена главы (ChapterExamQuestion),
// поэтому проверка ответа и подсказки режимов те же. Здесь только склейка и «Начать урок N» (тот же запуск занятия, что у «Повторить эпизод» в разборе экзамена).
import React, { useCallback } from 'react';

import { ChapterExamQuestion, type Answer } from '../../../app/learning-v2/chapter-exam';
import {
  applyLearningV2PlacementResultV1,
  learningV2PlacementLessonsV1,
  learningV2PlacementLessonTitleV1,
  learningV2PlacementQuestionV1,
} from '../../../app/learning_v2_placement_v1';
import { launchLearningV2SessionByOrdinalsV1 } from '../../../app/learning_v2_home_continue_route';
import type { LearningV2InterfaceLocale } from '../../../modules/learning-v2/content/generator_course_contract';
import { PLACEMENT_LOG, type PlacementBridgeV1, type PlacementQuestionRendererProps } from './placement_bridge';

type LiveDeps = Readonly<{
  lang: string;
  studyTarget: string;
  push: (href: unknown) => void;
}>;

const localeOf = (lang: string): 'ru' | 'uk' => (lang === 'uk' ? 'uk' : 'ru');

export function createLivePlacementBridge(deps: LiveDeps): PlacementBridgeV1 {
  const locale = localeOf(deps.lang);
  function QuestionRenderer({ question, header, bottomInset, onAnswered, onNext }: PlacementQuestionRendererProps) {
    const handleAnswered = useCallback((answer: Answer) => onAnswered(answer.correct), [onAnswered]);
    return (
      <ChapterExamQuestion
        ordinal={question.ordinal}
        question={question}
        lessonOrdinal={question.lessonOrdinal}
        locale={locale}
        interfaceLocale={deps.lang as LearningV2InterfaceLocale}
        bottomInset={bottomInset}
        onAnswered={handleAnswered}
        onNext={onNext}
        header={header}
        promptOverride={question.promptOverride}
      />
    );
  }
  return {
    lessons: learningV2PlacementLessonsV1(),
    lessonTitle: (lessonOrdinal) => learningV2PlacementLessonTitleV1(lessonOrdinal),
    questionFor: (input) => learningV2PlacementQuestionV1({ ...input, locale }),
    QuestionRenderer,
    applyResult: applyLearningV2PlacementResultV1,
    startLesson: (lessonOrdinal) => {
      console.log(PLACEMENT_LOG, 'launch', JSON.stringify({ lessonOrdinal, sessionOrdinal: 1 })); // guard-ok: куда ведёт «Начать урок N»
      void launchLearningV2SessionByOrdinalsV1(
        { lessonOrdinal, sessionOrdinal: 1, from: 'placement_result', repeat: false },
        { lang: deps.lang, studyTarget: deps.studyTarget, push: deps.push },
      );
    },
  };
}
