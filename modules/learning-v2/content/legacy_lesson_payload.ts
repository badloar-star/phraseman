// зачем: это узкий versioned source payload первого настоящего V2-среза.
// Он не копирует и не генерирует курс: связывает уже существующие данные Lesson 1
// (фразы, интро, теория и слова) в один неизменяемый объект для compiler/runtime.
import { LESSON_1_PHRASES } from '../../../app/lesson_data_1_8_phrases_source';
import { LESSON_1_INTRO_SCREENS } from '../../../app/lesson_intro_screens_lesson1_v2';
import {
  LESSON1_THEORY,
  type L1Theory,
} from '../../../app/theory_content_lesson1';
import type {
  LearningV2EmbeddedIntroQuestion,
  LessonIntroScreen,
} from '../../../app/lesson_data_types';
import type { V2ContentItem } from './content_item';
import { adaptLegacyLessonPhrasesToV2Content } from './legacy_lesson_adapter';
import type { V2SessionActivityBinding } from './session_compiler';

export interface V2LegacyLessonVocabularyItem {
  readonly surface: string;
  readonly category: string;
  readonly sourcePhraseIds: readonly string[];
}

export interface V2LegacyLessonSourcePayload {
  readonly schemaVersion: 'v2-legacy-lesson-source-payload.v1';
  readonly version: 1;
  readonly lessonId: 1;
  readonly episodeId: 'ep-lesson-01';
  readonly contentItems: readonly V2ContentItem[];
  readonly introScreens: readonly LessonIntroScreen[];
  readonly theory: L1Theory;
  readonly vocabulary: readonly V2LegacyLessonVocabularyItem[];
}

const introChoices = (
  first: string,
  second: string,
  third: string,
): readonly [string, string, string] => Object.freeze([first, second, third]);

const LESSON_1_EMBEDDED_INTRO_QUESTIONS: readonly LearningV2EmbeddedIntroQuestion[] =
  Object.freeze([
    Object.freeze({
      kind: 'embedded_intro_question',
      taskSlot: 1,
      questionId: 'lesson-1-intro-question-1-complete-sentence',
      promptByLocale: Object.freeze({
        ru: 'Какая английская фраза построена полностью?',
        uk: 'Яка англійська фраза побудована повністю?',
        es: '¿Qué frase inglesa está completa?',
        'pt-BR': 'Qual frase em inglês está completa?',
        vi: 'Câu tiếng Anh nào đầy đủ?',
        id: 'Kalimat bahasa Inggris mana yang lengkap?',
        tr: 'Hangi İngilizce cümle tamamdır?',
        pl: 'Które angielskie zdanie jest kompletne?',
      }),
      choicesByLocale: Object.freeze({
        ru: introChoices('I here.', 'I am here.', 'Am here.'),
        uk: introChoices('I here.', 'I am here.', 'Am here.'),
        es: introChoices('I here.', 'I am here.', 'Am here.'),
        'pt-BR': introChoices('I here.', 'I am here.', 'Am here.'),
        vi: introChoices('I here.', 'I am here.', 'Am here.'),
        id: introChoices('I here.', 'I am here.', 'Am here.'),
        tr: introChoices('I here.', 'I am here.', 'Am here.'),
        pl: introChoices('I here.', 'I am here.', 'Am here.'),
      }),
      correctChoiceIndex: 1,
      explanationByLocale: Object.freeze({
        ru: 'В английской фразе между I и описанием нужен глагол: I am here.',
        uk: 'В англійській фразі між I та описом потрібне дієслово: I am here.',
        es: 'La frase inglesa necesita un verbo entre I y la descripción: I am here.',
        'pt-BR':
          'A frase em inglês precisa de um verbo entre I e a descrição: I am here.',
        vi: 'Câu tiếng Anh cần động từ giữa I và phần mô tả: I am here.',
        id: 'Kalimat Inggris membutuhkan kata kerja di antara I dan keterangannya: I am here.',
        tr: 'İngilizce cümlede I ile açıklama arasında fiil gerekir: I am here.',
        pl: 'Angielskie zdanie potrzebuje czasownika między I a opisem: I am here.',
      }),
    }),
    Object.freeze({
      kind: 'embedded_intro_question',
      taskSlot: 2,
      questionId: 'lesson-1-intro-question-2-am',
      promptByLocale: Object.freeze({
        ru: 'Закончи фразу: I ___ calm.',
        uk: 'Закінчи фразу: I ___ calm.',
        es: 'Completa la frase: I ___ calm.',
        'pt-BR': 'Complete a frase: I ___ calm.',
        vi: 'Hoàn thành câu: I ___ calm.',
        id: 'Lengkapi kalimat: I ___ calm.',
        tr: 'Cümleyi tamamla: I ___ calm.',
        pl: 'Uzupełnij zdanie: I ___ calm.',
      }),
      choicesByLocale: Object.freeze({
        ru: introChoices('am', 'is', 'are'),
        uk: introChoices('am', 'is', 'are'),
        es: introChoices('am', 'is', 'are'),
        'pt-BR': introChoices('am', 'is', 'are'),
        vi: introChoices('am', 'is', 'are'),
        id: introChoices('am', 'is', 'are'),
        tr: introChoices('am', 'is', 'are'),
        pl: introChoices('am', 'is', 'are'),
      }),
      correctChoiceIndex: 0,
      explanationByLocale: Object.freeze({
        ru: 'С I используется только am: I am calm.',
        uk: 'З I використовується лише am: I am calm.',
        es: 'Con I se usa am: I am calm.',
        'pt-BR': 'Com I usamos am: I am calm.',
        vi: 'Với I, hãy dùng am: I am calm.',
        id: 'Dengan I, gunakan am: I am calm.',
        tr: 'I ile am kullanılır: I am calm.',
        pl: 'Z I używamy am: I am calm.',
      }),
    }),
    Object.freeze({
      kind: 'embedded_intro_question',
      taskSlot: 3,
      questionId: 'lesson-1-intro-question-3-build',
      promptByLocale: Object.freeze({
        ru: 'Как правильно собрать «Она готова»?',
        uk: 'Як правильно скласти «Вона готова»?',
        es: '¿Cómo construyes correctamente “Ella está lista”?',
        'pt-BR': 'Como montar corretamente “Ela está pronta”?',
        vi: 'Cách nào tạo đúng câu “Cô ấy đã sẵn sàng”?',
        id: 'Bagaimana menyusun “Dia siap” dengan benar?',
        tr: '“O hazır” cümlesi doğru nasıl kurulur?',
        pl: 'Jak poprawnie zbudować „Ona jest gotowa”?',
      }),
      choicesByLocale: Object.freeze({
        ru: introChoices('She ready.', 'She is ready.', 'She am ready.'),
        uk: introChoices('She ready.', 'She is ready.', 'She am ready.'),
        es: introChoices('She ready.', 'She is ready.', 'She am ready.'),
        'pt-BR': introChoices('She ready.', 'She is ready.', 'She am ready.'),
        vi: introChoices('She ready.', 'She is ready.', 'She am ready.'),
        id: introChoices('She ready.', 'She is ready.', 'She am ready.'),
        tr: introChoices('She ready.', 'She is ready.', 'She am ready.'),
        pl: introChoices('She ready.', 'She is ready.', 'She am ready.'),
      }),
      correctChoiceIndex: 1,
      explanationByLocale: Object.freeze({
        ru: 'Сначала She, затем is, потом описание ready: She is ready.',
        uk: 'Спочатку She, потім is, далі опис ready: She is ready.',
        es: 'Primero She, después is y al final ready: She is ready.',
        'pt-BR': 'Primeiro She, depois is e por fim ready: She is ready.',
        vi: 'Đầu tiên She, sau đó is, rồi ready: She is ready.',
        id: 'Pertama She, lalu is, kemudian ready: She is ready.',
        tr: 'Önce She, sonra is, ardından ready: She is ready.',
        pl: 'Najpierw She, potem is, a na końcu ready: She is ready.',
      }),
    }),
  ]);

