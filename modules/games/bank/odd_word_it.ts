/**
 * Банк игры «Лишнее слово» — итальянский классический курс, уроки 1–8 (D207). 8 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: без лишнего слова остаётся фраза урока (или фраза из слов этого и прошлых уроков);
 * с лишним словом фраза неверна; убрав любое ДРУГОЕ слово, верную фразу не получить.
 * Особенность итальянского: подлежащее часто опускают, поэтому «Sono [sei] qui» — негодное задание
 * (без sono остаётся верное «Sei qui»). Там, где лишняя форма «быть», «иметь» или действия, подлежащее
 * названо и это не имя: «Paolo sono a casa» читалось бы как обращение «Паоло, я дома».
 * Апостроф в словах — типографский (’), как в уроках.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { OddWordTask } from '../odd_word_core';
import { oddTask } from './make_es_it';

const task = (lesson: number, n: number, marked: string, translation: string, whyText: string): OddWordTask =>
  oddTask('it', lesson, n, marked, translation, whyText);

export const ODD_WORD_BANK_IT: Readonly<Record<number, readonly OddWordTask[]>> = {
  1: [
    task(1, 1, 'Lei [sono] è in ufficio', 'Она в офисе', 'Про неё говорят è. Sono — про себя или про них.'),
    task(1, 2, 'La finestra è [chiuso] chiusa', 'Окно закрыто', 'Finestra — «она», поэтому chiusa.'),
    task(1, 3, 'Le porte sono [aperta] aperte', 'Двери открыты', 'Дверей несколько — значит aperte.'),
    task(1, 4, 'Loro [è] sono lì', 'Они там', 'Их несколько — значит sono.'),
    task(1, 5, 'I negozi sono [chiuso] chiusi', 'Магазины закрыты', 'Магазинов несколько — значит chiusi.'),
    task(1, 6, 'La [il] chiave è qui', 'Ключ здесь', 'Chiave — «она», поэтому la.'),
    task(1, 7, 'Lea è [a] qui', 'Леа здесь', 'Qui обходится без a.'),
    task(1, 8, 'Il [la] bar è chiuso', 'Кафе закрыто', 'Bar — «он», поэтому il.'),
  ],
  2: [
    task(2, 1, 'Lei non [sono] è lì', 'Она не там', 'Про неё говорят è, а не sono.'),
    task(2, 2, 'La camera non è [libero] libera', 'Номер не свободен', 'Camera — «она», поэтому libera.'),
    task(2, 3, 'La porta non è [aperto] aperta', 'Дверь не открыта', 'Porta — «она», поэтому aperta.'),
    task(2, 4, 'I negozi non [è] sono aperti', 'Магазины не открыты', 'Магазинов несколько — значит sono.'),
    task(2, 5, 'Il [la] biglietto non è nella borsa', 'Билет не в сумке', 'Biglietto — «он», поэтому il.'),
    task(2, 6, 'Le scarpe non sono [pulito] pulite', 'Туфли не чистые', 'Туфель несколько — значит pulite.'),
    task(2, 7, 'Il treno non è [a] in ritardo', 'Поезд не опаздывает', '«С опозданием» — это in ritardo, без a.'),
    task(2, 8, 'Loro non [siamo] sono fuori', 'Они не снаружи', 'Про них говорят sono. Siamo — про нас.'),
  ],
  3: [
    task(3, 1, 'Il treno [sono] è in orario?', 'Поезд идёт по расписанию?', 'Поезд один — значит è.'),
    task(3, 2, 'La sala è [libero] libera?', 'Зал свободен?', 'Sala — «она», поэтому libera.'),
    task(3, 3, 'I bambini [è] sono pronti?', 'Дети готовы?', 'Детей несколько — значит sono.'),
    task(3, 4, 'Il [la] parcheggio è a destra?', 'Парковка справа?', 'Parcheggio — «он», поэтому il.'),
    task(3, 5, 'L’uscita è [in] a sinistra?', 'Выход слева?', '«Слева» — это a sinistra, без in.'),
    task(3, 6, 'Le chiavi [è] sono qui?', 'Ключи здесь?', 'Ключей несколько — значит sono.'),
    task(3, 7, 'La farmacia è [aperto] aperta stasera?', 'Аптека открыта сегодня вечером?', 'Farmacia — «она», поэтому aperta.'),
    task(3, 8, 'Entrambe le porte sono [chiuso] chiuse?', 'Обе двери закрыты?', 'Дверей две — значит chiuse.'),
  ],
  4: [
    task(4, 1, 'Questa [questo] è mia sorella', 'Это моя сестра', 'Про сестру говорят questa.'),
    task(4, 2, 'Questo è [mia] mio fratello', 'Это мой брат', 'Брат — «он», поэтому mio.'),
    task(4, 3, 'Questi [questo] sono i miei amici', 'Это мои друзья', 'Друзей несколько — значит questi.'),
    task(4, 4, 'Queste [è] sono le mie chiavi', 'Это мои ключи', 'Ключей несколько — значит sono.'),
    task(4, 5, 'Questa è [un] una chiave', 'Это ключ', 'Chiave — «она», поэтому una.'),
    task(4, 6, 'Questo è [una] un regalo', 'Это подарок', 'Regalo — «он», поэтому un.'),
    task(4, 7, 'Questa non è la [mio] mia borsa', 'Это не моя сумка', 'Borsa — «она», поэтому mia.'),
    task(4, 8, 'Questo non è [la] il tuo posto', 'Это не твоё место', 'Posto — «он», поэтому il.'),
  ],
  5: [
    task(5, 1, 'Lui [ho] ha una borsa', 'У него есть сумка', 'Про него говорят ha. Ho — только про себя.'),
    task(5, 2, 'Loro [ha] hanno un biglietto', 'У них есть один билет', 'Их несколько — значит hanno.'),
    task(5, 3, 'Ho [sono] fame', 'Я голоден', '«Я голоден» — это ho fame, без sono.'),
    task(5, 4, 'Abbiamo [siamo] freddo', 'Нам холодно', '«Нам холодно» — это abbiamo freddo, без siamo.'),
    task(5, 5, 'Lea ha una [un] carta', 'У Леа есть карточка', 'Carta — «она», поэтому una.'),
    task(5, 6, 'Ho bisogno [a] di aiuto', 'Мне нужна помощь', 'После bisogno идёт di.'),
    task(5, 7, 'I bambini [ha] hanno fame', 'Дети голодны', 'Детей несколько — значит hanno.'),
    task(5, 8, 'Hai [il] la ricevuta?', 'У тебя есть чек?', 'Ricevuta — «она», поэтому la.'),
  ],
  6: [
    task(6, 1, 'La chiave è [sulla] sul tavolo', 'Ключ на столе', 'Tavolo — «он», поэтому sul.'),
    task(6, 2, 'Mi [piacciono] piace il caffè', 'Мне нравится кофе', 'Кофе один — значит piace.'),
    task(6, 3, 'Ci [piace] piacciono i libri', 'Нам нравятся книги', 'Книг несколько — значит piacciono.'),
    task(6, 4, 'Gli occhiali [è] sono sul letto', 'Очки на кровати', 'Про очки говорят sono.'),
    task(6, 5, 'La zuppa è [caldo] calda', 'Суп горячий', 'Zuppa — «она», поэтому calda.'),
    task(6, 6, 'I bicchieri sono [pulito] puliti', 'Стаканы чистые', 'Стаканов несколько — значит puliti.'),
    task(6, 7, 'Lo zaino è [sul] sulla sedia', 'Рюкзак на стуле', 'Sedia — «она», поэтому sulla.'),
    task(6, 8, 'Il [la] portafoglio è nel cassetto', 'Кошелёк в ящике', 'Portafoglio — «он», поэтому il.'),
  ],
  7: [
    task(7, 1, 'Lui [ascolto] ascolta un messaggio', 'Он слушает сообщение', 'Про него говорят ascolta. Ascolto — про себя.'),
    task(7, 2, 'Lei [parlo] parla inglese', 'Она говорит по-английски', 'Про неё говорят parla. Parlo — про себя.'),
    task(7, 3, 'Loro [guarda] guardano la partita', 'Они смотрят матч', 'Их несколько — значит guardano.'),
    task(7, 4, 'Tu [ascolto] ascolti la radio', 'Ты слушаешь радио', 'С tu говорят ascolti. Ascolto — про себя.'),
    task(7, 5, 'Ascolto [il] la radio', 'Я слушаю радио', 'Radio — «она», поэтому la.'),
    task(7, 6, 'Cerco le [mia] mie chiavi', 'Я ищу свои ключи', 'Ключей несколько — значит mie.'),
    task(7, 7, 'Abito [in] a Lione', 'Я живу в Лионе', 'Перед названием города говорят a.'),
    task(7, 8, 'Lea guarda [il] i prezzi', 'Леа смотрит цены', 'Цен несколько — значит i.'),
  ],
  8: [
    task(8, 1, 'Dove [è] sono le chiavi?', 'Где ключи?', 'Ключей несколько — значит sono.'),
    task(8, 2, 'Quanto [costano] costa il biglietto?', 'Сколько стоит билет?', 'Билет один — значит costa.'),
    task(8, 3, 'Quanto costano [questa] queste scarpe?', 'Сколько стоят эти туфли?', 'Туфель несколько — значит queste.'),
    task(8, 4, 'Chi [hai] ha la chiave?', 'У кого ключ?', 'После chi говорят ha.'),
    task(8, 5, 'A che ora parte [la] il treno?', 'Во сколько отправляется поезд?', 'Treno — «он», поэтому il.'),
    task(8, 6, 'Dove sono i [mio] miei occhiali?', 'Где мои очки?', 'Про очки говорят i miei.'),
    task(8, 7, 'Quando chiude [il] la banca?', 'Когда закрывается банк?', 'Banca — «она», поэтому la.'),
    task(8, 8, 'Chi [lavori] lavora qui?', 'Кто работает здесь?', 'После chi говорят lavora.'),
  ],
};
