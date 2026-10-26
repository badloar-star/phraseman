// chapter_exam_v2_l08_c1.ts — банк экзамена v2: урок 8, глава 1 (эпизоды 1–8). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: правила фабрики — только слова и формы эпизодов 1–8 (can + действие без to и без s; can't ещё впереди),
// ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L08_C1: ChapterExamV2Bank = {
  lessonOrdinal: 8,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l08c1_i_can', label: { ru: 'я умею — I can', uk: 'я вмію — I can' }, episodeOrdinals: [1, 2, 6] },
    { id: 'l08c1_she_can', label: { ru: 'он / она умеет — he / she can', uk: 'він / вона вміє — he / she can' }, episodeOrdinals: [1, 4, 5] },
    { id: 'l08c1_two', label: { ru: 'два умения — can … and …', uk: 'два вміння — can … and …' }, episodeOrdinals: [1, 2, 5] },
    { id: 'l08c1_ask', label: { ru: 'спросить — Can you…? / Whose…?', uk: 'запитати — Can you…? / Whose…?' }, episodeOrdinals: [1, 3, 4] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l08c1-01', type: 'situation', grammarPoint: 'l08c1_i_can', situation: { ru: 'У соседки на пальто оторвалась пуговица. Скажи, что ты умеешь шить.', uk: 'У сусідки на пальті відірвався ґудзик. Скажи, що ти вмієш шити.' }, accepted: ['I can sew.'] },
    { id: 'l08c1-02', type: 'situation', grammarPoint: 'l08c1_i_can', situation: { ru: 'Другу пришло письмо на английском, он ничего не понимает. Скажи, что ты умеешь переводить.', uk: 'Другові прийшов лист англійською, він нічого не розуміє. Скажи, що ти вмієш перекладати.' }, accepted: ['I can translate.', 'I can translate it.'] },
    { id: 'l08c1-03', type: 'situation', grammarPoint: 'l08c1_she_can', situation: { ru: 'Подруга идёт с вами на скалодром. Скажи про неё, что она умеет лазать.', uk: 'Подруга йде з вами на скеледром. Скажи про неї, що вона вміє лазити.' }, accepted: ['She can climb.'] },
    { id: 'l08c1-04', type: 'situation', grammarPoint: 'l08c1_she_can', situation: { ru: 'На свадьбе брат пойдёт танцевать первым. Скажи, что он умеет танцевать.', uk: 'На весіллі брат піде танцювати першим. Скажи, що він уміє танцювати.' }, accepted: ['He can dance.'] },
    { id: 'l08c1-05', type: 'situation', grammarPoint: 'l08c1_two', situation: { ru: 'Подруга и шьёт, и танцует. Расскажи коллеге оба её умения одной фразой.', uk: 'Подруга і шиє, і танцює. Розкажи колезі обидва її вміння однією фразою.' }, accepted: ['She can sew and dance.', 'She can dance and sew.'] },
    { id: 'l08c1-06', type: 'situation', grammarPoint: 'l08c1_ask', situation: { ru: 'Турист на остановке растерян. Спроси его, говорит ли он по-английски.', uk: 'Турист на зупинці розгублений. Запитай його, чи говорить він англійською.' }, accepted: ['Can you speak English?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c1-07', type: 'dialogue', grammarPoint: 'l08c1_she_can', partnerLine: 'I can paddle.', situation: { ru: 'Друг ищет напарника для каяка. Скажи, что твоя сестра умеет грести.', uk: 'Друг шукає напарника для каяка. Скажи, що твоя сестра вміє веслувати.' }, accepted: ['She can paddle.'] },
    { id: 'l08c1-08', type: 'dialogue', grammarPoint: 'l08c1_ask', partnerLine: 'Whose rucksack is this?', situation: { ru: 'Рюкзак твой. Скажи, что это твой рюкзак.', uk: 'Рюкзак твій. Скажи, що це твій рюкзак.' }, accepted: ['This is my rucksack.'] },
    { id: 'l08c1-09', type: 'dialogue', grammarPoint: 'l08c1_two', partnerLine: 'She can juggle.', situation: { ru: 'Скажи, что она умеет жонглировать и держать равновесие, — одной фразой.', uk: 'Скажи, що вона вміє жонглювати й тримати рівновагу, — однією фразою.' }, accepted: ['She can juggle and balance.', 'She can balance and juggle.'] },
    { id: 'l08c1-10', type: 'dialogue', grammarPoint: 'l08c1_she_can', partnerLine: 'I can knit.', situation: { ru: 'Вы выбираете мастер-класс. Скажи, что Том умеет вышивать.', uk: 'Ви обираєте майстер-клас. Скажи, що Том уміє вишивати.' }, accepted: ['Tom can embroider.', 'He can embroider.'] },
    { id: 'l08c1-11', type: 'dialogue', grammarPoint: 'l08c1_ask', partnerLine: 'Can you hike?', situation: { ru: 'Ты умеешь ходить в походы. Ответь коротко «да».', uk: 'Ти вмієш ходити в походи. Відповідай коротко «так».' }, accepted: ['Yes, I can.', 'I can hike.'] },
    { id: 'l08c1-12', type: 'dialogue', grammarPoint: 'l08c1_two', partnerLine: 'He can speak English.', situation: { ru: 'Скажи, что он говорит по-английски и ещё умеет редактировать фото, — одной фразой.', uk: 'Скажи, що він говорить англійською і ще вміє редагувати фото, — однією фразою.' }, accepted: ['He can speak English and edit photos.', 'He can edit photos and speak English.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c1-13', type: 'fix', grammarPoint: 'l08c1_i_can', wrong: 'I can to sew.', accepted: ['I can sew.'] },
    { id: 'l08c1-14', type: 'fix', grammarPoint: 'l08c1_she_can', wrong: 'She can dances.', accepted: ['She can dance.'] },
    { id: 'l08c1-15', type: 'fix', grammarPoint: 'l08c1_ask', wrong: 'Can you hikes?', accepted: ['Can you hike?'] },
    { id: 'l08c1-16', type: 'fix', grammarPoint: 'l08c1_two', wrong: 'She can sew and dances.', accepted: ['She can sew and dance.'] },
  ],
};
