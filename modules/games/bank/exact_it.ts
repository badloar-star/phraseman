/**
 * Банк игры «Точное слово» — итальянский классический курс, уроки 1–8 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: фраза с верным вариантом — фраза урока (или из слов этого и прошлых уроков);
 * каждый неверный вариант даёт грамматически неверную фразу (правило владельца о неверных вариантах);
 * варианты — только слова, которые ученик уже встречал. Там, где проверяется форма «быть», «иметь»
 * или действия, подлежащее названо явно и это не имя. Верный вариант записан первым, место на экране —
 * четвёртый аргумент.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { gapRound } from './make_es_it';

const round = (lesson: number, n: number, gapped: string, correct: string, wrong: readonly string[], at: number, note: string): QuizRound =>
  gapRound('it', lesson, n, gapped, correct, wrong, at, note);

export const EXACT_BANK_IT: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, 'La finestra è ___', 'chiusa', ['chiuso', 'chiusi'], 0, 'Finestra — «она», поэтому chiusa.'),
    round(1, 2, 'Loro ___ qui', 'sono', ['è', 'sei'], 1, 'Их несколько — значит sono.'),
    round(1, 3, 'Le porte sono ___', 'aperte', ['aperta', 'aperto'], 2, 'Дверей несколько — значит aperte.'),
    round(1, 4, '___ negozio è aperto', 'Il', ['La', 'I'], 0, 'Negozio — «он», и он один: il.'),
    round(1, 5, 'Lei ___ in ufficio', 'è', ['sono', 'sei'], 1, 'Про неё говорят è.'),
    round(1, 6, 'Le chiavi ___ lì', 'sono', ['è'], 0, 'Ключей несколько — значит sono.'),
  ],
  2: [
    round(2, 1, 'Paolo ___ in ufficio', 'non è', ['è non'], 1, 'Non ставят перед è.'),
    round(2, 2, 'La camera non è ___', 'libera', ['libero'], 0, 'Camera — «она», поэтому libera.'),
    round(2, 3, 'I negozi non ___ aperti', 'sono', ['è'], 1, 'Магазинов несколько — значит sono.'),
    round(2, 4, 'Il treno non è ___ ritardo', 'in', ['a'], 0, '«С опозданием» — это in ritardo.'),
    round(2, 5, 'Le scarpe non sono ___', 'pulite', ['pulito'], 1, 'Туфель несколько — значит pulite.'),
    round(2, 6, 'Il biglietto non è ___ borsa', 'nella', ['sul'], 0, 'Borsa — «она», а билет внутри: nella.'),
  ],
  3: [
    round(3, 1, 'I bambini ___ pronti?', 'sono', ['è', 'sei'], 2, 'Детей несколько — значит sono.'),
    round(3, 2, 'La camera è ___?', 'pulita', ['pulito', 'pulite'], 0, 'Camera — «она», поэтому pulita.'),
    round(3, 3, 'L’uscita è ___ sinistra?', 'a', ['in'], 1, '«Слева» — это a sinistra.'),
    round(3, 4, 'Il treno è ___ orario?', 'in', ['a'], 0, '«По расписанию» — это in orario.'),
    round(3, 5, 'Lea è con ___?', 'te', ['tua'], 1, '«С тобой» — это con te.'),
    round(3, 6, 'Il museo è ___ oggi?', 'aperto', ['aperta', 'aperti'], 0, 'Museo — «он», поэтому aperto.'),
  ],
  4: [
    round(4, 1, '___ è mia sorella', 'Questa', ['Questo', 'Queste'], 1, 'Сестра одна, и она — «она»: questa.'),
    round(4, 2, 'Questo è ___ fratello', 'mio', ['mia'], 0, 'Брат — «он», поэтому mio.'),
    round(4, 3, 'Queste ___ le mie chiavi', 'sono', ['è'], 1, 'Ключей несколько — значит sono.'),
    round(4, 4, 'Questa è ___ chiave', 'una', ['un'], 0, 'Chiave — «она», поэтому una.'),
    round(4, 5, 'Questi sono i ___ amici', 'miei', ['mie', 'mio'], 2, 'Друзей несколько — значит miei.'),
    round(4, 6, 'Questo non è il ___ posto', 'tuo', ['tua', 'tue'], 0, 'Posto — «он», поэтому tuo.'),
  ],
  5: [
    round(5, 1, 'Lui ___ una borsa', 'ha', ['ho', 'hanno'], 1, 'Про него говорят ha.'),
    round(5, 2, '___ fame', 'Ho', ['Sono'], 0, '«Я голоден» — это ho fame.'),
    round(5, 3, '___ freddo', 'Abbiamo', ['Siamo'], 1, '«Нам холодно» — это abbiamo freddo.'),
    round(5, 4, 'Ho bisogno ___ aiuto', 'di', ['a', 'in'], 0, 'После bisogno идёт di.'),
    round(5, 5, 'I bambini ___ fame', 'hanno', ['ha'], 1, 'Детей несколько — значит hanno.'),
    round(5, 6, 'Lea ha ___ carta', 'una', ['un'], 0, 'Carta — «она», поэтому una.'),
  ],
  6: [
    round(6, 1, 'La chiave è ___ tavolo', 'sul', ['sulla', 'nella'], 0, 'Tavolo — «он», поэтому sul.'),
    round(6, 2, 'Mi ___ il tè', 'piace', ['piacciono'], 1, 'Чай один — значит piace.'),
    round(6, 3, 'Ci ___ i libri', 'piacciono', ['piace'], 0, 'Книг несколько — значит piacciono.'),
    round(6, 4, 'Lo zaino è ___ sedia', 'sulla', ['sul', 'nel'], 2, 'Sedia — «она», поэтому sulla.'),
    round(6, 5, 'La zuppa è ___', 'calda', ['caldo'], 1, 'Zuppa — «она», поэтому calda.'),
    round(6, 6, 'Il portafoglio è ___ cassetto', 'nel', ['nella', 'sulla'], 0, 'Cassetto — «он», поэтому nel.'),
  ],
  7: [
    round(7, 1, 'Lui ___ un messaggio', 'ascolta', ['ascolto', 'ascolti'], 2, 'Про него говорят ascolta.'),
    round(7, 2, 'Tu ___ la radio', 'ascolti', ['ascolto', 'ascolta'], 0, 'С tu говорят ascolti.'),
    round(7, 3, 'Loro ___ la partita', 'guardano', ['guarda', 'guardo'], 1, 'Их несколько — значит guardano.'),
    round(7, 4, 'Abito ___ Lione', 'a', ['in'], 0, 'Перед названием города говорят a.'),
    round(7, 5, 'Abitiamo ___ campagna', 'in', ['a'], 1, '«За городом» — это in campagna.'),
    round(7, 6, 'Cerco le ___ chiavi', 'mie', ['mia', 'miei'], 0, 'Chiavi — «они», и их несколько: mie.'),
  ],
  8: [
    round(8, 1, 'Dove ___ le chiavi?', 'sono', ['è'], 1, 'Ключей несколько — значит sono.'),
    round(8, 2, 'Quanto ___ il biglietto?', 'costa', ['costano'], 0, 'Билет один — значит costa.'),
    round(8, 3, 'Quanto costano ___ scarpe?', 'queste', ['questa', 'questi'], 2, 'Scarpe — «они», и их несколько: queste.'),
    round(8, 4, 'Chi ___ la chiave?', 'ha', ['hai', 'ho'], 0, 'После chi говорят ha.'),
    round(8, 5, 'A che ora parte ___ treno?', 'il', ['la'], 1, 'Treno — «он», поэтому il.'),
    round(8, 6, 'Dove sono i ___ occhiali?', 'miei', ['mie', 'mio'], 0, 'Про очки говорят i miei.'),
  ],
};
