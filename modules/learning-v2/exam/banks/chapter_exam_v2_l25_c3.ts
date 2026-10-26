// chapter_exam_v2_l25_c3.ts — банк экзамена v2: урок 25, глава 3 (эпизоды 17–24). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–24 урока 25 — had + форма для того, что случилось раньше другого события в прошлом
// (before + прошлое). Ситуация задаёт порядок событий. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L25_C3: ChapterExamV2Bank = {
  lessonOrdinal: 25,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l25c3_done_before', label: { ru: 'сделали заранее — had cleaned before', uk: 'зробили заздалегідь — had cleaned before' }, episodeOrdinals: [17, 18, 20] },
    { id: 'l25c3_happened_before', label: { ru: 'уже случилось к тому моменту — had landed before', uk: 'уже сталося на той момент — had landed before' }, episodeOrdinals: [19, 23, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l25c3-01', type: 'situation', grammarPoint: 'l25c3_done_before', situation: { ru: 'Друзья пришли, а кухня уже сияет. Скажи, что вы убрали кухню до их прихода.', uk: 'Друзі прийшли, а кухня вже сяє. Скажи, що ви прибрали кухню до їхнього приходу.' }, accepted: ['We had cleaned the kitchen before our friends came.'] },
    { id: 'l25c3-02', type: 'situation', grammarPoint: 'l25c3_done_before', situation: { ru: 'Ты едва успел на праздник, но подарки были готовы. Скажи, что завернул подарки до начала праздника.', uk: 'Ти ледве встиг на свято, але подарунки були готові. Скажи, що загорнув подарунки до початку свята.' }, accepted: ['I had wrapped the presents before the party began.'] },
    { id: 'l25c3-03', type: 'situation', grammarPoint: 'l25c3_done_before', situation: { ru: 'На занятии ты помнил каждую деталь. Скажи, что перечитал рассказ до начала занятия.', uk: 'На занятті ти пам’ятав кожну деталь. Скажи, що перечитав оповідання до початку заняття.' }, accepted: ['I had reread the story before the class started.'] },
    { id: 'l25c3-04', type: 'situation', grammarPoint: 'l25c3_happened_before', situation: { ru: 'Кот вбежал в комнату, но мыши уже не было. Скажи, что мышь убежала до того, как вошёл кот.', uk: 'Кіт вбіг у кімнату, але миші вже не було. Скажи, що миша втекла до того, як увійшов кіт.' }, accepted: ['The mouse had fled before the cat entered the room.'] },
    { id: 'l25c3-05', type: 'situation', grammarPoint: 'l25c3_happened_before', situation: { ru: 'Утром тучи разошлись. Скажи, что небо посветлело до того, как вы вышли из дома.', uk: 'Уранці хмари розійшлися. Скажи, що небо проясніло до того, як ви вийшли з дому.' }, accepted: ['The sky had brightened before we left the house.'] },
    { id: 'l25c3-06', type: 'situation', grammarPoint: 'l25c3_done_before', situation: { ru: 'Расскажи, что перед переездом вы съездили посмотреть на свой старый дом.', uk: 'Розкажи, що перед переїздом ви з’їздили подивитися на свій старий будинок.' }, accepted: ['We had revisited our old house before we moved.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c3-07', type: 'dialogue', grammarPoint: 'l25c3_done_before', partnerLine: 'You arrived late.', situation: { ru: 'Возрази: ты пришёл ещё до того, как начался дождь.', uk: 'Заперечи: ти прийшов ще до того, як почався дощ.' }, accepted: ['I had arrived before the rain started.'] },
    { id: 'l25c3-08', type: 'dialogue', grammarPoint: 'l25c3_done_before', partnerLine: 'She tasted the tea.', situation: { ru: 'Скажи, что ты растворил сахар ещё до этого.', uk: 'Скажи, що ти розчинив цукор ще до цього.' }, accepted: ['I had dissolved the sugar before she tasted the tea.', 'I had dissolved the sugar before she tasted it.'] },
    { id: 'l25c3-09', type: 'dialogue', grammarPoint: 'l25c3_done_before', partnerLine: 'The lights went out.', situation: { ru: 'Скажи, что вы успели похлопать певцу до этого.', uk: 'Скажи, що ви встигли поаплодувати співакові до цього.' }, accepted: ['We had applauded the singer before the lights went out.'] },
    { id: 'l25c3-10', type: 'dialogue', grammarPoint: 'l25c3_happened_before', partnerLine: 'We opened the window.', situation: { ru: 'Скажи, что птица села на крышу ещё до этого.', uk: 'Скажи, що птах сів на дах ще до цього.' }, accepted: ['The bird had landed on the roof before we opened the window.'] },
    { id: 'l25c3-11', type: 'dialogue', grammarPoint: 'l25c3_happened_before', partnerLine: 'You asked for help.', situation: { ru: 'Объясни: инструкция тебя запутала ещё до этого.', uk: 'Поясни: інструкція тебе заплутала ще до цього.' }, accepted: ['The instructions had confused me before I asked for help.', 'The instructions had confused me.'] },
    { id: 'l25c3-12', type: 'dialogue', grammarPoint: 'l25c3_happened_before', partnerLine: 'We moved here.', situation: { ru: 'Скажи, что дорогу расширили ещё до вашего переезда.', uk: 'Скажи, що дорогу розширили ще до вашого переїзду.' }, accepted: ['They had widened the road before we moved here.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c3-13', type: 'fix', grammarPoint: 'l25c3_done_before', wrong: 'I have lost my phone before I left home.', accepted: ['I had lost my phone before I left home.'] },
    { id: 'l25c3-14', type: 'fix', grammarPoint: 'l25c3_done_before', wrong: 'She had curl her hair before the guests arrived.', accepted: ['She had curled her hair before the guests arrived.'] },
    { id: 'l25c3-15', type: 'fix', grammarPoint: 'l25c3_done_before', wrong: 'They have rebuilt the wall before we arrived.', accepted: ['They had rebuilt the wall before we arrived.'] },
    { id: 'l25c3-16', type: 'fix', grammarPoint: 'l25c3_happened_before', wrong: 'The dough had expand before she put it in the oven.', accepted: ['The dough had expanded before she put it in the oven.'] },
  ],
};
