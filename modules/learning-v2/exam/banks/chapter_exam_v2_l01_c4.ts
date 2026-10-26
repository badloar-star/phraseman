// chapter_exam_v2_l01_c4.ts — банк экзамена v2: урок 1, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 4 учит самостоятельно выбирать am / is / are с новыми
// словами о чувствах и состояниях (25–32). Сокращения вводит только глава 5 — эталон (первый в accepted) полной формой, короткая
// засчитывается. Вопросов в уроке 1 нет. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L01_C4: ChapterExamV2Bank = {
  lessonOrdinal: 1,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l01c4_i_am', label: { ru: 'я — I am', uk: 'я — I am' }, episodeOrdinals: [25, 27, 28] },
    { id: 'l01c4_is', label: { ru: 'он / она / оно — is', uk: 'він / вона / воно — is' }, episodeOrdinals: [27, 29, 30] },
    { id: 'l01c4_are', label: { ru: 'ты / мы / они — are', uk: 'ти / ми / вони — are' }, episodeOrdinals: [26, 30, 31] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l01c4-01', type: 'situation', grammarPoint: 'l01c4_i_am', situation: { ru: 'Племянница блестяще сыграла сложную роль. Скажи ей, что ты впечатлён.', uk: 'Племінниця блискуче зіграла складну роль. Скажи їй, що ти вражений.' }, accepted: ['I am impressed.', "I'm impressed."] },
    { id: 'l01c4-02', type: 'situation', grammarPoint: 'l01c4_is', situation: { ru: 'Гость хочет поздороваться с твоей дочкой, а она уже час в кровати. Скажи, что она спит.', uk: 'Гість хоче привітатися з твоєю донькою, а вона вже годину в ліжку. Скажи, що вона спить.' }, accepted: ['She is asleep.', "She's asleep."] },
    { id: 'l01c4-03', type: 'situation', grammarPoint: 'l01c4_are', situation: { ru: 'Сын с утра не берёт трубку. Напиши сестре, что вы с мужем волнуетесь.', uk: 'Син із ранку не бере слухавку. Напиши сестрі, що ви з чоловіком хвилюєтеся.' }, accepted: ['We are worried.', "We're worried."] },
    { id: 'l01c4-04', type: 'situation', grammarPoint: 'l01c4_is', situation: { ru: 'Друг сомневается в ответе к задаче. Ты сверил с учебником. Скажи, что ответ верный.', uk: 'Друг сумнівається у відповіді до задачі. Ти звірив із підручником. Скажи, що відповідь правильна.' }, accepted: ['It is correct.', "It's correct."] },
    { id: 'l01c4-05', type: 'situation', grammarPoint: 'l01c4_i_am', situation: { ru: 'Начальник ищет, кто сегодня возьмёт срочную задачу. Скажи, что ты свободен.', uk: 'Начальник шукає, хто сьогодні візьме термінове завдання. Скажи, що ти вільний.' }, accepted: ['I am available.', "I'm available."] },
    { id: 'l01c4-06', type: 'situation', grammarPoint: 'l01c4_are', situation: { ru: 'Два тарифа стоят одинаково и дают одно и то же. Скажи, что они равные.', uk: 'Два тарифи коштують однаково й дають те саме. Скажи, що вони рівні.' }, accepted: ['They are equal.', "They're equal."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c4-07', type: 'dialogue', grammarPoint: 'l01c4_is', partnerLine: 'He is asleep.', situation: { ru: 'Возрази: ты слышишь, как брат ходит по комнате, — он не спит.', uk: 'Заперечи: ти чуєш, як брат ходить кімнатою, — він не спить.' }, accepted: ['He is awake.', "He's awake.", 'No, he is awake.', "No, he's awake."] },
    { id: 'l01c4-08', type: 'dialogue', grammarPoint: 'l01c4_are', partnerLine: 'You are bored.', situation: { ru: 'Возрази: вам с другом не скучно, вы спокойно отдыхаете.', uk: 'Заперечи: вам із другом не нудно, ви спокійно відпочиваєте.' }, accepted: ['We are relaxed.', "We're relaxed.", 'No, we are relaxed.', "No, we're relaxed."] },
    { id: 'l01c4-09', type: 'dialogue', grammarPoint: 'l01c4_i_am', partnerLine: 'You are late.', situation: { ru: 'Возрази: ты всегда приходишь вовремя.', uk: 'Заперечи: ти завжди приходиш вчасно.' }, accepted: ['I am punctual.', "I'm punctual.", 'No, I am punctual.', "No, I'm punctual."] },
    { id: 'l01c4-10', type: 'dialogue', grammarPoint: 'l01c4_is', partnerLine: 'It is huge.', situation: { ru: 'Возрази: картина на выставке совсем крошечная.', uk: 'Заперечи: картина на виставці зовсім крихітна.' }, accepted: ['It is tiny.', "It's tiny.", 'No, it is tiny.', "No, it's tiny."] },
    { id: 'l01c4-11', type: 'dialogue', grammarPoint: 'l01c4_are', partnerLine: 'They are equal.', situation: { ru: 'Возрази: два телефона не одинаковые, они только похожи.', uk: 'Заперечи: два телефони не однакові, вони лише схожі.' }, accepted: ['They are similar.', "They're similar.", 'No, they are similar.', "No, they're similar."] },
    { id: 'l01c4-12', type: 'dialogue', grammarPoint: 'l01c4_is', partnerLine: 'She is relaxed.', situation: { ru: 'Возрази: сестра ждёт результатов анализов — она волнуется.', uk: 'Заперечи: сестра чекає результатів аналізів — вона хвилюється.' }, accepted: ['She is worried.', "She's worried.", 'No, she is worried.', "No, she's worried."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l01c4-13', type: 'fix', grammarPoint: 'l01c4_i_am', wrong: 'I is certain.', accepted: ['I am certain.', "I'm certain."] },
    { id: 'l01c4-14', type: 'fix', grammarPoint: 'l01c4_is', wrong: 'She are popular.', accepted: ['She is popular.', "She's popular."] },
    { id: 'l01c4-15', type: 'fix', grammarPoint: 'l01c4_are', wrong: 'They is missing.', accepted: ['They are missing.', "They're missing."] },
    { id: 'l01c4-16', type: 'fix', grammarPoint: 'l01c4_are', wrong: 'We is exhausted.', accepted: ['We are exhausted.', "We're exhausted."] },
  ],
};
