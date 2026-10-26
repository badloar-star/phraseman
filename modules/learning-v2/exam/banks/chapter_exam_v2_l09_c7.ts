// chapter_exam_v2_l09_c7.ts — банк экзамена v2: урок 9, глава 7 (эпизоды 49–56). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–56 — он / она сейчас is + -ing, я сейчас I am + -ing, просьба Please don't …; вопросы Is / Are … -ing? — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L09_C7: ChapterExamV2Bank = {
  lessonOrdinal: 9,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l09c7_he_she', label: { ru: 'он / она сейчас — is + -ing', uk: 'він / вона зараз — is + -ing' }, episodeOrdinals: [49, 50, 52] },
    { id: 'l09c7_i_am', label: { ru: 'я сейчас — I am + -ing', uk: 'я зараз — I am + -ing' }, episodeOrdinals: [51, 55, 56] },
    { id: 'l09c7_please', label: { ru: "просьба — Please don't …", uk: "прохання — Please don't …" }, episodeOrdinals: [49, 51, 53] },
    { id: 'l09c7_ask', label: { ru: 'спросить, что происходит, — Is / Are … -ing?', uk: 'запитати, що відбувається, — Is / Are … -ing?' }, episodeOrdinals: [51, 53, 55] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l09c7-01', type: 'situation', grammarPoint: 'l09c7_he_she', situation: { ru: 'Мама тихо что-то говорит малышу. Скажи, что она шепчет малышу.', uk: 'Мама тихо щось каже малюкові. Скажи, що вона шепоче малюкові.' }, accepted: ['She is murmuring to the baby.', "She's murmuring to the baby."] },
    { id: 'l09c7-02', type: 'situation', grammarPoint: 'l09c7_i_am', situation: { ru: 'На совещании ты записываешь решения. Скажи, что ведёшь протокол.', uk: 'На нараді ти записуєш рішення. Скажи, що ведеш протокол.' }, accepted: ['I am taking minutes.', "I'm taking minutes."] },
    { id: 'l09c7-03', type: 'situation', grammarPoint: 'l09c7_please', situation: { ru: 'Малыш спит в колыбели. Попроси не переставлять колыбель.', uk: 'Малюк спить у колисці. Попроси не переставляти колиску.' }, accepted: ["Please don't move the cradle.", "Don't move the cradle, please."] },
    { id: 'l09c7-04', type: 'situation', grammarPoint: 'l09c7_ask', situation: { ru: 'Гид что-то показывает рукой. Спроси, показывает ли он на дверь.', uk: 'Гід щось показує рукою. Запитай, чи показує він на двері.' }, accepted: ['Is he gesturing towards the door?'] },
    { id: 'l09c7-05', type: 'situation', grammarPoint: 'l09c7_i_am', situation: { ru: 'Ты смотришь в телескоп на Луну. Скажи, что вглядываешься в телескоп.', uk: 'Ти дивишся в телескоп на Місяць. Скажи, що вдивляєшся в телескоп.' }, accepted: ['I am peering through the telescope.', "I'm peering through the telescope."] },
    { id: 'l09c7-06', type: 'situation', grammarPoint: 'l09c7_please', situation: { ru: 'Звук в зале уже настроен. Попроси не трогать усилитель.', uk: 'Звук у залі вже налаштований. Попроси не чіпати підсилювач.' }, accepted: ["Please don't touch the amplifier.", "Don't touch the amplifier, please."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c7-07', type: 'dialogue', grammarPoint: 'l09c7_he_she', partnerLine: 'This is a hologram.', situation: { ru: 'Скажи, что он пристально смотрит на голограмму.', uk: 'Скажи, що він пильно дивиться на голограму.' }, accepted: ['He is staring at the hologram.', "He's staring at the hologram."] },
    { id: 'l09c7-08', type: 'dialogue', grammarPoint: 'l09c7_i_am', partnerLine: 'The agenda is on the table.', situation: { ru: 'Скажи, что ты сейчас проверяешь повестку.', uk: 'Скажи, що ти зараз перевіряєш порядок денний.' }, accepted: ['I am checking the agenda.', "I'm checking the agenda."] },
    { id: 'l09c7-09', type: 'dialogue', grammarPoint: 'l09c7_please', partnerLine: 'She is gazing at the sunset.', situation: { ru: 'Попроси не загораживать вид.', uk: 'Попроси не загороджувати краєвид.' }, accepted: ["Please don't block the view.", "Don't block the view, please."] },
    { id: 'l09c7-10', type: 'dialogue', grammarPoint: 'l09c7_he_she', partnerLine: 'Is he muttering?', situation: { ru: 'Да, сосед что-то бормочет. Скажи это.', uk: 'Так, сусід щось бурмоче. Скажи це.' }, accepted: ['He is muttering.', "He's muttering."] },
    { id: 'l09c7-11', type: 'dialogue', grammarPoint: 'l09c7_ask', partnerLine: 'We are doing a headcount.', situation: { ru: 'Коллега всё время пишет в блокнот. Спроси, ведёт ли он протокол.', uk: 'Колега весь час пише в блокнот. Запитай, чи веде він протокол.' }, accepted: ['Are you taking minutes?'] },
    { id: 'l09c7-12', type: 'dialogue', grammarPoint: 'l09c7_please', partnerLine: 'The briefing is starting.', situation: { ru: 'Попроси не перебивать.', uk: 'Попроси не перебивати.' }, accepted: ["Please don't interrupt.", "Don't interrupt, please."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c7-13', type: 'fix', grammarPoint: 'l09c7_he_she', wrong: 'She gazing at the sunset.', accepted: ['She is gazing at the sunset.', "She's gazing at the sunset."] },
    { id: 'l09c7-14', type: 'fix', grammarPoint: 'l09c7_i_am', wrong: 'I am peer through the telescope.', accepted: ['I am peering through the telescope.', "I'm peering through the telescope."] },
    { id: 'l09c7-15', type: 'fix', grammarPoint: 'l09c7_please', wrong: "Please don't throws away the sandpaper.", accepted: ["Please don't throw away the sandpaper."] },
    { id: 'l09c7-16', type: 'fix', grammarPoint: 'l09c7_ask', wrong: 'Is she peer through the telescope?', accepted: ['Is she peering through the telescope?'] },
  ],
};
