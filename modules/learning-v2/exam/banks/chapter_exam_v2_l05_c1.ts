// chapter_exam_v2_l05_c1.ts — банк экзамена v2: урок 5, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–8 урока 5
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 1: I / we / they have (1, 3, 7), he / she has (1, 4, 6), состояние (I am cold) против «у меня есть» (2, 5).
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l05.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L05_C1: ChapterExamV2Bank = {
  lessonOrdinal: 5,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: "l05c1_have", label: { ru: "у меня / нас есть — I have, we have", uk: "у мене / нас є — I have, we have" }, episodeOrdinals: [1, 3, 7] },
    { id: "l05c1_has", label: { ru: "у него / неё есть — he has, she has", uk: "у нього / неї є — he has, she has" }, episodeOrdinals: [1, 4, 6] },
    { id: "l05c1_state", label: { ru: "состояние — I am cold, she is busy", uk: "стан — I am cold, she is busy" }, episodeOrdinals: [2, 5] },
  ],
  items: [
    { id: "l05c1-01", type: "situation", grammarPoint: "l05c1_has", situation: { ru: "Ты забыл ключи, а сестра дома. Скажи соседу, что у неё есть ключ.", uk: "Ти забув ключі, а сестра вдома. Скажи сусідові, що в неї є ключ." }, accepted: ["She has a key."] },
    { id: "l05c1-02", type: "situation", grammarPoint: "l05c1_have", situation: { ru: "Друг хочет распечатать билет. Скажи, что у тебя есть компьютер.", uk: "Друг хоче роздрукувати квиток. Скажи, що в тебе є комп’ютер." }, accepted: ["I have a computer."] },
    { id: "l05c1-03", type: "situation", grammarPoint: "l05c1_have", situation: { ru: "Гости пришли смотреть фильм. Скажи, что у вас есть попкорн.", uk: "Гості прийшли дивитися фільм. Скажи, що у вас є попкорн." }, accepted: ["We have popcorn."] },
    { id: "l05c1-04", type: "situation", grammarPoint: "l05c1_has", situation: { ru: "Пациент спрашивает, кто измерит температуру. Скажи, что градусник у медсестры.", uk: "Пацієнт питає, хто виміряє температуру. Скажи, що термометр у медсестри." }, accepted: ["The nurse has a thermometer."] },
    { id: "l05c1-05", type: "situation", grammarPoint: "l05c1_state", situation: { ru: "Ты долго ждал автобус на ветру. Скажи, что тебе холодно.", uk: "Ти довго чекав автобус на вітрі. Скажи, що тобі холодно." }, accepted: ["I am cold.", "I'm cold."] },
    { id: "l05c1-06", type: "situation", grammarPoint: "l05c1_state", situation: { ru: "Перед собеседованием друг спрашивает, как ты. Скажи, что волнуешься.", uk: "Перед співбесідою друг питає, як ти. Скажи, що хвилюєшся." }, accepted: ["I am nervous.", "I'm nervous."] },
    { id: "l05c1-07", type: "dialogue", grammarPoint: "l05c1_has", partnerLine: "I have a pen.", situation: { ru: "Скажи, что у врача тоже есть ручка.", uk: "Скажи, що в лікаря теж є ручка." }, accepted: ["The doctor has a pen."] },
    { id: "l05c1-08", type: "dialogue", grammarPoint: "l05c1_have", partnerLine: "She has a snack.", situation: { ru: "Скажи, что у вас есть пицца.", uk: "Скажи, що у вас є піца." }, accepted: ["We have a pizza."] },
    { id: "l05c1-09", type: "dialogue", grammarPoint: "l05c1_state", partnerLine: "We have a snack.", situation: { ru: "Обрадуйся: ты как раз голоден.", uk: "Зрадій: ти якраз голодний." }, accepted: ["I am hungry.", "I'm hungry."] },
    { id: "l05c1-10", type: "dialogue", grammarPoint: "l05c1_state", partnerLine: "She has a computer.", situation: { ru: "Добавь, что она сейчас занята.", uk: "Додай, що вона зараз зайнята." }, accepted: ["She is busy.", "She's busy."] },
    { id: "l05c1-11", type: "dialogue", grammarPoint: "l05c1_has", partnerLine: "They have curtains.", situation: { ru: "Добавь: у неё тоже есть занавеска.", uk: "Додай: у неї теж є фіранка." }, accepted: ["She has a curtain."] },
    { id: "l05c1-12", type: "dialogue", grammarPoint: "l05c1_have", partnerLine: "He has a key.", situation: { ru: "Скажи, что у тебя тоже есть ключ.", uk: "Скажи, що в тебе теж є ключ." }, accepted: ["I have a key."] },
    { id: "l05c1-13", type: "fix", grammarPoint: "l05c1_has", wrong: "She have a key.", accepted: ["She has a key."] },
    { id: "l05c1-14", type: "fix", grammarPoint: "l05c1_have", wrong: "They has a key.", accepted: ["They have a key."] },
    { id: "l05c1-15", type: "fix", grammarPoint: "l05c1_state", wrong: "I have hungry.", accepted: ["I am hungry.", "I'm hungry."] },
    { id: "l05c1-16", type: "fix", grammarPoint: "l05c1_has", wrong: "He have a cat.", accepted: ["He has a cat."] },
  ],
};
