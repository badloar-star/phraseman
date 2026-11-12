/**
 * Банк игры «Точное слово» — немецкий классический курс, уроки 1–12 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: фраза с верным вариантом — фраза урока (или только из пройденных слов); каждый неверный
 * вариант даёт грамматически неверную фразу (правило владельца о неверных вариантах); варианты — только
 * слова, которые ученик уже встречал. Не предлагаются варианты, которые тоже были бы верны: например,
 * к «Ich suche ___ Schlüssel» нет варианта die (ключей может быть несколько).
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { gapRound } from './make_de_fr';

const r = (lesson: number, n: number, gapped: string, correct: string, wrong: readonly string[], at: number, note: string): QuizRound =>
  gapRound('de', lesson, n, gapped, correct, wrong, at, note);

export const EXACT_BANK_DE: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    r(1, 1, 'Ich ___ hier', 'bin', ['ist', 'sind'], 0, 'С ich всегда идёт bin.'),
    r(1, 2, 'Du ___ müde', 'bist', ['bin', 'seid'], 1, 'С du идёт bist.'),
    r(1, 3, 'Ihr ___ wach', 'seid', ['bist', 'sind'], 2, 'С ihr идёт seid.'),
    r(1, 4, 'Die Kinder ___ krank', 'sind', ['ist', 'seid'], 0, 'Детей несколько, значит sind.'),
    r(1, 5, 'Anna und ich ___ müde', 'sind', ['bin', 'ist'], 1, 'Анна и я — нас двое, значит sind.'),
    r(1, 6, '___ Tür ist offen', 'Die', ['Das', 'Der'], 2, 'Дверь — die Tür.'),
  ],
  2: [
    r(2, 1, 'Das ___ der Plan', 'ist', ['sind'], 1, 'План один, значит ist.'),
    r(2, 2, 'Das ___ die Karten', 'sind', ['ist'], 0, 'Карт несколько, значит sind.'),
    r(2, 3, '___ Handy ist neu', 'Das', ['Der', 'Die'], 1, 'Телефон — das Handy.'),
    r(2, 4, 'Hier ist ___ Rechnung', 'die', ['der', 'das'], 0, 'Счёт — die Rechnung.'),
    r(2, 5, 'Die Stühle ___ kaputt', 'sind', ['ist'], 1, 'Стульев несколько, значит sind.'),
    r(2, 6, '___ Laden ist offen', 'Der', ['Die', 'Das'], 2, 'Магазин — der Laden.'),
  ],
  3: [
    r(3, 1, 'Du ___ hier', 'wohnst', ['wohne', 'wohnt'], 0, 'С du — на -st: wohnst.'),
    r(3, 2, 'Anna ___ Frühstück', 'macht', ['mache', 'machen'], 1, 'Про Анну — на -t: macht.'),
    r(3, 3, 'Wir ___ Gemüse', 'kaufen', ['kaufe', 'kauft'], 2, 'С wir — на -en: kaufen.'),
    r(3, 4, 'Ich suche ___ Schlüssel', 'den', ['der', 'das'], 0, 'Когда ключ ищут, der становится den.'),
    r(3, 5, 'Du ___ draußen', 'wartest', ['warte', 'wartet'], 1, 'С du — на -st: wartest.'),
    r(3, 6, 'Ihr ___ zusammen', 'lernt', ['lernen', 'lernst'], 2, 'С ihr — на -t: lernt.'),
  ],
  4: [
    r(4, 1, 'Am Samstag ___ draußen', 'spielen die Kinder', ['die Kinder spielen'], 0, 'После am Samstag сначала spielen, потом die Kinder.'),
    r(4, 2, '___ Dienstag kochen wir Suppe', 'Am', ['Um', 'In'], 1, 'Дни недели — с am.'),
    r(4, 3, '___ neun beginnt die Arbeit', 'Um', ['Am', 'In'], 2, 'Время на часах — с um.'),
    r(4, 4, 'Nach ___ Essen hören wir Musik', 'dem', ['der', 'das'], 0, 'После nach говорят dem Essen.'),
    r(4, 5, 'In ___ Pause trinken wir Wasser', 'der', ['dem', 'das'], 1, '«На перерыве» — in der Pause.'),
    r(4, 6, 'Morgen ___ Milch', 'kaufe ich', ['ich kaufe'], 1, 'После morgen сначала kaufe, потом ich.'),
  ],
  5: [
    r(5, 1, '___ du müde?', 'Bist', ['Ist', 'Seid'], 0, 'С du идёт bist.'),
    r(5, 2, '___ ihr bereit?', 'Seid', ['Sind', 'Bist'], 1, 'С ihr идёт seid.'),
    r(5, 3, '___ Anna heute?', 'Lernt', ['Lernst', 'Lernen'], 2, 'Про Анну — на -t: lernt.'),
    r(5, 4, '___ Sie Zeit?', 'Haben', ['Hast', 'Habt'], 0, 'На «вы» — haben Sie.'),
    r(5, 5, 'Beginnt der Kurs ___ neun?', 'um', ['am', 'in'], 1, 'Время на часах — с um.'),
    r(5, 6, 'Ist das ___ Handy?', 'dein', ['deine', 'du'], 0, 'Телефон — das Handy, поэтому dein.'),
  ],
  6: [
    r(6, 1, '___ wohnst du?', 'Wo', ['Wer', 'Was'], 0, 'Wo — «где».'),
    r(6, 2, '___ heißt du?', 'Wie', ['Wo', 'Wer'], 1, 'Про имя спрашивают wie.'),
    r(6, 3, 'Wie geht es ___?', 'dir', ['du', 'ich'], 2, 'Здесь нужно dir — «тебе».'),
    r(6, 4, '___ kostet das Ticket?', 'Was', ['Wer', 'Wo'], 0, 'Про цену спрашивают was kostet.'),
    r(6, 5, 'Wie ___ Gäste kommen?', 'viele', ['viel'], 1, 'Гостей считают — значит wie viele.'),
    r(6, 6, '___ bezahlt die Rechnung?', 'Wer', ['Wo', 'Wie'], 2, 'Wer — «кто».'),
  ],
  7: [
    r(7, 1, 'Ich habe ___ Termin', 'einen', ['ein', 'eine'], 0, 'Встреча — der Termin, поэтому einen.'),
    r(7, 2, 'Ihr habt ___ Handy', 'ein', ['einen', 'eine'], 1, 'Телефон — das Handy, поэтому ein.'),
    r(7, 3, 'Du ___ den Zug', 'nimmst', ['nehme', 'nimmt'], 2, 'С du — nimmst.'),
    r(7, 4, 'Wir bestellen ___ Salat', 'den', ['der', 'das'], 0, 'Салат — der Salat, после bestellen он den Salat.'),
    r(7, 5, 'Anna ___ die Rechnung', 'liest', ['lese', 'lesen'], 1, 'Про Анну — liest.'),
    r(7, 6, 'Tom ___ das Paket', 'trägt', ['trage', 'trägst'], 2, 'Про Тома — trägt.'),
  ],
  8: [
    r(8, 1, 'Ich bin ___ müde', 'nicht', ['kein', 'keine'], 0, '«Не устал» — nicht müde.'),
    r(8, 2, 'Wir haben ___ Tickets', 'keine', ['nicht', 'keinen'], 1, 'Билетов несколько, поэтому keine.'),
    r(8, 3, 'Tom bestellt ___ Salat', 'keinen', ['kein', 'keine'], 2, 'Салат — der Salat, поэтому keinen.'),
    r(8, 4, 'Anna isst ___ Fleisch', 'kein', ['keinen', 'keine'], 0, 'Мясо — das Fleisch, поэтому kein.'),
    r(8, 5, 'Das ist ___ mein Koffer', 'nicht', ['kein', 'keinen'], 1, 'Перед mein ставят nicht.'),
    r(8, 6, 'Ich finde den Parkplatz ___', 'nicht', ['kein', 'keinen'], 0, '«Не нахожу» — nicht в конце.'),
  ],
  9: [
    r(9, 1, 'Das ist ___ Jacke', 'meine', ['mein', 'meinen'], 0, 'Куртка — die Jacke, поэтому meine.'),
    r(9, 2, 'Tom hat ___ Pass', 'seinen', ['sein', 'seine'], 1, 'Паспорт — der Pass, после hat он seinen Pass.'),
    r(9, 3, 'Anna holt ___ Tasche', 'ihre', ['ihren', 'ihr'], 2, 'Сумка — die Tasche, поэтому ihre.'),
    r(9, 4, '___ Gäste kommen', 'Unsere', ['Unser'], 1, 'Гостей несколько, поэтому unsere.'),
    r(9, 5, 'Euer Bus ___', 'wartet', ['warten', 'warte'], 0, 'Автобус один, значит wartet.'),
    r(9, 6, 'Sind das ___ Schlüssel?', 'Ihre', ['Ihr', 'Ihren'], 2, 'Ключей несколько, поэтому Ihre.'),
  ],
  10: [
    r(10, 1, 'Ich komme mit ___ Bus', 'dem', ['der', 'den'], 0, 'После mit автобус — mit dem Bus.'),
    r(10, 2, 'Anna kommt mit ___ Bahn', 'der', ['dem', 'die'], 1, 'После mit поезд — mit der Bahn.'),
    r(10, 3, 'Tom geht ___ Arzt', 'zum', ['zur', 'zu'], 2, 'К врачу — zum Arzt.'),
    r(10, 4, 'Er spricht mit ___', 'mir', ['ich', 'du'], 0, 'После mit говорят mir.'),
    r(10, 5, 'Wir bleiben bei ___ Kindern', 'den', ['die', 'dem'], 1, 'После bei дети — bei den Kindern.'),
    r(10, 6, 'Anna wohnt bei ___ Mutter', 'ihrer', ['ihre', 'ihren'], 2, 'После bei мать — bei ihrer Mutter.'),
  ],
  11: [
    r(11, 1, 'Der Schlüssel liegt auf ___ Tisch', 'dem', ['den', 'der'], 0, 'Лежит на столе — auf dem Tisch.'),
    r(11, 2, 'Ich bin in ___ Küche', 'der', ['die', 'dem'], 1, 'Я уже там — in der Küche.'),
    r(11, 3, 'Die Brille liegt ___ Auto', 'im', ['in', 'in die'], 2, 'В машине — im Auto.'),
    r(11, 4, 'Die Kinder ___ im Bus', 'sitzen', ['sitzt', 'liegt'], 0, 'Детей несколько, значит sitzen.'),
    r(11, 5, 'Ihr seid ___ Bahnhof', 'am', ['an', 'an der'], 1, 'На вокзале — am Bahnhof.'),
    r(11, 6, 'Wo ___ der Ausweis?', 'liegt', ['sitzen', 'stehen'], 2, 'Удостоверение одно и лежит — liegt.'),
  ],
  12: [
    r(12, 1, 'Ich lege den Schlüssel auf ___ Tisch', 'den', ['dem', 'der'], 0, 'Кладу на стол — auf den Tisch.'),
    r(12, 2, 'Wir gehen ___ Café', 'ins', ['in', 'in den'], 1, 'В кафе — ins Café.'),
    r(12, 3, 'Anna steigt in ___ Bus', 'den', ['dem', 'der'], 2, 'Садится в автобус — in den Bus.'),
    r(12, 4, 'Ich hänge die Jacke an ___ Haken', 'den', ['dem', 'der'], 0, 'Вешаю на крючок — an den Haken.'),
    r(12, 5, 'Wir ___ uns an den Tisch', 'setzen', ['setzt', 'sitzen'], 1, 'С wir — setzen.'),
    r(12, 6, 'Tom geht ___ die Schule', 'in', ['im', 'zum'], 2, 'В школу — in die Schule.'),
  ],
};
