/* eslint-disable import/first */
const mockGetApp = jest.fn(() => ({ name: 'app' }));
const mockGetFunctions = jest.fn(() => ({ region: 'us-central1' }));
const mockCallableRun = jest.fn();
const mockHttpsCallable = jest.fn(() => mockCallableRun);
const mockInitAppCheck = jest.fn(async () => undefined);

jest.mock('@react-native-firebase/app', () => ({ getApp: mockGetApp }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: mockGetFunctions,
  httpsCallable: mockHttpsCallable,
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: mockInitAppCheck,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DIALOGUE_V2_CATALOGUE_REFRESH_MS,
  DialogueV2CatalogueUnavailableError,
  fetchDialogueV2CatalogueFromNetwork,
  fetchReleasedDialogueV2Catalogue,
  getEmbeddedDialogueV2Catalogue,
  peekDialogueV2Catalogue,
  resetDialogueV2CatalogueClientForTests,
} from '../app/dialogue_v2_catalogue_client';
import { projectAuthorizedDialogueV2Catalogue } from '../app/dialogue_v2_authorized_catalogue_projection';

const storage = AsyncStorage as unknown as { __reset(): void; setItem: jest.Mock; getItem: jest.Mock };

const releaseEnvelope = Object.freeze({
  ok: true,
  packets: [{ studyTarget: 'en', scenario: { id: 'social_01' } }],
});

const WORLD_HEADINGS = [
  { id: 'social', title: 'Social' },
  { id: 'work', title: 'Work' },
  { id: 'travel', title: 'Travel' },
  { id: 'everyday', title: 'Everyday' },
];

function networkEnvelopeFrom(target: 'en' | 'es' | 'fr' | 'de') {
  const embedded = getEmbeddedDialogueV2Catalogue(target)!;
  // Отличимая от встроенной копия: тот же контент, другой объект.
  return { ok: true, packets: JSON.parse(JSON.stringify(embedded.packets)) as unknown[] };
}

describe('Dialogue V2 catalogue: raw network call', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDialogueV2CatalogueClientForTests();
    mockCallableRun.mockResolvedValue({ data: releaseEnvelope });
  });

  it('initializes App Check and sends only the selected learning language', async () => {
    await expect(fetchDialogueV2CatalogueFromNetwork('en')).resolves.toEqual(releaseEnvelope);

    expect(mockInitAppCheck).toHaveBeenCalledTimes(1);
    expect(mockGetFunctions).toHaveBeenCalledWith({ name: 'app' }, 'us-central1');
    expect(mockHttpsCallable).toHaveBeenCalledWith({ region: 'us-central1' }, 'dialogueV2Catalogue');
    expect(mockCallableRun).toHaveBeenCalledWith({ studyTarget: 'en' });
    expect(mockInitAppCheck.mock.invocationCallOrder[0])
      .toBeLessThan(mockHttpsCallable.mock.invocationCallOrder[0]);
  });

  it.each([
    [{ ok: true, packets: [], releaseId: 'never-expose-release-admin-data' }],
    [{ ok: true, packets: [], manifest: { reviewReceiptSha256: 'never-expose' } }],
    [{ ok: false, packets: [] }],
    [{ ok: true, packets: 'not-an-array' }],
  ])('rejects an unexpected callable envelope', async (data) => {
    mockCallableRun.mockResolvedValue({ data });

    await expect(fetchDialogueV2CatalogueFromNetwork('de')).resolves.toBeNull();
  });

  it('does not leak callable details when the release cannot be fetched', async () => {
    mockCallableRun.mockRejectedValue(new Error('permission-denied: internal release state'));

    await expect(fetchDialogueV2CatalogueFromNetwork('fr'))
      .rejects.toEqual(new DialogueV2CatalogueUnavailableError('catalogue_release_unavailable'));
  });
});

