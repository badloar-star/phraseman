// зачем (аудит Optimistic UI Карточек, 12.10; docs/phraseman-2.0/R1_CARDS_OPTIMISTIC_UI.md): замок двойного тапа на действиях Карточек — СИНХРОННЫЙ (ref), а не только состояние:
// два тапа в одном кадре видят состояние «ещё свободным». Плюс: ранний выход пишет причину, сырой текст исключения не уходит в тост.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Карточки: замки двойного тапа и честные сообщения', () => {
  it('«Блиц»: ответ держит ref-замок, снимается при возврате состояния в «свободно»', () => {
    const src = read('app/flashcards_blitz_session.tsx');
    expect(src).toContain('const pickLockRef = useRef(false);');
    expect(src).toContain('useEffect(() => { if (!locked) pickLockRef.current = false; }, [locked]);');
    const pick = src.slice(src.indexOf('const pick = useCallback('), src.indexOf('const resetBlitzAfterSessionRuneForfeit'));
    expect(pick.indexOf('if (pickLockRef.current) {')).toBeGreaterThan(0);
    expect(pick.indexOf('pickLockRef.current = true;')).toBeGreaterThan(pick.indexOf('if (pickLockRef.current) {'));
    expect(pick.indexOf('setLocked(true);')).toBeGreaterThan(pick.indexOf('pickLockRef.current = true;'));
    expect(pick).toContain('[OPT-UI] blitz_pick ignored reason=double_tap');
  });

  it('«В набор» из шторки карточки: ref-замок снимается при каждом исходе (дубль, отказ, исключение)', () => {
    const src = read('app/flashcards/ExpandedCardV2.tsx');
    expect(src).toContain('const addingRef = useRef(false);');
    expect(src).toContain('[OPT-UI] card_to_pack ignored reason=double_tap');
    const addTo = src.slice(src.indexOf('const addTo = useCallback('), src.indexOf('if (!card) return null;'));
    expect(addTo.indexOf('addingRef.current = true;')).toBeGreaterThan(0);
    // снятие: duplicate, failed, catch — три места
    expect(addTo.match(/addingRef\.current = false;/g)?.length).toBe(3);
    // успех закрывает шторку, а смена карточки сбрасывает замок
    expect(src).toMatch(/setAdding\(false\);\s*addingRef\.current = false;/);
  });

  it('«Создать набор из выбранных»: ref-замок, лог в catch, замок снимается в finally', () => {
    const src = read('app/flashcards_collection.tsx');
    const fn = src.slice(src.indexOf('const openCreatePackFromSelection = useCallback('), src.indexOf('Легаси-диплинк `?create=1`'));
    expect(fn).toContain('selectionCreateLockRef.current = true;');
    expect(fn).toContain('[OPT-UI] pack_from_selection ignored reason=double_tap');
    expect(fn).toContain('[OPT-UI] pack_from_selection rollback reason=stage_failed');
    expect(fn).not.toMatch(/catch \{/);
    expect(fn).toMatch(/finally \{\s*selectionCreateLockRef\.current = false;/);
  });

  it('сохранение набора: в тост не идёт текст исключения, причина — в журнал', () => {
    const src = read('app/community_pack_create.tsx');
    expect(src).toContain("console.warn('[OPT-UI] pack_save rollback reason=exception'");
    expect(src).toContain("const short = '';");
    expect(src).not.toContain('msg.slice(0, 140)');
  });
});
