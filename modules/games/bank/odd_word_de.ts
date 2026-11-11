/**
 * Банк игры «Лишнее слово» — немецкий классический курс, уроки 1–8 (D207). 8 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: без лишнего слова остаётся фраза урока (или фраза только из пройденных слов); с лишним
 * словом фраза неверна; убрав любое ДРУГОЕ слово, верную фразу не получить. Поэтому нет заданий вида
 * «Ich [bin] wohne hier» (без wohne остаётся верное «Ich bin hier») и «Der Bus ist [hier] da».
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { OddWordTask } from '../odd_word_core';
import { oddTask } from './make_de_fr';

const t = (lesson: number, n: number, marked: string, translation: string, why: string): OddWordTask =>
  oddTask('de', lesson, n, marked, translation, why);

export const ODD_WORD_BANK_DE: Readonly<Record<number, readonly OddWordTask[]>> = {
  1: [
    t(1, 1, 'Ich bin [ist] hier', 'Я здесь', 'С ich всегда идёт bin.'),
    t(1, 2, 'Du [bin] bist müde', 'Ты устал', 'С du идёт bist, а не bin.'),
    t(1, 3, 'Anna [und] ist müde', 'Анна устала', 'Und соединяет двоих, а Анна здесь одна.'),
    t(1, 4, 'Ihr seid [sind] bereit', 'Вы готовы', 'С ihr идёт seid, а не sind.'),
    t(1, 5, 'Die Kinder [ist] sind draußen', 'Дети на улице', 'Kinder — их несколько, значит sind.'),
    t(1, 6, 'Die [der] Tür ist zu', 'Дверь закрыта', 'Дверь — die Tür, der тут лишнее.'),
    t(1, 7, 'Tom ist [bin] zu Hause', 'Том дома', 'Про Тома — ist, bin бывает только с ich.'),
    t(1, 8, 'Deine Schlüssel [ist] sind hier', 'Твои ключи здесь', 'Ключей несколько, значит sind.'),
  ],
  2: [
    t(2, 1, 'Das ist [sind] der Schlüssel', 'Это ключ', 'Ключ один, значит ist.'),
    t(2, 2, 'Das [ist] sind die Karten', 'Это карты', 'Карт несколько, значит sind.'),
    t(2, 3, 'Die [der] Lampe ist kaputt', 'Лампа сломана', 'Лампа — die Lampe, der тут лишнее.'),
    t(2, 4, 'Das [die] Hotel ist dort', 'Гостиница там', 'Гостиница — das Hotel, die тут лишнее.'),
    t(2, 5, 'Hier ist [sind] das Paket', 'Вот посылка', 'Посылка одна, значит ist.'),
    t(2, 6, 'Die Tische [ist] sind frei', 'Столы свободны', 'Столов несколько, значит sind.'),
    t(2, 7, 'Dort ist der [das] Aufzug', 'Вон там лифт', 'Лифт — der Aufzug, das тут лишнее.'),
    t(2, 8, 'Hier [ist] sind die Briefe', 'Вот письма', 'Писем несколько, значит sind.'),
  ],
  3: [
    t(3, 1, 'Ich wohne [wohnst] hier', 'Я живу здесь', 'С ich — wohne, wohnst идёт с du.'),
    t(3, 2, 'Du [lerne] lernst Deutsch', 'Ты учишь немецкий', 'С du — lernst, lerne идёт с ich.'),
    t(3, 3, 'Anna [arbeiten] arbeitet im Hotel', 'Анна работает в гостинице', 'Про Анну — arbeitet, с -t на конце.'),
    t(3, 4, 'Wir machen [macht] eine Pause', 'Мы делаем перерыв', 'С wir — machen, а не macht.'),
    t(3, 5, 'Ich suche [der] den Schlüssel', 'Я ищу ключ', 'Когда ключ ищут, der становится den.'),
    t(3, 6, 'Ihr [wir] lernt zusammen', 'Вы учитесь вместе', 'Lernt — это про ihr, wir тут лишнее.'),
    t(3, 7, 'Du kochst [den] die Suppe', 'Ты варишь суп', 'Суп — die Suppe, den тут лишнее.'),
    t(3, 8, 'Die Gäste [wartet] warten drinnen', 'Гости ждут внутри', 'Гостей несколько, значит warten.'),
  ],
  4: [
    t(4, 1, 'Heute [ich] arbeite ich', 'Сегодня я работаю', 'После heute сразу идёт arbeite, а ich — за ним.'),
    t(4, 2, 'Am [um] Montag arbeite ich', 'В понедельник я работаю', 'Дни недели — с am.'),
    t(4, 3, 'Um [am] zehn öffnet der Laden', 'В десять открывается магазин', 'Время на часах — с um.'),
    t(4, 4, 'Nach dem [der] Kurs lerne ich zu Hause', 'После занятия я учусь дома', 'После nach говорят dem Kurs.'),
    t(4, 5, 'Vor der [dem] Arbeit macht Tom Kaffee', 'Перед работой Том готовит кофе', 'После vor говорят der Arbeit.'),
    t(4, 6, 'Heute sind [ist] die Fenster zu', 'Сегодня окна закрыты', 'Окон несколько, значит sind.'),
    t(4, 7, 'In der Pause trinken [trinke] wir Wasser', 'На перерыве мы пьём воду', 'С wir — trinken, trinke идёт с ich.'),
    t(4, 8, 'Heute [am] macht Anna Kaffee', 'Сегодня Анна готовит кофе', 'Heute обходится без am.'),
  ],
  5: [
    t(5, 1, 'Bist [ist] du hier?', 'Ты здесь?', 'С du идёт bist, и оно уже стоит в начале.'),
    t(5, 2, 'Ist [sind] der Platz frei?', 'Место свободно?', 'Место одно, значит ist.'),
    t(5, 3, 'Lernst [lernt] du Deutsch?', 'Ты учишь немецкий?', 'С du — lernst, и оно уже стоит в начале.'),
    t(5, 4, 'Haben [hast] Sie Zeit?', 'У вас есть время?', 'На «вы» — haben Sie, hast идёт с du.'),
    t(5, 5, 'Arbeitet Tom [um] am Montag?', 'Том работает в понедельник?', 'Дни недели — с am.'),
    t(5, 6, 'Beginnt der Kurs [am] um neun?', 'Занятие начинается в девять?', 'Время на часах — с um.'),
    t(5, 7, 'Hast du [den] das Ticket?', 'У тебя билет?', 'Билет — das Ticket, den тут лишнее.'),
    t(5, 8, 'Wohnt Tom [im] in Berlin?', 'Том живёт в Берлине?', 'Перед названием города — in.'),
  ],
  6: [
    t(6, 1, 'Wo [ist] wohnst du?', 'Где ты живёшь?', 'Wohnst справляется само, ist тут не нужно.'),
    t(6, 2, 'Wie heißt [ist] du?', 'Как тебя зовут?', 'Heißt справляется само, ist тут не нужно.'),
    t(6, 3, 'Wie heißen [heißt] Sie?', 'Как вас зовут?', 'На «вы» — heißen Sie.'),
    t(6, 4, 'Wie geht es [du] dir?', 'Как у тебя дела?', 'Здесь нужно dir — «тебе».'),
    t(6, 5, 'Wie komme ich [zu] zum Bahnhof?', 'Как мне добраться до вокзала?', 'К вокзалу — zum Bahnhof.'),
    t(6, 6, 'Wie viel [viele] kostet ein Zimmer?', 'Сколько стоит комната?', 'Про цену спрашивают wie viel.'),
    t(6, 7, 'Wer hat [der] den Schlüssel?', 'У кого ключ?', 'После hat ключ — den Schlüssel.'),
    t(6, 8, 'Wo sind [ist] die Schlüssel?', 'Где ключи?', 'Ключей несколько, значит sind.'),
  ],
  7: [
    t(7, 1, 'Ich habe [ein] einen Schlüssel', 'У меня есть ключ', 'Ключ — der Schlüssel, поэтому einen.'),
    t(7, 2, 'Wir haben [einen] eine Tasche', 'У нас есть сумка', 'Сумка — die Tasche, поэтому eine.'),
    t(7, 3, 'Du nimmst [der] den Zug', 'Ты едешь поездом', 'После nimmst поезд — den Zug.'),
    t(7, 4, 'Anna [nimmst] nimmt die Bahn', 'Анна едет на поезде', 'Про Анну — nimmt, nimmst идёт с du.'),
    t(7, 5, 'Tom bestellt [einen] ein Wasser', 'Том заказывает воду', 'Вода — das Wasser, поэтому ein.'),
    t(7, 6, 'Du [habe] hast eine Frage', 'У тебя есть вопрос', 'С du — hast, habe идёт с ich.'),
    t(7, 7, 'Ich lese [das] den Brief', 'Я читаю письмо', 'Письмо — der Brief, после lese он den Brief.'),
    t(7, 8, 'Hat Tom [einen] eine Fahrkarte?', 'У Тома есть билет на транспорт?', 'Билет — die Fahrkarte, поэтому eine.'),
  ],
  8: [
    t(8, 1, 'Ich bin [kein] nicht müde', 'Я не уставший', '«Не устал» — nicht müde.'),
    t(8, 2, 'Ich habe [nicht] keinen Schlüssel', 'У меня нет ключа', '«Нет ключа» — keinen Schlüssel, nicht тут лишнее.'),
    t(8, 3, 'Anna hat [keinen] kein Handy', 'У Анны нет мобильного телефона', 'Телефон — das Handy, поэтому kein.'),
    t(8, 4, 'Du hast [kein] keine Tasche', 'У тебя нет сумки', 'Сумка — die Tasche, поэтому keine.'),
    t(8, 5, 'Das ist [nicht] kein Hotel', 'Это не гостиница', '«Не гостиница» — kein Hotel, nicht тут лишнее.'),
    t(8, 6, 'Tom ist nicht [in] im Büro', 'Том не в офисе', 'В офисе — im Büro.'),
    t(8, 7, 'Wir bezahlen [kein] nicht mit Karte', 'Мы платим не картой', '«Не картой» — nicht mit Karte.'),
    t(8, 8, 'Das Zimmer hat [keine] keinen Balkon', 'В комнате нет балкона', 'Балкон — der Balkon, поэтому keinen.'),
  ],
};
