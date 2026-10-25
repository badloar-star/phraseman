// chapter_exam_v2_l01_c2.ts — банк пилота экзамена v2: урок 1, глава 2 (эпизоды 9–16).
// зачем (координатор 25.10): банк главы 2 правит Learning V2 по пройденной грамматике эпизодов 1–16 — I am / I am not (глава 1),
// he/she/it is (9, 16), you are (10, 14), you are not (11), I am и you are вместе (12, 13, 15). «Мы / они» и вопросы в главе 2 ещё не
// проходили — их в банке нет. Правило владельца: ситуация, реплика собеседника и ответ сходятся по смыслу, как в живом разговоре;
// верных вариантов несколько. Замок владельца 25.10: каждое английское слово (реплика, фраза с ошибкой, все принятые ответы) уже
// встречалось в эпизодах 1–16 — сторож tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Поэтому без the, a, very, yes, thanks.
// 16 заданий — запас на пересдачу (задания прошлой попытки уходят в конец). Заменяет черновик 951c52ffb.
// Окончательный банк — от фабрики курса (exam_bank) после вычитки владельцем.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L01_C2: ChapterExamV2Bank = {
  lessonOrdinal: 1,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l01c2_i_am', label: { ru: 'я — I am', uk: 'я — I am' }, episodeOrdinals: [12, 13, 15] },
    { id: 'l01c2_is', label: { ru: 'он / она / оно — is', uk: 'він / вона / воно — is' }, episodeOrdinals: [9, 16] },
    { id: 'l01c2_you_are', label: { ru: 'ты — you are', uk: 'ти — you are' }, episodeOrdinals: [10, 14] },
    { id: 'l01c2_not', label: { ru: 'не — I am not, you are not', uk: 'не — I am not, you are not' }, episodeOrdinals: [11, 15] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l01c2-01', type: 'situation', grammarPoint: 'l01c2_is', situation: { ru: 'Коллега спрашивает про нового начальника. Скажи, что он добрый.', uk: 'Колега питає про нового начальника. Скажи, що він добрий.' }, accepted: ['He is kind.', "He's kind."] },
    { id: 'l01c2-02', type: 'situation', grammarPoint: 'l01c2_is', situation: { ru: 'Ты взял кофе в автомате, а он холодный. Скажи об этом коллеге.', uk: 'Ти взяв каву в автоматі, а вона холодна. Скажи про це колезі.' }, accepted: ['It is cold.', "It's cold."] },
    { id: 'l01c2-03', type: 'situation', grammarPoint: 'l01c2_i_am', situation: { ru: 'Друг звонит и спрашивает, как ты. Скажи, что у тебя всё хорошо.', uk: 'Друг телефонує і питає, як ти. Скажи, що в тебе все добре.' }, accepted: ['I am fine.', "I'm fine.", 'I am okay.', "I'm okay."] },
    { id: 'l01c2-04', type: 'situation', grammarPoint: 'l01c2_not', situation: { ru: 'Сосед зовёт обедать, а ты только что поел. Скажи, что ты не голоден.', uk: 'Сусід кличе обідати, а ти щойно поїв. Скажи, що ти не голодний.' }, accepted: ['I am not hungry.', "I'm not hungry.", 'No, I am not hungry.', "No, I'm not hungry.", 'Sorry, I am not hungry.', "Sorry, I'm not hungry."] },
    { id: 'l01c2-05', type: 'situation', grammarPoint: 'l01c2_you_are', situation: { ru: 'Коллега пришёл на встречу за полчаса до начала. Скажи ему, что он рано.', uk: 'Колега прийшов на зустріч за пів години до початку. Скажи йому, що він рано.' }, accepted: ['You are early.', "You're early."] },
    { id: 'l01c2-06', type: 'situation', grammarPoint: 'l01c2_is', situation: { ru: 'Сестра спрашивает про твою новую соседку. Скажи, что она дружелюбная.', uk: 'Сестра питає про твою нову сусідку. Скажи, що вона привітна.' }, accepted: ['She is friendly.', "She's friendly.", 'She is kind.', "She's kind."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c2-07', type: 'dialogue', grammarPoint: 'l01c2_i_am', partnerLine: 'You are not ready.', situation: { ru: 'Возрази: ты готов.', uk: 'Заперечи: ти готовий.' }, accepted: ['I am ready.', "I'm ready.", 'No, I am ready.', "No, I'm ready."] },
    { id: 'l01c2-08', type: 'dialogue', grammarPoint: 'l01c2_not', partnerLine: 'You are tired.', situation: { ru: 'Возрази: ты не устал.', uk: 'Заперечи: ти не втомився.' }, accepted: ['I am not tired.', "I'm not tired.", 'No, I am not tired.', "No, I'm not tired."] },
    { id: 'l01c2-09', type: 'dialogue', grammarPoint: 'l01c2_not', partnerLine: 'Sorry! I am late.', situation: { ru: 'Успокой его: он не опоздал.', uk: 'Заспокой його: він не запізнився.' }, accepted: ['You are not late.', "You're not late.", "You aren't late.", 'No, you are not late.', "No, you're not late.", "No, you aren't late."] },
    { id: 'l01c2-10', type: 'dialogue', grammarPoint: 'l01c2_is', partnerLine: 'It is cold here.', situation: { ru: 'Возрази: здесь тепло.', uk: 'Заперечи: тут тепло.' }, accepted: ['It is warm.', "It's warm.", 'No, it is warm.', "No, it's warm.", 'It is warm here.', "It's warm here.", 'It is not cold.', "It isn't cold."] },
    { id: 'l01c2-11', type: 'dialogue', grammarPoint: 'l01c2_you_are', partnerLine: 'I am nervous.', situation: { ru: 'Подбодри коллегу: скажи, что он готов.', uk: 'Підбадьор колегу: скажи, що він готовий.' }, accepted: ['You are ready.', "You're ready."] },
    { id: 'l01c2-12', type: 'dialogue', grammarPoint: 'l01c2_you_are', partnerLine: 'He is wrong. I am right.', situation: { ru: 'Согласись с ним: он прав.', uk: 'Погодься з ним: він має рацію.' }, accepted: ['You are right.', "You're right."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c2-13', type: 'fix', grammarPoint: 'l01c2_is', wrong: 'She are home.', accepted: ['She is home.', "She's home."] },
    { id: 'l01c2-14', type: 'fix', grammarPoint: 'l01c2_you_are', wrong: 'You is kind.', accepted: ['You are kind.', "You're kind."] },
    { id: 'l01c2-15', type: 'fix', grammarPoint: 'l01c2_i_am', wrong: 'I is here.', accepted: ['I am here.', "I'm here."] },
    { id: 'l01c2-16', type: 'fix', grammarPoint: 'l01c2_not', wrong: 'I not am hungry.', accepted: ['I am not hungry.', "I'm not hungry."] },
  ],
};
