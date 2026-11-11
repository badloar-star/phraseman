/**
 * Банк игры «Память» — французский классический курс, уроки 1–8 (D207). На урок 2 раунда по 4 пары.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: слово или выражение пары взято из фраз урока; в одном наборе нет двух слов с близким
 * переводом; неверные варианты — переводы двух других пар того же набора: проверяется память, а не догадка.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { memoryRound, type FourPairs } from './make_de_fr';

const r = (lesson: number, n: number, pairs: FourPairs, askIndex: number, wrong: readonly [number, number], at: number): QuizRound =>
  memoryRound('fr', lesson, n, pairs, askIndex, wrong, at);

export const MEMORY_BANK_FR: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    r(1, 1, [['ici', 'здесь'], ['là', 'там'], ['loin', 'далеко'], ['dehors', 'на улице']], 3, [1, 2], 1),
    r(1, 2, [['la gare', 'вокзал'], ['le bureau', 'офис'], ['le magasin', 'магазин'], ['la clé', 'ключ']], 0, [1, 2], 0),
  ],
  2: [
    r(2, 1, [['en retard', 'с опозданием'], ['en avance', 'заранее'], ['encore', 'ещё'], ['très', 'очень']], 1, [0, 2], 2),
    r(2, 2, [['vide', 'пустой'], ['propre', 'чистый'], ['sale', 'грязный'], ['sombre', 'тёмный']], 2, [1, 3], 0),
  ],
  3: [
    r(3, 1, [['à gauche', 'слева'], ['à droite', 'справа'], ['en face', 'напротив'], ['au fond', 'в глубине']], 1, [0, 2], 1),
    r(3, 2, [['la sortie', 'выход'], ['l’entrée', 'вход'], ['le quai', 'платформа'], ['le guichet', 'касса']], 2, [0, 3], 2),
  ],
  4: [
    r(4, 1, [['la sœur', 'сестра'], ['le frère', 'брат'], ['le voisin', 'сосед'], ['le père', 'отец']], 2, [1, 3], 0),
    r(4, 2, [['le cadeau', 'подарок'], ['le reçu', 'чек'], ['la facture', 'счёт'], ['les lunettes', 'очки']], 1, [0, 2], 1),
  ],
  5: [
    r(5, 1, [['j’ai faim', 'я голоден'], ['j’ai soif', 'я хочу пить'], ['j’ai froid', 'мне холодно'], ['j’ai peur', 'мне страшно']], 1, [0, 2], 2),
    r(5, 2, [['le rendez-vous', 'встреча'], ['la monnaie', 'мелочь'], ['le repos', 'отдых'], ['le choix', 'выбор']], 1, [0, 3], 0),
  ],
  6: [
    r(6, 1, [['sur', 'на'], ['sous', 'под'], ['dans', 'в'], ['près de', 'рядом с']], 1, [0, 2], 1),
    r(6, 2, [['le manteau', 'пальто'], ['la veste', 'куртка'], ['les gants', 'перчатки'], ['l’écharpe', 'шарф']], 1, [0, 3], 2),
  ],
  7: [
    r(7, 1, [['je cherche', 'я ищу'], ['je regarde', 'я смотрю'], ['je prépare', 'я готовлю'], ['je commande', 'я заказываю']], 3, [0, 2], 0),
    r(7, 2, [['la campagne', 'сельская местность'], ['en ville', 'в городе'], ['un appartement', 'квартира'], ['le dîner', 'ужин']], 3, [0, 2], 1),
  ],
  8: [
    r(8, 1, [['où', 'где'], ['quand', 'когда'], ['qui', 'кто'], ['pourquoi', 'почему']], 1, [0, 3], 2),
    r(8, 2, [['combien', 'сколько'], ['comment', 'как'], ['à quelle heure', 'во сколько'], ['avec qui', 'с кем']], 1, [0, 2], 0),
  ],
};
