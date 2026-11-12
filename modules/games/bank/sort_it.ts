/**
 * Банк игры «Сортировка» — итальянский классический курс, уроки 1–12 (D207). Одна колода из 8 карт на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: противопоставление корзин реально есть в уроке; каждая карта подходит ровно к одной
 * корзине; текст карты — только слова этого и прошлых уроков. Пропуск в карте пишется `___`
 * (уроки 3, 4, 5, 6): корзины названы самими словами, игрок выбирает, чем заполнить пропуск.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { SortBin, SortDeck } from '../sort_core';
import { sortDeck, type SortCard } from './make_es_it';

const deck = (lesson: number, left: SortBin, right: SortBin, cards: readonly SortCard[]): SortDeck => sortDeck('it', lesson, left, right, cards);

export const SORT_BANK_IT: Readonly<Record<number, SortDeck>> = {
  1: deck(1, { title: 'Про «он»', example: 'stanco, aperto' }, { title: 'Про «она»', example: 'stanca, aperta' }, [
    ['Paolo è stanco', 'left', 'stanco — так говорят про него'],
    ['Lea è stanca', 'right', 'stanca — так говорят про неё'],
    ['Il negozio è aperto', 'left', 'negozio — «он», поэтому aperto'],
    ['La porta è aperta', 'right', 'porta — «она», поэтому aperta'],
    ['Il bar è chiuso', 'left', 'bar — «он», поэтому chiuso'],
    ['La finestra è chiusa', 'right', 'finestra — «она», поэтому chiusa'],
    ['L’ufficio è silenzioso', 'left', 'ufficio — «он», поэтому silenzioso'],
    ['La casa è vicina', 'right', 'casa — «она», поэтому vicina'],
  ]),
  2: deck(2, { title: 'Да, так', example: 'La porta è…' }, { title: 'Нет, не так', example: 'La porta non è…' }, [
    ['Il bar non è chiuso', 'right', 'non перед è — кафе не закрыто'],
    ['La porta è aperta', 'left', 'без non — дверь открыта'],
    ['Non siamo pronti', 'right', 'non перед siamo — мы не готовы'],
    ['Siamo insieme', 'left', 'без non — мы вместе'],
    ['Le chiavi non sono qui', 'right', 'non перед sono — ключей здесь нет'],
    ['La chiave è qui', 'left', 'без non — ключ здесь'],
    ['Il museo non è aperto', 'right', 'non перед è — музей не открыт'],
    ['Il negozio è aperto', 'left', 'без non — магазин открыт'],
  ]),
  3: deck(3, { title: 'è', example: 'про одно: la porta, il treno' }, { title: 'sono', example: 'про несколько: le chiavi' }, [
    ['La porta ___ aperta?', 'left', 'дверь одна — значит è'],
    ['Le chiavi ___ qui?', 'right', 'ключей несколько — значит sono'],
    ['Il treno ___ in orario?', 'left', 'поезд один — значит è'],
    ['I bambini ___ pronti?', 'right', 'детей несколько — значит sono'],
    ['La sala ___ libera?', 'left', 'зал один — значит è'],
    ['I bagni ___ in fondo?', 'right', 'туалетов несколько — значит sono'],
    ['Il pranzo ___ pronto?', 'left', 'обед один — значит è'],
    ['Entrambe le porte ___ chiuse?', 'right', 'дверей две — значит sono'],
  ]),
  4: deck(4, { title: 'Questo', example: 'про «он»: un amico' }, { title: 'Questa', example: 'про «она»: un’amica' }, [
    ['___ è mio fratello', 'left', 'брат — «он», поэтому questo'],
    ['___ è mia sorella', 'right', 'сестра — «она», поэтому questa'],
    ['___ è un amico', 'left', 'amico — друг, поэтому questo'],
    ['___ è un’amica', 'right', 'amica — подруга, поэтому questa'],
    ['___ è un regalo', 'left', 'regalo — «он», поэтому questo'],
    ['___ è una foto', 'right', 'foto — «она», поэтому questa'],
    ['___ è un biglietto', 'left', 'biglietto — «он», поэтому questo'],
    ['___ è una chiave', 'right', 'chiave — «она», поэтому questa'],
  ]),
  5: deck(5, { title: 'ha', example: 'про одного: Lea, lui' }, { title: 'hanno', example: 'про нескольких: loro' }, [
    ['Lea ___ una carta', 'left', 'Леа одна — значит ha'],
    ['Loro ___ un biglietto', 'right', 'их несколько — значит hanno'],
    ['Paolo ___ paura', 'left', 'Паоло один — значит ha'],
    ['I bambini ___ fame', 'right', 'детей несколько — значит hanno'],
    ['Mio fratello ___ dieci anni', 'left', 'брат один — значит ha'],
    ['Le ragazze ___ un biglietto', 'right', 'девушек несколько — значит hanno'],
    ['Lei ___ due figli', 'left', 'она одна — значит ha'],
    ['I miei amici ___ sete', 'right', 'друзей несколько — значит hanno'],
  ]),
  6: deck(6, { title: 'piace', example: 'нравится что-то одно' }, { title: 'piacciono', example: 'нравятся несколько' }, [
    ['Mi ___ il caffè', 'left', 'кофе один — значит piace'],
    ['Ci ___ i libri', 'right', 'книг несколько — значит piacciono'],
    ['A lei ___ la musica', 'left', 'музыка одна — значит piace'],
    ['Ti ___ le fragole?', 'right', 'ягод несколько — значит piacciono'],
    ['A Lea ___ il formaggio', 'left', 'сыр один — значит piace'],
    ['Mi ___ queste scarpe', 'right', 'туфель несколько — значит piacciono'],
    ['Ai bambini ___ il cioccolato', 'left', 'шоколад один — значит piace'],
    ['A lui ___ i regali', 'right', 'подарков несколько — значит piacciono'],
  ]),
  7: deck(7, { title: 'Я', example: 'lavoro, parlo' }, { title: 'Мы', example: 'lavoriamo, parliamo' }, [
    ['Lavoro qui', 'left', 'lavoro — так говорят про себя'],
    ['Lavoriamo insieme', 'right', 'lavoriamo — так говорят про нас'],
    ['Parlo francese', 'left', 'parlo — так говорят про себя'],
    ['Parliamo spagnolo', 'right', 'parliamo — так говорят про нас'],
    ['Ascolto la radio', 'left', 'ascolto — так говорят про себя'],
    ['Ascoltiamo la musica', 'right', 'ascoltiamo — так говорят про нас'],
    ['Ordino un tè', 'left', 'ordino — так говорят про себя'],
    ['Ordiniamo due caffè', 'right', 'ordiniamo — так говорят про нас'],
  ]),
  8: deck(8, { title: 'Про место', example: 'Dove…  Dov’è…' }, { title: 'Про время', example: 'Quando…  A che ora…' }, [
    ['Dove sei?', 'left', 'dove — спрашивают, где'],
    ['Quando arrivi?', 'right', 'quando — спрашивают, когда'],
    ['Dov’è la biglietteria?', 'left', 'dov’è — спрашивают, где'],
    ['Quando chiude la banca?', 'right', 'quando — спрашивают, когда'],
    ['Dove sono i bagni?', 'left', 'dove — спрашивают, где'],
    ['A che ora parte il treno?', 'right', 'a che ora — спрашивают, во сколько'],
    ['Dove abiti?', 'left', 'dove — спрашивают, где'],
    ['Quando è il concerto?', 'right', 'quando — спрашивают, когда'],
  ]),
  9: deck(9, { title: 'mio', example: 'il mio posto' }, { title: 'mia', example: 'la mia borsa' }, [
    ['Il ___ indirizzo è sulla mappa', 'left', 'indirizzo — «он», поэтому mio'],
    ['La ___ borsa è qui', 'right', 'borsa — «она», поэтому mia'],
    ['Il ___ posto è accanto al tuo', 'left', 'posto — «он», поэтому mio'],
    ['La ___ chiave è lì', 'right', 'chiave — «она», поэтому mia'],
    ['Sto cercando il ___ cappotto', 'left', 'cappotto — «он», поэтому mio'],
    ['La ___ busta è vuota', 'right', 'busta — «она», поэтому mia'],
    ['___ fratello ha dimenticato la sua chiave', 'left', 'fratello — «он», поэтому mio'],
    ['La ___ bicicletta è in garage', 'right', 'bicicletta — «она», поэтому mia'],
  ]),
  10: deck(10, { title: 'c’è', example: 'одно: una panchina' }, { title: 'ci sono', example: 'несколько: due panchine' }, [
    ['___ una panchina', 'left', 'скамейка одна — c’è'],
    ['___ due panchine', 'right', 'скамеек две — ci sono'],
    ['___ un tavolo', 'left', 'стол один — c’è'],
    ['___ tre sedie', 'right', 'стульев три — ci sono'],
    ['Qui ___ una farmacia', 'left', 'аптека одна — c’è'],
    ['___ dei libri sul tavolo', 'right', 'книг несколько — ci sono'],
    ['___ del caffè', 'left', 'кофе не считают штуками — c’è'],
    ['Nel cassetto ___ delle pile', 'right', 'батареек несколько — ci sono'],
  ]),
  11: deck(11, { title: 'a', example: 'a Lione, a scuola' }, { title: 'in', example: 'in Francia, in banca' }, [
    ['Io vado ___ Lione', 'left', 'перед городом — a'],
    ['Noi andiamo ___ Francia', 'right', 'перед страной — in'],
    ['Lei va ___ Parigi', 'left', 'перед городом — a'],
    ['Loro vanno ___ Belgio', 'right', 'перед страной — in'],
    ['Noi andiamo ___ scuola', 'left', 'так говорят: a scuola'],
    ['Loro vanno ___ banca', 'right', 'так говорят: in banca'],
    ['I bambini vanno ___ scuola a piedi', 'left', 'так говорят: a scuola'],
    ['Vado ___ farmacia', 'right', 'так говорят: in farmacia'],
  ]),
  12: deck(12, { title: 'del', example: 'del pane' }, { title: 'della', example: 'della zuppa' }, [
    ['Prendo ___ pane', 'left', 'pane — «он», поэтому del'],
    ['Prendo ___ zuppa', 'right', 'zuppa — «она», поэтому della'],
    ['Compriamo ___ pesce', 'left', 'pesce — «он», поэтому del'],
    ['Compro ___ farina', 'right', 'farina — «она», поэтому della'],
    ['Bevo ___ tè', 'left', 'tè — «он», поэтому del'],
    ['Compri ___ panna', 'right', 'panna — «она», поэтому della'],
    ['Lei compra ___ prosciutto', 'left', 'prosciutto — «он», поэтому del'],
    ['Mangiamo ___ pasta', 'right', 'pasta — «она», поэтому della'],
  ]),
};
