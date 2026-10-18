import fs from 'node:fs';
import path from 'node:path';

import { savedLoadBranch, type SavedLoadBranchInput } from '../app/flashcards/saved_load_branch';

// зачем (cards-039, Сверка 46232ea76, координатор 18.10): «пусто + ошибка» не должно давать вечный скелетон — ошибка важнее скелетона (D158).
const base: SavedLoadBranchInput = { savedCategory: true, packDeeplink: false, loading: false, loadError: false, packCardsPending: false, listCardsCount: 0 };
const pick = (patch: Partial<SavedLoadBranchInput>) => savedLoadBranch({ ...base, ...patch }).branch;

describe('ветка «Сохранённые» при пустом списке', () => {
  it('пусто + ошибка: состояние (тихий повтор → «Сейчас недоступно»), а не скелетон', () => {
    expect(pick({ loadError: true })).toBe('state');
  });
  it('пусто + ошибка, пока идёт повтор (loading true): всё равно состояние — ошибка важнее скелетона', () => {
    expect(pick({ loadError: true, loading: true })).toBe('state');
    expect(savedLoadBranch({ ...base, loadError: true, loading: true }).reason).toContain('ошибка важнее скелетона');
  });
  it('без сети: пусто + ошибка → состояние сразу, причина offline_first_fail (журнал), даже пока идёт повтор', () => {
    expect(savedLoadBranch({ ...base, loadError: true, deviceOffline: true })).toEqual({ branch: 'state', reason: 'offline_first_fail' });
    expect(savedLoadBranch({ ...base, loadError: true, loading: true, deviceOffline: true }).reason).toBe('offline_first_fail');
  });
  it('без сети, но ошибки нет: офлайн сам по себе ничего не меняет (скелетон на загрузке, пусто — состояние «Пусто»)', () => {
    expect(pick({ loading: true, deviceOffline: true })).toBe('skeleton');
    expect(pick({ deviceOffline: true })).toBe('state');
    expect(savedLoadBranch({ ...base, deviceOffline: true }).reason).not.toBe('offline_first_fail');
  });
  it('пусто + загрузка без ошибки: скелетон', () => {
    expect(pick({ loading: true })).toBe('skeleton');
  });
  it('загрузка закончилась, карточек нет, ошибки нет: состояние «Пусто»', () => {
    expect(pick({})).toBe('state');
  });
  it('карточки есть (кэш или хранилище): список, даже при ошибке повтора и загрузке (cards=demo верно)', () => {
    expect(pick({ listCardsCount: 3 })).toBe('list');
    expect(pick({ listCardsCount: 3, loadError: true })).toBe('list');
    expect(pick({ listCardsCount: 3, loading: true })).toBe('list');
  });
  it('набор по ссылке и чужая категория — не «Сохранённые»: список', () => {
    expect(pick({ packDeeplink: true, loadError: true })).toBe('list');
    expect(pick({ savedCategory: false, loadError: true })).toBe('list');
  });
  it('ждут карточки набора и загрузки нет: список (пустым экран считать рано)', () => {
    expect(pick({ packCardsPending: true })).toBe('list');
  });
});

