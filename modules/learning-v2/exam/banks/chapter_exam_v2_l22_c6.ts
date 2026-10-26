// chapter_exam_v2_l22_c6.ts — банк экзамена v2: урок 22, глава 6 (эпизоды 41–48).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–48 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросов нет: «?» запрещён общим сторожем.
// Глава 6 — «чтобы»: I use this socket to charge my phone (эпизоды 43–44, 47–48) и просьбы эпизодов 41–42, 45–46 утверждением
// (I want to / I can — «?» общий сторож не пускает).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C6: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l22c6_purpose_home', label: { ru: 'чтобы — to charge my phone', uk: 'щоб — to charge my phone' }, episodeOrdinals: [43, 44] },
    { id: 'l22c6_purpose_kitchen', label: { ru: 'чтобы — to boil the water', uk: 'щоб — to boil the water' }, episodeOrdinals: [47, 48] },
    { id: 'l22c6_can_help', label: { ru: 'предложить помощь — I can feed the cat', uk: 'запропонувати допомогу — I can feed the cat' }, episodeOrdinals: [45, 46] },
    { id: 'l22c6_want_to', label: { ru: 'по телефону — I want to leave my number', uk: 'телефоном — I want to leave my number' }, episodeOrdinals: [41, 42] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c6-01', type: 'situation', grammarPoint: 'l22c6_purpose_home', situation: { ru: 'Друг ищет, где зарядить телефон. Скажи, что ты используешь эту розетку, чтобы заряжать свой.', uk: 'Друг шукає, де зарядити телефон. Скажи, що ти використовуєш цю розетку, щоб заряджати свій.' }, accepted: ['I use this socket to charge my phone.'] },
    { id: 'l22c6-02', type: 'situation', grammarPoint: 'l22c6_purpose_kitchen', situation: { ru: 'Гость удивляется, зачем ты включаешь духовку. Объясни: чтобы испечь торт.', uk: 'Гість дивується, навіщо ти вмикаєш духовку. Поясни: щоб спекти торт.' }, accepted: ['I turn on the oven to bake a cake.'] },
    { id: 'l22c6-03', type: 'situation', grammarPoint: 'l22c6_purpose_kitchen', situation: { ru: 'Ты наполняешь ведро водой. Объясни соседке: чтобы помыть пол.', uk: 'Ти наповнюєш відро водою. Поясни сусідці: щоб помити підлогу.' }, accepted: ['I fill the bucket to mop the floor.'] },
    { id: 'l22c6-04', type: 'situation', grammarPoint: 'l22c6_can_help', situation: { ru: 'Соседи уезжают на выходные, а у них кот. Предложи: ты можешь его покормить.', uk: 'Сусіди їдуть на вихідні, а в них кіт. Запропонуй: ти можеш його погодувати.' }, accepted: ['I can feed the cat.', 'I can feed it.'] },
    { id: 'l22c6-05', type: 'situation', grammarPoint: 'l22c6_want_to', situation: { ru: 'Ты звонишь в спортклуб, но тренера нет на месте. Скажи, что хочешь оставить свой номер.', uk: 'Ти телефонуєш у спортклуб, але тренера немає на місці. Скажи, що хочеш залишити свій номер.' }, accepted: ['I want to leave my number.'] },
    { id: 'l22c6-06', type: 'situation', grammarPoint: 'l22c6_can_help', situation: { ru: 'Подруга идёт спать, а в гостиной горит свет. Скажи, что ты можешь его выключить.', uk: 'Подруга йде спати, а у вітальні світиться світло. Скажи, що ти можеш його вимкнути.' }, accepted: ['I can turn off the lights.', 'I can turn them off.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c6-07', type: 'dialogue', grammarPoint: 'l22c6_purpose_home', partnerLine: 'I want to rest.', situation: { ru: 'Соседка хочет отдохнуть, а у тебя громко играет музыка. Скажи, что нажимаешь эту кнопку, чтобы убавить звук.', uk: 'Сусідка хоче відпочити, а в тебе гучно грає музика. Скажи, що натискаєш цю кнопку, щоб зменшити звук.' }, accepted: ['I use this button to turn down the volume.'] },
    { id: 'l22c6-08', type: 'dialogue', grammarPoint: 'l22c6_purpose_home', partnerLine: 'You can fold the clothes on the bed.', situation: { ru: 'Друг предлагает сложить одежду на кровати, а она завалена. Скажи, что освобождаешь кровать, чтобы её сложить.', uk: 'Друг пропонує скласти одяг на ліжку, а воно завалене. Скажи, що звільняєш ліжко, щоб його скласти.' }, accepted: ['I clear the bed to fold the clothes.'] },
    { id: 'l22c6-09', type: 'dialogue', grammarPoint: 'l22c6_purpose_kitchen', partnerLine: 'I want to chop the vegetables.', situation: { ru: 'Сестра хочет нарезать овощи. Скажи, что ты берёшь этот нож, чтобы их нарезать.', uk: 'Сестра хоче нарізати овочі. Скажи, що ти береш цей ніж, щоб їх нарізати.' }, accepted: ['I use this knife to chop the vegetables.'] },
    { id: 'l22c6-10', type: 'dialogue', grammarPoint: 'l22c6_can_help', partnerLine: 'The plants need water.', situation: { ru: 'Хозяйка квартиры уезжает в отпуск. Предложи полить цветы.', uk: 'Господиня квартири їде у відпустку. Запропонуй полити квіти.' }, accepted: ['I can water the plants.', 'I can water them.'] },
    { id: 'l22c6-11', type: 'dialogue', grammarPoint: 'l22c6_want_to', partnerLine: 'I need your name.', situation: { ru: 'Администратор записывает тебя на приём, а имя у тебя редкое. Скажи, что хочешь продиктовать его по буквам.', uk: 'Адміністратор записує тебе на прийом, а імʼя в тебе рідкісне. Скажи, що хочеш продиктувати його по літерах.' }, accepted: ['I want to spell my name.'] },
    { id: 'l22c6-12', type: 'dialogue', grammarPoint: 'l22c6_want_to', partnerLine: 'She is not at work.', situation: { ru: 'Ты звонишь подруге на работу, а её нет. Скажи, что хочешь передать сообщение.', uk: 'Ти телефонуєш подрузі на роботу, а її немає. Скажи, що хочеш передати повідомлення.' }, accepted: ['I want to pass on a message.', 'I want to leave my number.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c6-13', type: 'fix', grammarPoint: 'l22c6_purpose_home', wrong: 'I use a cloth for wipe the table.', accepted: ['I use a cloth to wipe the table.'] },
    { id: 'l22c6-14', type: 'fix', grammarPoint: 'l22c6_purpose_kitchen', wrong: 'I fill the kettle for to boil the water.', accepted: ['I fill the kettle to boil the water.'] },
    { id: 'l22c6-15', type: 'fix', grammarPoint: 'l22c6_can_help', wrong: 'I can to walk the dog.', accepted: ['I can walk the dog.'] },
    { id: 'l22c6-16', type: 'fix', grammarPoint: 'l22c6_want_to', wrong: 'I want check the address.', accepted: ['I want to check the address.'] },
  ],
};
