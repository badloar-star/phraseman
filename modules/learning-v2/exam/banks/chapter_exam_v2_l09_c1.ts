// chapter_exam_v2_l09_c1.ts — банк экзамена v2: урок 9, глава 1 (эпизоды 1–8). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–8 — am / is / are + действие с -ing прямо сейчас; not ещё впереди; вопросы Is / Are … -ing? в эпизодах ещё впереди.
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L09_C1: ChapterExamV2Bank = {
  lessonOrdinal: 9,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l09c1_i_am', label: { ru: 'я сейчас — I am + -ing', uk: 'я зараз — I am + -ing' }, episodeOrdinals: [1, 2, 5] },
    { id: 'l09c1_she_is', label: { ru: 'он / она сейчас — is + -ing', uk: 'він / вона зараз — is + -ing' }, episodeOrdinals: [1, 3, 4] },
    { id: 'l09c1_they_are', label: { ru: 'мы / они сейчас — are + -ing', uk: 'ми / вони зараз — are + -ing' }, episodeOrdinals: [1, 2, 6] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l09c1-01', type: 'situation', grammarPoint: 'l09c1_i_am', situation: { ru: 'Ты стоишь у кормушки с биноклем. Напиши другу, что наблюдаешь за птицами.', uk: 'Ти стоїш біля годівнички з біноклем. Напиши другові, що спостерігаєш за птахами.' }, accepted: ['I am observing the birds.', "I'm observing the birds.", 'I am watching the birds.'] },
    { id: 'l09c1-02', type: 'situation', grammarPoint: 'l09c1_she_is', situation: { ru: 'Дочка у куста рассматривает гусеницу. Скажи, что она смотрит на гусеницу.', uk: 'Донька біля куща роздивляється гусінь. Скажи, що вона дивиться на гусінь.' }, accepted: ['She is watching a caterpillar.', 'She is watching the caterpillar.', 'She is observing the caterpillar.'] },
    { id: 'l09c1-03', type: 'situation', grammarPoint: 'l09c1_they_are', situation: { ru: 'Дети в саду роют канаву для кабеля. Скажи, что они копают канаву.', uk: 'Діти в саду риють канаву для кабелю. Скажи, що вони копають канаву.' }, accepted: ['They are digging a trench.', 'They are digging the trench.'] },
    { id: 'l09c1-04', type: 'situation', grammarPoint: 'l09c1_i_am', situation: { ru: 'Ты варишь какао и всё время его мешаешь. Скажи, что мешаешь какао.', uk: 'Ти вариш какао й весь час його мішаєш. Скажи, що мішаєш какао.' }, accepted: ['I am stirring the cocoa.', "I'm stirring the cocoa."] },
    { id: 'l09c1-05', type: 'situation', grammarPoint: 'l09c1_she_is', situation: { ru: 'Друг стоит на пароме и машет вам. Скажи, что он машет с парома.', uk: 'Друг стоїть на поромі й махає вам. Скажи, що він махає з порому.' }, accepted: ['He is waving from the ferry.', "He's waving from the ferry."] },
    { id: 'l09c1-06', type: 'situation', grammarPoint: 'l09c1_they_are', situation: { ru: 'Друзья стоят на причале и машут вам вслед. Скажи, что они машут с причала.', uk: 'Друзі стоять на причалі й махають вам услід. Скажи, що вони махають з причалу.' }, accepted: ['They are waving from the dock.', "They're waving from the dock."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c1-07', type: 'dialogue', grammarPoint: 'l09c1_i_am', partnerLine: 'A visitor is waiting.', situation: { ru: 'Гость ждёт у мастерской. Скажи, что ты стучишь в дверь.', uk: 'Гість чекає біля майстерні. Скажи, що ти стукаєш у двері.' }, accepted: ['I am knocking at the door.', "I'm knocking at the door."] },
    { id: 'l09c1-08', type: 'dialogue', grammarPoint: 'l09c1_she_is', partnerLine: 'I am using a magnifier.', situation: { ru: 'Скажи, что она пользуется лупой.', uk: 'Скажи, що вона користується лупою.' }, accepted: ['She is using a magnifier.', 'She is using the magnifier.'] },
    { id: 'l09c1-09', type: 'dialogue', grammarPoint: 'l09c1_they_are', partnerLine: 'The performer is waving.', situation: { ru: 'Зрители в зале радуются. Скажи, что они хлопают.', uk: 'Глядачі в залі радіють. Скажи, що вони плескають.' }, accepted: ['They are clapping.', 'The audience is clapping.'] },
    { id: 'l09c1-10', type: 'dialogue', grammarPoint: 'l09c1_i_am', partnerLine: 'Please clap.', situation: { ru: 'Скажи, что ты уже хлопаешь.', uk: 'Скажи, що ти вже плескаєш.' }, accepted: ['I am clapping.', "I'm clapping."] },
    { id: 'l09c1-11', type: 'dialogue', grammarPoint: 'l09c1_she_is', partnerLine: 'The potter makes cups.', situation: { ru: 'Мастер сейчас делает украшения. Скажи, что она пользуется формой.', uk: 'Майстриня зараз робить прикраси. Скажи, що вона користується формою.' }, accepted: ['She is using a mould.', 'She is using the mould.'] },
    { id: 'l09c1-12', type: 'dialogue', grammarPoint: 'l09c1_they_are', partnerLine: 'I am stirring the cocoa.', situation: { ru: 'Скажи, что вы вдвоём мешаете тесто для вафель.', uk: 'Скажи, що ви вдвох мішаєте тісто для вафель.' }, accepted: ['We are stirring the batter.', "We're stirring the batter."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c1-13', type: 'fix', grammarPoint: 'l09c1_i_am', wrong: 'I stirring the custard.', accepted: ['I am stirring the custard.', "I'm stirring the custard."] },
    { id: 'l09c1-14', type: 'fix', grammarPoint: 'l09c1_she_is', wrong: 'She are waving.', accepted: ['She is waving.', "She's waving."] },
    { id: 'l09c1-15', type: 'fix', grammarPoint: 'l09c1_they_are', wrong: 'They is digging a hole.', accepted: ['They are digging a hole.'] },
    { id: 'l09c1-16', type: 'fix', grammarPoint: 'l09c1_i_am', wrong: 'I am wave.', accepted: ['I am waving.', "I'm waving."] },
  ],
};
