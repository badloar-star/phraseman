/**
 * Банк игры «Точное слово» — итальянский классический курс, уроки 1–24 (D207). 6 заданий на урок.
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
  9: [
    round(9, 1, 'Le ___ chiavi sono qui', 'mie', ['mia', 'miei'], 0, 'Chiave — «она», ключей несколько: mie.'),
    round(9, 2, 'Il nostro treno ___ al binario', 'è', ['sono'], 1, 'Поезд один — значит è.'),
    round(9, 3, 'La loro camera è ___', 'libera', ['libero'], 0, 'Camera — «она», поэтому libera.'),
    round(9, 4, 'I ___ colleghi sono in ufficio', 'miei', ['mie', 'mio'], 2, 'Colleghi — «они», поэтому miei.'),
    round(9, 5, 'La ___ borsa è qui', 'tua', ['tuo', 'tue'], 1, 'Borsa — «она», и она одна: tua.'),
    round(9, 6, 'I nostri biglietti sono ___', 'pronti', ['pronto'], 0, 'Билетов несколько — значит pronti.'),
  ],
  10: [
    round(10, 1, '___ due panchine', 'Ci sono', ['C’è'], 1, 'Скамеек две — ci sono.'),
    round(10, 2, 'C’è ___ ascensore in hotel', 'un', ['una'], 0, 'Ascensore — «он», поэтому un.'),
    round(10, 3, 'C’è ___ pane', 'del', ['dei'], 0, 'Pane — «он», поэтому del.'),
    round(10, 4, 'Ci sono ___ libri sul tavolo', 'dei', ['del'], 1, 'Книг несколько — значит dei.'),
    round(10, 5, 'Sulla scrivania c’è ___ schermo', 'uno', ['un'], 1, 'Перед schermo говорят uno.'),
    round(10, 6, 'C’è un orologio ___ cucina', 'in', ['a'], 0, '«На кухне» — in cucina.'),
  ],
  11: [
    round(11, 1, 'Lei ___ al mercato', 'va', ['vado', 'vai'], 2, 'Про неё говорят va.'),
    round(11, 2, 'Loro ___ in ufficio', 'vanno', ['va'], 0, 'Их несколько — значит vanno.'),
    round(11, 3, 'Io vado ___ Lione', 'a', ['in'], 1, 'Перед названием города говорят a.'),
    round(11, 4, 'Noi andiamo ___ Francia', 'in', ['a'], 0, 'Перед названием страны говорят in.'),
    round(11, 5, 'Vado ___ farmacia', 'in', ['a'], 1, 'Так говорят: in farmacia.'),
    round(11, 6, 'Noi ___ a scuola', 'andiamo', ['vanno', 'vado'], 0, 'С noi говорят andiamo.'),
  ],
  12: [
    round(12, 1, 'Prendo ___ pane', 'del', ['della', 'dei'], 0, 'Pane — «он», поэтому del.'),
    round(12, 2, 'Mangiamo ___ pasta', 'della', ['del'], 1, 'Pasta — «она», поэтому della.'),
    round(12, 3, 'Mangiano ___ fragole', 'delle', ['della'], 0, 'Ягод много — значит delle.'),
    round(12, 4, 'Lui ___ del formaggio', 'prende', ['prendo', 'prendi'], 2, 'Про него говорят prende.'),
    round(12, 5, 'Lui non ___ caffè', 'beve', ['bevo'], 1, 'Про него говорят beve.'),
    round(12, 6, 'Prendiamo ___ bottiglia di latte', 'una', ['un'], 0, 'Bottiglia — «она», поэтому una.'),
  ],
  13: [
    round(13, 1, 'La giacca è ___', 'leggera', ['leggeri'], 0, 'Giacca — «она», поэтому leggera.'),
    round(13, 2, 'Le scatole sono ___', 'piene', ['piena'], 1, 'Коробок несколько — значит piene.'),
    round(13, 3, 'Il maglione è ___', 'verde', ['verdi'], 0, 'Свитер один — значит verde.'),
    round(13, 4, 'Cerco una borsa ___', 'nera', ['neri'], 1, 'Borsa — «она», поэтому nera.'),
    round(13, 5, 'I bicchieri ___ vuoti', 'sono', ['è'], 0, 'Стаканов несколько — значит sono.'),
    round(13, 6, 'La camicia è ___', 'bianca', ['bianco', 'bianchi'], 2, 'Camicia — «она», поэтому bianca.'),
  ],
  14: [
    round(14, 1, 'Lei ___ venire', 'può', ['posso', 'puoi'], 2, 'Про неё говорят può.'),
    round(14, 2, 'Noi ___ pagare', 'dobbiamo', ['devo'], 0, 'Про нас говорят dobbiamo.'),
    round(14, 3, 'Loro ___ cambiare posto', 'vogliono', ['vuole'], 1, 'Их несколько — значит vogliono.'),
    round(14, 4, 'Lui deve ___ a casa', 'tornare', ['torna'], 0, 'После deve слово не меняется: tornare.'),
    round(14, 5, 'Puoi ___ la porta?', 'chiudere', ['chiudi'], 1, 'После puoi слово не меняется: chiudere.'),
    round(14, 6, 'Io non ___ disturbare', 'voglio', ['vuole'], 1, 'Про себя говорят voglio.'),
  ],
  15: [
    round(15, 1, 'Ana ___ scrivendo una lettera', 'sta', ['sto', 'stai'], 0, 'Про Ану говорят sta.'),
    round(15, 2, 'Noi ___ mangiando a casa', 'stiamo', ['stanno'], 1, 'Про нас говорят stiamo.'),
    round(15, 3, 'Lui sta ___ il libro', 'leggendo', ['leggere'], 0, 'После sta — leggendo.'),
    round(15, 4, 'I miei fratelli ___ pagando in contanti', 'stanno', ['sta'], 1, 'Братьев несколько — значит stanno.'),
    round(15, 5, 'Lei sta lavando ___ piatti', 'i', ['il'], 0, 'Тарелок несколько — значит i.'),
    round(15, 6, 'Ana sta bevendo ___ caffè', 'un', ['una'], 1, 'Caffè — «он», поэтому un.'),
  ],
  16: [
    round(16, 1, 'Chiudi ___ porta!', 'la', ['il'], 0, 'Porta — «она», поэтому la.'),
    round(16, 2, 'Prendi ___ giacca!', 'la', ['le'], 1, 'Куртка одна — значит la.'),
    round(16, 3, 'Tieni ___ biglietto!', 'il', ['la'], 0, 'Biglietto — «он», поэтому il.'),
    round(16, 4, 'Prema il pulsante ___', 'verde', ['verdi'], 1, 'Кнопка одна — значит verde.'),
    round(16, 5, 'Metti via ___ scarpe!', 'le', ['la'], 1, 'Туфель пара — значит le.'),
    round(16, 6, 'Apri ___ finestra!', 'la', ['il'], 0, 'Finestra — «она», поэтому la.'),
  ],
  17: [
    round(17, 1, 'Lei si ___ presto', 'alza', ['alzo', 'alzano'], 1, 'Про неё говорят alza.'),
    round(17, 2, 'I bambini si ___ la faccia', 'lavano', ['lava'], 0, 'Детей несколько — значит lavano.'),
    round(17, 3, 'Noi ci ___ presto', 'alziamo', ['alza'], 1, 'Про нас говорят alziamo.'),
    round(17, 4, 'Mi lavo ___ denti', 'i', ['le'], 0, 'Dente — «он», поэтому i denti.'),
    round(17, 5, 'Lei si lava ___ mani', 'le', ['i'], 1, 'Mano — «она», поэтому le mani.'),
    round(17, 6, 'Ti svegli ___ sette', 'alle', ['a'], 0, 'Время называют так: alle sette.'),
  ],
  18: [
    round(18, 1, 'Lei ___ chiuso la finestra', 'ha', ['ho', 'hanno'], 2, 'Про неё говорят ha.'),
    round(18, 2, 'Noi ___ visto il film', 'abbiamo', ['hanno'], 0, 'Про нас говорят abbiamo.'),
    round(18, 3, 'Lui ha ___ il conto', 'pagato', ['pagare'], 1, 'После ha — pagato.'),
    round(18, 4, 'Ho ___ il treno', 'preso', ['prendo'], 0, 'После ho — preso.'),
    round(18, 5, 'Lei ha trovato ___ chiavi', 'le', ['la'], 1, 'Ключей несколько — значит le.'),
    round(18, 6, 'Loro non ___ capito le istruzioni', 'hanno', ['ha'], 1, 'Их несколько — значит hanno.'),
  ],
  19: [
    round(19, 1, 'Mia sorella è ___', 'arrivata', ['arrivato'], 0, 'Сестра — «она», поэтому arrivata.'),
    round(19, 2, 'Mio padre è ___ a casa tardi', 'tornato', ['tornata'], 1, 'Отец — «он», поэтому tornato.'),
    round(19, 3, 'I bambini ___ usciti in cortile', 'sono', ['è'], 0, 'Детей несколько — значит sono.'),
    round(19, 4, 'Le mie sorelle sono ___ al concerto', 'andate', ['andati'], 1, 'Сёстры — женщины, поэтому andate.'),
    round(19, 5, 'La chiave è ___ sotto il tavolo', 'caduta', ['caduto'], 0, 'Chiave — «она», поэтому caduta.'),
    round(19, 6, 'I miei genitori sono ___ al mercato', 'andati', ['andata', 'andate'], 2, 'Родителей двое — значит andati.'),
  ],
  20: [
    round(20, 1, 'Lei ___ spesso sola', 'era', ['ero', 'erano'], 1, 'Про неё говорят era.'),
    round(20, 2, 'Le finestre ___ aperte', 'erano', ['era'], 0, 'Окон несколько — значит erano.'),
    round(20, 3, 'Noi ___ in campagna', 'vivevamo', ['vivevano'], 1, 'Про нас говорят vivevamo.'),
    round(20, 4, 'I bambini ___ freddo', 'avevano', ['aveva'], 0, 'Детей несколько — значит avevano.'),
    round(20, 5, 'I negozi erano ___ il lunedì', 'chiusi', ['chiuse'], 1, 'Negozio — «он», поэтому chiusi.'),
    round(20, 6, 'Lei viveva ___ Lione', 'a', ['in'], 0, 'С городом — a: a Lione.'),
  ],
  21: [
    round(21, 1, 'Lei ___ quando hai chiamato', 'dormiva', ['dormivo'], 1, 'Про неё говорят dormiva.'),
    round(21, 2, 'Noi ___ mangiando quando è arrivato Paolo', 'stavamo', ['stavo', 'stavano'], 0, 'Про нас говорят stavamo.'),
    round(21, 3, 'Loro ___ parlando', 'stavano', ['stavamo'], 1, 'Про них говорят stavano.'),
    round(21, 4, 'Lea camminava quando ha cominciato ___ piovere', 'a', ['di'], 0, 'Начать что-то делать — cominciare a.'),
    round(21, 5, 'Mentre aspettavamo, è uscito ___ dottore', 'il', ['la'], 1, 'Dottore — «он», поэтому il.'),
    round(21, 6, 'Le persiane erano ___', 'chiuse', ['chiusi'], 0, 'Persiana — «она», поэтому chiuse.'),
  ],
  22: [
    round(22, 1, 'Lei lo ___', 'cerca', ['cerco'], 1, 'Про неё говорят cerca.'),
    round(22, 2, 'Noi non li ___', 'vediamo', ['vedo'], 0, 'Про нас говорят vediamo.'),
    round(22, 3, 'Loro non lo ___', 'prendono', ['prendo'], 1, 'Про них говорят prendono.'),
    round(22, 4, 'Vorrei ___', 'provarlo', ['provo'], 0, 'После vorrei — provarlo.'),
    round(22, 5, 'Possiamo ___ online', 'comprarli', ['compriamo'], 1, 'После possiamo — comprarli.'),
    round(22, 6, 'Il giornale, preferisco ___ domani', 'leggerlo', ['leggo'], 0, 'После preferisco — leggerlo.'),
  ],
  23: [
    round(23, 1, 'Lui le ___', 'risponde', ['rispondo'], 1, 'Про него говорят risponde.'),
    round(23, 2, 'Lui gli manda ___ foto', 'una', ['un'], 0, 'Foto — «она», поэтому una.'),
    round(23, 3, 'Loro gli ___ un bicchiere d’acqua', 'portano', ['porto'], 1, 'Про них говорят portano.'),
    round(23, 4, 'Noi non le ___ niente', 'diciamo', ['dice'], 0, 'Про нас говорят diciamo.'),
    round(23, 5, 'Gli spiego ___ regole del gioco', 'le', ['la'], 1, 'Правил несколько — значит le.'),
    round(23, 6, 'Gli presto la ___ penna', 'mia', ['mio'], 0, 'Penna — «она», поэтому mia.'),
  ],
  24: [
    round(24, 1, 'Lui ci ___ a piedi', 'va', ['vado', 'vanno'], 2, 'Про него говорят va.'),
    round(24, 2, 'Noi ci ___ in autobus', 'andiamo', ['vado'], 0, 'Про нас говорят andiamo.'),
    round(24, 3, 'Lei ci ___ con sua sorella', 'abita', ['abito'], 1, 'Про неё говорят abita.'),
    round(24, 4, 'Lei ci è già ___', 'stata', ['stato'], 0, 'Про неё — stata.'),
    round(24, 5, 'Lei non ci ___ il lunedì', 'lavora', ['lavoro'], 1, 'Про неё говорят lavora.'),
    round(24, 6, 'Ci andiamo ___ pranzo', 'a', ['in'], 0, 'На обед — a pranzo.'),
  ],
};
