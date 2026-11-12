/**
 * Банк игры «Собери диалог» — немецкий классический курс, уроки 4–12 (D207). 2 задания на урок.
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
  9: [
    o(9, 1, ['Ist das dein Pass?', 'Das ist mein Pass.', 'Ist das auch dein Ausweis?', 'Mein Ausweis ist hier.']),
    o(9, 2, ['Wo sind meine Schuhe?', 'Deine Schuhe sind hier.', 'Und wo ist mein Ladegerät?', 'Dein Ladegerät ist dort.']),
  ],
  10: [
    o(10, 1, ['Kommst du mit dem Bus?', 'Ich komme mit dem Fahrrad.', 'Kommt Anna auch mit dem Fahrrad?', 'Anna kommt mit der Bahn.']),
    o(10, 2, ['Wo ist der Schlüssel?', 'Der Schlüssel ist bei mir.', 'Ist der Ausweis auch bei dir?', 'Der Ausweis ist bei Anna.']),
  ],
  11: [
    o(11, 1, ['Wo liegt der Ausweis?', 'Der Ausweis liegt in der Jacke.', 'Liegt der Pass auch in der Jacke?', 'Der Pass liegt in der Tasche.']),
    o(11, 2, ['Wo ist Tom?', 'Tom ist in der Schule.', 'Ist Anna auch in der Schule?', 'Anna ist im Garten.']),
  ],
  12: [
    o(12, 1, ['Wohin stellst du die Kiste?', 'Ich stelle die Kiste in den Keller.', 'Stellst du auch das Fahrrad in den Keller?', 'Das Fahrrad stelle ich in den Flur.']),
    o(12, 2, ['Gehen wir an den See?', 'Heute gehen wir ins Kino.', 'Gehen wir auch ans Meer?', 'Am Samstag fahren wir ans Meer.']),
  ],
  13: [
    o(13, 1, ['Wann stehst du auf?', 'Ich stehe um sieben auf.', 'Stehst du auch am Samstag früh auf?', 'Am Samstag stehe ich spät auf.']),
    o(13, 2, ['Wer holt die Kinder ab?', 'Tom holt die Kinder ab.', 'Holt Tom auch die Gäste ab?', 'Die Gäste hole ich ab.']),
  ],
  14: [
    o(14, 1, ['Kannst du heute kommen?', 'Heute kann ich nicht kommen.', 'Kannst du auch morgen kommen?', 'Morgen kann ich kommen.']),
    o(14, 2, ['Musst du morgen arbeiten?', 'Ich muss morgen arbeiten.', 'Musst du auch am Samstag arbeiten?', 'Am Samstag muss ich nicht arbeiten.']),
  ],
  15: [
    o(15, 1, ['Wo soll ich warten?', 'Warte am Eingang!', 'Soll ich auch hier warten?', 'Warte nicht hier!']),
    o(15, 2, ['Was soll ich mitbringen?', 'Bring bitte ein Handtuch mit!', 'Soll ich auch Brot mitbringen?', 'Bring auch Brot mit!']),
  ],
  16: [
    o(16, 1, ['Was hast du bestellt?', 'Ich habe Tee bestellt.', 'Hast du auch Kaffee bestellt?', 'Kaffee habe ich nicht bestellt.']),
    o(16, 2, ['Wer hat die Rechnung bezahlt?', 'Tom hat die Rechnung bezahlt.', 'Hat Tom auch das Frühstück bezahlt?', 'Das Frühstück hat Anna bezahlt.']),
  ],
  17: [
    o(17, 1, ['Wann bist du aufgestanden?', 'Ich bin früh aufgestanden.', 'Und wann ist Tom aufgestanden?', 'Tom ist spät aufgestanden.']),
    o(17, 2, ['Wohin seid ihr gefahren?', 'Wir sind nach Berlin gefahren.', 'Und wohin ist Anna gefahren?', 'Anna ist nach Hause gefahren.']),
  ],
  18: [
    o(18, 1, ['Warst du gestern im Büro?', 'Ich war gestern im Büro.', 'Und war Anna auch im Büro?', 'Anna war zu Hause.']),
    o(18, 2, ['Hattest du deinen Ausweis?', 'Ich hatte meinen Ausweis.', 'Hatte Tom auch einen Ausweis?', 'Tom hatte keinen Ausweis.']),
  ],
  19: [
    o(19, 1, ['Wann trefft ihr euch?', 'Wir treffen uns morgen.', 'Und wo trefft ihr euch?', 'Wir treffen uns am Bahnhof.']),
    o(19, 2, ['Freut ihr euch auf die Fahrt?', 'Wir freuen uns auf die Fahrt.', 'Freut sich Tom auch auf die Fahrt?', 'Tom freut sich auf den Kurs.']),
  ],
  20: [
    o(20, 1, ['Ist das Bad größer?', 'Das Bad ist kleiner.', 'Und die Küche?', 'Die Küche ist heller.']),
    o(20, 2, ['Fährt Anna lieber mit dem Bus?', 'Anna fährt lieber mit dem Zug.', 'Und Tom?', 'Tom fährt lieber mit dem Fahrrad.']),
  ],
};
