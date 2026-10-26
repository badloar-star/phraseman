// chapter_exam_v2_l21_c6.ts — банк экзамена v2: урок 21, глава 6 (эпизоды 41–48).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–48 урока 21, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 6 — действие + to (врач, очередь, анкета, дорога: эпизоды 41–44) и I want to / I need to (магазин, кухня, поездка: эпизоды 45–48).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L21_C6: ChapterExamV2Bank = {
  lessonOrdinal: 21,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l21c6_health', label: { ru: 'зачем — врач и очередь: I make an appointment to …', uk: 'навіщо — лікар і черга: I make an appointment to …' }, episodeOrdinals: [41, 42] },
    { id: 'l21c6_forms_way', label: { ru: 'зачем — анкета и дорога: I read a map to …', uk: 'навіщо — анкета й дорога: I read a map to …' }, episodeOrdinals: [43, 44] },
    { id: 'l21c6_want_need', label: { ru: 'хочу, нужно — I want to, I need to …', uk: 'хочу, треба — I want to, I need to …' }, episodeOrdinals: [45, 46, 47, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l21c6-01', type: 'situation', grammarPoint: 'l21c6_health', situation: { ru: 'У тебя болит зуб. Скажи, что записываешься на приём, чтобы попасть к стоматологу.', uk: 'У тебе болить зуб. Скажи, що записуєшся на прийом, щоб потрапити до стоматолога.' }, accepted: ['I make an appointment to see the dentist.'] },
    { id: 'l21c6-02', type: 'situation', grammarPoint: 'l21c6_forms_way', situation: { ru: 'В анкете ты пишешь имя печатными буквами. Объясни, что так его легко прочитать.', uk: 'В анкеті ти пишеш імʼя друкованими літерами. Поясни, що так його легко прочитати.' }, accepted: ['I use block capitals to make my name clear.'] },
    { id: 'l21c6-03', type: 'situation', grammarPoint: 'l21c6_forms_way', situation: { ru: 'Ты заблудился в чужом городе. Скажи, что спрашиваешь дорогу, чтобы найти вокзал.', uk: 'Ти заблукав у чужому місті. Скажи, що питаєш дорогу, щоб знайти вокзал.' }, accepted: ['I ask for directions to find the station.'] },
    { id: 'l21c6-04', type: 'situation', grammarPoint: 'l21c6_want_need', situation: { ru: 'Ты в магазине одежды. Скажи продавцу, что хочешь примерить эту куртку.', uk: 'Ти в магазині одягу. Скажи продавцеві, що хочеш приміряти цю куртку.' }, accepted: ['I want to try on this jacket.'] },
    { id: 'l21c6-05', type: 'situation', grammarPoint: 'l21c6_want_need', situation: { ru: 'Гости придут через десять минут. Скажи, что тебе нужно накрыть на стол.', uk: 'Гості прийдуть за десять хвилин. Скажи, що тобі треба накрити на стіл.' }, accepted: ['I need to set the table.', 'I want to set the table.'] },
    { id: 'l21c6-06', type: 'situation', grammarPoint: 'l21c6_health', situation: { ru: 'Ты идёшь в аптеку за лекарством по рецепту. Объясни зачем.', uk: 'Ти йдеш в аптеку по ліки за рецептом. Поясни навіщо.' }, accepted: ['I collect a prescription to get my medicine.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c6-07', type: 'dialogue', grammarPoint: 'l21c6_want_need', partnerLine: 'You can keep these shoes.', situation: { ru: 'Продавец уговаривает оставить туфли, которые жмут. Скажи, что хочешь их обменять.', uk: 'Продавець умовляє залишити туфлі, які тиснуть. Скажи, що хочеш їх обміняти.' }, accepted: ['I want to exchange these shoes.'] },
    { id: 'l21c6-08', type: 'dialogue', grammarPoint: 'l21c6_want_need', partnerLine: 'The bus is at the station.', situation: { ru: 'Друг говорит, что автобус уже на остановке. Скажи, что тебе нужно на него успеть.', uk: 'Друг каже, що автобус уже на зупинці. Скажи, що тобі треба на нього встигнути.' }, accepted: ['I need to catch the bus.'] },
    { id: 'l21c6-09', type: 'dialogue', grammarPoint: 'l21c6_health', partnerLine: 'I want to go first.', situation: { ru: 'Мужчина пытается пройти без очереди. Скажи, что хочешь, чтобы он дождался своей очереди.', uk: 'Чоловік намагається пройти без черги. Скажи, що хочеш, щоб він дочекався своєї черги.' }, accepted: ['I want you to wait your turn.'] },
    { id: 'l21c6-10', type: 'dialogue', grammarPoint: 'l21c6_forms_way', partnerLine: 'I cannot find the exit.', situation: { ru: 'Друг не может найти выход из торгового центра. Скажи, что идёшь по указателям, чтобы дойти до выхода.', uk: 'Друг не може знайти вихід із торгового центру. Скажи, що йдеш за вказівниками, щоб дійти до виходу.' }, accepted: ['I follow the signs to reach the exit.'] },
    { id: 'l21c6-11', type: 'dialogue', grammarPoint: 'l21c6_want_need', partnerLine: 'We can order a takeaway.', situation: { ru: 'Друг хочет заказать еду на дом. Скажи, что сегодня хочешь приготовить всё сам с нуля.', uk: 'Друг хоче замовити їжу додому. Скажи, що сьогодні хочеш приготувати все сам з нуля.' }, accepted: ['I want to cook from scratch today.', 'I want to cook from scratch.'] },
    { id: 'l21c6-12', type: 'dialogue', grammarPoint: 'l21c6_health', partnerLine: 'You need new glasses.', situation: { ru: 'Друг замечает, что ты щуришься. Скажи, что записываешься на проверку зрения, чтобы получить новые очки.', uk: 'Друг помічає, що ти мружишся. Скажи, що записуєшся на перевірку зору, щоб отримати нові окуляри.' }, accepted: ['I book an eye test to get new glasses.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c6-13', type: 'fix', grammarPoint: 'l21c6_forms_way', wrong: 'I read a map for choose a route.', accepted: ['I read a map to choose a route.'] },
    { id: 'l21c6-14', type: 'fix', grammarPoint: 'l21c6_want_need', wrong: 'I need do the washing-up.', accepted: ['I need to do the washing-up.'] },
    { id: 'l21c6-15', type: 'fix', grammarPoint: 'l21c6_health', wrong: 'I call the clinic for arrange a hearing test.', accepted: ['I call the clinic to arrange a hearing test.'] },
    { id: 'l21c6-16', type: 'fix', grammarPoint: 'l21c6_want_need', wrong: 'I do not want skip breakfast.', accepted: ['I do not want to skip breakfast.'] },
  ],
};
