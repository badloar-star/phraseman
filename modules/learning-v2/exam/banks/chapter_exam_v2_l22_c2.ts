// chapter_exam_v2_l22_c2.ts — банк экзамена v2: урок 22, глава 2 (эпизоды 9–16).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–16 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 2 — mine, yours, his, hers, ours (эпизоды 9–12) и просьба «Could I …?» (эпизоды 13–16).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C2: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l22c2_mine_yours', label: { ru: 'моё / твоё — mine, yours', uk: 'моє / твоє — mine, yours' }, episodeOrdinals: [9, 10, 12] },
    { id: 'l22c2_his_hers_ours', label: { ru: 'его / её / наше — his, hers, ours', uk: 'його / її / наше — his, hers, ours' }, episodeOrdinals: [9, 11, 12] },
    { id: 'l22c2_could_i', label: { ru: 'можно мне — Could I pay separately?', uk: 'можна мені — Could I pay separately?' }, episodeOrdinals: [13, 14, 15, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c2-01', type: 'situation', grammarPoint: 'l22c2_mine_yours', situation: { ru: 'На полке в спортзале два одинаковых чехла для телефона. Скажи, что этот — твой.', uk: 'На полиці в спортзалі два однакові чохли для телефона. Скажи, що цей — твій.' }, accepted: ['This phone case is mine.', 'That phone case is mine.'] },
    { id: 'l22c2-02', type: 'situation', grammarPoint: 'l22c2_his_hers_ours', situation: { ru: 'В прихожей висит дождевик, который вы с мужем носите по очереди. Скажи гостю, что он ваш.', uk: 'У передпокої висить дощовик, який ви з чоловіком носите по черзі. Скажи гостеві, що він ваш.' }, accepted: ['This rain jacket is ours.', 'That rain jacket is ours.'] },
    { id: 'l22c2-03', type: 'situation', grammarPoint: 'l22c2_his_hers_ours', situation: { ru: 'Ты нашёл в ванной бритву Тома. Скажи, что она его.', uk: 'Ти знайшов у ванній бритву Тома. Скажи, що вона його.' }, accepted: ['This electric razor is his.', 'That electric razor is his.'] },
    { id: 'l22c2-04', type: 'situation', grammarPoint: 'l22c2_could_i', situation: { ru: 'Вы ужинаете с коллегой, официант несёт один счёт. Спроси, можно ли заплатить отдельно.', uk: 'Ви вечеряєте з колегою, офіціант несе один рахунок. Спитай, чи можна заплатити окремо.' }, accepted: ['Could I pay separately?', 'Can I pay separately?', 'Could we pay separately?'] },
    { id: 'l22c2-05', type: 'situation', grammarPoint: 'l22c2_could_i', situation: { ru: 'Кофеварка сломалась через день после покупки. Спроси в магазине, можно ли вернуть деньги.', uk: 'Кавоварка зламалася через день після покупки. Спитай у магазині, чи можна повернути гроші.' }, accepted: ['Could I get a refund?'] },
    { id: 'l22c2-06', type: 'situation', grammarPoint: 'l22c2_mine_yours', situation: { ru: 'Гость уходит и забывает спортивную сумку. Скажи ему, что эта сумка — его.', uk: 'Гість іде й забуває спортивну сумку. Скажи йому, що ця сумка — його.' }, accepted: ['This gym bag is yours.', 'That gym bag is yours.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c2-07', type: 'dialogue', grammarPoint: 'l22c2_mine_yours', partnerLine: 'This travel mug is mine.', situation: { ru: 'Коллега берёт со стола твою кружку. Возрази: она не его.', uk: 'Колега бере зі столу твою кружку. Заперечи: вона не його.' }, accepted: ['This travel mug is not yours.', 'That travel mug is not yours.', 'This travel mug is mine.'] },
    { id: 'l22c2-08', type: 'dialogue', grammarPoint: 'l22c2_mine_yours', partnerLine: 'These trainers are yours.', situation: { ru: 'Сосед по комнате протягивает кроссовки. Подтверди: да, они твои.', uk: 'Сусід по кімнаті простягає кросівки. Підтверди: так, вони твої.' }, accepted: ['These trainers are mine.', 'Those trainers are mine.'] },
    { id: 'l22c2-09', type: 'dialogue', grammarPoint: 'l22c2_his_hers_ours', partnerLine: 'This yoga mat is not hers.', situation: { ru: 'Подруга сомневается, что коврик — Анны. Скажи, что он её.', uk: 'Подруга сумнівається, що килимок — Анни. Скажи, що він її.' }, accepted: ['This yoga mat is hers.', 'That yoga mat is hers.'] },
    { id: 'l22c2-10', type: 'dialogue', grammarPoint: 'l22c2_his_hers_ours', partnerLine: 'This tote bag is mine.', situation: { ru: 'Брат берёт сумку сестры. Скажи, что сумка не его, а её.', uk: 'Брат бере сумку сестри. Скажи, що сумка не його, а її.' }, accepted: ['This tote bag is hers.', 'That tote bag is hers.'] },
    { id: 'l22c2-11', type: 'dialogue', grammarPoint: 'l22c2_could_i', partnerLine: 'You can book a table.', situation: { ru: 'Ты бронируешь столик в кафе и придёшь не один. Спроси, можно ли привести друга.', uk: 'Ти бронюєш столик у кафе й прийдеш не сам. Спитай, чи можна привести друга.' }, accepted: ['Could I bring a friend?'] },
    { id: 'l22c2-12', type: 'dialogue', grammarPoint: 'l22c2_could_i', partnerLine: 'I can take your booking.', situation: { ru: 'Администратор отеля готов помочь, а твои планы изменились. Спроси, можно ли отменить бронирование.', uk: 'Адміністратор готелю готовий допомогти, а твої плани змінилися. Спитай, чи можна скасувати бронювання.' }, accepted: ['Could I cancel a booking?', 'Could I cancel my booking?', 'Can I cancel my booking?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c2-13', type: 'fix', grammarPoint: 'l22c2_mine_yours', wrong: 'This phone case is my.', accepted: ['This phone case is mine.'] },
    { id: 'l22c2-14', type: 'fix', grammarPoint: 'l22c2_mine_yours', wrong: 'This gym bag is your.', accepted: ['This gym bag is yours.'] },
    { id: 'l22c2-15', type: 'fix', grammarPoint: 'l22c2_his_hers_ours', wrong: 'This woolly hat is her.', accepted: ['This woolly hat is hers.'] },
    { id: 'l22c2-16', type: 'fix', grammarPoint: 'l22c2_his_hers_ours', wrong: 'This camping chair is our.', accepted: ['This camping chair is ours.'] },
  ],
};
