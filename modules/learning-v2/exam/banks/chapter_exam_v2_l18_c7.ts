// chapter_exam_v2_l18_c7.ts — банк экзамена v2: урок 18, глава 7 (эпизоды 49–56). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 7 — итог урока: «so important» (так), «such a great feeling» (такой) и планы «We are going to discuss …» / «We are meeting … tomorrow». Только слова и формы эпизодов 1–56 урока 18; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L18_C7: ChapterExamV2Bank = {
  lessonOrdinal: 18,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l18c7_so', label: { ru: 'так: so important / so serious / so useful', uk: 'так: so important / so serious / so useful' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
    { id: 'l18c7_such', label: { ru: 'такой: such a great feeling / such a big responsibility', uk: 'такий: such a great feeling / such a big responsibility' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
    { id: 'l18c7_plans', label: { ru: 'планы: We are going to discuss … / We are meeting … tomorrow', uk: 'плани: We are going to discuss … / We are meeting … tomorrow' }, episodeOrdinals: [49, 50, 51, 52, 53, 54, 55, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l18c7-01', type: 'situation', grammarPoint: 'l18c7_so', situation: { ru: 'Взаимное уважение очень много значит. Скажи, что оно так важно.', uk: 'Взаємна повага дуже багато значить. Скажи, що вона така важлива.' }, accepted: ['Mutual respect is so important.'] },
    { id: 'l18c7-02', type: 'situation', grammarPoint: 'l18c7_so', situation: { ru: 'Свобода очень много значит. Скажи, что она так важна.', uk: 'Свобода дуже багато значить. Скажи, що вона така важлива.' }, accepted: ['Freedom is so important.'] },
    { id: 'l18c7-03', type: 'situation', grammarPoint: 'l18c7_such', situation: { ru: 'Независимость — это прекрасное чувство. Скажи, что это такое прекрасное чувство.', uk: 'Незалежність — це прекрасне почуття. Скажи, що це таке чудове почуття.' }, accepted: ['Independence is such a great feeling.'] },
    { id: 'l18c7-04', type: 'situation', grammarPoint: 'l18c7_such', situation: { ru: 'На тебе лежит многое. Скажи, что это такая большая ответственность.', uk: 'На тобі лежить багато. Скажи, що це така велика відповідальність.' }, accepted: ['This is such a big responsibility.'] },
    { id: 'l18c7-05', type: 'situation', grammarPoint: 'l18c7_plans', situation: { ru: 'Вы решили поговорить об ответственности. Скажи, что собираетесь обсудить эту ответственность.', uk: 'Ви вирішили поговорити про відповідальність. Скажи, що збираєтесь обговорити цю відповідальність.' }, accepted: ['We are going to discuss this responsibility.'] },
    { id: 'l18c7-06', type: 'situation', grammarPoint: 'l18c7_plans', situation: { ru: 'Завтра вы встречаетесь с родными — договорились. Скажи об этом.', uk: 'Завтра ви зустрічаєтесь із рідними — домовилися. Скажи про це.' }, accepted: ['We are meeting our family tomorrow.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l18c7-07', type: 'dialogue', grammarPoint: 'l18c7_so', partnerLine: 'Your opinion is so useful.', situation: { ru: 'Друг говорит, что твоё мнение так полезно. Скажи, что хорошее общение так важно.', uk: 'Друг каже, що твоя думка така корисна. Скажи, що гарне спілкування таке важливе.' }, accepted: ['Good communication is so important.'] },
    { id: 'l18c7-08', type: 'dialogue', grammarPoint: 'l18c7_so', partnerLine: 'This benefit is so important.', situation: { ru: 'Друг говорит, что это преимущество так важно. Скажи, что этот недостаток такой серьёзный.', uk: 'Друг каже, що ця перевага така важлива. Скажи, що цей недолік такий серйозний.' }, accepted: ['This disadvantage is so serious.'] },
    { id: 'l18c7-09', type: 'dialogue', grammarPoint: 'l18c7_such', partnerLine: 'You made such a great effort.', situation: { ru: 'Друг говорит, что ты приложил огромные усилия. Скажи, что это такой большой успех.', uk: 'Друг каже, що ти доклав величезних зусиль. Скажи, що це такий великий успіх.' }, accepted: ['This is such a great success.'] },
    { id: 'l18c7-10', type: 'dialogue', grammarPoint: 'l18c7_such', partnerLine: 'This is such a useful discussion.', situation: { ru: 'Друг говорит, что это такое полезное обсуждение. Скажи, что у вас такие хорошие отношения.', uk: 'Друг каже, що це таке корисне обговорення. Скажи, що у вас такі добрі стосунки.' }, accepted: ['We have such a good relationship.'] },
    { id: 'l18c7-11', type: 'dialogue', grammarPoint: 'l18c7_plans', partnerLine: 'This is such a good opportunity.', situation: { ru: 'Друг говорит, что это такая хорошая возможность. Скажи, что вы собираетесь обсудить эту возможность.', uk: 'Друг каже, що це така гарна можливість. Скажи, що ви збираєтесь обговорити цю можливість.' }, accepted: ['We are going to discuss this opportunity.'] },
    { id: 'l18c7-12', type: 'dialogue', grammarPoint: 'l18c7_plans', partnerLine: 'You have such great energy.', situation: { ru: 'Друг говорит, что у тебя такая огромная энергия. Скажи, что завтра вы встречаетесь в спортзале — договорились.', uk: 'Друг каже, що в тебе така величезна енергія. Скажи, що завтра ви зустрічаєтесь у спортзалі — домовилися.' }, accepted: ['We are meeting at the gym tomorrow.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l18c7-13', type: 'fix', grammarPoint: 'l18c7_so', wrong: 'Concentration is such important.', accepted: ['Concentration is so important.'] },
    { id: 'l18c7-14', type: 'fix', grammarPoint: 'l18c7_such', wrong: 'You have such good a memory.', accepted: ['You have such a good memory.'] },
    { id: 'l18c7-15', type: 'fix', grammarPoint: 'l18c7_such', wrong: 'There is such big difference.', accepted: ['There is such a big difference.'] },
    { id: 'l18c7-16', type: 'fix', grammarPoint: 'l18c7_plans', wrong: 'We going to practise together.', accepted: ['We are going to practise together.'] },
  ],
};
