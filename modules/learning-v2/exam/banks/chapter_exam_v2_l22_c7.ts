// chapter_exam_v2_l22_c7.ts — банк экзамена v2: урок 22, глава 7 (эпизоды 49–56).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–56 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 7 — «чтобы» в поездке: I take a taxi to reach the station (эпизоды 49, 52) и просьбы «Could I …?»: билеты и регистрация (50–51, 55), сумка и вещи (53–54, 56).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C7: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l22c7_purpose', label: { ru: 'чтобы — to reach the station', uk: 'щоб — to reach the station' }, episodeOrdinals: [49, 52] },
    { id: 'l22c7_could_ticket', label: { ru: 'билеты — Could I check in online?', uk: 'квитки — Could I check in online?' }, episodeOrdinals: [50, 51, 55] },
    { id: 'l22c7_could_bag', label: { ru: 'вещи — Could I attach this label?', uk: 'речі — Could I attach this label?' }, episodeOrdinals: [53, 54, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c7-01', type: 'situation', grammarPoint: 'l22c7_purpose', situation: { ru: 'Коллега спрашивает, почему ты выезжаешь в шесть утра. Объясни: чтобы не попасть в пробки.', uk: 'Колега питає, чому ти виїжджаєш о шостій ранку. Поясни: щоб не потрапити в затори.' }, accepted: ['I leave early to avoid the traffic.'] },
    { id: 'l22c7-02', type: 'situation', grammarPoint: 'l22c7_purpose', situation: { ru: 'Ты стоишь на вокзале перед табло. Объясни другу: чтобы узнать платформу.', uk: 'Ти стоїш на вокзалі перед табло. Поясни другові: щоб дізнатися платформу.' }, accepted: ['I look at the board to check the platform.'] },
    { id: 'l22c7-03', type: 'situation', grammarPoint: 'l22c7_purpose', situation: { ru: 'Перед отпуском ты пишешь на листке всё нужное. Объясни: чтобы собрать сумку.', uk: 'Перед відпусткою ти пишеш на аркуші все потрібне. Поясни: щоб зібрати сумку.' }, accepted: ['I make a list to pack my bag.'] },
    { id: 'l22c7-04', type: 'situation', grammarPoint: 'l22c7_could_ticket', situation: { ru: 'Ты в кассе вокзала и вернёшься тем же вечером. Спроси, можно ли купить билет туда и обратно.', uk: 'Ти в касі вокзалу й повернешся того ж вечора. Спитай, чи можна купити квиток туди й назад.' }, accepted: ['Could I buy a return ticket?'] },
    { id: 'l22c7-05', type: 'situation', grammarPoint: 'l22c7_could_ticket', situation: { ru: 'В аэропорту большая очередь на регистрацию. Спроси сотрудника, можно ли зарегистрироваться онлайн.', uk: 'В аеропорту велика черга на реєстрацію. Спитай працівника, чи можна зареєструватися онлайн.' }, accepted: ['Could I check in online?', 'Can I check in online?', 'Could we check in online?'] },
    { id: 'l22c7-06', type: 'situation', grammarPoint: 'l22c7_could_bag', situation: { ru: 'Чемоданы у всех одинаковые. Спроси на стойке, можно ли прикрепить к твоему эту бирку.', uk: 'Валізи в усіх однакові. Спитай на стійці, чи можна прикріпити до твоєї цю бирку.' }, accepted: ['Could I attach this label?', 'Can I attach this label?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c7-07', type: 'dialogue', grammarPoint: 'l22c7_purpose', partnerLine: 'I can drive you to the station.', situation: { ru: 'Друг предлагает отвезти тебя на вокзал, но у него мало времени. Скажи, что берёшь такси, чтобы доехать.', uk: 'Друг пропонує відвезти тебе на вокзал, але в нього мало часу. Скажи, що береш таксі, щоб доїхати.' }, accepted: ['I take a taxi to reach the station.'] },
    { id: 'l22c7-08', type: 'dialogue', grammarPoint: 'l22c7_purpose', partnerLine: 'You need to print your ticket.', situation: { ru: 'Кассир просит распечатанный билет. Скажи, что используешь этот принтер, чтобы его распечатать.', uk: 'Касир просить роздрукований квиток. Скажи, що використовуєш цей принтер, щоб його роздрукувати.' }, accepted: ['I use the printer to print my ticket.', 'I use this printer to print my ticket.'] },
    { id: 'l22c7-09', type: 'dialogue', grammarPoint: 'l22c7_could_ticket', partnerLine: 'This seat is not reserved.', situation: { ru: 'В поезде нет свободных мест, а ехать долго. Спроси кассира, можно ли забронировать место.', uk: 'У потязі немає вільних місць, а їхати довго. Спитай касира, чи можна забронювати місце.' }, accepted: ['Could I reserve a seat?'] },
    { id: 'l22c7-10', type: 'dialogue', grammarPoint: 'l22c7_could_ticket', partnerLine: 'This ticket is non-refundable.', situation: { ru: 'Кассир предупреждает, что деньги за этот билет не вернут. Спроси, можно ли купить билет с возвратом.', uk: 'Касир попереджає, що гроші за цей квиток не повернуть. Спитай, чи можна купити квиток із поверненням.' }, accepted: ['Could I buy a refundable ticket?'] },
    { id: 'l22c7-11', type: 'dialogue', grammarPoint: 'l22c7_could_bag', partnerLine: 'I do not like this strap.', situation: { ru: 'Подруге мешает ремень на новой сумке. Спроси, можно ли тебе его отстегнуть.', uk: 'Подрузі заважає ремінь на новій сумці. Спитай, чи можна тобі його відстебнути.' }, accepted: ['Could I detach this strap?', 'Can I detach this strap?', 'Could I detach it?'] },
    { id: 'l22c7-12', type: 'dialogue', grammarPoint: 'l22c7_could_bag', partnerLine: 'Your bag is open.', situation: { ru: 'На досмотре тебе говорят, что сумка открыта. Спроси, можно ли надёжно её закрыть.', uk: 'На огляді тобі кажуть, що сумка відкрита. Спитай, чи можна надійно її закрити.' }, accepted: ['Could I secure the bag?', 'Can I secure the bag?', 'Could I secure it?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c7-13', type: 'fix', grammarPoint: 'l22c7_purpose', wrong: 'I use this website for book a flight.', accepted: ['I use this website to book a flight.'] },
    { id: 'l22c7-14', type: 'fix', grammarPoint: 'l22c7_could_ticket', wrong: 'Could I joins the queue?', accepted: ['Could I join the queue?', 'Can I join the queue?'] },
    { id: 'l22c7-15', type: 'fix', grammarPoint: 'l22c7_could_bag', wrong: 'Could I to wait on the landing?', accepted: ['Could I wait on the landing?', 'Can I wait on the landing?'] },
    { id: 'l22c7-16', type: 'fix', grammarPoint: 'l22c7_could_bag', wrong: 'Could I washes this removable cover?', accepted: ['Could I wash this removable cover?', 'Can I wash this removable cover?'] },
  ],
};
