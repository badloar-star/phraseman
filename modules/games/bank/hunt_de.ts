/**
 * Банк игры «Охота на ошибку» — немецкий классический курс, уроки 1–8 (D207). 2 мини-диалога на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: три реплики, после исправления каждая — фраза урока или фраза из пройденных слов;
 * неверное слово ровно одно и оно однозначно неверно; слово-обманка стоит в ДРУГОЙ реплике и само верно.
 * Разметка: `{sind>ist}` — ошибка и её замена, `*sind` — слово-обманка.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { HuntTask } from '../dialogue_core';
import { huntTask } from './make_de_fr';

const h = (lesson: number, n: number, lines: readonly string[], why: string): HuntTask => huntTask('de', lesson, n, lines, why);

export const HUNT_BANK_DE: Readonly<Record<number, readonly HuntTask[]>> = {
  1: [
    h(1, 1, ['Ich bin zu Hause.', 'Tom und ich *sind draußen.', 'Die Kinder {ist>sind} drinnen.'], 'Детей несколько, значит sind.'),
    h(1, 2, ['*Das Essen ist fertig.', '{Das>Die} Suppe ist warm.', 'Der Tee ist heiß.'], 'Суп — die Suppe.'),
  ],
  2: [
    h(2, 1, ['Das ist das Hotel.', 'Dort *ist der Eingang.', 'Die Kasse {sind>ist} hier.'], 'Касса одна, значит ist.'),
    h(2, 2, ['Hier ist {der>die} Rechnung.', 'Das ist *das Ticket.', 'Die Kasse ist dort.'], 'Счёт — die Rechnung.'),
  ],
  3: [
    h(3, 1, ['Wir kochen zu Hause.', 'Ich *kaufe Gemüse.', 'Tom {kaufen>kauft} Brot.'], 'Про Тома — на -t: kauft.'),
    h(3, 2, ['Ich suche {der>den} Schlüssel.', 'Anna sucht *das Handy.', 'Wir warten draußen.'], 'Когда ключ ищут, der становится den.'),
  ],
  4: [
    h(4, 1, ['Morgen arbeite ich.', '*Am Samstag arbeitet Tom.', '{Um>Am} Sonntag kochen wir.'], 'Дни недели — с am.'),
    h(4, 2, ['Um acht beginnt der Kurs.', 'Nach {der>dem} Kurs lerne ich zu Hause.', 'Vor *der Arbeit macht Tom Kaffee.'], 'После nach говорят dem Kurs.'),
  ],
  5: [
    h(5, 1, ['Arbeitest du morgen?', 'Morgen *arbeite ich.', '{Arbeiten>Arbeitet} ihr am Samstag?'], 'С ihr — на -t: arbeitet.'),
    h(5, 2, ['Ist der Platz frei?', 'Der Platz *ist frei.', '{Sind>Ist} das Bad frei?'], 'Ванная одна, значит ist.'),
  ],
  6: [
    h(6, 1, ['Wo *wohnst du?', 'Ich wohne in Berlin.', 'Wo {arbeitest>arbeitet} Anna?'], 'Про Анну — на -t: arbeitet.'),
    h(6, 2, ['Wann {kommt>kommen} die Gäste?', 'Die Gäste kommen um acht.', 'Wer *macht heute Kaffee?'], 'Гостей несколько, значит kommen.'),
  ],
  7: [
    h(7, 1, ['Ich suche einen Arzt.', 'Hast du {ein>einen} Termin?', 'Ich habe *eine Frage.'], 'Встреча — der Termin, поэтому einen.'),
    h(7, 2, ['Nimmst du den Bus?', 'Ich *nehme die Bahn.', 'Anna {nehmt>nimmt} das Taxi.'], 'Про Анну — nimmt.'),
  ],
  8: [
    h(8, 1, ['Ist das dein Koffer?', 'Das ist {kein>nicht} mein Koffer.', 'Ich habe *keinen Koffer.'], 'Перед mein ставят nicht.'),
    h(8, 2, ['Hast du Zeit?', 'Ich habe {keinen>keine} Zeit.', 'Tom kommt heute *nicht.'], 'Время — die Zeit, поэтому keine.'),
  ],
};
