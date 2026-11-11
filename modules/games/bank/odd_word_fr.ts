/**
 * Банк игры «Лишнее слово» — французский классический курс, уроки 1–8 (D207). 8 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: без лишнего слова остаётся фраза урока (или фраза только из пройденных слов); с лишним
 * словом фраза неверна; убрав любое ДРУГОЕ слово, верную фразу не получить. Особенности языка: лишнее
 * слово нигде не меняет слитное написание (l’, n’, d’, j’) — фраза без него пишется ровно так, как на экране,
 * гадать про апостроф не нужно; нет заданий вида «Je [suis] travaille ici» (без travaille остаётся верное
 * «Je suis ici»). Часть ошибок слышна только на письме (tu a / tu as, seul / seule) — см. пакет задачи.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { OddWordTask } from '../odd_word_core';
import { oddTask } from './make_de_fr';

const t = (lesson: number, n: number, marked: string, translation: string, why: string): OddWordTask =>
  oddTask('fr', lesson, n, marked, translation, why);

export const ODD_WORD_BANK_FR: Readonly<Record<number, readonly OddWordTask[]>> = {
  1: [
    t(1, 1, 'Je suis [es] ici', 'Я здесь', 'С je всегда идёт suis.'),
    t(1, 2, 'Tu [suis] es là', 'Ты там', 'С tu идёт es, а не suis.'),
    t(1, 3, 'Nous [sont] sommes ici', 'Мы здесь', 'С nous идёт sommes, а не sont.'),
    t(1, 4, 'Vous êtes [es] à la gare', 'Вы на вокзале', 'С vous идёт êtes, а не es.'),
    t(1, 5, 'Les clés [est] sont là', 'Ключи там', 'Ключей несколько, значит sont.'),
    t(1, 6, 'Je suis [à] au bureau', 'Я в офисе', '«В офисе» — au bureau.'),
    t(1, 7, 'Léa est à [au] la gare', 'Леа на вокзале', '«На вокзале» — à la gare.'),
    t(1, 8, 'La [le] porte est ouverte', 'Дверь открыта', 'Дверь — la porte, le тут лишнее.'),
  ],
  2: [
    t(2, 1, 'Je ne suis [es] pas ici', 'Меня здесь нет', 'С je идёт suis, а не es.'),
    t(2, 2, 'Elle n’est pas [à] là', 'Её там нет', 'Là обходится без à.'),
    t(2, 3, 'Léa n’est pas [seul] seule', 'Леа не одна', 'Леа — она, поэтому seule с -e на конце.'),
    t(2, 4, 'Nous ne [sont] sommes pas prêts', 'Мы не готовы', 'С nous идёт sommes, а не sont.'),
    t(2, 5, 'Le ticket n’est pas dans [la] le sac', 'Билета нет в сумке', 'Сумка — le sac, la тут лишнее.'),
    t(2, 6, 'Vous n’êtes pas [à] en retard', 'Вы не опаздываете', '«С опозданием» — en retard.'),
    t(2, 7, 'Les billets ne sont pas sur [le] la table', 'Билетов нет на столе', 'Стол — la table, le тут лишнее.'),
    t(2, 8, 'La gare n’est pas près [de] du musée', 'Вокзал не рядом с музеем', '«Рядом с музеем» — près du musée.'),
  ],
  3: [
    t(3, 1, 'Est-ce que tu [est] es à la gare ?', 'Ты на вокзале?', 'С tu пишут es, а не est.'),
    t(3, 2, 'Est-ce que les clés [est] sont ici ?', 'Ключи здесь?', 'Ключей несколько, значит sont.'),
    t(3, 3, 'Le quai est [à] en face ?', 'Перрон напротив?', '«Напротив» — en face.'),
    t(3, 4, 'Est-ce que Léa est avec [tu] toi ?', 'Леа с тобой?', 'После avec говорят toi.'),
    t(3, 5, 'Vous [es] êtes à la maison ?', 'Вы дома?', 'С vous идёт êtes, а не es.'),
    t(3, 6, 'La chambre est [à] au premier étage ?', 'Комната на втором этаже?', '«На этаже» — au premier étage.'),
    t(3, 7, 'Est-ce que le sac est dans [la] le bus ?', 'Сумка в автобусе?', 'Автобус — le bus, la тут лишнее.'),
    t(3, 8, 'Le parking est à [au] droite ?', 'Парковка справа?', '«Справа» — à droite.'),
  ],
  4: [
    t(4, 1, 'C’est [un] une amie', 'Это подруга', 'Подруга — une amie.'),
    t(4, 2, 'C’est [une] un billet', 'Это билет', 'Билет — un billet.'),
    t(4, 3, 'C’est [mon] ma sœur', 'Это моя сестра', 'Сестра — ma sœur.'),
    t(4, 4, 'C’est [ma] mon père', 'Это мой отец', 'Отец — mon père.'),
    t(4, 5, 'Ce sont [mon] mes amis', 'Это мои друзья', 'Друзей несколько, значит mes.'),
    t(4, 6, 'C’est le [la] dernier bus', 'Это последний автобус', 'Автобус — le bus, la тут лишнее.'),
    t(4, 7, 'Ce n’est pas [ma] mon sac', 'Это не моя сумка', 'Сумка — mon sac.'),
    t(4, 8, 'Ce sont [le] les clés du magasin', 'Это ключи от магазина', 'Ключей несколько, значит les.'),
  ],
  5: [
    t(5, 1, 'Tu [a] as une clé', 'У тебя есть ключ', 'С tu пишут as, а не a.'),
    t(5, 2, 'Nous [ont] avons un plan', 'У нас есть план', 'С nous идёт avons, а не ont.'),
    t(5, 3, 'Les enfants ont [une] faim', 'Дети голодны', 'Faim обходится без une.'),
    t(5, 4, 'Elle a [un] deux enfants', 'У неё двое детей', 'Детей двое, un говорят только про одного.'),
    t(5, 5, 'J’ai mal [à] au dos', 'У меня болит спина', '«Болит спина» — mal au dos.'),
    t(5, 6, 'Tu as mal à [au] la tête', 'У тебя болит голова', '«Болит голова» — mal à la tête.'),
    t(5, 7, 'J’ai [suis] vingt ans', 'Мне двадцать лет', 'Про возраст говорят j’ai, suis тут лишнее.'),
    t(5, 8, 'Léa a [un] une carte', 'У Леа есть карта', 'Карта — une carte.'),
  ],
  6: [
    t(6, 1, 'La clé est sur [le] la table', 'Ключ лежит на столе', 'Стол — la table, le тут лишнее.'),
    t(6, 2, 'Les lunettes [est] sont sur le lit', 'Очки лежат на кровати', 'Очки — их несколько, значит sont.'),
    t(6, 3, 'Léa aime [la] le fromage', 'Леа любит сыр', 'Сыр — le fromage, la тут лишнее.'),
    t(6, 4, 'Nous [aime] aimons les livres', 'Мы любим книги', 'С nous — aimons.'),
    t(6, 5, 'La réception est [à] en bas', 'Стойка регистрации внизу', '«Внизу» — en bas.'),
    t(6, 6, 'La lampe est près [de] du lit', 'Лампа рядом с кроватью', '«Рядом с кроватью» — près du lit.'),
    t(6, 7, 'Les clés de [le] la voiture sont ici', 'Ключи от машины здесь', 'Машина — la voiture, le тут лишнее.'),
    t(6, 8, 'La soupe est [chaud] chaude', 'Суп горячий', 'Суп — la soupe, поэтому chaude с -e на конце.'),
  ],
  7: [
    t(7, 1, 'Tu [travaille] travailles ici', 'Ты работаешь здесь', 'С tu пишут travailles, с -s на конце.'),
    t(7, 2, 'Nous [travaillez] travaillons ensemble', 'Мы работаем вместе', 'С nous — travaillons.'),
    t(7, 3, 'Tu habites [en] à Lille', 'Ты живёшь в Лилле', 'Перед названием города — à.'),
    t(7, 4, 'Vous habitez [à] en ville', 'Вы живёте в городе', '«В городе» — en ville.'),
    t(7, 5, 'Je cherche [mon] mes clés', 'Я ищу свои ключи', 'Ключей несколько, значит mes.'),
    t(7, 6, 'Tu cherches [ta] ton sac', 'Ты ищешь свою сумку', 'Сумка — ton sac.'),
    t(7, 7, 'Je regarde [à] le plan', 'Я смотрю на карту', 'После regarde сразу идёт то, на что смотрят.'),
    t(7, 8, 'Ils [regarde] regardent le match', 'Они смотрят матч', 'С ils пишут regardent.'),
  ],
  8: [
    t(8, 1, 'Où [est] sont les clés ?', 'Где ключи?', 'Ключей несколько, значит sont.'),
    t(8, 2, 'À [quel] quelle heure part le train ?', 'Во сколько отправляется поезд?', 'С heure пишут quelle.'),
    t(8, 3, 'Combien [coûte] coûtent ces chaussures ?', 'Сколько стоят эти туфли?', 'Туфель несколько, значит coûtent.'),
    t(8, 4, 'Combien [de] coûte le billet ?', 'Сколько стоит билет?', 'Про цену — combien coûte, без de.'),
    t(8, 5, 'Où [tu] habites-tu ?', 'Где ты живёшь?', 'Tu уже стоит после habites.'),
    t(8, 6, 'Comment [est] allez-vous ?', 'Как у вас дела?', 'Allez справляется само, est тут не нужно.'),
    t(8, 7, 'Avec [que] qui travailles-tu ?', 'С кем ты работаешь?', '«С кем» — avec qui.'),
    t(8, 8, 'Pourquoi [es] êtes-vous en retard ?', 'Почему вы опаздываете?', 'С vous идёт êtes, а не es.'),
  ],
};
