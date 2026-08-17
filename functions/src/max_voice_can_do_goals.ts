// ═══════════════════════════════════════════════════════════════════════════
// max_voice_can_do_goals.ts — карта речевых целей учителя (ступень 2 плана
// обучения, решение владельца 2026-08-17: «~60 целей до B1, прогресс виден»).
//
// Цель = «могу …» (CEFR can-do) с опорными фразами, грамматикой и сценами-
// задачами. Учитель ведёт ученика к следующей незакрытой цели его уровня,
// проверяет её в сцене и ставит mastery 0–3 инструментом mark_goal_progress;
// уровень ученика поднимается по закрытым целям (а не по номеру урока).
//
// Единый источник — сервер: минт выбирает текущую цель и кладёт её в промпт и в
// ответ (клиент показывает «14 / 60 до B1»), разбор пишет mastery в память.
// Английский — язык курса по умолчанию; для французского курса цели те же по
// смыслу (учитель адаптирует фразы сам), это осознанное упрощение v1.
// ═══════════════════════════════════════════════════════════════════════════

export type CanDoLevel = 'A1' | 'A2' | 'B1';

export interface CanDoGoal {
  id: string;
  level: CanDoLevel;
  /** Короткое название для ученика (интерфейс). */
  title: { en: string; ru: string; uk: string };
  /** Формулировка для учителя: что ученик должен уметь после закрытия цели. */
  canDo: string;
  /** Опорные фразы (материал урока и повторения). */
  phrases: string[];
  /** Грамматический фокус (тег из lesson_grammar_map или свободный). */
  grammar: string;
  /** Сцены-задачи, в которых цель проверяется (id из ai_dialog_scenarios). */
  sceneIds: string[];
}

const G = (
  id: string,
  level: CanDoLevel,
  en: string,
  ru: string,
  uk: string,
  canDo: string,
  phrases: string[],
  grammar: string,
  sceneIds: string[] = [],
): CanDoGoal => ({ id, level, title: { en, ru, uk }, canDo, phrases, grammar, sceneIds });

