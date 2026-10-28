// chapter_exam_v2_l24_c3.ts — банк экзамена v2: урок 24, глава 3 (эпизоды 17–24). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–24 урока 24 — have / has been + …ing и сроки for / since / all morning. Ситуация и ответ
// сходятся по смыслу. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L24_C3: ChapterExamV2Bank = {
  lessonOrdinal: 24,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l24c3_have_been', label: { ru: 'я, мы, они — have been …ing', uk: 'я, ми, вони — have been …ing' }, episodeOrdinals: [17, 18, 19] },
    { id: 'l24c3_has_been', label: { ru: 'он, она, оно — has been …ing', uk: 'він, вона, воно — has been …ing' }, episodeOrdinals: [18, 21, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l24c3-01', type: 'situation', grammarPoint: 'l24c3_have_been', situation: { ru: 'Друг опаздывает на встречу. Напиши ему, что ты ждёшь уже час.', uk: 'Друг запізнюється на зустріч. Напиши йому, що ти чекаєш уже годину.' }, accepted: ['I have been waiting for an hour.', "I've been waiting for an hour."] },
    { id: 'l24c3-02', type: 'situation', grammarPoint: 'l24c3_have_been', situation: { ru: 'Гости заглядывают на кухню. Скажи, что ты месишь тесто уже десять минут.', uk: 'Гості зазирають на кухню. Скажи, що ти місиш тісто вже десять хвилин.' }, accepted: ['I have been mixing dough for ten minutes.', "I've been mixing dough for ten minutes.", 'I have been mixing the dough for ten minutes.', "I've been mixing the dough for ten minutes."] },
    { id: 'l24c3-03', type: 'situation', grammarPoint: 'l24c3_have_been', situation: { ru: 'Подруга видит у тебя толстую книгу. Скажи, что читаешь этот роман уже неделю.', uk: 'Подруга бачить у тебе товсту книжку. Скажи, що читаєш цей роман уже тиждень.' }, accepted: ['I have been reading this novel for a week.'] },
    { id: 'l24c3-04', type: 'situation', grammarPoint: 'l24c3_have_been', situation: { ru: 'Соседи жалуются на шум за стеной. Скажи, что вы делаете ремонт в этом доме уже месяц.', uk: 'Сусіди скаржаться на шум за стіною. Скажи, що ви робите ремонт у цьому будинку вже місяць.' }, accepted: ['We have been renovating this house for a month.'] },
    { id: 'l24c3-05', type: 'situation', grammarPoint: 'l24c3_has_been', situation: { ru: 'Подруга с утра сидит в порту. Расскажи, что она всё утро смотрит на лодки в гавани.', uk: 'Подруга з ранку сидить у порту. Розкажи, що вона весь ранок дивиться на човни в гавані.' }, accepted: ['She has been watching the boats in the harbour all morning.'] },
    { id: 'l24c3-06', type: 'situation', grammarPoint: 'l24c3_has_been', situation: { ru: 'Ты у врача. Скажи, что у тебя с утра чешется кожа.', uk: 'Ти в лікаря. Скажи, що в тебе з ранку свербить шкіра.' }, accepted: ['My skin has been itching since this morning.', 'My skin has been itching all morning.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c3-07', type: 'dialogue', grammarPoint: 'l24c3_have_been', partnerLine: 'I have been waiting for an hour.', situation: { ru: 'Скажи, что ты ждёшь дольше — два часа.', uk: 'Скажи, що ти чекаєш довше — дві години.' }, accepted: ['I have been waiting for two hours.', "I've been waiting for two hours."] },
    { id: 'l24c3-08', type: 'dialogue', grammarPoint: 'l24c3_has_been', partnerLine: 'She has been working since this morning.', situation: { ru: 'Скажи, что он работает с утра.', uk: 'Скажи, що він працює з ранку.' }, accepted: ['He has been working since this morning.', 'He has been working all morning.'] },
    { id: 'l24c3-09', type: 'dialogue', grammarPoint: 'l24c3_have_been', partnerLine: 'I have been reading this mystery for an hour.', situation: { ru: 'Скажи, что ты весь день читаешь фэнтези.', uk: 'Скажи, що ти весь день читаєш фентезі.' }, accepted: ['I have been reading fantasy all day.', "I've been reading fantasy all day."] },
    { id: 'l24c3-10', type: 'dialogue', grammarPoint: 'l24c3_has_been', partnerLine: 'They have been playing in the sand for an hour.', situation: { ru: 'Дети играют в песке. Скажи, что их мама уже два часа гуляет вдоль берега.', uk: 'Діти граються в піску. Скажи, що їхня мама вже дві години гуляє вздовж берега.' }, accepted: ['She has been walking along the coast for two hours.'] },
    { id: 'l24c3-11', type: 'dialogue', grammarPoint: 'l24c3_has_been', partnerLine: 'My fingers have been bleeding since this morning.', situation: { ru: 'Пожалуйся в ответ: у тебя с утра щиплет глаза.', uk: 'Поскаржся у відповідь: у тебе з ранку щиплять очі.' }, accepted: ['My eyes have been stinging since this morning.', 'My eyes have been stinging all morning.'] },
    { id: 'l24c3-12', type: 'dialogue', grammarPoint: 'l24c3_have_been', partnerLine: 'We have been watching a comedian for an hour.', situation: { ru: 'Скажи, что ты уже час пытаешься сдержать смех.', uk: 'Скажи, що ти вже годину намагаєшся стримати сміх.' }, accepted: ['I have been trying to hide my laughter for an hour.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c3-13', type: 'fix', grammarPoint: 'l24c3_have_been', wrong: 'I have been wait for an hour.', accepted: ['I have been waiting for an hour.'] },
    { id: 'l24c3-14', type: 'fix', grammarPoint: 'l24c3_has_been', wrong: 'She have been preparing the filling for an hour.', accepted: ['She has been preparing the filling for an hour.'] },
    { id: 'l24c3-15', type: 'fix', grammarPoint: 'l24c3_have_been', wrong: 'We has been choosing flooring for an hour.', accepted: ['We have been choosing flooring for an hour.'] },
    { id: 'l24c3-16', type: 'fix', grammarPoint: 'l24c3_has_been', wrong: 'He has being sweeping up crumbs for ten minutes.', accepted: ['He has been sweeping up crumbs for ten minutes.', 'He has been sweeping up the crumbs for ten minutes.'] },
  ],
};
