// Lesson Data - Index File
// Re-exports all lesson data from split files

import { LessonData, LessonIntroScreen, LessonPhrase } from './lesson_data_types';

// === Lessons 1-8 ===
import {
  LESSON_1_INTRO_SCREENS, LESSON_1_ENCOURAGEMENT_SCREENS, LESSON_1_PHRASES,
  LESSON_2_INTRO_SCREENS, LESSON_2_PHRASES,
  LESSON_3_INTRO_SCREENS, LESSON_3_ENCOURAGEMENT_SCREENS, LESSON_3_PHRASES,
  LESSON_4_INTRO_SCREENS, LESSON_4_PHRASES,
  LESSON_5_INTRO_SCREENS, LESSON_5_ENCOURAGEMENT_SCREENS, LESSON_5_PHRASES,
  LESSON_6_INTRO_SCREENS, LESSON_6_ENCOURAGEMENT_SCREENS, LESSON_6_PHRASES,
  LESSON_7_INTRO_SCREENS, LESSON_7_ENCOURAGEMENT_SCREENS, LESSON_7_PHRASES,
  LESSON_8_INTRO_SCREENS, LESSON_8_PHRASES } from './lesson_data_1_8';

// === Lessons 9-16 ===
import {
  LESSON_9_INTRO_SCREENS, LESSON_9_PHRASES,
  LESSON_10_INTRO_SCREENS, LESSON_10_PHRASES,
  LESSON_11_INTRO_SCREENS, LESSON_11_PHRASES,
  LESSON_12_INTRO_SCREENS, LESSON_12_PHRASES,
  LESSON_13_INTRO_SCREENS, LESSON_13_PHRASES,
  LESSON_14_INTRO_SCREENS, LESSON_14_PHRASES,
  LESSON_15_INTRO_SCREENS, LESSON_15_PHRASES,
  LESSON_16_INTRO_SCREENS, LESSON_16_PHRASES } from './lesson_data_9_16';

// === Lessons 17-24 ===
import {
  LESSON_17_INTRO_SCREENS, LESSON_17_PHRASES,
  LESSON_18_INTRO_SCREENS, LESSON_18_PHRASES,
  LESSON_19_INTRO_SCREENS, LESSON_19_PHRASES,
  LESSON_20_INTRO_SCREENS, LESSON_20_PHRASES,
  LESSON_21_INTRO_SCREENS, LESSON_21_PHRASES,
  LESSON_22_INTRO_SCREENS, LESSON_22_PHRASES,
  LESSON_23_INTRO_SCREENS, LESSON_23_PHRASES,
  LESSON_24_INTRO_SCREENS, LESSON_24_PHRASES } from './lesson_data_17_24';

// === Lessons 25-32 ===
import {
  LESSON_25_INTRO_SCREENS,
  LESSON_26_INTRO_SCREENS,
  LESSON_27_INTRO_SCREENS,
  LESSON_28_INTRO_SCREENS,
  LESSON_29_INTRO_SCREENS,
  LESSON_30_INTRO_SCREENS,
  LESSON_31_INTRO_SCREENS,
  LESSON_32_INTRO_SCREENS,
  LESSON_25_PHRASES,
  LESSON_26_PHRASES,
  LESSON_27_PHRASES,
  LESSON_28_PHRASES,
  LESSON_29_PHRASES,
  LESSON_30_PHRASES,
  LESSON_31_PHRASES,
  LESSON_32_PHRASES } from './lesson_data_25_32';

