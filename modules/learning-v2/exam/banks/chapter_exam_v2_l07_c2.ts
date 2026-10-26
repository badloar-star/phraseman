// chapter_exam_v2_l07_c2.ts — банк экзамена v2: урок 7, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–16 урока 7
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 2: Does + человек — barber, pilot, headmaster (9, 12, 14), Does + вещь или место — fan, bookshop, cafe (10, 11, 15), Does he play… (13, 16).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l07.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L07_C2: ChapterExamV2Bank = {
  lessonOrdinal: 7,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: "l07c2_person", label: { ru: "про одного человека — Does the barber…", uk: "про одну людину — Does the barber…" }, episodeOrdinals: [9, 12, 14] },
    { id: "l07c2_thing", label: { ru: "про вещь или место — Does the fan work", uk: "про річ чи місце — Does the fan work" }, episodeOrdinals: [10, 11, 15] },
    { id: "l07c2_play", label: { ru: "во что играет — Does he play…", uk: "у що грає — Does he play…" }, episodeOrdinals: [13, 16] },
  ],
  items: [
    { id: "l07c2-01", type: "situation", grammarPoint: "l07c2_person", situation: { ru: "Ты ищешь хорошего барбера. Спроси соседа, работает ли барбер здесь.", uk: "Ти шукаєш хорошого барбера. Спитай сусіда, чи працює барбер тут." }, accepted: ["Does the barber work here"] },
    { id: "l07c2-02", type: "situation", grammarPoint: "l07c2_person", situation: { ru: "Ты ждёшь посылку. Спроси, оставляет ли почтальон посылки здесь.", uk: "Ти чекаєш посилку. Спитай, чи лишає листоноша посилки тут." }, accepted: ["Does the postman leave parcels here"] },
    { id: "l07c2-03", type: "situation", grammarPoint: "l07c2_thing", situation: { ru: "В номере жарко. Спроси, работает ли вентилятор.", uk: "У номері спекотно. Спитай, чи працює вентилятор." }, accepted: ["Does the fan work"] },
    { id: "l07c2-04", type: "situation", grammarPoint: "l07c2_thing", situation: { ru: "Тебе нужны открытки. Спроси, продаёт ли книжный открытки.", uk: "Тобі потрібні листівки. Спитай, чи продає книгарня листівки." }, accepted: ["Does the bookshop sell postcards"] },
    { id: "l07c2-05", type: "situation", grammarPoint: "l07c2_play", situation: { ru: "Подруга рассказывает про мужа. Спроси, играет ли он в шахматы.", uk: "Подруга розповідає про чоловіка. Спитай, чи грає він у шахи." }, accepted: ["Does he play chess"] },
    { id: "l07c2-06", type: "situation", grammarPoint: "l07c2_play", situation: { ru: "Ты ищешь пару для тенниса. Спроси про коллегу, играет ли она в теннис.", uk: "Ти шукаєш пару для тенісу. Спитай про колегу, чи грає вона в теніс." }, accepted: ["Does she play tennis"] },
    { id: "l07c2-07", type: "dialogue", grammarPoint: "l07c2_person", partnerLine: "I work at the airport.", situation: { ru: "Спроси, работает ли он в аэропорту.", uk: "Спитай, чи працює він в аеропорту." }, accepted: ["Does the pilot work at the airport"] },
    { id: "l07c2-08", type: "dialogue", grammarPoint: "l07c2_person", partnerLine: "The headmaster is here.", situation: { ru: "Спроси, преподаёт ли директор.", uk: "Спитай, чи викладає директор." }, accepted: ["Does the headmaster teach"] },
    { id: "l07c2-09", type: "dialogue", grammarPoint: "l07c2_thing", partnerLine: "We have a stove.", situation: { ru: "Спроси, есть ли у плиты духовка.", uk: "Спитай, чи має плита духовку." }, accepted: ["Does the stove have an oven"] },
    { id: "l07c2-10", type: "dialogue", grammarPoint: "l07c2_thing", partnerLine: "The cafe is near here.", situation: { ru: "Спроси, подают ли в кафе лапшу.", uk: "Спитай, чи подають у кафе локшину." }, accepted: ["Does the cafe serve noodles"] },
    { id: "l07c2-11", type: "dialogue", grammarPoint: "l07c2_play", partnerLine: "We play golf.", situation: { ru: "Спроси, играет ли твой брат в гольф.", uk: "Спитай, чи грає твій брат у гольф." }, accepted: ["Does your brother play golf"] },
    { id: "l07c2-12", type: "dialogue", grammarPoint: "l07c2_play", partnerLine: "We play chess.", situation: { ru: "Спроси, играет ли твой дядя в шахматы.", uk: "Спитай, чи грає твій дядько в шахи." }, accepted: ["Does your uncle play chess"] },
    { id: "l07c2-13", type: "fix", grammarPoint: "l07c2_person", wrong: "Does the vet works here", accepted: ["Does the vet work here"] },
    { id: "l07c2-14", type: "fix", grammarPoint: "l07c2_thing", wrong: "Do the buzzer work", accepted: ["Does the buzzer work"] },
    { id: "l07c2-15", type: "fix", grammarPoint: "l07c2_play", wrong: "Does she plays golf", accepted: ["Does she play golf"] },
    { id: "l07c2-16", type: "fix", grammarPoint: "l07c2_thing", wrong: "Does the optician sells glasses", accepted: ["Does the optician sell glasses"] },
  ],
};
