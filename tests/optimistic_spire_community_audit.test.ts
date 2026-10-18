// зачем (аудит Optimistic UI «Шпиль и Сообщество», координатор 12.10): правки аудита закреплены тестами —
// заявки «в пути» не прыгают от запоздавших снимков, лайки одного набора идут по очереди, «Добавить» не стартует дважды,
// отказы жалоб и итога ступени пишут причину в журнал.
import fs from 'node:fs';
import path from 'node:path';

import { createPendingFriendOps, PENDING_FRIEND_OP_GRACE_MS } from '../app/friends_pending_ops';
import { createSerialPerKey } from '../app/community_packs/serial_per_key';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

type Friend = { uid: string; createdAt: number; displayName?: string };
type Req = { fromUid: string };

describe('заявки «в пути»: запоздавший снимок не возвращает принятое', () => {
  const alice: Friend = { uid: 'alice', createdAt: 1, displayName: 'Alice' };

  it('пока «Принять» идёт, заявка скрыта, а друг добавлен, даже если снимок сервера старый', () => {
    const ops = createPendingFriendOps<Friend, Req>();
    ops.begin('alice', 'accept', alice);
    expect(ops.filterRequests([{ fromUid: 'alice' }, { fromUid: 'bob' }], 10)).toEqual([{ fromUid: 'bob' }]);
    expect(ops.mergeFriends([{ uid: 'carl', createdAt: 0 }], 10)).toEqual([{ uid: 'carl', createdAt: 0 }, alice]);
  });

  it('после успеха прикрытие живёт ещё несколько секунд, потом снимок сервера главный', () => {
    const ops = createPendingFriendOps<Friend, Req>();
    ops.begin('alice', 'accept', alice);
    ops.settle('alice', true, 1000);
    expect(ops.mergeFriends([], 1000 + PENDING_FRIEND_OP_GRACE_MS - 1)).toEqual([alice]);
    expect(ops.mergeFriends([], 1000 + PENDING_FRIEND_OP_GRACE_MS)).toEqual([]);
    expect(ops.filterRequests([{ fromUid: 'alice' }], 1000 + PENDING_FRIEND_OP_GRACE_MS)).toEqual([{ fromUid: 'alice' }]);
  });

  it('при отказе прикрытие снимается сразу: заявка вернётся из снимка, друг не выдуман', () => {
    const ops = createPendingFriendOps<Friend, Req>();
    ops.begin('alice', 'accept', alice);
    ops.settle('alice', false, 5);
    expect(ops.has('alice', 5)).toBe(false);
    expect(ops.filterRequests([{ fromUid: 'alice' }], 6)).toEqual([{ fromUid: 'alice' }]);
    expect(ops.mergeFriends([], 6)).toEqual([]);
  });

  it('друг уже есть в снимке — не дублируется; «Отклонить» только скрывает заявку', () => {
    const ops = createPendingFriendOps<Friend, Req>();
    ops.begin('alice', 'accept', alice);
    expect(ops.mergeFriends([alice], 1)).toEqual([alice]);
    ops.begin('bob', 'decline');
    expect(ops.filterRequests([{ fromUid: 'bob' }], 1)).toEqual([]);
    expect(ops.mergeFriends([], 1)).toEqual([alice]);
  });
});

describe('очередь по ключу: лайки одного набора идут по порядку', () => {
  it('вторая задача того же ключа стартует после первой, другой ключ не ждёт', async () => {
    const run = createSerialPerKey();
    const log: string[] = [];
    let releaseA!: () => void;
    const gateA = new Promise<void>((resolve) => { releaseA = resolve; });
    const a1 = run('pack-a', async () => { log.push('a1:start'); await gateA; log.push('a1:end'); return 1; });
    const a2 = run('pack-a', async () => { log.push('a2:start'); return 2; });
    const b1 = run('pack-b', async () => { log.push('b1:start'); return 3; });
    await b1;
    expect(log).toEqual(['a1:start', 'b1:start']);
    releaseA();
    expect(await a1).toBe(1);
    expect(await a2).toBe(2);
    expect(log).toEqual(['a1:start', 'b1:start', 'a1:end', 'a2:start']);
  });

  it('упавшая задача не останавливает очередь и отдаёт ошибку своему вызывающему', async () => {
    const run = createSerialPerKey();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = run('k', async () => { throw new Error('boom'); });
    const next = run('k', async () => 'ok');
    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[SERIAL] k'));
    warn.mockRestore();
  });
});

