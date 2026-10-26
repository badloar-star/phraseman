// зачем (координатор 26.10, обязательная проверка Optimistic UI «Друзья»): удалённый или заблокированный друг не должен на секунду вернуться запоздавшим снимком списка —
// тот же приём «операция в пути», что у «Принять/Отклонить» (friends_pending_ops).
import fs from 'node:fs';
import path from 'node:path';

import { createPendingFriendOps, PENDING_FRIEND_OP_GRACE_MS } from '../app/friends_pending_ops';

type Friend = { uid: string; name?: string };
type Request = { fromUid: string };

const read = (relativePath: string): string => fs.readFileSync(path.join(path.resolve(__dirname, '..'), relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('friends_pending_ops: удаление и блокировка друга', () => {
  const stale: Friend[] = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }];

  it('пока операция идёт, снимок без правки не возвращает друга', () => {
    const ops = createPendingFriendOps<Friend, Request>();
    ops.begin('b', 'remove');
    expect(ops.mergeFriends(stale, 1000).map((f) => f.uid)).toEqual(['a', 'c']);
  });

  it('после успеха ещё несколько секунд прикрывает запоздавший снимок, потом снимок снова главный', () => {
    const ops = createPendingFriendOps<Friend, Request>();
    ops.begin('b', 'remove');
    ops.settle('b', true, 1000);
    expect(ops.mergeFriends(stale, 1000 + PENDING_FRIEND_OP_GRACE_MS - 1).map((f) => f.uid)).toEqual(['a', 'c']);
    expect(ops.mergeFriends(stale, 1000 + PENDING_FRIEND_OP_GRACE_MS + 1).map((f) => f.uid)).toEqual(['a', 'b', 'c']);
  });

  it('отказ сервера: запись снимается сразу, друг возвращается из снимка', () => {
    const ops = createPendingFriendOps<Friend, Request>();
    ops.begin('b', 'remove');
    ops.settle('b', false, 1000);
    expect(ops.mergeFriends(stale, 1001).map((f) => f.uid)).toEqual(['a', 'b', 'c']);
  });

  it('«принять» работает как прежде: добавляет принятого, которого в снимке ещё нет', () => {
    const ops = createPendingFriendOps<Friend, Request>();
    ops.begin('z', 'accept', { uid: 'z', name: 'Zed' });
    expect(ops.mergeFriends(stale, 1000).map((f) => f.uid)).toEqual(['a', 'b', 'c', 'z']);
  });

  it('удалил и сразу принял заново того же человека: последняя операция главная', () => {
    const ops = createPendingFriendOps<Friend, Request>();
    ops.begin('b', 'remove');
    ops.begin('b', 'accept', { uid: 'b' });
    expect(ops.mergeFriends(stale, 1000).map((f) => f.uid)).toEqual(['a', 'b', 'c']);
  });
});

describe('вкладка «Друзья»: удаление и блокировка используют операцию «в пути»', () => {
  const screen = read('app/(tabs)/friends.tsx');

  it('окно подтверждения удаления: begin → settle(успех) → settle(откат)', () => {
    const start = screen.indexOf('friendRemovalInFlightRef.current.add(target.uid);\n            const previousFriend');
    expect(start).toBeGreaterThan(0);
    const block = screen.slice(start, start + 4200);
    expect(block).toContain("pendingFriendOpsRef.current.begin(target.uid, 'remove')");
    expect(block).toContain('pendingFriendOpsRef.current.settle(target.uid, true, Date.now())');
    expect(block).toContain('pendingFriendOpsRef.current.settle(target.uid, false, Date.now())');
  });

  it('«Добавить»: аналитика не держит отправку заявки и показ ответа (без await)', () => {
    expect(screen).toContain("void trackActivity('friends:add_request_start'");
    expect(screen).toContain("void trackActivity('friends:add_request_result'");
    expect(screen).not.toContain("await trackActivity('friends:add_request_start'");
    expect(screen).not.toContain("await trackActivity('friends:add_request_result'");
  });

  it('блокировка: begin до скрытия, settle(успех) при «ok», settle(откат) внутри rollback', () => {
    const start = screen.indexOf('const runBlock = useCallback');
    expect(start).toBeGreaterThan(0);
    const block = screen.slice(start, start + 3600);
    expect(block).toContain("pendingFriendOpsRef.current.begin(target.uid, 'remove')");
    expect(block).toContain('pendingFriendOpsRef.current.settle(target.uid, false, Date.now())');
    expect(block).toContain('pendingFriendOpsRef.current.settle(target.uid, true, Date.now())');
  });
});
