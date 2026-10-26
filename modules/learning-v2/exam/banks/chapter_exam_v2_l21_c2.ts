// chapter_exam_v2_l21_c2.ts — банк экзамена v2: урок 21, глава 2 (эпизоды 9–16).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–16 урока 21, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 2 — I hope / plan / intend / want / need to + действие (эпизоды 9–16).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L21_C2: ChapterExamV2Bank = {
  lessonOrdinal: 21,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l21c2_hope', label: { ru: 'надеюсь — I hope to …', uk: 'сподіваюся — I hope to …' }, episodeOrdinals: [10, 11, 12, 15] },
    { id: 'l21c2_plan_intend', label: { ru: 'собираюсь — I plan to, I intend to …', uk: 'збираюся — I plan to, I intend to …' }, episodeOrdinals: [9, 10, 12, 13] },
    { id: 'l21c2_want_need', label: { ru: 'хочу, нужно — I want to, I need to …', uk: 'хочу, треба — I want to, I need to …' }, episodeOrdinals: [11, 14, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l21c2-01', type: 'situation', grammarPoint: 'l21c2_hope', situation: { ru: 'Ты всю неделю работал допоздна. Скажи другу, что надеешься завтра выспаться.', uk: 'Ти весь тиждень працював допізна. Скажи другові, що сподіваєшся завтра виспатися.' }, accepted: ['I hope to sleep in tomorrow.', 'I want to sleep in tomorrow.'] },
    { id: 'l21c2-02', type: 'situation', grammarPoint: 'l21c2_hope', situation: { ru: 'Под раковиной течёт вода. Скажи соседу, что надеешься сам устранить протечку.', uk: 'Під раковиною тече вода. Скажи сусідові, що сподіваєшся сам усунути протікання.' }, accepted: ['I hope to fix the leak.', 'I plan to fix the leak.', 'I want to fix the leak.'] },
    { id: 'l21c2-03', type: 'situation', grammarPoint: 'l21c2_plan_intend', situation: { ru: 'Друг удивляется, что у тебя в поездку один рюкзак. Скажи, что собираешься ехать налегке.', uk: 'Друг дивується, що в тебе в поїздку один рюкзак. Скажи, що збираєшся їхати налегці.' }, accepted: ['I plan to travel light.', 'I intend to travel light.', 'I want to travel light.'] },
    { id: 'l21c2-04', type: 'situation', grammarPoint: 'l21c2_plan_intend', situation: { ru: 'Тебе не нравится новая работа. Скажи сестре, что собираешься уволиться.', uk: 'Тобі не подобається нова робота. Скажи сестрі, що збираєшся звільнитися.' }, accepted: ['I intend to resign.', 'I plan to resign.', 'I want to resign.'] },
    { id: 'l21c2-05', type: 'situation', grammarPoint: 'l21c2_want_need', situation: { ru: 'Друг ждёт тебя у двери, а ты ещё не собрался. Скажи, что тебе нужно собраться.', uk: 'Друг чекає на тебе біля дверей, а ти ще не зібрався. Скажи, що тобі треба зібратися.' }, accepted: ['I need to get ready.', 'I want to get ready.'] },
    { id: 'l21c2-06', type: 'situation', grammarPoint: 'l21c2_hope', situation: { ru: 'Ты третий год платишь кредит. Скажи, что надеешься скоро его погасить.', uk: 'Ти третій рік сплачуєш кредит. Скажи, що сподіваєшся скоро його погасити.' }, accepted: ['I hope to pay off my loan soon.', 'I hope to pay off my loan.', 'I plan to pay off my loan soon.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c2-07', type: 'dialogue', grammarPoint: 'l21c2_plan_intend', partnerLine: 'We can book tomorrow.', situation: { ru: 'Друг не торопится с бронированием. Скажи, что ты собираешься забронировать заранее.', uk: 'Друг не поспішає з бронюванням. Скажи, що ти збираєшся забронювати заздалегідь.' }, accepted: ['I intend to book ahead.', 'I plan to book ahead.', 'I want to book ahead.'] },
    { id: 'l21c2-08', type: 'dialogue', grammarPoint: 'l21c2_want_need', partnerLine: 'This is the address.', situation: { ru: 'Друг диктует адрес по телефону, а связь плохая. Скажи, что не хочешь ослышаться.', uk: 'Друг диктує адресу по телефону, а звʼязок поганий. Скажи, що не хочеш недочути.' }, accepted: ['I do not want to mishear the address.', 'I do not want to mishear it.'] },
    { id: 'l21c2-09', type: 'dialogue', grammarPoint: 'l21c2_hope', partnerLine: 'Have a good time!', situation: { ru: 'Друг провожает тебя на праздник. Скажи, что надеешься хорошо провести время.', uk: 'Друг проводжає тебе на свято. Скажи, що сподіваєшся добре провести час.' }, accepted: ['I hope to have a good time.'] },
    { id: 'l21c2-10', type: 'dialogue', grammarPoint: 'l21c2_want_need', partnerLine: 'We must start now.', situation: { ru: 'Коллега торопит, а ты промок под дождём. Скажи, что хочешь переодеться.', uk: 'Колега квапить, а ти змок під дощем. Скажи, що хочеш перевдягнутися.' }, accepted: ['I want to get changed.', 'I need to get changed.'] },
    { id: 'l21c2-11', type: 'dialogue', grammarPoint: 'l21c2_plan_intend', partnerLine: 'You can relocate.', situation: { ru: 'Друзья советуют тебе переехать в другой город, но тебе нравится твой. Скажи, что собираешься остаться здесь.', uk: 'Друзі радять тобі переїхати в інше місто, але тобі подобається твоє. Скажи, що збираєшся залишитися тут.' }, accepted: ['I intend to stay here.', 'I plan to stay here.', 'I want to stay here.'] },
    { id: 'l21c2-12', type: 'dialogue', grammarPoint: 'l21c2_hope', partnerLine: 'I can help you.', situation: { ru: 'Сосед предлагает помочь с уборкой, но ты почти закончил. Скажи, что надеешься скоро закончить.', uk: 'Сусід пропонує допомогти з прибиранням, але ти майже закінчив. Скажи, що сподіваєшся скоро закінчити.' }, accepted: ['I hope to finish up soon.', 'I hope to finish soon.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c2-13', type: 'fix', grammarPoint: 'l21c2_hope', wrong: 'I hope retraining.', accepted: ['I hope to retrain.'] },
    { id: 'l21c2-14', type: 'fix', grammarPoint: 'l21c2_plan_intend', wrong: 'I plan shopping around.', accepted: ['I plan to shop around.'] },
    { id: 'l21c2-15', type: 'fix', grammarPoint: 'l21c2_want_need', wrong: 'I need get ready.', accepted: ['I need to get ready.'] },
    { id: 'l21c2-16', type: 'fix', grammarPoint: 'l21c2_plan_intend', wrong: 'I intend going without a car.', accepted: ['I intend to go without a car.'] },
  ],
};
