// зачем (координатор 25.10, паритет cards-gap-039: «Своих наборов пока нет» при существующем своём наборе; Сверка без записи данных не
// воспроизвела): шторка «В какой набор?» карточки (ExpandedCardV2) решает текст по loadPackPickerState. Здесь все четыре состояния:
// нет наборов / только опубликованные / есть свой / сбой чтения. Последний — test.failing: желаемое поведение, которого сейчас нет
// (отчёт Ревизора координатору). Когда починят — test.failing станет красным: переделать в обычный test.
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

type Pack = Awaited<ReturnType<typeof loadLocalAuthorPacks>>[number];
const pack = (id: string, cloudPackId?: string): Pack => ({ id, title: `Набор ${id}`, cards: [], ...(cloudPackId ? { cloudPackId } : {}) } as unknown as Pack);

/** Текст пустой шторки — ровно то правило, что стоит в ExpandedCardV2 (проверено исходником ниже). */
function emptySheetText(state: Readonly<{ addable: readonly unknown[]; publishedCount: number }>): string | null {
  if (state.addable.length > 0) return null; // список наборов, пустого текста нет
  const onlyPublished = state.addable.length === 0 && state.publishedCount > 0;
  return onlyPublished ? ONLY_PUBLISHED_RU : NO_PACKS_RU;
}

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
    loadPacks.mockResolvedValue([]);
    const state = await loadPackPickerState();
    expect(state).toEqual({ addable: [], publishedCount: 0 });
    expect(emptySheetText(state)).toBe(NO_PACKS_RU);
    expect(logs.some((l) => l.includes('[PACK-CARD-ADD] шторка: доступно=0 опубликовано=0'))).toBe(true);
  });

  test('только опубликованный → «Нет наборов, куда можно добавить»', async () => {
    loadPacks.mockResolvedValue([pack('a', 'cloud-a')]);
    const state = await loadPackPickerState();
    expect(state.addable).toEqual([]);
    expect(state.publishedCount).toBe(1);
    expect(emptySheetText(state)).toBe(ONLY_PUBLISHED_RU);
  });

  test('есть свой неопубликованный → список, опубликованные в него не попадают', async () => {
    loadPacks.mockResolvedValue([pack('mine'), pack('pub', 'cloud-pub')]);
    const state = await loadPackPickerState();
    expect(state.addable.map((p) => p.id)).toEqual(['mine']);
    expect(state.publishedCount).toBe(1);
    expect(emptySheetText(state)).toBeNull();
  });

  // ── Сбой чтения ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // loadLocalAuthorPacksResult отдаёт { packs: [], status: 'stale' }, когда аккаунт ещё не готов / сменился или AsyncStorage
  // бросил без тёплого кэша (localAuthorPacks.ts:127/136/170). loadLocalAuthorPacks отбрасывает status, а loadPackPickerState
  // зовёт именно его — сбой неотличим от «наборов нет».

  test('сейчас: сбой чтения при существующем своём наборе → человек видит «Своих наборов пока нет», в журнале причины нет', async () => {
    loadPacks.mockResolvedValue([]); // так выглядит stale для loadPackPickerState
    loadPacksResult.mockResolvedValue({ packs: [], status: 'stale' });
    const state = await loadPackPickerState();
    expect(emptySheetText(state)).toBe(NO_PACKS_RU);
    const pickerLogs = logs.filter((l) => l.includes('[PACK-CARD-ADD]'));
    expect(pickerLogs).toEqual(['[PACK-CARD-ADD] шторка: доступно=0 опубликовано=0']);
    expect(pickerLogs.join(' ')).not.toMatch(/stale|сбой|reason|причин/);
    expect(loadPacksResult).not.toHaveBeenCalled(); // статус чтения шторка вообще не спрашивает
  });

  test.failing('нужно: сбой чтения отличается от «наборов нет» — состояние несёт статус, журнал [PACK-CARD-ADD] пишет причину', async () => {
    loadPacks.mockResolvedValue([]);
    loadPacksResult.mockResolvedValue({ packs: [], status: 'stale' });
    const state = (await loadPackPickerState()) as unknown as Record<string, unknown>;
    expect(state.status ?? state.readStatus).toBe('stale');
    expect(logs.some((l) => l.includes('[PACK-CARD-ADD]') && /stale/.test(l))).toBe(true);
  });
});

describe('источник сбоя — немой catch в чтении наборов', () => {
  test.failing('нужно: catch чтения наборов (localAuthorPacks.ts readPacksForTargetResult) пишет причину', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/community_packs/localAuthorPacks.ts'), 'utf8');
    const body = src.slice(src.indexOf('async function readPacksForTargetResult'), src.indexOf('async function readPacksForTarget('));
    expect(body).not.toMatch(/\}\s*catch\s*\{/); // голый catch без переменной — причина теряется
  });
});
