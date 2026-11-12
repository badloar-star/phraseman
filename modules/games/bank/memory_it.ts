/**
 * Банк игры «Память» — итальянский классический курс, уроки 1–24 (D207). 2 раунда на урок, в каждом 4 пары.
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
  9: [
    round(9, 1, [['mio', 'мой'], ['tuo', 'твой'], ['nostro', 'наш'], ['vostro', 'ваш']], 2, [0, 3], 1),
    round(9, 2, [['la giacca', 'куртка'], ['gli occhiali', 'очки'], ['i guanti', 'перчатки'], ['il cappotto', 'пальто']], 3, [0, 2], 0),
  ],
  10: [
    round(10, 1, [['una panchina', 'скамейка'], ['una sedia', 'стул'], ['uno schermo', 'экран'], ['un orologio', 'часы']], 1, [0, 2], 2),
    round(10, 2, [['il sapone', 'мыло'], ['lo zucchero', 'сахар'], ['il pane', 'хлеб'], ['il latte', 'молоко']], 2, [0, 3], 1),
  ],
  11: [
    round(11, 1, [['vado', 'я иду'], ['vai', 'ты идёшь'], ['andiamo', 'мы идём'], ['vanno', 'они идут']], 2, [0, 3], 0),
    round(11, 2, [['a piedi', 'пешком'], ['in macchina', 'на машине'], ['in bicicletta', 'на велосипеде'], ['in treno', 'на поезде']], 0, [1, 3], 2),
  ],
  12: [
    round(12, 1, [['il pane', 'хлеб'], ['il riso', 'рис'], ['il burro', 'сливочное масло'], ['il pesce', 'рыба']], 1, [0, 3], 1),
    round(12, 2, [['la farina', 'мука'], ['la panna', 'сливки'], ['il sale', 'соль'], ['il pepe', 'перец']], 2, [0, 3], 0),
  ],
  13: [
    round(13, 1, [['pesante', 'тяжёлый'], ['leggera', 'лёгкая'], ['stretta', 'узкая'], ['piena', 'полная']], 0, [1, 2], 2),
    round(13, 2, [['verde', 'зелёный'], ['grigio', 'серый'], ['nera', 'чёрная'], ['rosso', 'красный']], 3, [0, 1], 1),
  ],
  14: [
    round(14, 1, [['posso', 'я могу'], ['devo', 'мне нужно'], ['voglio', 'я хочу'], ['possiamo', 'мы можем']], 1, [0, 2], 0),
    round(14, 2, [['aspettare', 'подождать'], ['pagare', 'заплатить'], ['restare', 'остаться'], ['entrare', 'войти']], 2, [0, 3], 2),
  ],
  15: [
    round(15, 1, [['una cipolla', 'луковица'], ['i piatti', 'тарелки'], ['in contanti', 'наличными'], ['il messaggio', 'сообщение']], 0, [2, 3], 1),
    round(15, 2, [['una lettera', 'письмо'], ['il libro', 'книга'], ['la valigia', 'чемодан'], ['le mani', 'руки']], 3, [0, 1], 0),
  ],
  16: [
    round(16, 1, [['entra', 'входи'], ['aspetta', 'подожди'], ['resta', 'останься'], ['ascolta', 'слушай']], 1, [2, 3], 2),
    round(16, 2, [['la porta', 'дверь'], ['la finestra', 'окно'], ['il semaforo', 'светофор'], ['il percorso', 'маршрут']], 2, [0, 1], 1),
  ],
  17: [
    round(17, 1, [['mi alzo', 'я встаю'], ['mi sveglio', 'я просыпаюсь'], ['mi vesto', 'я одеваюсь'], ['mi cambio', 'я переодеваюсь']], 1, [0, 3], 2),
    round(17, 2, [['i denti', 'зубы'], ['i capelli', 'волосы'], ['lo specchio', 'зеркало'], ['la doccia', 'душ']], 2, [0, 1], 0),
  ],
  18: [
    round(18, 1, [['il conto', 'счёт'], ['il campanello', 'дверной звонок'], ['la copia', 'копия'], ['le istruzioni', 'инструкции']], 0, [1, 3], 1),
    round(18, 2, [['ieri', 'вчера'], ['stamattina', 'сегодня утром'], ['grazie', 'спасибо'], ['la pila', 'батарейка']], 3, [0, 2], 2),
  ],
  19: [
    round(19, 1, [['è arrivato', 'он приехал'], ['è partito', 'он уехал'], ['è tornato', 'он вернулся'], ['è caduto', 'он упал']], 2, [0, 1], 0),
    round(19, 2, [['il postino', 'почтальон'], ['gli ospiti', 'гости'], ['i clienti', 'клиенты'], ['la nonna', 'бабушка']], 1, [2, 3], 1),
  ],
  20: [
    round(20, 1, [['abitavo', 'я жил'], ['ero', 'я был'], ['lavoravo', 'я работал'], ['giocavo', 'я играл']], 1, [0, 3], 2),
    round(20, 2, [['il porto', 'порт'], ['il vento', 'ветер'], ['la luce', 'свет'], ['il quartiere', 'район']], 0, [1, 2], 1),
  ],
  21: [
    round(21, 1, [['mentre', 'пока'], ['il gatto', 'кот'], ['la notizia', 'известие'], ['lo scontrino', 'чек']], 0, [1, 2], 2),
    round(21, 2, [['il dottore', 'врач'], ['il guanto', 'перчатка'], ['le scale', 'лестница'], ['la canzone', 'песня']], 3, [0, 1], 1),
  ],
  22: [
    round(22, 1, [['vedo', 'я вижу'], ['conosci', 'ты знаешь'], ['trovo', 'я нахожу'], ['provo', 'я примеряю']], 0, [2, 3], 1),
    round(22, 2, [['il giornale', 'газета'], ['la moneta', 'монета'], ['il cavo', 'кабель'], ['la batteria', 'батарея']], 2, [0, 3], 0),
  ],
  23: [
    round(23, 1, [['subito', 'сразу'], ['niente', 'ничего'], ['il prezzo', 'цена'], ['il compleanno', 'день рождения']], 1, [2, 3], 2),
    round(23, 2, [['le regole', 'правила'], ['un consiglio', 'совет'], ['una storia', 'сказка'], ['il gioco', 'игра']], 0, [1, 3], 1),
  ],
  24: [
    round(24, 1, [['anche', 'тоже'], ['adesso', 'сейчас'], ['a volte', 'иногда'], ['un anno', 'год']], 2, [0, 3], 0),
    round(24, 2, [['i parenti', 'родственники'], ['il soggiorno', 'гостиная'], ['il laboratorio', 'мастерская'], ['la mostra', 'выставка']], 3, [1, 2], 2),
  ],
};
