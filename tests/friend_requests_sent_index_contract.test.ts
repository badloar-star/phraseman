/**
 * Сторож обратного индекса исходящих заявок в друзья.
 *
 * зачем: без индекса удаление аккаунта перебирало ВСЮ коллекцию users на
 * каждое удаление (при 100k игроков — сотни тысяч чтений и таймаут функции).
 * Индекс разнесён по четырём местам: общий контракт имён, клиент-писатель,
 * серверное удаление и правила Firestore. Разъедется любая пара — удаление
 * тихо вернётся к полному перебору или начнёт молча оставлять чужие заявки.
 * Обычные тесты этого класса не ловят: они работают на моках и остаются
 * зелёными. Сломался сторож — чинить связь, а не удалять проверку.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  FRIEND_REQUESTS_SENT_INDEX,
  FRIEND_REQUESTS_SENT_MARKER_ID,
} from '../shared/friend_requests_index_contract';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('friend_requests_sent reverse index contract', () => {
  test('правило Firestore описывает ту же подколлекцию и тот же маркер', () => {
    const rules = read('firestore.rules');
    expect(rules).toContain(`/${FRIEND_REQUESTS_SENT_INDEX}/{toUid}`);
    // Маркер захардкожен в правилах (там нет импортов) — сверяем с константой.
    expect(rules).toContain(`toUid == '${FRIEND_REQUESTS_SENT_MARKER_ID}'`);
  });

  test('клиент пишет индекс из общего контракта, а не строкой', () => {
    const client = read('app/firestore_friend_requests.ts');
    expect(client).toContain("from '../shared/friend_requests_index_contract'");
    expect(client).toContain('writeSentRequestIndex');
    // Литерал имени коллекции в клиенте означал бы расхождение с контрактом.
    expect(client).not.toContain(`collection('${FRIEND_REQUESTS_SENT_INDEX}')`);
  });

  test('удаление аккаунта читает индекс и умеет откатиться на полный перебор', () => {
    const server = read('functions/src/account_delete.ts');
    expect(server).toContain("from '../../shared/friend_requests_index_contract'");
    expect(server).toContain('collectSentRequestPeerUids');
    expect(server).toContain('hasFriendRequestsSentIndexMarker');
    // Гибрид: без маркера обязан остаться аварийный полный перебор — ОБЕ ветки.
    // зачем именно так: toContain('listDocuments()') было бы бесполезно — в
    // файле есть и другие вызовы (arena_season_leaderboard) и упоминание в
    // комментарии, поэтому проверка оставалась бы зелёной даже после удаления
    // обоих fallback. Считаем ровно ветки тернарника по коллекции users.
    const fallbackBranches = server.match(
      /: await db\.collection\('users'\)\.listDocuments\(\)/g,
    ) ?? [];
    expect(fallbackBranches).toHaveLength(2);
    // И симметрично — узкий путь по peer-uid в тех же двух местах.
    const narrowBranches = server.match(/\? peerUids\.map\(/g) ?? [];
    expect(narrowBranches).toHaveLength(2);
  });

  test('peer-ы добираются из истории подарков, а не только из друзей', () => {
    // зачем: дыра, найденная на аудите. Список друзей знает только ДЕЙСТВУЮЩУЮ
    // дружбу. Подарок Ани Боре оставляет счётчик recipients.<Боря> в
    // users/Аня/friend_gift_daily_limits/{дата}; если дружбу потом разорвать,
    // Ани нет в списке друзей Бори — и при удалении его аккаунта этот uid
    // остался бы у Ани навсегда. friend_gift_history лежит у ОБОИХ с полем
    // peerUid и разрыв дружбы переживает, поэтому закрывает именно этот случай.
    const server = read('functions/src/account_delete.ts');
    expect(server).toContain('collectGiftPeerUids');
    expect(server).toContain("collection('friend_gift_history')");
    // Все три источника обязаны сливаться в один список peer-ов.
    expect(server).toMatch(/\[\.\.\.friendPeers,\s*\.\.\.giftPeers,\s*\.\.\.sent\.peers\]/);
  });

  test('peer-uid собираются ДО удаления users/{uid}', () => {
    // зачем: стадия direct_docs сносит users/{uid} вместе с подколлекцией
    // friends. Если собрать peer-ов после неё, список окажется пуст и чужие
    // документы об удалённом игроке останутся навсегда.
    const server = read('functions/src/account_delete.ts');
    const collectAt = server.indexOf("'collect_peers'");
    const directDocsAt = server.indexOf("'direct_docs'");
    expect(collectAt).toBeGreaterThan(-1);
    expect(directDocsAt).toBeGreaterThan(-1);
    expect(collectAt).toBeLessThan(directDocsAt);
  });
});
