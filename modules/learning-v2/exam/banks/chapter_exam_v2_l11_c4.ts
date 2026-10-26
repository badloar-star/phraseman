// chapter_exam_v2_l11_c4.ts — банк экзамена v2: урок 11, глава 4 (эпизоды 25–32). НЕ подключён: строку в BANKS добавляет Learning V2
// после вычитки владельцем (docs/work/factory-exam-banks-task-for-codex-2026-10-25.md).
// зачем: только слова и формы эпизодов 1–32 — вчера и сейчас was … yesterday / is … now, внешность His hair was blond / curly / wavy, где было near the bridge / next to the door; вопросов в банках нет (правило сторожа).
// Ситуация и ответ сходятся по смыслу, верных вариантов несколько. Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L11_C4: ChapterExamV2Bank = {
  lessonOrdinal: 11,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l11c4_then', label: { ru: 'вчера и сейчас — was … yesterday, is … now', uk: 'учора й зараз — was … yesterday, is … now' }, episodeOrdinals: [25, 26, 30] },
    { id: 'l11c4_hair', label: { ru: 'внешность — blond, curly, wavy, bald', uk: 'зовнішність — blond, curly, wavy, bald' }, episodeOrdinals: [27] },
    { id: 'l11c4_places', label: { ru: 'где было — near the bridge, next to the door', uk: 'де було — near the bridge, next to the door' }, episodeOrdinals: [29, 31, 32] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l11c4-01', type: 'situation', grammarPoint: 'l11c4_then', situation: { ru: 'После вчерашнего купания пляжное полотенце не высохло. Скажи, что вчера оно было мокрым.', uk: 'Після вчорашнього купання пляжний рушник не висох. Скажи, що вчора він був мокрим.' }, accepted: ['Yesterday my beach towel was wet.', 'My beach towel was wet yesterday.'] },
    { id: 'l11c4-02', type: 'situation', grammarPoint: 'l11c4_hair', situation: { ru: 'Вы смотрите старое фото. Скажи, что дедушка был лысым.', uk: 'Ви дивитеся старе фото. Скажи, що дідусь був лисим.' }, accepted: ['My grandpa was bald.'] },
    { id: 'l11c4-03', type: 'situation', grammarPoint: 'l11c4_places', situation: { ru: 'Ты ехал мимо и видел пожарную машину. Скажи, что она стояла у моста.', uk: 'Ти їхав повз і бачив пожежну машину. Скажи, що вона стояла біля мосту.' }, accepted: ['There was a fire engine near the bridge.'] },
    { id: 'l11c4-04', type: 'situation', grammarPoint: 'l11c4_then', situation: { ru: 'Ты пришёл за билетом, а касса не работает. Скажи, что касса сейчас закрыта.', uk: 'Ти прийшов по квиток, а каса не працює. Скажи, що каса зараз зачинена.' }, accepted: ['The ticket office is closed now.'] },
    { id: 'l11c4-05', type: 'situation', grammarPoint: 'l11c4_hair', situation: { ru: 'На прошлогоднем фото у подруги кудри. Скажи, что в прошлом году её волосы были кудрявыми.', uk: 'На торішньому фото в подруги кучері. Скажи, що минулого року її волосся було кучерявим.' }, accepted: ['Her hair was curly last year.'] },
    { id: 'l11c4-06', type: 'situation', grammarPoint: 'l11c4_places', situation: { ru: 'Ты искал корзину для покупок. Скажи, что одна стояла у двери.', uk: 'Ти шукав кошик для покупок. Скажи, що один стояв біля дверей.' }, accepted: ['There was a shopping basket next to the door.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c4-07', type: 'dialogue', grammarPoint: 'l11c4_then', partnerLine: 'My beach towel was wet.', situation: { ru: 'Скажи, что сейчас оно сухое.', uk: 'Скажи, що зараз він сухий.' }, accepted: ['My beach towel is dry now.'] },
    { id: 'l11c4-08', type: 'dialogue', grammarPoint: 'l11c4_hair', partnerLine: 'His hair is wavy now.', situation: { ru: 'Вы вспоминаете прохожего. Скажи, что тот мужчина был блондином.', uk: 'Ви згадуєте перехожого. Скажи, що той чоловік був блондином.' }, accepted: ['The man was blond.'] },
    { id: 'l11c4-09', type: 'dialogue', grammarPoint: 'l11c4_places', partnerLine: 'The town hall was closed yesterday.', situation: { ru: 'Скажи, что пожарная часть была возле моста.', uk: 'Скажи, що пожежна частина була біля мосту.' }, accepted: ['The fire station was near the bridge.'] },
    { id: 'l11c4-10', type: 'dialogue', grammarPoint: 'l11c4_then', partnerLine: 'Yesterday the pram was next to the door.', situation: { ru: 'Скажи, что сейчас коляска в саду.', uk: 'Скажи, що зараз візочок у саду.' }, accepted: ['The pram is in the garden now.'] },
    { id: 'l11c4-11', type: 'dialogue', grammarPoint: 'l11c4_hair', partnerLine: 'Her hair was curly.', situation: { ru: 'Поправь друга: волосы у неё были волнистыми.', uk: 'Виправ друга: волосся в неї було хвилястим.' }, accepted: ['Her hair was wavy.'] },
    { id: 'l11c4-12', type: 'dialogue', grammarPoint: 'l11c4_places', partnerLine: 'My key card is on the table now.', situation: { ru: 'Скажи, что стойка регистрации была у двери.', uk: 'Скажи, що стійка реєстрації була біля дверей.' }, accepted: ['The reception desk was near the door.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l11c4-13', type: 'fix', grammarPoint: 'l11c4_then', wrong: 'My beach towel are dry now.', accepted: ['My beach towel is dry now.'] },
    { id: 'l11c4-14', type: 'fix', grammarPoint: 'l11c4_hair', wrong: 'My grandpa were bald.', accepted: ['My grandpa was bald.'] },
    { id: 'l11c4-15', type: 'fix', grammarPoint: 'l11c4_places', wrong: 'There were a fire engine near the bridge.', accepted: ['There was a fire engine near the bridge.'] },
    { id: 'l11c4-16', type: 'fix', grammarPoint: 'l11c4_then', wrong: 'Yesterday my beach towel is wet.', accepted: ['Yesterday my beach towel was wet.'] },
  ],
};
