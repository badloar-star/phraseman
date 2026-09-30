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

import {
  DialogueV2CatalogueUnavailableError,
  fetchReleasedDialogueV2Catalogue,
} from '../app/dialogue_v2_catalogue_client';

const releaseEnvelope = Object.freeze({
  ok: true,
  packets: [{ studyTarget: 'en', scenario: { id: 'social_01' } }],
});

describe('released Dialogue V2 catalogue Firebase client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallableRun.mockResolvedValue({ data: releaseEnvelope });
  });

  it('initializes App Check and sends only the selected learning language', async () => {
    await expect(fetchReleasedDialogueV2Catalogue('en')).resolves.toEqual(releaseEnvelope);

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

    await expect(fetchReleasedDialogueV2Catalogue('de')).resolves.toBeNull();
  });

  it('does not call Firebase for a target outside the four V2 language contours', async () => {
    await expect(fetchReleasedDialogueV2Catalogue('pt-BR' as never)).resolves.toBeNull();

    expect(mockInitAppCheck).not.toHaveBeenCalled();
    expect(mockCallableRun).not.toHaveBeenCalled();
  });

  it('does not leak callable details when the release cannot be fetched', async () => {
    mockCallableRun.mockRejectedValue(new Error('permission-denied: internal release state'));

    await expect(fetchReleasedDialogueV2Catalogue('fr'))
      .rejects.toEqual(new DialogueV2CatalogueUnavailableError('catalogue_release_unavailable'));
  });
});
