export type DevToolAction =
  | 'preview-level-standard'
  | 'preview-level-milestone'
  | 'preview-lesson-results'
  | 'preview-spin-reward'
  | 'preview-compass-review'
  | 'preview-compass-lesson'
  | 'preview-compass-weak-area'
  | 'preview-league-promoted'
  | 'preview-league-demoted'
  | 'preview-league-stay'
  | 'preview-league-rank-mismatch'
  | 'grant-plus'
  | 'revoke-plus';

export type DevToolIcon =
  | 'flash-outline'
  | 'sparkles-outline'
  | 'trophy-outline'
  | 'sync-outline'
  | 'compass-outline'
  | 'hourglass-outline'
  | 'analytics-outline'
  | 'map-outline'
  | 'chatbubbles-outline'
  | 'book-outline'
  | 'add-circle-outline'
  | 'remove-circle-outline'
  | 'trending-up-outline'
  | 'trending-down-outline'
  | 'shield-checkmark-outline'
  | 'bug-outline';

export type DevTool = Readonly<{
  id: string;
  order: number;
  title: string;
  detail: string;
  actionLabel: string;
  action: DevToolAction;
  icon: DevToolIcon;
  testID: string;
  tone?: 'default' | 'danger';
}>;

export type DevToolSection = Readonly<{
  id: string;
  order: number;
  title: string;
  icon: 'sparkles-outline' | 'compass-outline' | 'key-outline' | 'trophy-outline';
  testID: string;
  tools: readonly DevTool[];
}>;

export const DEV_TOOL_SECTIONS = [
  {
    id: 'level-previews',
    order: 10,
    title: 'Повышение уровня',
    icon: 'sparkles-outline',
    testID: 'dev-hub-section-previews',
    tools: [
      {
        id: 'level-standard',
        order: 10,
        title: 'Обычное повышение',
        detail: 'Быстрый вариант со спином. Прогресс не изменится.',
        actionLabel: 'Показать',
        action: 'preview-level-standard',
        icon: 'flash-outline',
        testID: 'dev-preview-level-up-standard',
      },
      {
        id: 'level-milestone',
        order: 20,
        title: 'Каждый 5-й уровень',
        detail: 'Более заметная анимация и спин без начисления награды.',
        actionLabel: 'Показать',
        action: 'preview-level-milestone',
        icon: 'sparkles-outline',
        testID: 'dev-preview-level-up-milestone',
      },
      {
        id: 'lesson-results',
        order: 30,
        title: 'Результат урока',
        detail: 'Учебный пример наград без сохранения прогресса.',
        actionLabel: 'Показать',
        action: 'preview-lesson-results',
        icon: 'trophy-outline',
        testID: 'dev-preview-lesson-results',
      },
      {
        id: 'spin-reward',
        order: 40,
        title: '+1 Спин',
        detail: 'Показывает только overlay-анимацию получения Спина поверх текущего окна.',
        actionLabel: 'Показать',
        action: 'preview-spin-reward',
        icon: 'sync-outline',
        testID: 'dev-preview-spin-reward',
      },
    ],
  },
  {
    id: 'compass',
    order: 20,
    title: 'Компас',
    icon: 'compass-outline',
    testID: 'dev-hub-section-compass',
    tools: [
      {
        id: 'compass-review',
        order: 10,
        title: 'Повтор фраз',
        detail: 'Готовая персональная рекомендация повторить фразы.',
        actionLabel: 'Открыть',
        action: 'preview-compass-review',
        icon: 'chatbubbles-outline',
        testID: 'dev-preview-compass-review',
      },
      {
        id: 'compass-lesson',
        order: 20,
        title: 'Продолжение сессии',
        detail: 'Готовая рекомендация продолжить начатую сессию.',
        actionLabel: 'Открыть',
        action: 'preview-compass-lesson',
        icon: 'book-outline',
        testID: 'dev-preview-compass-lesson',
      },
      {
        id: 'compass-weak-area',
        order: 30,
        title: 'Сложный паттерн',
        detail: 'Готовая точечная рекомендация закрепить паттерн.',
        actionLabel: 'Открыть',
        action: 'preview-compass-weak-area',
        icon: 'compass-outline',
        testID: 'dev-preview-compass-weak-area',
      },
    ],
  },
  // зачем 13.08.2026: настоящие итоги недели показываются только в понедельник
  // после ролловера — проверить три исхода на живом устройстве было нечем.
  // Здесь модалка открывается с синтетическим результатом: прогресс, лига и
  // сохранённый pending не меняются.
  {
    id: 'league',
    order: 25,
    title: 'Лига · итоги недели',
    icon: 'trophy-outline',
    testID: 'dev-hub-section-league',
    tools: [
      {
        id: 'league-promoted',
        order: 10,
        title: 'Повышение',
        detail: 'Зелёный исход: место в зоне повышения, переход в лигу выше.',
        actionLabel: 'Показать',
        action: 'preview-league-promoted',
        icon: 'trending-up-outline',
        testID: 'dev-preview-league-promoted',
      },
      {
        id: 'league-demoted',
        order: 20,
        title: 'Понижение',
        detail: 'Красный исход: место в зоне вылета, переход в лигу ниже.',
        actionLabel: 'Показать',
        action: 'preview-league-demoted',
        icon: 'trending-down-outline',
        testID: 'dev-preview-league-demoted',
      },
      {
        id: 'league-stay',
        order: 30,
        title: 'Остаёшься в лиге',
        detail: 'Нейтральный исход: место сразу за зоной повышения.',
        actionLabel: 'Показать',
        action: 'preview-league-stay',
        icon: 'shield-checkmark-outline',
        testID: 'dev-preview-league-stay',
      },
      {
        id: 'league-rank-mismatch',
        order: 40,
        title: 'Отставший снимок группы',
        detail: 'Сервер отдал место 2, а очки в снимке старые. Моя строка обязана стоять второй.',
        actionLabel: 'Показать',
        action: 'preview-league-rank-mismatch',
        icon: 'bug-outline',
        testID: 'dev-preview-league-rank-mismatch',
      },
    ],
  },
  {
    id: 'subscription',
    order: 30,
    title: 'Plus',
    icon: 'key-outline',
    testID: 'dev-hub-section-access',
    tools: [
      {
        id: 'plus-grant',
        order: 10,
        title: 'Выдать Plus',
        detail: 'Включает Plus локально для текущего аккаунта на этом устройстве.',
        actionLabel: 'Выдать',
        action: 'grant-plus',
        icon: 'add-circle-outline',
        testID: 'dev-plus-grant',
      },
      {
        id: 'plus-revoke',
        order: 20,
        title: 'Снять Plus',
        detail: 'Убирает только локальную DEV-выдачу. Покупка и VIP сохраняются.',
        actionLabel: 'Снять',
        action: 'revoke-plus',
        icon: 'remove-circle-outline',
        testID: 'dev-plus-remove',
        tone: 'danger',
      },
    ],
  },
] as const satisfies readonly DevToolSection[];

export function getOrderedDevToolSections(): readonly DevToolSection[] {
  return [...DEV_TOOL_SECTIONS]
    .sort((left, right) => left.order - right.order)
    .map((section) => ({
      ...section,
      tools: [...section.tools].sort((left, right) => left.order - right.order),
    }));
}
