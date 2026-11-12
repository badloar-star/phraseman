/**
 * Банк игры «Охота на ошибку» — немецкий классический курс, уроки 1–20 (D207). 2 мини-диалога на урок.
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
  9: [
    h(9, 1, ['Ist das dein Koffer?', 'Das ist {meine>mein} Koffer.', 'Hier ist *deine Jacke.'], 'Чемодан — der Koffer, поэтому mein.'),
    h(9, 2, ['Wo sind meine Schuhe?', 'Deine Schuhe {ist>sind} hier.', 'Tom hat *seinen Pass.'], 'Туфель несколько, значит sind.'),
  ],
  10: [
    h(10, 1, ['Kommst du mit dem Bus?', 'Ich komme mit {die>der} Bahn.', 'Tom kommt *mit dem Fahrrad.'], 'Поезд — die Bahn, а после mit — der Bahn.'),
    h(10, 2, ['Wo ist Anna?', 'Anna ist {bei>beim} Arzt.', 'Tom geht *zur Post.'], 'У врача — beim Arzt.'),
  ],
  11: [
    h(11, 1, ['Wo ist der Pass?', 'Der Pass liegt in {die>der} Tasche.', 'Das Handy liegt *im Auto.'], 'Лежит в сумке — in der Tasche.'),
    h(11, 2, ['Wo sind die Kinder?', 'Die Kinder {sitzt>sitzen} im Bus.', 'Anna ist *im Garten.'], 'Детей несколько, значит sitzen.'),
  ],
  12: [
    h(12, 1, ['Wohin gehst du?', 'Ich {gehst>gehe} in den Garten.', 'Anna geht *ins Bad.'], 'С ich — gehe.'),
    h(12, 2, ['Wo ist der Pass?', 'Ich lege den Pass in {der>die} Tasche.', 'Tom stellt *den Koffer vor die Tür.'], 'Кладу в сумку — in die Tasche.'),
  ],
  13: [
    h(13, 1, ['Wann fährt der Zug ab?', 'Der Zug {fahren>fährt} um elf ab.', 'Ich hole *dich am Bahnhof ab.'], 'С der Zug — fährt.'),
    h(13, 2, ['Was bringst du mit?', 'Ich {bringst>bringe} Brot mit.', 'Anna bringt *einen Salat mit.'], 'С ich — bringe.'),
  ],
  14: [
    h(14, 1, ['Kannst du mir helfen?', 'Ich {kannst>kann} helfen.', 'Wir *können zusammen kochen.'], 'С ich — kann.'),
    h(14, 2, ['Darf der Hund mitkommen?', 'Der Hund {dürfen>darf} mitkommen.', 'Ihr *dürft das Fahrrad mitnehmen.'], 'Собака одна — darf.'),
  ],
  15: [
    h(15, 1, ['Wo soll ich warten?', 'Warte {in>am} Eingang!', 'Ich komme *gleich.'], 'У входа — am Eingang.'),
    h(15, 2, ['Kinder, kommt bitte rein!', 'Setzt {dich>euch} hierhin!', 'Nehmt *eure Jacken mit!'], 'Нескольким — setzt euch.'),
  ],
  16: [
    h(16, 1, ['Was hast du gekocht?', 'Ich habe Suppe {kocht>gekocht}.', 'Anna hat *Kaffee gemacht.'], 'После habe — gekocht.'),
    h(16, 2, ['Habt ihr den Zug verpasst?', 'Wir {hat>haben} den Zug verpasst.', 'Tom hat *den Wecker nicht gehört.'], 'С wir — haben.'),
  ],
  17: [
    h(17, 1, ['Wann bist du aufgestanden?', 'Ich bin früh {aufstehen>aufgestanden}.', 'Tom ist *spät aufgestanden.'], 'После bin — aufgestanden.'),
    h(17, 2, ['Wo ist Tom ausgestiegen?', 'Tom {hat>ist} am Markt ausgestiegen.', 'Anna ist *vorne eingestiegen.'], 'Вышел — ist ausgestiegen.'),
  ],
  18: [
    h(18, 1, ['Wie war die Fahrt?', 'Der Bus {hattest>hatte} Verspätung.', 'Wir *hatten Glück.'], 'Автобус один — hatte.'),
    h(18, 2, ['Wo wart ihr gestern?', 'Wir {war>waren} zu Hause.', 'Anna *war krank.'], 'С wir — waren.'),
  ],
  19: [
    h(19, 1, ['Wo trefft ihr euch?', 'Wir {trefft>treffen} uns am Bahnhof.', 'Anna *setzt sich neben Tom.'], 'С wir — treffen.'),
    h(19, 2, ['Beeilst du dich?', 'Ich {beeilst>beeile} mich.', 'Wir *müssen uns beeilen.'], 'С ich — beeile.'),
  ],
  20: [
    h(20, 1, ['Ist der Zug schneller?', 'Der Zug ist schneller {wie>als} der Bus.', 'Das Taxi ist *teurer als die Bahn.'], 'После schneller — als.'),
    h(20, 2, ['Wie geht es dir?', 'Heute geht es {mich>mir} besser.', 'Ich bin *genauso müde wie du.'], 'Мне — mir.'),
  ],
};
