// chapter_exam_v2_l15_c1.ts — банк экзамена v2: урок 15, глава 1 (эпизоды 1–8). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l15.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–8 урока 15
// (урок 15 вводит going to для решённого заранее: I am / she is / they are going to + глагол); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L15_C1: ChapterExamV2Bank = {
  lessonOrdinal: 15,
  chapterOrdinal: 1,
  grammarPoints: [
    { id: 'l15c1_i_am', label: { ru: 'я собираюсь — I am going to', uk: 'я збираюся — I am going to' }, episodeOrdinals: [1, 2, 4] },
    { id: 'l15c1_is_are', label: { ru: 'он, она, они собираются — is / are going to', uk: 'він, вона, вони збираються — is / are going to' }, episodeOrdinals: [1, 3, 5] },
    { id: 'l15c1_tomorrow', label: { ru: 'завтра — going to … tomorrow', uk: 'завтра — going to … tomorrow' }, episodeOrdinals: [6, 7, 8] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l15c1-01', type: 'situation', grammarPoint: 'l15c1_i_am', situation: { ru: 'Чайник весь в накипи. Скажи, что ты решил его почистить.', uk: 'Чайник увесь у накипу. Скажи, що ти вирішив його почистити.' }, accepted: ['I am going to descale the kettle.'] },
    { id: 'l15c1-02', type: 'situation', grammarPoint: 'l15c1_is_are', situation: { ru: 'Сестра уже решила перекрасить стену. Расскажи об этом.', uk: 'Сестра вже вирішила перефарбувати стіну. Розкажи про це.' }, accepted: ['She is going to repaint the wall.'] },
    { id: 'l15c1-03', type: 'situation', grammarPoint: 'l15c1_tomorrow', situation: { ru: 'Ты уже решил: завтра просеешь муку. Скажи об этом.', uk: 'Ти вже вирішив: завтра просієш борошно. Скажи про це.' }, accepted: ['I am going to sift the flour tomorrow.'] },
    { id: 'l15c1-04', type: 'situation', grammarPoint: 'l15c1_i_am', situation: { ru: 'Цветок вырос из горшка. Скажи, что собираешься его пересадить.', uk: 'Квітка виросла з горщика. Скажи, що збираєшся її пересадити.' }, accepted: ['I am going to repot this plant.'] },
    { id: 'l15c1-05', type: 'situation', grammarPoint: 'l15c1_is_are', situation: { ru: 'Друзья решили взять отпуск по системе «всё включено». Расскажи.', uk: 'Друзі вирішили взяти відпустку за системою «все включено». Розкажи.' }, accepted: ['They are going to book an all-inclusive holiday.'] },
    { id: 'l15c1-06', type: 'situation', grammarPoint: 'l15c1_tomorrow', situation: { ru: 'Скажи, что завтра она повесит гирлянду из флажков.', uk: 'Скажи, що завтра вона повісить гірлянду з прапорців.' }, accepted: ['She is going to hang the bunting tomorrow.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c1-07', type: 'dialogue', grammarPoint: 'l15c1_i_am', partnerLine: 'She is going to prepare lunch.', situation: { ru: 'Скажи, что ты собираешься испечь пирог.', uk: 'Скажи, що ти збираєшся спекти пиріг.' }, accepted: ['I am going to make a cake.'] },
    { id: 'l15c1-08', type: 'dialogue', grammarPoint: 'l15c1_is_are', partnerLine: 'I am going to paint the room.', situation: { ru: 'Скажи, что она купит краску.', uk: 'Скажи, що вона купить фарбу.' }, accepted: ['She is going to buy some paint.'] },
    { id: 'l15c1-09', type: 'dialogue', grammarPoint: 'l15c1_tomorrow', partnerLine: 'She is going to take a blanket.', situation: { ru: 'Скажи, что ты завтра купишь коврик для сна.', uk: 'Скажи, що ти завтра купиш килимок для сну.' }, accepted: ['I am going to buy a sleeping mat tomorrow.'] },
    { id: 'l15c1-10', type: 'dialogue', grammarPoint: 'l15c1_i_am', partnerLine: 'They are going to decorate the room.', situation: { ru: 'Скажи, что ты повесишь гирлянду из флажков.', uk: 'Скажи, що ти повісиш гірлянду з прапорців.' }, accepted: ['I am going to hang the bunting.'] },
    { id: 'l15c1-11', type: 'dialogue', grammarPoint: 'l15c1_is_are', partnerLine: 'We are going to look at the plants.', situation: { ru: 'Скажи, что она нарисует цветок.', uk: 'Скажи, що вона намалює квітку.' }, accepted: ['She is going to draw a flower.'] },
    { id: 'l15c1-12', type: 'dialogue', grammarPoint: 'l15c1_tomorrow', partnerLine: 'I am going to repaint the wall tomorrow.', situation: { ru: 'Скажи, что она завтра перешьёт платье.', uk: 'Скажи, що вона завтра перешиє сукню.' }, accepted: ['She is going to alter the dress tomorrow.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l15c1-13', type: 'fix', grammarPoint: 'l15c1_i_am', wrong: 'I going to descale the kettle.', accepted: ['I am going to descale the kettle.'] },
    { id: 'l15c1-14', type: 'fix', grammarPoint: 'l15c1_is_are', wrong: 'They is going to declutter the room.', accepted: ['They are going to declutter the room.'] },
    { id: 'l15c1-15', type: 'fix', grammarPoint: 'l15c1_tomorrow', wrong: 'She is going knead the dough tomorrow.', accepted: ['She is going to knead the dough tomorrow.'] },
    { id: 'l15c1-16', type: 'fix', grammarPoint: 'l15c1_is_are', wrong: 'She are going to sift the flour.', accepted: ['She is going to sift the flour.'] },
  ],
};
