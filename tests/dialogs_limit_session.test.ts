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

describe('dialogs_limit_session (lifetime free dialog counter)', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(FREE_DIALOG_USED_KEY);
    await AsyncStorage.removeItem(FREE_DIALOG_LEGACY_USED_KEY);
  });

  it('starts with two free dialogs available by default', async () => {
    expect(await getFreeDialogsUsed()).toBe(0);
    expect(await getFreeDialogsLeft()).toBe(2);
    expect(await hasUsedFreeDialog()).toBe(false);
    expect(await hasFreeDialogLeft()).toBe(true);
  });

  it('consumes free dialogs one by one', async () => {
    await markFreeDialogUsed();
    expect(await getFreeDialogsUsed()).toBe(1);
    expect(await getFreeDialogsLeft()).toBe(1);
    expect(await hasFreeDialogLeft()).toBe(true);

    await markFreeDialogUsed();
    expect(await getFreeDialogsUsed()).toBe(2);
    expect(await getFreeDialogsLeft()).toBe(0);
    expect(await hasUsedFreeDialog()).toBe(true);
    expect(await hasFreeDialogLeft()).toBe(false);
  });

  it('caps extra marks at the configured lifetime allowance', async () => {
    await markFreeDialogUsed();
    await markFreeDialogUsed();
    await markFreeDialogUsed();
    expect(await AsyncStorage.getItem(FREE_DIALOG_USED_KEY)).toBe('2');
    expect(await getFreeDialogsLeft()).toBe(0);
  });

  it('migrates the old boolean flag as one spent dialog', async () => {
    await AsyncStorage.setItem(FREE_DIALOG_LEGACY_USED_KEY, '1');
    expect(await getFreeDialogsUsed()).toBe(1);
    expect(await getFreeDialogsLeft()).toBe(1);
    expect(await hasFreeDialogLeft()).toBe(true);
  });
});
