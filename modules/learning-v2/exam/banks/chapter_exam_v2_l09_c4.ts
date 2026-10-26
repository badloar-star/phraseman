// chapter_exam_v2_l09_c4.ts — банк экзамена v2: урок 9, глава 4 (эпизоды 25–32). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–32 — что происходит сейчас is + -ing (now), что не происходит is not + -ing, просьба Don't …, please; вопросы Is / Are … -ing? — со знаком «?» (запрет «?» только для урока 1).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L09_C4: ChapterExamV2Bank = {
  lessonOrdinal: 9,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l09c4_now', label: { ru: 'происходит сейчас — is + -ing', uk: 'відбувається зараз — is + -ing' }, episodeOrdinals: [25, 26, 29] },
    { id: 'l09c4_not', label: { ru: 'не происходит — is not + -ing', uk: 'не відбувається — is not + -ing' }, episodeOrdinals: [26, 27, 31] },
    { id: 'l09c4_please', label: { ru: "просьба — Don't …, please", uk: "прохання — Don't …, please" }, episodeOrdinals: [27, 28, 30] },
    { id: 'l09c4_ask', label: { ru: 'спросить, что происходит, — Is / Are … -ing?', uk: 'запитати, що відбувається, — Is / Are … -ing?' }, episodeOrdinals: [26, 27, 28, 29, 31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l09c4-01', type: 'situation', grammarPoint: 'l09c4_now', situation: { ru: 'Ночью в траве мигает огонёк. Скажи, что светлячок сейчас светится.', uk: 'Уночі в траві блимає вогник. Скажи, що світлячок зараз світиться.' }, accepted: ['The firefly is glowing now.', 'The firefly is glowing.'] },
    { id: 'l09c4-02', type: 'situation', grammarPoint: 'l09c4_ask', situation: { ru: 'Весна, на озере ещё лёд. Спроси, тает ли лёд.', uk: 'Весна, на озері ще лід. Запитай, чи тане лід.' }, accepted: ['Is the ice melting?'] },
    { id: 'l09c4-03', type: 'situation', grammarPoint: 'l09c4_not', situation: { ru: 'Ветер стих. Скажи, что вертушка не крутится.', uk: 'Вітер стих. Скажи, що вітрячок не крутиться.' }, accepted: ['The pinwheel is not spinning.', "The pinwheel isn't spinning."] },
    { id: 'l09c4-04', type: 'situation', grammarPoint: 'l09c4_please', situation: { ru: 'Дети бросаются снежками у самого окна. Попроси не бросать снежок.', uk: 'Діти кидаються сніжками біля самого вікна. Попроси не кидати сніжок.' }, accepted: ["Don't throw the snowball, please."] },
    { id: 'l09c4-05', type: 'situation', grammarPoint: 'l09c4_now', situation: { ru: 'Санки уехали с горки без тебя. Скажи, что санки скатываются по склону.', uk: 'Санчата поїхали з гірки без тебе. Скажи, що санчата з’їжджають схилом.' }, accepted: ['The sled is sliding down the slope.', 'The sled is sliding.'] },
    { id: 'l09c4-06', type: 'situation', grammarPoint: 'l09c4_please', situation: { ru: 'Здесь сильное течение. Попроси здесь не плавать.', uk: 'Тут сильна течія. Попроси тут не плавати.' }, accepted: ["Don't swim here, please."] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c4-07', type: 'dialogue', grammarPoint: 'l09c4_not', partnerLine: 'The ice is melting.', situation: { ru: 'Скажи, что воск при этом не тает.', uk: 'Скажи, що віск при цьому не тане.' }, accepted: ['The wax is not melting.', "The wax isn't melting."] },
    { id: 'l09c4-08', type: 'dialogue', grammarPoint: 'l09c4_now', partnerLine: 'The current is strong.', situation: { ru: 'Скажи, что плот уносит течением.', uk: 'Скажи, що пліт відносить течією.' }, accepted: ['The raft is drifting.', 'The raft is drifting now.'] },
    { id: 'l09c4-09', type: 'dialogue', grammarPoint: 'l09c4_please', partnerLine: 'We are queuing.', situation: { ru: 'Кто-то толкается в очереди. Вежливо попроси не толкаться.', uk: 'Хтось штовхається в черзі. Ввічливо попроси не штовхатися.' }, accepted: ["Don't push, please."] },
    { id: 'l09c4-10', type: 'dialogue', grammarPoint: 'l09c4_ask', partnerLine: 'The cork is floating.', situation: { ru: 'Спроси, плавает ли камешек.', uk: 'Запитай, чи плаває камінчик.' }, accepted: ['Is the pebble floating?'] },
    { id: 'l09c4-11', type: 'dialogue', grammarPoint: 'l09c4_now', partnerLine: 'Is the turntable spinning?', situation: { ru: 'Пластинка крутится. Ответь, что проигрыватель крутится.', uk: 'Платівка крутиться. Відповідай, що програвач крутиться.' }, accepted: ['The turntable is spinning.', 'The turntable is spinning now.'] },
    { id: 'l09c4-12', type: 'dialogue', grammarPoint: 'l09c4_please', partnerLine: 'The wax is not melting.', situation: { ru: 'Попроси не трогать воск.', uk: 'Попроси не чіпати віск.' }, accepted: ["Don't touch the wax, please."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l09c4-13', type: 'fix', grammarPoint: 'l09c4_now', wrong: 'The ice melting now.', accepted: ['The ice is melting now.', 'The ice is melting.'] },
    { id: 'l09c4-14', type: 'fix', grammarPoint: 'l09c4_not', wrong: 'The reed not is drifting.', accepted: ['The reed is not drifting.', "The reed isn't drifting."] },
    { id: 'l09c4-15', type: 'fix', grammarPoint: 'l09c4_please', wrong: "Don't to swim here, please.", accepted: ["Don't swim here, please."] },
    { id: 'l09c4-16', type: 'fix', grammarPoint: 'l09c4_ask', wrong: 'Is the seahorse swim?', accepted: ['Is the seahorse swimming?'] },
  ],
};
