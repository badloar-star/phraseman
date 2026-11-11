/**
 * Банк игры «Точное слово» — французский классический курс, уроки 1–8 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: фраза с верным вариантом — фраза урока (или только из пройденных слов); каждый неверный
 * вариант даёт грамматически неверную фразу (правило владельца о неверных вариантах); варианты — только
 * слова, которые ученик уже встречал. Пропуск не стоит перед словом на гласную и после j’, n’, l’, d’ —
 * там выбор слова менял бы написание соседнего.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { gapRound } from './make_de_fr';

const r = (lesson: number, n: number, gapped: string, correct: string, wrong: readonly string[], at: number, note: string): QuizRound =>
  gapRound('fr', lesson, n, gapped, correct, wrong, at, note);

export const EXACT_BANK_FR: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    r(1, 1, 'Je ___ ici', 'suis', ['es', 'est'], 0, 'С je всегда идёт suis.'),
    r(1, 2, 'Nous ___ à la gare', 'sommes', ['sont', 'êtes'], 1, 'С nous идёт sommes.'),
    r(1, 3, 'Ils ___ là', 'sont', ['est', 'sommes'], 2, 'С ils идёт sont.'),
    r(1, 4, 'Elle est ___', 'prête', ['prêt', 'prêts'], 0, 'Про неё — prête, с -e на конце.'),
    r(1, 5, 'Je suis ___ bureau', 'au', ['à la', 'à'], 1, '«В офисе» — au bureau.'),
    r(1, 6, 'Les magasins sont ___', 'fermés', ['fermé', 'fermée'], 2, 'Магазинов несколько — fermés, с -s на конце.'),
  ],
  2: [
    r(2, 1, 'Je ne suis ___ prêt', 'pas', ['ne'], 1, '«Не» — это ne перед словом и pas после него.'),
    r(2, 2, 'Elle ___ pas là', 'n’est', ['n’es', 'ne sont'], 0, 'С elle пишут n’est.'),
    r(2, 3, 'Nous ne ___ pas à la gare', 'sommes', ['sont', 'êtes'], 2, 'С nous идёт sommes.'),
    r(2, 4, 'Vous n’êtes pas ___ retard', 'en', ['à', 'au'], 0, '«С опозданием» — en retard.'),
    r(2, 5, 'Le ticket n’est pas ___ le sac', 'dans', ['en', 'au'], 1, '«В сумке» — dans le sac.'),
    r(2, 6, 'La fenêtre n’est pas ___', 'fermée', ['fermé', 'fermés'], 2, 'Окно — la fenêtre, поэтому fermée с -e.'),
  ],
  3: [
    r(3, 1, 'Est-ce que tu ___ à la gare ?', 'es', ['est', 'êtes'], 0, 'С tu пишут es.'),
    r(3, 2, 'Est-ce que les enfants ___ prêts ?', 'sont', ['est', 'êtes'], 1, 'Детей несколько, значит sont.'),
    r(3, 3, 'La sortie est ___ gauche ?', 'à', ['au', 'en'], 2, '«Слева» — à gauche.'),
    r(3, 4, 'Le quai est ___ face ?', 'en', ['à', 'au'], 0, '«Напротив» — en face.'),
    r(3, 5, 'Est-ce que Léa est avec ___ ?', 'toi', ['tu', 'je'], 1, 'После avec говорят toi.'),
    r(3, 6, 'Les deux portes sont ___ ?', 'fermées', ['fermée', 'fermés'], 2, 'Двери — их несколько, и это les portes: fermées.'),
  ],
  4: [
    r(4, 1, '___ mon frère', 'C’est', ['Ce sont'], 0, 'Брат один, значит c’est.'),
    r(4, 2, 'Ce sont ___ clés', 'mes', ['mon', 'ma'], 1, 'Ключей несколько, значит mes.'),
    r(4, 3, 'C’est ___ sœur', 'ma', ['mon', 'mes'], 2, 'Сестра — ma sœur.'),
    r(4, 4, 'C’est ___ père', 'mon', ['ma', 'mes'], 0, 'Отец — mon père.'),
    r(4, 5, 'C’est ___ adresse', 'une', ['un', 'des'], 1, 'Адрес — une adresse.'),
    r(4, 6, 'Ce sont ___ voisins', 'des', ['un', 'une'], 2, 'Соседей несколько, значит des.'),
  ],
  5: [
    r(5, 1, 'Tu ___ une clé', 'as', ['a', 'ont'], 0, 'С tu пишут as.'),
    r(5, 2, 'Nous ___ froid', 'avons', ['sommes', 'ont'], 1, '«Нам холодно» — nous avons froid.'),
    r(5, 3, 'Ils ___ sommeil', 'ont', ['sont', 'a'], 2, '«Хотят спать» — ils ont sommeil.'),
    r(5, 4, 'J’ai mal ___ dos', 'au', ['à la', 'à'], 0, '«Болит спина» — mal au dos.'),
    r(5, 5, 'Tu as besoin ___ pause', 'd’une', ['une', 'un'], 1, '«Нужен перерыв» — besoin d’une pause.'),
    r(5, 6, 'Elle a ___ lunettes', 'ses', ['son', 'un'], 2, 'Очки — их несколько, значит ses.'),
  ],
  6: [
    r(6, 1, 'J’aime ___ thé', 'le', ['la', 'les'], 0, 'Чай — le thé.'),
    r(6, 2, 'Nous ___ les livres', 'aimons', ['aime', 'aiment'], 1, 'С nous — aimons.'),
    r(6, 3, 'Vous ___ la soupe ?', 'aimez', ['aimes', 'aiment'], 2, 'С vous — aimez.'),
    r(6, 4, 'L’eau est ___', 'froide', ['froid', 'chaud'], 0, 'Вода — она, поэтому froide с -e на конце.'),
    r(6, 5, 'La réception est ___ bas', 'en', ['à', 'au'], 1, '«Внизу» — en bas.'),
    r(6, 6, 'J’aime l’odeur ___ pain', 'du', ['de la', 'de le'], 2, 'Хлеб — le pain, а de и le вместе дают du.'),
  ],
  7: [
    r(7, 1, 'Tu ___ français', 'parles', ['parle', 'parlons'], 0, 'С tu пишут parles.'),
    r(7, 2, 'Nous ___ à la campagne', 'habitons', ['habite', 'habitez'], 1, 'С nous — habitons.'),
    r(7, 3, 'Ils ___ une place', 'cherchent', ['cherche', 'cherchons'], 2, 'С ils пишут cherchent.'),
    r(7, 4, 'Tu habites ___ Lille', 'à', ['en', 'au'], 0, 'Перед названием города — à.'),
    r(7, 5, 'Vous habitez ___ ville', 'en', ['à', 'au'], 1, '«В городе» — en ville.'),
    r(7, 6, 'Paul prépare ___ café', 'du', ['de', 'de la'], 2, 'Кофе — le café, «немного кофе» — du café.'),
  ],
  8: [
    r(8, 1, '___ coûte le billet ?', 'Combien', ['Quel', 'Où'], 0, 'Про цену спрашивают combien.'),
    r(8, 2, 'À ___ heure ouvre le musée ?', 'quelle', ['quel', 'qui'], 1, 'С heure пишут quelle.'),
    r(8, 3, '___ bus prends-tu ?', 'Quel', ['Quelle', 'Qui'], 2, 'Автобус — le bus, поэтому quel.'),
    r(8, 4, 'Combien ___ nuits restez-vous ?', 'de', ['des', 'du'], 0, 'После combien идёт de.'),
    r(8, 5, 'Où ___ mes lunettes ?', 'sont', ['est', 'es'], 1, 'Очки — их несколько, значит sont.'),
    r(8, 6, '___ s’appelle cette rue ?', 'Comment', ['Combien', 'Quel'], 2, 'Про название спрашивают comment.'),
  ],
};
