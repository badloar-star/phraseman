// зачем (аудит Optimistic UI Настроек и Карточек, координатор 15.10; docs/work/tasks/optimistic-ui-night-2026-10-15.md, дыры №6, №7, №10): сторож поведения Карточек набора —
// замок на удаление, честные сообщения при сбое «Вернуть» и удаления опубликованной карточки, откат «Добавить себе» не зависит от чужих действий, лайк не обгоняет добавление.
// Источник-контракт (как cards_optimistic_ui_locks_contract): ref меняется синхронно, ранний выход пишет причину, катч не молчит.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Карточки набора: замки, сообщения и откаты (дыры 6, 7, 10)', () => {
  const screen = read('app/flashcards_collection.tsx');

  it('удаление карточки набора: ref-замок по cardId, снимается в finally обоих путей', () => {
    expect(screen).toContain('const deletingPackCardIdsRef = useRef<Set<string>>(new Set());');
    expect(screen).toContain('[OPT-UI] ${tag} ignored reason=double_tap cardId=${cardId}');
    const local = screen.slice(screen.indexOf('const deletePackCard = useCallback('), screen.indexOf('const deletePublishedPackCard = useCallback('));
    expect(local.indexOf("if (!claimPackCardDelete(card.id, 'pack_card_delete')) return;")).toBeGreaterThan(0);
    expect(local).toContain('.finally(() => releasePackCardDelete(card.id));');
    const published = screen.slice(screen.indexOf('const deletePublishedPackCard = useCallback('), screen.indexOf('const undoPackDelete = useCallback('));
    expect(published).toContain("if (!claimPackCardDelete(card.id, 'pack_card_remove')) return;");
    expect(published).toContain('.finally(() => releasePackCardDelete(card.id));');
  });

  it('удаление опубликованной карточки: сбой постановки в очередь откатывает И говорит человеку', () => {
    const published = screen.slice(screen.indexOf('const deletePublishedPackCard = useCallback('), screen.indexOf('const undoPackDelete = useCallback('));
    const catchBlock = published.slice(published.indexOf('.catch((error: unknown) => {'));
    expect(catchBlock).toContain('unhidePackCard(card.id);');
    expect(catchBlock).toContain('packCardDeleteFailToast();');
  });

  it('«Вернуть»: ни одна ветка не молчит (ok=false и исключение — сообщение; локальный путь ещё и перечитывает факт)', () => {
    const undo = screen.slice(screen.indexOf('const undoPackDelete = useCallback('), screen.indexOf('useEffect(() => () => { if (packUndoTimerRef.current)'));
    expect(undo.match(/packCardRestoreFailToast\(\)/g)?.length).toBe(4);
    expect(undo).toContain('void loadAll(); //');
  });

  it('удаление набора с экрана набора: после сбоя каталог инвалидируется', () => {
    const del = screen.slice(screen.indexOf('const confirmDeletePack = () => {'), screen.indexOf('const packInfoBlock = packSurface'));
    expect(del).toContain('invalidateCommunityPackCatalog();');
    expect(screen).toContain("import { invalidateCommunityPackCatalog } from './community_packs/communityFirestore';");
  });

  it('«Добавить себе»: лайк не обгоняет запись, откат добавления не отменяется чужим действием', () => {
    const bar = read('app/community_packs/CommunityPackSocialBar.tsx');
    const like = bar.slice(bar.indexOf('const onLikePress = useCallback('), bar.indexOf('const onAddPress = useCallback('));
    expect(like).toContain('[OPT-UI] pack_like ignored reason=add_in_flight');
    expect(like.indexOf('addInFlightRef.current')).toBeLessThan(like.indexOf('toggleLikeOptimistic'));
    const add = bar.slice(bar.indexOf('const onAddPress = useCallback('), bar.indexOf('const addedLabel = triLang('));
    expect(add).not.toContain('откат добавления пропущен');
    expect(add).toContain('newerAction=${String(newer)}');
    expect(add).toContain('{ ...prev, added: before.added, addedCount: before.addedCount }');
    // сердце: сервер говорит «лайк есть», локального флага нет (после выхода/смены аккаунта) — восстанавливаем, цифра не теряет единицу
    const effect = bar.slice(bar.indexOf('const seqAtStart = opSeqRef.current;'), bar.indexOf('}, [pack.id, pack.likesCount, pack.addedCount'));
    expect(effect).toContain('const likedNow = liked || serverLiked;');
    expect(effect).toContain("[PACK-LIKE] reconcile pack=${pack.id} source=${serverLiked && !liked ? 'server' : 'local'}");
    // обратный случай не сбрасывается: сердце = локальный ИЛИ серверный флаг
    expect(effect).not.toMatch(/liked: serverLiked/);
    expect(effect).not.toMatch(/liked, added: prev\.added \|\| owned/);
    // тост отказа показывается в обоих случаях
    expect(add.indexOf("emitAppEvent('action_toast', packAddFailureToast(res));")).toBeGreaterThan(add.indexOf('const newer'));
  });
});
