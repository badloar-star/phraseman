/**
 * Банк игры «Сортировка» — немецкий классический курс, уроки 1–8 (D207). Одна колода из 8 карт на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: противопоставление корзин реально есть в уроке; каждая карта подходит ровно к одной
 * корзине; текст карты — только пройденные слова. Пропуск в карте пишется `___` (все уроки, кроме 6):
 * корзины названы самими словами, и карта с названием своей корзины даёт фразу урока.
 * В колоде урока 6 нет карт, где подошли бы обе корзины (например «… beginnt der Kurs?»).
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { SortBin, SortDeck } from '../sort_core';
import { sortDeck, type SortCard } from './make_de_fr';

const d = (lesson: number, left: SortBin, right: SortBin, cards: readonly SortCard[]): SortDeck => sortDeck('de', lesson, left, right, cards);

export const SORT_BANK_DE: Readonly<Record<number, SortDeck>> = {
  1: d(1, { title: 'ist', example: 'Anna, die Tür' }, { title: 'sind', example: 'wir, die Kinder' }, [
    ['Die Tür ___ offen', 'left', 'die Tür — дверь одна'],
    ['Die Fenster ___ offen', 'right', 'die Fenster — окон несколько'],
    ['Das Fenster ___ zu', 'left', 'das Fenster — окно одно'],
    ['Die Kinder ___ draußen', 'right', 'Kinder — детей несколько'],
    ['Der Platz ___ frei', 'left', 'der Platz — место одно'],
    ['Die Plätze ___ frei', 'right', 'die Plätze — мест несколько'],
    ['Tom ___ allein', 'left', 'Tom — он один'],
    ['Anna und Tom ___ hier', 'right', 'Anna und Tom — их двое'],
  ]),
  2: d(2, { title: 'der', example: 'der Bus' }, { title: 'die', example: 'die Bahn' }, [
    ['___ Bus ist da', 'left', 'автобус — der Bus'],
    ['___ Bahn ist da', 'right', 'поезд — die Bahn'],
    ['Das ist ___ Schlüssel', 'left', 'ключ — der Schlüssel'],
    ['Das ist ___ Tasche', 'right', 'сумка — die Tasche'],
    ['___ Tisch ist frei', 'left', 'стол — der Tisch'],
    ['___ Lampe ist kaputt', 'right', 'лампа — die Lampe'],
    ['Dort ist ___ Aufzug', 'left', 'лифт — der Aufzug'],
    ['Dort ist ___ Treppe', 'right', 'лестница — die Treppe'],
  ]),
  3: d(3, { title: 'Ich', example: 'wohne, lerne' }, { title: 'Du', example: 'wohnst, lernst' }, [
    ['___ wohne hier', 'left', 'wohne на -e — это про себя'],
    ['___ lernst Deutsch', 'right', 'lernst на -st — это про «ты»'],
    ['___ kaufe Brot', 'left', 'kaufe на -e — это про себя'],
    ['___ hörst Radio', 'right', 'hörst на -st — это про «ты»'],
    ['___ warte hier', 'left', 'warte на -e — это про себя'],
    ['___ bezahlst das Ticket', 'right', 'bezahlst на -st — это про «ты»'],
    ['___ koche heute', 'left', 'koche на -e — это про себя'],
    ['___ suchst die Tasche', 'right', 'suchst на -st — это про «ты»'],
  ]),
  4: d(4, { title: 'Am', example: 'день недели, часть дня' }, { title: 'Um', example: 'время на часах' }, [
    ['___ Montag arbeite ich', 'left', 'Montag — день недели, значит am'],
    ['___ acht beginnt der Kurs', 'right', 'acht — время на часах, значит um'],
    ['___ Freitag arbeitet Tom', 'left', 'Freitag — день недели, значит am'],
    ['___ zehn öffnet der Laden', 'right', 'zehn — время на часах, значит um'],
    ['___ Sonntag kochen wir', 'left', 'Sonntag — день недели, значит am'],
    ['___ sieben kommt der Bus', 'right', 'sieben — время на часах, значит um'],
    ['___ Abend lesen wir', 'left', 'Abend — часть дня, значит am'],
    ['___ zwölf machen wir eine Pause', 'right', 'zwölf — время на часах, значит um'],
  ]),
  5: d(5, { title: 'du', example: 'на «ты»' }, { title: 'Sie', example: 'на «вы»' }, [
    ['Wohnst ___ hier?', 'left', 'wohnst на -st — так спрашивают на «ты»'],
    ['Wohnen ___ hier?', 'right', 'wohnen на -en — так спрашивают на «вы»'],
    ['Lernst ___ Deutsch?', 'left', 'lernst на -st — так спрашивают на «ты»'],
    ['Lernen ___ Deutsch?', 'right', 'lernen на -en — так спрашивают на «вы»'],
    ['Hast ___ das Ticket?', 'left', 'hast — так спрашивают на «ты»'],
    ['Haben ___ Zeit?', 'right', 'haben — так спрашивают на «вы»'],
    ['Arbeitest ___ morgen?', 'left', 'arbeitest на -st — так спрашивают на «ты»'],
    ['Brauchen ___ Hilfe?', 'right', 'brauchen на -en — так спрашивают на «вы»'],
  ]),
  6: d(6, { title: 'Про место', example: 'Wo…?  Woher…?  Wohin…?' }, { title: 'Про время', example: 'Wann…?  Wie lange…?' }, [
    ['Wo ist die Kasse?', 'left', 'wo — «где»'],
    ['Wann kommt der Bus?', 'right', 'wann — «когда»'],
    ['Woher kommst du?', 'left', 'woher — «откуда»'],
    ['Wie lange dauert die Fahrt?', 'right', 'wie lange — «как долго»'],
    ['Wohin fahrt ihr?', 'left', 'wohin — «куда»'],
    ['Wie spät ist es?', 'right', 'wie spät — «который час»'],
    ['Wo wohnst du?', 'left', 'wo — «где»'],
    ['Wann schließt das Büro?', 'right', 'wann — «когда»'],
  ]),
  7: d(7, { title: 'einen', example: 'der Stift' }, { title: 'eine', example: 'die Tasche' }, [
    ['Ich habe ___ Schlüssel', 'left', 'ключ — der Schlüssel, поэтому einen'],
    ['Wir haben ___ Tasche', 'right', 'сумка — die Tasche, поэтому eine'],
    ['Tom hat ___ Stift', 'left', 'ручка — der Stift, поэтому einen'],
    ['Du hast ___ Frage', 'right', 'вопрос — die Frage, поэтому eine'],
    ['Ich suche ___ Arzt', 'left', 'врач — der Arzt, поэтому einen'],
    ['Du suchst ___ Apotheke', 'right', 'аптека — die Apotheke, поэтому eine'],
    ['Ich bestelle ___ Tee', 'left', 'чай — der Tee, поэтому einen'],
    ['Du bestellst ___ Suppe', 'right', 'суп — die Suppe, поэтому eine'],
  ]),
  8: d(8, { title: 'nicht', example: 'nicht müde, nicht hier' }, { title: 'kein', example: 'kein Handy, kein Taxi' }, [
    ['Ich bin ___ müde', 'left', 'müde — «не устал» говорят с nicht'],
    ['Anna hat ___ Handy', 'right', 'Handy — «нет телефона» говорят с kein'],
    ['Die Tür ist ___ zu', 'left', 'zu — «не закрыта» говорят с nicht'],
    ['Wir brauchen ___ Taxi', 'right', 'Taxi — «не нужно такси» говорят с kein'],
    ['Ich wohne ___ hier', 'left', 'hier — «не здесь» говорят с nicht'],
    ['Das ist ___ Hotel', 'right', 'Hotel — «не гостиница» говорят с kein'],
    ['Tom ist ___ im Büro', 'left', 'im Büro — «не в офисе» говорят с nicht'],
    ['Die Küche hat ___ Fenster', 'right', 'Fenster — «нет окна» говорят с kein'],
  ]),
};
