/**
 * Банк игры «Память» — немецкий классический курс, уроки 1–8 (D207). На урок 2 раунда по 4 пары.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: слово или выражение пары взято из фраз урока; в одном наборе нет двух слов с близким
 * переводом; неверные варианты — переводы двух других пар того же набора: проверяется память, а не догадка.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { memoryRound, type FourPairs } from './make_de_fr';

const r = (lesson: number, n: number, pairs: FourPairs, askIndex: number, wrong: readonly [number, number], at: number): QuizRound =>
  memoryRound('de', lesson, n, pairs, askIndex, wrong, at);

export const MEMORY_BANK_DE: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    r(1, 1, [['müde', 'уставший'], ['wach', 'не спит'], ['bereit', 'готов'], ['allein', 'один']], 1, [0, 2], 1),
    r(1, 2, [['draußen', 'на улице'], ['drinnen', 'внутри'], ['zu Hause', 'дома'], ['leise', 'тихо']], 1, [0, 2], 0),
  ],
  2: [
    r(2, 1, [['der Schlüssel', 'ключ'], ['die Tasche', 'сумка'], ['das Handy', 'мобильный телефон'], ['der Brief', 'письмо']], 3, [0, 1], 2),
    r(2, 2, [['die Haltestelle', 'остановка'], ['der Eingang', 'вход'], ['die Kasse', 'касса'], ['die Treppe', 'лестница']], 1, [0, 3], 0),
  ],
  3: [
    r(3, 1, [['wohnen', 'жить'], ['lernen', 'учить'], ['kaufen', 'покупать'], ['suchen', 'искать']], 3, [1, 2], 1),
    r(3, 2, [['warten', 'ждать'], ['bezahlen', 'платить'], ['kochen', 'готовить еду'], ['spielen', 'играть']], 1, [0, 3], 2),
  ],
  4: [
    r(4, 1, [['heute', 'сегодня'], ['morgen', 'завтра'], ['am Abend', 'вечером'], ['am Wochenende', 'в выходные']], 3, [1, 2], 0),
    r(4, 2, [['Montag', 'понедельник'], ['Dienstag', 'вторник'], ['Freitag', 'пятница'], ['Samstag', 'суббота']], 1, [0, 2], 1),
  ],
  5: [
    r(5, 1, [['bald', 'скоро'], ['früher', 'раньше'], ['auch', 'тоже'], ['zusammen', 'вместе']], 0, [1, 2], 2),
    r(5, 2, [['Hilfe', 'помощь'], ['Zeit', 'время'], ['Durst', 'жажда'], ['mit Karte', 'картой']], 2, [0, 1], 0),
  ],
  6: [
    r(6, 1, [['wo', 'где'], ['wann', 'когда'], ['wer', 'кто'], ['was', 'что']], 2, [0, 3], 1),
    r(6, 2, [['woher', 'откуда'], ['wohin', 'куда'], ['wie lange', 'как долго'], ['wie viel', 'сколько']], 1, [0, 2], 2),
  ],
  7: [
    r(7, 1, [['der Arzt', 'врач'], ['die Apotheke', 'аптека'], ['der Parkplatz', 'парковка'], ['der Termin', 'назначенная встреча']], 1, [0, 3], 0),
    r(7, 2, [['nehmen', 'брать'], ['bestellen', 'заказывать'], ['lesen', 'читать'], ['holen', 'забирать']], 3, [0, 1], 1),
  ],
  8: [
    r(8, 1, [['der Hunger', 'голод'], ['das Fleisch', 'мясо'], ['die Zeitung', 'газета'], ['das Kleingeld', 'мелочь']], 2, [0, 3], 2),
    r(8, 2, [['der Koffer', 'чемодан'], ['die Jacke', 'куртка'], ['der Garten', 'сад'], ['der Balkon', 'балкон']], 0, [1, 3], 0),
  ],
};
