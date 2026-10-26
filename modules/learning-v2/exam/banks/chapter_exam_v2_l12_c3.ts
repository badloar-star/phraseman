// chapter_exam_v2_l12_c3.ts — банк экзамена v2: урок 12, глава 3 (эпизоды 17–24). НЕ подключён: строку в BANKS
// (app/learning_v2_chapter_exam_v2.ts) добавляет Learning V2 после вычитки владельцем (docs/work/exam-banks/l12.md).
// зачем (владелец 26.10: экзамены глав v2 для всех уроков, войдут в 2.0.3): только слова и формы эпизодов 1–24 урока 12
// (прошедшее время о законченном событии: went, enjoyed, celebrated, graduated, finished, noticed, checked; отрицаний и вопросов ещё нет); ситуация и ответ сходятся по смыслу; верных вариантов несколько. Сторож слов —
// tests/owner_locks_exam_episode_words_2026_10_25.test.ts. Эталон (первый в accepted) — полной формой, как в эпизодах.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L12_C3: ChapterExamV2Bank = {
  lessonOrdinal: 12,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l12c3_went', label: { ru: 'съездил, понравилось — went, enjoyed', uk: 'з’їздив, сподобалося — went, enjoyed' }, episodeOrdinals: [17, 19] },
    { id: 'l12c3_celebrated', label: { ru: 'отпраздновал, окончил — celebrated, graduated, finished', uk: 'відсвяткував, закінчив — celebrated, graduated, finished' }, episodeOrdinals: [18, 23] },
    { id: 'l12c3_noticed', label: { ru: 'заметил, проверил — noticed, checked', uk: 'помітив, перевірив — noticed, checked' }, episodeOrdinals: [20, 21, 22] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ──────────────────────────────────────────────────────────────────────
    { id: 'l12c3-01', type: 'situation', grammarPoint: 'l12c3_went', situation: { ru: 'Коллега спрашивает про выходные. Скажи, что в прошлое воскресенье вы ездили на море.', uk: 'Колега питає про вихідні. Скажи, що минулої неділі ви їздили на море.' }, accepted: ['We went to the seaside last Sunday.'] },
    { id: 'l12c3-02', type: 'situation', grammarPoint: 'l12c3_celebrated', situation: { ru: 'Друг пишет, почему тебя вчера не было на связи. Скажи, что вы праздновали твой день рождения.', uk: 'Друг пише, чому тебе вчора не було на зв’язку. Скажи, що ви святкували твій день народження.' }, accepted: ['We celebrated my birthday yesterday.'] },
    { id: 'l12c3-03', type: 'situation', grammarPoint: 'l12c3_noticed', situation: { ru: 'Ты за рулём перестроился правее. Объясни пассажиру, что заметил велосипедную полосу.', uk: 'Ти за кермом перелаштувався правіше. Поясни пасажирові, що помітив велосипедну смугу.' }, accepted: ['I noticed a cycle lane.'] },
    { id: 'l12c3-04', type: 'situation', grammarPoint: 'l12c3_celebrated', situation: { ru: 'Новая знакомая спрашивает о твоей сестре. Скажи, что в прошлом году она окончила университет.', uk: 'Нова знайома питає про твою сестру. Скажи, що минулого року вона закінчила університет.' }, accepted: ['She graduated from university last year.'] },
    { id: 'l12c3-05', type: 'situation', grammarPoint: 'l12c3_noticed', situation: { ru: 'Кот пропал, и ты первым делом осмотрел кошачью дверцу. Расскажи об этом.', uk: 'Кіт зник, і ти насамперед оглянув котячі дверцята. Розкажи про це.' }, accepted: ['I checked the cat flap.'] },
    { id: 'l12c3-06', type: 'situation', grammarPoint: 'l12c3_went', situation: { ru: 'Ты вернулся с прогулки на катере в восторге. Скажи, что тебе понравилось.', uk: 'Ти повернувся з прогулянки на катері в захваті. Скажи, що тобі сподобалося.' }, accepted: ['I enjoyed the boat trip.'] },
    // ── Ответ в мини-диалоге ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c3-07', type: 'dialogue', grammarPoint: 'l12c3_went', partnerLine: 'She enjoyed the day trip yesterday.', situation: { ru: 'Скажи, что вам понравилась поездка на автобусе.', uk: 'Скажи, що вам сподобалася поїздка автобусом.' }, accepted: ['We enjoyed the coach trip.'] },
    { id: 'l12c3-08', type: 'dialogue', grammarPoint: 'l12c3_celebrated', partnerLine: 'The final exam was difficult.', situation: { ru: 'Скажи, что ты всё-таки сдал этот экзамен до конца.', uk: 'Скажи, що ти все-таки склав цей іспит до кінця.' }, accepted: ['I finished my final exam.'] },
    { id: 'l12c3-09', type: 'dialogue', grammarPoint: 'l12c3_noticed', partnerLine: 'The theory test was difficult.', situation: { ru: 'Скажи, что ты уже проверил свой результат.', uk: 'Скажи, що ти вже перевірив свій результат.' }, accepted: ['I checked my test result.'] },
    { id: 'l12c3-10', type: 'dialogue', grammarPoint: 'l12c3_went', partnerLine: 'We competed at school yesterday.', situation: { ru: 'Скажи, что тебе понравился спортивный праздник.', uk: 'Скажи, що тобі сподобалося спортивне свято.' }, accepted: ['I enjoyed sports day.'] },
    { id: 'l12c3-11', type: 'dialogue', grammarPoint: 'l12c3_celebrated', partnerLine: 'She graduated from university last year.', situation: { ru: 'Скажи, что вы праздновали её день выпуска.', uk: 'Скажи, що ви святкували її день випуску.' }, accepted: ['We celebrated her graduation day.'] },
    { id: 'l12c3-12', type: 'dialogue', grammarPoint: 'l12c3_noticed', partnerLine: 'We parked near the station.', situation: { ru: 'Скажи, что ты заметил дорожный знак.', uk: 'Скажи, що ти помітив дорожній знак.' }, accepted: ['I noticed a road sign.'] },
    // ── Найди и исправь ошибку ──────────────────────────────────────────────────────────────────────────────────
    { id: 'l12c3-13', type: 'fix', grammarPoint: 'l12c3_went', wrong: 'We go on a day trip last Sunday.', accepted: ['We went on a day trip last Sunday.'] },
    { id: 'l12c3-14', type: 'fix', grammarPoint: 'l12c3_celebrated', wrong: 'We celebrate my birthday yesterday.', accepted: ['We celebrated my birthday yesterday.'] },
    { id: 'l12c3-15', type: 'fix', grammarPoint: 'l12c3_noticed', wrong: 'I notice a cycle lane yesterday.', accepted: ['I noticed a cycle lane yesterday.'] },
    { id: 'l12c3-16', type: 'fix', grammarPoint: 'l12c3_went', wrong: 'The school trip were interesting yesterday.', accepted: ['The school trip was interesting yesterday.'] },
  ],
};
