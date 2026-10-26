// chapter_exam_v2_l02_c2.ts — банк экзамена v2: урок 2, глава 2 (эпизоды 9–16).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 2 урока 2 вводит вопрос — am / is / are в начале
// (9–16) — и повторяет not с новыми словами. Здесь вопросы уже есть, поэтому знак «?» в ответах законен (сторож правил запрещает его
// только в уроке 1). Слов no / yes в эпизодах 1–16 нет — вариантов с ними нет. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L02_C2: ChapterExamV2Bank = {
  lessonOrdinal: 2,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l02c2_is_question', label: { ru: 'вопрос: Is it …?', uk: 'питання: Is it …?' }, episodeOrdinals: [9, 10, 11] },
    { id: 'l02c2_are_question', label: { ru: 'вопрос: Are you / they …?', uk: 'питання: Are you / they …?' }, episodeOrdinals: [9, 11, 12] },
    { id: 'l02c2_not', label: { ru: 'не — is not / are not', uk: 'не — is not / are not' }, episodeOrdinals: [10, 13, 14] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l02c2-01', type: 'situation', grammarPoint: 'l02c2_is_question', situation: { ru: 'Ты хочешь сдать билет за час до поезда. Спроси кассира, возможно ли это.', uk: 'Ти хочеш здати квиток за годину до потяга. Запитай касира, чи це можливо.' }, accepted: ['Is it possible?'] },
    { id: 'l02c2-02', type: 'situation', grammarPoint: 'l02c2_are_question', situation: { ru: 'Друг вдруг решил продать машину. Спроси, уверен ли он.', uk: 'Друг раптом вирішив продати машину. Запитай, чи він упевнений.' }, accepted: ['Are you sure?'] },
    { id: 'l02c2-03', type: 'situation', grammarPoint: 'l02c2_not', situation: { ru: 'Гость хочет выложить твоё семейное фото в сеть. Скажи, что оно не для всех.', uk: 'Гість хоче викласти твоє сімейне фото в мережу. Скажи, що воно не для всіх.' }, accepted: ['It is not public.', "It's not public.", 'It is private.', "It's private."] },
    { id: 'l02c2-04', type: 'situation', grammarPoint: 'l02c2_is_question', situation: { ru: 'В кафе на спинке свободного стула висит куртка. Спроси, занято ли.', uk: 'У кафе на спинці вільного стільця висить куртка. Запитай, чи зайнято.' }, accepted: ['Is it taken?'] },
    { id: 'l02c2-05', type: 'situation', grammarPoint: 'l02c2_are_question', situation: { ru: 'Ты выбираешь подушки в магазине. Спроси продавца, мягкие ли они.', uk: 'Ти обираєш подушки в магазині. Запитай продавця, чи вони м’які.' }, accepted: ['Are they soft?'] },
    { id: 'l02c2-06', type: 'situation', grammarPoint: 'l02c2_not', situation: { ru: 'Курьер просит расписаться за посылку, а коробка открыта. Скажи, что она не заклеена.', uk: 'Кур’єр просить розписатися за посилку, а коробка відкрита. Скажи, що вона не заклеєна.' }, accepted: ['It is not sealed.', "It's not sealed."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c2-07', type: 'dialogue', grammarPoint: 'l02c2_is_question', partnerLine: 'It is old.', situation: { ru: 'Продавец хвалит старый шкаф. Спроси, деревянный ли он.', uk: 'Продавець хвалить стару шафу. Запитай, чи вона дерев’яна.' }, accepted: ['Is it wooden?'] },
    { id: 'l02c2-08', type: 'dialogue', grammarPoint: 'l02c2_are_question', partnerLine: 'They are not convinced.', situation: { ru: 'Коллега говорит про клиентов. Спроси, в курсе ли они вообще.', uk: 'Колега говорить про клієнтів. Запитай, чи вони взагалі в курсі.' }, accepted: ['Are they aware?'] },
    { id: 'l02c2-09', type: 'dialogue', grammarPoint: 'l02c2_not', partnerLine: 'It is impossible.', situation: { ru: 'Возрази: починить это можно — это не невозможно.', uk: 'Заперечи: полагодити це можна — це не неможливо.' }, accepted: ['It is not impossible.', "It's not impossible.", 'It is possible.', "It's possible."] },
    { id: 'l02c2-10', type: 'dialogue', grammarPoint: 'l02c2_is_question', partnerLine: 'She is quiet.', situation: { ru: 'Друг рассказывает про новую соседку. Спроси, дружелюбная ли она.', uk: 'Друг розповідає про нову сусідку. Запитай, чи вона привітна.' }, accepted: ['Is she friendly?'] },
    { id: 'l02c2-11', type: 'dialogue', grammarPoint: 'l02c2_are_question', partnerLine: 'We are ready.', situation: { ru: 'Команда рвётся выступать. Спроси, уверены ли они в себе.', uk: 'Команда рветься виступати. Запитай, чи вони впевнені в собі.' }, accepted: ['Are you confident?', 'Are you sure?'] },
    { id: 'l02c2-12', type: 'dialogue', grammarPoint: 'l02c2_not', partnerLine: 'It is dirty.', situation: { ru: 'Возрази: пол только что вымыли — он не грязный.', uk: 'Заперечи: підлогу щойно помили — вона не брудна.' }, accepted: ['It is not dirty.', "It's not dirty.", 'It is clean.', "It's clean."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l02c2-13', type: 'fix', grammarPoint: 'l02c2_is_question', wrong: 'It is possible?', accepted: ['Is it possible?'] },
    { id: 'l02c2-14', type: 'fix', grammarPoint: 'l02c2_are_question', wrong: 'Is you sure?', accepted: ['Are you sure?'] },
    { id: 'l02c2-15', type: 'fix', grammarPoint: 'l02c2_is_question', wrong: 'Are it urgent?', accepted: ['Is it urgent?'] },
    { id: 'l02c2-16', type: 'fix', grammarPoint: 'l02c2_not', wrong: 'It not is obvious.', accepted: ['It is not obvious.', "It's not obvious."] },
  ],
};
