// chapter_exam_v2_l20_c4.ts — банк экзамена v2: урок 20, глава 4 (эпизоды 25–32).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–32 урока 20, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 4 — ought to (эпизоды 25–31).
// should из главы 3 засчитывается как равный по смыслу ответ.
// Вежливые просьбы Can I / Could I …? — отдельная тема (эпизоды 32).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L20_C4: ChapterExamV2Bank = {
  lessonOrdinal: 20,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l20c4_check', label: { ru: 'ought to — сравнить, проверить, учесть', uk: 'ought to — порівняти, перевірити, врахувати' }, episodeOrdinals: [25, 26, 27] },
    { id: 'l20c4_correct', label: { ru: 'ought to — точно и понятно', uk: 'ought to — точно й зрозуміло' }, episodeOrdinals: [28, 29] },
    { id: 'l20c4_phrasal', label: { ru: 'ought to + make up your mind, keep in mind', uk: 'ought to + make up your mind, keep in mind' }, episodeOrdinals: [30, 31] },
    { id: 'l20c4_polite', label: { ru: 'вежливая просьба — Can I …? Could we …?', uk: 'ввічливе прохання — Can I …? Could we …?' }, episodeOrdinals: [32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l20c4-01', type: 'situation', grammarPoint: 'l20c4_check', situation: { ru: 'Друг покупает билеты в отпуск. Посоветуй сначала сравнить рейсы.', uk: 'Друг купує квитки на відпустку. Порадь спершу порівняти рейси.' }, accepted: ['You ought to compare the flights.', 'You ought to compare international flights.', 'You should compare the flights.'] },
    { id: 'l20c4-02', type: 'situation', grammarPoint: 'l20c4_check', situation: { ru: 'Вы с женой планируете ремонт. Скажи, что сначала стоит определить бюджет.', uk: 'Ви з дружиною плануєте ремонт. Скажи, що спершу варто визначити бюджет.' }, accepted: ['We ought to set a budget.'] },
    { id: 'l20c4-03', type: 'situation', grammarPoint: 'l20c4_correct', situation: { ru: 'Коллега указал в приглашении неверную дату. Скажи, что её стоит исправить.', uk: 'Колега вказав у запрошенні неправильну дату. Скажи, що її варто виправити.' }, accepted: ['You ought to correct the date.', 'You ought to correct the inaccurate date.', 'You should correct the date.'] },
    { id: 'l20c4-04', type: 'situation', grammarPoint: 'l20c4_phrasal', situation: { ru: 'Сын никуда не спешит, а поезд скоро. Напомни ему помнить о времени отправления.', uk: 'Син нікуди не поспішає, а потяг скоро. Нагадай йому памʼятати про час відправлення.' }, accepted: ['You ought to keep in mind the departure time.', 'You should keep in mind the departure time.'] },
    { id: 'l20c4-05', type: 'situation', grammarPoint: 'l20c4_phrasal', situation: { ru: 'Вы с соседом спорите из-за шумного ремонта. Предложи договориться.', uk: 'Ви з сусідом сперечаєтеся через гучний ремонт. Запропонуй домовитися.' }, accepted: ['We ought to reach an agreement.', 'We should reach an agreement.'] },
    { id: 'l20c4-06', type: 'situation', grammarPoint: 'l20c4_polite', situation: { ru: 'В кафе с коллегами ты хочешь заплатить только за себя. Спроси официанта.', uk: 'У кафе з колегами ти хочеш заплатити тільки за себе. Спитай офіціанта.' }, accepted: ['Can I pay separately?', 'Could I pay separately?', 'Could we pay separately?', 'Can we pay separately?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c4-07', type: 'dialogue', grammarPoint: 'l20c4_check', partnerLine: 'I can find the problem tomorrow.', situation: { ru: 'Мастер хочет отложить ремонт протечки. Скажи, что сначала стоит найти причину.', uk: 'Майстер хоче відкласти ремонт протікання. Скажи, що спершу варто знайти причину.' }, accepted: ['We ought to find the cause.', 'You ought to find the cause.', 'We should find the cause.', 'You should find the cause.'] },
    { id: 'l20c4-08', type: 'dialogue', grammarPoint: 'l20c4_check', partnerLine: 'I will ask a friend.', situation: { ru: 'Друг разбирается с налогами и хочет спросить приятеля. Посоветуй обратиться к профессионалу.', uk: 'Друг розбирається з податками й хоче спитати приятеля. Порадь звернутися до професіонала.' }, accepted: ['You ought to ask for professional advice.', 'You should ask for professional advice.'] },
    { id: 'l20c4-09', type: 'dialogue', grammarPoint: 'l20c4_correct', partnerLine: 'I will explain the instructions tomorrow.', situation: { ru: 'Начальник раздал непонятные инструкции. Скажи, что объяснить их стоит сейчас.', uk: 'Начальник роздав незрозумілі інструкції. Скажи, що пояснити їх варто зараз.' }, accepted: ['You ought to explain the instructions now.', 'You should explain the instructions now.'] },
    { id: 'l20c4-10', type: 'dialogue', grammarPoint: 'l20c4_correct', partnerLine: 'I can give an answer.', situation: { ru: 'Клиент отвечает банку расплывчато. Посоветуй ему ответить точно.', uk: 'Клієнт відповідає банку розмито. Порадь йому відповісти точно.' }, accepted: ['You ought to give a precise answer.'] },
    { id: 'l20c4-11', type: 'dialogue', grammarPoint: 'l20c4_phrasal', partnerLine: 'I can choose tomorrow.', situation: { ru: 'Друг уже месяц не может выбрать квартиру. Скажи, что пора решиться.', uk: 'Друг уже місяць не може обрати квартиру. Скажи, що час наважитися.' }, accepted: ['You ought to make up your mind.', 'You should make up your mind.'] },
    { id: 'l20c4-12', type: 'dialogue', grammarPoint: 'l20c4_polite', partnerLine: 'You must pay now.', situation: { ru: 'Продавец просит сразу всю сумму. Спроси, можно ли часть заплатить наличными.', uk: 'Продавець просить одразу всю суму. Спитай, чи можна частину заплатити готівкою.' }, accepted: ['Can I pay partly in cash?', 'Could I pay partly in cash?', 'Could we pay partly in cash?', 'Can we pay partly in cash?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c4-13', type: 'fix', grammarPoint: 'l20c4_check', wrong: 'We ought check the value.', accepted: ['We ought to check the value.'] },
    { id: 'l20c4-14', type: 'fix', grammarPoint: 'l20c4_correct', wrong: 'You oughts to use accurate information.', accepted: ['You ought to use accurate information.'] },
    { id: 'l20c4-15', type: 'fix', grammarPoint: 'l20c4_phrasal', wrong: 'He ought do his duty.', accepted: ['He ought to do his duty.'] },
    { id: 'l20c4-16', type: 'fix', grammarPoint: 'l20c4_polite', wrong: 'Can I to work mainly from home?', accepted: ['Can I work mainly from home?', 'Could I work mainly from home?'] },
  ],
};
