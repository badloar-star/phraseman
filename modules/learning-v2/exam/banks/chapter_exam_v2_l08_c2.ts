// chapter_exam_v2_l08_c2.ts — банк экзамена v2: урок 8, глава 2 (эпизоды 9–16). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–16 — can't + действие, can / can't + make / do / clear, место often перед действием;
// вопросы «Can you…?», «Whose…?», «Where…?» — со знаком «?» (запрет «?» только для урока 1). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L08_C2: ChapterExamV2Bank = {
  lessonOrdinal: 8,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l08c2_cant', label: { ru: 'не умею — I can\'t', uk: 'не вмію — I can\'t' }, episodeOrdinals: [9, 10, 13] },
    { id: 'l08c2_chores', label: { ru: 'дела по дому — make / do / clear', uk: 'хатні справи — make / do / clear' }, episodeOrdinals: [11, 15] },
    { id: 'l08c2_often', label: { ru: 'часто — I often + действие', uk: 'часто — I often + дія' }, episodeOrdinals: [13, 14, 16] },
    { id: 'l08c2_where', label: { ru: 'спросить, где — Where is / Where are…?', uk: 'запитати, де — Where is / Where are…?' }, episodeOrdinals: [12, 13, 14, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l08c2-01', type: 'situation', grammarPoint: 'l08c2_cant', situation: { ru: 'Друзья зовут на каток, а ты ни разу не стоял на коньках. Скажи, что не умеешь кататься.', uk: 'Друзі кличуть на ковзанку, а ти жодного разу не стояв на ковзанах. Скажи, що не вмієш кататися.' }, accepted: ["I can't skate."] },
    { id: 'l08c2-02', type: 'situation', grammarPoint: 'l08c2_where', situation: { ru: 'Черновик куда-то пропал со стола. Спроси, где черновик.', uk: 'Чернетка кудись зникла зі столу. Запитай, де чернетка.' }, accepted: ['Where is the draft?'] },
    { id: 'l08c2-03', type: 'situation', grammarPoint: 'l08c2_chores', situation: { ru: 'После ужина мама просит помочь. Скажи, что можешь убрать со стола.', uk: 'Після вечері мама просить допомогти. Скажи, що можеш прибрати зі столу.' }, accepted: ['I can clear the table.'] },
    { id: 'l08c2-04', type: 'situation', grammarPoint: 'l08c2_chores', situation: { ru: 'Соседку просят погладить платье, а она не умеет. Скажи про неё, что она не умеет гладить.', uk: 'Сусідку просять попрасувати сукню, а вона не вміє. Скажи про неї, що вона не вміє прасувати.' }, accepted: ["She can't do the ironing."] },
    { id: 'l08c2-05', type: 'situation', grammarPoint: 'l08c2_often', situation: { ru: 'Новый знакомый спрашивает о твоём хобби — ты много ходишь под парусом. Скажи, что часто ходишь под парусом.', uk: 'Новий знайомий питає про твоє хобі — ти багато ходиш під вітрилом. Скажи, що часто ходиш під вітрилом.' }, accepted: ['I often sail.'] },
    { id: 'l08c2-06', type: 'situation', grammarPoint: 'l08c2_where', situation: { ru: 'Лодка у причала, а буя не видно. Спроси, где буй.', uk: 'Човен біля причалу, а буя не видно. Запитай, де буй.' }, accepted: ['Where is the buoy?'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c2-07', type: 'dialogue', grammarPoint: 'l08c2_cant', partnerLine: 'I can dive.', situation: { ru: 'Вы у бортика бассейна. Скажи, что ты нырять не умеешь.', uk: 'Ви біля бортика басейну. Скажи, що ти пірнати не вмієш.' }, accepted: ["I can't dive."] },
    { id: 'l08c2-08', type: 'dialogue', grammarPoint: 'l08c2_cant', partnerLine: 'I can sculpt.', situation: { ru: 'Вы записываетесь в скульптурную мастерскую. Скажи, что Том лепить не умеет.', uk: 'Ви записуєтеся в скульптурну майстерню. Скажи, що Том ліпити не вміє.' }, accepted: ["Tom can't sculpt."] },
    { id: 'l08c2-09', type: 'dialogue', grammarPoint: 'l08c2_chores', partnerLine: "I can't make the bed.", situation: { ru: 'Младший брат жалуется. Скажи, что ты умеешь заправлять постель.', uk: 'Молодший брат скаржиться. Скажи, що ти вмієш застеляти ліжко.' }, accepted: ['I can make the bed.'] },
    { id: 'l08c2-10', type: 'dialogue', grammarPoint: 'l08c2_chores', partnerLine: "She can't do the washing.", situation: { ru: 'Скажи, что ты можешь постирать.', uk: 'Скажи, що ти можеш попрати.' }, accepted: ['I can do the washing.'] },
    { id: 'l08c2-11', type: 'dialogue', grammarPoint: 'l08c2_often', partnerLine: 'I can solder.', situation: { ru: 'Вы чините лампу. Скажи, что ты часто паяешь.', uk: 'Ви лагодите лампу. Скажи, що ти часто паяєш.' }, accepted: ['I often solder.'] },
    { id: 'l08c2-12', type: 'dialogue', grammarPoint: 'l08c2_where', partnerLine: 'Where are the tongs?', situation: { ru: 'Щипцы лежат прямо перед тобой. Скажи, что они здесь.', uk: 'Щипці лежать просто перед тобою. Скажи, що вони тут.' }, accepted: ['The tongs are here.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l08c2-13', type: 'fix', grammarPoint: 'l08c2_where', wrong: 'Where are the anvil?', accepted: ['Where is the anvil?'] },
    { id: 'l08c2-14', type: 'fix', grammarPoint: 'l08c2_cant', wrong: "She can't skis.", accepted: ["She can't ski."] },
    { id: 'l08c2-15', type: 'fix', grammarPoint: 'l08c2_chores', wrong: 'I can do the bed.', accepted: ['I can make the bed.'] },
    { id: 'l08c2-16', type: 'fix', grammarPoint: 'l08c2_often', wrong: 'I sail often.', accepted: ['I often sail.'] },
  ],
};
