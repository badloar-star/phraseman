// chapter_exam_v2_l09_c2.ts — банк экзамена v2: урок 9, глава 2 (эпизоды 9–16). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–16 — am / is / are not + -ing, что делает человек сейчас, просьбы Please … и Please don't touch; вопросы Is / Are … -ing? в эпизодах ещё впереди.
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L09_C2: ChapterExamV2Bank = {
  lessonOrdinal: 9,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l09c2_not', label: { ru: 'сейчас не — am / is / are not + -ing', uk: 'зараз не — am / is / are not + -ing' }, episodeOrdinals: [9, 10, 12] },
    { id: 'l09c2_now', label: { ru: 'что делает сейчас — is + -ing', uk: 'що робить зараз — is + -ing' }, episodeOrdinals: [10, 11, 13] },
    { id: 'l09c2_please', label: { ru: "просьба — Please …, Please don't touch", uk: "прохання — Please …, Please don't touch" }, episodeOrdinals: [11, 12, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l09c2-01', type: 'situation', grammarPoint: 'l09c2_not', situation: { ru: 'Друзья решили, что ты просто угадываешь ответы. Скажи, что ты не угадываешь.', uk: 'Друзі вирішили, що ти просто вгадуєш відповіді. Скажи, що ти не вгадуєш.' }, accepted: ['I am not guessing.', "I'm not guessing."] },
    { id: 'l09c2-02', type: 'situation', grammarPoint: 'l09c2_now', situation: { ru: 'Сестра поёт малышу колыбельную. Скажи, что она поёт колыбельную.', uk: 'Сестра співає малюкові колискову. Скажи, що вона співає колискову.' }, accepted: ['She is singing a lullaby.', 'She is singing the lullaby.'] },
    { id: 'l09c2-03', type: 'situation', grammarPoint: 'l09c2_please', situation: { ru: 'Фотограф протёр объектив, а ребёнок тянется к нему. Вежливо попроси не трогать объектив.', uk: 'Фотограф протер об’єктив, а дитина тягнеться до нього. Ввічливо попроси не чіпати об’єктив.' }, accepted: ["Please don't touch the lens."] },
    { id: 'l09c2-04', type: 'situation', grammarPoint: 'l09c2_not', situation: { ru: 'Сосед по хостелу наконец затих. Скажи, что он не храпит.', uk: 'Сусід по хостелу нарешті затих. Скажи, що він не хропе.' }, accepted: ['He is not snoring.', "He isn't snoring.", "He's not snoring."] },
    { id: 'l09c2-05', type: 'situation', grammarPoint: 'l09c2_now', situation: { ru: 'Художница дорисовывает бумажной кукле лицо. Скажи, что она рисует бровь.', uk: 'Художниця домальовує паперовій ляльці обличчя. Скажи, що вона малює брову.' }, accepted: ['She is drawing an eyebrow.', 'She is drawing the eyebrow.'] },
    { id: 'l09c2-06', type: 'situation', grammarPoint: 'l09c2_please', situation: { ru: 'Ты снимаешь короткое видео для портрета. Попроси человека моргнуть.', uk: 'Ти знімаєш коротке відео для портрета. Попроси людину кліпнути.' }, accepted: ['Please blink.', 'Blink, please.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c2-07', type: 'dialogue', grammarPoint: 'l09c2_not', partnerLine: 'They are sleeping.', situation: { ru: 'Дети в общей спальне только притворяются. Скажи, что они не спят.', uk: 'Діти в спільній спальні лише вдають. Скажи, що вони не сплять.' }, accepted: ['They are not sleeping.', "They aren't sleeping.", "They're not sleeping."] },
    { id: 'l09c2-08', type: 'dialogue', grammarPoint: 'l09c2_now', partnerLine: 'The flash is not working.', situation: { ru: 'Скажи, что фотограф сейчас чистит объектив.', uk: 'Скажи, що фотограф зараз чистить об’єктив.' }, accepted: ['The photographer is cleaning the lens.'] },
    { id: 'l09c2-09', type: 'dialogue', grammarPoint: 'l09c2_please', partnerLine: 'He is not frowning.', situation: { ru: 'Для снимка нужно серьёзное лицо. Попроси его нахмуриться.', uk: 'Для знімка потрібне серйозне обличчя. Попроси його насупитися.' }, accepted: ['Please frown.', 'Frown, please.'] },
    { id: 'l09c2-10', type: 'dialogue', grammarPoint: 'l09c2_not', partnerLine: 'This is a castle.', situation: { ru: 'Замок за окном настоящий. Скажи, что ты не спишь и не мечтаешь.', uk: 'Замок за вікном справжній. Скажи, що ти не спиш і не мрієш.' }, accepted: ['I am not dreaming.', "I'm not dreaming."] },
    { id: 'l09c2-11', type: 'dialogue', grammarPoint: 'l09c2_now', partnerLine: 'I am yawning.', situation: { ru: 'Посмотри на собаку. Скажи, что она несёт тапочек.', uk: 'Подивися на собаку. Скажи, що вона несе капець.' }, accepted: ['The dog is carrying a slipper.', 'The dog is carrying the slipper.'] },
    { id: 'l09c2-12', type: 'dialogue', grammarPoint: 'l09c2_not', partnerLine: 'The shutter is working.', situation: { ru: 'Скажи, что зато вспышка не работает.', uk: 'Скажи, що натомість спалах не працює.' }, accepted: ['The flash is not working.', "The flash isn't working."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c2-13', type: 'fix', grammarPoint: 'l09c2_not', wrong: 'He not is snoring.', accepted: ['He is not snoring.', "He isn't snoring."] },
    { id: 'l09c2-14', type: 'fix', grammarPoint: 'l09c2_now', wrong: 'She drawing an eyebrow.', accepted: ['She is drawing an eyebrow.'] },
    { id: 'l09c2-15', type: 'fix', grammarPoint: 'l09c2_please', wrong: 'Please not touch the lens.', accepted: ["Please don't touch the lens."] },
    { id: 'l09c2-16', type: 'fix', grammarPoint: 'l09c2_not', wrong: 'They are not sleep.', accepted: ['They are not sleeping.', "They aren't sleeping."] },
  ],
};
