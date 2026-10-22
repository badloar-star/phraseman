import { readFileSync } from 'fs';
import { join } from 'path';
import { anonymizeDuelDoc, anonymizeDuelNotification, anonymizedDuelId } from './account_delete_friend_duels';

// ЗАМОК ВЛАДЕЛЬЦА 22.10: «Друг удалил аккаунт. Что видно в ваших общих дуэлях?» → «История остаётся, имя скрыто».
// Сторож падает, если удаление аккаунта снова стирает историю друга или оставляет в ней uid, ник или аватар удалённого.
// Ослабить или удалить — только по новому слову владельца (docs/work/OWNER_LOCKS.md).

const DELETED = 'uid-deleted-aaaaaaaa';
const FRIEND = 'uid-friend-bbbbbbbb';
const DUEL_ID = `${DELETED}__${FRIEND}_3`;

describe('ЗАМОК ВЛАДЕЛЬЦА 22.10 «История остаётся, имя скрыто» — дуэли удалённого игрока', () => {
  test('законченная дуэль остаётся у друга: ходы и итог целы, uid удалённого нет нигде', () => {
    const anon = anonymizeDuelDoc({
      uids: [DELETED, FRIEND].sort(), challengerUid: DELETED, opponentUid: FRIEND, status: 'finished',
      challengerMove: { results: [true, false, true, true, true], elapsedMs: 41_000 },
      opponentMove: { results: [true, true, true, true, false], elapsedMs: 39_000 },
      outcomeForChallenger: 'lose', phraseIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
    }, DELETED);
    expect(anon).not.toBeNull();
    expect(anon?.survivorUid).toBe(FRIEND);
    expect(anon?.doc.uids).toEqual([FRIEND]);
    expect(anon?.doc.challengerUid).toBeNull();
    expect(anon?.doc.opponentUid).toBe(FRIEND);
    expect(anon?.doc.deletedPlayerRole).toBe('challenger');
    expect(anon?.doc.outcomeForChallenger).toBe('lose');
    expect(anon?.doc.opponentMove).toEqual({ results: [true, true, true, true, false], elapsedMs: 39_000 });
    expect(JSON.stringify(anon?.doc)).not.toContain(DELETED);
  });

  test('новый id дуэли не содержит uid и одинаков для дуэли и уведомления', () => {
    expect(anonymizedDuelId(DUEL_ID)).toMatch(/^anon_[0-9a-f]{32}$/);
    expect(anonymizedDuelId(DUEL_ID)).not.toContain(DELETED);
  });

  test('открытый вызов не хранится (ответить уже некому)', () => {
    expect(anonymizeDuelDoc({ uids: [DELETED, FRIEND], challengerUid: DELETED, opponentUid: FRIEND, status: 'open' }, DELETED)).toBeNull();
  });

  test('уведомление об итоге у друга: результат остаётся, имя/аватар/uid скрыты, помечено «удалённый игрок»', () => {
    const anon = anonymizeDuelNotification({
      type: 'friend_nudge', fromUid: DELETED, fromName: 'Max', fromAvatar: 'https://x/a.png', text: 'Итог дуэли',
      nav: { kind: 'friend_event', action: 'duel_result', actorStableUid: DELETED, eventId: `friend_duel_result_${DUEL_ID}`,
        duelId: DUEL_ID, outcome: 'win', mine: { correct: 4 }, theirs: { correct: 3 }, phraseIds: ['p1'] },
    });
    expect(anon).not.toBeNull();
    expect(anon?.doc.fromDeleted).toBe(true);
    expect(anon?.doc.fromName).toBe('');
    expect(anon?.doc.fromAvatar).toBe('');
    expect((anon?.doc.nav as Record<string, unknown>).outcome).toBe('win');
    expect(anon?.newId).not.toContain(DELETED);
    expect(JSON.stringify(anon?.doc)).not.toContain(DELETED);
    expect(JSON.stringify(anon?.doc)).not.toContain('Max');
  });

  test('вызов на дуэль и прочие уведомления удалённого не сохраняются (их стирает общий шаг)', () => {
    expect(anonymizeDuelNotification({ fromUid: DELETED, nav: { action: 'duel_challenge', duelId: DUEL_ID } })).toBeNull();
    expect(anonymizeDuelNotification({ fromUid: DELETED, nav: { action: 'hello' } })).toBeNull();
  });

  test('шаг обезличивания стоит в удалении аккаунта ДО шагов, которые стирают дуэли и уведомления', () => {
    const src = readFileSync(join(__dirname, 'account_delete.ts'), 'utf8');
    const anonymize = src.indexOf("'friend_duels_anonymize'");
    expect(anonymize).toBeGreaterThan(0);
    expect(anonymize).toBeLessThan(src.indexOf("runDeleteStage(ctx, stats, 'field_matches'"));
    expect(anonymize).toBeLessThan(src.indexOf("runDeleteStage(ctx, stats, 'collection_group_matches'"));
  });
});
