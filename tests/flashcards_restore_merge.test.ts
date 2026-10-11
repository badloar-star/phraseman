// зачем (координатор 11.10, пп.2–3): свои карточки и память ответов при восстановлении сливаются, а не
// перезаписываются облаком; удалённая здесь карточка не воскресает, созданная не пропадает.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { __cloudSyncTestHooks } from '../app/cloud_sync';
import { CARD_DELETION_JOURNAL_KEY } from '../app/flashcards/card_deletion_journal';
import {
  customCardDeletionsForTarget,
  mergeCustomCardsRestoreValue,
  mergeSwipeMemoryRestoreValue,
} from '../app/flashcards/restore_merge';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const card = (id: string, updatedAt: number, en = id) => ({ id, en, ru: '', uk: '', categoryId: 'custom', isSystem: false, updatedAt });
const ids = (raw: string) => (JSON.parse(raw) as { id: string }[]).map((row) => row.id);
const byId = (raw: string) => Object.fromEntries((JSON.parse(raw) as { id: string; en: string }[]).map((row) => [row.id, row]));
const NO_DELETIONS = new Map<string, number>();

describe('п.2 свои карточки', () => {
  it('созданная здесь, которой нет в облаке, не пропадает', () => {
    const merged = mergeCustomCardsRestoreValue(JSON.stringify([card('a', 1), card('new', 5)]), JSON.stringify([card('a', 1)]), NO_DELETIONS);
    expect(ids(merged)).toEqual(['a', 'new']);
  });

  it('удалённая здесь позже последней правки — не воскресает; правленная после удаления — возвращается', () => {
    const deleted = new Map([['gone', 100], ['edited_later', 100]]);
    const merged = mergeCustomCardsRestoreValue(
      JSON.stringify([card('a', 1)]),
      JSON.stringify([card('a', 1), card('gone', 50), card('edited_later', 200)]),
      deleted,
    );
    expect(ids(merged)).toEqual(['a', 'edited_later']);
  });

  it('более свежая правка в облаке побеждает; более свежая локальная — тоже', () => {
    const merged = byId(mergeCustomCardsRestoreValue(
      JSON.stringify([card('a', 10, 'local-old'), card('b', 30, 'local-new')]),
      JSON.stringify([card('a', 20, 'cloud-new'), card('b', 15, 'cloud-old')]),
      NO_DELETIONS,
    ));
    expect(merged.a.en).toBe('cloud-new');
    expect(merged.b.en).toBe('local-new');
  });

  it('битое облако — локальное; битое локальное — облако', () => {
    const local = JSON.stringify([card('a', 1)]);
    expect(mergeCustomCardsRestoreValue(local, 'not json', NO_DELETIONS)).toBe(local);
    const cloud = JSON.stringify([card('b', 1)]);
    expect(mergeCustomCardsRestoreValue('not json', cloud, NO_DELETIONS)).toBe(cloud);
  });

  it('журнал разбирается по языку и списку', () => {
    const journal = new Map([['en:custom:a', 5], ['en:saved:b', 6], ['fr:custom:c', 7]]);
    expect([...customCardDeletionsForTarget(journal, 'en')]).toEqual([['a', 5]]);
    expect(customCardDeletionsForTarget(null, 'en').size).toBe(0);
  });
});

describe('п.3 память ответов: по карточке побеждает последний ответ', () => {
  it('в обе стороны и локальная, которой нет в облаке, переживает', () => {
    const local = JSON.stringify({ x: { seen: 5, lastSeenAt: 300 }, y: { seen: 9, lastSeenAt: 100 }, only_local: { seen: 1, lastSeenAt: 50 } });
    const cloud = JSON.stringify({ x: { seen: 4, lastSeenAt: 200 }, y: { seen: 2, lastSeenAt: 400 }, only_cloud: { seen: 1, lastSeenAt: 10 } });
    const merged = JSON.parse(mergeSwipeMemoryRestoreValue(local, cloud)) as Record<string, { lastSeenAt: number }>;
    expect(merged.x.lastSeenAt).toBe(300);
    expect(merged.y.lastSeenAt).toBe(400);
    expect(merged.only_local.lastSeenAt).toBe(50);
    expect(merged.only_cloud.lastSeenAt).toBe(10);
  });
});

describe('ветка «облако главнее» сливает карточки и память ответов', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('локальная карточка и локальный ответ переживают; удалённая по журналу не воскресает', async () => {
    await AsyncStorage.multiSet([
      ['streak_count', '0'],
      ['custom_flashcards_v2', JSON.stringify([card('mine_new', 900)])],
      ['flashcards_swipe_memory_v1', JSON.stringify({ k: { seen: 3, lastSeenAt: 900 } })],
      [CARD_DELETION_JOURNAL_KEY, JSON.stringify({ v: 1, e: [['en:custom:deleted_here', 500]] })],
    ]);
    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: {
        streak_count: '5',
        last_active_date: '2026-10-10',
        custom_flashcards_v2: JSON.stringify([card('cloud_one', 100), card('deleted_here', 100)]),
        flashcards_swipe_memory_v1: JSON.stringify({ k: { seen: 1, lastSeenAt: 100 } }),
      } }),
    });
    expect(restored).toBe(true);
    const cards = await AsyncStorage.getItem('custom_flashcards_v2');
    expect(ids(cards ?? '[]').sort()).toEqual(['cloud_one', 'mine_new']);
    const memory = JSON.parse((await AsyncStorage.getItem('flashcards_swipe_memory_v1')) ?? '{}') as Record<string, { seen: number }>;
    expect(memory.k.seen).toBe(3);
  });
});
