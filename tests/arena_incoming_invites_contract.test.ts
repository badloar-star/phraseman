import fs from 'fs';
import path from 'path';

const arenaLobbySource = () =>
  fs.readFileSync(path.join(__dirname, '..', 'app', 'arena_lobby.tsx'), 'utf8');

describe('arena incoming friend invites contract', () => {
  it('subscribes to pending incoming invites and exposes accept/decline actions in the lobby', () => {
    const source = arenaLobbySource();

    expect(source).toContain('subscribeIncomingArenaInvites');
    expect(source).toContain('setArenaInviteStatus');
    expect(source).toContain('handleIncomingArenaInviteAccept');
    expect(source).toContain('handleIncomingArenaInviteDecline');
    expect(source).toContain('arena-incoming-invite-accept');
    expect(source).toContain('arena-incoming-invite-decline');
    expect(source).toContain('joinArenaFriendRoomAsGuest');
  });
});
