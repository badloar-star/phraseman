// зачем: expo-haptics — ESM-пакет, jest.rntl.config его не транспилирует, и любой
// компонент через PressableHybrid → hooks/use-haptics ронял сьют на импорте
// («Cannot use import statement outside a module»), не дойдя до тестов
// (обнаружено 2026-08-22 на registration_prompt_modal_lifecycle). Мок повторяет
// используемый в hooks/use-haptics.ts срез API; вибрация в тестах не нужна.
module.exports = {
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Soft: 'soft', Light: 'light', Medium: 'medium', Heavy: 'heavy', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
};
