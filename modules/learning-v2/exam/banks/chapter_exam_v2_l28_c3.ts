// chapter_exam_v2_l28_c3.ts — банк экзамена v2: урок 28, глава 3 (эпизоды 17–24).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 3 урока 28 — что с вещью сделают: will be + третья
// форма (The sideboard will be delivered on Friday) — рядом с уже знакомыми was / were и is / are (17–24): мебель, украшения,
// салон, мастер-класс, автосервис, химчистка. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L28_C3: ChapterExamV2Bank = {
  lessonOrdinal: 28,
  chapterOrdinal: 3,
  grammarPoints: [
    { id: 'l28c3_will_be_done', label: { ru: 'с вещью сделают — will be + delivered / kept', uk: 'з річчю зроблять — will be + delivered / kept' }, episodeOrdinals: [17, 18, 19] },
    { id: 'l28c3_was_were_done', label: { ru: 'с вещью сделали — was / were + repaired', uk: 'з річчю зробили — was / were + repaired' }, episodeOrdinals: [18, 19, 22] },
    { id: 'l28c3_is_are_done', label: { ru: 'так делают всегда — is / are + kept / given', uk: 'так роблять завжди — is / are + kept / given' }, episodeOrdinals: [20, 23, 24] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l28c3-01', type: 'situation', grammarPoint: 'l28c3_will_be_done', situation: { ru: 'Покупательница спрашивает, когда привезут её буфет. Скажи, что его доставят в пятницу.', uk: 'Покупниця питає, коли привезуть її буфет. Скажи, що його доставлять у п’ятницю.' }, accepted: ['The sideboard will be delivered on Friday.', 'It will be delivered on Friday.'] },
    { id: 'l28c3-02', type: 'situation', grammarPoint: 'l28c3_was_were_done', situation: { ru: 'Клиентка пришла за браслетом. Скажи, что его починили вчера.', uk: 'Клієнтка прийшла по браслет. Скажи, що його полагодили вчора.' }, accepted: ['The bracelet was repaired yesterday.', 'It was repaired yesterday.'] },
    { id: 'l28c3-03', type: 'situation', grammarPoint: 'l28c3_is_are_done', situation: { ru: 'На мастер-классе ребёнок ищет пластилин. Скажи, что его хранят в коробке.', uk: 'На майстер-класі дитина шукає пластилін. Скажи, що його зберігають у коробці.' }, accepted: ['The playdough is kept in a box.'] },
    { id: 'l28c3-04', type: 'situation', grammarPoint: 'l28c3_will_be_done', situation: { ru: 'Покупательница оплатила платье онлайн. Скажи, что её заказ отправят завтра.', uk: 'Покупниця оплатила сукню онлайн. Скажи, що її замовлення відправлять завтра.' }, accepted: ['Your order will be sent tomorrow.'] },
    { id: 'l28c3-05', type: 'situation', grammarPoint: 'l28c3_was_were_done', situation: { ru: 'Механик предлагает новые шины. Скажи, что их поменяли в прошлом месяце.', uk: 'Механік пропонує нові шини. Скажи, що їх поміняли минулого місяця.' }, accepted: ['The tyres were changed last month.'] },
    { id: 'l28c3-06', type: 'situation', grammarPoint: 'l28c3_is_are_done', situation: { ru: 'Покупательница ищет пробники крема. Скажи, что пробники дают на стойке.', uk: 'Покупниця шукає пробники крему. Скажи, що пробники дають на стійці.' }, accepted: ['Samples are given at the counter.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c3-07', type: 'dialogue', grammarPoint: 'l28c3_will_be_done', partnerLine: 'I have an appointment at ten.', situation: { ru: 'Ты администратор салона. Скажи клиентке, что её куртку будут хранить в шкафу.', uk: 'Ти адміністратор салону. Скажи клієнтці, що її куртку зберігатимуть у шафі.' }, accepted: ['Your jacket will be kept in the cupboard.'] },
    { id: 'l28c3-08', type: 'dialogue', grammarPoint: 'l28c3_was_were_done', partnerLine: 'Just the ends, please.', situation: { ru: 'Ты парикмахер. Успокой клиентку: ножницы протёрли перед работой.', uk: 'Ти перукар. Заспокой клієнтку: ножиці протерли перед роботою.' }, accepted: ['The scissors were cleaned before use.'] },
    { id: 'l28c3-09', type: 'dialogue', grammarPoint: 'l28c3_is_are_done', partnerLine: 'I am here to collect my clothes.', situation: { ru: 'Ты работник химчистки. Скажи, что заказ хранится за стойкой.', uk: 'Ти працівник хімчистки. Скажи, що замовлення зберігається за стійкою.' }, accepted: ['Your order is kept behind the counter.'] },
    { id: 'l28c3-10', type: 'dialogue', grammarPoint: 'l28c3_will_be_done', partnerLine: 'When can we collect the painting?', situation: { ru: 'Краска ещё не высохла. Скажи, что картина останется здесь на ночь.', uk: 'Фарба ще не висохла. Скажи, що картина залишиться тут на ніч.' }, accepted: ['The painting will be kept here overnight.'] },
    { id: 'l28c3-11', type: 'dialogue', grammarPoint: 'l28c3_was_were_done', partnerLine: 'How much will it cost?', situation: { ru: 'Клиент ещё и про пятно спрашивал. Скажи, что пятно вывели сегодня утром.', uk: 'Клієнт ще й про пляму питав. Скажи, що пляму вивели сьогодні вранці.' }, accepted: ['The stain was removed this morning.', 'It was removed this morning.'] },
    { id: 'l28c3-12', type: 'dialogue', grammarPoint: 'l28c3_is_are_done', partnerLine: 'I am looking for a gift.', situation: { ru: 'Ты продавец ювелирного. Скажи, что украшения выставлены в витрине.', uk: 'Ти продавець ювелірного. Скажи, що прикраси виставлені у вітрині.' }, accepted: ['The jewellery is displayed in the window.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c3-13', type: 'fix', grammarPoint: 'l28c3_will_be_done', wrong: 'The shirts will ironed tomorrow.', accepted: ['The shirts will be ironed tomorrow.'] },
    { id: 'l28c3-14', type: 'fix', grammarPoint: 'l28c3_was_were_done', wrong: 'The tyres was changed last month.', accepted: ['The tyres were changed last month.'] },
    { id: 'l28c3-15', type: 'fix', grammarPoint: 'l28c3_is_are_done', wrong: 'Orders is packed in the back room.', accepted: ['Orders are packed in the back room.'] },
    { id: 'l28c3-16', type: 'fix', grammarPoint: 'l28c3_will_be_done', wrong: 'The name will be engrave inside the ring.', accepted: ['The name will be engraved inside the ring.'] },
  ],
};
