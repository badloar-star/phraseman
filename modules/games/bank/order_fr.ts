/**
 * Банк игры «Собери диалог» — французский классический курс, уроки 3–12 (D207). 2 диалога на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: четыре реплики из пройденных слов, порядок один. Его держат слова-заменители
 * (il, elle, ils, elles): первая реплика называет человека или вещь, следующие говорят о них «он / она» и
 * без первой непонятны; каждый ответ повторяет слова своего вопроса, поэтому пары не перепутать.
 * Уроков 1–2 в банке нет: в них одни утверждения без вопросов, однозначный порядок не собрать.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { OrderTask } from '../dialogue_core';
import { orderTask } from './make_de_fr';

const o = (lesson: number, n: number, lines: readonly string[]): OrderTask => orderTask('fr', lesson, n, lines);

export const ORDER_BANK_FR: Readonly<Record<number, readonly OrderTask[]>> = {
  3: [
    o(3, 1, ['Léa est à la gare ?', 'Elle n’est pas à la gare.', 'Elle est à la maison ?', 'Elle est encore au bureau.']),
    o(3, 2, ['Les enfants sont avec vous ?', 'Les enfants sont dehors.', 'Ils sont prêts ?', 'Ils ne sont pas encore prêts.']),
  ],
  4: [
    o(4, 1, ['Le train est sur ce quai ?', 'Ce n’est pas le bon quai.', 'Le bon quai est loin ?', 'Le bon quai est en face.']),
    o(4, 2, ['Ce sont vos bagages ?', 'Ce ne sont pas mes bagages.', 'Ce sont les bagages de Léa ?', 'Ce sont les bagages de mon frère.']),
  ],
  5: [
    o(5, 1, ['Léa a son billet de retour ?', 'Elle a son billet.', 'Elle a ses lunettes ?', 'Ses lunettes sont dans le sac.']),
    o(5, 2, ['Paul a peur ?', 'Il a mal à la tête.', 'Il a besoin d’aide ?', 'Il a besoin de repos.']),
  ],
  6: [
    o(6, 1, ['Vous aimez la soupe ?', 'J’aime la soupe.', 'Elle est chaude ?', 'Elle est froide.']),
    o(6, 2, ['Le portefeuille est dans le tiroir ?', 'Le tiroir est vide.', 'Il est dans le sac ?', 'Il est dans la poche.']),
  ],
  7: [
    o(7, 1, ['Léa travaille ici ?', 'Elle travaille à Lyon.', 'Elle habite à Lyon ?', 'Elle habite à Lille.']),
    o(7, 2, ['Tu cherches ton sac ?', 'Je cherche mes clés.', 'Elles sont dans ton sac ?', 'Mon sac est à la maison.']),
  ],
  8: [
    o(8, 1, ['Qui est à la porte ?', 'C’est mon frère.', 'Il habite ici ?', 'Il habite au-dessus.']),
    o(8, 2, ['Où est Paul ?', 'Il est avec Léa.', 'Ils sont au marché ?', 'Ils sont au concert.']),
  ],
  9: [
    o(9, 1, ['Où est ton portefeuille ?', 'Il est dans le sac.', 'Le sac est là ?', 'Le sac est à la maison.']),
    o(9, 2, ['Où sont vos valises ?', 'Elles sont dans le train.', 'Le train est à quai ?', 'Notre train est à quai.']),
  ],
  10: [
    o(10, 1, ['Est-ce qu’il y a une chambre libre ?', 'Il y a une chambre au fond.', 'Elle est propre ?', 'La chambre est propre.']),
    o(10, 2, ['Il y a un parc près de la gare ?', 'Il y a un parc juste en face.', 'Il y a des jeux dans le parc ?', 'Dans le parc, il y a des jeux pour enfants.']),
  ],
  11: [
    o(11, 1, ['Où allez-vous après le cours ?', 'Nous allons au cinéma.', 'Vous allez au cinéma à pied ?', 'Nous allons au cinéma en bus.']),
    o(11, 2, ['Est-ce que tu vas à la poste ?', 'Je vais à la pharmacie.', 'La pharmacie est loin ?', 'Elle est au bout de la rue.']),
  ],
  12: [
    o(12, 1, ['Vous buvez du café ?', 'Je ne bois pas de café.', 'Et du thé ?', 'Je bois du thé.']),
    o(12, 2, ['Il reste du riz ?', 'Il ne reste pas de riz.', 'Et des pâtes ?', 'Il reste des pâtes.']),
  ],
  13: [
    o(13, 1, ['Le sac est lourd ?', 'Le sac est léger.', 'Et la valise ?', 'La valise est lourde.']),
    o(13, 2, ['Le pull est vert ?', 'Le pull est gris.', 'Et la jupe ?', 'La jupe est verte.']),
  ],
  14: [
    o(14, 1, ['Tu peux venir ?', 'Je peux venir.', 'Et Paul ?', 'Paul ne peut pas venir.']),
    o(14, 2, ['Vous voulez rester ?', 'Nous devons partir.', 'Et Paul ?', 'Paul veut rester.']),
  ],
  15: [
    o(15, 1, ['Tu vas travailler demain ?', 'Je vais travailler demain.', 'Et samedi ?', 'Samedi, je vais visiter le marché.']),
    o(15, 2, ['Vous allez prendre un dessert ?', 'Je vais prendre un café.', 'Et Léa ?', 'Léa va prendre un dessert.']),
  ],
  16: [
    o(16, 1, ['Je ferme la porte ?', 'Ferme la porte.', 'Et la fenêtre ?', 'Ouvre la fenêtre.']),
    o(16, 2, ['Je prends ma veste ?', 'Prends ta veste.', 'Et le parapluie ?', 'Prends le parapluie.']),
  ],
  17: [
    o(17, 1, ['Tu te lèves tôt ?', 'Je me lève à sept heures.', 'Et Léa ?', 'Elle se lève avant moi.']),
    o(17, 2, ['Tu te douches le soir ?', 'Je me douche le matin.', 'Et Paul ?', 'Il se douche après le sport.']),
  ],
  18: [
    o(18, 1, ['Tu as pris le train ?', 'J’ai pris le train.', 'Et Léa ?', 'Léa a pris le bus.']),
    o(18, 2, ['Vous avez fermé le magasin ?', 'Nous avons fermé le magasin.', 'Et le garage ?', 'Nous avons fermé le garage.']),
  ],
  19: [
    o(19, 1, ['Paul est arrivé ?', 'Paul est arrivé ce matin.', 'Et Léa ?', 'Léa est partie.']),
    o(19, 2, ['Où est allé Paul ?', 'Paul est allé à la gare.', 'Et Léa ?', 'Léa est allée à la banque.']),
  ],
  20: [
    o(20, 1, ['Vous habitiez en ville ?', 'Nous habitions à la campagne.', 'Et tes parents ?', 'Ils habitaient près du port.']),
    o(20, 2, ['Tu travaillais le samedi ?', 'Je travaillais le samedi.', 'Et le dimanche ?', 'Le dimanche, nous mangions ensemble.']),
  ],
};
