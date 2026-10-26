// chapter_exam_v2_l20_c2.ts — банк экзамена v2: урок 20, глава 2 (эпизоды 9–16).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–16 урока 20, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 2 — have to / has to (эпизоды 9–16); must из главы 1 засчитывается там, где смысл тот же.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L20_C2: ChapterExamV2Bank = {
  lessonOrdinal: 20,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l20c2_have_to', label: { ru: 'я / мы — I have to, we have to', uk: 'я / ми — I have to, we have to' }, episodeOrdinals: [9, 11, 13, 15] },
    { id: 'l20c2_has_to', label: { ru: 'он / она — has to', uk: 'він / вона — has to' }, episodeOrdinals: [10, 12, 14, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l20c2-01', type: 'situation', grammarPoint: 'l20c2_have_to', situation: { ru: 'Ты снимаешь квартиру. Скажи агенту, что сначала тебе нужно прочитать договор.', uk: 'Ти винаймаєш квартиру. Скажи агентові, що спершу тобі треба прочитати договір.' }, accepted: ['I have to read the lease.', 'I have to read the contract.', 'I must read the lease.', 'I must read the contract.'] },
    { id: 'l20c2-02', type: 'situation', grammarPoint: 'l20c2_has_to', situation: { ru: 'Коллега спрашивает, почему начальника не будет весь месяц. Объясни: ему нужно ехать за границу.', uk: 'Колега питає, чому начальника не буде цілий місяць. Поясни: йому треба їхати за кордон.' }, accepted: ['He has to travel overseas.'] },
    { id: 'l20c2-03', type: 'situation', grammarPoint: 'l20c2_has_to', situation: { ru: 'Сестра купила лампу, а та не работает. Скажи маме, что сестре придётся её вернуть.', uk: 'Сестра купила лампу, а та не працює. Скажи мамі, що сестрі доведеться її повернути.' }, accepted: ['She has to return the lamp.', 'She has to return the faulty lamp.', 'She has to return it.'] },
    { id: 'l20c2-04', type: 'situation', grammarPoint: 'l20c2_have_to', situation: { ru: 'Ты заполняешь анкету на визу. Скажи другу, что тебе нужно указать гражданство.', uk: 'Ти заповнюєш анкету на візу. Скажи другові, що тобі треба вказати громадянство.' }, accepted: ['I have to enter my nationality.', 'I have to write my nationality.'] },
    { id: 'l20c2-05', type: 'situation', grammarPoint: 'l20c2_has_to', situation: { ru: 'Поезд отменили, и подруга едет в объезд. Напиши, что ей придётся ехать другим маршрутом.', uk: 'Потяг скасували, і подруга їде в обʼїзд. Напиши, що їй доведеться їхати іншим маршрутом.' }, accepted: ['She has to follow the diversion.'] },
    { id: 'l20c2-06', type: 'situation', grammarPoint: 'l20c2_have_to', situation: { ru: 'Вы с мужем сдаёте сломанный чайник. Скажи продавцу, что вам нужно показать чек.', uk: 'Ви з чоловіком здаєте зламаний чайник. Скажи продавцеві, що вам треба показати чек.' }, accepted: ['We have to show proof of purchase.', 'I have to show proof of purchase.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c2-07', type: 'dialogue', grammarPoint: 'l20c2_have_to', partnerLine: 'We can visit the property tomorrow.', situation: { ru: 'Агент предлагает посмотреть квартиру завтра, а ты завтра уезжаешь. Скажи, что посмотреть нужно сейчас.', uk: 'Агент пропонує подивитися квартиру завтра, а ти завтра їдеш. Скажи, що подивитися треба зараз.' }, accepted: ['I have to visit the property now.', 'We have to visit the property now.', 'I have to visit it now.', 'We have to visit it now.'] },
    { id: 'l20c2-08', type: 'dialogue', grammarPoint: 'l20c2_has_to', partnerLine: 'She wants to call the owner.', situation: { ru: 'Сосед рассказывает про подругу, у которой течёт кран. Согласись: ей нужно позвонить владельцу.', uk: 'Сусід розповідає про подругу, у якої тече кран. Погодься: їй треба зателефонувати власникові.' }, accepted: ['She has to call the owner.', 'She has to contact the owner.'] },
    { id: 'l20c2-09', type: 'dialogue', grammarPoint: 'l20c2_has_to', partnerLine: 'He wants to apply for this position.', situation: { ru: 'Коллега рассказывает о друге. Скажи, что тогда ему нужно связаться с работодателем.', uk: 'Колега розповідає про друга. Скажи, що тоді йому треба звʼязатися з роботодавцем.' }, accepted: ['He has to contact the employer.', 'He has to call the employer.'] },
    { id: 'l20c2-10', type: 'dialogue', grammarPoint: 'l20c2_have_to', partnerLine: 'You can go now.', situation: { ru: 'Начальник отпускает тебя домой, а работа не закончена. Скажи, что тебе нужно задержаться.', uk: 'Начальник відпускає тебе додому, а робота не закінчена. Скажи, що тобі треба затриматися.' }, accepted: ['I have to work late.', 'I have to work late now.'] },
    { id: 'l20c2-11', type: 'dialogue', grammarPoint: 'l20c2_has_to', partnerLine: 'I can train the new employee.', situation: { ru: 'Коллега хочет обучать новичка вместо Анны. Скажи, что это должна делать она.', uk: 'Колега хоче навчати новенького замість Анни. Скажи, що це має робити вона.' }, accepted: ['She has to train the new employee.'] },
    { id: 'l20c2-12', type: 'dialogue', grammarPoint: 'l20c2_have_to', partnerLine: 'The customer wants a new lamp.', situation: { ru: 'Коллега пересказывает жалобу клиента. Скажи, что вам придётся заменить лампу.', uk: 'Колега переказує скаргу клієнта. Скажи, що вам доведеться замінити лампу.' }, accepted: ['We have to replace the lamp.', 'We have to replace it.', 'I have to replace the lamp.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l20c2-13', type: 'fix', grammarPoint: 'l20c2_has_to', wrong: 'She have to check the connection.', accepted: ['She has to check the connection.'] },
    { id: 'l20c2-14', type: 'fix', grammarPoint: 'l20c2_have_to', wrong: 'I has to read the contract.', accepted: ['I have to read the contract.'] },
    { id: 'l20c2-15', type: 'fix', grammarPoint: 'l20c2_has_to', wrong: 'He has bring this document.', accepted: ['He has to bring this document.'] },
    { id: 'l20c2-16', type: 'fix', grammarPoint: 'l20c2_have_to', wrong: 'We have call the applicant.', accepted: ['We have to call the applicant.'] },
  ],
};
