/**
 * Банк игры «Сортировка» — французский классический курс, уроки 1–8 (D207). Одна колода из 8 карт на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: противопоставление корзин реально есть в уроке; каждая карта подходит ровно к одной
 * корзине; текст карты — только пройденные слова. Пропуск в карте пишется `___` (уроки 1–4, 6, 7): корзины
 * названы самими словами, и карта с названием своей корзины даёт верную фразу. Пропуск нигде не стоит перед
 * словом на гласную — там было бы l’ или j’, и корзины le / la, Je / Nous не подошли бы.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { SortBin, SortDeck } from '../sort_core';
import { sortDeck, type SortCard } from './make_de_fr';

const d = (lesson: number, left: SortBin, right: SortBin, cards: readonly SortCard[]): SortDeck => sortDeck('fr', lesson, left, right, cards);

export const SORT_BANK_FR: Readonly<Record<number, SortDeck>> = {
  1: d(1, { title: 'ouvert', example: 'le magasin' }, { title: 'ouverte', example: 'la porte' }, [
    ['Le magasin est ___', 'left', 'le magasin — без -e на конце'],
    ['La porte est ___', 'right', 'la porte — с -e на конце'],
    ['Le café est ___', 'left', 'le café — без -e на конце'],
    ['La fenêtre est ___', 'right', 'la fenêtre — с -e на конце'],
    ['Le bureau est ___', 'left', 'le bureau — без -e на конце'],
    ['La gare est ___', 'right', 'la gare — с -e на конце'],
    ['Le sac est ___', 'left', 'le sac — без -e на конце'],
    ['La maison est ___', 'right', 'la maison — с -e на конце'],
  ]),
  2: d(2, { title: 'n’est pas', example: 'le café, la porte' }, { title: 'ne sont pas', example: 'les clés, les enfants' }, [
    ['La porte ___ ouverte', 'left', 'la porte — дверь одна'],
    ['Les magasins ___ ouverts', 'right', 'les magasins — магазинов несколько'],
    ['Le café ___ fermé', 'left', 'le café — кафе одно'],
    ['Les clés ___ ici', 'right', 'les clés — ключей несколько'],
    ['Le sac ___ là', 'left', 'le sac — сумка одна'],
    ['Les enfants ___ dans la salle', 'right', 'les enfants — детей несколько'],
    ['Le train ___ en retard', 'left', 'le train — поезд один'],
    ['Les billets ___ sur la table', 'right', 'les billets — билетов несколько'],
  ]),
  3: d(3, { title: 'au', example: 'au bureau' }, { title: 'à la', example: 'à la gare' }, [
    ['Paul est ___ bureau ?', 'left', 'le bureau — поэтому au'],
    ['Léa est ___ gare ?', 'right', 'la gare — поэтому à la'],
    ['Les toilettes sont ___ fond ?', 'left', 'le fond — поэтому au'],
    ['Vous êtes ___ maison ?', 'right', 'la maison — поэтому à la'],
    ['La chambre est ___ premier étage ?', 'left', 'le premier étage — поэтому au'],
    ['Est-ce que tu es ___ gare ?', 'right', 'la gare — поэтому à la'],
    ['Ils sont ___ bureau ?', 'left', 'le bureau — поэтому au'],
    ['Est-ce que le vélo est ___ maison ?', 'right', 'la maison — поэтому à la'],
  ]),
  4: d(4, { title: 'un', example: 'un billet' }, { title: 'une', example: 'une clé' }, [
    ['C’est ___ billet', 'left', 'билет — un billet'],
    ['C’est ___ clé', 'right', 'ключ — une clé'],
    ['C’est ___ plan', 'left', 'план — un plan'],
    ['C’est ___ carte', 'right', 'карта — une carte'],
    ['C’est ___ cadeau', 'left', 'подарок — un cadeau'],
    ['C’est ___ photo', 'right', 'фотография — une photo'],
    ['C’est ___ voisin', 'left', 'сосед — un voisin'],
    ['C’est ___ voisine', 'right', 'соседка — une voisine'],
  ]),
  5: d(5, { title: 'Ощущения', example: 'faim, froid' }, { title: 'Вещи', example: 'une clé, un sac' }, [
    ['J’ai faim', 'left', 'faim — голод'],
    ['J’ai une clé', 'right', 'une clé — ключ'],
    ['Elle a soif', 'left', 'soif — жажда'],
    ['Elle a un sac', 'right', 'un sac — сумка'],
    ['Nous avons froid', 'left', 'froid — холодно'],
    ['Nous avons un plan', 'right', 'un plan — план'],
    ['Ils ont sommeil', 'left', 'sommeil — хочется спать'],
    ['Ils ont un billet', 'right', 'un billet — билет'],
  ]),
  6: d(6, { title: 'le', example: 'le café' }, { title: 'la', example: 'la soupe' }, [
    ['J’aime ___ café', 'left', 'кофе — le café'],
    ['Elle aime ___ musique', 'right', 'музыка — la musique'],
    ['J’aime ___ thé', 'left', 'чай — le thé'],
    ['Vous aimez ___ soupe ?', 'right', 'суп — la soupe'],
    ['Il aime ___ cinéma', 'left', 'кино — le cinéma'],
    ['La clé est sur ___ table', 'right', 'стол — la table'],
    ['Léa aime ___ fromage', 'left', 'сыр — le fromage'],
    ['Le billet est dans ___ poche', 'right', 'карман — la poche'],
  ]),
  7: d(7, { title: 'Je', example: 'travaille, parle' }, { title: 'Nous', example: 'travaillons, parlons' }, [
    ['___ travaille ici', 'left', 'travaille на -e — это про себя'],
    ['___ travaillons ensemble', 'right', 'travaillons на -ons — это про нас'],
    ['___ parle français', 'left', 'parle на -e — это про себя'],
    ['___ parlons espagnol', 'right', 'parlons на -ons — это про нас'],
    ['___ cherche mes clés', 'left', 'cherche на -e — это про себя'],
    ['___ cherchons une adresse', 'right', 'cherchons на -ons — это про нас'],
    ['___ regarde le plan', 'left', 'regarde на -e — это про себя'],
    ['___ regardons une photo', 'right', 'regardons на -ons — это про нас'],
  ]),
  8: d(8, { title: 'Про место', example: 'Où…?' }, { title: 'Про время', example: 'Quand…?  À quelle heure…?' }, [
    ['Où est la sortie ?', 'left', 'où — «где»'],
    ['Quand est le concert ?', 'right', 'quand — «когда»'],
    ['Où habites-tu ?', 'left', 'où — «где»'],
    ['À quelle heure part le train ?', 'right', 'à quelle heure — «во сколько»'],
    ['Où sont les toilettes ?', 'left', 'où — «где»'],
    ['Quand ferme la banque ?', 'right', 'quand — «когда»'],
    ['Où travaillez-vous ?', 'left', 'où — «где»'],
    ['Combien de temps dure le trajet ?', 'right', 'combien de temps — «сколько времени»'],
  ]),
};
