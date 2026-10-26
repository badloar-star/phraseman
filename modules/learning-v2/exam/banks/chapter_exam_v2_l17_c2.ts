// chapter_exam_v2_l17_c2.ts — банк экзамена v2: урок 17, глава 2 (эпизоды 9–16). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 2 — «many» с числимыми во множественном числе и «much» с веществами и понятиями в отрицании («We don't have many … / much …»), плюс «a / an» и «two …s» из главы 1. Только слова и формы эпизодов 1–16 урока 17; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L17_C2: ChapterExamV2Bank = {
  lessonOrdinal: 17,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l17c2_many', label: { ru: "не так много: We don't have many … (с числом)", uk: "не так багато: We don't have many … (з числом)" }, episodeOrdinals: [9, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'l17c2_much', label: { ru: "не так много: We don't have much … (без числа)", uk: "не так багато: We don't have much … (без числа)" }, episodeOrdinals: [9, 10, 11, 12, 13, 14, 15, 16] },
    { id: 'l17c2_basics', label: { ru: 'один и два: This is a / an …, There are two …s', uk: 'один і два: This is a / an …, There are two …s' }, episodeOrdinals: [1, 2, 3, 4, 5, 6, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l17c2-01', type: 'situation', grammarPoint: 'l17c2_many', situation: { ru: 'Бразильских орехов у вас не так много. Скажи об этом.', uk: 'Бразильських горіхів у вас не так багато. Скажи про це.' }, accepted: ["We don't have many Brazil nuts."] },
    { id: 'l17c2-02', type: 'situation', grammarPoint: 'l17c2_many', situation: { ru: 'Писателей ты знаешь не так много. Скажи об этом.', uk: 'Письменників ти знаєш не так багато. Скажи про це.' }, accepted: ["We don't know many novelists."] },
    { id: 'l17c2-03', type: 'situation', grammarPoint: 'l17c2_much', situation: { ru: 'Манной крупы у вас не так много. Скажи об этом.', uk: 'Манної крупи у вас не так багато. Скажи про це.' }, accepted: ["We don't have much semolina."] },
    { id: 'l17c2-04', type: 'situation', grammarPoint: 'l17c2_much', situation: { ru: 'Здесь загрязнения не так много. Скажи об этом.', uk: 'Тут забруднення не так багато. Скажи про це.' }, accepted: ["There isn't much pollution here."] },
    { id: 'l17c2-05', type: 'situation', grammarPoint: 'l17c2_basics', situation: { ru: 'Ты показываешь на новичка в учебной группе. Скажи, что это стажёр.', uk: 'Ти показуєш на новачка в навчальній групі. Скажи, що це стажист.' }, accepted: ['This is a trainee.'] },
    { id: 'l17c2-06', type: 'situation', grammarPoint: 'l17c2_basics', situation: { ru: 'На столе лежат два листа с заданиями. Скажи об этом.', uk: 'На столі лежать два аркуші із завданнями. Скажи про це.' }, accepted: ['There are two worksheets on the table.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l17c2-07', type: 'dialogue', grammarPoint: 'l17c2_many', partnerLine: "We don't have many certificates.", situation: { ru: 'Друг говорит, что сертификатов у вас не так много. Скажи, что спонсоров у вас тоже не так много.', uk: 'Друг каже, що сертифікатів у вас не так багато. Скажи, що спонсорів у вас теж не так багато.' }, accepted: ["We don't have many sponsors."] },
    { id: 'l17c2-08', type: 'dialogue', grammarPoint: 'l17c2_many', partnerLine: "We don't see many motorists here.", situation: { ru: 'Друг говорит, что водителей здесь видно не так много. Скажи, что домовладелиц ты знаешь не так много.', uk: 'Друг каже, що водіїв тут видно не так багато. Скажи, що домовласниць ти знаєш не так багато.' }, accepted: ["We don't know many landladies."] },
    { id: 'l17c2-09', type: 'dialogue', grammarPoint: 'l17c2_much', partnerLine: "We don't have much funding.", situation: { ru: 'Друг говорит, что денег на проект не так много. Скажи, что учёба вам нужна не так сильно.', uk: 'Друг каже, що грошей на проєкт не так багато. Скажи, що навчання вам потрібне не так сильно.' }, accepted: ["We don't need much tuition."] },
    { id: 'l17c2-10', type: 'dialogue', grammarPoint: 'l17c2_much', partnerLine: "The house doesn't need much maintenance.", situation: { ru: 'Друг говорит, что дому не нужен большой ремонт. Скажи, что стажёрам нужно не так много наставлений.', uk: 'Друг каже, що будинку не потрібен великий ремонт. Скажи, що стажистам потрібно не так багато настанов.' }, accepted: ["They don't need much guidance."] },
    { id: 'l17c2-11', type: 'dialogue', grammarPoint: 'l17c2_basics', partnerLine: 'This is a worksheet.', situation: { ru: 'Друг показывает на лист с заданием. Скажи, что на столе лежат две оценки.', uk: 'Друг показує на аркуш із завданням. Скажи, що на столі лежать дві оцінки.' }, accepted: ['There are two estimates on the table.'] },
    { id: 'l17c2-12', type: 'dialogue', grammarPoint: 'l17c2_basics', partnerLine: 'There are two estimates on the table.', situation: { ru: 'Друг говорит, что на столе две оценки. Скажи, что это задание.', uk: 'Друг каже, що на столі дві оцінки. Скажи, що це завдання.' }, accepted: ['This is an assignment.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l17c2-13', type: 'fix', grammarPoint: 'l17c2_many', wrong: "We don't have much Brazil nuts.", accepted: ["We don't have many Brazil nuts."] },
    { id: 'l17c2-14', type: 'fix', grammarPoint: 'l17c2_much', wrong: "We don't have many semolina.", accepted: ["We don't have much semolina."] },
    { id: 'l17c2-15', type: 'fix', grammarPoint: 'l17c2_much', wrong: "They don't need many guidance.", accepted: ["They don't need much guidance."] },
    { id: 'l17c2-16', type: 'fix', grammarPoint: 'l17c2_basics', wrong: 'This is a assignment.', accepted: ['This is an assignment.'] },
  ],
};