const LESSON_1_INTRO_WITH_EMBEDDED_QUESTIONS: readonly LessonIntroScreen[] =
  Object.freeze(
    LESSON_1_INTRO_SCREENS.map((screen, index) =>
      Object.freeze({
        ...screen,
        learningV2EmbeddedQuestion: LESSON_1_EMBEDDED_INTRO_QUESTIONS[index],
      }),
    ),
  );

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function buildVocabulary(): readonly V2LegacyLessonVocabularyItem[] {
  const words = new Map<
    string,
    { surface: string; category: string; sourcePhraseIds: Set<string> }
  >();
  for (const phrase of LESSON_1_PHRASES) {
    for (const word of phrase.words) {
      const surface = word.correct.trim();
      const category = word.category?.trim() || 'token';
      const key = `${surface.toLocaleLowerCase('en')}\u0000${category}`;
      const current = words.get(key) ?? {
        surface,
        category,
        sourcePhraseIds: new Set<string>(),
      };
      current.sourcePhraseIds.add(String(phrase.id));
      words.set(key, current);
    }
  }
  return Object.freeze(
    [...words.values()]
      .map((word) =>
        Object.freeze({
          surface: word.surface,
          category: word.category,
          sourcePhraseIds: Object.freeze([...word.sourcePhraseIds].sort()),
        }),
      )
      .sort((a, b) => a.surface.localeCompare(b.surface, 'en')),
  );
}

/** Returns the real, non-demo Lesson 1 data in a versioned V2 source envelope. */
export function buildLesson1LegacyV2SourcePayload(): Readonly<V2LegacyLessonSourcePayload> {
  return deepFreeze({
    schemaVersion: 'v2-legacy-lesson-source-payload.v1',
    version: 1,
    lessonId: 1,
    episodeId: 'ep-lesson-01',
    contentItems: adaptLegacyLessonPhrasesToV2Content({
      episodeId: 'ep-lesson-01',
      objectiveId: 'obj-lesson-01-to-be-statements',
      targetLanguage: 'en',
      sourceLocale: 'ru',
      phrases: LESSON_1_PHRASES,
    }),
    introScreens: LESSON_1_INTRO_WITH_EMBEDDED_QUESTIONS,
    theory: LESSON1_THEORY,
    vocabulary: buildVocabulary(),
  } satisfies V2LegacyLessonSourcePayload);
}

/** Canonical authoring identities used by the real Lesson 1 session compiler. */
export function buildLesson1LegacyActivityBindings(
  contentItems: readonly V2ContentItem[],
): readonly V2SessionActivityBinding[] {
  return deepFreeze(
    contentItems.flatMap((item) =>
      item.compatibleFamilies.map((family) => ({
        activityId: `lesson1-${family}-${item.contentItemId}`,
        family,
        contentUnitIds: [item.contentItemId],
      })),
    ),
  );
}
