// The admin generator owns structured content; the application never generates
// it. This adapter converts an approved eight-locale package into the dedicated
// Learning V2 intro renderer without importing the admin queue or generation API.
import type {
  IntroLine,
  LessonIntroScreen,
  TopicAccent,
} from '../../../app/lesson_data_types';
import {
  validateLearningV2GeneratedSessionIntro,
  type LearningV2GeneratedSessionIntro,
} from './generator_session_contract';
import type {
  LearningV2InterfaceLocale,
  LearningV2Localized,
} from './generator_course_contract';
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from './course_topology_v1';

const KIND_TO_LINE = Object.freeze({
  concept: 'text',
  formula: 'formula',
  example: 'example',
  trap: 'wrong',
  tip: 'tip',
} as const satisfies Readonly<
  Record<
    LearningV2GeneratedSessionIntro['pages'][number]['kind'],
    IntroLine['type']
  >
>);

const SCREEN_TWO_TITLE: LearningV2Localized<string> = Object.freeze({
  ru: 'Разберём по шагам',
  uk: 'Розберемо по кроках',
  es: 'Paso a paso',
  'pt-BR': 'Passo a passo',
  vi: 'Từng bước một',
  id: 'Langkah demi langkah',
  tr: 'Adım adım',
  pl: 'Krok po kroku',
});
const SCREEN_TWO_SUBTITLE: LearningV2Localized<string> = Object.freeze({
  ru: 'Одна мысль — один пример.',
  uk: 'Одна думка — один приклад.',
  es: 'Una idea, un ejemplo.',
  'pt-BR': 'Uma ideia, um exemplo.',
  vi: 'Một ý, một ví dụ.',
  id: 'Satu ide, satu contoh.',
  tr: 'Bir fikir, bir örnek.',
  pl: 'Jedna myśl, jeden przykład.',
});
const SCREEN_THREE_TITLE: LearningV2Localized<string> = Object.freeze({
  ru: 'Теперь закрепим',
  uk: 'Тепер закріпимо',
  es: 'Ahora practica',
  'pt-BR': 'Agora pratique',
  vi: 'Bây giờ hãy luyện tập',
  id: 'Sekarang berlatih',
  tr: 'Şimdi pekiştir',
  pl: 'Teraz utrwal',
});
const SCREEN_THREE_SUBTITLE: LearningV2Localized<string> = Object.freeze({
  ru: 'Ответь на вопрос внизу и переходи к практике.',
  uk: 'Дай відповідь унизу й переходь до практики.',
  es: 'Responde abajo y continúa con la práctica.',
  'pt-BR': 'Responda abaixo e siga para a prática.',
  vi: 'Trả lời bên dưới rồi chuyển sang luyện tập.',
  id: 'Jawab di bawah lalu lanjut berlatih.',
  tr: 'Aşağıdaki soruyu yanıtla ve alıştırmaya geç.',
  pl: 'Odpowiedz poniżej i przejdź do ćwiczeń.',
});

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return Object.freeze(value);
};

