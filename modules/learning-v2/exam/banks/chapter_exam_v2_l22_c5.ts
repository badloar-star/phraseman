// chapter_exam_v2_l22_c5.ts — банк экзамена v2: урок 22, глава 5 (эпизоды 33–40).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–40 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 5 — another + одна вещь, other + несколько (эпизоды 33–36), «чтобы» (37–38) и просьбы эпизодов 39–40 утверждением
// (I want to — «?» общий сторож не пускает).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C5: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l22c5_another', label: { ru: 'другой — another date', uk: 'інший — another date' }, episodeOrdinals: [33, 34, 35, 36] },
    { id: 'l22c5_other', label: { ru: 'другие — other dates', uk: 'інші — other dates' }, episodeOrdinals: [33, 35, 36] },
    { id: 'l22c5_purpose', label: { ru: 'чтобы — to make a decision', uk: 'щоб — to make a decision' }, episodeOrdinals: [37, 38] },
    { id: 'l22c5_want_to', label: { ru: 'просьба — I want to pay in advance', uk: 'прохання — I want to pay in advance' }, episodeOrdinals: [39, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c5-01', type: 'situation', grammarPoint: 'l22c5_another', situation: { ru: 'Карта не проходит при оплате онлайн. Скажи, что тебе нужен другой способ оплаты.', uk: 'Картка не проходить під час оплати онлайн. Скажи, що тобі потрібен інший спосіб оплати.' }, accepted: ['I need another payment method.'] },
    { id: 'l22c5-02', type: 'situation', grammarPoint: 'l22c5_another', situation: { ru: 'В субботу тебя не будет дома, когда привезут заказ. Скажи, что тебе нужна другая дата доставки.', uk: 'У суботу тебе не буде вдома, коли привезуть замовлення. Скажи, що тобі потрібна інша дата доставки.' }, accepted: ['I need another delivery date.'] },
    { id: 'l22c5-03', type: 'situation', grammarPoint: 'l22c5_other', situation: { ru: 'Ты работаешь в гостинице, и гость недоволен ценой номера. Скажи, что у вас есть другие цены.', uk: 'Ти працюєш у готелі, і гість незадоволений ціною номера. Скажи, що у вас є інші ціни.' }, accepted: ['We have other room rates.', 'We offer other room rates.'] },
    { id: 'l22c5-04', type: 'situation', grammarPoint: 'l22c5_purpose', situation: { ru: 'Ты не можешь выбрать телефон и сравниваешь модели. Объясни: чтобы принять решение.', uk: 'Ти не можеш обрати телефон і порівнюєш моделі. Поясни: щоб ухвалити рішення.' }, accepted: ['I compare the options to make a decision.'] },
    { id: 'l22c5-05', type: 'situation', grammarPoint: 'l22c5_purpose', situation: { ru: 'Новая техника не включается, и ты звонишь в магазин. Объясни: чтобы решить проблему.', uk: 'Нова техніка не вмикається, і ти телефонуєш у магазин. Поясни: щоб розвʼязати проблему.' }, accepted: ['I call the shop to sort out a problem.', 'I call the shop to sort out the problem.'] },
    { id: 'l22c5-06', type: 'situation', grammarPoint: 'l22c5_want_to', situation: { ru: 'Официант приносит счёт, а сумма кажется большой. Скажи, что хочешь проверить счёт.', uk: 'Офіціант приносить рахунок, а сума здається великою. Скажи, що хочеш перевірити рахунок.' }, accepted: ['I want to check the bill.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c5-07', type: 'dialogue', grammarPoint: 'l22c5_another', partnerLine: 'This is your seat.', situation: { ru: 'Стюард показывает тебе на чужое место. Скажи, что у тебя другой номер места.', uk: 'Стюард показує тобі на чуже місце. Скажи, що в тебе інший номер місця.' }, accepted: ['I have another seat number.'] },
    { id: 'l22c5-08', type: 'dialogue', grammarPoint: 'l22c5_another', partnerLine: 'I do not like this recipe book.', situation: { ru: 'Подруга недовольна книгой рецептов. Скажи, что ты пользуешься другой.', uk: 'Подруга незадоволена книгою рецептів. Скажи, що ти користуєшся іншою.' }, accepted: ['I use another recipe book.'] },
    { id: 'l22c5-09', type: 'dialogue', grammarPoint: 'l22c5_another', partnerLine: 'We have one bed size.', situation: { ru: 'В отеле предлагают только одну кровать, а вам нужна шире. Скажи, что вам нужен другой размер.', uk: 'У готелі пропонують лише одне ліжко, а вам потрібне ширше. Скажи, що вам потрібен інший розмір.' }, accepted: ['We need another bed size.', 'I need another bed size.'] },
    { id: 'l22c5-10', type: 'dialogue', grammarPoint: 'l22c5_other', partnerLine: 'I do not like this delivery date.', situation: { ru: 'Клиенту не подходит дата доставки. Скажи, что у вас есть другие даты.', uk: 'Клієнтові не підходить дата доставки. Скажи, що у вас є інші дати.' }, accepted: ['We have other delivery dates.', 'We have other dates.'] },
    { id: 'l22c5-11', type: 'dialogue', grammarPoint: 'l22c5_purpose', partnerLine: 'I do not like my routine.', situation: { ru: 'Друг устал от одного и того же каждый день. Скажи, что ты меняешь распорядок, чтобы попробовать другой подход.', uk: 'Друг утомився від одного й того самого щодня. Скажи, що ти змінюєш розпорядок, щоб спробувати інший підхід.' }, accepted: ['I change my routine to try a different approach.'] },
    { id: 'l22c5-12', type: 'dialogue', grammarPoint: 'l22c5_want_to', partnerLine: 'You can pay at the hotel.', situation: { ru: 'Администратор говорит, что платить можно на месте. Скажи, что хочешь заплатить заранее.', uk: 'Адміністратор каже, що платити можна на місці. Скажи, що хочеш заплатити заздалегідь.' }, accepted: ['I want to pay in advance.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c5-13', type: 'fix', grammarPoint: 'l22c5_another', wrong: 'I need other meeting place.', accepted: ['I need another meeting place.'] },
    { id: 'l22c5-14', type: 'fix', grammarPoint: 'l22c5_other', wrong: 'We have another payment methods.', accepted: ['We have other payment methods.'] },
    { id: 'l22c5-15', type: 'fix', grammarPoint: 'l22c5_purpose', wrong: 'I read the instructions for find a solution.', accepted: ['I read the instructions to find a solution.'] },
    { id: 'l22c5-16', type: 'fix', grammarPoint: 'l22c5_want_to', wrong: 'I want give an example.', accepted: ['I want to give an example.'] },
  ],
};