describe('экран и данные подключены к выбору ветки', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

  it('flashcards_collection: ветку решает savedLoadBranch, журнал [CARDS-LOAD] называет значения и причину', () => {
    const src = read('app/flashcards_collection.tsx');
    expect(src).toContain("import { savedLoadBranch } from './flashcards/saved_load_branch';");
    expect(src).toContain('savedLoadBranch({');
    expect(src).toContain("console.log('[CARDS-LOAD] branch'");
    expect(src).toMatch(/savedBranch\.branch === 'skeleton' \? \(\s*<SavedCollectionLoading/);
    expect(src).toMatch(/savedBranch\.branch === 'state' \? \(\s*<SavedCollectionState/);
  });

  it('ворота LOAD-GATE получают status loading на время повтора (контракт useLoadGate) и не залипают после первого тихого повтора (Сверка 81d2dfe38)', () => {
    const states = read('app/flashcards/SavedCollectionStates.tsx');
    expect(states).toContain("const gateStatus = retrying ? 'loading' : loadError ? 'error' : 'ready';");
    expect(states).toContain("status: gateStatus");
    expect(states).toContain('setRetrying(true);');
    // любой исход повтора снимает retrying: успех, отказ и синхронное исключение
    for (const outcome of ["settle('ok')", "settle('rejected')", "settle('threw')"]) expect(states).toContain(outcome);
    expect(states).toContain("console.log('[CARDS-LOAD] state:render'");
    // контракт на стороне ворот: эффект перезапускается только по смене status — без 'loading' attempt 2/3 не ставятся
    const gate = read('app/use_load_gate.ts');
    expect(gate).toContain("Контракт: `retry()` обязан перевести `status` в 'loading'");
    // сами ворота больше не зависят от контракта: после каждого повтора эффект перезапускается по счётчику epoch (Сверка 81d2dfe38, координатор 05:58)
    expect(gate).toContain('setEpoch((value) => value + 1);');
    expect(gate).toContain('}, [enabled, epoch, exhausted, id, persistAcrossMounts, remember, setExhausted, status, tag]);');
  });

  it('офлайн: хук читает NetInfo тем же вердиктом, что каталог (без новых зависимостей и запросов), SavedCollectionState показывает «Сейчас недоступно» сразу', () => {
    const hook = read('app/flashcards/useSavedLoadOffline.ts');
    expect(hook).toContain("import NetInfo from '@react-native-community/netinfo';");
    expect(hook).toContain("import { catalogOfflineVerdict } from './useCatalogOffline';");
    expect(hook).toContain('NetInfo.fetch()');
    expect(hook).toContain("console.log('[CARDS-LOAD] offline probe'");
    expect(hook).toContain("console.warn('[CARDS-LOAD] offline probe failed'");
    const states = read('app/flashcards/SavedCollectionStates.tsx');
    expect(states).toContain("const drawn = loadError && !tapPending && (gate.exhausted || props.deviceOffline) ? 'unavailable' : loadError ? 'skeleton' : 'empty';");
    expect(states).toContain("if (drawn === 'unavailable') return <SavedCollectionUnavailable");
    const screen = read('app/flashcards_collection.tsx');
    expect(screen).toContain('const savedDeviceOffline = useSavedLoadOffline(loadError);');
    expect(screen).toContain('deviceOffline={savedDeviceOffline}');
  });

  // зачем (Сайт, проверка 9be415d23): двойной тап «Попробовать снова» не запускает второй loadAll; без сети тап виден (скелетон на время повтора).
  it('«Попробовать снова»: повтор не запускается, пока идёт предыдущий; тап даёт отклик и без сети', () => {
    const states = read('app/flashcards/SavedCollectionStates.tsx');
    expect(states).toContain('if (retryingRef.current) {');
    expect(states).toContain("console.log('[CARDS-LOAD] retry → skipped in_flight');");
    expect(states).toContain('retryingRef.current = true;');
    expect(states).toContain('retryingRef.current = false;');
    expect(states).toContain('setTapPending(true);');
    expect(states).toContain('setTapPending(false);');
    expect(states).toContain('onRetry={onTapRetry}');
  });

  // зачем (координатор 18.10): PaywallPlus — потребитель ворот, правка epoch не должна менять число запросов цен. Контракт соблюдён (priceGateStatus даёт 'loading' на время загрузки), а загрузка цен сама присоединяется к идущей — параллельных запросов RevenueCat не будет.
  it('PaywallPlus: ворота цен соблюдают контракт, а загрузка цен присоединяется к уже идущей — лишних запросов нет', () => {
    const paywall = read('components/paywall/PaywallPlusScreen.tsx');
    expect(paywall).toContain("id: 'paywall-plus-prices'");
    expect(paywall).toMatch(/offeringsSettled && !p\.loading \? 'error' : 'loading'/);
    const purchase = read('app/paywall_purchase.ts');
    expect(purchase).toContain('now - inflight.startedAt < LOAD_GATE_TOTAL_MS + 1_000');
    expect(purchase).toContain('return inflight.promise;');
  });

  it('useCollectionData: потолок загрузки без кэша переводит экран в ошибку и пишет [CARDS-LOAD]', () => {
    const src = read('app/flashcards/useCollectionData.ts');
    expect(src).toContain('CARDS_LOAD_CEILING_MS');
    expect(src).toContain("console.warn('[CARDS-LOAD] ceiling");
    expect(src).toContain("console.log('[CARDS-LOAD] load:start'");
    expect(src).toContain("console.log('[CARDS-LOAD] load:ok'");
    expect(src).toContain("console.warn('[CARDS-LOAD] load:failed'");
  });
});
