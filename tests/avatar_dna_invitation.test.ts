const emitAppEvent = jest.fn();
let currentGeneration = 2;

jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => emitAppEvent(...args) }));
jest.mock('../app/remote_flags', () => ({ isAvatarDNAEnabled: () => true }));
jest.mock('../app/account_generation', () => ({
  isCurrentAccountGeneration: (token: { generation: number; stableId: string }, stableId: string) => (
    token.generation === currentGeneration && token.stableId === stableId
  ),
  withAccountTransitionLock: (work: () => Promise<unknown>) => work(),
}));

import {
  dismissAvatarDNAInvitation,
  onFirstAchievement,
  readInvitationState,
} from '../app/avatar_dna_invitation';

describe('Avatar DNA first-achievement invitation', () => {
  beforeEach(() => {
    emitAppEvent.mockClear();
    currentGeneration = 2;
  });

  it('offers once, is dismissible and never blocks the achievement flow', async () => {
    await expect(onFirstAchievement({ stableId: 'u1', generation: 2 })).resolves.toBe('offered');
    expect(emitAppEvent).toHaveBeenCalledWith('avatar_dna_invitation_requested', { source: 'first_achievement' });
    expect(await readInvitationState('u1', 2)).toMatchObject({ offered: true, dismissed: false, completed: false });

    await expect(dismissAvatarDNAInvitation('u1', 2)).resolves.toBe(true);
    await expect(onFirstAchievement({ stableId: 'u1', generation: 2 })).resolves.toBe('already-handled');
    expect(emitAppEvent).toHaveBeenCalledTimes(1);
    expect(await readInvitationState('u1', 2)).toMatchObject({ offered: true, dismissed: true, completed: false });
  });

  it('does not write or emit for a stale account generation', async () => {
    currentGeneration = 3;
    await expect(onFirstAchievement({ stableId: 'stale', generation: 2 })).resolves.toBe('stale-account');
    expect(await readInvitationState('stale', 2)).toBeNull();
    expect(emitAppEvent).not.toHaveBeenCalled();
  });
});
