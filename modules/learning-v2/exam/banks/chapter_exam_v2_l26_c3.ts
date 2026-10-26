// chapter_exam_v2_l26_c3.ts — банк экзамена v2: урок 26, глава 3 (эпизоды 17–24). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–24 урока 26 — будущее с when / after / before / if: после этих слов настоящее
// («when the cab arrives», не «will arrive»). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L26_C3: ChapterExamV2Bank = {
  lessonOrdinal: 26,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l26c3_when', label: { ru: 'когда — I will text you when it arrives', uk: 'коли — I will text you when it arrives' }, episodeOrdinals: [17, 19, 20] },
    { id: 'l26c3_before_after', label: { ru: 'до / после — before we start, after we eat', uk: 'до / після — before we start, after we eat' }, episodeOrdinals: [20, 21, 22] },
    { id: 'l26c3_if', label: { ru: 'если — I will leave if it gets rowdy', uk: 'якщо — I will leave if it gets rowdy' }, episodeOrdinals: [18, 19, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l26c3-01', type: 'situation', grammarPoint: 'l26c3_when', situation: { ru: 'Друг ждёт новостей. Пообещай написать, когда приедет такси.', uk: 'Друг чекає новин. Пообіцяй написати, коли приїде таксі.' }, accepted: ['I will text you when the cab arrives.', 'I will text you when the taxi arrives.'] },
    { id: 'l26c3-02', type: 'situation', grammarPoint: 'l26c3_before_after', situation: { ru: 'Ты уходишь в отпуск. Скажи коллеге, что позвонишь, когда отпуск закончится.', uk: 'Ти йдеш у відпустку. Скажи колезі, що подзвониш, коли відпустка закінчиться.' }, accepted: ['I will call you after my vacation ends.', 'I will call you after my vacation.'] },
    { id: 'l26c3-03', type: 'situation', grammarPoint: 'l26c3_when', situation: { ru: 'Мама просит дать знать, что ты добрался. Скажи, что позвонишь, когда доберёшься домой.', uk: 'Мама просить дати знати, що ти дістався. Скажи, що подзвониш, коли доберешся додому.' }, accepted: ['I will call when I get home.', 'I will call you when I get home.'] },
    { id: 'l26c3-04', type: 'situation', grammarPoint: 'l26c3_before_after', situation: { ru: 'Друг скоро придёт, а на полу вещи. Пообещай освободить пол до его прихода.', uk: 'Друг скоро прийде, а на підлозі речі. Пообіцяй звільнити підлогу до його приходу.' }, accepted: ['I will clear the floor before you get here.'] },
    { id: 'l26c3-05', type: 'situation', grammarPoint: 'l26c3_if', situation: { ru: 'Вечеринка становится шумной. Скажи, что уйдёшь, если начнётся буйство.', uk: 'Вечірка стає гучною. Скажи, що підеш, якщо почнеться бешкет.' }, accepted: ['I will leave if it gets rowdy.'] },
    { id: 'l26c3-06', type: 'situation', grammarPoint: 'l26c3_when', situation: { ru: 'Будильник стоит на утро. Скажи, что встанешь, когда он зазвонит.', uk: 'Будильник стоїть на ранок. Скажи, що встанеш, коли він задзвонить.' }, accepted: ['I will get up when the alarm rings.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c3-07', type: 'dialogue', grammarPoint: 'l26c3_when', partnerLine: 'Let us go to a restaurant.', situation: { ru: 'Скажи, что забронируешь столик, когда друг выберет место.', uk: 'Скажи, що забронюєш столик, коли друг обере місце.' }, accepted: ['I will book a table when you choose a place.'] },
    { id: 'l26c3-08', type: 'dialogue', grammarPoint: 'l26c3_when', partnerLine: 'The biscuits are hot.', situation: { ru: 'Скажи, что добавишь крем, когда печенье остынет.', uk: 'Скажи, що додаси крем, коли печиво охолоне.' }, accepted: ['I will add the cream when the biscuits cool.'] },
    { id: 'l26c3-09', type: 'dialogue', grammarPoint: 'l26c3_when', partnerLine: 'Here is the bill.', situation: { ru: 'Скажи, что заплатишь, когда вы подойдёте к кассе.', uk: 'Скажи, що заплатиш, коли ви підійдете до каси.' }, accepted: ['I will pay when we get to the till.'] },
    { id: 'l26c3-10', type: 'dialogue', grammarPoint: 'l26c3_before_after', partnerLine: 'Read the tale now, please.', situation: { ru: 'Скажи, что дочитаешь сказку после того, как вы поедите.', uk: 'Скажи, що дочитаєш казку після того, як ви поїсте.' }, accepted: ['I will finish the tale after we eat.'] },
    { id: 'l26c3-11', type: 'dialogue', grammarPoint: 'l26c3_before_after', partnerLine: 'Your coat is scruffy.', situation: { ru: 'Скажи, что сменишь пальто перед выходом.', uk: 'Скажи, що зміниш пальто перед виходом.' }, accepted: ['I will change my coat before we leave.'] },
    { id: 'l26c3-12', type: 'dialogue', grammarPoint: 'l26c3_if', partnerLine: 'Take your time.', situation: { ru: 'Скажи, что подождёшь, если другу нужно больше времени.', uk: 'Скажи, що почекаєш, якщо другові потрібно більше часу.' }, accepted: ['I will wait if you need more time.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l26c3-13', type: 'fix', grammarPoint: 'l26c3_when', wrong: 'I will text you when the cab will arrive.', accepted: ['I will text you when the cab arrives.'] },
    { id: 'l26c3-14', type: 'fix', grammarPoint: 'l26c3_before_after', wrong: 'I will call you after my vacation will end.', accepted: ['I will call you after my vacation ends.'] },
    { id: 'l26c3-15', type: 'fix', grammarPoint: 'l26c3_if', wrong: 'I will leave if it will get rowdy.', accepted: ['I will leave if it gets rowdy.'] },
    { id: 'l26c3-16', type: 'fix', grammarPoint: 'l26c3_before_after', wrong: 'I will move this heap before we will start.', accepted: ['I will move this heap before we start.'] },
  ],
};
