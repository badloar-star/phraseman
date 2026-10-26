// chapter_exam_v2_l11_c3.ts — банк экзамена v2: урок 11, глава 3 (эпизоды 17–24). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–24 — было there was / there were, кто где был My mum was …, обиходные фразы Take a seat / Well done / Never mind / Enjoy your meal; вопросы Was / Were…? — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L11_C3: ChapterExamV2Bank = {
  lessonOrdinal: 11,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l11c3_there', label: { ru: 'было — there was, there were', uk: 'було — there was, there were' }, episodeOrdinals: [17, 18, 19] },
    { id: 'l11c3_family', label: { ru: 'кто где был — My mum was …', uk: 'хто де був — My mum was …' }, episodeOrdinals: [22] },
    { id: 'l11c3_phrases', label: { ru: 'обиходные фразы — Take a seat, Well done, Never mind', uk: 'побутові фрази — Take a seat, Well done, Never mind' }, episodeOrdinals: [23, 24] },
    { id: 'l11c3_ask', label: { ru: 'спросить о прошлом — Was / Were…?', uk: 'запитати про минуле — Was / Were…?' }, episodeOrdinals: [21, 22, 23] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l11c3-01', type: 'situation', grammarPoint: 'l11c3_there', situation: { ru: 'Ты убирал комнату. Скажи, что на стуле лежала простыня.', uk: 'Ти прибирав кімнату. Скажи, що на стільці лежало простирадло.' }, accepted: ['There was a bed sheet on the chair.'] },
    { id: 'l11c3-02', type: 'situation', grammarPoint: 'l11c3_family', situation: { ru: 'Соседка спрашивает, где была твоя мама. Скажи, что мама была в саду.', uk: 'Сусідка питає, де була твоя мама. Скажи, що мама була в саду.' }, accepted: ['My mum was in the garden.'] },
    { id: 'l11c3-03', type: 'situation', grammarPoint: 'l11c3_phrases', situation: { ru: 'В кабинет вошёл гость. Предложи ему сесть.', uk: 'До кабінету зайшов гість. Запропонуй йому сісти.' }, accepted: ['Please take a seat.', 'Take a seat, please.'] },
    { id: 'l11c3-04', type: 'situation', grammarPoint: 'l11c3_ask', situation: { ru: 'Ты вернулся домой поздно. Спроси, была ли мама дома.', uk: 'Ти повернувся додому пізно. Запитай, чи була мама вдома.' }, accepted: ['Was your mum at home?'] },
    { id: 'l11c3-05', type: 'situation', grammarPoint: 'l11c3_family', situation: { ru: 'Ты заезжал вчера к родным. Скажи, что бабушка и дедушка были дома.', uk: 'Ти заїжджав учора до рідних. Скажи, що бабуся й дідусь були вдома.' }, accepted: ['My grandma and grandpa were at home.'] },
    { id: 'l11c3-06', type: 'situation', grammarPoint: 'l11c3_phrases', situation: { ru: 'Друг прекрасно приготовил обед. Похвали его.', uk: 'Друг чудово приготував обід. Похвали його.' }, accepted: ['Well done.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c3-07', type: 'dialogue', grammarPoint: 'l11c3_there', partnerLine: 'The lunch box was empty.', situation: { ru: 'Скажи, что на столе было две бутылки воды.', uk: 'Скажи, що на столі було дві пляшки води.' }, accepted: ['There were two water bottles on the table.'] },
    { id: 'l11c3-08', type: 'dialogue', grammarPoint: 'l11c3_family', partnerLine: 'My mum was in the garden.', situation: { ru: 'Скажи, что папы на кухне не было.', uk: 'Скажи, що тата на кухні не було.' }, accepted: ['My dad was not in the kitchen.', "My dad wasn't in the kitchen."] },
    { id: 'l11c3-09', type: 'dialogue', grammarPoint: 'l11c3_phrases', partnerLine: 'The cake was not ready.', situation: { ru: 'Друг расстроился из-за торта. Скажи: ничего страшного.', uk: 'Друг засмутився через торт. Скажи: нічого страшного.' }, accepted: ['Never mind.'] },
    { id: 'l11c3-10', type: 'dialogue', grammarPoint: 'l11c3_ask', partnerLine: 'The kitten was hungry.', situation: { ru: 'Спроси, был ли зоомагазин открыт.', uk: 'Запитай, чи був зоомагазин відчинений.' }, accepted: ['Was the pet shop open?'] },
    { id: 'l11c3-11', type: 'dialogue', grammarPoint: 'l11c3_family', partnerLine: 'My grandma was in the kitchen.', situation: { ru: 'Скажи, что дедушка был в саду.', uk: 'Скажи, що дідусь був у саду.' }, accepted: ['My grandpa was in the garden.'] },
    { id: 'l11c3-12', type: 'dialogue', grammarPoint: 'l11c3_phrases', partnerLine: 'The meal is ready.', situation: { ru: 'Пожелай приятного аппетита.', uk: 'Побажай смачного.' }, accepted: ['Enjoy your meal.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c3-13', type: 'fix', grammarPoint: 'l11c3_there', wrong: 'There were a kitten on the chair.', accepted: ['There was a kitten on the chair.'] },
    { id: 'l11c3-14', type: 'fix', grammarPoint: 'l11c3_family', wrong: 'My mum were in the garden.', accepted: ['My mum was in the garden.'] },
    { id: 'l11c3-15', type: 'fix', grammarPoint: 'l11c3_phrases', wrong: 'Please take seat.', accepted: ['Please take a seat.'] },
    { id: 'l11c3-16', type: 'fix', grammarPoint: 'l11c3_ask', wrong: 'Was you ready?', accepted: ['Were you ready?'] },
  ],
};
