// Lesson Data - Index File
// Re-exports all lesson data from split files

import { LessonData, LessonIntroScreen, LessonPhrase } from './lesson_data_types';

import { EXTRA_INTRO_SCREENS } from './lesson_intro_screens_9_32';
import { getFrenchLessonIntroScreens } from './lesson_intro_screens_fr';
import { frenchStudyActive, spanishStudyActive } from './spanish_content_gate';
import type { StudyTargetLang } from './study_target_lang_dev';
import { applyFrenchSeedToPhrase } from './lesson_data_fr_seed';
import {
  LESSON_NAMES_ES,
  LESSON_NAMES_ID,
  LESSON_NAMES_PL,
  LESSON_NAMES_PT_BR,
  LESSON_NAMES_RU,
  LESSON_NAMES_TR,
  LESSON_NAMES_UK,
  LESSON_NAMES_VI,
} from '../constants/lessons';

type LessonGroupModule = Record<string, LessonIntroScreen[] | LessonPhrase[] | undefined>;
type EsIntroModule = Record<string, LessonIntroScreen[] | undefined>;

const LESSON_IDS = Array.from({ length: 32 }, (_, index) => index + 1);
const lazyLessonMetaCache: Record<number, LessonData> = {};
let esL2IntroModule: EsIntroModule | null = null;

function loadLessonGroupModule(lessonId: number): LessonGroupModule {
  if (lessonId >= 1 && lessonId <= 8) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy sync require avoids evaluating every lesson group for one lesson.
    return require('./lesson_data_1_8') as LessonGroupModule;
  }
  if (lessonId >= 9 && lessonId <= 16) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy sync require avoids evaluating every lesson group for one lesson.
    return require('./lesson_data_9_16') as LessonGroupModule;
  }
  if (lessonId >= 17 && lessonId <= 24) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy sync require avoids evaluating every lesson group for one lesson.
    return require('./lesson_data_17_24') as LessonGroupModule;
  }
  if (lessonId >= 25 && lessonId <= 32) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy sync require avoids evaluating every lesson group for one lesson.
    return require('./lesson_data_25_32') as LessonGroupModule;
  }
  return {};
}

function getBaseLessonPhrases(lessonId: number): LessonPhrase[] {
  return (loadLessonGroupModule(lessonId)[`LESSON_${lessonId}_PHRASES`] as LessonPhrase[] | undefined) ?? [];
}

function getBaseLessonIntroScreens(lessonId: number): LessonIntroScreen[] {
  return (loadLessonGroupModule(lessonId)[`LESSON_${lessonId}_INTRO_SCREENS`] as LessonIntroScreen[] | undefined) ?? [];
}

function getBaseLessonEncouragementScreens(lessonId: number): LessonIntroScreen[] {
  return (loadLessonGroupModule(lessonId)[`LESSON_${lessonId}_ENCOURAGEMENT_SCREENS`] as LessonIntroScreen[] | undefined) ?? [];
}

function getSpanishL2IntroScreens(lessonId: number): LessonIntroScreen[] | undefined {
  if (lessonId < 1 || lessonId > 8) return undefined;
  if (!esL2IntroModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- only needed when Spanish L2 lesson intros are requested.
    esL2IntroModule = require('./lesson_intro_screens_es_l2') as EsIntroModule;
  }
  return esL2IntroModule[`LESSON_${lessonId}_INTRO_SCREENS`];
}

/** Теория 1–8 для dev-режима «учим испанский» (слайды es L2). */
function introLinesText(lines: LessonIntroScreen['linesES']): string {
  if (!lines?.length) return '';
  return lines
    .map((line) => line.text ?? line.parts?.map((part) => part.text).join('') ?? '')
    .map((text) => text.trim())
    .filter(Boolean)
    .join(' ');
}

function introExampleText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => (part && typeof part === 'object' && 'text' in part ? String(part.text ?? '') : ''))
      .join('')
      .trim();
  }
  return '';
}

export type { LessonWord, LessonPhrase, LessonIntroScreen, LessonData } from './lesson_data_types';

