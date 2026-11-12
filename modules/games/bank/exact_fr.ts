/**
 * Банк игры «Точное слово» — французский классический курс, уроки 1–20 (D207). 6 заданий на урок.
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
  9: [
    r(9, 1, '___ sac est ici', 'Mon', ['Ma', 'Mes'], 0, 'Сумка — le sac, поэтому mon.'),
    r(9, 2, 'Tu cherches ___ veste', 'ta', ['ton', 'tes'], 1, 'Куртка — la veste, поэтому ta.'),
    r(9, 3, 'Nous cherchons ___ places', 'nos', ['notre', 'nous'], 2, 'Мест несколько, поэтому nos.'),
    r(9, 4, 'Leur chambre est ___', 'libre', ['libres'], 0, 'Комната одна — libre без -s.'),
    r(9, 5, 'Où ___ vos valises ?', 'sont', ['est', 'es'], 1, 'Чемоданов несколько, значит sont.'),
    r(9, 6, '___ chambres sont libres', 'Leurs', ['Leur', 'Sa'], 2, 'Комнат несколько, поэтому leurs.'),
  ],
  10: [
    r(10, 1, 'Il y a ___ banc', 'un', ['une', 'des'], 0, 'Скамейка одна — un banc.'),
    r(10, 2, 'Il y a ___ pain', 'du', ['de', 'une'], 1, 'Хлеб — du pain.'),
    r(10, 3, 'Il n’y a pas ___ savon', 'de', ['du', 'des'], 2, 'После pas — de.'),
    r(10, 4, 'Il y a trois ___', 'chaises', ['chaise'], 0, 'Стульев три — chaises с -s на конце.'),
    r(10, 5, 'Il y a trop ___ bruit', 'de', ['du', 'des'], 1, 'После trop — de.'),
    r(10, 6, 'Il y a ___ livres sur la table', 'des', ['un', 'une'], 2, 'Книг несколько — des.'),
  ],
  11: [
    r(11, 1, 'Je vais ___ gare', 'à la', ['au', 'à le'], 0, 'Вокзал — la gare, поэтому à la gare.'),
    r(11, 2, 'Nous ___ à l’école', 'allons', ['allez', 'vont'], 1, 'С nous — allons.'),
    r(11, 3, 'Léa va ___ le médecin', 'chez', ['au', 'à'], 2, 'К врачу — chez le médecin.'),
    r(11, 4, 'Nous allons ___ France', 'en', ['au', 'à'], 0, 'Во Францию — en France.'),
    r(11, 5, 'Tu vas ___ Canada', 'au', ['en', 'à'], 1, 'В Канаду — au Canada.'),
    r(11, 6, 'Je vais au travail ___ pied', 'à', ['en', 'de'], 2, 'Пешком — à pied.'),
  ],
  12: [
    r(12, 1, 'Je prends ___ pain', 'du', ['de', 'de la'], 0, 'Хлеб — du pain.'),
    r(12, 2, 'Elles ___ de la salade', 'prennent', ['prend', 'prenons'], 1, 'С elles — prennent.'),
    r(12, 3, 'Je ne prends pas ___ lait', 'de', ['du', 'des'], 2, 'После pas — de.'),
    r(12, 4, 'Nous ___ du jus de pomme', 'buvons', ['bois', 'boit'], 0, 'С nous — buvons.'),
    r(12, 5, 'Je voudrais un peu ___ soupe', 'de', ['du', 'des'], 1, 'После un peu — de.'),
    r(12, 6, 'Il achète un kilo ___ pommes', 'de', ['du', 'la'], 2, 'После un kilo — de.'),
  ],
  13: [
    r(13, 1, 'La voiture est ___', 'neuve', ['neuf', 'neuves'], 0, 'Машина — la voiture, поэтому neuve.'),
    r(13, 2, 'Les vélos sont ___', 'neufs', ['neuf', 'neuve'], 1, 'Велосипедов несколько — neufs.'),
    r(13, 3, 'Les boîtes sont ___', 'pleines', ['pleine', 'vide'], 2, 'Коробок несколько — pleines.'),
    r(13, 4, 'Le verre est ___', 'vide', ['vides', 'pleines'], 0, 'Стакан один — vide.'),
    r(13, 5, 'Je cherche une veste ___', 'noire', ['noir', 'noires'], 1, 'Куртка — la veste, поэтому noire.'),
    r(13, 6, 'C’est une ___ photo', 'vieille', ['vieil', 'petit'], 2, 'Фотография — la photo, поэтому vieille.'),
  ],
  14: [
    r(14, 1, 'Je ___ partir', 'dois', ['doit', 'devons'], 0, 'С je — dois.'),
    r(14, 2, 'Vous ___ signer ici', 'devez', ['dois', 'doivent'], 1, 'С vous — devez.'),
    r(14, 3, 'Ils ___ changer de place', 'veulent', ['veut', 'voulons'], 2, 'С ils — veulent.'),
    r(14, 4, 'Tu ___ t’asseoir ?', 'veux', ['veut', 'voulez'], 0, 'С tu — veux.'),
    r(14, 5, 'Nous ne ___ pas rester longtemps', 'pouvons', ['peuvent', 'peux'], 1, 'С nous — pouvons.'),
    r(14, 6, 'Elle ne ___ pas jeter le pain', 'veut', ['veux', 'voulons'], 2, 'С elle — veut.'),
  ],
  15: [
    r(15, 1, 'Tu ___ prendre le bus', 'vas', ['va', 'vais'], 0, 'С tu — vas.'),
    r(15, 2, 'Nous ___ inviter nos voisins', 'allons', ['allez', 'vont'], 1, 'С nous — allons.'),
    r(15, 3, 'Ils ___ livrer le colis', 'vont', ['va', 'allons'], 2, 'С ils — vont.'),
    r(15, 4, 'Vous ___ changer de train', 'allez', ['vont', 'vas'], 0, 'С vous — allez.'),
    r(15, 5, 'Elle ___ chercher ses lunettes', 'va', ['vas', 'vont'], 1, 'С elle — va.'),
    r(15, 6, 'On ___ passer à la banque', 'va', ['vais', 'allons'], 2, 'С on — va.'),
  ],
  16: [
    r(16, 1, 'Ferme ___ porte !', 'la', ['le', 'les'], 0, 'Дверь — la porte.'),
    r(16, 2, 'Prends ___ veste !', 'ta', ['ton', 'tes'], 1, 'Куртка — la veste, поэтому ta.'),
    r(16, 3, 'Range ___ chaussures !', 'tes', ['ta', 'ton'], 2, 'Туфель несколько — tes.'),
    r(16, 4, 'Montrez ___ billet, s’il vous plaît', 'votre', ['vos', 'ta'], 0, 'Билет один — votre billet.'),
    r(16, 5, 'Appuyez sur le bouton ___', 'vert', ['verte', 'vertes'], 1, 'Кнопка — le bouton, поэтому vert.'),
    r(16, 6, 'N’oublie pas ___ parapluie !', 'ton', ['ta', 'tes'], 2, 'Зонт — le parapluie, поэтому ton.'),
  ],
  17: [
    r(17, 1, 'Je me ___', 'lève', ['lèves', 'lèvent'], 0, 'С je — lève.'),
    r(17, 2, 'Nous nous ___', 'levons', ['levez', 'lève'], 1, 'С nous — levons.'),
    r(17, 3, 'Vous vous ___ souvent la nuit ?', 'réveillez', ['réveillons', 'réveille'], 2, 'С vous — réveillez.'),
    r(17, 4, 'Ils se ___', 'lèvent', ['lève', 'levez'], 0, 'С ils — lèvent.'),
    r(17, 5, 'Nous nous ___ tôt', 'couchons', ['couche', 'levez'], 1, 'С nous — couchons.'),
    r(17, 6, 'Tu te ___ le soir ?', 'douches', ['douche', 'levez'], 2, 'С tu — douches.'),
  ],
  18: [
    r(18, 1, 'Tu ___ réservé une chambre', 'as', ['a', 'avez'], 0, 'С tu — as.'),
    r(18, 2, 'Nous ___ commandé le dessert', 'avons', ['avez', 'ont'], 1, 'С nous — avons.'),
    r(18, 3, 'Vous ___ gardé le reçu', 'avez', ['avons', 'as'], 2, 'С vous — avez.'),
    r(18, 4, 'J’ai ___ le train', 'pris', ['prendre', 'prends'], 0, 'После ai — pris.'),
    r(18, 5, 'Léa a ___ le message', 'lu', ['lire', 'prendre'], 1, 'После a — lu.'),
    r(18, 6, 'Elle a ___ une copie', 'fait', ['faisons', 'prendre'], 2, 'После a — fait.'),
  ],
  19: [
    r(19, 1, 'Paul est ___', 'parti', ['partie', 'partis'], 0, 'Поль один — parti.'),
    r(19, 2, 'Elles sont ___', 'parties', ['partie', 'partis'], 1, 'Их несколько, все женщины — parties.'),
    r(19, 3, 'Mes parents sont ___ au marché', 'allés', ['allé', 'allée'], 2, 'Родителей несколько — allés.'),
    r(19, 4, 'Léa ___ entrée dans la salle', 'est', ['a', 'sont'], 0, 'Вошла — est entrée.'),
    r(19, 5, 'La clé est ___ sous la table', 'tombée', ['tombé', 'tombées'], 1, 'Ключ — la clé, поэтому tombée.'),
    r(19, 6, 'Les invités sont ___ ici', 'restés', ['restées', 'reste'], 2, 'Гостей несколько — restés.'),
  ],
  20: [
    r(20, 1, 'Tu ___ ici', 'habitais', ['habitait', 'habitions'], 0, 'С tu — habitais.'),
    r(20, 2, 'Vous ___ en ville', 'habitiez', ['habitions', 'habitaient'], 1, 'С vous — habitiez.'),
    r(20, 3, 'Nous ___ voisins', 'étions', ['était', 'étaient'], 2, 'С nous — étions.'),
    r(20, 4, 'Le jardin ___ grand', 'était', ['étions', 'étaient'], 0, 'Сад один — était.'),
    r(20, 5, 'Nous ___ beaucoup de temps', 'avions', ['avait', 'avaient'], 1, 'С nous — avions.'),
    r(20, 6, 'Elle n’avait pas ___ vélo', 'de', ['du', 'des'], 2, 'После pas — de.'),
  ],
};
