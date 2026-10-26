// chapter_exam_v2_l24_c6.ts — банк экзамена v2: урок 24, глава 6 (эпизоды 41–48). Подключён в registry_l24_l26.ts.
// зачем: только слова и формы эпизодов 1–48 урока 24 — have / has против прошлого с названным временем и слова-оценки эпизодов 43–44
// (usually, lately, hardly, absolutely). Сторож слов — tests/owner_locks_exam_episode_words_2026_10_25.test.ts.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L24_C6: ChapterExamV2Bank = {
  lessonOrdinal: 24,
  chapterOrdinal: 6,
  grammarPoints: [
    { id: 'l24c6_result', label: { ru: 'результат сейчас — I have found', uk: 'результат зараз — I have found' }, episodeOrdinals: [41, 42, 45] },
    { id: 'l24c6_when', label: { ru: 'названо время — joined last year', uk: 'названо час — joined last year' }, episodeOrdinals: [41, 45, 46] },
    { id: 'l24c6_adverbs', label: { ru: 'обычно, в последнее время, едва — usually, lately, hardly', uk: 'зазвичай, останнім часом, ледве — usually, lately, hardly' }, episodeOrdinals: [43, 44] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l24c6-01', type: 'situation', grammarPoint: 'l24c6_result', situation: { ru: 'Ты весь вечер искал кошелёк и вот он у тебя в руке. Обрадуй друга.', uk: 'Ти весь вечір шукав гаманець, і ось він у тебе в руці. Порадуй друга.' }, accepted: ['Fortunately, I have found my wallet.', 'I have found my wallet.', "I've found my wallet.", "Fortunately, I've found my wallet."] },
    { id: 'l24c6-02', type: 'situation', grammarPoint: 'l24c6_adverbs', situation: { ru: 'Коллега видит, что ты зеваешь. Скажи, что ночью почти не спал.', uk: 'Колега бачить, що ти позіхаєш. Скажи, що вночі майже не спав.' }, accepted: ['I hardly slept last night.'] },
    { id: 'l24c6-03', type: 'situation', grammarPoint: 'l24c6_adverbs', situation: { ru: 'Коллега предлагает подвезти тебя до офиса. Скажи, что ты обычно ходишь на работу пешком.', uk: 'Колега пропонує підвезти тебе до офісу. Скажи, що ти зазвичай ходиш на роботу пішки.' }, accepted: ['I usually walk to work.'] },
    { id: 'l24c6-04', type: 'situation', grammarPoint: 'l24c6_when', situation: { ru: 'Расскажи о соседе: в прошлом году он пошёл служить в армию.', uk: 'Розкажи про сусіда: торік він пішов служити в армію.' }, accepted: ['He joined the army last year.'] },
    { id: 'l24c6-05', type: 'situation', grammarPoint: 'l24c6_result', situation: { ru: 'Гости спрашивают, где твоя машина. Скажи, что ты уже поставил её у дома.', uk: 'Гості питають, де твоя машина. Скажи, що ти вже поставив її біля будинку.' }, accepted: ['I have parked the car outside.', 'I have parked the vehicle outside.', "I've parked the car outside.", "I've parked the vehicle outside.", 'I have already parked the car outside.', "I've already parked the car outside."] },
    { id: 'l24c6-06', type: 'situation', grammarPoint: 'l24c6_when', situation: { ru: 'Друг замечает, что машина снова светит ровно. Скажи, что вчера заменил фару.', uk: 'Друг помічає, що машина знову світить рівно. Скажи, що вчора замінив фару.' }, accepted: ['I replaced the headlight yesterday.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c6-07', type: 'dialogue', grammarPoint: 'l24c6_adverbs', partnerLine: 'She has been feeling tired lately.', situation: { ru: 'Скажи, что ты тоже в последнее время чувствуешь усталость.', uk: 'Скажи, що ти теж останнім часом відчуваєш утому.' }, accepted: ['I have been feeling tired lately.', "I've been feeling tired lately."] },
    { id: 'l24c6-08', type: 'dialogue', grammarPoint: 'l24c6_when', partnerLine: 'She broke a rib last year.', situation: { ru: 'Скажи, что ты тоже сломал ребро в прошлом году.', uk: 'Скажи, що ти теж зламав ребро торік.' }, accepted: ['I broke a rib last year.'] },
    { id: 'l24c6-09', type: 'dialogue', grammarPoint: 'l24c6_result', partnerLine: 'They stored the grain yesterday.', situation: { ru: 'Скажи, что вы уже купили кукурузу.', uk: 'Скажи, що ви вже купили кукурудзу.' }, accepted: ['We have bought some corn.', "We've bought some corn."] },
    { id: 'l24c6-10', type: 'dialogue', grammarPoint: 'l24c6_adverbs', partnerLine: 'He sobbed after the film yesterday.', situation: { ru: 'Скажи, что тебе этот фильм очень понравился.', uk: 'Скажи, що тобі цей фільм дуже сподобався.' }, accepted: ['I absolutely loved the film.', 'I absolutely loved the film yesterday.'] },
    { id: 'l24c6-11', type: 'dialogue', grammarPoint: 'l24c6_result', partnerLine: 'She has cuddled the baby.', situation: { ru: 'Скажи, что ты обнял щенка.', uk: 'Скажи, що ти обійняв цуценя.' }, accepted: ['I have cuddled the puppy.', "I've cuddled the puppy."] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l24c6-12', type: 'fix', grammarPoint: 'l24c6_adverbs', wrong: 'I have hardly slept last night.', accepted: ['I hardly slept last night.'] },
    { id: 'l24c6-13', type: 'fix', grammarPoint: 'l24c6_result', wrong: 'She have expressed a desire to travel.', accepted: ['She has expressed a desire to travel.'] },
    { id: 'l24c6-14', type: 'fix', grammarPoint: 'l24c6_when', wrong: 'They yell for help yesterday.', accepted: ['They yelled for help yesterday.'] },
    { id: 'l24c6-15', type: 'fix', grammarPoint: 'l24c6_adverbs', wrong: 'I walk usually to work.', accepted: ['I usually walk to work.'] },
    { id: 'l24c6-16', type: 'fix', grammarPoint: 'l24c6_when', wrong: 'He has replaced the headlight yesterday.', accepted: ['He replaced the headlight yesterday.'] },
  ],
};