/** 60 целей: 20 × A1, 22 × A2, 18 × B1. Порядок = порядок прохождения. */
export const CAN_DO_GOALS: readonly CanDoGoal[] = Object.freeze([
  // ── A1 (20) ────────────────────────────────────────────────────────────────
  G('a1_greet', 'A1', 'Greet and say goodbye', 'Поздороваться и попрощаться', 'Привітатися й попрощатися',
    'greet someone, respond to a greeting and say goodbye politely',
    ['Hi, how are you?', "I'm fine, thanks. And you?", 'Nice to meet you.', 'See you tomorrow!'], 'to-be', ['first_meeting']),
  G('a1_intro', 'A1', 'Introduce yourself', 'Представиться', 'Представитися',
    'say their name, where they are from and what they do',
    ["My name is …", "I'm from …", 'I work as a …', "I'm a student."], 'to-be', ['first_meeting']),
  G('a1_ask_name', 'A1', 'Ask about a person', 'Спросить о человеке', 'Запитати про людину',
    "ask someone's name, origin and job and understand short answers",
    ["What's your name?", 'Where are you from?', 'What do you do?', 'How old are you?'], 'to-be-questions', ['first_meeting']),
  G('a1_family', 'A1', 'Talk about family', 'Рассказать о семье', 'Розповісти про сім’ю',
    'name family members and say a little about them',
    ['I have a sister.', 'This is my mother.', 'My brother is ten.', 'We live together.'], 'to-have', []),
  G('a1_numbers_age', 'A1', 'Numbers, age and phone', 'Числа, возраст, телефон', 'Числа, вік, телефон',
    'say and understand numbers, ages, prices and a phone number',
    ["I'm twenty-five.", "It's five dollars.", 'My number is …', 'Two, please.'], 'numbers', []),
  G('a1_time_days', 'A1', 'Time and days', 'Время и дни недели', 'Час і дні тижня',
    'ask and tell the time and name days of the week',
    ['What time is it?', "It's half past three.", 'On Monday.', 'At seven in the morning.'], 'prepositions-time', []),
  G('a1_daily_routine', 'A1', 'My daily routine', 'Мой день', 'Мій день',
    'describe a simple daily routine in the present simple',
    ['I get up at seven.', 'I go to work by bus.', 'I have lunch at one.', 'I go to bed late.'], 'present-simple', []),
  G('a1_likes', 'A1', 'Likes and dislikes', 'Что мне нравится', 'Що мені подобається',
    'say what they like and do not like and ask others',
    ['I like coffee.', "I don't like fish.", 'Do you like music?', 'I love it!'], 'present-simple-negation', ['small_talk_neighbor']),
  G('a1_order_cafe', 'A1', 'Order in a café', 'Заказать в кафе', 'Замовити в кафе',
    'order a drink or a snack, choose a size and say please/thank you',
    ["I'd like a coffee, please.", 'A large one, please.', 'Can I have a tea?', 'Thank you.'], 'modals', ['coffee']),
  G('a1_ask_price', 'A1', 'Ask the price', 'Спросить цену', 'Запитати ціну',
    'ask how much something costs and pay',
    ['How much is it?', 'How much are these?', 'Card, please.', "Here you are."], 'wh-questions', ['coffee', 'grocery']),
  G('a1_shopping_basic', 'A1', 'Buy something in a shop', 'Купить в магазине', 'Купити в магазині',
    'ask for an item, its size or colour and buy it',
    ['Do you have this in blue?', 'A medium, please.', "I'll take it.", 'Where is the milk?'], 'wh-questions', ['clothes_shop', 'grocery']),
  G('a1_directions', 'A1', 'Ask for directions', 'Спросить дорогу', 'Запитати дорогу',
    'ask where a place is and understand simple directions',
    ['Excuse me, where is the station?', 'Is it far?', 'Turn left.', 'Go straight on.'], 'prepositions-place', ['tourist_info']),
  G('a1_transport', 'A1', 'Take a taxi or a bus', 'Такси и автобус', 'Таксі й автобус',
    'tell a driver where to go and ask about the bus or ticket',
    ['To the airport, please.', 'How much is a ticket?', 'Stop here, please.', 'Which bus goes to the centre?'], 'imperative', ['taxi', 'train_station']),
  G('a1_hotel_checkin', 'A1', 'Check in at a hotel', 'Заселиться в отель', 'Заселитися в готель',
    'check in with a reservation and ask about breakfast and Wi-Fi',
    ['I have a reservation.', 'My name is …', 'What time is breakfast?', "What's the Wi-Fi password?"], 'to-have', ['hotel_checkin']),
  G('a1_help', 'A1', 'Ask for help and repeat', 'Попросить помощи и повторить', 'Попросити допомоги й повторити',
    'ask someone to help, repeat or speak slowly',
    ['Can you help me?', 'Sorry, can you repeat that?', 'Slowly, please.', "I don't understand."], 'modals', ['ask_for_help']),
  G('a1_weather', 'A1', 'Talk about the weather', 'Поговорить о погоде', 'Поговорити про погоду',
    'describe the weather today and ask about it',
    ["It's sunny today.", "It's cold.", "What's the weather like?", "It's raining."], 'to-be', ['small_talk_neighbor']),
  G('a1_food_basic', 'A1', 'Food I eat', 'Еда', 'Їжа',
    'name common food and say what they eat for breakfast, lunch and dinner',
    ['I have eggs for breakfast.', 'I eat a lot of fruit.', "I don't eat meat.", 'My favourite food is pizza.'], 'present-simple', ['grocery']),
  G('a1_home', 'A1', 'My home', 'Мой дом', 'Мій дім',
    'say where they live and describe their home simply',
    ['I live in a flat.', 'There are two rooms.', 'There is a big kitchen.', 'My room is small.'], 'there-is', []),
  G('a1_can_cant', 'A1', 'What I can do', 'Что я умею', 'Що я вмію',
    'say what they can and cannot do and ask others',
    ['I can swim.', "I can't drive.", 'Can you cook?', 'I can speak a little English.'], 'modals', []),
  G('a1_phone_basic', 'A1', 'A very simple phone call', 'Простой звонок', 'Простий дзвінок',
    'answer the phone, say who they are and end the call',
    ['Hello, this is Anna.', 'Can I speak to …?', 'Just a moment.', 'Goodbye!'], 'modals', ['phone_delivery']),

  // ── A2 (22) ────────────────────────────────────────────────────────────────
  G('a2_past_day', 'A2', 'Talk about yesterday', 'Рассказать о вчерашнем дне', 'Розповісти про вчорашній день',
    'describe what they did yesterday or last weekend in the past simple',
    ['Yesterday I went to work.', 'I watched a film.', 'We had dinner with friends.', 'It was great.'], 'past-simple-regular', []),
  G('a2_past_irregular', 'A2', 'Past with irregular verbs', 'Прошедшее с неправильными глаголами', 'Минуле з неправильними дієсловами',
    'use common irregular verbs in the past (went, had, saw, ate, took)',
    ['I went to the cinema.', 'I saw my friend.', 'We ate pizza.', 'I took a taxi.'], 'past-simple-irregular', []),
  G('a2_plans', 'A2', 'Plans for tomorrow', 'Планы на завтра', 'Плани на завтра',
    'talk about plans and intentions with going to / will',
    ["I'm going to visit my parents.", "I'll call you tomorrow.", 'What are you going to do?', "We're going to travel in July."], 'future-simple', ['invite_friend']),
  G('a2_invite', 'A2', 'Invite and respond', 'Пригласить и ответить', 'Запросити й відповісти',
    'invite someone, accept or politely refuse an invitation',
    ['Would you like to come to my party?', 'Sure, I’d love to!', "Sorry, I can't. Maybe next time?", 'What time?'], 'modals', ['invite_friend']),
  G('a2_restaurant', 'A2', 'Order a meal', 'Заказать ужин', 'Замовити вечерю',
    'ask for a table, order a meal, ask about dishes and the bill',
    ['A table for two, please.', 'What do you recommend?', "I'll have the chicken.", 'The bill, please.'], 'modals', ['restaurant', 'lesson18_restaurant_table']),
  G('a2_complain_order', 'A2', 'Something is wrong with my order', 'Проблема с заказом', 'Проблема із замовленням',
    'politely say something is wrong and ask for a fix',
    ["Excuse me, this isn't what I ordered.", 'Could you change it, please?', "It's cold.", 'Thanks for your help.'], 'modals', ['complaint_order', 'wrong_dish_better']),
  G('a2_doctor', 'A2', 'At the doctor', 'У врача', 'У лікаря',
    'describe simple symptoms and understand basic advice (no medical advice given by the tutor)',
    ['I have a headache.', 'My throat hurts.', 'Since yesterday.', "I'm allergic to …"], 'to-have', ['doctor_visit', 'pharmacy']),
  G('a2_pharmacy', 'A2', 'At the pharmacy', 'В аптеке', 'В аптеці',
    'ask for something at a pharmacy and understand how to take it (safe wording only)',
    ['Do you have something for a cold?', 'How often should I take it?', 'Is it for adults?', 'Thank you.'], 'modals', ['pharmacy']),
  G('a2_shopping_return', 'A2', 'Return or exchange', 'Вернуть или обменять', 'Повернути чи обміняти',
    'return or exchange an item and explain why',
    ["I'd like to return this.", "It's too small.", 'Can I exchange it?', 'Here is the receipt.'], 'comparatives', ['clothes_shop']),
  G('a2_travel_airport', 'A2', 'At the airport', 'В аэропорту', 'В аеропорту',
    'check in, ask about the gate and boarding time',
    ["I'd like a window seat.", 'Which gate is it?', 'What time is boarding?', 'Just one bag.'], 'wh-questions', ['airport_checkin', 'lost_luggage']),
  G('a2_lost', 'A2', 'I lost something', 'Я что-то потерял', 'Я щось загубив',
    'report a lost item and describe it',
    ["I've lost my bag.", "It's black and small.", 'I left it on the train.', 'Can you call me if you find it?'], 'past-simple-regular', ['lost_luggage', 'lesson20_lost_bag']),
  G('a2_describe_people', 'A2', 'Describe people', 'Описать человека', 'Описати людину',
    'describe appearance and character of a person',
    ['She is tall with dark hair.', 'He is very friendly.', 'My boss is a bit strict.', 'They are funny.'], 'to-be', ['first_meeting']),
  G('a2_compare', 'A2', 'Compare things', 'Сравнить', 'Порівняти',
    'compare two things or places using comparatives and superlatives',
    ['This one is cheaper.', 'The city is bigger than my town.', "It's the best café here.", 'Which is better?'], 'comparatives', ['clothes_shop']),
  G('a2_hobbies', 'A2', 'Free time and hobbies', 'Хобби и свободное время', 'Хобі й вільний час',
    'talk about hobbies and how often they do them',
    ['I go running twice a week.', 'I usually read in the evening.', 'How often do you …?', "I'm interested in photography."], 'present-simple-questions', ['small_talk_neighbor']),
  G('a2_now', 'A2', 'What is happening now', 'Что происходит сейчас', 'Що відбувається зараз',
    'describe what people are doing right now',
    ["I'm working from home today.", "She's talking on the phone.", 'What are you doing?', "It's raining right now."], 'present-continuous', []),
  G('a2_appointment', 'A2', 'Make an appointment', 'Записаться / договориться о встрече', 'Записатися / домовитися про зустріч',
    'make, change or cancel an appointment by phone',
    ["I'd like to make an appointment.", 'Is Tuesday at ten OK?', 'Can we move it to Friday?', 'I need to cancel, sorry.'], 'modals', ['work_call', 'phone_delivery']),
  G('a2_work_basic', 'A2', 'Talk about my job', 'Рассказать о работе', 'Розповісти про роботу',
    'describe their job, workplace and a typical working day',
    ['I work in an office.', 'I answer emails and calls.', 'I usually finish at six.', 'I like my colleagues.'], 'present-simple', ['work_call']),
  G('a2_opinion', 'A2', 'Give a simple opinion', 'Высказать мнение', 'Висловити думку',
    'say what they think about something and agree or disagree politely',
    ['I think it’s a good idea.', "I don't agree, sorry.", 'In my opinion, …', "You're right."], 'present-simple', ['small_talk_neighbor']),
  G('a2_advice_ask', 'A2', 'Ask for advice', 'Спросить совета', 'Запитати поради',
    'ask for and give simple everyday advice (should)',
    ['What should I do?', 'You should try it.', 'Should I take the bus?', "I think you shouldn't wait."], 'modals', ['ask_for_help']),
  G('a2_house_rules', 'A2', 'Rules and permission', 'Правила и разрешение', 'Правила й дозвіл',
    'ask for permission and understand simple rules (can, must, have to)',
    ['Can I open the window?', 'You have to check out at eleven.', 'Is smoking allowed here?', 'We must be quiet.'], 'modals', ['neighbor_noise', 'hotel_checkin']),
  G('a2_story_short', 'A2', 'Tell a short story', 'Рассказать короткую историю', 'Розповісти коротку історію',
    'tell a short story about a past event with a beginning, a problem and an end',
    ['Last summer we went to …', 'Suddenly, …', 'In the end, everything was fine.', 'It was funny!'], 'past-simple-irregular', ['taxi_wrong_way']),
  G('a2_phone_call', 'A2', 'A longer phone call', 'Полноценный звонок', 'Повноцінний дзвінок',
    'handle a phone call: reason for calling, taking a message, ending politely',
    ["I'm calling about …", 'Could you take a message?', "I'll call back later.", 'Thanks for your help, bye.'], 'modals', ['work_call', 'phone_delivery']),

  // ── B1 (18) ────────────────────────────────────────────────────────────────
  G('b1_experience', 'B1', 'Talk about experiences', 'Рассказать об опыте', 'Розповісти про досвід',
    'talk about life experiences with the present perfect (have you ever…)',
    ['Have you ever been to London?', "I've never tried sushi.", "I've worked here for two years.", "I've just finished."], 'present-perfect', []),
  G('b1_narrate', 'B1', 'Narrate a story in detail', 'Рассказать историю подробно', 'Розповісти історію докладно',
    'tell a story with background (past continuous) and events (past simple)',
    ['I was walking home when it started to rain.', 'While I was cooking, …', 'At first, … then …', 'What happened next?'], 'past-continuous', ['taxi_wrong_way', 'party_fast_talk']),
  G('b1_conditionals', 'B1', 'If … then …', 'Условия и планы', 'Умови й плани',
    'talk about real and imagined situations with first and second conditionals',
    ["If it rains, we'll stay home.", 'If I had more time, I would travel.', 'What would you do?', "If you like, we can go."], 'conditionals', ['invite_friend']),
  G('b1_complain_polite', 'B1', 'Complain politely and negotiate', 'Вежливо пожаловаться и договориться', 'Ввічливо поскаржитися й домовитися',
    'explain a problem calmly, propose a solution and negotiate',
    ["I'm afraid there's a problem with …", "Could we find a solution?", "I'd appreciate a refund.", "That works for me."], 'modals', ['bill_argument', 'complaint_order', 'neighbor_noise']),
  G('b1_job_interview', 'B1', 'A job interview', 'Собеседование', 'Співбесіда',
    'talk about skills, experience and strengths in an interview',
    ["I'm good at working in a team.", 'In my last job I was responsible for …', 'I’d like to grow as a …', 'Could you tell me more about the role?'], 'present-perfect', ['condescending_interviewer', 'mistaken_for_boss']),
  G('b1_agree_disagree', 'B1', 'Discuss and disagree', 'Обсуждать и спорить', 'Обговорювати й сперечатися',
    'express and support an opinion, agree and disagree with reasons',
    ["I see your point, but …", 'On the one hand … on the other hand …', "That's a fair point.", "I'm not sure I agree, because …"], 'reported-speech', ['conspiracy_seatmate']),
  G('b1_plans_future', 'B1', 'Future plans and predictions', 'Планы и прогнозы', 'Плани й прогнози',
    'talk about future plans, arrangements and predictions',
    ["I'm meeting Anna on Friday.", "I'll probably move next year.", "By then I'll have finished.", "It's going to be busy."], 'future-simple', []),
  G('b1_describe_place', 'B1', 'Describe a place', 'Описать место', 'Описати місце',
    'describe a city, a trip or a place with details and impressions',
    ["It's a lively city with lots of cafés.", 'The view was amazing.', 'What I liked most was …', 'I would recommend it.'], 'relative-clauses', ['tourist_info']),
  G('b1_health_habits', 'B1', 'Health and habits', 'Здоровье и привычки', 'Здоров’я і звички',
    'talk about lifestyle, habits and how they used to live (no medical advice)',
    ['I used to smoke, but I quit.', 'I try to eat healthy food.', 'I should exercise more.', "I've been sleeping badly."], 'used-to', ['doctor_visit']),
  G('b1_phrasal', 'B1', 'Everyday phrasal verbs', 'Фразовые глаголы', 'Фразові дієслова',
    'use common phrasal verbs naturally in conversation',
    ['I need to pick up my kids.', 'Can you turn it down?', 'We ran out of milk.', "Let's put it off till Monday."], 'phrasal-verbs', []),
  G('b1_explain_problem', 'B1', 'Explain a problem clearly', 'Объяснить проблему', 'Пояснити проблему',
    'explain a technical or everyday problem step by step and ask for help',
    ["The app keeps crashing when I open it.", "I've already tried restarting it.", "Could you walk me through it?", 'It worked until yesterday.'], 'present-perfect', ['looping_support_bot', 'broken_robot_waiter']),
  G('b1_apologise', 'B1', 'Apologise and explain', 'Извиниться и объяснить', 'Вибачитися й пояснити',
    'apologise sincerely, give a reason and offer to make it right',
    ["I'm so sorry I'm late — the traffic was terrible.", "It won't happen again.", 'Let me make it up to you.', 'Thanks for understanding.'], 'past-simple-regular', ['late_excuse_meeting']),
  G('b1_persuade', 'B1', 'Persuade and refuse', 'Убедить и отказать', 'Переконати й відмовити',
    'persuade someone or firmly but politely refuse',
    ["I really think you'd enjoy it.", "Thanks, but I'll pass this time.", "I'm not convinced.", "Let's give it a try."], 'modals', ['salesman_talks_you_out', 'upsell_trap']),
  G('b1_reported', 'B1', 'Report what someone said', 'Передать чужие слова', 'Переказати чужі слова',
    'report what someone said or asked',
    ['She said she was busy.', 'He told me to call later.', 'They asked if I could come.', 'The doctor said I should rest.'], 'reported-speech', ['phone_delivery']),
  G('b1_passive', 'B1', 'Say how things are done', 'Как это делается', 'Як це робиться',
    'use the passive to describe processes and news',
    ['The bill is paid at the counter.', 'The room was cleaned this morning.', 'It was built in 1900.', "The meeting has been moved."], 'passive-voice', ['hotel_checkin']),
  G('b1_small_talk_pro', 'B1', 'Confident small talk', 'Уверенная светская беседа', 'Впевнена світська бесіда',
    'keep a conversation going with follow-up questions and reactions',
    ['How was your weekend?', 'That sounds great — how did it go?', 'Speaking of which, …', 'Anyway, what about you?'], 'wh-questions', ['small_talk_neighbor', 'party_fast_talk']),
  G('b1_feelings', 'B1', 'Feelings and reactions', 'Чувства и реакции', 'Почуття й реакції',
    'describe feelings and react to news with appropriate phrases',
    ["I'm really excited about it.", "That's a shame.", 'I was a bit disappointed.', "Congratulations, that's wonderful!"], 'gerund', ['surprise_guest_speech']),
  G('b1_presentation', 'B1', 'Speak for a minute', 'Говорить минуту без остановки', 'Говорити хвилину без зупинки',
    'speak for about a minute on a familiar topic with a clear structure',
    ["I'd like to talk about …", 'There are three things I want to mention.', 'First of all, … Secondly, …', 'To sum up, …'], 'gerund', ['surprise_guest_speech']),
]);

