// chapter_exam_v2_l23_c3.ts — банк экзамена v2: урок 23, глава 3 (эпизоды 17–24).
// зачем (владелец через координатора 26.10: экзамены глав v2 для всех уроков, войдут в полную 2.0.3): правила
// docs/work/factory-exam-banks-task-for-codex-2026-10-25.md — только слова и формы эпизодов 1–24 урока 23, ситуация и ответ
// сходятся по смыслу, верных вариантов несколько, эталон (первый в accepted) — полной формой. Вопросы — там, где они есть в эпизодах урока.
// Глава 3 — результат, который виден сейчас (эпизоды 17, 24), и опыт: еда, игры, погода (18–23).
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L23_C3: ChapterExamV2Bank = {
  lessonOrdinal: 23,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l23c3_result', label: { ru: 'результат сейчас — I have torn, the glass has shattered', uk: 'результат зараз — I have torn, the glass has shattered' }, episodeOrdinals: [17, 24] },
    { id: 'l23c3_food', label: { ru: 'еда — I have tried, I have peeled', uk: 'їжа — I have tried, I have peeled' }, episodeOrdinals: [18, 19, 20, 23] },
    { id: 'l23c3_play_weather', label: { ru: 'игры и погода — I have played, I have heard', uk: 'ігри й погода — I have played, I have heard' }, episodeOrdinals: [21, 22] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l23c3-01', type: 'situation', grammarPoint: 'l23c3_result', situation: { ru: 'Ты зацепился за гвоздь, и на рубашке дыра. Скажи жене, что случилось.', uk: 'Ти зачепився за цвях, і на сорочці дірка. Скажи дружині, що сталося.' }, accepted: ['I have torn my shirt.'] },
    { id: 'l23c3-02', type: 'situation', grammarPoint: 'l23c3_result', situation: { ru: 'Ты хлебнул слишком горячего чая. Объясни, почему тебе больно говорить.', uk: 'Ти сьорбнув занадто гарячого чаю. Поясни, чому тобі боляче говорити.' }, accepted: ['I have burnt my tongue.', 'I have burned my tongue.'] },
    { id: 'l23c3-03', type: 'situation', grammarPoint: 'l23c3_food', situation: { ru: 'Друг описывает вкус дыни, будто ты её не знаешь. Скажи, что ты её уже пробовал.', uk: 'Друг описує смак дині, ніби ти її не знаєш. Скажи, що ти її вже куштував.' }, accepted: ['I have tried melon.', 'I have eaten melon.'] },
    { id: 'l23c3-04', type: 'situation', grammarPoint: 'l23c3_food', situation: { ru: 'Соседи хвалят малину с дачи твоей мамы. Скажи, что она вырастила её сама.', uk: 'Сусіди хвалять малину з дачі твоєї мами. Скажи, що вона виростила її сама.' }, accepted: ['She has grown raspberries.', 'She has grown the raspberries.'] },
    { id: 'l23c3-05', type: 'situation', grammarPoint: 'l23c3_play_weather', situation: { ru: 'Команде не хватает игрока в волейбол. Скажи, что ты уже играл.', uk: 'Команді бракує гравця у волейбол. Скажи, що ти вже грав.' }, accepted: ['I have played volleyball.'] },
    { id: 'l23c3-06', type: 'situation', grammarPoint: 'l23c3_play_weather', situation: { ru: 'За окном сверкнуло, а сын не заметил. Скажи, что ты видел молнию.', uk: 'За вікном блиснуло, а син не помітив. Скажи, що ти бачив блискавку.' }, accepted: ['I have seen lightning.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c3-07', type: 'dialogue', grammarPoint: 'l23c3_result', partnerLine: 'I have a flood in my kitchen.', situation: { ru: 'Сосед снизу говорит, что у него на кухне потоп. Объясни: у тебя засорилась труба.', uk: 'Сусід знизу каже, що в нього на кухні потоп. Поясни: у тебе засмітилася труба.' }, accepted: ['The pipe has clogged.', 'The drain has clogged.', 'My pipe has clogged.'] },
    { id: 'l23c3-08', type: 'dialogue', grammarPoint: 'l23c3_result', partnerLine: 'The glass is on the floor.', situation: { ru: 'Ты уронил стакан. Скажи, что он разбился.', uk: 'Ти впустив склянку. Скажи, що вона розбилася.' }, accepted: ['The glass has shattered.', 'It has shattered.'] },
    { id: 'l23c3-09', type: 'dialogue', grammarPoint: 'l23c3_food', partnerLine: 'We need another knife.', situation: { ru: 'Подруга ищет нож, чтобы почистить манго. Скажи, что ты его уже почистил.', uk: 'Подруга шукає ніж, щоб почистити манго. Скажи, що ти його вже почистив.' }, accepted: ['I have peeled the mango.', 'I have peeled it.'] },
    { id: 'l23c3-10', type: 'dialogue', grammarPoint: 'l23c3_food', partnerLine: 'The other berries are in the fridge.', situation: { ru: 'Сестра перечисляет ягоды к чаю. Скажи, что клубнику вы собрали сами.', uk: 'Сестра перелічує ягоди до чаю. Скажи, що полуницю ви зібрали самі.' }, accepted: ['We have picked strawberries.', 'We have picked the strawberries.'] },
    { id: 'l23c3-11', type: 'dialogue', grammarPoint: 'l23c3_play_weather', partnerLine: "You mustn't push the other players.", situation: { ru: 'Тренер объясняет правила баскетбола. Успокой его: ты уже играл в баскетбол.', uk: 'Тренер пояснює правила баскетболу. Заспокой його: ти вже грав у баскетбол.' }, accepted: ['I have played basketball.'] },
    { id: 'l23c3-12', type: 'dialogue', grammarPoint: 'l23c3_play_weather', partnerLine: 'The weather is perfect.', situation: { ru: 'Друг собирается в горы. Предупреди: ты слышал гром.', uk: 'Друг збирається в гори. Попередь: ти чув грім.' }, accepted: ['I have heard thunder.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l23c3-13', type: 'fix', grammarPoint: 'l23c3_result', wrong: 'The colour have faded.', accepted: ['The colour has faded.', 'The color has faded.'] },
    { id: 'l23c3-14', type: 'fix', grammarPoint: 'l23c3_food', wrong: 'She has cook beef.', accepted: ['She has cooked beef.'] },
    { id: 'l23c3-15', type: 'fix', grammarPoint: 'l23c3_play_weather', wrong: 'We have play badminton.', accepted: ['We have played badminton.'] },
    { id: 'l23c3-16', type: 'fix', grammarPoint: 'l23c3_food', wrong: 'He have tried a kiwi.', accepted: ['He has tried a kiwi.'] },
  ],
};
