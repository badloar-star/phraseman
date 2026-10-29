import { leaveAfterCommunityDraftSave } from '../app/community_packs/communityDraftNavigation';

it('waits for saving and ignores a second navigation while the first is pending', async () => {
  let complete!: () => void;
  const save = jest.fn(() => new Promise<void>(resolve => { complete = resolve; }));
  const leave = jest.fn(); const error = jest.fn(); const lock = { current: false };
  const first = leaveAfterCommunityDraftSave({ lock, save, leave, error, isCurrent: () => true });
  await leaveAfterCommunityDraftSave({ lock, save, leave, error, isCurrent: () => true });
  expect(save).toHaveBeenCalledTimes(1);
  expect(leave).not.toHaveBeenCalled();
  complete(); await first;
  expect(leave).toHaveBeenCalledTimes(1);
});

it('retains the editor after a failed save and permits retry', async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce(undefined);
  const leave = jest.fn(); const error = jest.fn(); const lock = { current: false };
  await leaveAfterCommunityDraftSave({ lock, save, leave, error, isCurrent: () => true });
  expect(leave).not.toHaveBeenCalled(); expect(error).toHaveBeenCalledTimes(1);
  await leaveAfterCommunityDraftSave({ lock, save, leave, error, isCurrent: () => true });
  expect(leave).toHaveBeenCalledTimes(1);
});

it('does not navigate or display an old-account error after the account changes', async () => {
  const leave = jest.fn(); const error = jest.fn(); const lock = { current: false };
  await leaveAfterCommunityDraftSave({ lock, save: async () => {}, leave, error, isCurrent: () => false });
  await leaveAfterCommunityDraftSave({ lock, save: async () => { throw new Error('Account changed'); }, leave, error, isCurrent: () => false });
  expect(leave).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
  expect(lock.current).toBe(false);
});

it('retains newer edits made while saving, then permits leaving after saving them', async () => {
  let complete!: () => void;
  let revision = 1;
  const savedRevision = revision;
  const leave = jest.fn(); const error = jest.fn(); const lock = { current: false };
  const pending = leaveAfterCommunityDraftSave({
    lock, save: () => new Promise<void>(resolve => { complete = resolve; }), leave, error,
    isCurrent: () => revision === savedRevision,
  });
  revision = 2;
  complete(); await pending;
  expect(leave).not.toHaveBeenCalled();
  await leaveAfterCommunityDraftSave({ lock, save: async () => {}, leave, error, isCurrent: () => revision === 2 });
  expect(leave).toHaveBeenCalledTimes(1);
});
