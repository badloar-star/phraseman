// chapter_exam_v2_l01_c6.ts — банк экзамена v2: урок 1, глава 6 (эпизоды 41–48).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 6 — короткие формы о людях (he's / she's / you're,
// 41–43) и о вещах (it's / they're, 45–48). Эталон — короткой формой, как в эпизодах; полная засчитывается. Вопросов в уроке 1 нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L01_C6: ChapterExamV2Bank = {
  lessonOrdinal: 1,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l01c6_people', label: { ru: 'о людях: he\'s, she\'s, you\'re', uk: 'про людей: he\'s, she\'s, you\'re' }, episodeOrdinals: [41, 42, 43] },
    { id: 'l01c6_its', label: { ru: 'о вещи: it\'s', uk: 'про річ: it\'s' }, episodeOrdinals: [45, 46, 47] },
    { id: 'l01c6_theyre', label: { ru: 'о вещах: they\'re', uk: 'про речі: they\'re' }, episodeOrdinals: [46, 47, 48] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l01c6-01', type: 'situation', grammarPoint: 'l01c6_people', situation: { ru: 'Сосед за пять минут рассказал тебе всю свою жизнь. Скажи другу, что он болтливый.', uk: 'Сусід за п’ять хвилин розповів тобі все своє життя. Скажи другові, що він балакучий.' }, accepted: ["He's chatty.", 'He is chatty.'] },
    { id: 'l01c6-02', type: 'situation', grammarPoint: 'l01c6_its', situation: { ru: 'Сын идёт по тонкому льду на реке. Крикни ему, что там опасно.', uk: 'Син іде тонкою кригою на річці. Гукни йому, що там небезпечно.' }, accepted: ["It's dangerous.", 'It is dangerous.'] },
    { id: 'l01c6-03', type: 'situation', grammarPoint: 'l01c6_theyre', situation: { ru: 'Ты достал из ящика старые наушники: провода сплелись в клубок. Скажи, что они запутались.', uk: 'Ти дістав із шухляди старі навушники: дроти сплелися в клубок. Скажи, що вони заплуталися.' }, accepted: ["They're tangled.", 'They are tangled.'] },
    { id: 'l01c6-04', type: 'situation', grammarPoint: 'l01c6_people', situation: { ru: 'Хозяйка дома встретила вас пирогом и улыбкой. Скажи мужу, что она гостеприимная.', uk: 'Господиня будинку зустріла вас пирогом і усмішкою. Скажи чоловікові, що вона гостинна.' }, accepted: ["She's welcoming.", 'She is welcoming.'] },
    { id: 'l01c6-05', type: 'situation', grammarPoint: 'l01c6_its', situation: { ru: 'Вы несёте к машине старый шкаф — ни разу не скрипнул. Скажи, что он крепкий.', uk: 'Ви несете до машини стару шафу — жодного разу не рипнула. Скажи, що вона міцна.' }, accepted: ["It's sturdy.", 'It is sturdy.'] },
    { id: 'l01c6-06', type: 'situation', grammarPoint: 'l01c6_theyre', situation: { ru: 'Бабушка связала тебе варежки сама. Похвастайся другу, что они ручной работы.', uk: 'Бабуся сама зв’язала тобі рукавиці. Похвалися другові, що вони ручної роботи.' }, accepted: ["They're handmade.", 'They are handmade.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c6-07', type: 'dialogue', grammarPoint: 'l01c6_people', partnerLine: 'He is calm.', situation: { ru: 'Возрази: брат кричит и хлопает дверью — он в ярости.', uk: 'Заперечи: брат кричить і грюкає дверима — він у люті.' }, accepted: ["He's furious.", 'He is furious.', "No, he's furious.", 'No, he is furious.'] },
    { id: 'l01c6-08', type: 'dialogue', grammarPoint: 'l01c6_its', partnerLine: 'It is useful.', situation: { ru: 'Возрази: эта зарядка не заряжает — она бесполезная.', uk: 'Заперечи: цей зарядний не заряджає — він марний.' }, accepted: ["It's useless.", 'It is useless.', "No, it's useless.", 'No, it is useless.'] },
    { id: 'l01c6-09', type: 'dialogue', grammarPoint: 'l01c6_theyre', partnerLine: 'They are safe.', situation: { ru: 'Возрази: ступеньки после дождя скользкие.', uk: 'Заперечи: сходинки після дощу слизькі.' }, accepted: ["They're slippery.", 'They are slippery.', "No, they're slippery.", 'No, they are slippery.'] },
    { id: 'l01c6-10', type: 'dialogue', grammarPoint: 'l01c6_people', partnerLine: 'I am clumsy.', situation: { ru: 'Друг уронил чашку и ругает себя. Успокой: он не неуклюжий, он просто устал.', uk: 'Друг упустив чашку й сварить себе. Заспокой: він не незграбний, він просто втомився.' }, accepted: ["You're tired.", 'You are tired.', "No, you're tired.", 'No, you are tired.'] },
    { id: 'l01c6-11', type: 'dialogue', grammarPoint: 'l01c6_its', partnerLine: 'It is new.', situation: { ru: 'Возрази: ведро всё в рыжих пятнах — оно ржавое.', uk: 'Заперечи: відро все в рудих плямах — воно іржаве.' }, accepted: ["It's rusty.", 'It is rusty.', "No, it's rusty.", 'No, it is rusty.'] },
    { id: 'l01c6-12', type: 'dialogue', grammarPoint: 'l01c6_theyre', partnerLine: 'They are shy.', situation: { ru: 'Возрази: новые соседи с первого дня всё про всех выспрашивают.', uk: 'Заперечи: нові сусіди з першого дня все про всіх випитують.' }, accepted: ["They're nosy.", 'They are nosy.', "No, they're nosy.", 'No, they are nosy.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c6-13', type: 'fix', grammarPoint: 'l01c6_people', wrong: "He's is upset.", accepted: ["He's upset.", 'He is upset.'] },
    { id: 'l01c6-14', type: 'fix', grammarPoint: 'l01c6_its', wrong: 'It are sharp.', accepted: ["It's sharp.", 'It is sharp.'] },
    { id: 'l01c6-15', type: 'fix', grammarPoint: 'l01c6_theyre', wrong: 'They is packed.', accepted: ["They're packed.", 'They are packed.'] },
    { id: 'l01c6-16', type: 'fix', grammarPoint: 'l01c6_theyre', wrong: "They're is loose.", accepted: ["They're loose.", 'They are loose.'] },
  ],
};
