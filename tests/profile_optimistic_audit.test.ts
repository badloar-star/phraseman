// зачем (аудит Optimistic UI «Профиль и Уроки», координатор 13.10): правки аудита Профиля закреплены контрактом по строкам файлов —
// лайк при сбое откатывается к значениям до тапа без сверочных чтений (они при обрыве связи отдавали «нет лайка/0»), у своей карточки нет лишнего чтения счётчика,
// заявка в друзья помнится на время работы приложения, друзья и заявки защищены синхронным замком, deleteFriend не рапортует успех при отсутствии uid/Firestore,
// а немые catch проекции публичной карточки и чтения лайков пишут причину.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Профиль: лайк откатывается к значениям до тапа', () => {
  const src = read('components/profile-card/usePlayerProfileSocial.ts');

  it('значения до тапа запоминаются и возвращаются, сверка с сервером при сбое убрана', () => {
    expect(src).toMatch(/const prevTotal = activityLikeTotal;\n\s*const prevLike = profileLike;/);
    expect(src).toMatch(/setProfileLike\(prevLike\);\n\s*setActivityLikeTotal\(prevTotal\);/);
    // внутри .catch обработчика лайка чтений больше нет
    const catchBlock = src.slice(src.indexOf("logCatch('лайк: сбой, откат к значениям до тапа'"), src.indexOf("}), 'error');", src.indexOf("logCatch('лайк: сбой, откат")));
    expect(catchBlock).not.toMatch(/fetchActivityLike/);
    expect(src).toMatch(/\[PROFILE-LIKE\]', `откат/);
  });

  it('замок лайка по ref остался, а колбэк пересоздаётся при смене значений', () => {
    expect(src).toMatch(/likeInFlightRef\.current\) return;/);
    expect(src).toMatch(/\[activityLikeTotal, canLike, L, likeTargetUid, likedThisProfile, myName, onFriendRequestToast, profileLike\]/);
  });

  it('у своей карточки счётчик лайков не читается (его рисует только чужая)', () => {
    expect(src).toMatch(/isMe \? Promise\.resolve\(0\) : fetchActivityLikeTotal\(uid\)/);
  });
});

describe('Профиль: друзья и заявки', () => {
  const src = read('components/profile-card/usePlayerProfileSocial.ts');

  it('заявка помнится в памяти процесса 10 минут и забывается при откате и при принятии', () => {
    expect(src).toMatch(/SENT_REQUEST_MEMORY_MS = 10 \* 60_000/);
    expect(src).toMatch(/sentRequestsInSession\.set\(targetUid, Date\.now\(\)\)/);
    expect((src.match(/sentRequestsInSession\.delete\(targetUid\)/g) ?? []).length).toBe(3);
    expect(src).toMatch(/nextFriendUids\.forEach\(\(uid\) => sentRequestsInSession\.delete\(uid\)\)/);
  });

  it('добавить и удалить друга защищены синхронным ref-замком, который снимается во всех выходах', () => {
    expect(src).toMatch(/friendOpInFlightRef = useRef\(false\)/);
    expect((src.match(/friendOpInFlightRef\.current = true/g) ?? []).length).toBe(2);
    // снятие: синтетический выход, finally добавления, finally удаления
    expect((src.match(/friendOpInFlightRef\.current = false/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('первый кадр знает друзей из снимка вкладки «Друзья»', () => {
    expect(src).toMatch(/useState<Set<string>>\(\(\) => \(player\.isMe \? new Set\(\) : new Set\(friendsAccountStore\.getSnapshot\(\)\.rows\.map\(\(row\) => row\.uid\)\)\)\)/);
  });
});

describe('deleteFriend не рапортует успех, когда ничего не удалил', () => {
  const src = read('app/firestore_friend_requests.ts');
  const body = src.slice(src.indexOf('export async function deleteFriend'), src.indexOf('Просит сервер (authEnsureStableLink'));

  it('нет канонического uid и нет Firestore → бросок, а не голый return', () => {
    expect(body).toMatch(/throw new Error\('delete_friend_no_canonical_uid'\)/);
    expect(body).toMatch(/throw new Error\('delete_friend_firestore_unavailable'\)/);
    expect(body).not.toMatch(/\n\s{4}return;\n/);
  });

  it('все вызывающие откатывают по отказу промиса', () => {
    expect(read('components/profile-card/usePlayerProfileSocial.ts')).toMatch(/deleteFriend\(removedUid\)[\s\S]*?\.catch\(\(error: unknown\) => \{[\s\S]*?удаление друга: сбой, откат/);
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toMatch(/deleteFriend\(target\.uid\)\.catch\(/);
    expect(friends).toMatch(/deleteFriend\(target\.uid\)\n\s*\.then\([\s\S]*?\.catch\(/);
  });
});

describe('немые catch проекции публичной карточки и чтения лайков', () => {
  it('каждый catch пишет причину в журнал', () => {
    const snap = read('app/public_profile_snapshot.ts');
    const likes = read('app/friend_activity_likes.ts');
    expect(snap).not.toMatch(/catch \{/);
    expect(snap).toMatch(/проекция упала \(/);
    expect(likes).not.toMatch(/catch \{/);
    for (const tag of ['getDb: Firestore недоступен', 'старые лайки (daily_limits) не прочитались', 'состояние лайка', 'счётчик лайков', 'полученные лайки не прочитались']) {
      expect(likes).toContain(tag);
    }
  });
});
