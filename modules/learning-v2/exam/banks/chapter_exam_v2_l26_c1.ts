// chapter_exam_v2_l26_c1.ts — банк экзамена v2: урок 26, глава 1 (эпизоды 1–8). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–8 урока 26 — when / if + настоящее для того, что бывает всегда (вода испаряется, когда…;
// мне нехорошо, когда…). Ситуация и ответ сходятся по смыслу. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L26_C1: ChapterExamV2Bank = {
  lessonOrdinal: 26,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l26c1_when_always', label: { ru: 'что бывает всегда — evaporates when', uk: 'що буває завжди — evaporates when' }, episodeOrdinals: [1, 2, 3] },
    { id: 'l26c1_i_when', label: { ru: 'что со мной бывает — I feel … when', uk: 'що зі мною буває — I feel … when' }, episodeOrdinals: [4, 5, 6] },
    { id: 'l26c1_if', label: { ru: 'если так, то так — breaks if', uk: 'якщо так, то так — breaks if' }, episodeOrdinals: [7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l26c1-01', type: 'situation', grammarPoint: 'l26c1_when_always', situation: { ru: 'Друг удивляется, куда делась вода из миски. Объясни: вода испаряется, когда её оставляешь в открытой миске.', uk: 'Друг дивується, куди поділася вода з миски. Поясни: вода випаровується, коли її залишаєш у відкритій мисці.' }, accepted: ['Water evaporates when you leave it in an open bowl.'] },
    { id: 'l26c1-02', type: 'situation', grammarPoint: 'l26c1_when_always', situation: { ru: 'Ты идёшь по мокрому полу, и обувь громко скрипит. Объясни: она скрипит, когда пол мокрый.', uk: 'Ти йдеш мокрою підлогою, і взуття голосно рипить. Поясни: воно рипить, коли підлога мокра.' }, accepted: ['My shoes squeak when the floor is wet.'] },
    { id: 'l26c1-03', type: 'situation', grammarPoint: 'l26c1_when_always', situation: { ru: 'У тебя что-то дрожит в кармане. Объясни: телефон вибрирует, когда кто-то звонит.', uk: 'У тебе щось тремтить у кишені. Поясни: телефон вібрує, коли хтось дзвонить.' }, accepted: ['My phone vibrates when someone calls.'] },
    { id: 'l26c1-04', type: 'situation', grammarPoint: 'l26c1_i_when', situation: { ru: 'Друг даёт тебе журнал в дороге. Объясни, что тебя тошнит, когда ты читаешь в машине.', uk: 'Друг дає тобі журнал у дорозі. Поясни, що тебе нудить, коли ти читаєш у машині.' }, accepted: ['I feel nauseous when I read in a car.'] },
    { id: 'l26c1-05', type: 'situation', grammarPoint: 'l26c1_i_when', situation: { ru: 'Друг замечает, что на собеседовании ты тараторишь. Объясни: ты говоришь быстро, когда нервничаешь.', uk: 'Друг помічає, що на співбесіді ти торохтиш. Поясни: ти говориш швидко, коли нервуєш.' }, accepted: ['I speak rapidly when I get nervous.', 'I speak fast when I get nervous.'] },
    { id: 'l26c1-06', type: 'situation', grammarPoint: 'l26c1_if', situation: { ru: 'Ребёнок гнёт старую пластиковую линейку. Предупреди: хрупкий пластик ломается, если его согнуть.', uk: 'Дитина гне стару пластикову лінійку. Попередь: крихкий пластик ламається, якщо його зігнути.' }, accepted: ['Brittle plastic breaks if you bend it.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c1-07', type: 'dialogue', grammarPoint: 'l26c1_i_when', partnerLine: 'It is freezing outside.', situation: { ru: 'Скажи, что пальцы у тебя немеют, когда сильно мёрзнут.', uk: 'Скажи, що пальці в тебе німіють, коли сильно мерзнуть.' }, accepted: ['My fingers feel numb when they get very cold.', 'My fingers feel numb when they get cold.'] },
    { id: 'l26c1-08', type: 'dialogue', grammarPoint: 'l26c1_if', partnerLine: 'The soup lacks flavour.', situation: { ru: 'Скажи, что ты добавляешь соль, если супу не хватает вкуса.', uk: 'Скажи, що ти додаєш сіль, якщо супу бракує смаку.' }, accepted: ['I add salt if the soup lacks flavour.'] },
    { id: 'l26c1-09', type: 'dialogue', grammarPoint: 'l26c1_when_always', partnerLine: 'The doors open.', situation: { ru: 'Объясни: двери открываются сами, когда ты подходишь.', uk: 'Поясни: двері відчиняються самі, коли ти підходиш.' }, accepted: ['The doors open automatically when I approach.', 'The doors open automatically when you approach.'] },
    { id: 'l26c1-10', type: 'dialogue', grammarPoint: 'l26c1_i_when', partnerLine: 'I have a headache.', situation: { ru: 'Скажи, что у тебя голова пульсирует, когда болит.', uk: 'Скажи, що в тебе голова пульсує, коли болить.' }, accepted: ['My head throbs when I have a headache.'] },
    { id: 'l26c1-11', type: 'dialogue', grammarPoint: 'l26c1_i_when', partnerLine: 'I want a dark room.', situation: { ru: 'Скажи, что ты выбираешь плотные шторы, когда хочешь тёмную комнату.', uk: 'Скажи, що ти обираєш щільні штори, коли хочеш темну кімнату.' }, accepted: ['I choose opaque curtains when I want a dark room.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c1-12', type: 'fix', grammarPoint: 'l26c1_when_always', wrong: 'Water evaporate when you leave it in an open bowl.', accepted: ['Water evaporates when you leave it in an open bowl.'] },
    { id: 'l26c1-13', type: 'fix', grammarPoint: 'l26c1_when_always', wrong: 'My phone vibrate when someone calls.', accepted: ['My phone vibrates when someone calls.'] },
    { id: 'l26c1-14', type: 'fix', grammarPoint: 'l26c1_i_when', wrong: 'I feels nauseous when I read in a car.', accepted: ['I feel nauseous when I read in a car.'] },
    { id: 'l26c1-15', type: 'fix', grammarPoint: 'l26c1_if', wrong: 'Brittle plastic break if you bend it.', accepted: ['Brittle plastic breaks if you bend it.'] },
    { id: 'l26c1-16', type: 'fix', grammarPoint: 'l26c1_when_always', wrong: 'The engine roar when I press the pedal.', accepted: ['The engine roars when I press the pedal.'] },
  ],
};
