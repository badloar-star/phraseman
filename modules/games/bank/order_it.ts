/**
 * Банк игры «Собери диалог» — итальянский классический курс, уроки 3–24 (D207). 2 диалога из 4 реплик на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: реплики — фразы урока или собраны из слов этого и прошлых уроков; порядок держится
 * на том, что первый вопрос называет, о ком речь, ответ повторяет это слово, а третья реплика ссылается
 * на уже названного (без имени, через lui / lei или коротким «Perché?», «A che ora?») и первой стоять не может.
 * Уроков 1–2 здесь нет намеренно: в них ещё нет вопросов, а из одних утверждений порядок не однозначен.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { OrderTask } from '../dialogue_core';
import { orderTask } from './make_es_it';

const task = (lesson: number, n: number, lines: readonly string[]): OrderTask => orderTask('it', lesson, n, lines);

export const ORDER_BANK_IT: Readonly<Record<number, readonly OrderTask[]>> = {
  3: [
    task(3, 1, ['Paolo è in ufficio?', 'Paolo non è in ufficio.', 'È a casa?', 'Non è ancora a casa.']),
    task(3, 2, ['I bambini sono pronti?', 'I bambini non sono pronti.', 'Sono ancora fuori?', 'Sono già qui.']),
  ],
  4: [
    task(4, 1, ['Questo è tuo fratello?', 'Questo non è mio fratello.', 'È un amico?', 'È un vicino.']),
    task(4, 2, ['Questa è una ricevuta?', 'Questa non è una ricevuta.', 'È una fattura?', 'È un biglietto per domani.']),
  ],
  5: [
    task(5, 1, ['Paolo è stanco?', 'Paolo ha mal di testa.', 'Lui ha bisogno di aiuto?', 'Lui ha bisogno di riposo.']),
    task(5, 2, ['Lea è pronta?', 'Lea ha il biglietto.', 'Lei ha con sé il passaporto?', 'Il passaporto è nella borsa.']),
  ],
  6: [
    task(6, 1, ['A Lea piace il formaggio?', 'A Lea piace il cioccolato.', 'A lei piacciono le fragole?', 'A lei piace il pane.']),
    task(6, 2, ['Il fratello di Paolo è qui?', 'Il fratello di Paolo è al mercato.', 'Lui ha le chiavi della macchina?', 'Le chiavi della macchina sono qui.']),
  ],
  7: [
    task(7, 1, ['Paolo abita qui?', 'Paolo abita vicino al mercato.', 'Lui lavora lì?', 'Lui lavora in città.']),
    task(7, 2, ['Lea parla francese?', 'Lea parla inglese.', 'Lei abita a Lione?', 'Lei abita a Lille.']),
  ],
  8: [
    task(8, 1, ['Dove sei?', 'Sono alla stazione.', 'Perché?', 'Il treno è in ritardo.']),
    task(8, 2, ['Quando è l’appuntamento?', 'L’appuntamento è domani.', 'A che ora?', 'A mezzogiorno.']),
  ],
  9: [
    task(9, 1, ['Dov’è il tuo portafoglio?', 'Il mio portafoglio è nel cassetto.', 'Il cassetto è aperto?', 'Il cassetto è chiuso.']),
    task(9, 2, ['Dove sono le vostre valigie?', 'Le nostre valigie sono in macchina.', 'La macchina è aperta?', 'La macchina è chiusa.']),
  ],
  10: [
    task(10, 1, ['C’è una farmacia qui?', 'C’è una farmacia vicino alla stazione ferroviaria.', 'È aperta stasera?', 'Non è aperta stasera.']),
    task(10, 2, ['C’è un posto a sedere in fondo?', 'Ci sono ancora due posti liberi.', 'Sono vicino alla finestra?', 'Sono vicino alla porta.']),
  ],
  11: [
    task(11, 1, ['Dove va dopo la lezione?', 'Vado in farmacia.', 'La farmacia è lontana?', 'La farmacia è vicino alla stazione.']),
    task(11, 2, ['Lea va dal medico?', 'Lea va dal dentista.', 'Il dentista è lontano?', 'Il dentista è vicino al parco.']),
  ],
  12: [
    task(12, 1, ['Vuoi una tazza di tè?', 'Vorrei un bicchiere d’acqua.', 'L’acqua è fredda?', 'L’acqua è fresca.']),
    task(12, 2, ['Che cosa prepara?', 'Preparo della zuppa.', 'La zuppa è calda?', 'La zuppa è già pronta.']),
  ],
  13: [
    task(13, 1, ['Che cosa cerchi?', 'Cerco una giacca nera.', 'La giacca è leggera?', 'La giacca è molto leggera.']),
    task(13, 2, ['Che cosa prendi?', 'Prendo la piccola scatola blu.', 'La scatola è piena?', 'La scatola è vuota.']),
  ],
  14: [
    task(14, 1, ['Che cosa vuoi visitare?', 'Voglio visitare il museo.', 'Il museo è aperto?', 'Il museo è aperto oggi.']),
    task(14, 2, ['Dove devi andare?', 'Devo andare in farmacia.', 'La farmacia è lontana?', 'La farmacia è vicina.']),
  ],
  15: [
    task(15, 1, ['Che cosa stai facendo?', 'Sto leggendo il libro.', 'Il libro è nuovo?', 'Il libro è vecchio.']),
    task(15, 2, ['Che cosa sta preparando Luis?', 'Luis sta preparando la zuppa.', 'La zuppa è calda?', 'La zuppa è fredda.']),
  ],
  16: [
    task(16, 1, ['Che cosa metto qui?', 'Metti la borsa qui.', 'La borsa è pesante?', 'La borsa è leggera.']),
    task(16, 2, ['Che cosa prendo?', 'Prendi la giacca.', 'La giacca è calda?', 'La giacca è molto calda.']),
  ],
  17: [
    task(17, 1, ['A che ora ti alzi?', 'Mi alzo alle sette.', 'E i bambini?', 'I bambini si alzano presto.']),
    task(17, 2, ['Ti fai la doccia di sera?', 'Mi faccio la doccia al mattino.', 'E Paolo?', 'Paolo si fa la doccia dopo lo sport.']),
  ],
  18: [
    task(18, 1, ['Hai chiuso la porta?', 'Ho chiuso la porta.', 'E la finestra?', 'Lei ha chiuso la finestra.']),
    task(18, 2, ['Che cosa hai comprato?', 'Ho comprato del pane.', 'E Paolo?', 'Paolo ha comprato del caffè.']),
  ],
  19: [
    task(19, 1, ['Lea è arrivata?', 'Lea è arrivata ieri.', 'E Paolo?', 'Paolo è partito.']),
    task(19, 2, ['Dove sono andate le tue sorelle?', 'Le mie sorelle sono andate al concerto.', 'E i tuoi genitori?', 'I miei genitori sono andati al mercato.']),
  ],
  20: [
    task(20, 1, ['Dove abitavi?', 'Abitavo in città.', 'E tua madre?', 'Mia madre viveva in campagna.']),
    task(20, 2, ['Il giardino era grande?', 'Il giardino era piccolo.', 'E il cortile?', 'Il cortile era grande.']),
  ],
  21: [
    task(21, 1, ['Pioveva quando siete usciti?', 'Pioveva quando siamo usciti.', 'E quando è arrivato il treno?', 'Il tempo era bello.']),
    task(21, 2, ['Che cosa stavi facendo?', 'Stavo lavorando.', 'E Paolo?', 'Paolo stava pagando.']),
  ],
  22: [
    task(22, 1, ['Dove metti la giacca?', 'La giacca, la metto via.', 'E le chiavi?', 'Le chiavi, le porto con me.']),
    task(22, 2, ['Dove sono i guanti?', 'I guanti, li metto in tasca.', 'E il pacco?', 'Il pacco, lo ritiriamo allo sportello.']),
  ],
  23: [
    task(23, 1, ['Che cosa le regali?', 'Le regalo un libro.', 'E a Paolo?', 'Gli presto la mia penna.']),
    task(23, 2, ['Scrivi a Lea?', 'Io le scrivo.', 'E ai bambini?', 'Gli scrivo ogni domenica.']),
  ],
  24: [
    task(24, 1, ['Vai al mercato?', 'Ci vado adesso.', 'E Paolo?', 'Paolo ci va domani.']),
    task(24, 2, ['Abiti a Lione?', 'Ci abito da un anno.', 'E tua sorella?', 'Lei ci abita con me.']),
  ],
};
