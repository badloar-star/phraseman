/**
 * Банк игры «Собери диалог» — французский классический курс, уроки 3–8 (D207). 2 диалога на урок.
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
};
