// chapter_exam_v2_l20_c3.ts — банк экзамена v2: урок 20, глава 3 (эпизоды 17–24).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–24 урока 20, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 3 — should (эпизоды 17–24): совет, should + sleep on it / talk it over, should при выборе вещей.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L20_C3: ChapterExamV2Bank = {
  lessonOrdinal: 20,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l20c3_advice', label: { ru: 'совет — you should', uk: 'порада — you should' }, episodeOrdinals: [17, 18, 24] },
    { id: 'l20c3_phrasal', label: { ru: 'should + sleep on it, talk it over, ask around', uk: 'should + sleep on it, talk it over, ask around' }, episodeOrdinals: [19, 20, 23] },
    { id: 'l20c3_things', label: { ru: 'should — что выбрать, как использовать', uk: 'should — що обрати, як використати' }, episodeOrdinals: [21, 22, 23] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l20c3-01', type: 'situation', grammarPoint: 'l20c3_advice', situation: { ru: 'Друг хочет за месяц выучить язык с нуля. Посоветуй поставить реальную цель.', uk: 'Друг хоче за місяць вивчити мову з нуля. Порадь поставити реальну мету.' }, accepted: ['You should set a realistic goal.'] },
    { id: 'l20c3-02', type: 'situation', grammarPoint: 'l20c3_advice', situation: { ru: 'Подруга каждый вечер приходит с работы без сил. Посоветуй ей отдыхать после работы.', uk: 'Подруга щовечора приходить з роботи без сил. Порадь їй відпочивати після роботи.' }, accepted: ['You should unwind after work.', 'You should get some rest.', 'You should rest after work.'] },
    { id: 'l20c3-03', type: 'situation', grammarPoint: 'l20c3_phrasal', situation: { ru: 'Друг не может решить, соглашаться ли на новую работу. Посоветуй ему подумать до завтра.', uk: 'Друг не може вирішити, чи погоджуватися на нову роботу. Порадь йому подумати до завтра.' }, accepted: ['You should sleep on it.', 'You should think it over.'] },
    { id: 'l20c3-04', type: 'situation', grammarPoint: 'l20c3_phrasal', situation: { ru: 'Соседка не знает, где найти хорошего мастера. Посоветуй поспрашивать у людей.', uk: 'Сусідка не знає, де знайти хорошого майстра. Порадь розпитати людей.' }, accepted: ['You should ask around.', 'We should ask around.'] },
    { id: 'l20c3-05', type: 'situation', grammarPoint: 'l20c3_things', situation: { ru: 'Вы выбираете обогреватель на дачу. Скажи мужу, что стоит взять экономичный.', uk: 'Ви обираєте обігрівач на дачу. Скажи чоловікові, що варто взяти економний.' }, accepted: ['We should choose an efficient heater.', 'You should choose an efficient heater.'] },
    { id: 'l20c3-06', type: 'situation', grammarPoint: 'l20c3_things', situation: { ru: 'Брат собирается выбросить пакет из магазина. Посоветуй использовать его ещё раз.', uk: 'Брат збирається викинути пакет із магазину. Порадь використати його ще раз.' }, accepted: ['You should reuse this bag.', 'You should reuse the bag.', 'You should reuse it.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c3-07', type: 'dialogue', grammarPoint: 'l20c3_advice', partnerLine: 'We can change the plan.', situation: { ru: 'Команда запуталась в сложном плане. Предложи его упростить.', uk: 'Команда заплуталася в складному плані. Запропонуй його спростити.' }, accepted: ['We should simplify this plan.', 'We should simplify the plan.', 'We should simplify it.'] },
    { id: 'l20c3-08', type: 'dialogue', grammarPoint: 'l20c3_advice', partnerLine: 'I want to spend some money.', situation: { ru: 'Друг получил премию и хочет потратить всё за день. Посоветуй тратить разумно.', uk: 'Друг отримав премію і хоче витратити все за день. Порадь витрачати розумно.' }, accepted: ['You should spend sensibly.'] },
    { id: 'l20c3-09', type: 'dialogue', grammarPoint: 'l20c3_phrasal', partnerLine: 'I will choose tomorrow.', situation: { ru: 'Жена переживает из-за важного решения. Предложи обсудить его вместе.', uk: 'Дружина хвилюється через важливе рішення. Запропонуй обговорити його разом.' }, accepted: ['We should talk it over.'] },
    { id: 'l20c3-10', type: 'dialogue', grammarPoint: 'l20c3_phrasal', partnerLine: 'I can hold the handle.', situation: { ru: 'Ребёнок держится за ручку двери автобуса, а двери закрываются. Скажи ему отпустить ручку.', uk: 'Дитина тримається за ручку дверей автобуса, а двері зачиняються. Скажи їй відпустити ручку.' }, accepted: ['You should let go of the handle.', 'You must let go of the handle.', 'You should let go of it.'] },
    { id: 'l20c3-11', type: 'dialogue', grammarPoint: 'l20c3_things', partnerLine: 'I will throw out the receipt.', situation: { ru: 'Муж хочет выбросить чек от новой техники. Скажи, что его стоит сохранить.', uk: 'Чоловік хоче викинути чек від нової техніки. Скажи, що його варто зберегти.' }, accepted: ['You should hold onto the receipt.', 'You should hold onto it.'] },
    { id: 'l20c3-12', type: 'dialogue', grammarPoint: 'l20c3_things', partnerLine: 'I want to travel tomorrow.', situation: { ru: 'Друг завтра едет в поход, а фонарик почти сел. Посоветуй зарядить батарею.', uk: 'Друг завтра їде в похід, а ліхтарик майже розрядився. Порадь зарядити батарею.' }, accepted: ['You should recharge the battery.', 'You should recharge it.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c3-13', type: 'fix', grammarPoint: 'l20c3_advice', wrong: 'You should to consult a teacher.', accepted: ['You should consult a teacher.'] },
    { id: 'l20c3-14', type: 'fix', grammarPoint: 'l20c3_advice', wrong: 'She shoulds stay positive.', accepted: ['She should stay positive.'] },
    { id: 'l20c3-15', type: 'fix', grammarPoint: 'l20c3_phrasal', wrong: 'We should talk over it.', accepted: ['We should talk it over.'] },
    { id: 'l20c3-16', type: 'fix', grammarPoint: 'l20c3_things', wrong: 'He should to wear protective gloves.', accepted: ['He should wear protective gloves.'] },
  ],
};
