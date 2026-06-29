import {
  FREE_DIALOGS_LIFETIME_DEFAULT,
  getFreeDialogsLifetime,
  isAiDialogEnabled,
} from '../app/ai_dialog_flags';

describe('ai_dialog_flags', () => {
  const originalValue = process.env.EXPO_PUBLIC_AI_DIALOG_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.EXPO_PUBLIC_AI_DIALOG_ENABLED;
    } else {
      process.env.EXPO_PUBLIC_AI_DIALOG_ENABLED = originalValue;
    }
  });

  it('shows the dialogues entry point by default while keeping env override support', () => {
    delete process.env.EXPO_PUBLIC_AI_DIALOG_ENABLED;
    expect(isAiDialogEnabled()).toBe(true);

    process.env.EXPO_PUBLIC_AI_DIALOG_ENABLED = 'false';
    expect(isAiDialogEnabled()).toBe(false);
  });

  it('gives exactly TWO lifetime free dialogs (not a per-day reply count)', () => {
    // Подняли с 1 до 2 (2026-06-28): одна попытка не давала прочувствовать
    // ценность фичи до пейвола. Сервер (enforceLifetimeFreeDialog) держит тот же
    // лимит через счётчик freeDialogCount — числа ДОЛЖНЫ совпадать.
    expect(FREE_DIALOGS_LIFETIME_DEFAULT).toBe(2);
    expect(getFreeDialogsLifetime()).toBe(2);
  });
});
