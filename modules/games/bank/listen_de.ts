/**
 * Банк игры «На слух» — немецкий классический курс, уроки 1–8 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: произносится дословная фраза урока; каждый неверный вариант отличается от неё ровно
 * одним словом, остаётся правильной немецкой фразой (род и число согласованы) и собран из пройденных слов;
 * подмена различима на слух. Пояснение — перевод прозвучавшей фразы.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { listenRound } from './make_de_fr';

const r = (lesson: number, n: number, text: string, wrong: readonly [string, string], at: number, note: string): QuizRound =>
  listenRound('de', lesson, n, text, wrong, at, note);

export const LISTEN_BANK_DE: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    r(1, 1, 'Die Tür ist offen', ['Die Tür ist zu', 'Die Tür ist frei'], 0, 'Дверь открыта'),
    r(1, 2, 'Der Tee ist heiß', ['Der Tee ist kalt', 'Der Kaffee ist heiß'], 1, 'Чай горячий'),
    r(1, 3, 'Wir sind draußen', ['Wir sind drinnen', 'Wir sind hier'], 2, 'Мы на улице'),
    r(1, 4, 'Das Zimmer ist ruhig', ['Das Zimmer ist frei', 'Das Zimmer ist warm'], 0, 'Комната тихая'),
    r(1, 5, 'Du bist allein', ['Du bist bereit', 'Du bist hier'], 1, 'Ты один'),
    r(1, 6, 'Anna ist müde', ['Tom ist müde', 'Anna ist wach'], 2, 'Анна устала'),
  ],
  2: [
    r(2, 1, 'Der Bahnhof ist hier', ['Der Bahnhof ist dort', 'Der Bahnhof ist da'], 1, 'Вокзал здесь'),
    r(2, 2, 'Die Tische sind frei', ['Die Bänke sind frei', 'Die Tische sind kaputt'], 0, 'Столы свободны'),
    r(2, 3, 'Hier ist der Brief', ['Dort ist der Brief', 'Hier ist der Plan'], 2, 'Вот письмо'),
    r(2, 4, 'Das ist die Karte', ['Das ist die Kasse', 'Das ist die Kiste'], 1, 'Это карта'),
    r(2, 5, 'Der Mantel ist schwer', ['Der Mantel ist neu', 'Der Mantel ist kaputt'], 0, 'Пальто тяжёлое'),
    r(2, 6, 'Das Café ist offen', ['Das Büro ist offen', 'Das Hotel ist offen'], 2, 'Кафе открыто'),
  ],
  3: [
    r(3, 1, 'Ich kaufe Brot', ['Ich kaufe Milch', 'Ich kaufe Gemüse'], 0, 'Я покупаю хлеб'),
    r(3, 2, 'Wir warten im Café', ['Wir arbeiten im Café', 'Wir warten im Hotel'], 1, 'Мы ждём в кафе'),
    r(3, 3, 'Du hörst Radio', ['Du hörst Musik', 'Du hörst Anna'], 2, 'Ты слушаешь радио'),
    r(3, 4, 'Tom kocht das Gemüse', ['Tom kauft das Gemüse', 'Tom kocht das Essen'], 0, 'Том готовит овощи'),
    r(3, 5, 'Wir bezahlen zusammen', ['Wir arbeiten zusammen', 'Wir lernen zusammen'], 1, 'Мы платим вместе'),
    r(3, 6, 'Anna sucht das Handy', ['Anna sucht das Hotel', 'Anna sucht das Ticket'], 2, 'Анна ищет мобильный телефон'),
  ],
  4: [
    r(4, 1, 'Am Montag arbeite ich', ['Am Sonntag arbeite ich', 'Am Samstag arbeite ich'], 1, 'В понедельник я работаю'),
    r(4, 2, 'Um sechs schließt die Küche', ['Um sieben schließt die Küche', 'Um zehn schließt die Küche'], 0, 'В шесть закрывается кухня'),
    r(4, 3, 'Heute kaufe ich Brot', ['Heute kaufe ich Milch', 'Morgen kaufe ich Brot'], 2, 'Сегодня я покупаю хлеб'),
    r(4, 4, 'Um zehn öffnet der Laden', ['Um zehn schließt der Laden', 'Um zwölf öffnet der Laden'], 1, 'В десять открывается магазин'),
    r(4, 5, 'Am Abend lesen wir', ['Am Abend lernen wir', 'Am Abend kochen wir'], 0, 'Вечером мы читаем'),
    r(4, 6, 'Um drei wartet Tom am Eingang', ['Um drei wartet Anna am Eingang', 'Um vier wartet Tom am Eingang'], 2, 'В три Том ждёт у входа'),
  ],
  5: [
    r(5, 1, 'Ist der Platz frei?', ['Ist der Tisch frei?', 'Ist der Stuhl frei?'], 0, 'Место свободно?'),
    r(5, 2, 'Arbeitest du morgen?', ['Arbeitest du heute?', 'Arbeitest du hier?'], 1, 'Ты работаешь завтра?'),
    r(5, 3, 'Kommt Anna heute?', ['Kocht Anna heute?', 'Lernt Anna heute?'], 2, 'Анна придёт сегодня?'),
    r(5, 4, 'Haben Sie Zeit?', ['Haben Sie Durst?', 'Haben Sie Tee?'], 0, 'У вас есть время?'),
    r(5, 5, 'Öffnet das Café um acht?', ['Öffnet das Café um neun?', 'Öffnet das Büro um acht?'], 1, 'Кафе открывается в восемь?'),
    r(5, 6, 'Wohnt ihr zusammen?', ['Wohnt ihr hier?', 'Lernt ihr zusammen?'], 2, 'Вы живёте вместе?'),
  ],
  6: [
    r(6, 1, 'Wo wohnst du?', ['Wo wartest du?', 'Wo arbeitest du?'], 1, 'Где ты живёшь?'),
    r(6, 2, 'Wann beginnt der Kurs?', ['Wo beginnt der Kurs?', 'Wie beginnt der Kurs?'], 0, 'Когда начинается курс?'),
    r(6, 3, 'Was kostet die Suppe?', ['Was kostet die Tasche?', 'Was kostet die Karte?'], 2, 'Сколько стоит суп?'),
    r(6, 4, 'Wer wartet draußen?', ['Wer arbeitet draußen?', 'Wer wartet drinnen?'], 1, 'Кто ждёт на улице?'),
    r(6, 5, 'Woher kommst du?', ['Wann kommst du?', 'Wie kommst du?'], 0, 'Откуда ты?'),
    r(6, 6, 'Wie lange bleibt ihr?', ['Wie lange wartet ihr?', 'Wie lange arbeitet ihr?'], 2, 'Как долго вы остаётесь?'),
  ],
  7: [
    r(7, 1, 'Ich nehme den Bus', ['Ich nehme den Zug', 'Ich nehme den Stift'], 0, 'Я еду на автобусе'),
    r(7, 2, 'Wir suchen einen Parkplatz', ['Wir brauchen einen Parkplatz', 'Wir suchen einen Platz'], 1, 'Мы ищем парковочное место'),
    r(7, 3, 'Anna holt die Jacke', ['Anna holt die Tasche', 'Anna trägt die Jacke'], 2, 'Анна забирает куртку'),
    r(7, 4, 'Ich habe einen Termin', ['Ich habe einen Stift', 'Ich brauche einen Termin'], 0, 'У меня назначена встреча'),
    r(7, 5, 'Tom trägt das Paket', ['Tom trägt das Buch', 'Tom holt das Paket'], 1, 'Том несёт посылку'),
    r(7, 6, 'Wir lesen das Buch', ['Wir holen das Buch', 'Wir lesen das Ticket'], 2, 'Мы читаем книгу'),
  ],
  8: [
    r(8, 1, 'Ich habe keinen Schlüssel', ['Ich habe einen Schlüssel', 'Ich brauche keinen Schlüssel'], 1, 'У меня нет ключа'),
    r(8, 2, 'Anna hat kein Handy', ['Anna hat ein Handy', 'Anna hat dein Handy'], 0, 'У Анны нет мобильного телефона'),
    r(8, 3, 'Tom hat keine Zeit', ['Tom hat keine Zeitung', 'Tom hat keine Frage'], 2, 'У Тома нет времени'),
    r(8, 4, 'Wir kochen heute nicht', ['Wir kommen heute nicht', 'Wir kochen morgen nicht'], 1, 'Мы сегодня не готовим'),
    r(8, 5, 'Die Bahn fährt heute nicht', ['Die Bahn fährt morgen nicht', 'Die Bahn kommt heute nicht'], 0, 'Поезд сегодня не ходит'),
    r(8, 6, 'Das ist nicht mein Koffer', ['Das ist nicht dein Koffer', 'Das ist nicht mein Kaffee'], 2, 'Это не мой чемодан'),
  ],
};
