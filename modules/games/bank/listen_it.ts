/**
 * Банк игры «На слух» — итальянский классический курс, уроки 1–8 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: произносится фраза урока; верный вариант дословно равен ей; два неверных отличаются
 * ровно одним словом и остаются правильными фразами из знакомых слов — это проверка слуха, а не грамматики.
 * Пояснение — перевод прозвучавшей фразы.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { listenRound } from './make_es_it';

const round = (lesson: number, n: number, text: string, wrong: readonly string[], at: number, note: string): QuizRound =>
  listenRound('it', lesson, n, text, wrong, at, note);

export const LISTEN_BANK_IT: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, 'Sono qui', ['Sei qui', 'Sono lì'], 0, 'Я здесь'),
    round(1, 2, 'Paolo è stanco', ['Paolo è solo', 'Paolo è pronto'], 1, 'Паоло уставший'),
    round(1, 3, 'La porta è aperta', ['La finestra è aperta', 'La porta è chiusa'], 2, 'Дверь открыта'),
    round(1, 4, 'Siamo alla stazione', ['Siete alla stazione', 'Sono alla stazione'], 0, 'Мы на вокзале'),
    round(1, 5, 'Le chiavi sono lì', ['Le chiavi sono qui', 'Le porte sono lì'], 1, 'Ключи там'),
    round(1, 6, 'Lea è già qui', ['Lea è già lì', 'Paolo è già qui'], 2, 'Леа уже здесь'),
  ],
  2: [
    round(2, 1, 'Non sono qui', ['Non sei qui', 'Non sono lì'], 1, 'Я не здесь'),
    round(2, 2, 'Paolo non è libero', ['Paolo non è solo', 'Paolo non è pronto'], 0, 'Паоло не свободен'),
    round(2, 3, 'Non siamo in anticipo', ['Non siamo in ritardo', 'Non siete in anticipo'], 2, 'Мы не рано'),
    round(2, 4, 'Il bar non è chiuso', ['Il bar non è aperto', 'Il museo non è chiuso'], 0, 'Кафе не закрыто'),
    round(2, 5, 'La stanza non è vuota', ['La stanza non è chiusa', 'La camera non è vuota'], 1, 'Комната не пуста'),
    round(2, 6, 'Il tavolo non è pulito', ['Il tavolo non è libero', 'Il bicchiere non è pulito'], 2, 'Стол не чистый'),
  ],
  3: [
    round(3, 1, 'Sei pronto?', ['Sei solo?', 'Sei qui?'], 0, 'Ты готов?'),
    round(3, 2, 'Il bar è chiuso?', ['Il bar è aperto?', 'Il museo è chiuso?'], 2, 'Кафе закрыто?'),
    round(3, 3, 'L’uscita è a sinistra?', ['L’uscita è a destra?', 'L’ingresso è a sinistra?'], 1, 'Выход слева?'),
    round(3, 4, 'Siamo in ritardo?', ['Siamo in anticipo?', 'Siete in ritardo?'], 0, 'Мы опаздываем?'),
    round(3, 5, 'Il treno è in orario?', ['Il treno è in ritardo?', 'Il treno è in anticipo?'], 2, 'Поезд идёт по расписанию?'),
    round(3, 6, 'La camera è pulita?', ['La camera è libera?', 'La stanza è pulita?'], 1, 'Комната чистая?'),
  ],
  4: [
    round(4, 1, 'Questo è mio fratello', ['Questo è mio padre', 'Questo è tuo fratello'], 1, 'Это мой брат'),
    round(4, 2, 'Questa è mia madre', ['Questa è mia sorella', 'Questa è tua madre'], 0, 'Это моя мать'),
    round(4, 3, 'Questa è una ricevuta', ['Questa è una fattura', 'Questa è una tessera'], 2, 'Это квитанция об оплате'),
    round(4, 4, 'Questi sono i nostri biglietti', ['Questi sono i vostri biglietti', 'Questi sono i nostri posti'], 0, 'Это наши билеты'),
    round(4, 5, 'Questo è un regalo', ['Questo è un vicino', 'Questo è un biglietto'], 1, 'Это подарок'),
    round(4, 6, 'Questa è la nostra fermata', ['Questa è la mia fermata', 'Questa è la nostra camera'], 2, 'Это наша остановка'),
  ],
  5: [
    round(5, 1, 'Ho fame', ['Hai fame', 'Ho sete'], 0, 'Я голоден'),
    round(5, 2, 'Abbiamo freddo', ['Abbiamo caldo', 'Avete freddo'], 1, 'Нам холодно'),
    round(5, 3, 'Ho mal di gola', ['Ho mal di schiena', 'Hai mal di gola'], 2, 'У меня болит горло'),
    round(5, 4, 'Lea ha trent’anni', ['Lea ha vent’anni', 'Paolo ha trent’anni'], 0, 'Леа тридцать лет'),
    round(5, 5, 'Hai tempo?', ['Ha tempo?', 'Ho tempo?'], 1, 'У тебя есть время?'),
    round(5, 6, 'Abbiamo tre posti', ['Abbiamo due posti', 'Abbiamo dieci posti'], 2, 'У нас три места'),
  ],
  6: [
    round(6, 1, 'Mi piace il caffè', ['Mi piace il tè', 'Ti piace il caffè'], 1, 'Мне нравится кофе'),
    round(6, 2, 'Il pane è sul tavolo', ['Il pane è sul letto', 'Il nome è sul tavolo'], 0, 'Хлеб на столе'),
    round(6, 3, 'La zuppa è calda', ['La zuppa è fredda', 'La zuppa è pronta'], 2, 'Суп горячий'),
    round(6, 4, 'La sciarpa è sul letto', ['La giacca è sul letto', 'La sciarpa è sul tavolo'], 0, 'Шарф на кровати'),
    round(6, 5, 'L’ascensore è a sinistra', ['L’ascensore è a destra', 'L’ingresso è a sinistra'], 1, 'Лифт слева'),
    round(6, 6, 'La banca è chiusa', ['La banca è aperta', 'La scuola è chiusa'], 2, 'Банк закрыт'),
  ],
  7: [
    round(7, 1, 'Lavoro qui', ['Lavori qui', 'Lavora qui'], 0, 'Я работаю здесь'),
    round(7, 2, 'Parlo francese', ['Parli francese', 'Parlo inglese'], 2, 'Я говорю по-французски'),
    round(7, 3, 'Abitiamo in campagna', ['Abitate in campagna', 'Abitiamo in città'], 1, 'Мы живём за городом'),
    round(7, 4, 'Preparo la cena', ['Prepari la cena', 'Preparo la zuppa'], 0, 'Я готовлю ужин'),
    round(7, 5, 'Ordino un tè', ['Ordino un caffè', 'Ordiniamo un tè'], 2, 'Я заказываю чай'),
    round(7, 6, 'Cerchiamo un appartamento', ['Cerchiamo un albergo', 'Cerchiamo un indirizzo'], 1, 'Мы ищем квартиру'),
  ],
  8: [
    round(8, 1, 'Dove abiti?', ['Dove sei?', 'Dove lavori?'], 1, 'Где ты живёшь?'),
    round(8, 2, 'Quando arrivi?', ['Quando parte?', 'Quando torni?'], 0, 'Когда ты приезжаешь?'),
    round(8, 3, 'Quanto costa il biglietto?', ['Quanto costa il regalo?', 'Quanto costa il pane?'], 2, 'Сколько стоит билет?'),
    round(8, 4, 'A che ora apre il museo?', ['A che ora chiude il museo?', 'A che ora apre il mercato?'], 0, 'Во сколько открывается музей?'),
    round(8, 5, 'Chi lavora qui?', ['Chi abita qui?', 'Chi lavora lì?'], 1, 'Кто работает здесь?'),
    round(8, 6, 'Dov’è l’uscita?', ['Dov’è l’ingresso?', 'Dov’è l’ufficio?'], 2, 'Где выход?'),
  ],
};