import { EXTRA_INTRO_SCREENS } from './lesson_intro_screens_9_32';
import {
  LESSON_1_INTRO_SCREENS as LESSON_1_INTRO_ES_L2,
  LESSON_2_INTRO_SCREENS as LESSON_2_INTRO_ES_L2,
  LESSON_3_INTRO_SCREENS as LESSON_3_INTRO_ES_L2,
  LESSON_4_INTRO_SCREENS as LESSON_4_INTRO_ES_L2,
  LESSON_5_INTRO_SCREENS as LESSON_5_INTRO_ES_L2,
  LESSON_6_INTRO_SCREENS as LESSON_6_INTRO_ES_L2,
  LESSON_7_INTRO_SCREENS as LESSON_7_INTRO_ES_L2,
  LESSON_8_INTRO_SCREENS as LESSON_8_INTRO_ES_L2 } from './lesson_intro_screens_es_l2';
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

/** Теория 1–8 для dev-режима «учим испанский» (слайды es L2). */
const INTRO_SCREENS_ES_L2_1_8: Record<number, LessonIntroScreen[]> = {
  1: LESSON_1_INTRO_ES_L2,
  2: LESSON_2_INTRO_ES_L2,
  3: LESSON_3_INTRO_ES_L2,
  4: LESSON_4_INTRO_ES_L2,
  5: LESSON_5_INTRO_ES_L2,
  6: LESSON_6_INTRO_ES_L2,
  7: LESSON_7_INTRO_ES_L2,
  8: LESSON_8_INTRO_ES_L2 };

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
export const ALL_LESSONS = [
  { id: 1, ...lessonTitles(1), introScreens: LESSON_1_INTRO_SCREENS, phrases: LESSON_1_PHRASES },
  { id: 2, ...lessonTitles(2), introScreens: LESSON_2_INTRO_SCREENS, phrases: LESSON_2_PHRASES },
  { id: 3, ...lessonTitles(3), introScreens: LESSON_3_INTRO_SCREENS, phrases: LESSON_3_PHRASES },
  { id: 4, ...lessonTitles(4), introScreens: LESSON_4_INTRO_SCREENS, phrases: LESSON_4_PHRASES },
  { id: 5, ...lessonTitles(5), introScreens: LESSON_5_INTRO_SCREENS, phrases: LESSON_5_PHRASES },
  { id: 6, ...lessonTitles(6), introScreens: LESSON_6_INTRO_SCREENS, phrases: LESSON_6_PHRASES },
  { id: 7, ...lessonTitles(7), introScreens: LESSON_7_INTRO_SCREENS, phrases: LESSON_7_PHRASES },
  { id: 8, ...lessonTitles(8), introScreens: LESSON_8_INTRO_SCREENS, phrases: LESSON_8_PHRASES },
  { id: 9, ...lessonTitles(9), introScreens: LESSON_9_INTRO_SCREENS, phrases: LESSON_9_PHRASES },
  { id: 10, ...lessonTitles(10), introScreens: LESSON_10_INTRO_SCREENS, phrases: LESSON_10_PHRASES },
  { id: 11, ...lessonTitles(11), introScreens: LESSON_11_INTRO_SCREENS, phrases: LESSON_11_PHRASES },
  { id: 12, ...lessonTitles(12), introScreens: LESSON_12_INTRO_SCREENS, phrases: LESSON_12_PHRASES },
  { id: 13, ...lessonTitles(13), introScreens: LESSON_13_INTRO_SCREENS, phrases: LESSON_13_PHRASES },
  { id: 14, ...lessonTitles(14), introScreens: LESSON_14_INTRO_SCREENS, phrases: LESSON_14_PHRASES },
  { id: 15, ...lessonTitles(15), introScreens: LESSON_15_INTRO_SCREENS, phrases: LESSON_15_PHRASES },
  { id: 16, ...lessonTitles(16), introScreens: LESSON_16_INTRO_SCREENS, phrases: LESSON_16_PHRASES },
  { id: 17, ...lessonTitles(17), introScreens: LESSON_17_INTRO_SCREENS, phrases: LESSON_17_PHRASES },
  { id: 18, ...lessonTitles(18), introScreens: LESSON_18_INTRO_SCREENS, phrases: LESSON_18_PHRASES },
  { id: 19, ...lessonTitles(19), introScreens: LESSON_19_INTRO_SCREENS, phrases: LESSON_19_PHRASES },
  { id: 20, ...lessonTitles(20), introScreens: LESSON_20_INTRO_SCREENS, phrases: LESSON_20_PHRASES },
  { id: 21, ...lessonTitles(21), introScreens: LESSON_21_INTRO_SCREENS, phrases: LESSON_21_PHRASES },
  { id: 22, ...lessonTitles(22), introScreens: LESSON_22_INTRO_SCREENS, phrases: LESSON_22_PHRASES },
  { id: 23, ...lessonTitles(23), introScreens: LESSON_23_INTRO_SCREENS, phrases: LESSON_23_PHRASES },
  { id: 24, ...lessonTitles(24), introScreens: LESSON_24_INTRO_SCREENS, phrases: LESSON_24_PHRASES },
  { id: 25, ...lessonTitles(25), introScreens: LESSON_25_INTRO_SCREENS, phrases: LESSON_25_PHRASES },
  { id: 26, ...lessonTitles(26), introScreens: LESSON_26_INTRO_SCREENS, phrases: LESSON_26_PHRASES },
  { id: 27, ...lessonTitles(27), introScreens: LESSON_27_INTRO_SCREENS, phrases: LESSON_27_PHRASES },
  { id: 28, ...lessonTitles(28), introScreens: LESSON_28_INTRO_SCREENS, phrases: LESSON_28_PHRASES },
  { id: 29, ...lessonTitles(29), introScreens: LESSON_29_INTRO_SCREENS, phrases: LESSON_29_PHRASES },
  { id: 30, ...lessonTitles(30), introScreens: LESSON_30_INTRO_SCREENS, phrases: LESSON_30_PHRASES },
  { id: 31, ...lessonTitles(31), introScreens: LESSON_31_INTRO_SCREENS, phrases: LESSON_31_PHRASES },
  { id: 32, ...lessonTitles(32), introScreens: LESSON_32_INTRO_SCREENS, phrases: LESSON_32_PHRASES },
];

