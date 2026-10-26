// chapter_exam_v2_l28_c4.ts — банк экзамена v2: урок 28, глава 4 (эпизоды 25–32).
// зачем (слово владельца 26.10 «банки для всех уроков и глав — в 2.0.3»): глава 4 урока 28 — что с вещью можно / нужно / стоит
// сделать: can / must / should be + третья форма (This jar can be reused, The lid must be removed, The bag should be kept dry)
// (25–32): переработка, сумки, прокат, одежда, детские вещи. Сторож слов — owner_locks_exam_episode_words.
import type { ChapterExamV2Bank } from '../chapter_exam_v2';

export const CHAPTER_EXAM_V2_BANK_L28_C4: ChapterExamV2Bank = {
  lessonOrdinal: 28,
  chapterOrdinal: 4,
  grammarPoints: [
    { id: 'l28c4_can_be', label: { ru: 'можно — can be + reused / replaced', uk: 'можна — can be + reused / replaced' }, episodeOrdinals: [25, 26, 29] },
    { id: 'l28c4_must_be', label: { ru: 'обязательно — must be + kept / removed', uk: 'обов’язково — must be + kept / removed' }, episodeOrdinals: [25, 27, 29] },
    { id: 'l28c4_should_be', label: { ru: 'стоит — should be + washed / checked', uk: 'варто — should be + washed / checked' }, episodeOrdinals: [25, 26, 31] },
  ],
  items: [
    // ── Ситуация → сам говоришь или пишешь ───────────────────────────────────────────────────────────────────────
    { id: 'l28c4-01', type: 'situation', grammarPoint: 'l28c4_can_be', situation: { ru: 'Сосед хочет выбросить стеклянную банку. Скажи, что её можно использовать снова.', uk: 'Сусід хоче викинути скляну банку. Скажи, що її можна використати знову.' }, accepted: ['This jar can be reused.', 'It can be reused.', 'The jar can be reused.'] },
    { id: 'l28c4-02', type: 'situation', grammarPoint: 'l28c4_must_be', situation: { ru: 'Ты сдаёшь контейнер на переработку. Работник напоминает про крышку. Скажи другу, что крышку нужно снять.', uk: 'Ти здаєш контейнер на переробку. Працівник нагадує про кришку. Скажи другові, що кришку треба зняти.' }, accepted: ['This lid must be removed.', 'The lid must be removed.'] },
    { id: 'l28c4-03', type: 'situation', grammarPoint: 'l28c4_should_be', situation: { ru: 'Друг наливает чай в пыльную чашку из шкафа. Скажи, что её сначала стоит помыть.', uk: 'Друг наливає чай у запилену чашку з шафи. Скажи, що її спочатку варто помити.' }, accepted: ['The cup should be washed first.'] },
    { id: 'l28c4-04', type: 'situation', grammarPoint: 'l28c4_can_be', situation: { ru: 'У кожаной сумки оторвался ремень. Спроси мастера, можно ли его заменить.', uk: 'У шкіряної сумки відірвався ремінь. Запитай майстра, чи можна його замінити.' }, accepted: ['Can the strap be replaced?', 'Can the strap on this satchel be replaced?', 'Can it be replaced?'] },
    { id: 'l28c4-05', type: 'situation', grammarPoint: 'l28c4_must_be', situation: { ru: 'Курьер ставит коробки прямо у двери подъезда. Скажи, что вход нужно держать свободным.', uk: 'Кур’єр ставить коробки просто біля дверей під’їзду. Скажи, що вхід треба тримати вільним.' }, accepted: ['The entrance must be kept clear.'] },
    { id: 'l28c4-06', type: 'situation', grammarPoint: 'l28c4_should_be', situation: { ru: 'Покупательница берёт кожаную сумку под дождь. Предупреди, что её стоит держать сухой.', uk: 'Покупниця бере шкіряну сумку під дощ. Попередь, що її варто тримати сухою.' }, accepted: ['The bag should be kept dry.'] },
    // ── Ответ в мини-диалоге ──────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c4-07', type: 'dialogue', grammarPoint: 'l28c4_can_be', partnerLine: 'Where should I return the car?', situation: { ru: 'Ты работник проката. Скажи, что машину можно вернуть сюда.', uk: 'Ти працівник прокату. Скажи, що машину можна повернути сюди.' }, accepted: ['The car can be returned here.', 'It can be returned here.'] },
    { id: 'l28c4-08', type: 'dialogue', grammarPoint: 'l28c4_must_be', partnerLine: 'What time should I bring it back?', situation: { ru: 'Время любое, но главное — ключи. Скажи, что ключи нужно вернуть обязательно.', uk: 'Час будь-який, але головне — ключі. Скажи, що ключі треба повернути обов’язково.' }, accepted: ['The keys must be returned.'] },
    { id: 'l28c4-09', type: 'dialogue', grammarPoint: 'l28c4_should_be', partnerLine: 'It is a gift.', situation: { ru: 'Покупательница берёт комбинезон для чужого малыша. Скажи, что размер стоит проверить.', uk: 'Покупниця бере комбінезон для чужого малюка. Скажи, що розмір варто перевірити.' }, accepted: ['The size should be checked.'] },
    { id: 'l28c4-10', type: 'dialogue', grammarPoint: 'l28c4_can_be', partnerLine: 'Does it come in another colour?', situation: { ru: 'Другого цвета сейчас нет. Скажи, что это можно обменять позже.', uk: 'Іншого кольору зараз немає. Скажи, що це можна обміняти пізніше.' }, accepted: ['This can be exchanged.', 'It can be exchanged.'] },
    { id: 'l28c4-11', type: 'dialogue', grammarPoint: 'l28c4_must_be', partnerLine: 'Could I try this on?', situation: { ru: 'Конечно, но предупреди: бирку нужно сохранить.', uk: 'Звісно, але попередь: бирку треба зберегти.' }, accepted: ['The label must be kept.'] },
    { id: 'l28c4-12', type: 'dialogue', grammarPoint: 'l28c4_should_be', partnerLine: 'Where should I put this ceramic bowl?', situation: { ru: 'Миска в остатках еды. Скажи, что её сначала стоит помыть.', uk: 'Миска в залишках їжі. Скажи, що її спочатку варто помити.' }, accepted: ['The bowl should be washed first.', 'It should be washed first.'] },
    // ── Найди и исправь ошибку ────────────────────────────────────────────────────────────────────────────────────
    { id: 'l28c4-13', type: 'fix', grammarPoint: 'l28c4_can_be', wrong: 'This jar can reused.', accepted: ['This jar can be reused.'] },
    { id: 'l28c4-14', type: 'fix', grammarPoint: 'l28c4_must_be', wrong: 'This lid must be remove.', accepted: ['This lid must be removed.'] },
    { id: 'l28c4-15', type: 'fix', grammarPoint: 'l28c4_should_be', wrong: 'The bag should kept dry.', accepted: ['The bag should be kept dry.'] },
    { id: 'l28c4-16', type: 'fix', grammarPoint: 'l28c4_must_be', wrong: 'The receipt must shown.', accepted: ['The receipt must be shown.'] },
  ],
};
