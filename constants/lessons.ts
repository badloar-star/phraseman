// ════════════════════════════════════════════════════════════════════════════
// lessons.ts — Централизованные названия уроков
// Используется в: home.tsx, index.tsx, lesson_menu.tsx, exam.tsx
// ════════════════════════════════════════════════════════════════════════════

import type { Lang } from './i18n';

export const LESSON_NAMES_RU = [
  'Местоимения и глагол To Be',      // 1
  'Отрицание и вопросы (To Be)',      // 2
  'Present Simple: Утверждение',      // 3
  'Present Simple: Отрицание',        // 4
  'Present Simple: Вопросы',          // 5
  'Специальные вопросы',              // 6
  'Глагол To Have',                   // 7
  'Предлоги времени',                 // 8
  'There is / There are',             // 9
  'Модальные глаголы',                // 10
  'Past Simple: Правильные',          // 11
  'Past Simple: Неправильные',        // 12
  'Future Simple',                    // 13
  'Степени сравнения',                // 14
  'Притяжательные местоимения',       // 15
  'Фразовые глаголы',                 // 16
  'Present Continuous',               // 17
  'Повелительное наклонение',         // 18
  'Предлоги места',                   // 19
  'Артикли',                          // 20
  'Неопределённые местоимения',       // 21
  'Герундий',                         // 22
  'Passive Voice',                    // 23
  'Present Perfect',                  // 24
  'Past Continuous',                  // 25
  'Условные предложения',             // 26
  'Косвенная речь',                   // 27
  'Возвратные местоимения',           // 28
  'Used to',                          // 29
  'Relative Clauses',                 // 30
  'Complex Object',                   // 31
  'Финальное повторение',             // 32
] as const;

export const LESSON_NAMES_UK = [
  'Займенники і дієслово To Be',      // 1
  'Заперечення і питання (To Be)',    // 2
  'Present Simple: Ствердження',      // 3
  'Present Simple: Заперечення',      // 4
  'Present Simple: Питання',          // 5
  'Спеціальні питання',               // 6
  'Дієслово To Have',                 // 7
  'Прийменники часу',                 // 8
  'There is / There are',             // 9
  'Модальні дієслова',                // 10
  'Past Simple: Правильні',           // 11
  'Past Simple: Неправильні',         // 12
  'Future Simple',                    // 13
  'Ступені порівняння',               // 14
  'Присвійні займенники',             // 15
  'Фразові дієслова',                 // 16
  'Present Continuous',               // 17
  'Наказовий спосіб',                 // 18
  'Прийменники місця',                // 19
  'Артиклі',                          // 20
  'Неозначені займенники',            // 21
  'Герундій',                         // 22
  'Passive Voice',                    // 23
  'Present Perfect',                  // 24
  'Past Continuous',                  // 25
  'Умовні речення',                   // 26
  'Непряма мова',                     // 27
  'Зворотні займенники',              // 28
  'Used to',                          // 29
  'Relative Clauses',                 // 30
  'Complex Object',                   // 31
  'Фінальне повторення',              // 32
] as const;

/** Испанские подписи тем у английской программы — стиль учебников inglés para hispanohablantes; англ. грам. термины там, где так принято в дидактике. */
export const LESSON_NAMES_ES = [
  'Pronombres personales y verbo to be', // 1
  'Negación e interrogación con to be', // 2
  'Present Simple: afirmación', // 3
  'Present Simple: negación', // 4
  'Present Simple: preguntas', // 5
  'Interrogativos (preguntas abiertas)', // 6
  'Verbo to have', // 7
  'Preposiciones de tiempo', // 8
  'There is / There are', // 9
  'Verbos modales', // 10
  'Past Simple: verbos regulares', // 11
  'Past Simple: verbos irregulares', // 12
  'Future Simple', // 13
  'Grados de comparación', // 14
  'Adjetivos y pronombres posesivos', // 15
  'Verbos frasales', // 16
  'Present Continuous', // 17
  'Imperativo', // 18
  'Preposiciones de lugar', // 19
  'Artículos definidos e indefinidos', // 20
  'Pronombres indefinidos', // 21
  'Gerundio (forma en -ing)', // 22
  'Voz pasiva', // 23
  'Present Perfect', // 24
  'Past Continuous', // 25
  'Oraciones condicionales', // 26
  'Estilo indirecto', // 27
  'Pronombres reflexivos', // 28
  'Used to', // 29
  'Cláusulas relativas', // 30
  'Construcciones con objeto e infinitivo', // 31
  'Repaso final', // 32
] as const;

export const LESSON_NAMES_PT_BR = [
  'Pronomes pessoais e verbo to be',
  'Negação e perguntas com to be',
  'Present Simple: afirmação',
  'Present Simple: negação',
  'Present Simple: perguntas',
  'Perguntas especiais',
  'Verbo to have',
  'Preposições de tempo',
  'There is / There are',
  'Verbos modais',
  'Past Simple: verbos regulares',
  'Past Simple: verbos irregulares',
  'Future Simple',
  'Graus de comparação',
  'Adjetivos e pronomes possessivos',
  'Phrasal verbs',
  'Present Continuous',
  'Imperativo',
  'Preposições de lugar',
  'Artigos definidos e indefinidos',
  'Pronomes indefinidos',
  'Gerúndio: forma em -ing',
  'Voz passiva',
  'Present Perfect',
  'Past Continuous',
  'Orações condicionais',
  'Discurso indireto',
  'Pronomes reflexivos',
  'Used to',
  'Orações relativas',
  'Construções com objeto e infinitivo',
  'Revisão final',
] as const;

