import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FREE_DIALOG_LEGACY_USED_KEY,
  FREE_DIALOG_USED_KEY,
  getFreeDialogsLeft,
  getFreeDialogsUsed,
  hasFreeDialogLeft,
  hasUsedFreeDialog,
  markFreeDialogUsed,
} from '../app/dialogs_limit_session';

describe('dialogs_limit_session (legacy lifetime free dialog counter)', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(FREE_DIALOG_USED_KEY);
    await AsyncStorage.removeItem(FREE_DIALOG_LEGACY_USED_KEY);
  });

  it('starts with no free dialogs while Dialogs is Plus-only', async () => {
    expect(await getFreeDialogsUsed()).toBe(0);
    expect(await getFreeDialogsLeft()).toBe(0);
    expect(await hasUsedFreeDialog()).toBe(true);
    expect(await hasFreeDialogLeft()).toBe(false);
  });

  it('does not recreate a free allowance when old code marks usage', async () => {
    await markFreeDialogUsed();
    expect(await getFreeDialogsUsed()).toBe(0);
    expect(await getFreeDialogsLeft()).toBe(0);
    expect(await hasUsedFreeDialog()).toBe(true);
    expect(await hasFreeDialogLeft()).toBe(false);
  });

  it('caps extra marks at the configured lifetime allowance', async () => {
    await markFreeDialogUsed();
    await markFreeDialogUsed();
    await markFreeDialogUsed();
    expect(await AsyncStorage.getItem(FREE_DIALOG_USED_KEY)).toBe('0');
    expect(await getFreeDialogsLeft()).toBe(0);
  });

  it('does not restore access from the old boolean flag', async () => {
    await AsyncStorage.setItem(FREE_DIALOG_LEGACY_USED_KEY, '1');
    expect(await getFreeDialogsUsed()).toBe(0);
    expect(await getFreeDialogsLeft()).toBe(0);
    expect(await hasFreeDialogLeft()).toBe(false);
  });
});
