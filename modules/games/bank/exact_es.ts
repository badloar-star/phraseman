/**
 * Банк игры «Точное слово» — испанский классический курс, уроки 1–8 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: фраза с верным вариантом — фраза урока (или из слов этого и прошлых уроков);
 * каждый неверный вариант даёт грамматически неверную фразу (правило владельца о неверных вариантах);
 * варианты — только слова, которые ученик уже встречал. Там, где проверяется форма está/están/es/son,
 * подлежащее названо явно и это не имя. Верный вариант записан первым, место на экране — четвёртый аргумент.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { gapRound } from './make_es_it';

const round = (lesson: number, n: number, gapped: string, correct: string, wrong: readonly string[], at: number, note: string): QuizRound =>
  gapRound('es', lesson, n, gapped, correct, wrong, at, note);

export const EXACT_BANK_ES: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, 'Ella ___ en casa', 'está', ['estoy', 'están'], 0, 'Она одна — значит está.'),
    round(1, 2, 'Las llaves ___ aquí', 'están', ['está'], 1, 'Ключей несколько — значит están.'),
    round(1, 3, 'Estamos en ___ estación', 'la', ['el'], 0, 'Estación — «она», поэтому la.'),
    round(1, 4, '___ móvil está aquí', 'El', ['La', 'Los'], 2, 'Móvil — «он», и он один: el.'),
    round(1, 5, 'Ellos ___ allí', 'están', ['está', 'estoy'], 1, 'Их несколько — значит están.'),
    round(1, 6, 'El coche está ___', 'fuera', ['en fuera'], 0, 'Fuera обходится без en.'),
  ],
  2: [
    round(2, 1, 'Luis ___ en clase', 'no está', ['está no'], 1, 'No ставят перед está.'),
    round(2, 2, 'Las llaves no ___ en la mesa', 'están', ['está'], 0, 'Ключей несколько — значит están.'),
    round(2, 3, 'El móvil no está en ___ bolsillo', 'el', ['la'], 1, 'Bolsillo — «он», поэтому el.'),
    round(2, 4, 'La tienda no está ___', 'cerca', ['en cerca'], 0, 'Cerca обходится без en.'),
    round(2, 5, '___ bolso no está en casa', 'El', ['La'], 0, 'Bolso — «он», поэтому el.'),
    round(2, 6, 'Ellos no ___ en casa', 'están', ['está', 'estoy'], 2, 'Их несколько — значит están.'),
  ],
  3: [
    round(3, 1, '¿El bolso ___ en el coche?', 'está', ['están'], 0, 'Сумка одна — значит está.'),
    round(3, 2, '¿Los pasaportes ___ en la mochila?', 'están', ['está'], 1, 'Паспортов несколько — значит están.'),
    round(3, 3, '¿Está el móvil en ___ bolso?', 'el', ['la'], 1, 'Bolso — «он», поэтому el.'),
    round(3, 4, '¿Está ___ llave en casa?', 'la', ['el'], 0, 'Llave — «она», поэтому la.'),
    round(3, 5, '¿Están ___ billetes en el bolso?', 'los', ['las', 'el'], 1, 'Billetes — «они», и их несколько: los.'),
    round(3, 6, '¿La estación está ___?', 'lejos', ['en lejos'], 0, 'Lejos обходится без en.'),
  ],
  4: [
    round(4, 1, 'Ana ___ médica', 'es', ['está', 'son'], 0, 'Про профессию говорят es.'),
    round(4, 2, 'Luis es ___', 'profesor', ['profesora'], 1, 'Луис — мужчина, поэтому profesor.'),
    round(4, 3, 'Ana es ___', 'enfermera', ['enfermero'], 0, 'Ана — женщина, поэтому enfermera.'),
    round(4, 4, 'Ellos ___ profesores', 'son', ['es'], 1, 'Их несколько — значит son.'),
    round(4, 5, 'Usted ___ médica', 'es', ['eres', 'soy'], 2, 'С usted говорят es.'),
    round(4, 6, 'Ana y Luis son ___', 'guías', ['guía'], 0, 'Их двое — значит guías.'),
  ],
  5: [
    round(5, 1, '¿Dónde ___ las llaves?', 'están', ['está'], 1, 'Ключей несколько — значит están.'),
    round(5, 2, '¿Quién ___ el guía?', 'es', ['está', 'son'], 0, '«Кто он такой» — это es.'),
    round(5, 3, '¿Quiénes ___ ellos?', 'son', ['es'], 1, 'Их несколько — значит son.'),
    round(5, 4, '¿Qué libro ___ en la mesa?', 'está', ['están'], 0, 'Книга одна — значит está.'),
    round(5, 5, '¿Dónde está ___ recepción?', 'la', ['el'], 1, 'Recepción — «она», поэтому la.'),
    round(5, 6, '¿Quién está en ___ ascensor?', 'el', ['la'], 0, 'Ascensor — «он», поэтому el.'),
  ],
  6: [
    round(6, 1, '___ mapa está en la mesa', 'El', ['La'], 1, 'Говорят el mapa, хотя слово кончается на -a.'),
    round(6, 2, '___ foto está en la mochila', 'La', ['El'], 0, 'Говорят la foto, хотя слово кончается на -o.'),
    round(6, 3, 'Los trenes ___ en la estación', 'están', ['está'], 1, 'Поездов несколько — значит están.'),
    round(6, 4, 'Las fotos están en ___ mochilas', 'las', ['la', 'los'], 2, 'Mochilas — «они», и их несколько: las.'),
    round(6, 5, '___ abrigos están dentro', 'Los', ['El', 'Las'], 0, 'Abrigos — «они», и их несколько: los.'),
    round(6, 6, 'La maleta ___ en el coche', 'está', ['están'], 0, 'Чемодан один — значит está.'),
  ],
  7: [
    round(7, 1, 'Hay ___ llave aquí', 'una', ['un'], 1, 'Llave — «она», поэтому una.'),
    round(7, 2, 'Hay ___ mapa aquí', 'un', ['una'], 0, 'Mapa — «он», поэтому un.'),
    round(7, 3, 'Hay dos ___ en la mesa', 'libros', ['libro'], 1, 'Dos — это два, значит libros.'),
    round(7, 4, 'Hay gente ___', 'dentro', ['en dentro'], 0, 'Dentro обходится без en.'),
    round(7, 5, 'Hay ___ farmacias cerca', 'dos', ['una', 'un'], 2, 'Farmacias — их несколько, значит dos.'),
    round(7, 6, '¿Hay ___ salida aquí?', 'una', ['un', 'dos'], 0, 'Salida — «она», и она одна: una.'),
  ],
  8: [
    round(8, 1, '___ llaves están aquí', 'Mis', ['Mi'], 1, 'Ключей несколько — значит mis.'),
    round(8, 2, '___ libro está aquí', 'Tu', ['Tus'], 0, 'Книга одна — значит tu.'),
    round(8, 3, 'Su hermano ___ médico', 'es', ['está', 'son'], 1, 'Про профессию говорят es.'),
    round(8, 4, 'Sus pasaportes ___ en el bolso', 'están', ['está'], 0, 'Паспортов несколько — значит están.'),
    round(8, 5, 'Tus fotos están en ___ móvil', 'mi', ['mis'], 1, 'Телефон один — значит mi.'),
    round(8, 6, '¿Dónde están ___ maletas?', 'sus', ['su'], 0, 'Чемоданов несколько — значит sus.'),
  ],
};