// === LESSON_DATA ===
export const LESSON_DATA: Record<number, LessonData> = {
  1: { id: 1, ...lessonTitles(1), introScreens: LESSON_1_INTRO_SCREENS, phrases: LESSON_1_PHRASES },
  2: { id: 2, ...lessonTitles(2), introScreens: LESSON_2_INTRO_SCREENS, phrases: LESSON_2_PHRASES },
  3: { id: 3, ...lessonTitles(3), introScreens: LESSON_3_INTRO_SCREENS, phrases: LESSON_3_PHRASES },
  4: { id: 4, ...lessonTitles(4), introScreens: LESSON_4_INTRO_SCREENS, phrases: LESSON_4_PHRASES },
  5: { id: 5, ...lessonTitles(5), introScreens: LESSON_5_INTRO_SCREENS, phrases: LESSON_5_PHRASES },
  6: { id: 6, ...lessonTitles(6), introScreens: LESSON_6_INTRO_SCREENS, phrases: LESSON_6_PHRASES },
  7: { id: 7, ...lessonTitles(7), introScreens: LESSON_7_INTRO_SCREENS, phrases: LESSON_7_PHRASES },
  8: { id: 8, ...lessonTitles(8), introScreens: LESSON_8_INTRO_SCREENS, phrases: LESSON_8_PHRASES },
  9: { id: 9, ...lessonTitles(9), introScreens: LESSON_9_INTRO_SCREENS, phrases: LESSON_9_PHRASES },
  10: { id: 10, ...lessonTitles(10), introScreens: LESSON_10_INTRO_SCREENS, phrases: LESSON_10_PHRASES },
  11: { id: 11, ...lessonTitles(11), introScreens: LESSON_11_INTRO_SCREENS, phrases: LESSON_11_PHRASES },
  12: { id: 12, ...lessonTitles(12), introScreens: LESSON_12_INTRO_SCREENS, phrases: LESSON_12_PHRASES },
  13: { id: 13, ...lessonTitles(13), introScreens: LESSON_13_INTRO_SCREENS, phrases: LESSON_13_PHRASES },
  14: { id: 14, ...lessonTitles(14), introScreens: LESSON_14_INTRO_SCREENS, phrases: LESSON_14_PHRASES },
  15: { id: 15, ...lessonTitles(15), introScreens: LESSON_15_INTRO_SCREENS, phrases: LESSON_15_PHRASES },
  16: { id: 16, ...lessonTitles(16), introScreens: LESSON_16_INTRO_SCREENS, phrases: LESSON_16_PHRASES },
  17: { id: 17, ...lessonTitles(17), introScreens: LESSON_17_INTRO_SCREENS, phrases: LESSON_17_PHRASES },
  18: { id: 18, ...lessonTitles(18), introScreens: LESSON_18_INTRO_SCREENS, phrases: LESSON_18_PHRASES },
  19: { id: 19, ...lessonTitles(19), introScreens: LESSON_19_INTRO_SCREENS, phrases: LESSON_19_PHRASES },
  20: { id: 20, ...lessonTitles(20), introScreens: LESSON_20_INTRO_SCREENS ?? [], phrases: LESSON_20_PHRASES },
  21: { id: 21, ...lessonTitles(21), introScreens: LESSON_21_INTRO_SCREENS ?? [], phrases: LESSON_21_PHRASES },
  22: { id: 22, ...lessonTitles(22), introScreens: LESSON_22_INTRO_SCREENS ?? [], phrases: LESSON_22_PHRASES },
  23: { id: 23, ...lessonTitles(23), introScreens: LESSON_23_INTRO_SCREENS, phrases: LESSON_23_PHRASES },
  24: { id: 24, ...lessonTitles(24), introScreens: LESSON_24_INTRO_SCREENS, phrases: LESSON_24_PHRASES },
  25: { id: 25, ...lessonTitles(25), introScreens: LESSON_25_INTRO_SCREENS ?? [], phrases: LESSON_25_PHRASES },
  26: { id: 26, ...lessonTitles(26), introScreens: LESSON_26_INTRO_SCREENS ?? [], phrases: LESSON_26_PHRASES },
  27: { id: 27, ...lessonTitles(27), introScreens: LESSON_27_INTRO_SCREENS ?? [], phrases: LESSON_27_PHRASES },
  28: { id: 28, ...lessonTitles(28), introScreens: LESSON_28_INTRO_SCREENS ?? [], phrases: LESSON_28_PHRASES },
  29: { id: 29, ...lessonTitles(29), introScreens: LESSON_29_INTRO_SCREENS ?? [], phrases: LESSON_29_PHRASES },
  30: { id: 30, ...lessonTitles(30), introScreens: LESSON_30_INTRO_SCREENS ?? [], phrases: LESSON_30_PHRASES },
  31: { id: 31, ...lessonTitles(31), introScreens: LESSON_31_INTRO_SCREENS ?? [], phrases: LESSON_31_PHRASES },
  32: { id: 32, ...lessonTitles(32), introScreens: LESSON_32_INTRO_SCREENS ?? [], phrases: LESSON_32_PHRASES } };

// === LESSON_ENCOURAGEMENT_SCREENS ===
export const LESSON_ENCOURAGEMENT_SCREENS: Record<number, LessonIntroScreen[]> = {
  1: LESSON_1_ENCOURAGEMENT_SCREENS,
  3: LESSON_3_ENCOURAGEMENT_SCREENS,
  5: LESSON_5_ENCOURAGEMENT_SCREENS,
  6: LESSON_6_ENCOURAGEMENT_SCREENS,
  7: LESSON_7_ENCOURAGEMENT_SCREENS };

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
    const esL2 = INTRO_SCREENS_ES_L2_1_8[lessonId];
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
