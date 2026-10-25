// chapter_exam_v2_l01_c2.ts — банк пилота экзамена v2: урок 1, глава 2 (эпизоды 9–16).
// зачем (координатор 25.10): банк главы 2 правит Learning V2 по пройденной грамматике эпизодов 1–16 — I am / I am not (глава 1),
// he/she/it is (9, 16), you are (10, 14), you are not (11), I am и you are вместе (12, 13, 15). «Мы / они» и вопросы в главе 2 ещё не
// проходили — их в банке нет. Правило владельца: ситуация, реплика собеседника и ответ сходятся по смыслу, как в живом разговоре;
// верных вариантов несколько. 16 заданий — запас на пересдачу (задания прошлой попытки уходят в конец). Заменяет черновик 951c52ffb.
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
    { id: 'l01c2-01', type: 'situation', grammarPoint: 'l01c2_is', situation: { ru: 'Коллега спрашивает про нового начальника. Скажи, что он добрый.', uk: 'Колега питає про нового начальника. Скажи, що він добрий.' }, accepted: ['He is kind.', "He's kind.", 'He is very kind.', "He's very kind."] },
    { id: 'l01c2-02', type: 'situation', grammarPoint: 'l01c2_is', situation: { ru: 'Ты взял кофе в автомате, а он холодный. Скажи об этом коллеге.', uk: 'Ти взяв каву в автоматі, а вона холодна. Скажи про це колезі.' }, accepted: ['It is cold.', "It's cold.", 'The coffee is cold.', 'My coffee is cold.', 'This coffee is cold.'] },
    { id: 'l01c2-03', type: 'situation', grammarPoint: 'l01c2_i_am', situation: { ru: 'Друг звонит и спрашивает, как ты. Скажи, что у тебя всё хорошо.', uk: 'Друг телефонує і питає, як ти. Скажи, що в тебе все добре.' }, accepted: ['I am fine.', "I'm fine.", 'I am fine, thanks.', "I'm fine, thanks.", "I'm fine, thank you.", 'I am fine, thank you.'] },
    { id: 'l01c2-04', type: 'situation', grammarPoint: 'l01c2_not', situation: { ru: 'Сосед зовёт обедать, а ты только что поел. Скажи, что ты не голоден.', uk: 'Сусід кличе обідати, а ти щойно поїв. Скажи, що ти не голодний.' }, accepted: ['I am not hungry.', "I'm not hungry.", "Thanks, I'm not hungry.", 'Thank you, I am not hungry.', "Sorry, I'm not hungry.", "Thank you, I'm not hungry.", 'Thanks, I am not hungry.'] },
    { id: 'l01c2-05', type: 'situation', grammarPoint: 'l01c2_you_are', situation: { ru: 'Коллега пришёл на встречу за полчаса до начала. Скажи ему, что он рано.', uk: 'Колега прийшов на зустріч за пів години до початку. Скажи йому, що він рано.' }, accepted: ['You are early.', "You're early.", 'You are very early.', "You're very early."] },
    { id: 'l01c2-06', type: 'situation', grammarPoint: 'l01c2_is', situation: { ru: 'Сестра спрашивает про твою новую соседку. Скажи, что она милая.', uk: 'Сестра питає про твою нову сусідку. Скажи, що вона мила.' }, accepted: ['She is nice.', "She's nice.", 'She is very nice.', "She's very nice.", 'She is kind.', "She's kind."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c2-07', type: 'dialogue', grammarPoint: 'l01c2_i_am', partnerLine: 'Are you ready? The taxi is here.', situation: { ru: 'Ответь, что ты готов.', uk: 'Відповідай, що ти готовий.' }, accepted: ['I am ready.', "I'm ready.", 'Yes, I am ready.', "Yes, I'm ready.", 'Yes, I am.'] },
    { id: 'l01c2-08', type: 'dialogue', grammarPoint: 'l01c2_not', partnerLine: 'You look tired.', situation: { ru: 'Возрази: ты не устал.', uk: 'Заперечи: ти не втомився.' }, accepted: ['I am not tired.', "I'm not tired.", "No, I'm not tired.", 'No, I am not tired.'] },
    { id: 'l01c2-09', type: 'dialogue', grammarPoint: 'l01c2_not', partnerLine: "Sorry, I'm late!", situation: { ru: 'Успокой его: он не опоздал.', uk: 'Заспокой його: він не запізнився.' }, accepted: ['You are not late.', "You're not late.", "You aren't late.", "No, you're not late.", 'No, you are not late.', "No, you aren't late."] },
    { id: 'l01c2-10', type: 'dialogue', grammarPoint: 'l01c2_is', partnerLine: "Where's my phone?", situation: { ru: 'Ответь, что он здесь.', uk: 'Відповідай, що він тут.' }, accepted: ['It is here.', "It's here.", 'Your phone is here.', "It's here, on the table."] },
    { id: 'l01c2-11', type: 'dialogue', grammarPoint: 'l01c2_you_are', partnerLine: "I'm so nervous before the meeting.", situation: { ru: 'Подбодри коллегу: скажи, что он готов.', uk: 'Підбадьор колегу: скажи, що він готовий.' }, accepted: ['You are ready.', "You're ready.", 'You are ready for it.', "You're ready for it.", 'You are ready for the meeting.', "You're ready for the meeting."] },
    { id: 'l01c2-12', type: 'dialogue', grammarPoint: 'l01c2_you_are', partnerLine: 'I think this is the right bus.', situation: { ru: 'Согласись: он прав.', uk: 'Погодься: він має рацію.' }, accepted: ['You are right.', "You're right.", "Yes, you're right.", 'Yes, you are right.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c2-13', type: 'fix', grammarPoint: 'l01c2_is', wrong: 'She are at home.', accepted: ['She is at home.', "She's at home."] },
    { id: 'l01c2-14', type: 'fix', grammarPoint: 'l01c2_you_are', wrong: 'You is right.', accepted: ['You are right.', "You're right."] },
    { id: 'l01c2-15', type: 'fix', grammarPoint: 'l01c2_i_am', wrong: 'I is ready for the call.', accepted: ['I am ready for the call.', "I'm ready for the call."] },
    { id: 'l01c2-16', type: 'fix', grammarPoint: 'l01c2_not', wrong: 'I not am hungry.', accepted: ['I am not hungry.', "I'm not hungry."] },
  ],
};
