/**
 * Банк игры «Собери диалог» — немецкий классический курс, уроки 4–8 (D207). 2 задания на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: четыре реплики из пройденных слов, порядок один. В уроке 4 вопросов ещё нет — порядок
 * задаёт время (часы, дни недели). С урока 5 это вопрос — ответ — вопрос с auch — ответ: auch ставит второй
 * вопрос после первого, а каждый ответ повторяет слова своего вопроса, поэтому пары не перепутать.
 * Уроков 1–3 в банке нет: в них одни утверждения без примет порядка, однозначный порядок не собрать.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { OrderTask } from '../dialogue_core';
import { orderTask } from './make_de_fr';

const o = (lesson: number, n: number, lines: readonly string[]): OrderTask => orderTask('de', lesson, n, lines);

export const ORDER_BANK_DE: Readonly<Record<number, readonly OrderTask[]>> = {
  4: [
    o(4, 1, ['Um sieben kommt der Bus.', 'Um acht beginnt der Kurs.', 'Um zwölf machen wir eine Pause.', 'Am Abend lesen wir.']),
    o(4, 2, ['Am Montag kaufen wir Gemüse.', 'Am Dienstag kochen wir Suppe.', 'Am Freitag lernen wir Deutsch.', 'Am Sonntag macht Tom Frühstück.']),
  ],
  5: [
    o(5, 1, ['Arbeitest du morgen?', 'Morgen arbeite ich.', 'Arbeitest du auch am Samstag?', 'Am Samstag bin ich zu Hause.']),
    o(5, 2, ['Lernst du Deutsch?', 'Ich lerne Deutsch.', 'Lernt Anna auch Deutsch?', 'Anna lernt im Café.']),
  ],
  6: [
    o(6, 1, ['Wo wohnst du?', 'Ich wohne in Berlin.', 'Wohnt Tom auch in Berlin?', 'Tom wohnt im Hotel.']),
    o(6, 2, ['Wo ist der Eingang?', 'Der Eingang ist dort.', 'Ist die Kasse auch dort?', 'Die Kasse ist hier.']),
  ],
  7: [
    o(7, 1, ['Was bestellen Sie?', 'Ich bestelle einen Tee.', 'Möchten Sie auch eine Suppe?', 'Ich nehme eine Suppe.']),
    o(7, 2, ['Hast du einen Schlüssel?', 'Ich habe einen Schlüssel.', 'Hast du auch das Ladegerät?', 'Anna hat das Ladegerät.']),
  ],
  8: [
    o(8, 1, ['Ist der Laden offen?', 'Der Laden ist nicht offen.', 'Ist das Café auch zu?', 'Das Café ist offen.']),
    o(8, 2, ['Kommt Anna heute?', 'Anna kommt heute nicht.', 'Kommt Tom auch nicht?', 'Tom kommt um acht.']),
  ],
};