export const CAN_DO_GOALS_TOTAL = CAN_DO_GOALS.length;

const LEVEL_ORDER: readonly CanDoLevel[] = ['A1', 'A2', 'B1'];

export function canDoGoalById(id: string): CanDoGoal | undefined {
  return CAN_DO_GOALS.find((g) => g.id === id);
}

export type CanDoMastery = Record<string, number>;

/** Mastery из дока памяти: только известные id, 0–3. */
export function parseCanDoMastery(value: unknown): CanDoMastery {
  const out: CanDoMastery = {};
  if (!value || typeof value !== 'object') return out;
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!canDoGoalById(id)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    out[id] = Math.min(3, Math.max(0, Math.floor(n)));
  }
  return out;
}

/**
 * Следующая цель: первая незакрытая (mastery < 3) цель уровня ученика в порядке
 * списка; уровень закрыт целиком → следующий уровень; всё закрыто → null.
 * Если ученик выше A1, незакрытые цели младших уровней НЕ навязываются (он их
 * уже умеет по эвристике), но учитываются в счётчике как «пропущенные».
 */
export function pickNextGoal(mastery: CanDoMastery, level: string): CanDoGoal | null {
  const start = Math.max(0, LEVEL_ORDER.indexOf((level === 'B2' ? 'B1' : level) as CanDoLevel));
  for (let i = start; i < LEVEL_ORDER.length; i += 1) {
    const goal = CAN_DO_GOALS.find((g) => g.level === LEVEL_ORDER[i] && (mastery[g.id] ?? 0) < 3);
    if (goal) return goal;
  }
  return null;
}

