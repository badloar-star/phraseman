// chapter_exam_v2_l25_c1.ts — банк экзамена v2: урок 25, глава 1 (эпизоды 1–8). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–8 урока 25 — used to: что делали раньше и каким было раньше (used to be). Ситуация и ответ
// сходятся по смыслу. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L25_C1: ChapterExamV2Bank = {
  lessonOrdinal: 25,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l25c1_habit', label: { ru: 'что делали раньше — used to play', uk: 'що робили раніше — used to play' }, episodeOrdinals: [1, 2, 7] },
    { id: 'l25c1_be', label: { ru: 'каким было раньше — used to be', uk: 'яким було раніше — used to be' }, episodeOrdinals: [1, 3, 6] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l25c1-01', type: 'situation', grammarPoint: 'l25c1_habit', situation: { ru: 'Друг удивляется, что ты не любишь спорт. Скажи, что раньше играл в футбол каждый день.', uk: 'Друг дивується, що ти не любиш спорт. Скажи, що раніше грав у футбол щодня.' }, accepted: ['I used to play football every day.'] },
    { id: 'l25c1-02', type: 'situation', grammarPoint: 'l25c1_habit', situation: { ru: 'Вы проходите мимо старого сада. Скажи, что вы раньше собирали тут яблоки.', uk: 'Ви проходите повз старий сад. Скажи, що ви раніше збирали тут яблука.' }, accepted: ['We used to pick apples in this orchard.', 'We used to pick apples here.'] },
    { id: 'l25c1-03', type: 'situation', grammarPoint: 'l25c1_be', situation: { ru: 'Ты показываешь другу шумную улицу. Скажи, что раньше она была тихой.', uk: 'Ти показуєш другові галасливу вулицю. Скажи, що раніше вона була тихою.' }, accepted: ['This street used to be quiet.'] },
    { id: 'l25c1-04', type: 'situation', grammarPoint: 'l25c1_be', situation: { ru: 'Коллега удивляется, как легко ты заводишь разговор. Скажи, что в школе ты был застенчивым.', uk: 'Колега дивується, як легко ти починаєш розмову. Скажи, що в школі ти був сором’язливим.' }, accepted: ['I used to be shy at school.', 'I used to be shy.'] },
    { id: 'l25c1-05', type: 'situation', grammarPoint: 'l25c1_habit', situation: { ru: 'Мама удивляется, что ты теперь всегда завтракаешь. Скажи, что раньше ты пропускал завтрак.', uk: 'Мама дивується, що ти тепер завжди снідаєш. Скажи, що раніше ти пропускав сніданок.' }, accepted: ['I used to skip breakfast.'] },
    { id: 'l25c1-06', type: 'situation', grammarPoint: 'l25c1_be', situation: { ru: 'Вы стоите у нового кафе. Скажи, что раньше здесь был магазин.', uk: 'Ви стоїте біля нового кафе. Скажи, що раніше тут був магазин.' }, accepted: ['There used to be a shop here.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c1-07', type: 'dialogue', grammarPoint: 'l25c1_habit', partnerLine: 'My parents used to walk to work.', situation: { ru: 'Скажи, что ты раньше ездил на работу на автобусе.', uk: 'Скажи, що ти раніше їздив на роботу автобусом.' }, accepted: ['I used to go to work by bus.', 'I used to go there by bus.'] },
    { id: 'l25c1-08', type: 'dialogue', grammarPoint: 'l25c1_habit', partnerLine: 'Everybody used to meet at the same cafe.', situation: { ru: 'Вспомни: вы с ним раньше жили на одной улице.', uk: 'Згадай: ви з ним раніше жили на одній вулиці.' }, accepted: ['We used to live on the same street.'] },
    { id: 'l25c1-09', type: 'dialogue', grammarPoint: 'l25c1_be', partnerLine: 'I used to dream about living alone.', situation: { ru: 'Скажи, что ты раньше предпочитал быть один.', uk: 'Скажи, що ти раніше волів бути сам.' }, accepted: ['I used to prefer being alone.'] },
    { id: 'l25c1-10', type: 'dialogue', grammarPoint: 'l25c1_habit', partnerLine: 'My brother used to teach me archery.', situation: { ru: 'Скажи, что ты раньше занимался лёгкой атлетикой.', uk: 'Скажи, що ти раніше займався легкою атлетикою.' }, accepted: ['I used to do athletics.'] },
    { id: 'l25c1-11', type: 'dialogue', grammarPoint: 'l25c1_be', partnerLine: 'Her personality has changed.', situation: { ru: 'Согласись: раньше она была застенчивой.', uk: 'Погодься: раніше вона була сором’язливою.' }, accepted: ['She used to be shy.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l25c1-12', type: 'fix', grammarPoint: 'l25c1_habit', wrong: 'I used to lived in a bungalow.', accepted: ['I used to live in a bungalow.'] },
    { id: 'l25c1-13', type: 'fix', grammarPoint: 'l25c1_habit', wrong: 'We used to visited the fairground.', accepted: ['We used to visit the fairground.'] },
    { id: 'l25c1-14', type: 'fix', grammarPoint: 'l25c1_be', wrong: 'She used be afraid to try new activities.', accepted: ['She used to be afraid to try new activities.'] },
    { id: 'l25c1-15', type: 'fix', grammarPoint: 'l25c1_be', wrong: 'There used to is a shop here.', accepted: ['There used to be a shop here.'] },
  ],
};
