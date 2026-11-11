/**
 * Банк игры «Собери диалог» — итальянский классический курс, уроки 3–8 (D207). 2 диалога из 4 реплик на урок.
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
};
