// chapter_exam_v2_l21_c3.ts — банк экзамена v2: урок 21, глава 3 (эпизоды 17–24).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–24 урока 21, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 3 — want / prefer / need / promise to (эпизоды 17, 18, 20–24) и risk / deny / resist / involve + -ing (эпизод 19).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L21_C3: ChapterExamV2Bank = {
  lessonOrdinal: 21,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l21c3_prefer', label: { ru: 'хочу, предпочитаю — I want to, I prefer to …', uk: 'хочу, волію — I want to, I prefer to …' }, episodeOrdinals: [17, 18, 23] },
    { id: 'l21c3_risk_deny', label: { ru: 'рисковать, отрицать — risk, deny, resist + -ing', uk: 'ризикувати, заперечувати — risk, deny, resist + -ing' }, episodeOrdinals: [19] },
    { id: 'l21c3_promise', label: { ru: 'обещаю, нужно — I promise to, I need to …', uk: 'обіцяю, треба — I promise to, I need to …' }, episodeOrdinals: [20, 21, 22, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l21c3-01', type: 'situation', grammarPoint: 'l21c3_prefer', situation: { ru: 'Вы с другом в кафе, принесли счёт. Предложи заплатить пополам.', uk: 'Ви з другом у кафе, принесли рахунок. Запропонуй заплатити навпіл.' }, accepted: ['I want to go halves with you.', 'I want to go halves.'] },
    { id: 'l21c3-02', type: 'situation', grammarPoint: 'l21c3_prefer', situation: { ru: 'Официант несёт блюдо с соусом. Скажи, что предпочитаешь соус отдельно.', uk: 'Офіціант несе страву із соусом. Скажи, що волієш соус окремо.' }, accepted: ['I prefer to have the sauce on the side.', 'I want to have the sauce on the side.'] },
    { id: 'l21c3-03', type: 'situation', grammarPoint: 'l21c3_risk_deny', situation: { ru: 'Друг предлагает уйти с работы пораньше без спроса. Скажи, что не можешь рисковать работой.', uk: 'Друг пропонує піти з роботи раніше без дозволу. Скажи, що не можеш ризикувати роботою.' }, accepted: ['I cannot risk losing my job.'] },
    { id: 'l21c3-04', type: 'situation', grammarPoint: 'l21c3_risk_deny', situation: { ru: 'Друг спрашивает про твоё лето. Скажи, что в твоих планах — путешествия.', uk: 'Друг питає про твоє літо. Скажи, що у твоїх планах — подорожі.' }, accepted: ['My plans involve travelling.'] },
    { id: 'l21c3-05', type: 'situation', grammarPoint: 'l21c3_promise', situation: { ru: 'Подруга ждёт твоего решения о поездке. Пообещай сообщить ей.', uk: 'Подруга чекає твого рішення про поїздку. Пообіцяй повідомити їй.' }, accepted: ['I promise to let you know.', 'I promise to keep you posted.'] },
    { id: 'l21c3-06', type: 'situation', grammarPoint: 'l21c3_promise', situation: { ru: 'Завтра вставать в пять утра. Скажи, что тебе нужно поставить будильник.', uk: 'Завтра вставати о пʼятій ранку. Скажи, що тобі треба поставити будильник.' }, accepted: ['I need to set an alarm.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c3-07', type: 'dialogue', grammarPoint: 'l21c3_risk_deny', partnerLine: 'You have my keys.', situation: { ru: 'Сосед уверен, что ты взял его ключи. Возрази: ты их не брал.', uk: 'Сусід певен, що ти взяв його ключі. Заперечи: ти їх не брав.' }, accepted: ['I deny taking your keys.'] },
    { id: 'l21c3-08', type: 'dialogue', grammarPoint: 'l21c3_prefer', partnerLine: 'I can call you tomorrow.', situation: { ru: 'Начальник хочет обсудить твой новый карьерный шаг по телефону. Скажи, что предпочитаешь обсудить это лично.', uk: 'Начальник хоче обговорити твій новий карʼєрний крок телефоном. Скажи, що волієш обговорити це особисто.' }, accepted: ['I prefer to discuss a career change in person.', 'I prefer to discuss it in person.'] },
    { id: 'l21c3-09', type: 'dialogue', grammarPoint: 'l21c3_promise', partnerLine: 'I have a message for him.', situation: { ru: 'Коллега просит передать записку твоему другу. Пообещай передать.', uk: 'Колега просить передати записку твоєму другові. Пообіцяй передати.' }, accepted: ['I promise to pass on your message.', 'I will pass on your message.', 'I need to pass on your message.'] },
    { id: 'l21c3-10', type: 'dialogue', grammarPoint: 'l21c3_promise', partnerLine: 'The car is not ready.', situation: { ru: 'Машина в ремонте и не готова. Скажи, что иначе тебе придётся ехать на автобусе.', uk: 'Машина в ремонті й не готова. Скажи, що інакше тобі доведеться їхати автобусом.' }, accepted: ['Otherwise, I need to take a bus.', 'Otherwise, I need to take the bus.', 'I need to take the bus.'] },
    { id: 'l21c3-11', type: 'dialogue', grammarPoint: 'l21c3_risk_deny', partnerLine: 'You can buy this online.', situation: { ru: 'Продавец советует заказать вещь в интернете, а ты стараешься так не делать. Скажи, что держишься от покупок в интернете.', uk: 'Продавець радить замовити річ в інтернеті, а ти намагаєшся так не робити. Скажи, що стримуєшся від покупок в інтернеті.' }, accepted: ['I resist buying things online.'] },
    { id: 'l21c3-12', type: 'dialogue', grammarPoint: 'l21c3_prefer', partnerLine: 'You can have seconds.', situation: { ru: 'Хозяйка предлагает добавку, а тебе очень понравилось. Скажи, что хочешь ещё порцию.', uk: 'Господиня пропонує добавку, а тобі дуже сподобалося. Скажи, що хочеш ще порцію.' }, accepted: ['I want to have seconds.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c3-13', type: 'fix', grammarPoint: 'l21c3_risk_deny', wrong: 'I cannot risk to lose my job.', accepted: ['I cannot risk losing my job.'] },
    { id: 'l21c3-14', type: 'fix', grammarPoint: 'l21c3_prefer', wrong: 'I want leave a tip.', accepted: ['I want to leave a tip.'] },
    { id: 'l21c3-15', type: 'fix', grammarPoint: 'l21c3_promise', wrong: 'I promise letting you know.', accepted: ['I promise to let you know.'] },
    { id: 'l21c3-16', type: 'fix', grammarPoint: 'l21c3_risk_deny', wrong: 'I deny to take your keys.', accepted: ['I deny taking your keys.'] },
  ],
};
