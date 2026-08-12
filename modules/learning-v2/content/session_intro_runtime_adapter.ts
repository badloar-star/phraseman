// The admin generator owns structured content; the application never generates
// it. This adapter converts an approved eight-locale package into the dedicated
// Learning V2 intro renderer without importing the admin queue or generation API.
import type { IntroLine, LessonIntroScreen, TopicAccent } from '../../../app/lesson_data_types';
import {
  validateLearningV2GeneratedSessionIntro,
  type LearningV2GeneratedSessionIntro,
} from './generator_session_contract';
import type { LearningV2InterfaceLocale, LearningV2Localized } from './generator_course_contract';

const KIND_TO_LINE = Object.freeze({
  concept: 'text',
  formula: 'formula',
  example: 'example',
  trap: 'wrong',
  tip: 'tip',
} as const satisfies Readonly<Record<LearningV2GeneratedSessionIntro['blocks'][number]['kind'], IntroLine['type']>>);

const SCREEN_TWO_TITLE: LearningV2Localized<string> = Object.freeze({
  ru: 'Разберём по шагам', uk: 'Розберемо по кроках', es: 'Paso a paso', 'pt-BR': 'Passo a passo',
  vi: 'Từng bước một', id: 'Langkah demi langkah', tr: 'Adım adım', pl: 'Krok po kroku',
});
const SCREEN_TWO_SUBTITLE: LearningV2Localized<string> = Object.freeze({
  ru: 'Одна мысль — один пример.', uk: 'Одна думка — один приклад.', es: 'Una idea, un ejemplo.', 'pt-BR': 'Uma ideia, um exemplo.',
  vi: 'Một ý, một ví dụ.', id: 'Satu ide, satu contoh.', tr: 'Bir fikir, bir örnek.', pl: 'Jedna myśl, jeden przykład.',
});
const SCREEN_THREE_TITLE: LearningV2Localized<string> = Object.freeze({
  ru: 'Теперь закрепим', uk: 'Тепер закріпимо', es: 'Ahora practica', 'pt-BR': 'Agora pratique',
  vi: 'Bây giờ hãy luyện tập', id: 'Sekarang berlatih', tr: 'Şimdi pekiştir', pl: 'Teraz utrwal',
});
const SCREEN_THREE_SUBTITLE: LearningV2Localized<string> = Object.freeze({
  ru: 'В конце — 3 вопроса по теме.', uk: 'Наприкінці — 3 запитання за темою.', es: 'Al final: 3 preguntas sobre el tema.', 'pt-BR': 'No final: 3 perguntas sobre o tema.',
  vi: 'Cuối phần có 3 câu hỏi về chủ đề.', id: 'Di akhir ada 3 pertanyaan tentang topik.', tr: 'Sonda konuyla ilgili 3 soru var.', pl: 'Na końcu są 3 pytania z tematu.',
});

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
};

