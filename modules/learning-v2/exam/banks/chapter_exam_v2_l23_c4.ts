// chapter_exam_v2_l23_c4.ts — банк экзамена v2: урок 23, глава 4 (эпизоды 25–32).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–32 урока 23, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 4 — never (эпизод 25), результат: ушиб, уборка, одежда (27, 28, 31), встречи и опыт (26, 29, 30, 32). Вопросы Have you ever …? (эпизод 25) — своя тема.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L23_C4: ChapterExamV2Bank = {
  lessonOrdinal: 23,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l23c4_never', label: { ru: 'никогда — I have never visited', uk: 'ніколи — I have never visited' }, episodeOrdinals: [25] },
    { id: 'l23c4_body_home', label: { ru: 'что сделано — I have hurt, I have cleaned', uk: 'що зроблено — I have hurt, I have cleaned' }, episodeOrdinals: [27, 28, 31] },
    { id: 'l23c4_ever_q', label: { ru: 'спросить про опыт — Have you ever …?', uk: 'спитати про досвід — Have you ever …?' }, episodeOrdinals: [25] },
    { id: 'l23c4_met', label: { ru: 'встречи и опыт — I have met, I have driven', uk: 'зустрічі й досвід — I have met, I have driven' }, episodeOrdinals: [26, 29, 30, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l23c4-01', type: 'situation', grammarPoint: 'l23c4_never', situation: { ru: 'Друзья хвалят мечеть в Стамбуле. Скажи, что ты никогда не был в мечети.', uk: 'Друзі хвалять мечеть у Стамбулі. Скажи, що ти ніколи не був у мечеті.' }, accepted: ['I have never visited a mosque.'] },
    { id: 'l23c4-02', type: 'situation', grammarPoint: 'l23c4_ever_q', situation: { ru: 'Вы планируете поездку в Индию. Спроси подругу, была ли она когда-нибудь в храме.', uk: 'Ви плануєте поїздку до Індії. Спитай подругу, чи була вона колись у храмі.' }, accepted: ['Have you ever visited a temple?'] },
    { id: 'l23c4-03', type: 'situation', grammarPoint: 'l23c4_body_home', situation: { ru: 'Ты упал на лестнице и не можешь согнуть ногу. Скажи врачу, что ушиб колено.', uk: 'Ти впав на сходах і не можеш зігнути ногу. Скажи лікареві, що забив коліно.' }, accepted: ['I have hurt my knee.'] },
    { id: 'l23c4-04', type: 'situation', grammarPoint: 'l23c4_body_home', situation: { ru: 'Гости вот-вот придут. Скажи жене, что ты уже убрал коридор.', uk: 'Гості от-от прийдуть. Скажи дружині, що ти вже прибрав коридор.' }, accepted: ['I have cleaned the corridor.'] },
    { id: 'l23c4-05', type: 'situation', grammarPoint: 'l23c4_met', situation: { ru: 'Вы с другом были на премьере. Расскажи коллегам, что ты познакомился с актёром.', uk: 'Ви з другом були на прем’єрі. Розкажи колегам, що ти познайомився з актором.' }, accepted: ['I have met an actor.'] },
    { id: 'l23c4-06', type: 'situation', grammarPoint: 'l23c4_met', situation: { ru: 'В ванной ты заметил паука. Предупреди жену.', uk: 'У ванній ти помітив павука. Попередь дружину.' }, accepted: ['I have seen a spider.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c4-07', type: 'dialogue', grammarPoint: 'l23c4_never', partnerLine: 'Have you ever visited a palace?', situation: { ru: 'Гид спрашивает, бывал ли ты во дворце. Ответь, что никогда.', uk: 'Гід питає, чи бував ти в палаці. Відповідай, що ніколи.' }, accepted: ['I have never visited a palace.'] },
    { id: 'l23c4-08', type: 'dialogue', grammarPoint: 'l23c4_never', partnerLine: 'We have visited a cathedral.', situation: { ru: 'Скажи, что вы с мужем никогда не были в соборе.', uk: 'Скажи, що ви з чоловіком ніколи не були в соборі.' }, accepted: ['We have never visited a cathedral.'] },
    { id: 'l23c4-09', type: 'dialogue', grammarPoint: 'l23c4_body_home', partnerLine: 'Your trousers are here.', situation: { ru: 'Жена несёт тебе брюки. Скажи, что ты их уже погладил.', uk: 'Дружина несе тобі штани. Скажи, що ти їх уже випрасував.' }, accepted: ['I have ironed my trousers.', 'I have ironed the trousers.'] },
    { id: 'l23c4-10', type: 'dialogue', grammarPoint: 'l23c4_body_home', partnerLine: 'You are tired.', situation: { ru: 'Сын видит, что ты держишься за шею. Объясни, что потянул шею.', uk: 'Син бачить, що ти тримаєшся за шию. Поясни, що потягнув шию.' }, accepted: ['I have hurt my neck.'] },
    { id: 'l23c4-11', type: 'dialogue', grammarPoint: 'l23c4_met', partnerLine: 'The driver is not here.', situation: { ru: 'Водитель фургона с мебелью не пришёл. Скажи, что ты сам уже водил фургон.', uk: 'Водій фургона з меблями не прийшов. Скажи, що ти сам уже водив фургон.' }, accepted: ['I have driven a van.'] },
    { id: 'l23c4-12', type: 'dialogue', grammarPoint: 'l23c4_ever_q', partnerLine: 'I have driven a tractor.', situation: { ru: 'Сосед хвастается, что водил трактор. Спроси, водил ли он когда-нибудь фургон.', uk: 'Сусід хвалиться, що водив трактор. Спитай, чи водив він колись фургон.' }, accepted: ['Have you ever driven a van?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c4-13', type: 'fix', grammarPoint: 'l23c4_never', wrong: 'I have not never visited a mosque.', accepted: ['I have never visited a mosque.'] },
    { id: 'l23c4-14', type: 'fix', grammarPoint: 'l23c4_body_home', wrong: 'She has wash a blouse.', accepted: ['She has washed a blouse.'] },
    { id: 'l23c4-15', type: 'fix', grammarPoint: 'l23c4_met', wrong: 'He has ride a motorbike.', accepted: ['He has ridden a motorbike.'] },
    { id: 'l23c4-16', type: 'fix', grammarPoint: 'l23c4_ever_q', wrong: 'Has he ever visit a cathedral?', accepted: ['Has he ever visited a cathedral?'] },
  ],
};
