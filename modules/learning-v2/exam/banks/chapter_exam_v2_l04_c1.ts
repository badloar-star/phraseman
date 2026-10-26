// chapter_exam_v2_l04_c1.ts — банк экзамена v2: урок 4, глава 1 (эпизоды 1–8).
// зачем (слово владельца 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3; правила — docs/work/factory-exam-banks-task-for-codex-2026-10-25.md):
// каждое английское слово реплики, фразы с ошибкой и всех принятых ответов уже встречалось в эпизодах 1–8 урока 4
// (сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts); ситуация и ответ сходятся по смыслу; вопросы без «?» — общий тест правил банков.
// Глава 1: There is (1, 2, 6), There are (3, 5, 7), где место — here, nearby, near, behind, inside, upstairs (2, 6, 8). Вопросов ещё нет.
// Подключение в приложении (BANKS) — Learning V2 после вычитки владельцем; читабельный вид — docs/work/exam-banks/l04.md.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L04_C1: ChapterExamV2Bank = {
  lessonOrdinal: 4,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: "l04c1_there_is", label: { ru: "одно место — There is a…", uk: "одне місце — There is a…" }, episodeOrdinals: [1, 2, 6] },
    { id: "l04c1_there_are", label: { ru: "несколько мест — There are…", uk: "кілька місць — There are…" }, episodeOrdinals: [3, 5, 7] },
    { id: "l04c1_where", label: { ru: "где — here, near, behind, inside", uk: "де — here, near, behind, inside" }, episodeOrdinals: [2, 6, 8] },
  ],
  items: [
    { id: "l04c1-01", type: "situation", grammarPoint: "l04c1_there_is", situation: { ru: "Ты в новом районе с подругой, у неё болит голова. Скажи, что здесь есть аптека.", uk: "Ти в новому районі з подругою, у неї болить голова. Скажи, що тут є аптека." }, accepted: ["There is a pharmacy here."] },
    { id: "l04c1-02", type: "situation", grammarPoint: "l04c1_there_are", situation: { ru: "Турист ищет, где снять деньги. Скажи, что рядом есть банки.", uk: "Турист шукає, де зняти гроші. Скажи, що поруч є банки." }, accepted: ["There are banks nearby.", "There are banks here."] },
    { id: "l04c1-03", type: "situation", grammarPoint: "l04c1_where", situation: { ru: "Гость спрашивает, где посидеть на воздухе. Скажи, что за зданием есть сад.", uk: "Гість питає, де посидіти на повітрі. Скажи, що за будівлею є сад." }, accepted: ["There is a garden behind the building."] },
    { id: "l04c1-04", type: "situation", grammarPoint: "l04c1_where", situation: { ru: "Пациент стоит у входа и не знает, куда идти. Скажи, что клиника наверху.", uk: "Пацієнт стоїть біля входу й не знає, куди йти. Скажи, що клініка нагорі." }, accepted: ["There is a clinic upstairs."] },
    { id: "l04c1-05", type: "situation", grammarPoint: "l04c1_there_are", situation: { ru: "Бабушка устала гулять. Скажи, что у озера есть скамейки.", uk: "Бабуся втомилася гуляти. Скажи, що біля озера є лавки." }, accepted: ["There are benches near the lake."] },
    { id: "l04c1-06", type: "situation", grammarPoint: "l04c1_there_is", situation: { ru: "Сосед хочет свежего хлеба. Скажи, что рядом есть пекарня.", uk: "Сусід хоче свіжого хліба. Скажи, що поруч є пекарня." }, accepted: ["There is a bakery nearby."] },
    { id: "l04c1-07", type: "dialogue", grammarPoint: "l04c1_there_are", partnerLine: "There is a bank here.", situation: { ru: "Уточни: банков здесь несколько.", uk: "Уточни: банків тут кілька." }, accepted: ["There are banks here.", "There are banks nearby."] },
    { id: "l04c1-08", type: "dialogue", grammarPoint: "l04c1_there_is", partnerLine: "The neighbourhood is quiet.", situation: { ru: "Согласись и добавь, что рядом есть парк.", uk: "Погодься й додай, що поруч є парк." }, accepted: ["There is a park nearby."] },
    { id: "l04c1-09", type: "dialogue", grammarPoint: "l04c1_where", partnerLine: "There is a cinema near the library.", situation: { ru: "Поправь: кинотеатр за библиотекой.", uk: "Виправ: кінотеатр за бібліотекою." }, accepted: ["There is a cinema behind the library."] },
    { id: "l04c1-10", type: "dialogue", grammarPoint: "l04c1_where", partnerLine: "There is a hall outside the building.", situation: { ru: "Возрази: зал внутри здания.", uk: "Заперечи: зала всередині будівлі." }, accepted: ["There is a hall inside the building."] },
    { id: "l04c1-11", type: "dialogue", grammarPoint: "l04c1_there_are", partnerLine: "There is a museum behind the bank.", situation: { ru: "Уточни: музеев там несколько.", uk: "Уточни: музеїв там кілька." }, accepted: ["There are museums behind the bank."] },
    { id: "l04c1-12", type: "dialogue", grammarPoint: "l04c1_there_is", partnerLine: "There are schools nearby.", situation: { ru: "Добавь, что рядом есть и церковь.", uk: "Додай, що поруч є й церква." }, accepted: ["There is a church nearby."] },
    { id: "l04c1-13", type: "fix", grammarPoint: "l04c1_there_is", wrong: "There are a pharmacy here.", accepted: ["There is a pharmacy here."] },
    { id: "l04c1-14", type: "fix", grammarPoint: "l04c1_there_are", wrong: "There is banks nearby.", accepted: ["There are banks nearby."] },
    { id: "l04c1-15", type: "fix", grammarPoint: "l04c1_where", wrong: "There is a garden behind building.", accepted: ["There is a garden behind the building."] },
    { id: "l04c1-16", type: "fix", grammarPoint: "l04c1_there_are", wrong: "There are cafe near the supermarket.", accepted: ["There are cafes near the supermarket."] },
  ],
};