describe('источники: правки аудита на месте', () => {
  it('Друзья: снимки подписок проходят через заявки «в пути», обработчики открывают и закрывают заявку', () => {
    const src = read('app/(tabs)/friends.tsx');
    expect(src).toContain('pendingFriendOpsRef.current.mergeFriends(data, Date.now())');
    expect(src).toContain('pendingFriendOpsRef.current.filterRequests(data, Date.now())');
    expect(src).toContain("pendingFriendOpsRef.current.begin(request.fromUid, 'accept'");
    expect(src).toContain("pendingFriendOpsRef.current.begin(request.fromUid, 'decline')");
    expect(src.match(/pendingFriendOpsRef\.current\.settle\(request\.fromUid, false/g)?.length).toBe(2);
    expect(src.match(/pendingFriendOpsRef\.current\.settle\(request\.fromUid, true/g)?.length).toBe(2);
  });

  it('«Отклонить» бросает ошибку без личности и без облака (иначе нет отката)', () => {
    const src = read('app/firestore_friend_requests.ts');
    const decline = src.slice(src.indexOf('export async function declineFriendRequest'), src.indexOf('export async function deleteFriend'));
    expect(decline).not.toMatch(/\n\s+return;\n/);
    expect(decline.match(/throw err/g)?.length).toBe(2);
  });

  it('Наборы: лайк идёт через очередь, «Добавить» имеет замок', () => {
    const actions = read('app/community_packs/communityPackActions.ts');
    expect(actions).toContain("likeQueue(`like:${packId}`, () => toggleCommunityPackLikeNow(packId))");
    const bar = read('app/community_packs/CommunityPackSocialBar.tsx');
    expect(bar).toContain('const addInFlightRef = useRef(false);');
    expect(bar).toContain('addInFlightRef.current = true;');
    expect(bar).toContain('.finally(() => { addInFlightRef.current = false; })');
    // 18.10 (координатор, решение по аудиту (б)(в)): лайк в полёте — повтор игнорируется; отказ облака — откат с тостом.
    expect(bar).toContain('const likeInFlightRef = useRef(false);');
    expect(bar).toContain('[OPT-UI] pack_like ignored reason=like_in_flight');
    expect(bar).toMatch(/\} finally \{\n\s+likeInFlightRef\.current = false;/);
    expect(bar).toMatch(/if \(res\.rejected\) \{[\s\S]{0,200}likeFailedToast\(\);/);
  });

  it('Жалобы и Шпиль: нет немых catch, ранний выход итога ступени называет причину', () => {
    const report = read('app/user_report.ts');
    expect(report).not.toMatch(/catch \{\n\s+return 'failed'/);
    expect(report.match(/\[REPORT\]/g)?.length).toBe(3);
    const taskReport = read('modules/spire/task_report_client.ts');
    expect(taskReport).not.toMatch(/catch \{\n/);
    const game = read('app/spire/use_spire_game.ts');
    expect(game).toContain('итог ступени ${finish.report.reportId} потерян');
  });
});

describe('источники: второй проход аудита (отклики, избранное видео, потолок заявки)', () => {
  it('Отклики: исключение в отправке/повторе не оставляет замок и «отправляется» навсегда; повтор имеет замок', () => {
    const sheet = read('app/community_packs/PackCommentsSheet.tsx');
    expect(sheet.match(/res = \{ ok: false, reason: 'network' \};/g)?.length).toBe(2);
    expect(sheet).toContain('const retryLocksRef = useRef<Set<string>>(new Set());');
    expect(sheet).toContain('retryLocksRef.current.add(comment.id);');
    expect(sheet).toContain('retryLocksRef.current.delete(comment.id);');
    expect(sheet).toContain('отправка бросила исключение packId=');
  });

  it('Избранное видео: тап не гасится на время записи в облако, только дребезг в пределах кадра; направление — по свежему состоянию', () => {
    const hook = read('hooks/use_video_favorites.ts');
    expect(hook).not.toContain('inFlightRef');
    expect(hook).toContain('export const VIDEO_FAVORITE_TAP_DEBOUNCE_MS = 350;');
    expect(hook).toContain('const next = !savedSetRef.current.has(videoId);');
    expect(hook).toContain('hook: дребезг тапа — пропуск');
  });

  it('Заявка в друзья: у sendFriendRequest есть потолок ожидания и лог позднего ответа', () => {
    const src = read('app/firestore_friend_requests.ts');
    expect(src).toContain('export const SEND_FRIEND_REQUEST_TIMEOUT_MS = 15_000;');
    expect(src).toContain('ответ пришёл после потолка');
    expect(src).toContain('async function sendFriendRequestInner(toUid: string)');
  });
});
