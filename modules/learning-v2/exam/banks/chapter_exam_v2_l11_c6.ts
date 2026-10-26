// chapter_exam_v2_l11_c6.ts — банк экзамена v2: урок 11, глава 6 (эпизоды 41–48). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–48 — много were / there were, одно was / there was, пожелания Welcome back / Get well soon / Have a good trip / Nice to meet you; вопросы Was / Were…? — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L11_C6: ChapterExamV2Bank = {
  lessonOrdinal: 11,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l11c6_were', label: { ru: 'много — were, there were', uk: 'багато — were, there were' }, episodeOrdinals: [42, 44, 48] },
    { id: 'l11c6_was', label: { ru: 'одно — was, there was', uk: 'одне — was, there was' }, episodeOrdinals: [41, 43, 45] },
    { id: 'l11c6_wish', label: { ru: 'пожелания — Welcome back, Get well soon, Have a good trip', uk: 'побажання — Welcome back, Get well soon, Have a good trip' }, episodeOrdinals: [47] },
    { id: 'l11c6_ask', label: { ru: 'спросить о прошлом — Was / Were…?', uk: 'запитати про минуле — Was / Were…?' }, episodeOrdinals: [42, 43, 44] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l11c6-01', type: 'situation', grammarPoint: 'l11c6_was', situation: { ru: 'Ты собирал обед в дорогу. Скажи, что в сумке был сэндвич с ветчиной.', uk: 'Ти збирав обід у дорогу. Скажи, що в сумці був сендвіч із шинкою.' }, accepted: ['There was a ham sandwich in the bag.'] },
    { id: 'l11c6-02', type: 'situation', grammarPoint: 'l11c6_were', situation: { ru: 'После бассейна плавки ещё не высохли. Скажи, что они были не сухими.', uk: 'Після басейну плавки ще не висохли. Скажи, що вони були не сухими.' }, accepted: ['The swimming trunks were not dry.', "The swimming trunks weren't dry."] },
    { id: 'l11c6-03', type: 'situation', grammarPoint: 'l11c6_wish', situation: { ru: 'Друг вернулся из долгой поездки. Поприветствуй его.', uk: 'Друг повернувся з довгої поїздки. Привітай його.' }, accepted: ['Welcome back.'] },
    { id: 'l11c6-04', type: 'situation', grammarPoint: 'l11c6_was', situation: { ru: 'Вы собирались на пикник. Скажи, что корзина для пикника стояла у двери.', uk: 'Ви збиралися на пікнік. Скажи, що кошик для пікніка стояв біля дверей.' }, accepted: ['The picnic basket was near the door.'] },
    { id: 'l11c6-05', type: 'situation', grammarPoint: 'l11c6_ask', situation: { ru: 'Вы собирались в бассейн. Спроси, были ли очки для плавания в сумке.', uk: 'Ви збиралися в басейн. Запитай, чи були окуляри для плавання в сумці.' }, accepted: ['Were the swimming goggles in the bag?'] },
    { id: 'l11c6-06', type: 'situation', grammarPoint: 'l11c6_wish', situation: { ru: 'Подруга заболела. Пожелай ей скорее выздороветь.', uk: 'Подруга захворіла. Побажай їй швидше одужати.' }, accepted: ['Get well soon.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c6-07', type: 'dialogue', grammarPoint: 'l11c6_was', partnerLine: 'The shirt was long-sleeved.', situation: { ru: 'Скажи, что рубашка с короткими рукавами была синей.', uk: 'Скажи, що сорочка з короткими рукавами була синьою.' }, accepted: ['The short-sleeved shirt was blue.'] },
    { id: 'l11c6-08', type: 'dialogue', grammarPoint: 'l11c6_were', partnerLine: 'The swimming costume was on the chair.', situation: { ru: 'Скажи, что очки для плавания были в сумке.', uk: 'Скажи, що окуляри для плавання були в сумці.' }, accepted: ['The swimming goggles were in the bag.'] },
    { id: 'l11c6-09', type: 'dialogue', grammarPoint: 'l11c6_wish', partnerLine: 'My trip is long.', situation: { ru: 'Друг уезжает надолго. Пожелай ему хорошей поездки.', uk: 'Друг їде надовго. Побажай йому гарної поїздки.' }, accepted: ['Have a good trip.'] },
    { id: 'l11c6-10', type: 'dialogue', grammarPoint: 'l11c6_was', partnerLine: 'The cool bag was empty.', situation: { ru: 'Скажи, что плед для пикника был не сухим.', uk: 'Скажи, що плед для пікніка був не сухим.' }, accepted: ['The picnic blanket was not dry.', "The picnic blanket wasn't dry."] },
    { id: 'l11c6-11', type: 'dialogue', grammarPoint: 'l11c6_ask', partnerLine: 'There was a carton of milk in the bag.', situation: { ru: 'Спроси, была ли банка тунца в шкафу.', uk: 'Запитай, чи була банка тунця в шафі.' }, accepted: ['Was the tin of tuna in the cupboard?'] },
    { id: 'l11c6-12', type: 'dialogue', grammarPoint: 'l11c6_wish', partnerLine: 'This is my sister.', situation: { ru: 'Тебе представляют сестру друга. Скажи, что приятно познакомиться.', uk: 'Тобі представляють сестру друга. Скажи, що приємно познайомитися.' }, accepted: ['Nice to meet you.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c6-13', type: 'fix', grammarPoint: 'l11c6_was', wrong: 'There were a ham sandwich in the bag.', accepted: ['There was a ham sandwich in the bag.'] },
    { id: 'l11c6-14', type: 'fix', grammarPoint: 'l11c6_were', wrong: 'The swimming goggles was in the bag.', accepted: ['The swimming goggles were in the bag.'] },
    { id: 'l11c6-15', type: 'fix', grammarPoint: 'l11c6_wish', wrong: 'Get good soon.', accepted: ['Get well soon.'] },
    { id: 'l11c6-16', type: 'fix', grammarPoint: 'l11c6_ask', wrong: 'Was the walking shoes comfortable?', accepted: ['Were the walking shoes comfortable?'] },
  ],
};
