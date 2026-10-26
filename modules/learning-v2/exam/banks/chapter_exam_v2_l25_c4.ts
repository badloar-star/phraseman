// chapter_exam_v2_l25_c4.ts — банк экзамена v2: урок 25, глава 4 (эпизоды 25–32). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–32 урока 25 — порядок событий в прошлом через before / after + прошлое (обе части — простое
// прошлое). Ситуация задаёт, что было раньше. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L25_C4: ChapterExamV2Bank = {
  lessonOrdinal: 25,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l25c4_after', label: { ru: 'после того как — after I reversed', uk: 'після того як — after I reversed' }, episodeOrdinals: [25, 26, 27] },
    { id: 'l25c4_before', label: { ru: 'прежде чем — before I opened', uk: 'перш ніж — before I opened' }, episodeOrdinals: [25, 27, 29] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l25c4-01', type: 'situation', grammarPoint: 'l25c4_after', situation: { ru: 'Инструктор просит рассказать, как ты парковался. Скажи, что остановился после того, как сдал назад.', uk: 'Інструктор просить розповісти, як ти паркувався. Скажи, що зупинився після того, як здав назад.' }, accepted: ['I stopped after I reversed.'] },
    { id: 'l25c4-02', type: 'situation', grammarPoint: 'l25c4_before', situation: { ru: 'Расскажи о водителе: он посмотрел в зеркало, прежде чем обогнать автобус.', uk: 'Розкажи про водія: він подивився в дзеркало, перш ніж обігнати автобус.' }, accepted: ['He checked his mirror before he overtook the bus.'] },
    { id: 'l25c4-03', type: 'situation', grammarPoint: 'l25c4_after', situation: { ru: 'В ресторане папе принесли счёт. Скажи, что он ворчал, после того как увидел его.', uk: 'У ресторані татові принесли рахунок. Скажи, що він бурчав, після того як побачив його.' }, accepted: ['He grumbled after he saw the bill.'] },
    { id: 'l25c4-04', type: 'situation', grammarPoint: 'l25c4_before', situation: { ru: 'Скажи, что хлеб был заплесневелым ещё до того, как ты открыл пакет.', uk: 'Скажи, що хліб був запліснявілим ще до того, як ти відкрив пакет.' }, accepted: ['The bread was mouldy before I opened the bag.'] },
    { id: 'l25c4-05', type: 'situation', grammarPoint: 'l25c4_after', situation: { ru: 'Расскажи, что вы почистили камин, после того как огонь погас.', uk: 'Розкажи, що ви почистили камін, після того як вогонь згас.' }, accepted: ['We cleaned the fireplace after the fire went out.'] },
    { id: 'l25c4-06', type: 'situation', grammarPoint: 'l25c4_before', situation: { ru: 'Ты нагрубил другу, а потом извинился. Признай, что был невежлив, прежде чем извинился.', uk: 'Ти нагрубив другові, а потім перепросив. Визнай, що був неввічливим, перш ніж перепросив.' }, accepted: ['I was impolite before I apologised.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c4-07', type: 'dialogue', grammarPoint: 'l25c4_after', partnerLine: 'The kitchen stank.', situation: { ru: 'Объясни: завоняло, после того как вы открыли мусорное ведро.', uk: 'Поясни: засмерділо, після того як ви відкрили смітник.' }, accepted: ['The kitchen stank after we opened the bin.', 'It stank after we opened the bin.'] },
    { id: 'l25c4-08', type: 'dialogue', grammarPoint: 'l25c4_before', partnerLine: 'Your room is clean.', situation: { ru: 'Скажи, что мама долго пилила тебя, прежде чем ты убрал комнату.', uk: 'Скажи, що мама довго пиляла тебе, перш ніж ти прибрав кімнату.' }, accepted: ['She nagged me before I cleaned my room.', 'My mother nagged me before I cleaned my room.'] },
    { id: 'l25c4-09', type: 'dialogue', grammarPoint: 'l25c4_before', partnerLine: 'He left early.', situation: { ru: 'Скажи, что он пожал тебе руку перед уходом.', uk: 'Скажи, що він потиснув тобі руку перед тим, як піти.' }, accepted: ['He gave me a handshake before he left.'] },
    { id: 'l25c4-10', type: 'dialogue', grammarPoint: 'l25c4_after', partnerLine: 'The gathering ended.', situation: { ru: 'Уточни: встреча закончилась, после того как вы поели.', uk: 'Уточни: зустріч закінчилася, після того як ви поїли.' }, accepted: ['The gathering ended after we ate.'] },
    { id: 'l25c4-11', type: 'dialogue', grammarPoint: 'l25c4_before', partnerLine: 'The flame went out.', situation: { ru: 'Скажи, что пламя погасло ещё до вашего ухода.', uk: 'Скажи, що полум’я згасло ще до того, як ви пішли.' }, accepted: ['The flame went out before we left.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c4-12', type: 'fix', grammarPoint: 'l25c4_after', wrong: 'I stopped after I reverse.', accepted: ['I stopped after I reversed.'] },
    { id: 'l25c4-13', type: 'fix', grammarPoint: 'l25c4_before', wrong: 'He checked his mirror before he overtake the bus.', accepted: ['He checked his mirror before he overtook the bus.'] },
    { id: 'l25c4-14', type: 'fix', grammarPoint: 'l25c4_after', wrong: 'The child whine after we left the park.', accepted: ['The child whined after we left the park.'] },
    { id: 'l25c4-15', type: 'fix', grammarPoint: 'l25c4_after', wrong: 'My stepdaughter helped after she has finished her homework.', accepted: ['My stepdaughter helped after she finished her homework.'] },
  ],
};
