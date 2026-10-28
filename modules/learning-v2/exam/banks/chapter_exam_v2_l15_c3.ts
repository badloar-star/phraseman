// chapter_exam_v2_l15_c3.ts — банк экзамена v2: урок 15, глава 3 (эпизоды 17–24). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l15.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–24 урока 15
// (настоящее длительное для договорённого будущего со временем: I am meeting… tomorrow, We are having… on Saturday); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L15_C3: ChapterExamV2Bank = {
  lessonOrdinal: 15,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l15c3_meeting', label: { ru: 'встреча назначена — I am meeting … tomorrow', uk: 'зустріч призначена — I am meeting … tomorrow' }, episodeOrdinals: [17, 18, 19] },
    { id: 'l15c3_events', label: { ru: 'событие в планах — We are having / visiting', uk: 'подія в планах — We are having / visiting' }, episodeOrdinals: [20, 21, 22] },
    { id: 'l15c3_trying', label: { ru: 'занятие и поездка — I am trying / We are flying', uk: 'заняття й поїздка — I am trying / We are flying' }, episodeOrdinals: [23, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l15c3-01', type: 'situation', grammarPoint: 'l15c3_meeting', situation: { ru: 'Ты договорился с сиделкой о встрече в пятницу. Скажи об этом.', uk: 'Ти домовився з доглядальницею про зустріч у п’ятницю. Скажи про це.' }, accepted: ['I am meeting the carer on Friday.'] },
    { id: 'l15c3-02', type: 'situation', grammarPoint: 'l15c3_events', situation: { ru: 'В субботу ты идёшь на ярмарку ремёсел — всё уже решено. Скажи.', uk: 'У суботу ти йдеш на ярмарок ремесел — усе вже вирішено. Скажи.' }, accepted: ['I am visiting a craft fair on Saturday.'] },
    { id: 'l15c3-03', type: 'situation', grammarPoint: 'l15c3_trying', situation: { ru: 'Ты записался на пробное занятие в пятницу. Скажи об этом.', uk: 'Ти записався на пробне заняття в п’ятницю. Скажи про це.' }, accepted: ['I am attending a taster session on Friday.'] },
    { id: 'l15c3-04', type: 'situation', grammarPoint: 'l15c3_meeting', situation: { ru: 'Слесарь придёт завтра в два. Скажи, что у тебя с ним встреча.', uk: 'Слюсар прийде завтра о другій. Скажи, що в тебе з ним зустріч.' }, accepted: ['I am meeting the locksmith at two tomorrow.'] },
    { id: 'l15c3-05', type: 'situation', grammarPoint: 'l15c3_events', situation: { ru: 'В пятницу у тебя новоселье. Скажи друзьям.', uk: 'У п’ятницю в тебе новосілля. Скажи друзям.' }, accepted: ['I am having a housewarming on Friday.'] },
    { id: 'l15c3-06', type: 'situation', grammarPoint: 'l15c3_trying', situation: { ru: 'Билеты куплены: завтра утром вы летите. Скажи.', uk: 'Квитки куплено: завтра вранці ви летите. Скажи.' }, accepted: ['We are flying tomorrow morning.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c3-07', type: 'dialogue', grammarPoint: 'l15c3_meeting', partnerLine: 'We are coming at six.', situation: { ru: 'Скажи, что ты встречаешься с ней завтра.', uk: 'Скажи, що ти зустрічаєшся з нею завтра.' }, accepted: ['I am meeting her tomorrow.'] },
    { id: 'l15c3-08', type: 'dialogue', grammarPoint: 'l15c3_events', partnerLine: 'She is bringing a salad.', situation: { ru: 'Скажи, что ты тоже придёшь завтра на ужин, куда каждый несёт блюдо.', uk: 'Скажи, що ти теж прийдеш завтра на вечерю, куди кожен несе страву.' }, accepted: ['I am coming to the potluck tomorrow too.', 'I am coming to the potluck tomorrow.'] },
    { id: 'l15c3-09', type: 'dialogue', grammarPoint: 'l15c3_trying', partnerLine: 'We are meeting at the college.', situation: { ru: 'Скажи, что ты завтра пробуешь новое занятие.', uk: 'Скажи, що ти завтра пробуєш нове заняття.' }, accepted: ['I am trying a new class tomorrow.'] },
    { id: 'l15c3-10', type: 'dialogue', grammarPoint: 'l15c3_meeting', partnerLine: 'We are painting the room on Saturday.', situation: { ru: 'Скажи, что в понедельник вы встречаетесь с маляром.', uk: 'Скажи, що в понеділок ви зустрічаєтеся з малярем.' }, accepted: ['We are meeting the decorator on Monday.'] },
    { id: 'l15c3-11', type: 'dialogue', grammarPoint: 'l15c3_events', partnerLine: 'We are watching a play tonight.', situation: { ru: 'Скажи, что они сегодня сидят в первом ряду.', uk: 'Скажи, що вони сьогодні сидять у першому ряду.' }, accepted: ['They are sitting in the front row tonight.'] },
    { id: 'l15c3-12', type: 'dialogue', grammarPoint: 'l15c3_trying', partnerLine: 'We are flying tomorrow morning.', situation: { ru: 'Скажи, что ты встречаешь его в аэропорту.', uk: 'Скажи, що ти зустрічаєш його в аеропорту.' }, accepted: ['I am meeting you at the airport.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c3-13', type: 'fix', grammarPoint: 'l15c3_meeting', wrong: 'I meeting the carer tomorrow.', accepted: ['I am meeting the carer tomorrow.'] },
    { id: 'l15c3-14', type: 'fix', grammarPoint: 'l15c3_events', wrong: 'We is having a playdate on Saturday.', accepted: ['We are having a playdate on Saturday.'] },
    { id: 'l15c3-15', type: 'fix', grammarPoint: 'l15c3_trying', wrong: 'We is trying pottery tomorrow.', accepted: ['We are trying pottery tomorrow.'] },
    { id: 'l15c3-16', type: 'fix', grammarPoint: 'l15c3_meeting', wrong: 'She are meeting the dog walker on Friday.', accepted: ['She is meeting the dog walker on Friday.'] },
  ],
};
