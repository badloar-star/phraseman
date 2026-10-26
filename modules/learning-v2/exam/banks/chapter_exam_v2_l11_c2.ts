// chapter_exam_v2_l11_c2.ts — банк экзамена v2: урок 11, глава 2 (эпизоды 9–16). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–16 — не было was not / were not, каким было was hot / sweet / helpful, где было in the cupboard / in the bowl; вопросы Was / Were…? — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L11_C2: ChapterExamV2Bank = {
  lessonOrdinal: 11,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l11c2_wasnt', label: { ru: 'не было — was not, were not', uk: 'не було — was not, were not' }, episodeOrdinals: [9, 11, 12] },
    { id: 'l11c2_how', label: { ru: 'каким было — was high, was sweet, was helpful', uk: 'яким було — was high, was sweet, was helpful' }, episodeOrdinals: [10, 11, 12] },
    { id: 'l11c2_where', label: { ru: 'где было — in the cupboard, in the bowl', uk: 'де було — in the cupboard, in the bowl' }, episodeOrdinals: [13, 14, 16] },
    { id: 'l11c2_ask', label: { ru: 'спросить о прошлом — Was / Were…?', uk: 'запитати про минуле — Was / Were…?' }, episodeOrdinals: [11, 12, 14] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l11c2-01', type: 'situation', grammarPoint: 'l11c2_wasnt', situation: { ru: 'Коллега думает, что вчера у тебя был выходной. Скажи, что это был не твой выходной.', uk: 'Колега думає, що вчора в тебе був вихідний. Скажи, що це був не твій вихідний.' }, accepted: ['It was not my day off.', "It wasn't my day off."] },
    { id: 'l11c2-02', type: 'situation', grammarPoint: 'l11c2_how', situation: { ru: 'Врач спрашивает про вчерашний вечер. Скажи, что вчера у тебя была высокая температура.', uk: 'Лікар питає про вчорашній вечір. Скажи, що вчора в тебе була висока температура.' }, accepted: ['My fever was high yesterday.'] },
    { id: 'l11c2-03', type: 'situation', grammarPoint: 'l11c2_where', situation: { ru: 'Мама спрашивает, где стоял уксус. Скажи, что он был в шкафу.', uk: 'Мама питає, де стояв оцет. Скажи, що він був у шафі.' }, accepted: ['The vinegar was in the cupboard.'] },
    { id: 'l11c2-04', type: 'situation', grammarPoint: 'l11c2_ask', situation: { ru: 'Вчера ты заходил к врачу. Спроси, была ли поликлиника открыта.', uk: 'Учора ти заходив до лікаря. Запитай, чи була поліклініка відчинена.' }, accepted: ['Was the health centre open?'] },
    { id: 'l11c2-05', type: 'situation', grammarPoint: 'l11c2_how', situation: { ru: 'Похвали вчерашний блинчик: скажи, что он был сладким.', uk: 'Похвали вчорашній млинець: скажи, що він був солодким.' }, accepted: ['The pancake was sweet.'] },
    { id: 'l11c2-06', type: 'situation', grammarPoint: 'l11c2_where', situation: { ru: 'Гость ищет, куда повесить пальто. Скажи, что вешалки были в шкафу.', uk: 'Гість шукає, куди повісити пальто. Скажи, що вішаки були в шафі.' }, accepted: ['The coat hangers were in the wardrobe.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c2-07', type: 'dialogue', grammarPoint: 'l11c2_wasnt', partnerLine: 'The croissant was fresh.', situation: { ru: 'Скажи, что круассан был не свежим.', uk: 'Скажи, що круасан був не свіжим.' }, accepted: ['The croissant was not fresh.', "The croissant wasn't fresh."] },
    { id: 'l11c2-08', type: 'dialogue', grammarPoint: 'l11c2_how', partnerLine: 'My runny nose was annoying.', situation: { ru: 'Скажи, что боль была несильной.', uk: 'Скажи, що біль був несильним.' }, accepted: ['The pain was not bad.', "The pain wasn't bad."] },
    { id: 'l11c2-09', type: 'dialogue', grammarPoint: 'l11c2_where', partnerLine: 'The ketchup was on the table.', situation: { ru: 'Скажи, что майонеза в холодильнике не было.', uk: 'Скажи, що майонезу в холодильнику не було.' }, accepted: ['The mayonnaise was not in the fridge.', "The mayonnaise wasn't in the fridge."] },
    { id: 'l11c2-10', type: 'dialogue', grammarPoint: 'l11c2_ask', partnerLine: 'The crisps were salty.', situation: { ru: 'Спроси, были ли крекеры в пакете.', uk: 'Запитай, чи були крекери в пакеті.' }, accepted: ['Were the crackers in the bag?'] },
    { id: 'l11c2-11', type: 'dialogue', grammarPoint: 'l11c2_how', partnerLine: 'The receptionist was friendly.', situation: { ru: 'Скажи, что администратор ещё и помогла.', uk: 'Скажи, що адміністраторка ще й допомогла.' }, accepted: ['The receptionist was helpful.'] },
    { id: 'l11c2-12', type: 'dialogue', grammarPoint: 'l11c2_where', partnerLine: 'The peanuts were salty.', situation: { ru: 'Скажи, что миндаль был в миске.', uk: 'Скажи, що мигдаль був у мисці.' }, accepted: ['The almonds were in the bowl.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c2-13', type: 'fix', grammarPoint: 'l11c2_wasnt', wrong: 'It were not my day off.', accepted: ['It was not my day off.', "It wasn't my day off."] },
    { id: 'l11c2-14', type: 'fix', grammarPoint: 'l11c2_how', wrong: 'The pancake were sweet.', accepted: ['The pancake was sweet.'] },
    { id: 'l11c2-15', type: 'fix', grammarPoint: 'l11c2_where', wrong: 'The almonds was in the bowl.', accepted: ['The almonds were in the bowl.'] },
    { id: 'l11c2-16', type: 'fix', grammarPoint: 'l11c2_ask', wrong: 'Were the pancake hot?', accepted: ['Was the pancake hot?'] },
  ],
};
