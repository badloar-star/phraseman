// chapter_exam_v2_l01_c7.ts — банк экзамена v2: урок 1, глава 7 (эпизоды 49–56, последняя глава урока).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 7 — короткие формы при оценке вещей и цены (it's /
// they're, 49–54) и о родных (he's / she's / we're, 55–56). Эталон — короткой формой, полная засчитывается. Вопросов в уроке 1 нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L01_C7: ChapterExamV2Bank = {
  lessonOrdinal: 1,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l01c7_its', label: { ru: 'о вещи: it\'s', uk: 'про річ: it\'s' }, episodeOrdinals: [49, 50, 52] },
    { id: 'l01c7_theyre', label: { ru: 'о вещах: they\'re', uk: 'про речі: they\'re' }, episodeOrdinals: [51, 53, 54] },
    { id: 'l01c7_people', label: { ru: 'о людях: he\'s, she\'s, we\'re', uk: 'про людей: he\'s, she\'s, we\'re' }, episodeOrdinals: [55, 56, 50] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l01c7-01', type: 'situation', grammarPoint: 'l01c7_its', situation: { ru: 'Лампа на блошином рынке стоит копейки. Шепни жене, что она дешёвая.', uk: 'Лампа на блошиному ринку коштує копійки. Шепни дружині, що вона дешева.' }, accepted: ["It's cheap.", 'It is cheap.'] },
    { id: 'l01c7-02', type: 'situation', grammarPoint: 'l01c7_theyre', situation: { ru: 'Ты достал на пикнике персики — мягкие и сладкие. Скажи, что они спелые.', uk: 'Ти дістав на пікніку персики — м’які й солодкі. Скажи, що вони стиглі.' }, accepted: ["They're ripe.", 'They are ripe.'] },
    { id: 'l01c7-03', type: 'situation', grammarPoint: 'l01c7_people', situation: { ru: 'Сестра сама платит за квартиру и всё решает сама. Скажи, что она самостоятельная.', uk: 'Сестра сама платить за квартиру й усе вирішує сама. Скажи, що вона самостійна.' }, accepted: ["She's independent.", 'She is independent.'] },
    { id: 'l01c7-04', type: 'situation', grammarPoint: 'l01c7_its', situation: { ru: 'Подруга примеряет куртку, в которой не страшен ливень. Скажи, что она непромокаемая.', uk: 'Подруга приміряє куртку, у якій не страшна злива. Скажи, що вона непромокальна.' }, accepted: ["It's waterproof.", 'It is waterproof.'] },
    { id: 'l01c7-05', type: 'situation', grammarPoint: 'l01c7_theyre', situation: { ru: 'Чемоданы забиты так, что едва закрываются. Скажи, что они набиты до отказа.', uk: 'Валізи напхані так, що ледь зачиняються. Скажи, що вони набиті вщерть.' }, accepted: ["They're stuffed.", 'They are stuffed.'] },
    { id: 'l01c7-06', type: 'situation', grammarPoint: 'l01c7_people', situation: { ru: 'Дедушка опять оставил дома ключи и очки. Скажи, что он забывчивый.', uk: 'Дідусь знову залишив удома ключі й окуляри. Скажи, що він забудькуватий.' }, accepted: ["He's forgetful.", 'He is forgetful.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c7-07', type: 'dialogue', grammarPoint: 'l01c7_its', partnerLine: 'It is cheap.', situation: { ru: 'Возрази: это кольцо стоит как машина — оно дорогое.', uk: 'Заперечи: ця каблучка коштує як машина — вона дорога.' }, accepted: ["It's expensive.", 'It is expensive.', "No, it's expensive.", 'No, it is expensive.'] },
    { id: 'l01c7-08', type: 'dialogue', grammarPoint: 'l01c7_theyre', partnerLine: 'They are new.', situation: { ru: 'Возрази: краски на этих снимках давно поблёкли — они выцвели.', uk: 'Заперечи: фарби на цих знімках давно зблякли — вони вицвіли.' }, accepted: ["They're faded.", 'They are faded.', "No, they're faded.", 'No, they are faded.'] },
    { id: 'l01c7-09', type: 'dialogue', grammarPoint: 'l01c7_people', partnerLine: 'He is dependent.', situation: { ru: 'Возрази: сын давно живёт сам — он самостоятельный.', uk: 'Заперечи: син давно живе сам — він самостійний.' }, accepted: ["He's independent.", 'He is independent.', "No, he's independent.", 'No, he is independent.'] },
    { id: 'l01c7-10', type: 'dialogue', grammarPoint: 'l01c7_its', partnerLine: 'It is heavy.', situation: { ru: 'Возрази: рюкзак почти ничего не весит — он лёгкий.', uk: 'Заперечи: рюкзак майже нічого не важить — він легкий.' }, accepted: ["It's light.", 'It is light.', "No, it's light.", 'No, it is light.'] },
    { id: 'l01c7-11', type: 'dialogue', grammarPoint: 'l01c7_theyre', partnerLine: 'They are loose.', situation: { ru: 'Возрази: новые туфли жмут.', uk: 'Заперечи: нові туфлі тиснуть.' }, accepted: ["They're tight.", 'They are tight.', "No, they're tight.", 'No, they are tight.'] },
    { id: 'l01c7-12', type: 'dialogue', grammarPoint: 'l01c7_people', partnerLine: 'We are late.', situation: { ru: 'Возрази: поезд только через час — вы с ним пришли рано.', uk: 'Заперечи: потяг лише за годину — ви з ним прийшли рано.' }, accepted: ["We're early.", 'We are early.', "No, we're early.", 'No, we are early.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c7-13', type: 'fix', grammarPoint: 'l01c7_its', wrong: 'It are locked.', accepted: ["It's locked.", 'It is locked.'] },
    { id: 'l01c7-14', type: 'fix', grammarPoint: 'l01c7_theyre', wrong: 'They is expired.', accepted: ["They're expired.", 'They are expired.'] },
    { id: 'l01c7-15', type: 'fix', grammarPoint: 'l01c7_people', wrong: "She's are responsible.", accepted: ["She's responsible.", 'She is responsible.'] },
    { id: 'l01c7-16', type: 'fix', grammarPoint: 'l01c7_its', wrong: "It's is cracked.", accepted: ["It's cracked.", 'It is cracked.'] },
  ],
};
