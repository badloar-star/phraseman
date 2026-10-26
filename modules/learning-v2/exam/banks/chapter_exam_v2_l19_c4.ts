// chapter_exam_v2_l19_c4.ts — банк экзамена v2: урок 19, глава 4 (эпизоды 25–32). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 4 — «I am able to» (могу сейчас), «We will be able to» (смогу потом) и вежливая просьба «May I ask a question?» из глав 3–4. Только слова и формы эпизодов 1–32 урока 19; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L19_C4: ChapterExamV2Bank = {
  lessonOrdinal: 19,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l19c4_able_present', label: { ru: 'могу сейчас: I am / She is able to …', uk: 'можу зараз: I am / She is able to …' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
    { id: 'l19c4_able_future', label: { ru: 'смогу потом: We / They will be able to …', uk: 'зможу потім: We / They will be able to …' }, episodeOrdinals: [25, 26, 27, 28, 29, 30, 31, 32] },
    { id: 'l19c4_may_i', label: { ru: 'просьба: May I ask a question?', uk: 'прохання: May I ask a question?' }, episodeOrdinals: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l19c4-01', type: 'situation', grammarPoint: 'l19c4_able_present', situation: { ru: 'Ты справляешься со стрессом. Скажи, что ты способен с ним справиться.', uk: 'Ти справляєшся зі стресом. Скажи, що ти здатен із ним впоратися.' }, accepted: ['I am able to cope with the stress.'] },
    { id: 'l19c4-02', type: 'situation', grammarPoint: 'l19c4_able_present', situation: { ru: 'Подруга болела, но дома она приходит в себя. Скажи, что она способна восстановиться дома.', uk: 'Подруга хворіла, але вдома вона приходить до тями. Скажи, що вона здатна відновитися вдома.' }, accepted: ['She is able to recover at home.'] },
    { id: 'l19c4-03', type: 'situation', grammarPoint: 'l19c4_able_future', situation: { ru: 'У вас есть план, и цель достижима. Скажи, что вы сможете достичь этой цели.', uk: 'У вас є план, і мета досяжна. Скажи, що ви зможете досягти цієї мети.' }, accepted: ['We will be able to achieve this goal.'] },
    { id: 'l19c4-04', type: 'situation', grammarPoint: 'l19c4_able_future', situation: { ru: 'Они упорно работают. Скажи, что у них получится: они смогут добиться успеха.', uk: 'Вони наполегливо працюють. Скажи, що в них вийде: вони зможуть досягти успіху.' }, accepted: ['They will be able to succeed.'] },
    { id: 'l19c4-05', type: 'situation', grammarPoint: 'l19c4_may_i', situation: { ru: 'Тебе нужно что-то уточнить. Вежливо спроси, можно ли задать вопрос.', uk: 'Тобі потрібно щось уточнити. Ввічливо запитай, чи можна поставити питання.' }, accepted: ['May I ask a question?', 'Can I ask a question?'] },
    { id: 'l19c4-06', type: 'situation', grammarPoint: 'l19c4_may_i', situation: { ru: 'Тебе нужна конкретная комната в гостинице. Вежливо спроси, можно ли её запросить.', uk: 'Тобі потрібна конкретна кімната в готелі. Ввічливо запитай, чи можна її попросити.' }, accepted: ['May I request a specific room?', 'Can I request a specific room?'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l19c4-07', type: 'dialogue', grammarPoint: 'l19c4_able_present', partnerLine: 'I am able to concentrate here.', situation: { ru: 'Друг говорит, что может сосредоточиться здесь. Скажи, что она способна запомнить эти слова.', uk: 'Друг каже, що може зосередитися тут. Скажи, що вона здатна запам’ятати ці слова.' }, accepted: ['She is able to memorize these words.'] },
    { id: 'l19c4-08', type: 'dialogue', grammarPoint: 'l19c4_able_present', partnerLine: 'She is able to forgive him.', situation: { ru: 'Друг говорит, что она способна простить его. Скажи, что ты способен объяснить это недоразумение.', uk: 'Друг каже, що вона здатна пробачити його. Скажи, що ти здатен пояснити це непорозуміння.' }, accepted: ['I am able to explain the misunderstanding.'] },
    { id: 'l19c4-09', type: 'dialogue', grammarPoint: 'l19c4_able_future', partnerLine: 'They will be able to revise at home.', situation: { ru: 'Друг говорит, что они смогут повторять дома. Скажи, что вы сможете произнести эти слова.', uk: 'Друг каже, що вони зможуть повторювати вдома. Скажи, що ви зможете вимовити ці слова.' }, accepted: ['We will be able to pronounce these words.'] },
    { id: 'l19c4-10', type: 'dialogue', grammarPoint: 'l19c4_able_future', partnerLine: 'We will be able to resolve the problem.', situation: { ru: 'Друг говорит, что вы сможете решить проблему. Скажи, что они смогут преодолеть эту трудность.', uk: 'Друг каже, що ви зможете вирішити проблему. Скажи, що вони зможуть подолати цю складність.' }, accepted: ['They will be able to overcome this difficulty.'] },
    { id: 'l19c4-11', type: 'dialogue', grammarPoint: 'l19c4_may_i', partnerLine: 'I am able to enrol online.', situation: { ru: 'Друг говорит, что может записаться онлайн. Вежливо спроси, можно ли запросить дополнительную помощь.', uk: 'Друг каже, що може записатися онлайн. Ввічливо запитай, чи можна попросити додаткову допомогу.' }, accepted: ['May I request additional help?', 'Can I request additional help?'] },
    { id: 'l19c4-12', type: 'dialogue', grammarPoint: 'l19c4_may_i', partnerLine: 'She is able to recover at home.', situation: { ru: 'Друг говорит, что она восстанавливается дома. Вежливо спроси, можно ли поговорить с ней напрямую.', uk: 'Друг каже, що вона відновлюється вдома. Ввічливо запитай, чи можна поговорити з нею напряму.' }, accepted: ['May I speak to her directly?', 'Can I speak to her directly?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l19c4-13', type: 'fix', grammarPoint: 'l19c4_able_present', wrong: 'She able to recover at home.', accepted: ['She is able to recover at home.'] },
    { id: 'l19c4-14', type: 'fix', grammarPoint: 'l19c4_able_future', wrong: 'We will able to achieve this goal.', accepted: ['We will be able to achieve this goal.'] },
    { id: 'l19c4-15', type: 'fix', grammarPoint: 'l19c4_may_i', wrong: 'May I to request a specific room?', accepted: ['May I request a specific room?', 'Can I request a specific room?'] },
    { id: 'l19c4-16', type: 'fix', grammarPoint: 'l19c4_may_i', wrong: 'I may ask a question?', accepted: ['May I ask a question?', 'Can I ask a question?'] },
  ],
};
