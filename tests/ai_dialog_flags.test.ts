import { isAiDialogEnabled } from '../app/ai_dialog_flags';

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
});
