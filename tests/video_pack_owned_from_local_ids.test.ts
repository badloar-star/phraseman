// зачем (аудит кнопок Карточек #14/#15, координатор 15.10): набор ролика уже добавлен — строка и экран ролика не предлагают «Добавить» снова (owned из локальных id: video:<id> → video_<id>), и
// кнопки видео-наборов не читают Firestore по неверному id (3 пустых чтения на строку).
import { readFileSync } from 'fs';
import path from 'path';
import { communityIdForRow } from '../app/community_packs/useOwnedPack';
import { notifyOwnedPackIdsChanged, ownedPackIdsVersion, subscribeOwnedPackIdsChanged } from '../app/community_packs/owned_pack_ids_signal';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');

describe('набор ролика → документ сообщества', () => {
  it('video:<11 символов> → video_<id>; прочие id без изменений', () => {
    expect(communityIdForRow('video:cnrVN_uz7Sg')).toBe('video_cnrVN_uz7Sg');
    expect(communityIdForRow('ugc_12')).toBe('ugc_12');
    expect(communityIdForRow('video:short')).toBe('video:short');
  });
  it('сигнал состава моих наборов: версия растёт, подписчик вызывается, отписка работает', () => {
    const calls: number[] = [];
    const off = subscribeOwnedPackIdsChanged(() => calls.push(ownedPackIdsVersion()));
    const before = ownedPackIdsVersion();
    notifyOwnedPackIdsChanged();
    off();
    notifyOwnedPackIdsChanged();
    expect(calls).toEqual([before + 1]);
  });
});

describe('подключение', () => {
  it('строки видео-наборов и экран ролика берут owned из локальных id, а не зашитое false', () => {
    const row = read('app/flashcards/VideoPackRow.tsx');
    expect(row).not.toMatch(/<CommunityPackSocialBar[^>]*owned=\{false\}/);
    expect(row).toContain('const owned = useOwnedPack(pack.id);');
    expect((row.match(/owned=\{owned\}/g) ?? []).length).toBe(2);
    const watch = read('app/lingman_video_watch.tsx');
    expect(watch).not.toMatch(/<CommunityPackSocialBar[^>]*owned=\{false\}/);
    expect(watch).toContain('owned={packOwned}');
  });
  it('кнопки видео-наборов не читают соцсостояние (id video:<id> — несуществующий документ)', () => {
    const bar = read('app/community_packs/CommunityPackSocialBar.tsx');
    expect(bar).toContain('if (isPreviewCta || isSetAdd || isSetHeart || isVideoAdd || isVideoAddRound) return undefined;');
  });
  it('«Убрать из моих» сигналит об изменении состава — «Добавить» возвращается сразу', () => {
    expect(read('app/community_packs/communityOwnedStorage.ts')).toContain('notifyOwnedPackIdsChanged();');
  });
});
