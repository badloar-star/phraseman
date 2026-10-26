// chapter_exam_v2_l17_c7.ts — банк экзамена v2: урок 17, глава 7 (эпизоды 49–56). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 7 — итог урока: «a few / few» с числимыми, «a little / little» с веществами и «some / any» на новых словах. Только слова и формы эпизодов 1–56 урока 17; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L17_C7: ChapterExamV2Bank = {
  lessonOrdinal: 17,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l17c7_few', label: { ru: 'с числом: a few … / few …', uk: 'з числом: a few … / few …' }, episodeOrdinals: [50, 51, 52] },
    { id: 'l17c7_little', label: { ru: 'без числа: a little … / little …', uk: 'без числа: a little … / little …' }, episodeOrdinals: [54, 55] },
    { id: 'l17c7_some_any', label: { ru: 'some … / not … any …', uk: 'some … / not … any …' }, episodeOrdinals: [49, 53, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l17c7-01', type: 'situation', grammarPoint: 'l17c7_few', situation: { ru: 'Ты получил несколько голосовых сообщений. Скажи об этом.', uk: 'Ти отримав кілька голосових повідомлень. Скажи про це.' }, accepted: ['I received a few voice messages.'] },
    { id: 'l17c7-02', type: 'situation', grammarPoint: 'l17c7_few', situation: { ru: 'Контактных номеров у тебя почти нет. Скажи об этом.', uk: 'Контактних номерів у тебе майже немає. Скажи про це.' }, accepted: ['I have few contact numbers.'] },
    { id: 'l17c7-03', type: 'situation', grammarPoint: 'l17c7_little', situation: { ru: 'Душевного спокойствия у тебя почти нет. Скажи об этом.', uk: 'Душевного спокою у тебе майже немає. Скажи про це.' }, accepted: ['I have little peace of mind.'] },
    { id: 'l17c7-04', type: 'situation', grammarPoint: 'l17c7_little', situation: { ru: 'Свежей еды у вас немного. Скажи об этом.', uk: 'Свіжої їжі у вас небагато. Скажи про це.' }, accepted: ['We have a little fresh food.'] },
    { id: 'l17c7-05', type: 'situation', grammarPoint: 'l17c7_some_any', situation: { ru: 'Вы немного поболтали о пустяках. Скажи об этом.', uk: 'Ви трохи побалакали про дрібниці. Скажи про це.' }, accepted: ['We made some small talk.'] },
    { id: 'l17c7-06', type: 'situation', grammarPoint: 'l17c7_some_any', situation: { ru: 'Мелочи у тебя с собой нет. Скажи об этом.', uk: 'Дрібних грошей у тебе з собою немає. Скажи про це.' }, accepted: ["I don't have any spare change."] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l17c7-07', type: 'dialogue', grammarPoint: 'l17c7_few', partnerLine: 'We recorded a few meter readings.', situation: { ru: 'Друг говорит, что вы записали несколько показаний счётчика. Скажи, что счетов за электричество у вас почти нет.', uk: 'Друг каже, що ви записали кілька показань лічильника. Скажи, що рахунків за електрику у вас майже немає.' }, accepted: ['We have few electricity bills.'] },
    { id: 'l17c7-08', type: 'dialogue', grammarPoint: 'l17c7_few', partnerLine: 'We have a few emergency contacts.', situation: { ru: 'Друг говорит, что у вас есть несколько экстренных контактов. Скажи, что кодов районов ты знаешь мало.', uk: 'Друг каже, що у вас є кілька екстрених контактів. Скажи, що кодів районів ти знаєш мало.' }, accepted: ['I know few area codes.'] },
    { id: 'l17c7-09', type: 'dialogue', grammarPoint: 'l17c7_little', partnerLine: 'There is a little food waste.', situation: { ru: 'Друг говорит, что пищевых отходов немного. Скажи, что бутилированной воды у вас почти нет.', uk: 'Друг каже, що харчових відходів небагато. Скажи, що пляшкової води у вас майже немає.' }, accepted: ['We have little bottled water.'] },
    { id: 'l17c7-10', type: 'dialogue', grammarPoint: 'l17c7_little', partnerLine: 'I need a little personal space.', situation: { ru: 'Друг говорит, что ему нужно немного личного пространства. Скажи, что вы любите немного времени вместе.', uk: 'Друг каже, що йому потрібно трохи особистого простору. Скажи, що ви любите трохи часу разом.' }, accepted: ['We enjoy a little quality time.'] },
    { id: 'l17c7-11', type: 'dialogue', grammarPoint: 'l17c7_some_any', partnerLine: 'There are some train platforms outside.', situation: { ru: 'Друг говорит, что снаружи есть платформы. Скажи, что вы купили билеты на день.', uk: 'Друг каже, що надворі є платформи. Скажи, що ви купили квитки на день.' }, accepted: ['We bought some day tickets.'] },
    { id: 'l17c7-12', type: 'dialogue', grammarPoint: 'l17c7_some_any', partnerLine: 'We signed some permission slips.', situation: { ru: 'Друг говорит, что вы подписали разрешения. Скажи, что школьных обедов вы не предоставляете.', uk: 'Друг каже, що ви підписали дозволи. Скажи, що шкільних обідів ви не надаєте.' }, accepted: ["We don't provide any school meals."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l17c7-13', type: 'fix', grammarPoint: 'l17c7_few', wrong: 'We found a few water bill.', accepted: ['We found a few water bills.'] },
    { id: 'l17c7-14', type: 'fix', grammarPoint: 'l17c7_little', wrong: 'We have a few fresh food.', accepted: ['We have a little fresh food.'] },
    { id: 'l17c7-15', type: 'fix', grammarPoint: 'l17c7_little', wrong: 'There is a few food waste.', accepted: ['There is a little food waste.'] },
    { id: 'l17c7-16', type: 'fix', grammarPoint: 'l17c7_some_any', wrong: "I don't have some spare change.", accepted: ["I don't have any spare change."] },
  ],
};
