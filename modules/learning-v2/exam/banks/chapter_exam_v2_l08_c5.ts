// chapter_exam_v2_l08_c5.ts — банк экзамена v2: урок 8, глава 5 (эпизоды 33–40). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–40 — «не делай» Don't + действие, вежливое Please don't, успокоить Don't panic / Don't rush;
// вопросов в банках нет. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L08_C5: ChapterExamV2Bank = {
  lessonOrdinal: 8,
  chapterOrdinal: 5,
  grammarPoints: [
    { id: 'l08c5_dont', label: { ru: 'не делай — Don\'t + действие', uk: 'не роби — Don\'t + дія' }, episodeOrdinals: [33, 36, 37] },
    { id: 'l08c5_please_dont', label: { ru: 'мягче — Please don\'t …', uk: 'м’якше — Please don\'t …' }, episodeOrdinals: [34, 35] },
    { id: 'l08c5_calm', label: { ru: 'успокоить — Don\'t panic, Don\'t rush', uk: 'заспокоїти — Don\'t panic, Don\'t rush' }, episodeOrdinals: [38, 39] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l08c5-01', type: 'situation', grammarPoint: 'l08c5_dont', situation: { ru: 'Ребёнок несёт воду для кисточки прямо над рисунком. Предупреди, чтобы не разлил.', uk: 'Дитина несе воду для пензлика просто над малюнком. Попередь, щоб не розлила.' }, accepted: ["Don't spill it.", "Please don't spill it."] },
    { id: 'l08c5-02', type: 'situation', grammarPoint: 'l08c5_please_dont', situation: { ru: 'Гость подкаста рассказывает, а его всё время перебивают. Вежливо попроси не перебивать.', uk: 'Гість подкасту розповідає, а його весь час перебивають. Ввічливо попроси не перебивати.' }, accepted: ["Please don't interrupt.", "Don't interrupt, please."] },
    { id: 'l08c5-03', type: 'situation', grammarPoint: 'l08c5_calm', situation: { ru: 'Друг зашёл в пустую аудиторию и решил, что пропустил экзамен. Успокой его.', uk: 'Друг зайшов у порожню аудиторію й вирішив, що пропустив іспит. Заспокой його.' }, accepted: ["Don't panic.", "Please don't panic."] },
    { id: 'l08c5-04', type: 'situation', grammarPoint: 'l08c5_dont', situation: { ru: 'Чей-то чемодан стоит поперёк выхода. Попроси не загораживать выход.', uk: 'Чиясь валіза стоїть поперек виходу. Попроси не загороджувати вихід.' }, accepted: ["Don't block the exit.", "Please don't block the exit."] },
    { id: 'l08c5-05', type: 'situation', grammarPoint: 'l08c5_please_dont', situation: { ru: 'Друг ждёт тебя у входа, а ты задерживаешься. Вежливо скажи, чтобы не ждал.', uk: 'Друг чекає на тебе біля входу, а ти затримуєшся. Ввічливо скажи, щоб не чекав.' }, accepted: ["Please don't wait.", "Don't wait, please."] },
    { id: 'l08c5-06', type: 'situation', grammarPoint: 'l08c5_calm', situation: { ru: 'Подруга сдаёт работу и всё делает впопыхах. Скажи, чтобы не торопилась.', uk: 'Подруга здає роботу й усе робить поспіхом. Скажи, щоб не поспішала.' }, accepted: ["Don't rush.", "Please don't rush."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c5-07', type: 'dialogue', grammarPoint: 'l08c5_dont', partnerLine: 'I can bend it.', situation: { ru: 'Друг хочет согнуть длинную линейку, чтобы она влезла в пенал. Скажи, чтобы не сгибал.', uk: 'Друг хоче зігнути довгу лінійку, щоб вона влізла в пенал. Скажи, щоб не згинав.' }, accepted: ["Don't bend it.", "Please don't bend it."] },
    { id: 'l08c5-08', type: 'dialogue', grammarPoint: 'l08c5_please_dont', partnerLine: 'I can splash you.', situation: { ru: 'Вы у бассейна, у тебя в руках книга. Вежливо попроси не брызгать на тебя.', uk: 'Ви біля басейну, у тебе в руках книжка. Ввічливо попроси не бризкати на тебе.' }, accepted: ["Please don't splash me.", "Don't splash me, please."] },
    { id: 'l08c5-09', type: 'dialogue', grammarPoint: 'l08c5_calm', partnerLine: "I can't find the exit.", situation: { ru: 'Друг занервничал в незнакомом здании. Успокой его.', uk: 'Друг занервував у незнайомій будівлі. Заспокой його.' }, accepted: ["Don't panic.", "Please don't panic."] },
    { id: 'l08c5-10', type: 'dialogue', grammarPoint: 'l08c5_dont', partnerLine: 'I can drag the chair.', situation: { ru: 'Вы в тихом читальном зале. Скажи, чтобы не тащил стул.', uk: 'Ви в тихій читальній залі. Скажи, щоб не тягнув стілець.' }, accepted: ["Don't drag the chair.", "Please don't drag the chair."] },
    { id: 'l08c5-11', type: 'dialogue', grammarPoint: 'l08c5_please_dont', partnerLine: 'This is my letter.', situation: { ru: 'Друг хочет порвать старое письмо, а тебе оно дорого. Вежливо попроси не рвать.', uk: 'Друг хоче порвати старий лист, а тобі він дорогий. Ввічливо попроси не рвати.' }, accepted: ["Please don't rip the letter.", "Please don't rip it.", "Don't rip the letter, please."] },
    { id: 'l08c5-12', type: 'dialogue', grammarPoint: 'l08c5_calm', partnerLine: 'I can guess.', situation: { ru: 'На экскурсии друг собирается отвечать наугад. Скажи, чтобы не угадывал.', uk: 'На екскурсії друг збирається відповідати навмання. Скажи, щоб не вгадував.' }, accepted: ["Don't guess.", "Please don't guess."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c5-13', type: 'fix', grammarPoint: 'l08c5_dont', wrong: 'Not spill it.', accepted: ["Don't spill it."] },
    { id: 'l08c5-14', type: 'fix', grammarPoint: 'l08c5_dont', wrong: "Don't to slam the drawer.", accepted: ["Don't slam the drawer."] },
    { id: 'l08c5-15', type: 'fix', grammarPoint: 'l08c5_please_dont', wrong: 'Please not interrupt.', accepted: ["Please don't interrupt.", "Don't interrupt, please."] },
    { id: 'l08c5-16', type: 'fix', grammarPoint: 'l08c5_calm', wrong: "Don't panics.", accepted: ["Don't panic."] },
  ],
};
