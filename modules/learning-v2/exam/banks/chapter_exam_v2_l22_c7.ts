// chapter_exam_v2_l22_c7.ts — банк экзамена v2: урок 22, глава 7 (эпизоды 49–56).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–56 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 7 — «чтобы» в поездке: I take a taxi to reach the station (эпизоды 49, 52) и просьбы эпизодов 50–51, 53–56 утверждением
// (I want to / I can — «?» общий сторож не пускает).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C7: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 7,
  grammarPoints: [
    { id: 'l22c7_purpose', label: { ru: 'чтобы — to reach the station', uk: 'щоб — to reach the station' }, episodeOrdinals: [49, 52] },
    { id: 'l22c7_want_to', label: { ru: 'в поездке — I want to buy a return ticket', uk: 'у поїздці — I want to buy a return ticket' }, episodeOrdinals: [50, 51, 55] },
    { id: 'l22c7_can_do', label: { ru: 'сделаю сам — I can attach this label', uk: 'зроблю сам — I can attach this label' }, episodeOrdinals: [53, 54, 56] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c7-01', type: 'situation', grammarPoint: 'l22c7_purpose', situation: { ru: 'Коллега спрашивает, почему ты выезжаешь в шесть утра. Объясни: чтобы не попасть в пробки.', uk: 'Колега питає, чому ти виїжджаєш о шостій ранку. Поясни: щоб не потрапити в затори.' }, accepted: ['I leave early to avoid the traffic.'] },
    { id: 'l22c7-02', type: 'situation', grammarPoint: 'l22c7_purpose', situation: { ru: 'Ты стоишь на вокзале перед табло. Объясни другу: чтобы узнать платформу.', uk: 'Ти стоїш на вокзалі перед табло. Поясни другові: щоб дізнатися платформу.' }, accepted: ['I look at the board to check the platform.'] },
    { id: 'l22c7-03', type: 'situation', grammarPoint: 'l22c7_purpose', situation: { ru: 'Перед отпуском ты пишешь на листке всё нужное. Объясни: чтобы собрать сумку.', uk: 'Перед відпусткою ти пишеш на аркуші все потрібне. Поясни: щоб зібрати сумку.' }, accepted: ['I make a list to pack my bag.'] },
    { id: 'l22c7-04', type: 'situation', grammarPoint: 'l22c7_want_to', situation: { ru: 'Ты в кассе вокзала и вернёшься тем же вечером. Скажи, что хочешь билет туда и обратно.', uk: 'Ти в касі вокзалу й повернешся того ж вечора. Скажи, що хочеш квиток туди й назад.' }, accepted: ['I want to buy a return ticket.'] },
    { id: 'l22c7-05', type: 'situation', grammarPoint: 'l22c7_want_to', situation: { ru: 'В аэропорту большая очередь на регистрацию. Скажи другу, что хочешь зарегистрироваться онлайн.', uk: 'В аеропорту велика черга на реєстрацію. Скажи другові, що хочеш зареєструватися онлайн.' }, accepted: ['I want to check in online.'] },
    { id: 'l22c7-06', type: 'situation', grammarPoint: 'l22c7_can_do', situation: { ru: 'Чемоданы у всех одинаковые. Скажи жене, что можешь прикрепить эту бирку к вашему.', uk: 'Валізи в усіх однакові. Скажи дружині, що можеш прикріпити цю бирку до вашої.' }, accepted: ['I can attach this label.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c7-07', type: 'dialogue', grammarPoint: 'l22c7_purpose', partnerLine: 'I can drive you to the station.', situation: { ru: 'Друг предлагает отвезти тебя на вокзал, но у него мало времени. Скажи, что берёшь такси, чтобы доехать.', uk: 'Друг пропонує відвезти тебе на вокзал, але в нього мало часу. Скажи, що береш таксі, щоб доїхати.' }, accepted: ['I take a taxi to reach the station.'] },
    { id: 'l22c7-08', type: 'dialogue', grammarPoint: 'l22c7_purpose', partnerLine: 'You need to print your ticket.', situation: { ru: 'Кассир просит распечатанный билет. Скажи, что используешь этот принтер, чтобы его распечатать.', uk: 'Касир просить роздрукований квиток. Скажи, що використовуєш цей принтер, щоб його роздрукувати.' }, accepted: ['I use the printer to print my ticket.', 'I use this printer to print my ticket.'] },
    { id: 'l22c7-09', type: 'dialogue', grammarPoint: 'l22c7_want_to', partnerLine: 'This seat is not reserved.', situation: { ru: 'В поезде нет свободных мест, а ехать долго. Скажи кассиру, что хочешь забронировать место.', uk: 'У потязі немає вільних місць, а їхати довго. Скажи касирові, що хочеш забронювати місце.' }, accepted: ['I want to reserve a seat.'] },
    { id: 'l22c7-10', type: 'dialogue', grammarPoint: 'l22c7_want_to', partnerLine: 'This ticket is non-refundable.', situation: { ru: 'Кассир предупреждает, что деньги за этот билет не вернут. Скажи, что хочешь билет с возвратом.', uk: 'Касир попереджає, що гроші за цей квиток не повернуть. Скажи, що хочеш квиток із поверненням.' }, accepted: ['I want to buy a refundable ticket.'] },
    { id: 'l22c7-11', type: 'dialogue', grammarPoint: 'l22c7_can_do', partnerLine: 'I do not like this strap.', situation: { ru: 'Подруге мешает ремень на новой сумке. Скажи, что можешь его отстегнуть.', uk: 'Подрузі заважає ремінь на новій сумці. Скажи, що можеш його відстебнути.' }, accepted: ['I can detach this strap.', 'I can detach it.'] },
    { id: 'l22c7-12', type: 'dialogue', grammarPoint: 'l22c7_can_do', partnerLine: 'Your bag is open.', situation: { ru: 'На досмотре тебе говорят, что сумка открыта. Скажи, что можешь надёжно её закрыть.', uk: 'На огляді тобі кажуть, що сумка відкрита. Скажи, що можеш надійно її закрити.' }, accepted: ['I can secure the bag.', 'I can secure it.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c7-13', type: 'fix', grammarPoint: 'l22c7_purpose', wrong: 'I use this website for book a flight.', accepted: ['I use this website to book a flight.'] },
    { id: 'l22c7-14', type: 'fix', grammarPoint: 'l22c7_want_to', wrong: 'I want join the queue.', accepted: ['I want to join the queue.'] },
    { id: 'l22c7-15', type: 'fix', grammarPoint: 'l22c7_can_do', wrong: 'I can to wait on the landing.', accepted: ['I can wait on the landing.'] },
    { id: 'l22c7-16', type: 'fix', grammarPoint: 'l22c7_can_do', wrong: 'I can washes this removable cover.', accepted: ['I can wash this removable cover.'] },
  ],
};
