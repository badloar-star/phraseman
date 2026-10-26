// chapter_exam_v2_l19_c6.ts — банк экзамена v2: урок 19, глава 6 (эпизоды 41–48). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 6 — «can» с устойчивыми выражениями («on purpose», «in private», «by hand»), «will be able to», вежливая просьба «Could I start right away?» и «so / such». Только слова и формы эпизодов 1–48 урока 19; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L19_C6: ChapterExamV2Bank = {
  lessonOrdinal: 19,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l19c6_can_phrases', label: { ru: 'могу + выражение: on purpose / in private / by hand / in time', uk: 'можу + вираз: on purpose / in private / by hand / in time' }, episodeOrdinals: [41, 42, 43, 44, 45, 46, 47, 48] },
    { id: 'l19c6_will_able', label: { ru: 'смогу потом: I / We will be able to …', uk: 'зможу потім: I / We will be able to …' }, episodeOrdinals: [41, 42, 43, 44, 45, 46, 47, 48] },
    { id: 'l19c6_could_i', label: { ru: 'вежливая просьба: Could I start / rest / try …?', uk: 'ввічливе прохання: Could I start / rest / try …?' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48] },
    { id: 'l19c6_so_such', label: { ru: 'так и такой: so heavy / such a useful lesson', uk: 'так і такий: so heavy / such a useful lesson' }, episodeOrdinals: [33, 34, 35, 36, 37, 38, 39, 40, 43, 47] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l19c6-01', type: 'situation', grammarPoint: 'l19c6_can_phrases', situation: { ru: 'Актриса умеет плакать по заказу. Скажи, что она может заплакать нарочно.', uk: 'Акторка вміє плакати на замовлення. Скажи, що вона може заплакати навмисно.' }, accepted: ['She can cry on purpose.'] },
    { id: 'l19c6-02', type: 'situation', grammarPoint: 'l19c6_can_phrases', situation: { ru: 'Помощь не нужна. Скажи, что можешь сделать это сам.', uk: 'Допомога не потрібна. Скажи, що можеш зробити це сам.' }, accepted: ['I can do this on my own.'] },
    { id: 'l19c6-03', type: 'situation', grammarPoint: 'l19c6_will_able', situation: { ru: 'Сегодня вы заняты, но завтра свободны. Скажи, что завтра вы сможете помочь.', uk: 'Сьогодні ви зайняті, але завтра вільні. Скажи, що завтра ви зможете допомогти.' }, accepted: ['We will be able to help tomorrow.'] },
    { id: 'l19c6-04', type: 'situation', grammarPoint: 'l19c6_could_i', situation: { ru: 'Тебе не терпится приступить к работе. Вежливо спроси, можно ли начать сразу.', uk: 'Тобі не терпиться взятися до роботи. Ввічливо запитай, чи можна почати одразу.' }, accepted: ['Could I start right away?', 'Can I start right away?'] },
    { id: 'l19c6-05', type: 'situation', grammarPoint: 'l19c6_could_i', situation: { ru: 'Ты устал после дороги. Вежливо спроси, можно ли немного отдохнуть.', uk: 'Ти втомився після дороги. Ввічливо запитай, чи можна трохи відпочити.' }, accepted: ['Could I rest for a while?', 'Can I rest for a while?'] },
    { id: 'l19c6-06', type: 'situation', grammarPoint: 'l19c6_so_such', situation: { ru: 'Коробка тебе не по силам. Скажи, что эта коробка так тяжела.', uk: 'Коробка тобі не під силу. Скажи, що ця коробка така важка.' }, accepted: ['This box is so heavy.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l19c6-07', type: 'dialogue', grammarPoint: 'l19c6_can_phrases', partnerLine: 'She can sing in public.', situation: { ru: 'Друг говорит, что она может петь на публике. Скажи, что вы можете поговорить наедине.', uk: 'Друг каже, що вона може співати на публіці. Скажи, що ви можете поговорити наодинці.' }, accepted: ['We can talk in private.'] },
    { id: 'l19c6-08', type: 'dialogue', grammarPoint: 'l19c6_can_phrases', partnerLine: 'I can start right away.', situation: { ru: 'Друг говорит, что может начать сразу. Скажи, что ты всё-таки можешь прийти.', uk: 'Друг каже, що може почати відразу. Скажи, що ти все-таки можеш прийти.' }, accepted: ['I can come after all.'] },
    { id: 'l19c6-09', type: 'dialogue', grammarPoint: 'l19c6_will_able', partnerLine: 'I can pay in full.', situation: { ru: 'Друг говорит, что может заплатить полностью. Скажи, что ты сможешь это объяснить.', uk: 'Друг каже, що може заплатити повністю. Скажи, що ти зможеш це пояснити.' }, accepted: ['I will be able to explain this.'] },
    { id: 'l19c6-10', type: 'dialogue', grammarPoint: 'l19c6_could_i', partnerLine: 'In fact, she can speak three languages.', situation: { ru: 'Друг говорит, что она на самом деле знает три языка. Вежливо спроси, можно ли попробовать ещё раз.', uk: 'Друг каже, що вона насправді знає три мови. Ввічливо запитай, чи можна спробувати ще раз.' }, accepted: ['Could I try once again?', 'Can I try once again?'] },
    { id: 'l19c6-11', type: 'dialogue', grammarPoint: 'l19c6_could_i', partnerLine: 'At present, I can work from home.', situation: { ru: 'Друг говорит, что сейчас работает из дома. Вежливо спроси, можно ли и тебе работать из дома с этого момента.', uk: 'Друг каже, що зараз працює з дому. Ввічливо запитай, чи можна й тобі працювати з дому відтепер.' }, accepted: ['Could I work from home from now on?', 'Can I work from home from now on?'] },
    { id: 'l19c6-12', type: 'dialogue', grammarPoint: 'l19c6_so_such', partnerLine: 'She can wash this by hand.', situation: { ru: 'Друг говорит, что она может постирать это руками. Скажи, что эта привычка такая вредная.', uk: 'Друг каже, що вона може випрати це руками. Скажи, що ця звичка така шкідлива.' }, accepted: ['This habit is so unhealthy.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l19c6-13', type: 'fix', grammarPoint: 'l19c6_can_phrases', wrong: 'She can wash this at hand.', accepted: ['She can wash this by hand.'] },
    { id: 'l19c6-14', type: 'fix', grammarPoint: 'l19c6_will_able', wrong: 'We will able to help tomorrow.', accepted: ['We will be able to help tomorrow.'] },
    { id: 'l19c6-15', type: 'fix', grammarPoint: 'l19c6_so_such', wrong: 'This box is such heavy.', accepted: ['This box is so heavy.'] },
    { id: 'l19c6-16', type: 'fix', grammarPoint: 'l19c6_so_such', wrong: 'This is so useful lesson.', accepted: ['This is such a useful lesson.'] },
  ],
};
