// chapter_exam_v2_l21_c4.ts — банк экзамена v2: урок 21, глава 4 (эпизоды 25–32).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–32 урока 21, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 4 — I want you to / I need you to (эпизоды 25–29, 31, 32) и This bus is so unreliable / The rent is unaffordable (эпизод 30).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L21_C4: ChapterExamV2Bank = {
  lessonOrdinal: 21,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l21c4_want_you', label: { ru: 'хочу, чтобы ты — I want you to …', uk: 'хочу, щоб ти — I want you to …' }, episodeOrdinals: [27, 28, 31, 32] },
    { id: 'l21c4_need_you', label: { ru: 'мне нужно, чтобы ты — I need you to …', uk: 'мені треба, щоб ти — I need you to …' }, episodeOrdinals: [25, 26, 29] },
    { id: 'l21c4_so_un', label: { ru: 'такой, не- — so unreliable, unaffordable', uk: 'такий, не- — so unreliable, unaffordable' }, episodeOrdinals: [30] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l21c4-01', type: 'situation', grammarPoint: 'l21c4_want_you', situation: { ru: 'Друг впервые у тебя в гостях и стесняется. Скажи, что хочешь, чтобы он чувствовал себя как дома.', uk: 'Друг уперше в тебе в гостях і соромиться. Скажи, що хочеш, щоб він почувався як удома.' }, accepted: ['I want you to feel at home.'] },
    { id: 'l21c4-02', type: 'situation', grammarPoint: 'l21c4_need_you', situation: { ru: 'Вы несёте шкаф по узкому коридору. Попроси соседа отойти в сторону.', uk: 'Ви несете шафу вузьким коридором. Попроси сусіда відійти вбік.' }, accepted: ['I need you to stand aside.', 'I want you to stand aside.'] },
    { id: 'l21c4-03', type: 'situation', grammarPoint: 'l21c4_need_you', situation: { ru: 'Ты продиктовал адрес курьеру. Попроси его перепроверить адрес.', uk: 'Ти продиктував адресу курʼєрові. Попроси його перевірити адресу ще раз.' }, accepted: ['I need you to double-check the address.', 'I want you to double-check the address.'] },
    { id: 'l21c4-04', type: 'situation', grammarPoint: 'l21c4_so_un', situation: { ru: 'Автобус снова не пришёл вовремя. Пожалуйся другу, что он такой ненадёжный.', uk: 'Автобус знову не прийшов вчасно. Поскаржся другові, що він такий ненадійний.' }, accepted: ['This bus is so unreliable.', 'The bus is so unreliable.'] },
    { id: 'l21c4-05', type: 'situation', grammarPoint: 'l21c4_want_you', situation: { ru: 'Сын старше всех в команде. Скажи ему, что хочешь, чтобы он подавал пример.', uk: 'Син найстарший у команді. Скажи йому, що хочеш, щоб він подавав приклад.' }, accepted: ['I want you to set an example.'] },
    { id: 'l21c4-06', type: 'situation', grammarPoint: 'l21c4_so_un', situation: { ru: 'Ты хотел снять квартиру, но цена огромная. Скажи, что эта аренда тебе не по карману.', uk: 'Ти хотів зняти квартиру, але ціна величезна. Скажи, що ця оренда тобі не по кишені.' }, accepted: ['The rent is unaffordable.', 'This rent is unaffordable.', 'The rent is so unaffordable.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c4-07', type: 'dialogue', grammarPoint: 'l21c4_want_you', partnerLine: 'I did not take your keys.', situation: { ru: 'Ты сомневаешься в его словах. Скажи, что хочешь, чтобы он сказал правду.', uk: 'Ти сумніваєшся в його словах. Скажи, що хочеш, щоб він сказав правду.' }, accepted: ['I want you to tell the truth.'] },
    { id: 'l21c4-08', type: 'dialogue', grammarPoint: 'l21c4_need_you', partnerLine: 'I can look at the sink.', situation: { ru: 'Сосед предлагает посмотреть раковину. Скажи, что тебе нужно, чтобы он её прочистил.', uk: 'Сусід пропонує подивитися раковину. Скажи, що тобі треба, щоб він її прочистив.' }, accepted: ['I need you to unblock the sink.', 'I want you to unblock the sink.', 'I need you to unblock it.'] },
    { id: 'l21c4-09', type: 'dialogue', grammarPoint: 'l21c4_want_you', partnerLine: 'This is the plan.', situation: { ru: 'Коллега принёс план. Скажи, что хочешь, чтобы он разобрал его вместе с тобой.', uk: 'Колега приніс план. Скажи, що хочеш, щоб він розібрав його разом із тобою.' }, accepted: ['I want you to talk through the plan with me.', 'I need you to talk through the plan with me.', 'I want you to talk through it with me.'] },
    { id: 'l21c4-10', type: 'dialogue', grammarPoint: 'l21c4_so_un', partnerLine: 'I can book the room.', situation: { ru: 'Друг хочет забронировать номер, а ты видишь, что его уже нет. Скажи, что номер недоступен.', uk: 'Друг хоче забронювати номер, а ти бачиш, що його вже немає. Скажи, що номер недоступний.' }, accepted: ['The room is unavailable.', 'This room is unavailable.'] },
    { id: 'l21c4-11', type: 'dialogue', grammarPoint: 'l21c4_so_un', partnerLine: 'This mistake is not avoidable.', situation: { ru: 'Коллега уверен, что ошибка была неизбежна. Возрази: этой ошибки можно избежать.', uk: 'Колега певен, що помилка була неминуча. Заперечи: цієї помилки можна уникнути.' }, accepted: ['This mistake is avoidable.', 'The mistake is avoidable.'] },
    { id: 'l21c4-12', type: 'dialogue', grammarPoint: 'l21c4_need_you', partnerLine: 'I am ready.', situation: { ru: 'Ученик готов слушать, а дело важное. Скажи, что тебе нужно его полное внимание.', uk: 'Учень готовий слухати, а справа важлива. Скажи, що тобі потрібна його повна увага.' }, accepted: ['I need you to pay attention.', 'I want you to pay attention.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l21c4-13', type: 'fix', grammarPoint: 'l21c4_want_you', wrong: 'I want you tell the truth.', accepted: ['I want you to tell the truth.'] },
    { id: 'l21c4-14', type: 'fix', grammarPoint: 'l21c4_need_you', wrong: 'I need you plug in the lamp.', accepted: ['I need you to plug in the lamp.'] },
    { id: 'l21c4-15', type: 'fix', grammarPoint: 'l21c4_so_un', wrong: 'This bus so unreliable.', accepted: ['This bus is so unreliable.'] },
    { id: 'l21c4-16', type: 'fix', grammarPoint: 'l21c4_want_you', wrong: 'I want you showing respect.', accepted: ['I want you to show respect.'] },
  ],
};
