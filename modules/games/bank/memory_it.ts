/**
 * Банк игры «Память» — итальянский классический курс, уроки 1–8 (D207). 2 раунда на урок, в каждом 4 пары.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: слева слово или выражение урока, справа его перевод; спрашивается одна пара,
 * неверные варианты — переводы двух других пар того же набора (так проверяется память, а не догадка).
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { memoryRound, type MemoryPair } from './make_es_it';

const round = (lesson: number, n: number, pairs: readonly MemoryPair[], askIndex: number, wrongPairs: readonly [number, number], at: number): QuizRound =>
  memoryRound('it', lesson, n, pairs, askIndex, wrongPairs, at);

export const MEMORY_BANK_IT: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, [['qui', 'здесь'], ['lì', 'там'], ['a casa', 'дома'], ['fuori', 'снаружи']], 3, [1, 0], 1),
    round(1, 2, [['stanco', 'уставший'], ['pronto', 'готов'], ['aperto', 'открыт'], ['chiuso', 'закрыт']], 1, [0, 2], 0),
  ],
  2: [
    round(2, 1, [['in ritardo', 'с опозданием'], ['in anticipo', 'раньше времени'], ['insieme', 'вместе'], ['ancora', 'ещё']], 1, [0, 2], 2),
    round(2, 2, [['pulito', 'чистый'], ['sporco', 'грязный'], ['vuota', 'пустая'], ['buio', 'тёмный']], 3, [1, 0], 1),
  ],
  3: [
    round(3, 1, [['l’ingresso', 'вход'], ['l’uscita', 'выход'], ['la biglietteria', 'касса'], ['il parcheggio', 'парковка']], 0, [1, 3], 0),
    round(3, 2, [['a sinistra', 'слева'], ['a destra', 'справа'], ['di fronte', 'напротив'], ['in fondo', 'в самом конце']], 2, [3, 0], 2),
  ],
  4: [
    round(4, 1, [['mia sorella', 'моя сестра'], ['mio fratello', 'мой брат'], ['mio padre', 'мой отец'], ['mia madre', 'моя мать']], 2, [1, 3], 1),
    round(4, 2, [['un regalo', 'подарок'], ['un indirizzo', 'адрес'], ['una ricevuta', 'квитанция'], ['una tessera', 'карточка']], 1, [0, 2], 0),
  ],
  5: [
    round(5, 1, [['ho fame', 'я голоден'], ['ho sete', 'я хочу пить'], ['ho paura', 'я боюсь'], ['ho sonno', 'я хочу спать']], 3, [1, 2], 2),
    round(5, 2, [['un appuntamento', 'встреча'], ['una domanda', 'вопрос'], ['una penna', 'ручка'], ['una prenotazione', 'бронирование']], 0, [3, 1], 1),
  ],
  6: [
    round(6, 1, [['il pane', 'хлеб'], ['la zuppa', 'суп'], ['il formaggio', 'сыр'], ['le fragole', 'клубника']], 2, [0, 1], 0),
    round(6, 2, [['il cappotto', 'пальто'], ['la giacca', 'куртка'], ['i guanti', 'перчатки'], ['la sciarpa', 'шарф']], 1, [0, 3], 2),
  ],
  7: [
    round(7, 1, [['lavoro', 'я работаю'], ['parlo', 'я говорю'], ['abito', 'я живу'], ['cerco', 'я ищу']], 2, [0, 3], 1),
    round(7, 2, [['la cena', 'ужин'], ['il pranzo', 'обед'], ['la partita', 'матч'], ['le valigie', 'чемоданы']], 0, [1, 2], 0),
  ],
  8: [
    round(8, 1, [['dove', 'где'], ['quando', 'когда'], ['chi', 'кто'], ['perché', 'почему']], 3, [1, 0], 2),
    round(8, 2, [['quanto costa', 'сколько стоит'], ['a che ora', 'во сколько'], ['come', 'как'], ['cosa', 'что']], 1, [0, 2], 1),
  ],
};
