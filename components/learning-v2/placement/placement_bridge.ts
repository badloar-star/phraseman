// placement_bridge.ts — шов между интерфейсом теста «Не хочу с начала» и данными Learning V2 (вопросы, названия тем, запись прогресса).
// зачем (координатор 24.10: «только интерфейс; движок и прогресс — Learning V2, их файлы не трогай»): экран теста не знает, откуда берутся вопросы и как открываются уроки —
// только этот контракт. Живая реализация — placement_bridge_live.tsx (на app/learning_v2_placement_v1.ts от Learning V2); в тестах подставляется заглушка.
import type React from 'react';

import type { PlacementTestResultV1 } from '../../../modules/learning-v2/exam/placement_test_v1';
import type { LearningV2PlacementQuestionV1 } from '../../../app/learning_v2_placement_v1';

export const PLACEMENT_LOG = '[PLACEMENT-UI]';

export type PlacementQuestionRef = LearningV2PlacementQuestionV1;

export type PlacementQuestionRendererProps = Readonly<{
  question: PlacementQuestionRef;
  /** Карточка темы и плашка «ещё 2» — рендерер ставит их над телом задания (макет: между шапкой и «что сделать»). */
  header: React.ReactNode;
  bottomInset: number;
  /** Ответ принят: true — верно. Вызывается один раз на вопрос. */
  onAnswered: (correct: boolean) => void;
  /** «Дальше» после ответа. */
  onNext: () => void;
}>;

export type PlacementBridgeV1 = Readonly<{
  /** Уроки с материалами по порядку — для `startPlacementTestV1(lessons)`. */
  lessons: readonly number[];
  lessonTitle: (lessonOrdinal: number, lang: string) => string;
  /** Следующий вопрос по теме урока; attemptIndex 0…2; usedInteractionIds — уже заданные в этой теме. null — вопросов нет. */
  questionFor: (input: Readonly<{ lessonOrdinal: number; attemptIndex: number; usedInteractionIds: readonly string[] }>) => PlacementQuestionRef | null;
  QuestionRenderer: React.ComponentType<PlacementQuestionRendererProps>;
  /** Итог: открыть уроки результата в прогрессе и поставить флаг «Не хочу с начала» (Learning V2, только на экране итога). */
  applyResult: (result: PlacementTestResultV1) => Promise<unknown>;
  /** «Начать урок N» с экрана итога. */
  startLesson: (lessonOrdinal: number) => void;
}>;
