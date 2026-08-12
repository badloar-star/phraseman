import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'node:crypto';
import {
  activityLikeSentDocId,
  activityLikeStateKey,
  PROFILE_LIKE_EVENT_ID,
} from '../app/friend_activity_likes';
import { friendActivityGiftCopy } from '../app/friend_activity_gift_copy';

describe('persistent friend activity likes', () => {
  test('uses the same deterministic per-target/per-event identity as the server', async () => {
    const targetUid = 'friend-a';
    const eventId = 'level-up-9';
    const expected = `al_${createHash('sha256')
      .update(`activity-like-v2\0${targetUid}\0${eventId}`, 'utf8')
      .digest('hex')
      .slice(0, 48)}`;

    await expect(activityLikeSentDocId(targetUid, eventId)).resolves.toBe(expected);
    expect(activityLikeStateKey(targetUid, eventId)).toBe(`${targetUid}\0${eventId}`);
    expect(activityLikeStateKey(targetUid)).toBe(`${targetUid}\0${PROFILE_LIKE_EVENT_ID}`);
  });

  test('describes an outgoing gift from the viewer perspective', () => {
    expect(friendActivityGiftCopy({
      type: 'friend_gift_received',
      friendName: 'Наталка',
      giftLabel: 'Щит цепочки',
      viewerUid: 'me',
      payload: { fromUid: 'me' },
      lang: 'ru',
    })).toBe('Вы отправили подарок: Щит цепочки → Наталка');
  });

  test('restores every liked post and contains no global daily-limit rollback', () => {
    const root = join(__dirname, '..');
    const friends = readFileSync(join(root, 'app/(tabs)/friends.tsx'), 'utf8');
    const profile = readFileSync(join(root, 'components/PlayerProfileModal.tsx'), 'utf8');
    const server = readFileSync(join(root, 'functions/src/friend_activity_likes.ts'), 'utf8');
    const synthetic = readFileSync(join(root, 'app/synthetic_activity_likes.ts'), 'utf8');

    expect(friends).toContain('fetchActivityLikeStates()');
    expect(friends).toContain('new Set(likeStates.map(state => activityLikeStateKey');
    expect(friends).toContain('setLikedActivityKeys(current => new Set(current).add(eventKey))');
    expect(profile).toContain('fetchActivityLikeState(uid)');
    expect(profile).not.toContain('resource-exhausted');
    expect(server).toContain("collection('friend_activity_likes_sent').doc(recordId)");
    expect(server).toContain('activityLikeReceiptId(senderStableId, targetStableId, eventId)');
    expect(server).toContain(".collection('friend_activity_like_daily_limits')");
    expect(server).toContain(".where('eventId', '==', eventId)");
    expect(server).not.toContain('Daily activity like limit reached');
    expect(synthetic).toContain("? { count: 1, lastLikedDateKey: 'persistent' }");
  });
});
