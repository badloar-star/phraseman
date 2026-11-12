/**
 * Банк игры «На слух» — немецкий классический курс, уроки 1–20 (D207). 6 заданий на урок.
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
  9: [
    r(9, 1, 'Das ist mein Pass', ['Das ist dein Pass', 'Das ist mein Ausweis'], 0, 'Это мой паспорт'),
    r(9, 2, 'Unser Zug kommt', ['Unser Bus kommt', 'Unser Zug wartet'], 1, 'Наш поезд прибывает'),
    r(9, 3, 'Anna findet ihre Schlüssel', ['Anna sucht ihre Schlüssel', 'Anna findet ihre Schuhe'], 2, 'Анна находит свои ключи'),
    r(9, 4, 'Ich zeige meine Karte', ['Ich zeige meine Adresse', 'Ich hole meine Karte'], 0, 'Я показываю свою карту'),
    r(9, 5, 'Wo sind meine Schuhe?', ['Wo sind deine Schuhe?', 'Wo sind meine Schlüssel?'], 1, 'Где мои туфли?'),
    r(9, 6, 'Eure Freunde warten', ['Eure Freunde kommen', 'Unsere Freunde warten'], 2, 'Ваши друзья ждут'),
  ],
  10: [
    r(10, 1, 'Ich komme mit dem Bus', ['Ich komme mit dem Zug', 'Ich komme mit dem Taxi'], 0, 'Я приезжаю на автобусе'),
    r(10, 2, 'Tom geht zum Arzt', ['Anna geht zum Arzt', 'Tom geht zum Bahnhof'], 1, 'Том идёт к врачу'),
    r(10, 3, 'Wir gehen zur Kasse', ['Wir gehen zur Post', 'Wir gehen zur Schule'], 2, 'Мы идём к кассе'),
    r(10, 4, 'Ich bin beim Arzt', ['Ich bin beim Nachbarn', 'Ich bin beim Sport'], 0, 'Я у врача'),
    r(10, 5, 'Der Schlüssel ist bei mir', ['Der Schlüssel ist bei dir', 'Der Ausweis ist bei mir'], 1, 'Ключ у меня'),
    r(10, 6, 'Nach der Pause beginnt der Kurs', ['Vor der Pause beginnt der Kurs', 'Nach der Fahrt beginnt der Kurs'], 2, 'После перерыва начинается занятие'),
  ],
  11: [
    r(11, 1, 'Der Schlüssel liegt auf dem Tisch', ['Der Schlüssel liegt unter dem Tisch', 'Der Ball liegt auf dem Tisch'], 0, 'Ключ лежит на столе'),
    r(11, 2, 'Die Jacke hängt im Flur', ['Die Jacke hängt im Büro', 'Die Jacke liegt im Flur'], 1, 'Куртка висит в прихожей'),
    r(11, 3, 'Anna sitzt auf der Bank', ['Anna sitzt auf der Treppe', 'Tom sitzt auf der Bank'], 2, 'Анна сидит на скамейке'),
    r(11, 4, 'Ich bin in der Küche', ['Ich bin in der Schule', 'Ich bin in der Halle'], 0, 'Я на кухне'),
    r(11, 5, 'Die Gäste sind im Café', ['Die Gäste sind im Garten', 'Die Kinder sind im Café'], 1, 'Гости в кафе'),
    r(11, 6, 'Der Hund schläft unter dem Tisch', ['Der Hund schläft unter dem Bett', 'Der Hund schläft auf dem Tisch'], 2, 'Собака спит под столом'),
  ],
  12: [
    r(12, 1, 'Ich lege den Schlüssel auf den Tisch', ['Ich lege den Pass auf den Tisch', 'Ich lege den Schlüssel auf den Stuhl'], 0, 'Я кладу ключ на стол'),
    r(12, 2, 'Anna geht ins Bad', ['Tom geht ins Bad', 'Anna geht ins Café'], 1, 'Анна идёт в ванную'),
    r(12, 3, 'Wir gehen ins Café', ['Wir gehen ins Kino', 'Wir kommen ins Café'], 2, 'Мы идём в кафе'),
    r(12, 4, 'Anna steigt in den Bus', ['Anna steigt in den Zug', 'Tom steigt in den Bus'], 0, 'Анна садится в автобус'),
    r(12, 5, 'Fahren wir ans Meer?', ['Gehen wir ans Meer?', 'Fahren wir zum Meer?'], 1, 'Поедем к морю?'),
    r(12, 6, 'Ich gehe in die Küche', ['Ich gehe in die Schule', 'Ich gehe in die Halle'], 2, 'Я иду на кухню'),
  ],
  13: [
    r(13, 1, 'Ich stehe früh auf', ['Ich stehe spät auf', 'Ich stehe heute auf'], 0, 'Я рано встаю'),
    r(13, 2, 'Du rufst mich an', ['Du rufst uns an', 'Du rufst sie an'], 1, 'Ты звонишь мне'),
    r(13, 3, 'Tom macht das Fenster zu', ['Tom macht das Fenster auf', 'Anna macht das Fenster zu'], 2, 'Том закрывает окно'),
    r(13, 4, 'Der Zug kommt um zwölf an', ['Der Zug kommt um elf an', 'Der Bus kommt um zwölf an'], 0, 'Поезд прибывает в двенадцать'),
    r(13, 5, 'Wir holen die Kinder ab', ['Wir holen die Gäste ab', 'Sie holen die Kinder ab'], 1, 'Мы забираем детей'),
    r(13, 6, 'Wann fährt der Bus ab?', ['Wann fährt der Zug ab?', 'Wo fährt der Bus ab?'], 2, 'Когда отправляется автобус?'),
  ],
  14: [
    r(14, 1, 'Ich kann hier warten', ['Ich muss hier warten', 'Ich kann hier parken'], 0, 'Я могу подождать здесь'),
    r(14, 2, 'Kannst du mich hören?', ['Kannst du mich anrufen?', 'Kannst du uns hören?'], 1, 'Ты меня слышишь?'),
    r(14, 3, 'Wir müssen hier aussteigen', ['Wir wollen hier aussteigen', 'Wir dürfen hier aussteigen'], 2, 'Мы должны выйти из транспорта здесь'),
    r(14, 4, 'Ich darf hier parken', ['Ich darf hier warten', 'Ich will hier parken'], 0, 'Мне разрешено здесь парковаться'),
    r(14, 5, 'Ich will Deutsch lernen', ['Ich will Deutsch sprechen', 'Ich muss Deutsch lernen'], 1, 'Я хочу учить немецкий'),
    r(14, 6, 'Ich möchte ein Zimmer buchen', ['Ich möchte ein Ticket buchen', 'Ich möchte ein Zimmer reservieren'], 2, 'Я хотел бы забронировать номер'),
  ],
  15: [
    r(15, 1, 'Warte hier!', ['Warte kurz!', 'Bleib hier!'], 0, 'Подожди здесь!'),
    r(15, 2, 'Ruf mich an!', ['Ruf uns an!', 'Ruf sie an!'], 1, 'Позвони мне!'),
    r(15, 3, 'Nimm den Schlüssel!', ['Nimm den Koffer!', 'Lass den Schlüssel!'], 2, 'Возьми ключ!'),
    r(15, 4, 'Mach das Licht an!', ['Mach das Radio an!', 'Mach das Licht aus!'], 0, 'Включи свет!'),
    r(15, 5, 'Wartet am Eingang!', ['Wartet am Bahnhof!', 'Wartet am Markt!'], 1, 'Подождите у входа!'),
    r(15, 6, 'Warten Sie bitte hier!', ['Warten Sie bitte kurz!', 'Bleiben Sie bitte hier!'], 2, 'Подождите здесь, пожалуйста!'),
  ],
  16: [
    r(16, 1, 'Ich habe heute gekocht', ['Ich habe gestern gekocht', 'Ich habe heute gelernt'], 0, 'Я сегодня готовил'),
    r(16, 2, 'Tom hat Brot gekauft', ['Tom hat Obst gekauft', 'Anna hat Brot gekauft'], 1, 'Том купил хлеб'),
    r(16, 3, 'Wir haben Tee getrunken', ['Wir haben Kaffee getrunken', 'Wir haben Tee bestellt'], 2, 'Мы пили чай'),
    r(16, 4, 'Ich habe die Tür geschlossen', ['Ich habe die Tasche geschlossen', 'Ich habe die Tür gesehen'], 0, 'Я закрыл дверь'),
    r(16, 5, 'Hast du schon gegessen?', ['Hast du schon gekocht?', 'Hast du schon bezahlt?'], 1, 'Ты уже поел?'),
    r(16, 6, 'Wer hat die Rechnung bezahlt?', ['Wer hat die Rechnung bekommen?', 'Wer hat die Rechnung bestellt?'], 2, 'Кто оплатил счёт?'),
  ],
  17: [
    r(17, 1, 'Ich bin angekommen', ['Ich bin gekommen', 'Ich bin gegangen'], 0, 'Я приехал'),
    r(17, 2, 'Tom ist spät aufgestanden', ['Tom ist früh aufgestanden', 'Anna ist spät aufgestanden'], 1, 'Том поздно встал'),
    r(17, 3, 'Anna ist mit dem Bus gefahren', ['Anna ist mit dem Zug gefahren', 'Tom ist mit dem Bus gefahren'], 2, 'Анна поехала на автобусе'),
    r(17, 4, 'Der Zug ist schon abgefahren', ['Der Bus ist schon abgefahren', 'Der Zug ist schon angekommen'], 0, 'Поезд уже ушёл'),
    r(17, 5, 'Bist du zu Fuß gekommen?', ['Bist du zu Fuß gegangen?', 'Bist du zu Fuß gelaufen?'], 1, 'Ты пришёл пешком?'),
    r(17, 6, 'Ich bin heute zu Hause geblieben', ['Ich bin gestern zu Hause geblieben', 'Ich bin lange zu Hause geblieben'], 2, 'Я сегодня остался дома'),
  ],
  18: [
    r(18, 1, 'Ich war müde', ['Ich war krank', 'Ich war draußen'], 0, 'Я был уставшим'),
    r(18, 2, 'Anna war krank', ['Anna war müde', 'Tom war krank'], 1, 'Анна была больна'),
    r(18, 3, 'Ich hatte Zeit', ['Ich hatte Hunger', 'Ich hatte Durst'], 2, 'У меня было время'),
    r(18, 4, 'Der Parkplatz war frei', ['Der Parkplatz war besetzt', 'Der Platz war frei'], 0, 'Парковочное место было свободно'),
    r(18, 5, 'War die Apotheke offen?', ['War die Kasse offen?', 'War die Apotheke zu?'], 1, 'Аптека была открыта?'),
    r(18, 6, 'Der Bus hatte Verspätung', ['Der Zug hatte Verspätung', 'Der Bus hatte Glück'], 2, 'Автобус опаздывал'),
  ],
  19: [
    r(19, 1, 'Ich wasche mich', ['Ich wasche dich', 'Ich wasche uns'], 0, 'Я умываюсь'),
    r(19, 2, 'Wir treffen uns am Bahnhof', ['Wir treffen uns am Markt', 'Wir treffen uns am Eingang'], 1, 'Мы встречаемся на вокзале'),
    r(19, 3, 'Ich beeile mich', ['Ich melde mich', 'Ich freue mich'], 2, 'Я тороплюсь'),
    r(19, 4, 'Anna verspätet sich', ['Anna meldet sich', 'Anna freut sich'], 0, 'Анна опаздывает'),
    r(19, 5, 'Ich wasche mir die Hände', ['Ich wasche mir die Haare', 'Ich wasche dir die Hände'], 1, 'Я мою руки'),
    r(19, 6, 'Wir haben uns gestern getroffen', ['Wir haben uns heute getroffen', 'Wir haben uns gestern verabredet'], 2, 'Мы вчера встречались'),
  ],
  20: [
    r(20, 1, 'Der Zug ist schneller als der Bus', ['Der Zug ist langsamer als der Bus', 'Der Zug ist billiger als der Bus'], 0, 'Поезд быстрее автобуса'),
    r(20, 2, 'Das Bad ist kleiner', ['Das Bad ist größer', 'Das Zimmer ist kleiner'], 1, 'Ванная меньше'),
    r(20, 3, 'Die Küche ist heller', ['Die Küche ist kleiner', 'Die Küche ist ruhiger'], 2, 'Кухня светлее'),
    r(20, 4, 'Ich trinke lieber Tee', ['Ich trinke lieber Kaffee', 'Ich trinke lieber Wasser'], 0, 'Я предпочитаю пить чай'),
    r(20, 5, 'Anna ist älter als Tom', ['Anna ist jünger als Tom', 'Anna ist größer als Tom'], 1, 'Анна старше Тома'),
    r(20, 6, 'Heute geht es mir besser', ['Heute geht es dir besser', 'Heute geht es mir schlecht'], 2, 'Сегодня мне лучше'),
  ],
};