export function adaptLearningV2GeneratedSessionIntroToLessonScreens(input: Readonly<{
  intro: LearningV2GeneratedSessionIntro;
  lessonId: number;
  sessionOrdinal: number;
  topicAccent: TopicAccent;
}>): readonly [LessonIntroScreen, LessonIntroScreen, LessonIntroScreen] {
  const intro = validateLearningV2GeneratedSessionIntro(input.intro);
  if (!Number.isSafeInteger(input.lessonId) || input.lessonId < 1 || input.lessonId > 10_000 ||
    !Number.isSafeInteger(input.sessionOrdinal) || input.sessionOrdinal < 1 || input.sessionOrdinal > 12) {
    throw new Error('learning_v2_session_intro_coordinate_invalid');
  }
  const blocks = intro.blocks;
  const groups = [blocks.slice(0, 2), blocks.slice(2, 4), blocks.slice(4)] as const;
  const linesFor = (locale: LearningV2InterfaceLocale, source: typeof blocks, fallback: string): IntroLine[] => [
    ...source.flatMap((block) => [
      { type: KIND_TO_LINE[block.kind], parts: [{ text: block.titleByLocale[locale], tone: 'strong' }] } as IntroLine,
      { type: 'text', parts: [{ text: block.bodyByLocale[locale] }] } as IntroLine,
      { type: 'spacer' } as IntroLine,
    ]),
    ...(source.length === 0 ? [{ type: 'text', parts: [{ text: fallback }] } as IntroLine] : []),
  ];
  const localizedLines = (source: typeof blocks, fallback: LearningV2Localized<string>) => ({
    linesRU: linesFor('ru', source, fallback.ru), linesUK: linesFor('uk', source, fallback.uk),
    linesES: linesFor('es', source, fallback.es), linesPtBr: linesFor('pt-BR', source, fallback['pt-BR']),
    linesVi: linesFor('vi', source, fallback.vi), linesId: linesFor('id', source, fallback.id),
    linesTr: linesFor('tr', source, fallback.tr), linesPl: linesFor('pl', source, fallback.pl),
  });
  const base = {
    lessonId: input.lessonId,
    topicAccent: input.topicAccent,
  };
  const baseId = `learning_v2_lesson_${input.lessonId}_session_${String(input.sessionOrdinal).padStart(2, '0')}_intro`;
  return deepFreeze([
    {
      ...base, screenId: `${baseId}_concept`, order: 1, kind: 'concept',
      titleRU: intro.titleByLocale.ru, titleUK: intro.titleByLocale.uk, titleES: intro.titleByLocale.es,
      titlePtBr: intro.titleByLocale['pt-BR'], titleVi: intro.titleByLocale.vi, titleId: intro.titleByLocale.id,
      titleTr: intro.titleByLocale.tr, titlePl: intro.titleByLocale.pl,
      subtitleRU: intro.summaryByLocale.ru, subtitleUK: intro.summaryByLocale.uk, subtitleES: intro.summaryByLocale.es,
      subtitlePtBr: intro.summaryByLocale['pt-BR'], subtitleVi: intro.summaryByLocale.vi, subtitleId: intro.summaryByLocale.id,
      subtitleTr: intro.summaryByLocale.tr, subtitlePl: intro.summaryByLocale.pl,
      ...localizedLines(groups[0], intro.learningGoalByLocale),
    },
    {
      ...base, screenId: `${baseId}_formula`, order: 2, kind: 'formula',
      titleRU: SCREEN_TWO_TITLE.ru, titleUK: SCREEN_TWO_TITLE.uk, titleES: SCREEN_TWO_TITLE.es,
      titlePtBr: SCREEN_TWO_TITLE['pt-BR'], titleVi: SCREEN_TWO_TITLE.vi, titleId: SCREEN_TWO_TITLE.id,
      titleTr: SCREEN_TWO_TITLE.tr, titlePl: SCREEN_TWO_TITLE.pl,
      subtitleRU: SCREEN_TWO_SUBTITLE.ru, subtitleUK: SCREEN_TWO_SUBTITLE.uk, subtitleES: SCREEN_TWO_SUBTITLE.es,
      subtitlePtBr: SCREEN_TWO_SUBTITLE['pt-BR'], subtitleVi: SCREEN_TWO_SUBTITLE.vi, subtitleId: SCREEN_TWO_SUBTITLE.id,
      subtitleTr: SCREEN_TWO_SUBTITLE.tr, subtitlePl: SCREEN_TWO_SUBTITLE.pl,
      ...localizedLines(groups[1], intro.learningGoalByLocale),
    },
    {
      ...base, screenId: `${baseId}_practice`, order: 3, kind: 'practice',
      titleRU: SCREEN_THREE_TITLE.ru, titleUK: SCREEN_THREE_TITLE.uk, titleES: SCREEN_THREE_TITLE.es,
      titlePtBr: SCREEN_THREE_TITLE['pt-BR'], titleVi: SCREEN_THREE_TITLE.vi, titleId: SCREEN_THREE_TITLE.id,
      titleTr: SCREEN_THREE_TITLE.tr, titlePl: SCREEN_THREE_TITLE.pl,
      subtitleRU: SCREEN_THREE_SUBTITLE.ru, subtitleUK: SCREEN_THREE_SUBTITLE.uk, subtitleES: SCREEN_THREE_SUBTITLE.es,
      subtitlePtBr: SCREEN_THREE_SUBTITLE['pt-BR'], subtitleVi: SCREEN_THREE_SUBTITLE.vi, subtitleId: SCREEN_THREE_SUBTITLE.id,
      subtitleTr: SCREEN_THREE_SUBTITLE.tr, subtitlePl: SCREEN_THREE_SUBTITLE.pl,
      ...localizedLines(groups[2], intro.learningGoalByLocale),
    },
  ]);
}
