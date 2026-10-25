// зачем (координатор 25.10, паритет cards-gap-039: «Своих наборов пока нет» при существующем своём наборе; Сверка без записи данных не
// воспроизвела): шторка «В какой набор?» карточки (ExpandedCardV2) решает текст по loadPackPickerState. Здесь все состояния:
// нет наборов / только опубликованные / есть свой / сбой чтения. Сбой чтения починен (5 · ВХОД 25.10): статус идёт наружу, один
// тихий повтор, дальше «Не удалось загрузить наборы» + «Повторить»; бывшие test.failing — обычные test.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../app/community_packs/localAuthorPacks', () => ({
  loadLocalAuthorPacks: jest.fn(),
  loadLocalAuthorPacksResult: jest.fn(),
  saveLocalAuthorPack: jest.fn(),
}));
jest.mock('../app/community_packs/local_pack_lock', () => ({ withLocalPackLock: (_id: string, fn: () => unknown) => fn() }));
jest.mock('../app/dev_cards_state', () => ({ isDevCardsFail: () => false }));

import { loadLocalAuthorPacks, loadLocalAuthorPacksResult } from '../app/community_packs/localAuthorPacks';
import { loadPackPickerState } from '../app/community_packs/localPackCardAdd';

const loadPacks = loadLocalAuthorPacks as jest.MockedFunction<typeof loadLocalAuthorPacks>;
const loadPacksResult = loadLocalAuthorPacksResult as jest.MockedFunction<typeof loadLocalAuthorPacksResult>;

const ROOT = path.resolve(__dirname, '..');
const sheet = fs.readFileSync(path.join(ROOT, 'app/flashcards/ExpandedCardV2.tsx'), 'utf8');
const NO_PACKS_RU = 'Своих наборов пока нет';
const ONLY_PUBLISHED_RU = 'Нет наборов, куда можно добавить';
const LOAD_FAILED_RU = 'Не удалось загрузить наборы';

type Pack = Awaited<ReturnType<typeof loadLocalAuthorPacks>>[number];
const pack = (id: string, cloudPackId?: string): Pack => ({ id, title: `Набор ${id}`, cards: [], ...(cloudPackId ? { cloudPackId } : {}) } as unknown as Pack);

/** Текст пустой шторки — ровно то правило, что стоит в ExpandedCardV2 (проверено исходником ниже). */
function emptySheetText(state: Readonly<{ addable: readonly unknown[]; publishedCount: number; status?: string }>): string | null {
  if (state.addable.length > 0) return null; // список наборов, пустого текста нет
  if (state.status === 'stale' && state.publishedCount === 0) return LOAD_FAILED_RU; // наборы не прочитались
  const onlyPublished = state.addable.length === 0 && state.publishedCount > 0;
  return onlyPublished ? ONLY_PUBLISHED_RU : NO_PACKS_RU;
}
const ready = (packs: Pack[]) => ({ packs, status: 'ready' as const });

let logs: string[] = [];
beforeEach(() => {
  jest.clearAllMocks();
  logs = [];
  jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { logs.push(args.map(String).join(' ')); });
  jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { logs.push(args.map(String).join(' ')); });
});
afterEach(() => jest.restoreAllMocks());

describe('шторка «В какой набор?» — правило текста в ExpandedCardV2 (исходник)', () => {
  test('пустой текст выбирается только из onlyPublished и copy.noPacks, onlyPublished = «добавлять некуда, но опубликованные есть»', () => {
    expect(sheet).toContain('setOnlyPublished(state.addable.length === 0 && state.publishedCount > 0);');
    expect(sheet).toContain('setPacks(state.addable);');
    expect(sheet).toContain('{onlyPublished ? onlyPublishedText : copy.noPacks}');
    expect(sheet).toContain(`noPacks: '${NO_PACKS_RU}'`);
    expect(sheet).toContain(`ru: '${ONLY_PUBLISHED_RU}'`);
  });
});

