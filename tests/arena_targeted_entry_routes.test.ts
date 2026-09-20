import fs from 'fs';
import path from 'path';
import { arenaInviteRouteFromPayload } from '../app/arena_notification_route';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

describe('Arena target-bound entry routes', () => {
  test('external invite payloads require both invite id and an explicit supported target', () => {
    expect(arenaInviteRouteFromPayload({ inviteId: 'invite-1', studyTarget: 'fr' })).toEqual({
      pathname: '/arena_invite', params: { inviteId: 'invite-1', studyTarget: 'fr' },
    });
    expect(arenaInviteRouteFromPayload({ inviteId: 'invite-1' })).toBe('/arena');
    expect(arenaInviteRouteFromPayload({ inviteId: 'invite-1', studyTarget: 'it' })).toBe('/arena');
    expect(arenaInviteRouteFromPayload({ studyTarget: 'en' })).toBe('/arena');
  });

  test('push handlers and the notification center share the fail-closed route helper', () => {
    for (const file of ['app/notification_tap_handler.ts', 'app/notifications.ts', 'components/NotificationCenterButton.tsx']) {
      expect(read(file)).toContain('arenaInviteRouteFromPayload');
    }
  });

  test('friend and invite entry screens never infer the route target from the current target', () => {
    for (const file of ['app/arena_friend_duel.tsx', 'app/arena_invite.tsx']) {
      const source = read(file);
      expect(source).toContain('arenaRouteStudyTarget(params.studyTarget, currentStudyTarget)');
      expect(source).not.toContain('frozenTargetRef.current ?? currentStudyTarget');
      expect(source).toContain("router.replace('/arena' as never)");
    }
  });

  test('all local Arena entry points attach the current canonical target', () => {
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toContain('useStudyTarget()');
    expect(friends).toContain('studyTarget, devBot:');
    expect(friends).toContain('studyTarget, friendStableUid:');
    expect(friends).toContain('inviteId: event.inviteId ?? event.id, studyTarget');

    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("pathname: '/arena_matchmaking'");
    expect(home).toContain("params: { studyTarget }");
  });
});

describe('Arena target-scoped residual screens', () => {
  test('history, tops and store use the current target in reads and warm cache keys', () => {
    const cases = [
      ['app/arena_history.tsx', 'arenaFetchMatchHistory(studyTarget)', "arenaPeekWarm('history', studyTarget"],
      ['app/arena_tops.tsx', 'arenaV2FriendsBoard(studyTarget)', "arenaPeekWarm('tops', studyTarget"],
      ['app/arena_star_wallet.tsx', 'arenaExpansionHome(studyTarget)', "arenaPeekWarm('store', studyTarget"],
    ] as const;
    for (const [file, request, cache] of cases) {
      const source = read(file);
      expect(source).toContain('useStudyTarget()');
      expect(source).toContain(request);
      expect(source).toContain(cache);
      expect(source).toContain('studyTarget, value:');
    }
  });

  test('review requires a route target and scopes both request and durable cache by it', () => {
    const source = read('app/arena_review.tsx');
    expect(source).toContain('studyTarget?: string');
    expect(source).toContain('arenaRouteStudyTarget(params.studyTarget, currentStudyTarget)');
    expect(source).toContain('studyTarget: routeStudyTarget');
    expect(source).toContain('arenaFetchMatchReview(reviewScope, matchId, routeStudyTarget)');
  });

  test('friend entry verifies the published target before spending energy', () => {
    for (const file of ['app/arena_friend_duel.tsx', 'app/arena_invite.tsx']) {
      const source = read(file);
      const readiness = source.indexOf('await arenaV2Home(studyTarget)');
      const debit = source.indexOf('await confirm');
      expect(readiness).toBeGreaterThan(-1);
      expect(debit).toBeGreaterThan(readiness);
      expect(source).toContain('availability.friendEnabled');
    }
  });
});
