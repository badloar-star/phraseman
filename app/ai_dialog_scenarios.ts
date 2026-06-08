/**
 * Каталог сценариев ИИ-диалогов (Фаза 0).
 * Данные для меню (ai_dialog_home) и сессии (ai_dialog_session).
 * В Фазе 0 активен только 'coffee'; остальные — locked (UX-проверка меню как у уроков).
 */

export type DialogScenarioCategory = 'everyday' | 'travel' | 'social';

export interface DialogScenario {
  id: string;
  category: DialogScenarioCategory;
  /** Заголовок карточки (RU) */
  titleRu: string;
  /** Подпись-цель карточки/хедера (RU) */
  goalRu: string;
  /** Параметры для system-промпта (EN) — уходят в premiumDialogSend */
  role: string;
  setting: string;
  goalEn: string;
  /** Уровень сложности */
  cefr: 'A1' | 'A2' | 'B1' | 'B2';
  /** Ionicons-имя для карточки */
  icon: string;
  /** Активен в текущей фазе (false → locked-карточка) */
  active: boolean;
}

export interface DialogScenarioGroup {
  category: DialogScenarioCategory;
  labelRu: string;
}

export const DIALOG_SCENARIO_GROUPS: readonly DialogScenarioGroup[] = [
  { category: 'everyday', labelRu: 'Каждый день' },
  { category: 'travel', labelRu: 'Путешествия' },
  { category: 'social', labelRu: 'Общение' },
];

export const DIALOG_SCENARIOS: readonly DialogScenario[] = [
  {
    id: 'coffee',
    category: 'everyday',
    titleRu: 'Закажи кофе',
    goalRu: 'Закажи капучино и спроси цену',
    role: 'a friendly barista',
    setting: 'a cozy coffee shop',
    goalEn: 'order a cappuccino and ask the price',
    cefr: 'A2',
    icon: 'cafe-outline',
    active: true,
  },
  {
    id: 'shop',
    category: 'everyday',
    titleRu: 'В магазине',
    goalRu: 'Найди нужный размер и расплатись',
    role: 'a helpful shop assistant',
    setting: 'a clothing store',
    goalEn: 'find the right size and pay',
    cefr: 'A2',
    icon: 'bag-handle-outline',
    active: false,
  },
  {
    id: 'hotel',
    category: 'travel',
    titleRu: 'Заселение в отель',
    goalRu: 'Зарегистрируйся и спроси про завтрак',
    role: 'a hotel receptionist',
    setting: 'a hotel front desk',
    goalEn: 'check in and ask about breakfast',
    cefr: 'A2',
    icon: 'bed-outline',
    active: false,
  },
  {
    id: 'airport',
    category: 'travel',
    titleRu: 'В аэропорту',
    goalRu: 'Зарегистрируйся на рейс и сдай багаж',
    role: 'an airline check-in agent',
    setting: 'an airport check-in desk',
    goalEn: 'check in for a flight and drop off luggage',
    cefr: 'B1',
    icon: 'airplane-outline',
    active: false,
  },
  {
    id: 'meeting',
    category: 'social',
    titleRu: 'Знакомство',
    goalRu: 'Познакомься и расскажи о себе',
    role: 'a friendly new acquaintance at a party',
    setting: 'a casual social gathering',
    goalEn: 'introduce yourself and make small talk',
    cefr: 'A2',
    icon: 'people-outline',
    active: false,
  },
];

export function getScenarioById(id: string): DialogScenario | undefined {
  return DIALOG_SCENARIOS.find((s) => s.id === id);
}

export function getScenariosByCategory(category: DialogScenarioCategory): DialogScenario[] {
  return DIALOG_SCENARIOS.filter((s) => s.category === category);
}
