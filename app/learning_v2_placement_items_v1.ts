// learning_v2_placement_items_v1.ts — задания теста уровня, проверенные вручную (Learning V2, 28.10).
// зачем (жалобы владельца 28.10 через координатора): в тест попадали бредовые задания («Этого не было вчера» → «I didn't cheer up quickly»)
// и задания с несколькими верными ответами («they are going to pay» / «they are paying»). Тест берёт задания уроков; теперь — только из
// этого списка: тема урока, естественная фраза, ровно один верный вариант, время и лицо видны в самой английской фразе. Отбор и
// причины исключений — docs/work/placement-test-audit-2026-10-28.md. Новое задание — только после такой же проверки.

export const LEARNING_V2_PLACEMENT_ITEMS_V1: Readonly<Record<number, readonly string[]>> = {
  1: [
    'lesson-01:session:05:i15', // I ___ fine. → am
    'lesson-01:session:11:i13', // You ___ not rude. → are
    'lesson-01:session:13:i13', // You ___ tall. → are
    'lesson-01:session:19:i14', // I ___ alone. → am
    'lesson-01:session:25:i14', // It ___ different. → is
    'lesson-01:session:31:i14', // They ___ similar. → are
  ],
  2: [
    'lesson-02:session:01:i14', // She ___ not interested. → is
    'lesson-02:session:04:i14', // We ___ not convinced. → are
    'lesson-02:session:09:i14', // ___ it soft? → Is
    'lesson-02:session:10:i14', // ___ they satisfied? → Are
    'lesson-02:session:27:i14', // No, he ___ not. → is
    'lesson-02:session:29:i14', // Where ___ they? → are
  ],
  // урок 3: без «Как это называется по-английски?» — это слово, а не тема урока
  3: [
    'lesson-03:session:10:i14', // It is ___ armchair. → an
    'lesson-03:session:13:i14', // It is ___ clock. → a
    'lesson-03:session:14:i14', // It is ___ egg. → an
    'lesson-03:session:16:i14', // It is ___ address. → an
    'lesson-03:session:18:i14', // Are they ___? → boxes
    'lesson-03:session:19:i14', // Are they ___? → cities
  ],
  4: [
    'lesson-04:session:01:i12', // There is ___ old library nearby. → an
    'lesson-04:session:04:i11', // There ___ restaurants near the market. → are
    'lesson-04:session:05:i10', // There ___ a cafe near the supermarket. → is
    'lesson-04:session:09:i12', // ___ there a pharmacy near here? → Is
    'lesson-04:session:18:i12', // There is ___ butter here. → some
    'lesson-04:session:19:i12', // Is there ___ rice here? → any
  ],
  5: [
    'lesson-05:session:02:i14', // The hotel ___ a garden. → has
    'lesson-05:session:06:i14', // She ___ a pen. → has
    'lesson-05:session:17:i14', // The helmet is ___. → yours
    'lesson-05:session:18:i14', // The ring is ___. → his
    'lesson-05:session:20:i14', // The backpack is my ___. → husband’s
    'lesson-05:session:21:i14', // The dog is the ___. → neighbour’s
  ],
  // урок 6: только привычки: в остальных заданиях урока действие идёт прямо сейчас («достали хлеб — скажите, что печёте»), а ответ Present Simple — по-английски это ошибка
  6: [
    'lesson-06:session:09:i14', // I ___ the shift at four. → start
    'lesson-06:session:12:i14', // I ___ at home. → paint
    'lesson-06:session:13:i14', // We ___ in this pool. → swim
  ],
  7: [
    'lesson-07:session:03:i14', // There ___ no ink here. → is
    'lesson-07:session:06:i14', // There ___ no pliers here. → are
    'lesson-07:session:10:i14', // Does the fan ___? → work
    'lesson-07:session:13:i14', // Does your uncle ___ golf? → play
    'lesson-07:session:18:i14', // He ___ have a house. → doesn't
    'lesson-07:session:20:i14', // There ___ no matches here. → are
  ],
  8: [
    'lesson-08:session:01:i14', // I can ___. → type
    'lesson-08:session:02:i14', // I can ___ the ball. → throw
    'lesson-08:session:09:i14', // He ___ dive. → can’t
    'lesson-08:session:12:i14', // He ___ poach eggs. → can’t
    'lesson-08:session:17:i14', // ___ you lend me a pen? → Can
    'lesson-08:session:19:i14', // ___ you explain it? → Can
  ],
  9: [
    'lesson-09:session:02:i14', // They ___ stirring the batter. → are
    'lesson-09:session:09:i14', // They ___ not looking. → are
    'lesson-09:session:14:i14', // The dog ___ carrying a slipper. → is
    'lesson-09:session:16:i14', // The flash is not ___. → working
    'lesson-09:session:17:i14', // ___ the zipper working? → Is
    'lesson-09:session:18:i14', // I am ___. → shivering
  ],
  10: [
    'lesson-10:session:03:i12', // We are ___ along the shore. → walking
    'lesson-10:session:07:i12', // This bag ___ to me. → belongs
    'lesson-10:session:11:i12', // I am ___ a voicemail. → leaving
    'lesson-10:session:14:i12', // I am ___ at baggage claim. → waiting
    'lesson-10:session:20:i12', // Do you ___ the tracking number? → have
    'lesson-10:session:22:i12', // ___ you recognize the accent? → Do
  ],
  11: [
    'lesson-11:session:01:i12', // It ___ empty last year. → was
    'lesson-11:session:04:i12', // The hairdresser ___ busy yesterday. → was
    'lesson-11:session:06:i12', // The children ___ happy on Saturday. → were
    'lesson-11:session:11:i12', // No, we ___. → weren't
    'lesson-11:session:12:i12', // No, it ___. → wasn't
    'lesson-11:session:19:i12', // There ___ three paper bags next to the door. → were
  ],
  12: [
    'lesson-12:session:02:i12', // They ___ the road sign yesterday. → checked
    'lesson-12:session:04:i12', // They ___ the garden chair yesterday. → moved
    'lesson-12:session:09:i12', // They ___ a gift bag yesterday. → chose
    'lesson-12:session:12:i12', // They ___ some soft cheese yesterday. → had
    'lesson-12:session:14:i12', // Someone ___ his coin purse yesterday. → stole
    'lesson-12:session:17:i12', // She ___ the boat trip yesterday. → enjoyed
  ],
  // урок 13: только фразы со временем внутри английского (yesterday, last night): в шаблоне «Этого не было вчера…» время только в подсказке — Do и Did оба верны
  13: [
    'lesson-13:session:22:i14', // Did he ___ you with the bag? → help
    'lesson-13:session:26:i12', // ___ you clean the curtain rail yesterday? → Did
    'lesson-13:session:28:i12', // ___ you miss the train yesterday? → Did
    'lesson-13:session:29:i12', // ___ you feel frightened last night? → Did
    'lesson-13:session:30:i12', // ___ you wait in the departure lounge yesterday? → Did
    'lesson-13:session:31:i11', // ___ you wash the towels yesterday? → Did
  ],
  // урок 14: только фразы с when / while: без них «We ___ reading» допускает и were, и are
  14: [
    'lesson-14:session:09:i12', // I ___ playing on the bouncy castle. → wasn’t
    'lesson-14:session:26:i12', // We ___ looking for a bucket hat when you called. → were
    'lesson-14:session:27:i12', // We ___ walking towards the lighthouse when it started to rain. → were
    'lesson-14:session:29:i12', // We ___ cleaning a photo frame when you arrived. → were
    'lesson-14:session:33:i12', // She ___ bending down while I was holding her bag. → was
    'lesson-14:session:34:i12', // We ___ standing still while she was taking a photo. → were
  ],
  // урок 15: going to с am / is / are: пары «are going to pay / are paying» без подсказки «Передайте через …» обе верны (жалоба владельца 28.10)
  15: [
    'lesson-15:session:01:i12', // We ___ going to alter the dress. → are
    'lesson-15:session:03:i12', // We ___ going to compost the leaves. → are
    'lesson-15:session:05:i12', // We ___ going to choose a room with a walk-in shower. → are
    'lesson-15:session:09:i12', // The shelf ___ going to collapse. → is
    'lesson-15:session:10:i12', // The biscuits ___ going to crumble. → are
    'lesson-15:session:12:i12', // The boards ___ going to rot. → are
  ],
  16: [
    'lesson-16:session:01:i12', // I think the heatwave ___ tomorrow. → will end
    'lesson-16:session:02:i12', // I think we ___ a chance to swim. → will have
    'lesson-16:session:03:i12', // I think it ___ breezy on Sunday. → will be
    'lesson-16:session:06:i12', // I think the tickets ___ sold out by Friday. → will be
    'lesson-16:session:07:i12', // I think the surcharge ___ ten pounds. → will be
    'lesson-16:session:08:i12', // I think the meat ___ chewy. → will be
  ],
  // урок 17: без little / a little: оба верны грамматически, различаются только смыслом подсказки
  17: [
    'lesson-17:session:01:i12', // We need ___. → bedding
    'lesson-17:session:07:i12', // We need ___. → equipment
    'lesson-17:session:08:i12', // We can see ___. → damage
    'lesson-17:session:09:i12', // We don’t have ___ semolina. → much
    'lesson-17:session:11:i12', // There isn’t ___ pollution here. → much
    'lesson-17:session:13:i12', // We don’t have ___ funding. → much
  ],
  18: [
    'lesson-18:session:01:i12', // This living space is ___ than ours. → brighter
    'lesson-18:session:04:i12', // The still water is ___ than the juice. → cheaper
    'lesson-18:session:10:i12', // This repair shop is ___. → the oldest
    'lesson-18:session:12:i12', // The plain yoghurt is ___ option. → the cheapest
    'lesson-18:session:17:i12', // This green tea is ___ that one. → as cheap as
    'lesson-18:session:18:i12', // This cleaning spray is ___ that one. → as strong as
  ],
  19: [
    'lesson-19:session:01:i12', // We can ___ a meeting. → arrange
    'lesson-19:session:06:i12', // Noise can ___ your sleep. → affect
    'lesson-19:session:09:i12', // At twelve, we ___ travel independently. → could
    'lesson-19:session:10:i12', // At ten, I ___ read a poem. → could
    'lesson-19:session:17:i12', // ___ extend my stay? → May I
    'lesson-19:session:18:i12', // ___ use the remote control? → May I
  ],
  20: [
    'lesson-20:session:01:i12', // She ___ show identification. → must
    'lesson-20:session:07:i12', // We ___ turn back now. → must
    'lesson-20:session:09:i12', // We ___ call the applicant. → have to
    'lesson-20:session:10:i12', // He ___ travel overseas. → has to
    'lesson-20:session:13:i12', // He ___ bring this document. → has to
    'lesson-20:session:17:i12', // She ___ unwind after work. → should
  ],
  21: [
    'lesson-21:session:04:i12', // I avoid ___ a fuss. → making
    'lesson-21:session:05:i12', // I do not mind ___ again after an interruption. → starting
    'lesson-21:session:07:i12', // I enjoy ___ a documentary about nature. → watching
    'lesson-21:session:11:i12', // I hope ___ a good time. → to have
    'lesson-21:session:12:i12', // I intend ___ without a car. → to go
    'lesson-21:session:21:i12', // I want ___ a message. → to leave
  ],
  22: [
    'lesson-22:session:01:i12', // I do not want to disappoint ___. → you
    'lesson-22:session:03:i12', // I admire ___. → them
    'lesson-22:session:09:i12', // This rain jacket is ___. → ours
    'lesson-22:session:10:i12', // This yoga mat is ___. → hers
    'lesson-22:session:14:i12', // Could I ___ separately? → pay
    'lesson-22:session:17:i12', // You should not blame ___. → yourself
  ],
};

/** Номера занятий урока, где лежат проверенные задания — тест собирает только их, а не все 56 занятий. */
export function learningV2PlacementItemSessionsV1(lessonOrdinal: number): readonly number[] {
  const ids = LEARNING_V2_PLACEMENT_ITEMS_V1[lessonOrdinal] ?? [];
  return [...new Set(ids.map((id) => Number(/:session:(\d+):/u.exec(id)?.[1] ?? 0)).filter((n) => n > 0))];
}
