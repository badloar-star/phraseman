/**
 * Банк игры «Охота на ошибку» — итальянский классический курс, уроки 1–20 (D207). 2 мини-диалога на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: три реплики из фраз урока (или из слов этого и прошлых уроков); ровно одно слово
 * неверное — `{неверно>верно}`; в другой реплике одно слово-обманка — `*слово`: оно нажимается, но верное.
 * Ошибка всегда видна внутри своей реплики (подлежащее названо, и это не имя).
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { HuntTask } from '../dialogue_core';
import { huntTask } from './make_es_it';

const task = (lesson: number, n: number, lines: readonly string[], why: string): HuntTask => huntTask('it', lesson, n, lines, why);

export const HUNT_BANK_IT: Readonly<Record<number, readonly HuntTask[]>> = {
  1: [
    task(1, 1, ['*Sono ancora in ufficio.', 'Lei {sono>è} in ufficio.', 'Siamo alla stazione.'], 'Про неё говорят è. Sono — про себя или про них.'),
    task(1, 2, ['La porta *è aperta.', '{Il>La} finestra è chiusa.', 'Le chiavi sono lì.'], 'Finestra — «она», поэтому la finestra.'),
  ],
  2: [
    task(2, 1, ['Non *sono ancora a casa.', 'Il treno non {sono>è} in ritardo.', 'L’autobus non è ancora qui.'], 'Поезд один — значит è.'),
    task(2, 2, ['*Il bar non è chiuso.', 'I negozi non {è>sono} aperti.', 'Non siamo lontani dalla stazione.'], 'Магазинов несколько — значит sono.'),
  ],
  3: [
    task(3, 1, ['Sei alla stazione?', 'Non *sono alla stazione.', 'Il treno {sono>è} in orario?'], 'Поезд один — значит è.'),
    task(3, 2, ['La biglietteria è aperta?', 'La biglietteria non *è aperta.', 'L’uscita è {in>a} sinistra?'], '«Слева» — это a sinistra.'),
  ],
  4: [
    task(4, 1, ['*Questo è mio fratello.', '{Questo>Questa} è mia sorella.', 'Questi sono i miei amici.'], 'Про сестру говорят questa.'),
    task(4, 2, ['Questo è il suo telefono?', 'Questo non è il *mio telefono.', '{Questa>Queste} sono le mie chiavi.'], 'Ключей несколько — значит queste.'),
  ],
  5: [
    task(5, 1, ['*Hai fame?', 'Ho sete.', 'I bambini {ha>hanno} fame.'], 'Детей несколько — значит hanno.'),
    task(5, 2, ['Ha una prenotazione?', 'Ho {un>una} prenotazione.', 'Abbiamo *tre posti.'], 'Prenotazione — «она», поэтому una.'),
  ],
  6: [
    task(6, 1, ['Ti piacciono le fragole?', 'Mi {piace>piacciono} le fragole.', 'A Lea *piace il formaggio.'], 'Ягод несколько — значит piacciono.'),
    task(6, 2, ['La chiave è *sul tavolo.', 'Lo zaino è {sul>sulla} sedia.', 'Gli occhiali sono sul letto.'], 'Sedia — «она», поэтому sulla sedia.'),
  ],
  7: [
    task(7, 1, ['*Parli francese?', 'Parlo francese.', 'Lei {parlo>parla} inglese.'], 'Про неё говорят parla. Parlo — про себя.'),
    task(7, 2, ['Cerchi la tua borsa?', 'Cerco le {mia>mie} chiavi.', 'Paolo *prepara il caffè.'], 'Ключей несколько — значит le mie.'),
  ],
  8: [
    task(8, 1, ['Dove sei?', '*Sono alla stazione.', 'A che ora parte {la>il} treno?'], 'Treno — «он», поэтому il treno.'),
    task(8, 2, ['Quanto {costano>costa} il biglietto?', 'Questo è *un biglietto per domani.', 'Quando parte il treno?'], 'Билет один — значит costa.'),
  ],
  9: [
    task(9, 1, ['Dov’è il tuo portafoglio?', 'Il *mio portafoglio è qui.', 'Le mie chiavi {è>sono} lì.'], 'Ключей несколько — значит sono.'),
    task(9, 2, ['Dove sono le vostre valigie?', 'Le nostre valigie sono {pronto>pronte}.', 'Il *nostro treno è al binario.'], 'Valigia — «она», чемоданов несколько: pronte.'),
  ],
  10: [
    task(10, 1, ['C’è del latte in frigorifero?', 'Non *c’è latte.', 'Ci sono {del>dei} libri sul tavolo.'], 'Книг несколько — значит dei.'),
    task(10, 2, ['C’è una camera libera?', 'Ci sono ancora due posti {libera>liberi}.', '*C’è un ascensore in hotel.'], 'Мест два — значит liberi.'),
  ],
  11: [
    task(11, 1, ['Dove va dopo la lezione?', '*Vado in stazione.', 'Lei {vado>va} al mercato.'], 'Про неё говорят va. Vado — про себя.'),
    task(11, 2, ['Vai all’ufficio postale?', 'Oggi non *vado al negozio.', 'Noi andiamo {a>in} Francia.'], 'Перед названием страны говорят in.'),
  ],
  12: [
    task(12, 1, ['Beve del caffè?', 'Non *bevo caffè.', 'Prendo {della>del} tè.'], 'Tè — «он», поэтому del.'),
    task(12, 2, ['Che cosa prepara?', 'Prendo *della zuppa.', 'Lui {prendo>prende} del formaggio.'], 'Про него говорят prende. Prendo — про себя.'),
  ],
  13: [
    task(13, 1, ['La borsa è pesante?', 'La borsa è {leggeri>leggera}.', 'La valigia *è pesante.'], 'Borsa — «она», поэтому leggera.'),
    task(13, 2, ['Cerchi una giacca?', 'Cerco una giacca {neri>nera}.', '*Preferisci il maglione rosso?'], 'Giacca — «она», поэтому nera.'),
  ],
  14: [
    task(14, 1, ['Puoi venire?', '*Possiamo venire.', 'Lei {posso>può} venire.'], 'Про неё говорят può. Posso — про себя.'),
    task(14, 2, ['Devi pagare?', 'Noi {devo>dobbiamo} pagare.', 'Lui *deve aspettare.'], 'Про нас говорят dobbiamo.'),
  ],
  15: [
    task(15, 1, ['Che cosa stai facendo?', 'Sto {leggere>leggendo} il libro.', 'Ana *sta scrivendo una lettera.'], 'После sto — leggendo.'),
    task(15, 2, ['Dove sono i tuoi fratelli?', 'I miei fratelli {sta>stanno} mangiando a casa.', 'Le mie sorelle *stanno aspettando qui.'], 'Братьев несколько — значит stanno.'),
  ],
  16: [
    task(16, 1, ['Dove metto la borsa?', '*Metti la borsa qui!', 'Chiudi {il>la} porta!'], 'Porta — «она», поэтому la.'),
    task(16, 2, ['Che cosa prendo?', 'Prendi {il>la} giacca!', '*Tieni il biglietto!'], 'Giacca — «она», поэтому la.'),
  ],
  17: [
    task(17, 1, ['A che ora ti alzi?', '*Mi alzo alle sette.', 'I bambini si {alza>alzano} presto.'], 'Детей несколько — значит alzano.'),
    task(17, 2, ['Ti fai la doccia di sera?', 'Mi faccio {il>la} doccia al mattino.', 'Lei si *lava le mani.'], 'Doccia — «она», поэтому la.'),
  ],
  18: [
    task(18, 1, ['Hai chiuso la porta?', '*Ho chiuso la porta.', 'Lei {ho>ha} chiuso la finestra.'], 'Про неё говорят ha. Ho — про себя.'),
    task(18, 2, ['Hai pagato il conto?', 'Ho {pagare>pagato} il conto.', 'Lui *ha preso il treno.'], 'После ho — pagato.'),
  ],
  19: [
    task(19, 1, ['Quando è arrivata?', 'Mia sorella è {arrivato>arrivata} stamattina.', '*Paolo è partito.'], 'Сестра — «она», поэтому arrivata.'),
    task(19, 2, ['Dove sono andate?', 'Le mie sorelle sono {andati>andate} al concerto.', 'I miei genitori sono *andati al mercato.'], 'Сёстры — женщины, поэтому andate.'),
  ],
  20: [
    task(20, 1, ['Dove abitavi?', '*Abitavo qui.', 'Noi {vivevano>vivevamo} in campagna.'], 'Про нас говорят vivevamo.'),
    task(20, 2, ['Il giardino era grande?', 'Il giardino {erano>era} piccolo.', 'Le finestre *erano aperte.'], 'Сад один — значит era.'),
  ],
};