/** Испанский заголовок урока для `LessonData.titleES`; индекс = id − 1 в `LESSON_NAMES_ES`. */
function esLessonTitle(id: number): string {
  const t = LESSON_NAMES_ES[id - 1];
  if (t === undefined) throw new Error(`esLessonTitle: invalid lesson id ${id}`);
  return t;
}

function ruLessonTitle(id: number): string {
  const t = LESSON_NAMES_RU[id - 1];
  if (t === undefined) throw new Error(`ruLessonTitle: invalid lesson id ${id}`);
  return t;
}

function ukLessonTitle(id: number): string {
  const t = LESSON_NAMES_UK[id - 1];
  if (t === undefined) throw new Error(`ukLessonTitle: invalid lesson id ${id}`);
  return t;
}

function ptBrLessonTitle(id: number): string {
  const t = LESSON_NAMES_PT_BR[id - 1];
  if (t === undefined) throw new Error(`ptBrLessonTitle: invalid lesson id ${id}`);
  return t;
}

function viLessonTitle(id: number): string {
  const t = LESSON_NAMES_VI[id - 1];
  if (t === undefined) throw new Error(`viLessonTitle: invalid lesson id ${id}`);
  return t;
}

function idLessonTitle(id: number): string {
  const t = LESSON_NAMES_ID[id - 1];
  if (t === undefined) throw new Error(`idLessonTitle: invalid lesson id ${id}`);
  return t;
}

function trLessonTitle(id: number): string {
  const t = LESSON_NAMES_TR[id - 1];
  if (t === undefined) throw new Error(`trLessonTitle: invalid lesson id ${id}`);
  return t;
}

function plLessonTitle(id: number): string {
  const t = LESSON_NAMES_PL[id - 1];
  if (t === undefined) throw new Error(`plLessonTitle: invalid lesson id ${id}`);
  return t;
}

function lessonTitles(id: number) {
  return {
    titleRU: ruLessonTitle(id),
    titleUK: ukLessonTitle(id),
    titleES: esLessonTitle(id),
    titlePtBr: ptBrLessonTitle(id),
    titleVi: viLessonTitle(id),
    titleId: idLessonTitle(id),
    titleTr: trLessonTitle(id),
    titlePl: plLessonTitle(id),
  };
}

// === ALL_LESSONS === (совпадает с упражнениями и LESSON_NAMES_*)
function buildLazyLessonMeta(lessonId: number): LessonData {
  return {
    id: lessonId,
    ...lessonTitles(lessonId),
    get introScreens() {
      return getBaseLessonIntroScreens(lessonId);
    },
    get phrases() {
      return getBaseLessonPhrases(lessonId);
    },
  };
}

function getLazyLessonMeta(lessonId: number): LessonData {
  lazyLessonMetaCache[lessonId] ??= buildLazyLessonMeta(lessonId);
  return lazyLessonMetaCache[lessonId];
}

export const ALL_LESSONS = LESSON_IDS.map(getLazyLessonMeta);

// === LESSON_DATA ===
export const LESSON_DATA: Record<number, LessonData> = Object.fromEntries(
  LESSON_IDS.map((lessonId) => [lessonId, getLazyLessonMeta(lessonId)]),
) as Record<number, LessonData>;

// === LESSON_ENCOURAGEMENT_SCREENS ===
export const LESSON_ENCOURAGEMENT_SCREENS: Record<number, LessonIntroScreen[]> = Object.defineProperties(
  {},
  Object.fromEntries(
    [1, 3, 5, 6, 7].map((lessonId) => [
      lessonId,
      {
        enumerable: true,
        get: () => getBaseLessonEncouragementScreens(lessonId),
      },
    ]),
  ),
) as Record<number, LessonIntroScreen[]>;

// === Helper functions ===
export function getLessonData(lessonId: number): LessonPhrase[] {
  const meta = LESSON_DATA[lessonId];
  const raw = meta?.phrases;
  if (!raw || raw.length === 0) return [];
  const { titleRU, titleUK, titleES, titlePtBr, titleVi, titleId, titleTr, titlePl } = meta;
  return raw.map((p) => applyFrenchSeedToPhrase({
    ...p,
    lessonTitleRU: titleRU,
    lessonTitleUK: titleUK,
    lessonTitleES: titleES,
    lessonTitlePtBr: titlePtBr,
    lessonTitleVi: titleVi,
    lessonTitleId: titleId,
    lessonTitleTr: titleTr,
    lessonTitlePl: titlePl }));
}

