// chapter_exam_v2_l23_c7.ts — банк экзамена v2: урок 23, глава 7 (эпизоды 49–56).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–56 урока 23, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 7 — здоровье (эпизоды 55, 56), события и люди (50, 52, 54), опыт (49, 51, 53).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L23_C7: ChapterExamV2Bank = {
  lessonOrdinal: 23,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l23c7_health', label: { ru: 'здоровье — I have had flu, I have recovered', uk: 'здоровʼя — I have had flu, I have recovered' }, episodeOrdinals: [55, 56] },
    { id: 'l23c7_news_people', label: { ru: 'события и люди — I have reported, I have met', uk: 'події й люди — I have reported, I have met' }, episodeOrdinals: [50, 52, 54] },
    { id: 'l23c7_experience', label: { ru: 'опыт — I have made, I have tried', uk: 'досвід — I have made, I have tried' }, episodeOrdinals: [49, 51, 53] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l23c7-01', type: 'situation', grammarPoint: 'l23c7_health', situation: { ru: 'Ты неделю пролежал с гриппом. Объясни коллегам, почему тебя не было.', uk: 'Ти тиждень пролежав із грипом. Поясни колегам, чому тебе не було.' }, accepted: ['I have had flu.'] },
    { id: 'l23c7-02', type: 'situation', grammarPoint: 'l23c7_health', situation: { ru: 'Сестра после аварии снова ходит. Расскажи друзьям, что она поправилась после травмы.', uk: 'Сестра після аварії знову ходить. Розкажи друзям, що вона одужала після травми.' }, accepted: ['She has recovered from an injury.', 'She has recovered from the injury.'] },
    { id: 'l23c7-03', type: 'situation', grammarPoint: 'l23c7_news_people', situation: { ru: 'В метро у тебя украли кошелёк. Скажи жене, что ты уже заявил о краже.', uk: 'У метро в тебе вкрали гаманець. Скажи дружині, що ти вже заявив про крадіжку.' }, accepted: ['I have reported a theft.', 'I have already reported the theft.', 'I have reported the theft.'] },
    { id: 'l23c7-04', type: 'situation', grammarPoint: 'l23c7_news_people', situation: { ru: 'Скоро сдавать налоги. Скажи мужу, что ты уже позвонил бухгалтеру.', uk: 'Скоро подавати податки. Скажи чоловікові, що ти вже зателефонував бухгалтерові.' }, accepted: ['I have called an accountant.', 'I have already called an accountant.', 'I have called the accountant.', 'I have already called the accountant.'] },
    { id: 'l23c7-05', type: 'situation', grammarPoint: 'l23c7_experience', situation: { ru: 'Друзья спорят, трудно ли дзюдо. Скажи, что ты его уже пробовал.', uk: 'Друзі сперечаються, чи важке дзюдо. Скажи, що ти його вже пробував.' }, accepted: ['I have tried judo.', 'I have already tried judo.'] },
    { id: 'l23c7-06', type: 'situation', grammarPoint: 'l23c7_experience', situation: { ru: 'Ты переехал за город и очень доволен. Скажи брату, что принял мудрое решение.', uk: 'Ти переїхав за місто і дуже задоволений. Скажи братові, що ухвалив мудре рішення.' }, accepted: ['I have made a wise decision.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c7-07', type: 'dialogue', grammarPoint: 'l23c7_health', partnerLine: 'You are tired.', situation: { ru: 'Коллега замечает, что ты бледный. Объясни, что подхватил вирус.', uk: 'Колега помічає, що ти блідий. Поясни, що підхопив вірус.' }, accepted: ['I have caught a virus.'] },
    { id: 'l23c7-08', type: 'dialogue', grammarPoint: 'l23c7_health', partnerLine: 'Describe the symptoms.', situation: { ru: 'Врач просит описать симптомы. Скажи, что ты их уже описал медсестре.', uk: 'Лікар просить описати симптоми. Скажи, що ти їх уже описав медсестрі.' }, accepted: ['I have already described the symptoms.', 'I have described the symptoms.'] },
    { id: 'l23c7-09', type: 'dialogue', grammarPoint: 'l23c7_news_people', partnerLine: 'The thief is outside.', situation: { ru: 'Полицейский говорит, что вор где-то рядом. Скажи, что ты его видел.', uk: 'Поліцейський каже, що злодій десь поруч. Скажи, що ти його бачив.' }, accepted: ['I have seen the thief.'] },
    { id: 'l23c7-10', type: 'dialogue', grammarPoint: 'l23c7_news_people', partnerLine: 'The mayor is here.', situation: { ru: 'На празднике города тебе показывают мэра. Скажи, что вы уже знакомы.', uk: 'На святі міста тобі показують мера. Скажи, що ви вже знайомі.' }, accepted: ['I have already met the mayor.', 'I have met the mayor.'] },
    { id: 'l23c7-11', type: 'dialogue', grammarPoint: 'l23c7_news_people', partnerLine: 'Vote in the election.', situation: { ru: 'Друг напоминает про выборы. Скажи, что ты уже проголосовал.', uk: 'Друг нагадує про вибори. Скажи, що ти вже проголосував.' }, accepted: ['I have already voted.', 'I have voted.', 'I have already voted in the election.', 'I have voted in the election.'] },
    { id: 'l23c7-12', type: 'dialogue', grammarPoint: 'l23c7_experience', partnerLine: 'The village is small.', situation: { ru: 'Друг сомневается, понравится ли тебе в деревне. Скажи, что ты уже бывал в маленькой деревне.', uk: 'Друг сумнівається, чи сподобається тобі в селі. Скажи, що ти вже бував у маленькому селі.' }, accepted: ['I have visited a small village.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c7-13', type: 'fix', grammarPoint: 'l23c7_health', wrong: 'She has have an operation.', accepted: ['She has had an operation.'] },
    { id: 'l23c7-14', type: 'fix', grammarPoint: 'l23c7_news_people', wrong: 'He has describe a suspect.', accepted: ['He has described a suspect.'] },
    { id: 'l23c7-15', type: 'fix', grammarPoint: 'l23c7_experience', wrong: 'We have watch gymnastics.', accepted: ['We have watched gymnastics.'] },
    { id: 'l23c7-16', type: 'fix', grammarPoint: 'l23c7_health', wrong: 'I have recover from an illness.', accepted: ['I have recovered from an illness.'] },
  ],
};
