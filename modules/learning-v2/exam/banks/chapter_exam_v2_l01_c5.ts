// chapter_exam_v2_l01_c5.ts — банк экзамена v2: урок 1, глава 5 (эпизоды 33–40).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 5 вводит короткие формы I'm / you're / he's / she's /
// it's / we're / they're (33–40) — эталон (первый в accepted) короткой формой, как в эпизодах; полная засчитывается. В «исправь
// ошибку» — лишний глагол после короткой формы (I'm am) или чужой глагол: все слова знакомые. Вопросов в уроке 1 нет.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L01_C5: ChapterExamV2Bank = {
  lessonOrdinal: 1,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l01c5_im_youre', label: { ru: 'коротко: I\'m, you\'re', uk: 'коротко: I\'m, you\'re' }, episodeOrdinals: [33, 34, 39] },
    { id: 'l01c5_hes_shes_its', label: { ru: 'коротко: he\'s, she\'s, it\'s', uk: 'коротко: he\'s, she\'s, it\'s' }, episodeOrdinals: [33, 35, 37] },
    { id: 'l01c5_were_theyre', label: { ru: 'коротко: we\'re, they\'re', uk: 'коротко: we\'re, they\'re' }, episodeOrdinals: [34, 35, 40] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l01c5-01', type: 'situation', grammarPoint: 'l01c5_im_youre', situation: { ru: 'Ночью в старом доме что-то скрипнуло. Признайся другу, что тебе страшно.', uk: 'Уночі в старому будинку щось рипнуло. Зізнайся другові, що тобі страшно.' }, accepted: ["I'm afraid.", 'I am afraid.', "I'm terrified.", 'I am terrified.'] },
    { id: 'l01c5-02', type: 'situation', grammarPoint: 'l01c5_hes_shes_its', situation: { ru: 'Коллега кашляет и чихает на весь офис. Предупреди всех, что он заразный.', uk: 'Колега кашляє й чхає на весь офіс. Попередь усіх, що він заразний.' }, accepted: ["He's contagious.", 'He is contagious.'] },
    { id: 'l01c5-03', type: 'situation', grammarPoint: 'l01c5_were_theyre', situation: { ru: 'Вы с братом весь день в дороге без еды. Напиши маме, что вы умираете с голоду.', uk: 'Ви з братом увесь день у дорозі без їжі. Напиши мамі, що ви помираєте з голоду.' }, accepted: ["We're starving.", 'We are starving.'] },
    { id: 'l01c5-04', type: 'situation', grammarPoint: 'l01c5_hes_shes_its', situation: { ru: 'Ты впервые зашёл в съёмную квартиру: мягкий свет, плед на диване. Скажи, что тут уютно.', uk: 'Ти вперше зайшов у винайняту квартиру: м’яке світло, плед на дивані. Скажи, що тут затишно.' }, accepted: ["It's cozy.", 'It is cozy.'] },
    { id: 'l01c5-05', type: 'situation', grammarPoint: 'l01c5_im_youre', situation: { ru: 'На видеозвонке коллега говорит, а его не слышно. Скажи ему, что у него выключен звук.', uk: 'На відеодзвінку колега говорить, а його не чути. Скажи йому, що в нього вимкнений звук.' }, accepted: ["You're muted.", 'You are muted.'] },
    { id: 'l01c5-06', type: 'situation', grammarPoint: 'l01c5_were_theyre', situation: { ru: 'Двое комиков весь вечер смешат зал до слёз. Скажи другу, что они уморительные.', uk: 'Двоє коміків увесь вечір смішать залу до сліз. Скажи другові, що вони кумедні до сліз.' }, accepted: ["They're hilarious.", 'They are hilarious.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c5-07', type: 'dialogue', grammarPoint: 'l01c5_hes_shes_its', partnerLine: 'She is okay.', situation: { ru: 'Возрази: подруга побелела — она бледная.', uk: 'Заперечи: подруга зблідла — вона бліда.' }, accepted: ["She's pale.", 'She is pale.', "No, she's pale.", 'No, she is pale.'] },
    { id: 'l01c5-08', type: 'dialogue', grammarPoint: 'l01c5_im_youre', partnerLine: 'You are okay.', situation: { ru: 'Возрази: у тебя кружится голова.', uk: 'Заперечи: у тебе паморочиться голова.' }, accepted: ["I'm dizzy.", 'I am dizzy.', "No, I'm dizzy.", 'No, I am dizzy.'] },
    { id: 'l01c5-09', type: 'dialogue', grammarPoint: 'l01c5_were_theyre', partnerLine: 'They are ahead.', situation: { ru: 'Возрази: по очкам впереди вы с командой.', uk: 'Заперечи: за очками попереду ви з командою.' }, accepted: ["We're ahead.", 'We are ahead.', "No, we're ahead.", 'No, we are ahead.'] },
    { id: 'l01c5-10', type: 'dialogue', grammarPoint: 'l01c5_hes_shes_its', partnerLine: 'It is sunny.', situation: { ru: 'Да, солнце, но на улице минус двадцать. Добавь, что там мороз.', uk: 'Так, сонце, але надворі мінус двадцять. Додай, що там мороз.' }, accepted: ["It's freezing.", 'It is freezing.'] },
    { id: 'l01c5-11', type: 'dialogue', grammarPoint: 'l01c5_were_theyre', partnerLine: 'They are relaxed.', situation: { ru: 'Возрази: у детей завтра экзамен — они волнуются.', uk: 'Заперечи: у дітей завтра іспит — вони хвилюються.' }, accepted: ["They're worried.", 'They are worried.', "No, they're worried.", 'No, they are worried.'] },
    { id: 'l01c5-12', type: 'dialogue', grammarPoint: 'l01c5_im_youre', partnerLine: 'I am shy.', situation: { ru: 'Друг боится выйти на сцену. Подбодри его: скажи, что он смелый.', uk: 'Друг боїться вийти на сцену. Підбадьор його: скажи, що він сміливий.' }, accepted: ["You're brave.", 'You are brave.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c5-13', type: 'fix', grammarPoint: 'l01c5_im_youre', wrong: "I'm am lonely.", accepted: ["I'm lonely.", 'I am lonely.'] },
    { id: 'l01c5-14', type: 'fix', grammarPoint: 'l01c5_hes_shes_its', wrong: "She's is homesick.", accepted: ["She's homesick.", 'She is homesick.'] },
    { id: 'l01c5-15', type: 'fix', grammarPoint: 'l01c5_were_theyre', wrong: "They're are ill.", accepted: ["They're ill.", 'They are ill.'] },
    { id: 'l01c5-16', type: 'fix', grammarPoint: 'l01c5_hes_shes_its', wrong: 'It are messy.', accepted: ["It's messy.", 'It is messy.'] },
  ],
};
