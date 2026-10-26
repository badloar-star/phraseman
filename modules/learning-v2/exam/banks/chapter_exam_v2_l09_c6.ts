// chapter_exam_v2_l09_c6.ts — банк экзамена v2: урок 9, глава 6 (эпизоды 41–48). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–48 — что я делаю сейчас I am + -ing, мы / они / руки сейчас are + -ing, просьба Please don't …; вопросов в банках нет (правило сторожа).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L09_C6: ChapterExamV2Bank = {
  lessonOrdinal: 9,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l09c6_i_am', label: { ru: 'я сейчас — I am + -ing', uk: 'я зараз — I am + -ing' }, episodeOrdinals: [42, 43, 44] },
    { id: 'l09c6_plural', label: { ru: 'мы / они сейчас — are + -ing', uk: 'ми / вони зараз — are + -ing' }, episodeOrdinals: [41, 45, 46] },
    { id: 'l09c6_please', label: { ru: "просьба — Please don't …", uk: "прохання — Please don't …" }, episodeOrdinals: [42, 45, 46] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l09c6-01', type: 'situation', grammarPoint: 'l09c6_i_am', situation: { ru: 'Ты за кулисами, твой выход ещё не скоро. Скажи, что ждёшь своей реплики.', uk: 'Ти за лаштунками, твій вихід ще не скоро. Скажи, що чекаєш своєї репліки.' }, accepted: ['I am waiting for my cue.', "I'm waiting for my cue."] },
    { id: 'l09c6-02', type: 'situation', grammarPoint: 'l09c6_plural', situation: { ru: 'Ты держишь листок с речью, и у тебя дрожат руки. Скажи, что руки дрожат.', uk: 'Ти тримаєш аркуш із промовою, і в тебе тремтять руки. Скажи, що руки тремтять.' }, accepted: ['My hands are trembling.'] },
    { id: 'l09c6-03', type: 'situation', grammarPoint: 'l09c6_please', situation: { ru: 'Свет на сцене уже настроен. Попроси не двигать прожектор.', uk: 'Світло на сцені вже налаштоване. Попроси не рухати прожектор.' }, accepted: ["Please don't move the spotlight."] },
    { id: 'l09c6-04', type: 'situation', grammarPoint: 'l09c6_plural', situation: { ru: 'Сегодня вы никуда не спешите и гуляете по городу. Напиши, что вы бродите по городу.', uk: 'Сьогодні ви нікуди не поспішаєте й гуляєте містом. Напиши, що ви блукаєте містом.' }, accepted: ['We are wandering through the town.', "We're wandering through the town."] },
    { id: 'l09c6-05', type: 'situation', grammarPoint: 'l09c6_i_am', situation: { ru: 'Ты убираешь пустую рамку со снимка. Скажи, что обрезаешь фото.', uk: 'Ти прибираєш порожню рамку зі знімка. Скажи, що обрізаєш фото.' }, accepted: ['I am cropping the photo.', "I'm cropping the photo."] },
    { id: 'l09c6-06', type: 'situation', grammarPoint: 'l09c6_please', situation: { ru: 'Друг громко зовёт кого-то через болото и пугает птиц. Попроси не кричать.', uk: 'Друг голосно кличе когось через болото й лякає птахів. Попроси не кричати.' }, accepted: ["Please don't shout."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c6-07', type: 'dialogue', grammarPoint: 'l09c6_i_am', partnerLine: "Please don't close the window.", situation: { ru: 'Скажи, что ты как раз проверяешь предпросмотр.', uk: 'Скажи, що ти якраз перевіряєш попередній перегляд.' }, accepted: ['I am checking the preview.', "I'm checking the preview."] },
    { id: 'l09c6-08', type: 'dialogue', grammarPoint: 'l09c6_plural', partnerLine: 'The heron is standing in the water.', situation: { ru: 'Скажи, что вы переходите по дамбе.', uk: 'Скажи, що ви переходите греблею.' }, accepted: ['We are crossing the causeway.', "We're crossing the causeway."] },
    { id: 'l09c6-09', type: 'dialogue', grammarPoint: 'l09c6_please', partnerLine: 'The wallpaper is wet.', situation: { ru: 'Попроси не трогать обои.', uk: 'Попроси не чіпати шпалери.' }, accepted: ["Please don't touch the wallpaper."] },
    { id: 'l09c6-10', type: 'dialogue', grammarPoint: 'l09c6_i_am', partnerLine: 'This is a swatch.', situation: { ru: 'Ты пока не выбрал обои. Скажи, что сомневаешься.', uk: 'Ти поки не вибрав шпалери. Скажи, що вагаєшся.' }, accepted: ['I am hesitating.', "I'm hesitating."] },
    { id: 'l09c6-11', type: 'dialogue', grammarPoint: 'l09c6_plural', partnerLine: 'Leaves whirl in the wind.', situation: { ru: 'Скажи, что листья кружатся прямо сейчас.', uk: 'Скажи, що листя кружляє просто зараз.' }, accepted: ['The leaves are whirling.'] },
    { id: 'l09c6-12', type: 'dialogue', grammarPoint: 'l09c6_please', partnerLine: 'The archway is narrow.', situation: { ru: 'Попроси не загораживать арку.', uk: 'Попроси не загороджувати арку.' }, accepted: ["Please don't block the archway."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c6-13', type: 'fix', grammarPoint: 'l09c6_i_am', wrong: 'I am glance at the clock.', accepted: ['I am glancing at the clock.', "I'm glancing at the clock."] },
    { id: 'l09c6-14', type: 'fix', grammarPoint: 'l09c6_plural', wrong: 'My hands is trembling.', accepted: ['My hands are trembling.'] },
    { id: 'l09c6-15', type: 'fix', grammarPoint: 'l09c6_please', wrong: "Please don't shouts.", accepted: ["Please don't shout."] },
    { id: 'l09c6-16', type: 'fix', grammarPoint: 'l09c6_plural', wrong: 'We wandering through the town.', accepted: ['We are wandering through the town.', "We're wandering through the town."] },
  ],
};