/** Прогресс для UI: закрыто (mastery 3) / всего, и сколько закрыто на уровне цели. */
export function canDoProgress(mastery: CanDoMastery): { done: number; total: number; byLevel: Record<CanDoLevel, { done: number; total: number }> } {
  const byLevel: Record<CanDoLevel, { done: number; total: number }> = {
    A1: { done: 0, total: 0 }, A2: { done: 0, total: 0 }, B1: { done: 0, total: 0 },
  };
  let done = 0;
  for (const g of CAN_DO_GOALS) {
    byLevel[g.level].total += 1;
    if ((mastery[g.id] ?? 0) >= 3) { done += 1; byLevel[g.level].done += 1; }
  }
  return { done, total: CAN_DO_GOALS.length, byLevel };
}

/**
 * Честный уровень по закрытым целям: ≥80 % целей уровня закрыто → уровень
 * считается пройденным. Возвращает уровень, на котором ученик СЕЙЧАС работает.
 */
export function levelFromMastery(mastery: CanDoMastery, fallback: string): CanDoLevel {
  const p = canDoProgress(mastery);
  for (const level of LEVEL_ORDER) {
    const { done, total } = p.byLevel[level];
    if (total > 0 && done / total < 0.8) return level;
  }
  return 'B1';
  // fallback используется только когда целей ещё нет — см. вызывающий.
  void fallback;
}

