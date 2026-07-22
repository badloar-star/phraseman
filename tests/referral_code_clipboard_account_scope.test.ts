import {
  __resetAccountGenerationForTests,
  captureAccountGeneration,
  ensureAccountGeneration,
} from '../app/account_generation';
import { accountScopeKey } from '../app/account_scope_key';
import { copyReferralCodeForAccount } from '../app/referral_code_clipboard';

describe('referral code clipboard account scope', () => {
  beforeEach(() => __resetAccountGenerationForTests());

  test('invoking the stale A callback under B performs no clipboard write and no copied UI commit', async () => {
    ensureAccountGeneration('alice');
    const aliceToken = captureAccountGeneration();
    const aliceKey = accountScopeKey(aliceToken)!;
    const clipboardWrites: string[] = [];
    const readText = jest.fn(async () => 'BEFORE');

    ensureAccountGeneration('bob');
    const copied = await copyReferralCodeForAccount({
      accountToken: aliceToken,
      accountKey: aliceKey,
      code: 'ALICE1',
      readText,
      writeText: async (value) => { clipboardWrites.push(value); },
    });

    expect(clipboardWrites).toEqual([]);
    expect(readText).not.toHaveBeenCalled();
    expect(copied).toBe(false);
  });

  test('an account switch while a delayed native write awaits clears A from the final clipboard', async () => {
    ensureAccountGeneration('alice');
    const aliceToken = captureAccountGeneration();
    const aliceKey = accountScopeKey(aliceToken)!;
    let clipboard = 'BEFORE';
    let finishWrite!: () => void;
    let firstWrite = true;
    const writeText = jest.fn((value: string) => {
      if (!firstWrite) {
        clipboard = value;
        return Promise.resolve();
      }
      firstWrite = false;
      return new Promise<void>((resolve) => {
        finishWrite = () => {
          clipboard = value;
          resolve();
        };
      });
    });

    const pending = copyReferralCodeForAccount({
      accountToken: aliceToken,
      accountKey: aliceKey,
      code: 'ALICE1',
      readText: async () => clipboard,
      writeText,
    });
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('ALICE1');
    ensureAccountGeneration('bob');
    finishWrite();

    await expect(pending).resolves.toBe(false);
    expect(clipboard).toBe('');
    expect(writeText).toHaveBeenNthCalledWith(2, '');
  });

  test('compensation leaves a user clipboard change after the native write untouched', async () => {
    ensureAccountGeneration('alice');
    const aliceToken = captureAccountGeneration();
    const aliceKey = accountScopeKey(aliceToken)!;
    let clipboard = 'BEFORE';
    let finishWrite!: () => void;
    let firstWrite = true;
    const writeText = jest.fn((value: string) => {
      if (!firstWrite) {
        clipboard = value;
        return Promise.resolve();
      }
      firstWrite = false;
      return new Promise<void>((resolve) => {
        finishWrite = () => {
          clipboard = value;
          resolve();
          clipboard = 'USER-CHANGED';
        };
      });
    });

    const pending = copyReferralCodeForAccount({
      accountToken: aliceToken,
      accountKey: aliceKey,
      code: 'ALICE1',
      readText: async () => clipboard,
      writeText,
    });
    await Promise.resolve();
    ensureAccountGeneration('bob');
    finishWrite();

    await expect(pending).resolves.toBe(false);
    expect(clipboard).toBe('USER-CHANGED');
    expect(writeText).toHaveBeenCalledTimes(1);
  });
});