describe('Dialogue V2 catalogue: cache → embedded → background', () => {
  const NOW = Date.UTC(2026, 9, 1, 12);

  beforeEach(() => {
    jest.clearAllMocks();
    storage.__reset();
    resetDialogueV2CatalogueClientForTests();
  });

  it.each(['en', 'es', 'fr', 'de'] as const)(
    'the embedded %s snapshot passes the same learner revalidation as the network response',
    (target) => {
      const embedded = getEmbeddedDialogueV2Catalogue(target);
      expect(embedded?.packets).toHaveLength(76);
      const projection = projectAuthorizedDialogueV2Catalogue({
        packets: embedded!.packets, studyTarget: target, localCoinRank: 1, worldHeadings: WORLD_HEADINGS,
      });
      expect(projection?.items).toHaveLength(76);
    },
  );

  it('peek gives the first frame synchronously without any network', () => {
    expect(peekDialogueV2Catalogue('de')).toBe(getEmbeddedDialogueV2Catalogue('de'));
    expect(peekDialogueV2Catalogue('it' as never)).toBeNull();
    expect(mockCallableRun).not.toHaveBeenCalled();
  });

  it('never throws: an undeployed callable falls back to the embedded catalogue', async () => {
    mockCallableRun.mockRejectedValue(Object.assign(new Error('NOT_FOUND'), { code: 'functions/not-found' }));

    await expect(fetchReleasedDialogueV2Catalogue('fr', { awaitRefresh: true, nowMs: NOW }))
      .resolves.toBe(getEmbeddedDialogueV2Catalogue('fr'));
    expect(mockCallableRun).toHaveBeenCalledTimes(1);
  });

  it('a failed attempt also opens the 12-hour window (no network on every hub entry)', async () => {
    mockCallableRun.mockRejectedValue(new Error('offline'));
    await fetchReleasedDialogueV2Catalogue('fr', { awaitRefresh: true, nowMs: NOW });
    await fetchReleasedDialogueV2Catalogue('fr', { awaitRefresh: true, nowMs: NOW + 60_000 });
    expect(mockCallableRun).toHaveBeenCalledTimes(1);

    await fetchReleasedDialogueV2Catalogue('fr', { awaitRefresh: true, nowMs: NOW + DIALOGUE_V2_CATALOGUE_REFRESH_MS });
    expect(mockCallableRun).toHaveBeenCalledTimes(2);
  });

  it('caches a successful response per language and serves it without network for 12 hours', async () => {
    const network = networkEnvelopeFrom('es');
    mockCallableRun.mockResolvedValue({ data: network });

    const first = await fetchReleasedDialogueV2Catalogue('es', { awaitRefresh: true, nowMs: NOW });
    expect(first?.packets).toEqual(network.packets);
    expect(first).not.toBe(getEmbeddedDialogueV2Catalogue('es'));
    expect(storage.setItem).toHaveBeenCalledWith('dialogue_v2_catalogue_cache_v1:es', expect.any(String));

    // Новый запуск приложения: память пуста, кэш на диске свежий.
    resetDialogueV2CatalogueClientForTests();
    mockCallableRun.mockClear();
    const second = await fetchReleasedDialogueV2Catalogue('es', { awaitRefresh: true, nowMs: NOW + 1000 });
    expect(second?.packets).toEqual(network.packets);
    expect(mockCallableRun).not.toHaveBeenCalled();
    expect(peekDialogueV2Catalogue('es')).toBe(second);
  });

  it('a stale cache is served immediately and refreshed in the background', async () => {
    const network = networkEnvelopeFrom('en');
    mockCallableRun.mockResolvedValue({ data: network });
    await fetchReleasedDialogueV2Catalogue('en', { awaitRefresh: true, nowMs: NOW });
    mockCallableRun.mockClear();

    const later = NOW + DIALOGUE_V2_CATALOGUE_REFRESH_MS + 1;
    const served = await fetchReleasedDialogueV2Catalogue('en', { nowMs: later });
    expect(served?.packets).toEqual(network.packets);
    expect(mockCallableRun).toHaveBeenCalledTimes(1);
  });

  it('an incomplete network catalogue never replaces the cached or embedded one', async () => {
    mockCallableRun.mockResolvedValue({ data: releaseEnvelope });
    await expect(fetchReleasedDialogueV2Catalogue('en', { awaitRefresh: true, nowMs: NOW }))
      .resolves.toBe(getEmbeddedDialogueV2Catalogue('en'));
  });

  it('a corrupted disk cache is ignored', async () => {
    storage.getItem.mockResolvedValueOnce('{not json');
    mockCallableRun.mockRejectedValue(new Error('offline'));
    await expect(fetchReleasedDialogueV2Catalogue('de', { awaitRefresh: true, nowMs: NOW }))
      .resolves.toBe(getEmbeddedDialogueV2Catalogue('de'));
  });

  it('does not call Firebase for a target outside the four V2 language contours', async () => {
    await expect(fetchReleasedDialogueV2Catalogue('pt-BR' as never)).resolves.toBeNull();
    expect(mockInitAppCheck).not.toHaveBeenCalled();
    expect(mockCallableRun).not.toHaveBeenCalled();
  });
});
