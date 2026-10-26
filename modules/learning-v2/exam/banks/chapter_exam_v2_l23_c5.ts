// chapter_exam_v2_l23_c5.ts — банк экзамена v2: урок 23, глава 5 (эпизоды 33–40).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–40 урока 23, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 5 — just / already / not … yet (эпизод 33), учёба (36, 38–40), места и встречи (34, 35, 37). Вопросы с yet в экзамен не входят: «?» запрещён общим сторожем.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L23_C5: ChapterExamV2Bank = {
  lessonOrdinal: 23,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l23c5_just_already', label: { ru: 'только что, уже, ещё нет — just, already, not … yet', uk: 'щойно, вже, ще ні — just, already, not … yet' }, episodeOrdinals: [33] },
    { id: 'l23c5_studied', label: { ru: 'учёба — I have studied, I have read about', uk: 'навчання — I have studied, I have read about' }, episodeOrdinals: [36, 38, 39, 40] },
    { id: 'l23c5_met_seen', label: { ru: 'места и встречи — I have climbed, I have spoken to', uk: 'місця й зустрічі — I have climbed, I have spoken to' }, episodeOrdinals: [34, 35, 37] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l23c5-01', type: 'situation', grammarPoint: 'l23c5_just_already', situation: { ru: 'Ты выходишь из кабинета журналиста. Скажи коллеге, что только что говорил с ним.', uk: 'Ти виходиш із кабінету журналіста. Скажи колезі, що щойно говорив із ним.' }, accepted: ['I have just spoken to a journalist.', 'I have just spoken to the journalist.'] },
    { id: 'l23c5-02', type: 'situation', grammarPoint: 'l23c5_just_already', situation: { ru: 'Коллега хочет представить инженера твоей начальнице. Скажи, что она с ним уже знакома.', uk: 'Колега хоче представити інженера твоїй начальниці. Скажи, що вона з ним уже знайома.' }, accepted: ['She has already met the engineer.'] },
    { id: 'l23c5-03', type: 'situation', grammarPoint: 'l23c5_just_already', situation: { ru: 'Архитектор задерживается. Скажи коллегам, что вы с ним ещё не встречались.', uk: 'Архітектор затримується. Скажи колегам, що ви з ним ще не зустрічалися.' }, accepted: ['We have not met the architect yet.'] },
    { id: 'l23c5-04', type: 'situation', grammarPoint: 'l23c5_studied', situation: { ru: 'Внук жалуется на химию. Скажи, что ты тоже её изучал.', uk: 'Онук скаржиться на хімію. Скажи, що ти теж її вивчав.' }, accepted: ['I have studied chemistry.'] },
    { id: 'l23c5-05', type: 'situation', grammarPoint: 'l23c5_studied', situation: { ru: 'Коллега ищет, кто знает испанский. Скажи, что твоя жена его изучала.', uk: 'Колега шукає, хто знає іспанську. Скажи, що твоя дружина її вивчала.' }, accepted: ['She has studied Spanish.'] },
    { id: 'l23c5-06', type: 'situation', grammarPoint: 'l23c5_met_seen', situation: { ru: 'Вы вернулись из похода. Расскажи соседям, что вы поднялись на гору.', uk: 'Ви повернулися з походу. Розкажи сусідам, що ви піднялися на гору.' }, accepted: ['We have climbed a mountain.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c5-07', type: 'dialogue', grammarPoint: 'l23c5_just_already', partnerLine: 'The builder is here.', situation: { ru: 'Жена говорит, что пришёл строитель. Скажи, что ты с ним ещё не встречался.', uk: 'Дружина каже, що прийшов будівельник. Скажи, що ти з ним ще не зустрічався.' }, accepted: ['I have not met the builder yet.'] },
    { id: 'l23c5-08', type: 'dialogue', grammarPoint: 'l23c5_just_already', partnerLine: 'The scientist is here.', situation: { ru: 'Коллега хочет познакомить тебя с учёным. Скажи, что вы только что познакомились.', uk: 'Колега хоче познайомити тебе з ученим. Скажи, що ви щойно познайомилися.' }, accepted: ['I have just met the scientist.', 'We have just met.'] },
    { id: 'l23c5-09', type: 'dialogue', grammarPoint: 'l23c5_studied', partnerLine: 'Read this story about a king.', situation: { ru: 'Сын советует книгу о короле. Скажи, что ты уже читал о нём.', uk: 'Син радить книжку про короля. Скажи, що ти вже читав про нього.' }, accepted: ['I have already read about the king.', 'I have read about the king.', 'I have already read this story.', 'I have read this story.'] },
    { id: 'l23c5-10', type: 'dialogue', grammarPoint: 'l23c5_studied', partnerLine: 'We need a German speaker.', situation: { ru: 'На работе ищут, кто говорит по-немецки. Скажи, что ты изучал немецкий.', uk: 'На роботі шукають, хто говорить німецькою. Скажи, що ти вивчав німецьку.' }, accepted: ['I have studied German.'] },
    { id: 'l23c5-11', type: 'dialogue', grammarPoint: 'l23c5_met_seen', partnerLine: 'The ocean is perfect.', situation: { ru: 'Друг в восторге от океана. Скажи, что ты тоже видел океан.', uk: 'Друг у захваті від океану. Скажи, що ти теж бачив океан.' }, accepted: ['I have seen the ocean.'] },
    { id: 'l23c5-12', type: 'dialogue', grammarPoint: 'l23c5_met_seen', partnerLine: 'The firefighter is here.', situation: { ru: 'Дочь хочет рассказать пожарному о дыме. Скажи, что ты уже с ним говорил.', uk: 'Донька хоче розповісти пожежникові про дим. Скажи, що ти вже з ним говорив.' }, accepted: ['I have already spoken to the firefighter.', 'I have spoken to the firefighter.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c5-13', type: 'fix', grammarPoint: 'l23c5_just_already', wrong: 'I have met already the architect.', accepted: ['I have already met the architect.'] },
    { id: 'l23c5-14', type: 'fix', grammarPoint: 'l23c5_studied', wrong: 'He has study physics.', accepted: ['He has studied physics.'] },
    { id: 'l23c5-15', type: 'fix', grammarPoint: 'l23c5_met_seen', wrong: 'She has rode a camel.', accepted: ['She has ridden a camel.'] },
    { id: 'l23c5-16', type: 'fix', grammarPoint: 'l23c5_just_already', wrong: 'I have just meet a scientist.', accepted: ['I have just met a scientist.'] },
  ],
};