/** Три слайда по умолчанию, если в данных урока ещё нет готового интро (ур. 17–32 и черновики). */
function placeholderIntroScreensForLesson(lessonId: number): LessonIntroScreen[] {
  const meta = LESSON_DATA[lessonId];
  if (!meta) return [];
  const tRU = meta.titleRU;
  const tUK = meta.titleUK;
  const tES = meta.titleES ?? tRU;
  const tPtBr = meta.titlePtBr ?? tES;
  const tVi = meta.titleVi ?? tES;
  const tId = meta.titleId ?? tES;
  const tTr = meta.titleTr ?? tES;
  const tPl = meta.titlePl ?? tES;
  return [
    {
      kind: 'why',
      titleRU: 'Зачем эта тема',
      titleUK: 'Навіщо ця тема',
      titleES: 'Para qué sirve este tema',
      titlePtBr: 'Para que serve este tema',
      titleVi: 'Chủ đề này dùng để làm gì',
      titleId: 'Untuk apa topik ini',
      titleTr: 'Bu konu ne işe yarar',
      titlePl: 'Do czego służy ten temat',
      textRU: `Тема урока: «${tRU}». Разберём, как она помогает в реальной речи и в упражнениях Phraseman.`,
      textUK: `Тема уроку: «${tUK}». Розберімо, як вона допомагає в живій мові та в завданнях Phraseman.`,
      textES: `Tema de la lección: «${tES}». Verás por qué importa al hablar y en los ejercicios de Phraseman.`,
      textPtBr: `Tema da lição: "${tPtBr}". Você verá por que ele importa na fala real e nos exercícios do Phraseman.`,
      textVi: `Chủ đề bài học: "${tVi}". Bạn sẽ thấy vì sao nó quan trọng khi nói thật và trong bài tập Phraseman.`,
      textId: `Topik pelajaran: "${tId}". Kamu akan melihat mengapa ini penting dalam percakapan nyata dan latihan Phraseman.`,
      textTr: `Ders konusu: "${tTr}". Gerçek konuşmada ve Phraseman alıştırmalarında neden önemli olduğunu göreceksin.`,
      textPl: `Temat lekcji: "${tPl}". Zobaczysz, dlaczego jest ważny w prawdziwej mowie i w ćwiczeniach Phraseman.` },
    {
      kind: 'how',
      titleRU: 'Как строится фраза',
      titleUK: 'Як будується фраза',
      titleES: 'Cómo se forma la frase',
      titlePtBr: 'Como a frase é formada',
      titleVi: 'Câu được tạo như thế nào',
      titleId: 'Bagaimana frasa dibentuk',
      titleTr: 'Cümle nasıl kurulur',
      titlePl: 'Jak zbudowane jest zdanie',
      textRU: `Собирайте фразы по шагам из материала «${tRU}»: порядок слов, подсказки и кнопка ½.`,
      textUK: `Збирайте речення крок за кроком з матеріалу «${tUK}»: порядок слів, підказки й кнопка ½.`,
      textES: `Arma las frases paso a paso con «${tES}»: orden de palabras, pistas y el botón ½.`,
      textPtBr: `Monte as frases passo a passo com "${tPtBr}": ordem das palavras, dicas e o botão ½.`,
      textVi: `Ghép câu từng bước với "${tVi}": thứ tự từ, gợi ý và nút ½.`,
      textId: `Susun frasa langkah demi langkah dengan "${tId}": urutan kata, petunjuk, dan tombol ½.`,
      textTr: `"${tTr}" materyaliyle cümleleri adım adım kur: kelime sırası, ipuçları ve ½ düğmesi.`,
      textPl: `Układaj zdania krok po kroku z materiałem "${tPl}": kolejność słów, podpowiedzi i przycisk ½.` },
    {
      kind: 'mechanic',
      titleRU: 'Как это работает',
      titleUK: 'Як це працює',
      titleES: 'Cómo funciona',
      titlePtBr: 'Como funciona',
      titleVi: 'Cách hoạt động',
      titleId: 'Cara kerjanya',
      titleTr: 'Nasıl çalışır',
      titlePl: 'Jak to działa',
      textRU: 'Сверху — перевод; снизу нажимайте слова в нужном порядке. Правило — кнопка «Теория». Сомневаетесь — ½ уберёт половину лишних вариантов.',
      textUK: 'Зверху — переклад; знизу натискайте слова у потрібному порядку. Правило — кнопка «Теорія». Сумніви — ½ прибере половину зайвих варіантів.',
      textES: 'Arriba va la traducción; abajo toca las palabras en orden. «Teoría» muestra la regla; ½ quita la mitad de opciones incorrectas.',
      textPtBr: 'A tradução fica em cima; embaixo, toque nas palavras na ordem certa. "Teoria" mostra a regra; ½ remove metade das opções incorretas.',
      textVi: 'Bản dịch ở phía trên; bên dưới, chạm vào các từ theo đúng thứ tự. "Lý thuyết" hiển thị quy tắc; ½ loại bỏ một nửa lựa chọn sai.',
      textId: 'Terjemahan ada di atas; di bawah, ketuk kata dalam urutan yang benar. "Teori" menampilkan aturan; ½ menghapus separuh opsi yang salah.',
      textTr: 'Çeviri üstte; altta kelimelere doğru sırayla dokun. "Teori" kuralı gösterir; ½ yanlış seçeneklerin yarısını kaldırır.',
      textPl: 'Tłumaczenie jest u góry; na dole stukaj słowa we właściwej kolejności. "Teoria" pokazuje zasadę; ½ usuwa połowę błędnych opcji.' },
  ];
}

