// chapter_exam_v2_l24_c7.ts — банк экзамена v2: урок 24, глава 7 (эпизоды 49–56). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–56 урока 24 — have / has против прошлого с названным временем и «как обычно / чего не
// решаюсь» из эпизодов 49 и 54 (I breathe, I do not dare). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L24_C7: ChapterExamV2Bank = {
  lessonOrdinal: 24,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l24c7_result', label: { ru: 'результат сейчас — I have adopted', uk: 'результат зараз — I have adopted' }, episodeOrdinals: [51, 52, 56] },
    { id: 'l24c7_when', label: { ru: 'названо время — received yesterday', uk: 'названо час — received yesterday' }, episodeOrdinals: [50, 52, 55] },
    { id: 'l24c7_usual', label: { ru: 'как обычно и чего не делаю — I breathe, I do not dare', uk: 'як зазвичай і чого не роблю — I breathe, I do not dare' }, episodeOrdinals: [49, 54] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l24c7-01', type: 'situation', grammarPoint: 'l24c7_result', situation: { ru: 'Ты взял из приюта кота — именно кота, не кошку. Расскажи другу.', uk: 'Ти взяв із притулку кота — саме кота, не кішку. Розкажи другові.' }, accepted: ['I have adopted a male cat.'] },
    { id: 'l24c7-02', type: 'situation', grammarPoint: 'l24c7_when', situation: { ru: 'Расскажи о сестре: вчера она получила диплом.', uk: 'Розкажи про сестру: учора вона отримала диплом.' }, accepted: ['She received her diploma yesterday.'] },
    { id: 'l24c7-03', type: 'situation', grammarPoint: 'l24c7_usual', situation: { ru: 'Тренер по йоге просит описать твоё дыхание. Скажи, что дышишь медленно.', uk: 'Тренер з йоги просить описати твоє дихання. Скажи, що дихаєш повільно.' }, accepted: ['I breathe slowly.'] },
    { id: 'l24c7-04', type: 'situation', grammarPoint: 'l24c7_result', situation: { ru: 'Ты отправил документы на учёбу и ждёшь ответа. Скажи, что подал заявление в колледж.', uk: 'Ти надіслав документи на навчання й чекаєш відповіді. Скажи, що подав заяву до коледжу.' }, accepted: ['I have applied to a college.'] },
    { id: 'l24c7-05', type: 'situation', grammarPoint: 'l24c7_when', situation: { ru: 'Друг спрашивает, почему ты не отвечал на сообщения. Скажи, что на прошлой неделе вы летели через Атлантику.', uk: 'Друг питає, чому ти не відповідав на повідомлення. Скажи, що минулого тижня ви летіли через Атлантику.' }, accepted: ['We flew across the Atlantic last week.'] },
    { id: 'l24c7-06', type: 'situation', grammarPoint: 'l24c7_usual', situation: { ru: 'Друзья прыгают со скалы в воду и зовут тебя. Скажи, что ты не решаешься прыгнуть.', uk: 'Друзі стрибають зі скелі у воду й кличуть тебе. Скажи, що ти не наважуєшся стрибнути.' }, accepted: ['I do not dare to jump.', "I don't dare to jump."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c7-07', type: 'dialogue', grammarPoint: 'l24c7_result', partnerLine: 'She visited Asia last year.', situation: { ru: 'Скажи, что ты путешествовал по Европе.', uk: 'Скажи, що ти подорожував Європою.' }, accepted: ['I have travelled around Europe.', "I've travelled around Europe."] },
    { id: 'l24c7-08', type: 'dialogue', grammarPoint: 'l24c7_when', partnerLine: 'I have seen this sculpture.', situation: { ru: 'Вы в галерее. Скажи, что вчера вы здесь купили картину.', uk: 'Ви в галереї. Скажи, що вчора ви тут купили картину.' }, accepted: ['We bought a painting yesterday.'] },
    { id: 'l24c7-09', type: 'dialogue', grammarPoint: 'l24c7_when', partnerLine: 'We have checked the inner pocket.', situation: { ru: 'Ищете ключи. Скажи, что ты открывал нижний ящик ещё вчера.', uk: 'Шукаєте ключі. Скажи, що ти відкривав нижню шухляду ще вчора.' }, accepted: ['I opened the lower drawer yesterday.'] },
    { id: 'l24c7-10', type: 'dialogue', grammarPoint: 'l24c7_usual', partnerLine: 'He has injured his knee.', situation: { ru: 'Скажи, что ты не хочешь повредить своё колено.', uk: 'Скажи, що ти не хочеш пошкодити своє коліно.' }, accepted: ['I do not want to injure my knee.', "I don't want to injure my knee."] },
    { id: 'l24c7-11', type: 'dialogue', grammarPoint: 'l24c7_when', partnerLine: 'Dogs lick their paws.', situation: { ru: 'Скажи, что вчера собака лизнула тебе руку.', uk: 'Скажи, що вчора собака лизнув тобі руку.' }, accepted: ['The dog licked my hand yesterday.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c7-12', type: 'fix', grammarPoint: 'l24c7_result', wrong: 'I have adopt a male cat.', accepted: ['I have adopted a male cat.'] },
    { id: 'l24c7-13', type: 'fix', grammarPoint: 'l24c7_when', wrong: 'She has received her diploma yesterday.', accepted: ['She received her diploma yesterday.'] },
    { id: 'l24c7-14', type: 'fix', grammarPoint: 'l24c7_usual', wrong: 'I not dare to jump.', accepted: ['I do not dare to jump.', "I don't dare to jump."] },
    { id: 'l24c7-15', type: 'fix', grammarPoint: 'l24c7_when', wrong: 'He paint a landscape last week.', accepted: ['He painted a landscape last week.'] },
  ],
};