describe('loadPackPickerState — состояния', () => {
  test('наборов нет → «Своих наборов пока нет»', async () => {
    loadPacksResult.mockResolvedValue(ready([]));
    const state = await loadPackPickerState();
    expect(state).toEqual({ addable: [], publishedCount: 0, status: 'ready' });
    expect(emptySheetText(state)).toBe(NO_PACKS_RU);
    expect(logs.some((l) => l.includes('[PACK-CARD-ADD] шторка: доступно=0 опубликовано=0 status=ready'))).toBe(true);
  });

  test('только опубликованный → «Нет наборов, куда можно добавить»', async () => {
    loadPacksResult.mockResolvedValue(ready([pack('a', 'cloud-a')]));
    const state = await loadPackPickerState();
    expect(state.addable).toEqual([]);
    expect(state.publishedCount).toBe(1);
    expect(emptySheetText(state)).toBe(ONLY_PUBLISHED_RU);
  });

  test('есть свой неопубликованный → список, опубликованные в него не попадают', async () => {
    loadPacksResult.mockResolvedValue(ready([pack('mine'), pack('pub', 'cloud-pub')]));
    const state = await loadPackPickerState();
    expect(state.addable.map((p) => p.id)).toEqual(['mine']);
    expect(state.publishedCount).toBe(1);
    expect(emptySheetText(state)).toBeNull();
  });

  // ── Сбой чтения ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // loadLocalAuthorPacksResult отдаёт { packs: [], status: 'stale' }, когда аккаунт ещё не готов / сменился или AsyncStorage
  // бросил без тёплого кэша. Шторка спрашивает именно его, повторяет один раз и отличает сбой от «наборов нет».

  test('сбой чтения дважды → статус stale, «Не удалось загрузить наборы», журнал [PACK-CARD-ADD] пишет причину и повтор', async () => {
    loadPacksResult.mockResolvedValue({ packs: [], status: 'stale' });
    const state = await loadPackPickerState();
    expect(state.status).toBe('stale');
    expect(loadPacksResult).toHaveBeenCalledTimes(2); // один тихий повтор
    expect(emptySheetText(state)).toBe(LOAD_FAILED_RU);
    expect(logs.some((l) => l.includes('[PACK-CARD-ADD]') && /stale/.test(l) && /тихий повтор/.test(l))).toBe(true);
    expect(logs.some((l) => l.includes('[PACK-CARD-ADD]') && /повтор тоже stale/.test(l))).toBe(true);
    expect(loadPacks).not.toHaveBeenCalled();
  });

  test('первый раз stale, повтор прочитал → обычный список, сбоя не видно', async () => {
    loadPacksResult
      .mockResolvedValueOnce({ packs: [], status: 'stale' })
      .mockResolvedValueOnce(ready([pack('mine')]));
    const state = await loadPackPickerState();
    expect(state.status).toBe('ready');
    expect(state.addable.map((p) => p.id)).toEqual(['mine']);
    expect(emptySheetText(state)).toBeNull();
  });

  test('stale, но тёплый кэш дал свой набор → показываем его, а не сбой', async () => {
    loadPacksResult.mockResolvedValue({ packs: [pack('cached')], status: 'stale' });
    const state = await loadPackPickerState();
    expect(state.status).toBe('stale');
    expect(state.addable.map((p) => p.id)).toEqual(['cached']);
    expect(emptySheetText(state)).toBeNull();
  });
});

describe('шторка: сбой чтения — честный текст и «Повторить» (исходник ExpandedCardV2)', () => {
  test('stale без наборов и отказ промиса ведут в «Не удалось загрузить наборы» + «Повторить», не в «Своих наборов пока нет»', () => {
    expect(sheet).toContain("const failed = state.status === 'stale' && state.addable.length === 0 && state.publishedCount === 0;");
    expect(sheet).toContain('setLoadFailed(failed);');
    expect(sheet).toContain('setLoadFailed(true);');
    expect(sheet).toContain(`ru: '${LOAD_FAILED_RU}'`);
    expect(sheet).toMatch(/packs\.length === 0 && loadFailed \? \(\s*<View testID="fc-expanded-pack-picker-failed">/);
    expect(sheet).toContain('testID="fc-expanded-pack-picker-retry" icon="refresh" title={retryText} onPress={openPacks}');
  });
});

describe('источник сбоя — немой catch в чтении наборов', () => {
  test('catch чтения наборов (localAuthorPacks.ts readPacksForTargetResult) пишет причину', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/community_packs/localAuthorPacks.ts'), 'utf8');
    const body = src.slice(src.indexOf('async function readPacksForTargetResult'), src.indexOf('async function readPacksForTarget('));
    expect(body).not.toMatch(/\}\s*catch\s*\{/); // голый catch без переменной — причина теряется
    expect(body).toContain('[PACK-READ] чтение наборов упало');
  });
});
