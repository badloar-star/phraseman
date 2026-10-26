// chapter_exam_v2_l14_c2.ts — банк экзамена v2: урок 14, глава 2 (эпизоды 9–16). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l14.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–16 урока 14
// (длительное прошедшее с отрицанием: wasn’t / weren’t + -ing, и ответ «чем был занят»; вопросы в экзамене не задаём — знак «?» сторож пока не пускает); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L14_C2: ChapterExamV2Bank = {
  lessonOrdinal: 14,
  chapterOrdinal: 2,
  grammarPoints: [
    { id: 'l14c2_wasnt', label: { ru: 'я, он не делал — wasn’t + …ing', uk: 'я, він не робив — wasn’t + …ing' }, episodeOrdinals: [9, 10, 11] },
    { id: 'l14c2_werent', label: { ru: 'мы, они не делали — weren’t + …ing', uk: 'ми, вони не робили — weren’t + …ing' }, episodeOrdinals: [9, 11, 13] },
    { id: 'l14c2_busy', label: { ru: 'чем был занят — was + …ing', uk: 'чим був зайнятий — was + …ing' }, episodeOrdinals: [12, 15, 16] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l14c2-01', type: 'situation', grammarPoint: 'l14c2_wasnt', situation: { ru: 'Друг думает, что вчера в четыре ты прыгал на надувном замке. Скажи, что нет.', uk: 'Друг думає, що вчора о четвертій ти стрибав на надувному замку. Скажи, що ні.' }, accepted: ['I wasn’t playing on the bouncy castle.', 'I was not playing on the bouncy castle.'] },
    { id: 'l14c2-02', type: 'situation', grammarPoint: 'l14c2_werent', situation: { ru: 'Учитель думает, что дети лазили по горке-лазалке. Скажи, что они не лазили.', uk: 'Учитель думає, що діти лазили по драбинці-лазанці. Скажи, що вони не лазили.' }, accepted: ['They weren’t climbing on the climbing frame.', 'They were not climbing on the climbing frame.'] },
    { id: 'l14c2-03', type: 'situation', grammarPoint: 'l14c2_busy', situation: { ru: 'Друг спрашивает, чем ты был занят вчера в семь. Скажи: менял гитарную струну.', uk: 'Друг питає, чим ти був зайнятий учора о сьомій. Скажи: міняв гітарну струну.' }, accepted: ['I was changing a guitar string.', 'I was changing the guitar string.'] },
    { id: 'l14c2-04', type: 'situation', grammarPoint: 'l14c2_wasnt', situation: { ru: 'Тебя спрашивают, был ли ты за рулём в метель. Скажи, что нет.', uk: 'Тебе питають, чи був ти за кермом у хуртовину. Скажи, що ні.' }, accepted: ['I wasn’t driving in the snowstorm.', 'I was not driving in the snowstorm.'] },
    { id: 'l14c2-05', type: 'situation', grammarPoint: 'l14c2_werent', situation: { ru: 'Брат думает, что вы с другом смотрели фильм про акулу. Скажи, что не смотрели.', uk: 'Брат думає, що ви з другом дивилися фільм про акулу. Скажи, що не дивилися.' }, accepted: ['We weren’t watching a shark.'] },
    { id: 'l14c2-06', type: 'situation', grammarPoint: 'l14c2_busy', situation: { ru: 'Тебя спрашивают, что ты делал в гараже. Скажи, что искал замок для велосипеда.', uk: 'Тебе питають, що ти робив у гаражі. Скажи, що шукав замок для велосипеда.' }, accepted: ['I was looking for the bike lock.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c2-07', type: 'dialogue', grammarPoint: 'l14c2_wasnt', partnerLine: 'You were using the cash register.', situation: { ru: 'Это не так. Скажи, что ты не пользовался кассой.', uk: 'Це не так. Скажи, що ти не користувався касою.' }, accepted: ['I wasn’t using the cash register.', 'I was not using the cash register.'] },
    { id: 'l14c2-08', type: 'dialogue', grammarPoint: 'l14c2_busy', partnerLine: 'I wasn’t watching TV at eight.', situation: { ru: 'Скажи, что ты в восемь смотрел фильм.', uk: 'Скажи, що ти о восьмій дивився фільм.' }, accepted: ['I was watching the film.', 'I was watching the film at eight.'] },
    { id: 'l14c2-09', type: 'dialogue', grammarPoint: 'l14c2_werent', partnerLine: 'They were using the music stand.', situation: { ru: 'Это не так. Скажи, что они ею не пользовались.', uk: 'Це не так. Скажи, що вони нею не користувалися.' }, accepted: ['They weren’t using the music stand.', 'They were not using the music stand.'] },
    { id: 'l14c2-10', type: 'dialogue', grammarPoint: 'l14c2_busy', partnerLine: 'I wasn’t doing my homework.', situation: { ru: 'Скажи, что ты читал школьный отчёт.', uk: 'Скажи, що ти читав шкільний звіт.' }, accepted: ['I was reading the school report.'] },
    { id: 'l14c2-11', type: 'dialogue', grammarPoint: 'l14c2_wasnt', partnerLine: 'I was riding at three.', situation: { ru: 'Скажи, что ты в три не катался.', uk: 'Скажи, що ти о третій не катався.' }, accepted: ['I wasn’t riding at three.', 'I was not riding at three.'] },
    { id: 'l14c2-12', type: 'dialogue', grammarPoint: 'l14c2_werent', partnerLine: 'They were watching the magpie.', situation: { ru: 'Это не так. Скажи, что они не смотрели на сороку.', uk: 'Це не так. Скажи, що вони не дивилися на сороку.' }, accepted: ['They weren’t watching the magpie.', 'They were not watching the magpie.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l14c2-13', type: 'fix', grammarPoint: 'l14c2_wasnt', wrong: 'I not was using the bike pump.', accepted: ['I wasn’t using the bike pump.', 'I was not using the bike pump.'] },
    { id: 'l14c2-14', type: 'fix', grammarPoint: 'l14c2_werent', wrong: 'They wasn’t using the answer sheet.', accepted: ['They weren’t using the answer sheet.', 'They were not using the answer sheet.'] },
    { id: 'l14c2-15', type: 'fix', grammarPoint: 'l14c2_busy', wrong: 'He was build a snowman.', accepted: ['He was building a snowman.'] },
    { id: 'l14c2-16', type: 'fix', grammarPoint: 'l14c2_wasnt', wrong: 'I weren’t walking through the snowdrift.', accepted: ['I wasn’t walking through the snowdrift.', 'I was not walking through the snowdrift.'] },
  ],
};
