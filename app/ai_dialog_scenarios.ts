/**
 * Каталог сценариев ИИ-диалогов.
 * Данные используются меню диалогов, сценарной сессией и промптом premiumDialogSend.
 */

export type DialogScenarioCategory = 'everyday' | 'travel' | 'social';

export interface DialogScenario {
  id: string;
  category: DialogScenarioCategory;
  titleRu: string;
  goalRu: string;
  role: string;
  setting: string;
  goalEn: string;
  cefr: 'A1' | 'A2' | 'B1' | 'B2';
  icon: string;
  active: boolean;
  nextStepHintRu: string;
  sourceLessonId?: number;
  hiddenFromHome?: boolean;
  requiredPhraseIds?: string[];
}

export interface DialogScenarioGroup {
  category: DialogScenarioCategory;
  labelRu: string;
  shortLabelRu: string;
}

export const DIALOG_SCENARIO_GROUPS: readonly DialogScenarioGroup[] = [
  { category: 'everyday', labelRu: 'Каждый день', shortLabelRu: 'День' },
  { category: 'travel', labelRu: 'Путешествия', shortLabelRu: 'Поездки' },
  { category: 'social', labelRu: 'Общение', shortLabelRu: 'Люди' },
];

export const DIALOG_SCENARIOS: readonly DialogScenario[] = [
  {
    id: 'coffee',
    category: 'everyday',
    titleRu: 'Закажи кофе',
    goalRu: 'Закажи капучино, уточни размер и спроси цену',
    role: 'a friendly barista',
    setting: 'a cozy coffee shop',
    goalEn: 'order a cappuccino, choose a size, and ask the price',
    cefr: 'A1',
    icon: 'cafe-outline',
    active: true,
    nextStepHintRu: 'Попроси капучино, уточни размер или спроси цену своими словами.',
  },
  {
    id: 'grocery',
    category: 'everyday',
    titleRu: 'В продуктовом',
    goalRu: 'Найди молоко, спроси про свежий хлеб и оплати покупку',
    role: 'a helpful grocery store worker',
    setting: 'a small neighborhood grocery store',
    goalEn: 'find milk, ask about fresh bread, and pay for the items',
    cefr: 'A1',
    icon: 'basket-outline',
    active: true,
    nextStepHintRu: 'Спроси, где молоко, или уточни, есть ли свежий хлеб.',
  },
  {
    id: 'clothes_shop',
    category: 'everyday',
    titleRu: 'Магазин одежды',
    goalRu: 'Попроси другой размер, примерочную и узнай цену',
    role: 'a helpful clothing store assistant',
    setting: 'a clothing store',
    goalEn: 'ask for another size, request a fitting room, and ask the price',
    cefr: 'A2',
    icon: 'shirt-outline',
    active: true,
    nextStepHintRu: 'Попроси другой размер или спроси, можно ли примерить вещь.',
  },
  {
    id: 'pharmacy',
    category: 'everyday',
    titleRu: 'В аптеке',
    goalRu: 'Объясни простую проблему и спроси, как принимать лекарство',
    role: 'a careful pharmacist',
    setting: 'a pharmacy counter',
    goalEn: 'describe a simple health problem and ask how to take the medicine',
    cefr: 'A2',
    icon: 'medical-outline',
    active: true,
    nextStepHintRu: 'Опиши простую проблему и спроси, как часто принимать лекарство.',
  },
  {
    id: 'restaurant',
    category: 'everyday',
    titleRu: 'В ресторане',
    goalRu: 'Попроси столик, закажи блюдо и уточни счёт',
    role: 'a polite restaurant waiter',
    setting: 'a casual restaurant',
    goalEn: 'ask for a table, order food, and request the bill',
    cefr: 'A2',
    icon: 'restaurant-outline',
    active: true,
    nextStepHintRu: 'Попроси столик, закажи блюдо или попроси счёт.',
  },
  {
    id: 'doctor_visit',
    category: 'everyday',
    titleRu: 'У врача',
    goalRu: 'Расскажи о симптомах, ответь на вопросы и уточни следующий шаг',
    role: 'a calm family doctor',
    setting: 'a doctor appointment',
    goalEn: 'describe symptoms, answer follow-up questions, and ask what to do next',
    cefr: 'B1',
    icon: 'fitness-outline',
    active: true,
    nextStepHintRu: 'Расскажи, что болит и как давно, затем спроси, что делать дальше.',
  },
  {
    id: 'phone_delivery',
    category: 'everyday',
    titleRu: 'Доставка',
    goalRu: 'Позвони курьеру, уточни адрес и время доставки',
    role: 'a delivery courier on the phone',
    setting: 'a short delivery phone call',
    goalEn: 'confirm the address and delivery time with a courier',
    cefr: 'A2',
    icon: 'call-outline',
    active: true,
    nextStepHintRu: 'Назови адрес и уточни, когда курьер приедет.',
  },
  {
    id: 'hotel_checkin',
    category: 'travel',
    titleRu: 'Заселение в отель',
    goalRu: 'Зарегистрируйся, спроси про завтрак и Wi-Fi',
    role: 'a hotel receptionist',
    setting: 'a hotel front desk',
    goalEn: 'check in and ask about breakfast and Wi-Fi',
    cefr: 'A2',
    icon: 'bed-outline',
    active: true,
    nextStepHintRu: 'Скажи, что у тебя бронь, и спроси про завтрак или Wi-Fi.',
  },
  {
    id: 'airport_checkin',
    category: 'travel',
    titleRu: 'В аэропорту',
    goalRu: 'Зарегистрируйся на рейс, сдай багаж и спроси про выход',
    role: 'an airline check-in agent',
    setting: 'an airport check-in desk',
    goalEn: 'check in for a flight, drop off luggage, and ask about the gate',
    cefr: 'A2',
    icon: 'airplane-outline',
    active: true,
    nextStepHintRu: 'Покажи паспорт, спроси про багаж или номер выхода.',
  },
  {
    id: 'taxi',
    category: 'travel',
    titleRu: 'Такси',
    goalRu: 'Назови адрес, уточни цену и попроси ехать медленнее',
    role: 'a taxi driver',
    setting: 'a taxi ride in a new city',
    goalEn: 'give an address, ask about the price, and ask the driver to slow down',
    cefr: 'A2',
    icon: 'car-outline',
    active: true,
    nextStepHintRu: 'Назови адрес и спроси примерную цену поездки.',
  },
  {
    id: 'train_station',
    category: 'travel',
    titleRu: 'На вокзале',
    goalRu: 'Купи билет, уточни платформу и время отправления',
    role: 'a train station ticket clerk',
    setting: 'a train station ticket office',
    goalEn: 'buy a ticket and ask about the platform and departure time',
    cefr: 'A2',
    icon: 'train-outline',
    active: true,
    nextStepHintRu: 'Попроси билет и уточни платформу или время отправления.',
  },
  {
    id: 'lost_luggage',
    category: 'travel',
    titleRu: 'Потерянный багаж',
    goalRu: 'Опиши чемодан, оставь контакты и спроси, когда ждать ответ',
    role: 'an airport lost luggage officer',
    setting: 'an airport baggage service desk',
    goalEn: 'describe a missing suitcase, leave contact details, and ask when to expect news',
    cefr: 'B1',
    icon: 'briefcase-outline',
    active: true,
    nextStepHintRu: 'Скажи, что багаж пропал, и опиши чемодан.',
  },
  {
    id: 'tourist_info',
    category: 'travel',
    titleRu: 'Туристический центр',
    goalRu: 'Спроси дорогу, часы работы музея и лучший маршрут',
    role: 'a tourist information assistant',
    setting: 'a tourist information desk',
    goalEn: 'ask for directions, museum opening hours, and the best route',
    cefr: 'A2',
    icon: 'map-outline',
    active: true,
    nextStepHintRu: 'Спроси дорогу до места или часы работы.',
  },
  {
    id: 'car_rental',
    category: 'travel',
    titleRu: 'Аренда машины',
    goalRu: 'Забронируй машину, уточни страховку и время возврата',
    role: 'a car rental agent',
    setting: 'a car rental desk',
    goalEn: 'rent a car, ask about insurance, and confirm the return time',
    cefr: 'B1',
    icon: 'key-outline',
    active: true,
    nextStepHintRu: 'Скажи про бронь машины и спроси, включена ли страховка.',
  },
  {
    id: 'first_meeting',
    category: 'social',
    titleRu: 'Знакомство',
    goalRu: 'Поздоровайся, расскажи о себе и задай простой вопрос',
    role: 'a friendly new acquaintance at a party',
    setting: 'a casual social gathering',
    goalEn: 'introduce yourself, say a little about yourself, and ask a simple question',
    cefr: 'A1',
    icon: 'people-outline',
    active: true,
    nextStepHintRu: 'Поздоровайся, назови своё имя и задай простой вопрос.',
  },
  {
    id: 'small_talk_neighbor',
    category: 'social',
    titleRu: 'Сосед',
    goalRu: 'Поддержи короткий разговор о погоде, доме и районе',
    role: 'a friendly neighbor',
    setting: 'a short chat near the apartment building',
    goalEn: 'make small talk about the weather, the building, and the neighborhood',
    cefr: 'A2',
    icon: 'home-outline',
    active: true,
    nextStepHintRu: 'Поддержи small talk: погода, дом или район.',
  },
  {
    id: 'work_call',
    category: 'social',
    titleRu: 'Рабочий созвон',
    goalRu: 'Поздоровайся, объясни статус задачи и договорись о следующем шаге',
    role: 'a supportive colleague on a video call',
    setting: 'a short work video call',
    goalEn: 'greet a colleague, explain task status, and agree on the next step',
    cefr: 'B1',
    icon: 'videocam-outline',
    active: true,
    nextStepHintRu: 'Скажи статус задачи и предложи следующий шаг.',
  },
  {
    id: 'ask_for_help',
    category: 'social',
    titleRu: 'Попросить помощь',
    goalRu: 'Вежливо попроси помочь, объясни проблему и поблагодари',
    role: 'a kind person at a public place',
    setting: 'a public place where the learner needs help',
    goalEn: 'politely ask for help, explain the problem, and say thanks',
    cefr: 'A2',
    icon: 'help-circle-outline',
    active: true,
    nextStepHintRu: 'Вежливо попроси помочь и коротко объясни проблему.',
  },
  {
    id: 'invite_friend',
    category: 'social',
    titleRu: 'Пригласить друга',
    goalRu: 'Пригласи человека встретиться, предложи время и место',
    role: 'a friendly coworker after work',
    setting: 'a casual chat after work',
    goalEn: 'invite someone to meet, suggest a time, and suggest a place',
    cefr: 'A2',
    icon: 'calendar-outline',
    active: true,
    nextStepHintRu: 'Пригласи встретиться и предложи время или место.',
  },
  {
    id: 'complaint_order',
    category: 'social',
    titleRu: 'Проблема с заказом',
    goalRu: 'Спокойно объясни проблему, попроси замену или возврат',
    role: 'a customer support agent',
    setting: 'a customer support chat about a wrong order',
    goalEn: 'explain a problem with an order and ask for a replacement or refund',
    cefr: 'B1',
    icon: 'receipt-outline',
    active: true,
    nextStepHintRu: 'Спокойно объясни, что не так с заказом, и попроси решение.',
  },
  {
    id: 'lesson18_restaurant_table',
    category: 'everyday',
    titleRu: 'Столик в ресторане',
    goalRu: 'Забронируй столик, уточни время и ответь на короткий вопрос',
    role: 'a polite restaurant host',
    setting: 'a casual restaurant entrance',
    goalEn: 'reserve a table, confirm the time, and answer one short follow-up question',
    cefr: 'B1',
    icon: 'restaurant-outline',
    active: true,
    hiddenFromHome: true,
    sourceLessonId: 18,
    requiredPhraseIds: ['lesson18_phrase_31', 'lesson18_phrase_32', 'lesson18_phrase_33'],
    nextStepHintRu: 'Попроси столик и уточни время одним коротким предложением.',
  },
  {
    id: 'lesson20_lost_bag',
    category: 'everyday',
    titleRu: 'Потерянная сумка',
    goalRu: 'Скажи, что у тебя есть сумка, где она была, и уточни вариант',
    role: 'a helpful lost-and-found worker',
    setting: 'a lost-and-found desk',
    goalEn: 'say what you have, explain where the bag was, and confirm the option',
    cefr: 'B1',
    icon: 'bag-outline',
    active: true,
    hiddenFromHome: true,
    sourceLessonId: 20,
    requiredPhraseIds: ['lesson20_phrase_1', 'lesson20_phrase_5', 'lesson20_phrase_50'],
    nextStepHintRu: 'Скажи, какая вещь потерялась и где она была.',
  },
];

export function getScenarioById(id: string): DialogScenario | undefined {
  return DIALOG_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getPublicDialogScenarios(): DialogScenario[] {
  return DIALOG_SCENARIOS.filter((scenario) => scenario.active && !scenario.hiddenFromHome);
}

export function getScenariosByCategory(category: DialogScenarioCategory): DialogScenario[] {
  return getPublicDialogScenarios().filter((scenario) => scenario.category === category);
}
