export type DevToolAction =
  | 'preview-level-standard'
  | 'preview-level-milestone'
  | 'preview-lesson-results'
  | 'preview-spin-reward'
  | 'grant-plus'
  | 'revoke-plus';

export type DevToolIcon =
  | 'flash-outline'
  | 'sparkles-outline'
  | 'trophy-outline'
  | 'sync-outline'
  | 'add-circle-outline'
  | 'remove-circle-outline';

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
  icon: 'sparkles-outline' | 'key-outline';
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
    id: 'subscription',
    order: 20,
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
