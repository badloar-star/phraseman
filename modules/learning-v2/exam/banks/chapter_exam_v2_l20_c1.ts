// chapter_exam_v2_l20_c1.ts — банк экзамена v2: урок 20, глава 1 (эпизоды 1–8).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–8 урока 20, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 1 — только must (эпизоды 1–8): «not», «is», вопросы ещё не проходили, поэтому отрицаний и описаний нет.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L20_C1: ChapterExamV2Bank = {
  lessonOrdinal: 20,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l20c1_you_must', label: { ru: 'ты должен — you must', uk: 'ти маєш — you must' }, episodeOrdinals: [1, 4, 6] },
    { id: 'l20c1_we_must', label: { ru: 'мы / я должны — we must, I must', uk: 'ми / я маємо — we must, I must' }, episodeOrdinals: [2, 3, 5] },
    { id: 'l20c1_must_phrasal', label: { ru: 'must + make sure, get rid of, look into', uk: 'must + make sure, get rid of, look into' }, episodeOrdinals: [7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l20c1-01', type: 'situation', grammarPoint: 'l20c1_you_must', situation: { ru: 'Вы с другом уходите из спортзала. Напомни ему забрать свои вещи.', uk: 'Ви з другом виходите зі спортзалу. Нагадай йому забрати свої речі.' }, accepted: ['You must take your belongings.'] },
    { id: 'l20c1-02', type: 'situation', grammarPoint: 'l20c1_you_must', situation: { ru: 'Друг оставляет сумку с деньгами в раздевалке. Скажи, что ценные вещи нужно запереть.', uk: 'Друг залишає сумку з грошима в роздягальні. Скажи, що цінні речі треба замкнути.' }, accepted: ['You must lock up your valuables.'] },
    { id: 'l20c1-03', type: 'situation', grammarPoint: 'l20c1_we_must', situation: { ru: 'Вы с соседом собираетесь в поход в жару. Скажи, что вам нужно взять достаточно воды.', uk: 'Ви з сусідом збираєтеся в похід у спеку. Скажи, що вам треба взяти достатньо води.' }, accepted: ['We must bring sufficient water.', 'We must bring enough water.', 'We must take sufficient water.', 'We must take enough water.'] },
    { id: 'l20c1-04', type: 'situation', grammarPoint: 'l20c1_we_must', situation: { ru: 'На общей кухне снова грязно. Скажи соседям, что помогать должны все в доме.', uk: 'На спільній кухні знову брудно. Скажи сусідам, що допомагати мають усі в домі.' }, accepted: ['Everyone in our household must help.', 'Everyone must help.'] },
    { id: 'l20c1-05', type: 'situation', grammarPoint: 'l20c1_must_phrasal', situation: { ru: 'После ремонта в квартире гора мусора. Скажи, что от него нужно избавиться.', uk: 'Після ремонту в квартирі гора сміття. Скажи, що його треба позбутися.' }, accepted: ['We must get rid of this rubbish.', 'We must get rid of the rubbish.'] },
    { id: 'l20c1-06', type: 'situation', grammarPoint: 'l20c1_must_phrasal', situation: { ru: 'Начинается гроза, а до вершины далеко. Скажи спутникам, что пора повернуть назад.', uk: 'Починається гроза, а до вершини далеко. Скажи супутникам, що час повернути назад.' }, accepted: ['We must turn back now.', 'We must turn back.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c1-07', type: 'dialogue', grammarPoint: 'l20c1_you_must', partnerLine: 'I can hold the handle.', situation: { ru: 'Друг несёт тяжёлую кастрюлю с супом. Скажи, что держать ручку нужно крепко.', uk: 'Друг несе важку каструлю з супом. Скажи, що тримати ручку треба міцно.' }, accepted: ['You must hold the handle firmly.', 'You must hold it firmly.'] },
    { id: 'l20c1-08', type: 'dialogue', grammarPoint: 'l20c1_you_must', partnerLine: 'I will show identification tomorrow.', situation: { ru: 'Посетитель на входе в офис обещает показать документ завтра. Скажи, что показать его нужно сейчас.', uk: 'Відвідувач на вході в офіс обіцяє показати документ завтра. Скажи, що показати його треба зараз.' }, accepted: ['You must show identification now.', 'You must show your identification now.', 'You must show it now.'] },
    { id: 'l20c1-09', type: 'dialogue', grammarPoint: 'l20c1_we_must', partnerLine: 'I can clean this tomorrow.', situation: { ru: 'Сосед хочет отложить уборку кухни. Возрази: почистить нужно сейчас.', uk: 'Сусід хоче відкласти прибирання кухні. Заперечи: почистити треба зараз.' }, accepted: ['We must clean this now.', 'We must clean it now.', 'You must clean this now.', 'You must clean it now.'] },
    { id: 'l20c1-10', type: 'dialogue', grammarPoint: 'l20c1_we_must', partnerLine: 'We can explain it tomorrow.', situation: { ru: 'Коллега хочет отложить разговор с клиентом. Возрази: объяснить нужно сейчас.', uk: 'Колега хоче відкласти розмову з клієнтом. Заперечи: пояснити треба зараз.' }, accepted: ['We must explain it now.'] },
    { id: 'l20c1-11', type: 'dialogue', grammarPoint: 'l20c1_must_phrasal', partnerLine: 'We could put aside some money.', situation: { ru: 'Сестра сомневается, копить ли на отпуск. Скажи, что откладывать нужно обязательно.', uk: 'Сестра вагається, чи відкладати на відпустку. Скажи, що відкладати треба обовʼязково.' }, accepted: ['We must put aside some money.', 'We must put some money aside.'] },
    { id: 'l20c1-12', type: 'dialogue', grammarPoint: 'l20c1_must_phrasal', partnerLine: 'I can help you.', situation: { ru: 'Коллега предлагает помощь со списком гостей. Скажи, что вам нужно вместе его просмотреть.', uk: 'Колега пропонує допомогу зі списком гостей. Скажи, що вам треба разом його переглянути.' }, accepted: ['We must go through the list.', 'We must go through it.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c1-13', type: 'fix', grammarPoint: 'l20c1_you_must', wrong: 'You must to take your belongings.', accepted: ['You must take your belongings.'] },
    { id: 'l20c1-14', type: 'fix', grammarPoint: 'l20c1_we_must', wrong: 'She musts show identification.', accepted: ['She must show identification.'] },
    { id: 'l20c1-15', type: 'fix', grammarPoint: 'l20c1_must_phrasal', wrong: 'We must look this problem into.', accepted: ['We must look into this problem.', 'We must look into the problem.'] },
    { id: 'l20c1-16', type: 'fix', grammarPoint: 'l20c1_we_must', wrong: 'I must to confirm my attendance.', accepted: ['I must confirm my attendance.'] },
  ],
};
