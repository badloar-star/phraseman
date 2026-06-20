import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FREE_DIALOG_USED_KEY,
  hasUsedFreeDialog,
  markFreeDialogUsed,
  hasFreeDialogLeft,
} from '../app/dialogs_limit_session';

// Модель: ровно ОДИН пожизненный бесплатный диалог, общий на все режимы.
describe('dialogs_limit_session (lifetime one free dialog)', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(FREE_DIALOG_USED_KEY);
  });

  it('starts with the free dialog available', async () => {
    expect(await hasUsedFreeDialog()).toBe(false);
    expect(await hasFreeDialogLeft()).toBe(true);
  });

  it('consumes the single free dialog once marked', async () => {
    await markFreeDialogUsed();
    expect(await hasUsedFreeDialog()).toBe(true);
    expect(await hasFreeDialogLeft()).toBe(false);
  });

  it('is idempotent: marking twice still leaves it used (no second free dialog)', async () => {
    await markFreeDialogUsed();
    await markFreeDialogUsed();
    expect(await hasFreeDialogLeft()).toBe(false);
  });

  it('does NOT reset across "days" — it is lifetime, not daily', async () => {
    await markFreeDialogUsed();
    // No date logic exists anymore; the flag is a plain persisted boolean.
    expect(await AsyncStorage.getItem(FREE_DIALOG_USED_KEY)).toBe('1');
    expect(await hasFreeDialogLeft()).toBe(false);
  });
});