export function adaptLearningV2GeneratedSessionIntroToLessonScreens(
  input: Readonly<{
    intro: LearningV2GeneratedSessionIntro;
    lessonId: number;
    sessionOrdinal: number;
    topicAccent: TopicAccent;
  }>,
): readonly [LessonIntroScreen, LessonIntroScreen, LessonIntroScreen] {
  const intro = validateLearningV2GeneratedSessionIntro(input.intro);
  if (
    !Number.isSafeInteger(input.lessonId) ||
    input.lessonId < 1 ||
    input.lessonId > 10_000 ||
    !Number.isSafeInteger(input.sessionOrdinal) ||
    input.sessionOrdinal < 1 ||
    input.sessionOrdinal > LEARNING_V2_LESSON_SESSION_COUNT_V1
  ) {
    throw new Error('learning_v2_session_intro_coordinate_invalid');
  }
  const linesFor = (
    locale: LearningV2InterfaceLocale,
    page: LearningV2GeneratedSessionIntro['pages'][number],
  ): IntroLine[] => [
    {
      type: KIND_TO_LINE[page.kind],
      parts: [{ text: page.titleByLocale[locale], tone: 'strong' }],
    },
    { type: 'text', parts: [{ text: page.bodyByLocale[locale] }] },
  ];
  const localizedLines = (
    page: LearningV2GeneratedSessionIntro['pages'][number],
  ) => ({
    linesRU: linesFor('ru', page),
    linesUK: linesFor('uk', page),
    linesES: linesFor('es', page),
    linesPtBr: linesFor('pt-BR', page),
    linesVi: linesFor('vi', page),
    linesId: linesFor('id', page),
    linesTr: linesFor('tr', page),
    linesPl: linesFor('pl', page),
  });
  const interactionFor = (
    page: LearningV2GeneratedSessionIntro['pages'][number],
  ) => ({
    kind: 'embedded_intro_question' as const,
    taskSlot: page.question.requiredTaskSlot,
    questionId: page.question.questionId,
    promptByLocale: page.question.promptByLocale,
    choicesByLocale: page.question.choicesByLocale,
    correctChoiceIndex: page.question.correctChoiceIndex,
    explanationByLocale: page.question.explanationByLocale,
  });
  const base = {
    lessonId: input.lessonId,
    topicAccent: input.topicAccent,
  };
  const baseId = `learning_v2_lesson_${input.lessonId}_session_${String(input.sessionOrdinal).padStart(2, '0')}_intro`;
  return deepFreeze([
    {
      ...base,
      screenId: `${baseId}_concept`,
      order: 1,
      kind: 'concept',
      titleRU: intro.titleByLocale.ru,
      titleUK: intro.titleByLocale.uk,
      titleES: intro.titleByLocale.es,
      titlePtBr: intro.titleByLocale['pt-BR'],
      titleVi: intro.titleByLocale.vi,
      titleId: intro.titleByLocale.id,
      titleTr: intro.titleByLocale.tr,
      titlePl: intro.titleByLocale.pl,
      subtitleRU: intro.summaryByLocale.ru,
      subtitleUK: intro.summaryByLocale.uk,
      subtitleES: intro.summaryByLocale.es,
      subtitlePtBr: intro.summaryByLocale['pt-BR'],
      subtitleVi: intro.summaryByLocale.vi,
      subtitleId: intro.summaryByLocale.id,
      subtitleTr: intro.summaryByLocale.tr,
      subtitlePl: intro.summaryByLocale.pl,
      ...localizedLines(intro.pages[0]),
      learningV2EmbeddedQuestion: interactionFor(intro.pages[0]),
    },
    {
      ...base,
      screenId: `${baseId}_formula`,
      order: 2,
      kind: 'formula',
      titleRU: SCREEN_TWO_TITLE.ru,
      titleUK: SCREEN_TWO_TITLE.uk,
      titleES: SCREEN_TWO_TITLE.es,
      titlePtBr: SCREEN_TWO_TITLE['pt-BR'],
      titleVi: SCREEN_TWO_TITLE.vi,
      titleId: SCREEN_TWO_TITLE.id,
      titleTr: SCREEN_TWO_TITLE.tr,
      titlePl: SCREEN_TWO_TITLE.pl,
      subtitleRU: SCREEN_TWO_SUBTITLE.ru,
      subtitleUK: SCREEN_TWO_SUBTITLE.uk,
      subtitleES: SCREEN_TWO_SUBTITLE.es,
      subtitlePtBr: SCREEN_TWO_SUBTITLE['pt-BR'],
      subtitleVi: SCREEN_TWO_SUBTITLE.vi,
      subtitleId: SCREEN_TWO_SUBTITLE.id,
      subtitleTr: SCREEN_TWO_SUBTITLE.tr,
      subtitlePl: SCREEN_TWO_SUBTITLE.pl,
      ...localizedLines(intro.pages[1]),
      learningV2EmbeddedQuestion: interactionFor(intro.pages[1]),
    },
    {
      ...base,
      screenId: `${baseId}_practice`,
      order: 3,
      kind: 'practice',
      titleRU: SCREEN_THREE_TITLE.ru,
      titleUK: SCREEN_THREE_TITLE.uk,
      titleES: SCREEN_THREE_TITLE.es,
      titlePtBr: SCREEN_THREE_TITLE['pt-BR'],
      titleVi: SCREEN_THREE_TITLE.vi,
      titleId: SCREEN_THREE_TITLE.id,
      titleTr: SCREEN_THREE_TITLE.tr,
      titlePl: SCREEN_THREE_TITLE.pl,
      subtitleRU: SCREEN_THREE_SUBTITLE.ru,
      subtitleUK: SCREEN_THREE_SUBTITLE.uk,
      subtitleES: SCREEN_THREE_SUBTITLE.es,
      subtitlePtBr: SCREEN_THREE_SUBTITLE['pt-BR'],
      subtitleVi: SCREEN_THREE_SUBTITLE.vi,
      subtitleId: SCREEN_THREE_SUBTITLE.id,
      subtitleTr: SCREEN_THREE_SUBTITLE.tr,
      subtitlePl: SCREEN_THREE_SUBTITLE.pl,
      ...localizedLines(intro.pages[2]),
      learningV2EmbeddedQuestion: interactionFor(intro.pages[2]),
    },
  ]);
}