/** Блок цели для промпта учителя (в хвост памяти). */
export function renderCanDoGoalBlock(goal: CanDoGoal, mastery: CanDoMastery, progress: ReturnType<typeof canDoProgress>): string {
  const m = mastery[goal.id] ?? 0;
  const lines = [
    'CURRENT SPEAKING GOAL (the learner\'s progress map; lead them to close it)',
    `Goal ${goal.id} (${goal.level}): the learner can ${goal.canDo}. Mastery so far: ${m}/3.`,
    `Target phrases: ${goal.phrases.join(' | ')}. Grammar focus: ${goal.grammar}.`,
    goal.sceneIds.length > 0 ? `Check it in a scene task, e.g. start_scene("${goal.sceneIds[0]}").` : 'Check it with a mini role-play you invent.',
    'At the end of the lesson call mark_goal_progress(goal_id, mastery 0-3): 1 = tried with help, 2 = mostly independent, 3 = confident and correct — then the next goal opens.',
    `Progress map: ${progress.done} of ${progress.total} goals closed (A1 ${progress.byLevel.A1.done}/${progress.byLevel.A1.total}, A2 ${progress.byLevel.A2.done}/${progress.byLevel.A2.total}, B1 ${progress.byLevel.B1.done}/${progress.byLevel.B1.total}). Mention it briefly when it changes.`,
  ];
  return lines.join('\n');
}