export const LESSON_NAMES_VI = [
  'Đại từ nhân xưng và động từ to be',
  'Phủ định và câu hỏi với to be',
  'Present Simple: câu khẳng định',
  'Present Simple: phủ định',
  'Present Simple: câu hỏi',
  'Câu hỏi đặc biệt',
  'Động từ to have',
  'Giới từ chỉ thời gian',
  'There is / There are',
  'Động từ khuyết thiếu',
  'Past Simple: động từ có quy tắc',
  'Past Simple: động từ bất quy tắc',
  'Future Simple',
  'Cấp so sánh',
  'Tính từ và đại từ sở hữu',
  'Cụm động từ',
  'Present Continuous',
  'Câu mệnh lệnh',
  'Giới từ chỉ nơi chốn',
  'Mạo từ xác định và không xác định',
  'Đại từ bất định',
  'Danh động từ: dạng -ing',
  'Câu bị động',
  'Present Perfect',
  'Past Continuous',
  'Câu điều kiện',
  'Câu tường thuật',
  'Đại từ phản thân',
  'Used to',
  'Mệnh đề quan hệ',
  'Cấu trúc với tân ngữ và động từ nguyên mẫu',
  'Ôn tập cuối',
] as const;

export const LESSON_NAMES_ID = [
  'Pronomina persona dan kata kerja to be',
  'Negasi dan pertanyaan dengan to be',
  'Present Simple: pernyataan',
  'Present Simple: negasi',
  'Present Simple: pertanyaan',
  'Pertanyaan khusus',
  'Kata kerja to have',
  'Preposisi waktu',
  'There is / There are',
  'Kata kerja modal',
  'Past Simple: kata kerja beraturan',
  'Past Simple: kata kerja tidak beraturan',
  'Future Simple',
  'Tingkat perbandingan',
  'Kata sifat dan kata ganti posesif',
  'Phrasal verbs',
  'Present Continuous',
  'Imperatif',
  'Preposisi tempat',
  'Artikel tentu dan tak tentu',
  'Kata ganti tak tentu',
  'Gerund: bentuk -ing',
  'Kalimat pasif',
  'Present Perfect',
  'Past Continuous',
  'Kalimat pengandaian',
  'Kalimat tidak langsung',
  'Kata ganti refleksif',
  'Used to',
  'Klausa relatif',
  'Konstruksi dengan objek dan infinitif',
  'Ulasan akhir',
] as const;

export const LESSON_NAMES_TR = [
  'Kişi zamirleri ve to be fiili',
  'To be ile olumsuz ve soru cümleleri',
  'Present Simple: olumlu cümleler',
  'Present Simple: olumsuz cümleler',
  'Present Simple: sorular',
  'Özel sorular',
  'To have fiili',
  'Zaman edatları',
  'There is / There are',
  'Modal fiiller',
  'Past Simple: düzenli fiiller',
  'Past Simple: düzensiz fiiller',
  'Future Simple',
  'Karşılaştırma dereceleri',
  'İyelik sıfatları ve zamirleri',
  'Phrasal verbs',
  'Present Continuous',
  'Emir kipi',
  'Yer edatları',
  'Belirli ve belirsiz artikeller',
  'Belirsiz zamirler',
  'Gerund: -ing biçimi',
  'Edilgen çatı',
  'Present Perfect',
  'Past Continuous',
  'Koşul cümleleri',
  'Dolaylı anlatım',
  'Dönüşlü zamirler',
  'Used to',
  'İlgi cümleleri',
  'Nesne ve infinitive yapıları',
  'Final tekrar',
] as const;

export const LESSON_NAMES_PL = [
  'Zaimki osobowe i czasownik to be',
  'Przeczenia i pytania z to be',
  'Present Simple: zdania twierdzące',
  'Present Simple: przeczenia',
  'Present Simple: pytania',
  'Pytania szczegółowe',
  'Czasownik to have',
  'Przyimki czasu',
  'There is / There are',
  'Czasowniki modalne',
  'Past Simple: czasowniki regularne',
  'Past Simple: czasowniki nieregularne',
  'Future Simple',
  'Stopniowanie',
  'Przymiotniki i zaimki dzierżawcze',
  'Czasowniki frazowe',
  'Present Continuous',
  'Tryb rozkazujący',
  'Przyimki miejsca',
  'Przedimki określone i nieokreślone',
  'Zaimki nieokreślone',
  'Gerund: forma -ing',
  'Strona bierna',
  'Present Perfect',
  'Past Continuous',
  'Zdania warunkowe',
  'Mowa zależna',
  'Zaimki zwrotne',
  'Used to',
  'Zdania względne',
  'Konstrukcje z dopełnieniem i bezokolicznikiem',
  'Powtórka końcowa',
] as const;

export function lessonNamesForLang(lang: Lang): readonly string[] {
  const namesByLang: Partial<Record<Lang, readonly string[]>> = {
    ru: LESSON_NAMES_RU,
    uk: LESSON_NAMES_UK,
    es: LESSON_NAMES_ES,
    'pt-BR': LESSON_NAMES_PT_BR,
    vi: LESSON_NAMES_VI,
    id: LESSON_NAMES_ID,
    tr: LESSON_NAMES_TR,
    pl: LESSON_NAMES_PL,
  };
  const names = namesByLang[lang];
  if (names) return names;
  const defaultNames = LESSON_NAMES_RU;
  return defaultNames;
}

export type LessonIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
  12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 |
  26 | 27 | 28 | 29 | 30 | 31;
