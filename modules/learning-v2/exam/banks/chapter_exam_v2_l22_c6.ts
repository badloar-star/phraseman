// chapter_exam_v2_l22_c6.ts — банк экзамена v2: урок 22, глава 6 (эпизоды 41–48).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–48 урока 22, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 6 — «чтобы»: I use this socket to charge my phone (эпизоды 43–44, 47–48) и просьбы «Could I …?» по телефону (41–42) и дома (45–46).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L22_C6: ChapterExamV2Bank = {
  lessonOrdinal: 22,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l22c6_purpose_home', label: { ru: 'чтобы — to charge my phone', uk: 'щоб — to charge my phone' }, episodeOrdinals: [43, 44] },
    { id: 'l22c6_purpose_kitchen', label: { ru: 'чтобы — to boil the water', uk: 'щоб — to boil the water' }, episodeOrdinals: [47, 48] },
    { id: 'l22c6_could_home', label: { ru: 'предложить помощь — Could I feed the cat?', uk: 'запропонувати допомогу — Could I feed the cat?' }, episodeOrdinals: [45, 46] },
    { id: 'l22c6_could_phone', label: { ru: 'по телефону — Could I leave my number?', uk: 'телефоном — Could I leave my number?' }, episodeOrdinals: [41, 42] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l22c6-01', type: 'situation', grammarPoint: 'l22c6_purpose_home', situation: { ru: 'Друг ищет, где зарядить телефон. Скажи, что ты используешь эту розетку, чтобы заряжать свой.', uk: 'Друг шукає, де зарядити телефон. Скажи, що ти використовуєш цю розетку, щоб заряджати свій.' }, accepted: ['I use this socket to charge my phone.'] },
    { id: 'l22c6-02', type: 'situation', grammarPoint: 'l22c6_purpose_kitchen', situation: { ru: 'Гость удивляется, зачем ты включаешь духовку. Объясни: чтобы испечь торт.', uk: 'Гість дивується, навіщо ти вмикаєш духовку. Поясни: щоб спекти торт.' }, accepted: ['I turn on the oven to bake a cake.'] },
    { id: 'l22c6-03', type: 'situation', grammarPoint: 'l22c6_purpose_kitchen', situation: { ru: 'Ты наполняешь ведро водой. Объясни соседке: чтобы помыть пол.', uk: 'Ти наповнюєш відро водою. Поясни сусідці: щоб помити підлогу.' }, accepted: ['I fill the bucket to mop the floor.'] },
    { id: 'l22c6-04', type: 'situation', grammarPoint: 'l22c6_could_home', situation: { ru: 'Соседи уезжают на выходные, а у них кот. Предложи помощь: спроси, можно ли тебе его покормить.', uk: 'Сусіди їдуть на вихідні, а в них кіт. Запропонуй допомогу: спитай, чи можна тобі його погодувати.' }, accepted: ['Could I feed the cat?', 'Can I feed the cat?', 'Could we feed the cat?'] },
    { id: 'l22c6-05', type: 'situation', grammarPoint: 'l22c6_could_phone', situation: { ru: 'Ты звонишь в спортклуб, но тренера нет на месте. Спроси, можно ли оставить свой номер.', uk: 'Ти телефонуєш у спортклуб, але тренера немає на місці. Спитай, чи можна залишити свій номер.' }, accepted: ['Could I leave my number?', 'Can I leave my number?'] },
    { id: 'l22c6-06', type: 'situation', grammarPoint: 'l22c6_could_home', situation: { ru: 'Подруга идёт спать, а в гостиной горит свет. Спроси, можно ли тебе его выключить.', uk: 'Подруга йде спати, а у вітальні світиться світло. Спитай, чи можна тобі його вимкнути.' }, accepted: ['Could I turn off the lights?', 'Can I turn off the lights?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c6-07', type: 'dialogue', grammarPoint: 'l22c6_purpose_home', partnerLine: 'I want to rest.', situation: { ru: 'Соседка хочет отдохнуть, а у тебя громко играет музыка. Скажи, что нажимаешь эту кнопку, чтобы убавить звук.', uk: 'Сусідка хоче відпочити, а в тебе гучно грає музика. Скажи, що натискаєш цю кнопку, щоб зменшити звук.' }, accepted: ['I use this button to turn down the volume.'] },
    { id: 'l22c6-08', type: 'dialogue', grammarPoint: 'l22c6_purpose_home', partnerLine: 'You can fold the clothes on the bed.', situation: { ru: 'Друг предлагает сложить одежду на кровати, а она завалена. Скажи, что освобождаешь кровать, чтобы её сложить.', uk: 'Друг пропонує скласти одяг на ліжку, а воно завалене. Скажи, що звільняєш ліжко, щоб його скласти.' }, accepted: ['I clear the bed to fold the clothes.'] },
    { id: 'l22c6-09', type: 'dialogue', grammarPoint: 'l22c6_purpose_kitchen', partnerLine: 'I want to chop the vegetables.', situation: { ru: 'Сестра хочет нарезать овощи. Скажи, что ты берёшь этот нож, чтобы их нарезать.', uk: 'Сестра хоче нарізати овочі. Скажи, що ти береш цей ніж, щоб їх нарізати.' }, accepted: ['I use this knife to chop the vegetables.'] },
    { id: 'l22c6-10', type: 'dialogue', grammarPoint: 'l22c6_could_home', partnerLine: 'The plants need water.', situation: { ru: 'Хозяйка квартиры уезжает в отпуск. Предложи помощь: спроси, можно ли тебе полить цветы.', uk: 'Господиня квартири їде у відпустку. Запропонуй допомогу: спитай, чи можна тобі полити квіти.' }, accepted: ['Could I water the plants?', 'Can I water the plants?'] },
    { id: 'l22c6-11', type: 'dialogue', grammarPoint: 'l22c6_could_phone', partnerLine: 'I need your name.', situation: { ru: 'Администратор записывает тебя на приём, а имя у тебя редкое. Спроси, можно ли продиктовать его по буквам.', uk: 'Адміністратор записує тебе на прийом, а імʼя в тебе рідкісне. Спитай, чи можна продиктувати його по літерах.' }, accepted: ['Could I spell my name?', 'Can I spell my name?'] },
    { id: 'l22c6-12', type: 'dialogue', grammarPoint: 'l22c6_could_phone', partnerLine: 'I want to call Anna.', situation: { ru: 'Звонят Анне, а её нет на месте. Спроси, можно ли принять сообщение.', uk: 'Телефонують Анні, а її немає на місці. Спитай, чи можна прийняти повідомлення.' }, accepted: ['Could I take a message?'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l22c6-13', type: 'fix', grammarPoint: 'l22c6_purpose_home', wrong: 'I use a cloth for wipe the table.', accepted: ['I use a cloth to wipe the table.'] },
    { id: 'l22c6-14', type: 'fix', grammarPoint: 'l22c6_purpose_kitchen', wrong: 'I fill the kettle for to boil the water.', accepted: ['I fill the kettle to boil the water.'] },
    { id: 'l22c6-15', type: 'fix', grammarPoint: 'l22c6_could_home', wrong: 'Could I to walk the dog?', accepted: ['Could I walk the dog?', 'Can I walk the dog?'] },
    { id: 'l22c6-16', type: 'fix', grammarPoint: 'l22c6_could_phone', wrong: 'Could I checks the address?', accepted: ['Could I check the address?', 'Can I check the address?'] },
  ],
};
