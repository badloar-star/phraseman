// chapter_exam_v2_l16_c6.ts — банк экзамена v2: урок 16, глава 6 (эпизоды 41–48). НЕ подключён: список BANKS (app/learning_v2_chapter_exam_v2.ts) пополняет Learning V2 после вычитки владельцем.
// зачем: глава 6 — три формы будущего на словах про еду, вещи и привычки: «I think … will be …», «I am going to …», «We are …ing tomorrow». Только слова и формы эпизодов 1–48 урока 16; ситуация и ответ сходятся по смыслу, верных вариантов несколько, вопросительных знаков нет.
// Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L16_C6: ChapterExamV2Bank = {
  lessonOrdinal: 16,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l16c6_will', label: { ru: 'предположение: I think … will be …', uk: 'припущення: I think … will be …' }, episodeOrdinals: [41, 42, 43, 44] },
    { id: 'l16c6_going_to', label: { ru: 'план: I am going to …', uk: 'план: I am going to …' }, episodeOrdinals: [41, 42, 43, 47] },
    { id: 'l16c6_arranged', label: { ru: 'договорённость: We are …ing …', uk: 'домовленість: We are …ing …' }, episodeOrdinals: [43, 44, 45, 47] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ────────────────────────────────────────
    { id: 'l16c6-01', type: 'situation', grammarPoint: 'l16c6_will', situation: { ru: 'Ты смотришь на бананы на кухне. Скажи, что, по-твоему, завтра они будут перезрелыми.', uk: 'Ти дивишся на банани на кухні. Скажи, що, на твою думку, завтра вони будуть перестиглими.' }, accepted: ['I think the bananas will be overripe tomorrow.'] },
    { id: 'l16c6-02', type: 'situation', grammarPoint: 'l16c6_will', situation: { ru: 'Суп на плите выглядит жидким. Скажи, что, по-твоему, он будет водянистым.', uk: 'Суп на плиті виглядає рідким. Скажи, що, на твою думку, він буде водянистим.' }, accepted: ['I think the soup will be watery.'] },
    { id: 'l16c6-03', type: 'situation', grammarPoint: 'l16c6_going_to', situation: { ru: 'У тебя дома есть всё для пирога. Скажи, что собираешься испечь пирог с пикантной начинкой.', uk: 'У тебе вдома є все для пирога. Скажи, що збираєшся спекти пиріг із пікантною начинкою.' }, accepted: ['I am going to make a savoury pie.'] },
    { id: 'l16c6-04', type: 'situation', grammarPoint: 'l16c6_going_to', situation: { ru: 'В магазине лежит курица без костей. Скажи, что собираешься купить курицу без костей.', uk: 'У магазині лежить курка без кісток. Скажи, що збираєшся купити курку без кісток.' }, accepted: ['I am going to buy boneless chicken.'] },
    { id: 'l16c6-05', type: 'situation', grammarPoint: 'l16c6_arranged', situation: { ru: 'Сегодня вечером вы вдвоём готовите курицу без кожи — всё решено. Скажи об этом.', uk: 'Сьогодні ввечері ви вдвох готуєте курку без шкіри — усе вирішено. Скажи про це.' }, accepted: ['We are cooking skinless chicken together tonight.'] },
    { id: 'l16c6-06', type: 'situation', grammarPoint: 'l16c6_arranged', situation: { ru: 'Вы решили есть меньше сладкого со следующего понедельника. Скажи об этом.', uk: 'Ви вирішили їсти менше солодкого з наступного понеділка. Скажи про це.' }, accepted: ['We are cutting down on sweets from Monday.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────
    { id: 'l16c6-07', type: 'dialogue', grammarPoint: 'l16c6_will', partnerLine: 'I think the cheese will be smoky.', situation: { ru: 'Друг думает, что сыр будет с дымком. Скажи, что соус, по-твоему, будет пикантным.', uk: 'Друг думає, що сир буде з димком. Скажи, що соус, на твою думку, буде пікантним.' }, accepted: ['I think the sauce will be tangy.'] },
    { id: 'l16c6-08', type: 'dialogue', grammarPoint: 'l16c6_will', partnerLine: 'I think the lamp will be rechargeable.', situation: { ru: 'Друг думает, что лампа будет перезаряжаемой. Скажи, что бутылка с мылом, по-твоему, будет многоразовой.', uk: 'Друг думає, що лампа буде акумуляторною. Скажи, що пляшка з милом, на твою думку, буде багаторазовою.' }, accepted: ['I think the soap bottle will be refillable.'] },
    { id: 'l16c6-09', type: 'dialogue', grammarPoint: 'l16c6_going_to', partnerLine: 'I think the apples will be bruised.', situation: { ru: 'Друг думает, что яблоки будут помятыми. Скажи, что собираешься пустить помятые яблоки на пирог.', uk: 'Друг думає, що яблука будуть пом’ятими. Скажи, що збираєшся пустити пом’яті яблука на пиріг.' }, accepted: ['I am going to use the bruised apples for a pie.'] },
    { id: 'l16c6-10', type: 'dialogue', grammarPoint: 'l16c6_going_to', partnerLine: 'I think people will queue up outside.', situation: { ru: 'Друг думает, что люди выстроятся в очередь у входа. Скажи, что собираешься запастись рисом.', uk: 'Друг думає, що люди вишикуються в чергу біля входу. Скажи, що збираєшся запастися рисом.' }, accepted: ['I am going to stock up on rice.'] },
    { id: 'l16c6-11', type: 'dialogue', grammarPoint: 'l16c6_arranged', partnerLine: 'I think the child will hold still for the photo.', situation: { ru: 'Друг говорит про ребёнка и фото. Скажи, что завтра вы ставите замки, которые дети не откроют.', uk: 'Друг говорить про дитину й фото. Скажи, що завтра ви ставите замки, які діти не відкриють.' }, accepted: ['We are fitting childproof locks tomorrow.'] },
    { id: 'l16c6-12', type: 'dialogue', grammarPoint: 'l16c6_arranged', partnerLine: 'I think Tom will show up on time.', situation: { ru: 'Друг думает, что Том придёт вовремя. Скажи, что завтра вы выходите из дома в восемь — всё решено.', uk: 'Друг думає, що Том прийде вчасно. Скажи, що завтра ви виходите з дому о восьмій — усе вирішено.' }, accepted: ['We are heading out at eight tomorrow.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────
    { id: 'l16c6-13', type: 'fix', grammarPoint: 'l16c6_will', wrong: 'I think the soup be watery.', accepted: ['I think the soup will be watery.'] },
    { id: 'l16c6-14', type: 'fix', grammarPoint: 'l16c6_going_to', wrong: 'I am going buy boneless chicken.', accepted: ['I am going to buy boneless chicken.'] },
    { id: 'l16c6-15', type: 'fix', grammarPoint: 'l16c6_arranged', wrong: 'We cooking skinless chicken together tonight.', accepted: ['We are cooking skinless chicken together tonight.'] },
    { id: 'l16c6-16', type: 'fix', grammarPoint: 'l16c6_arranged', wrong: 'We are staying this put weekend.', accepted: ['We are staying put this weekend.'] },
  ],
};