export function getLessonIntroScreens(
  lessonId: number,
  studyTarget: StudyTargetLang = 'en',
): LessonIntroScreen[] {
  if (studyTarget === 'fr') {
    if (!frenchStudyActive(studyTarget)) return [];
    const frL2 = getFrenchLessonIntroScreens(lessonId);
    if (frL2?.length) return withSpanishIntroFallback(frL2);
    return [];
  }
  const extra = EXTRA_INTRO_SCREENS[lessonId];
  if (extra && extra.length > 0) return withSpanishIntroFallback(extra);
  if (lessonId >= 1 && lessonId <= 8 && spanishStudyActive(studyTarget)) {
    const esL2 = getSpanishL2IntroScreens(lessonId);
    if (esL2?.length) return withSpanishIntroFallback(esL2);
  }
  const primary = LESSON_DATA[lessonId]?.introScreens;
  if (primary && primary.length > 0) return withSpanishIntroFallback(primary);
  return withSpanishIntroFallback(placeholderIntroScreensForLesson(lessonId));
}

function withSpanishIntroFallback(screens: LessonIntroScreen[]): LessonIntroScreen[] {
  return screens.map((screen) => ({
    ...screen,
    ['titleES']: screen.titleES ?? screen.titleRU ?? screen.titleUK ?? '',
    ['textES']: screen.textES ?? screen.subtitleES ?? introLinesText(screen.linesES) ?? screen.textRU ?? screen.textUK ?? '',
    examples: screen.examples?.map((example) => {
      const enText = introExampleText(example.en);
      return {
        ...example,
        trRU: example.trRU ?? example.ru ?? enText,
        trUK: example.trUK ?? example.uk ?? example.trRU ?? example.ru ?? enText,
        trES: example.trES ?? example.es ?? example.trRU ?? example.ru ?? enText,
      };
    }),
  }));
}

export function getLessonEncouragementScreens(lessonId: number): LessonIntroScreen[] {
  return LESSON_ENCOURAGEMENT_SCREENS[lessonId] || [];
}

// ALL_LESSONS_RU / ALL_LESSONS_UK were removed: they duplicated every phrase in extra
// objects at module init. Use getLessonData(lessonId) or phrase.russian / phrase.ukrainian instead.

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
