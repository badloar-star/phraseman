// chapter_exam_v2_l20_c5.ts — банк экзамена v2: урок 20, глава 5 (эпизоды 33–40).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–40 урока 20, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 5 — needn't (эпизоды 33–36) и ought to (37, 38, 40).
// Запасные ответы после фикса сторожа 3b3d9086c: needn't засчитывается и как «need not», варианты с «a» разрешены.
// Вежливые просьбы Can I / Could I …? — отдельная тема (эпизоды 39).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L20_C5: ChapterExamV2Bank = {
  lessonOrdinal: 20,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l20c5_neednt', label: { ru: "не нужно — needn't", uk: "не треба — needn't" }, episodeOrdinals: [33, 34, 35, 36] },
    { id: 'l20c5_ought_choice', label: { ru: 'ought to — выбрать, проверить', uk: 'ought to — обрати, перевірити' }, episodeOrdinals: [37, 38] },
    { id: 'l20c5_ought_phrasal', label: { ru: 'ought to + make an effort, get in touch', uk: 'ought to + make an effort, get in touch' }, episodeOrdinals: [40] },
    { id: 'l20c5_polite', label: { ru: 'предложить и попросить — Can I …?', uk: 'запропонувати й попросити — Can I …?' }, episodeOrdinals: [39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l20c5-01', type: 'situation', grammarPoint: 'l20c5_neednt', situation: { ru: 'Посылку привезут прямо домой. Скажи сестре, что забирать её лично не нужно.', uk: 'Посилку привезуть просто додому. Скажи сестрі, що забирати її особисто не треба.' }, accepted: ["You needn't collect it personally."] },
    { id: 'l20c5-02', type: 'situation', grammarPoint: 'l20c5_neednt', situation: { ru: 'Друзья зовут на обычный домашний ужин. Скажи жене, что наряжаться не нужно.', uk: 'Друзі кличуть на звичайну домашню вечерю. Скажи дружині, що чепуритися не треба.' }, accepted: ["We needn't dress formally.", 'You need not dress formally.'] },
    { id: 'l20c5-03', type: 'situation', grammarPoint: 'l20c5_ought_choice', situation: { ru: 'Друг снимает товары для своего сайта. Посоветуй снимать при дневном свете.', uk: 'Друг знімає товари для свого сайту. Порадь знімати при денному світлі.' }, accepted: ['You ought to use natural light.', 'You should use natural light.'] },
    { id: 'l20c5-04', type: 'situation', grammarPoint: 'l20c5_ought_choice', situation: { ru: 'Вы ищете проводника для похода в горы. Скажи, что стоит нанять опытного.', uk: 'Ви шукаєте провідника для походу в гори. Скажи, що варто найняти досвідченого.' }, accepted: ['We ought to hire a capable guide.', 'We should hire a capable guide.'] },
    { id: 'l20c5-05', type: 'situation', grammarPoint: 'l20c5_ought_phrasal', situation: { ru: 'Сын давно не общался с другом детства. Посоветуй ему связаться с другом.', uk: 'Син давно не спілкувався з другом дитинства. Порадь йому звʼязатися з другом.' }, accepted: ['You ought to get in touch with your friend.', 'You should get in touch with your friend.'] },
    { id: 'l20c5-06', type: 'situation', grammarPoint: 'l20c5_polite', situation: { ru: 'Мастер долго возится с тяжёлой дверью. Предложи помочь.', uk: 'Майстер довго морочиться з важкими дверима. Запропонуй допомогти.' }, accepted: ['Can I give you a hand?', 'Could I give you a hand?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c5-07', type: 'dialogue', grammarPoint: 'l20c5_neednt', partnerLine: 'I must do this alone.', situation: { ru: 'Подруга переезжает и тащит всё одна. Скажи, что справляться в одиночку не нужно.', uk: 'Подруга переїжджає й тягне все сама. Скажи, що справлятися самій не треба.' }, accepted: ["You needn't struggle alone."] },
    { id: 'l20c5-08', type: 'dialogue', grammarPoint: 'l20c5_neednt', partnerLine: 'I must explain my choice.', situation: { ru: 'Брат оправдывается, что сменил работу. Скажи, что оправдываться не нужно.', uk: 'Брат виправдовується, що змінив роботу. Скажи, що виправдовуватися не треба.' }, accepted: ["You needn't justify your choice."] },
    { id: 'l20c5-09', type: 'dialogue', grammarPoint: 'l20c5_ought_choice', partnerLine: 'I can pay this price.', situation: { ru: 'Друг готов сразу купить велосипед с рук. Посоветуй сравнить с обычной ценой.', uk: 'Друг готовий одразу купити велосипед із рук. Порадь порівняти зі звичайною ціною.' }, accepted: ['You ought to check the normal price.', 'You should check the normal price.'] },
    { id: 'l20c5-10', type: 'dialogue', grammarPoint: 'l20c5_ought_choice', partnerLine: 'I will correct this mistake tomorrow.', situation: { ru: 'Коллега нашёл мелкую ошибку в отчёте. Скажи, что исправить её стоит сейчас.', uk: 'Колега знайшов дрібну помилку у звіті. Скажи, що виправити її варто зараз.' }, accepted: ['You ought to correct this mistake now.', 'You should correct this mistake now.', 'You ought to correct it now.', 'You should correct it now.'] },
    { id: 'l20c5-11', type: 'dialogue', grammarPoint: 'l20c5_ought_phrasal', partnerLine: 'I can talk to the teacher.', situation: { ru: 'Мама переживает из-за оценок сына. Поддержи: с учителем стоит поговорить.', uk: 'Мама хвилюється через оцінки сина. Підтримай: з учителем варто поговорити.' }, accepted: ['You ought to have a word with the teacher.', 'You ought to talk to the teacher.', 'You should talk to the teacher.', 'You should have a word with the teacher.'] },
    { id: 'l20c5-12', type: 'dialogue', grammarPoint: 'l20c5_polite', partnerLine: 'I must check the battery.', situation: { ru: 'Друг не может завести машину. Спроси, можно ли тебе взглянуть.', uk: 'Друг не може завести машину. Спитай, чи можна тобі глянути.' }, accepted: ['Can I take a look?', 'Could I take a look?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c5-13', type: 'fix', grammarPoint: 'l20c5_neednt', wrong: "You needn't to prove anything.", accepted: ["You needn't prove anything."] },
    { id: 'l20c5-14', type: 'fix', grammarPoint: 'l20c5_ought_choice', wrong: 'We ought choose a typical example.', accepted: ['We ought to choose a typical example.'] },
    { id: 'l20c5-15', type: 'fix', grammarPoint: 'l20c5_ought_phrasal', wrong: 'You ought to make a effort.', accepted: ['You ought to make an effort.'] },
    { id: 'l20c5-16', type: 'fix', grammarPoint: 'l20c5_polite', wrong: 'I can give it a try?', accepted: ['Can I give it a try?', 'Could I give it a try?'] },
  ],
};
