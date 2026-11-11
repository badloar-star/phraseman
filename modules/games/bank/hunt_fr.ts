/**
 * Банк игры «Охота на ошибку» — французский классический курс, уроки 1–8 (D207). 2 мини-диалога на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: три реплики, после исправления каждая — фраза урока или фраза из пройденных слов;
 * неверное слово ровно одно и оно однозначно неверно; слово-обманка стоит в ДРУГОЙ реплике и само верно.
 * Ошибка никогда не стоит в слове с апострофом и перед словом на гласную — исправление не меняет соседей.
 * Разметка: `{es>est}` — ошибка и её замена, `*sont` — слово-обманка.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { HuntTask } from '../dialogue_core';
import { huntTask } from './make_de_fr';

const h = (lesson: number, n: number, lines: readonly string[], why: string): HuntTask => huntTask('fr', lesson, n, lines, why);

export const HUNT_BANK_FR: Readonly<Record<number, readonly HuntTask[]>> = {
  1: [
    h(1, 1, ['Je suis à la gare.', 'Paul {es>est} au bureau.', 'Les enfants *sont dehors.'], 'Про Поля пишут est.'),
    h(1, 2, ['*La porte est ouverte.', '{La>Le} magasin est fermé.', 'Les clés sont là.'], 'Магазин — le magasin.'),
  ],
  2: [
    h(2, 1, ['Le café *n’est pas fermé.', 'Les magasins ne {est>sont} pas ouverts.', 'Le bus n’est pas loin.'], 'Магазинов несколько, значит sont.'),
    h(2, 2, ['Je ne *suis pas encore à la maison.', 'Nous ne {sont>sommes} pas en retard.', 'Le train n’est pas en avance.'], 'С nous идёт sommes.'),
  ],
  3: [
    h(3, 1, ['Tu *es à la gare ?', 'Je suis à la gare.', 'Est-ce que le train {es>est} à l’heure ?'], 'Про поезд пишут est.'),
    h(3, 2, ['La sortie est à gauche ?', 'La sortie *est en face.', 'Les toilettes {est>sont} au fond ?'], 'Toilettes — их несколько, значит sont.'),
  ],
  4: [
    h(4, 1, ['C’est ton frère ?', 'C’est *mon voisin.', 'Ce sont {mon>mes} amis.'], 'Друзей несколько, значит mes.'),
    h(4, 2, ['C’est *votre téléphone ?', 'Ce n’est pas {ma>mon} téléphone.', 'Ce sont vos lunettes ?'], 'Телефон — mon téléphone.'),
  ],
  5: [
    h(5, 1, ['Tu *as faim ?', 'J’ai soif.', 'Nous {avez>avons} besoin d’eau.'], 'С nous идёт avons.'),
    h(5, 2, ['*J’ai mal à la tête.', 'Tu {a>as} besoin de repos.', 'J’ai besoin d’une pause.'], 'С tu пишут as.'),
  ],
  6: [
    h(6, 1, ['Tu aimes le café ?', 'J’aime {la>le} thé.', 'Le pain est sur *la table.'], 'Чай — le thé.'),
    h(6, 2, ['La clé *est dans le tiroir ?', 'Les lunettes {est>sont} dans le sac.', 'Le sac est sous la chaise.'], 'Очки — их несколько, значит sont.'),
  ],
  7: [
    h(7, 1, ['Tu travailles ici ?', 'Je *travaille le samedi.', 'Vous {travaillons>travaillez} ensemble ?'], 'С vous — travaillez.'),
    h(7, 2, ['Vous *cherchez un hôtel ?', 'Nous {cherchent>cherchons} un appartement.', 'J’habite en ville.'], 'С nous — cherchons.'),
  ],
  8: [
    h(8, 1, ['Où es-tu ?', 'Je *suis à la gare.', 'À {quel>quelle} heure part le train ?'], 'С heure пишут quelle.'),
    h(8, 2, ['Où {est>sont} les clés ?', 'Elles sont *dans le tiroir.', 'Qui a la clé de la voiture ?'], 'Ключей несколько, значит sont.'),
  ],
};
