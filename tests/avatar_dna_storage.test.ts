import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import { starterAvatarDNA } from '../modules/avatar-dna/catalog';
import { parseAvatarDNA } from '../modules/avatar-dna/canonicalize';
import {
  avatarDNAStateStorageKey,
  commitAvatarDNA,
  readAvatarDNAState,
} from '../modules/avatar-dna/storage';

jest.mock('@react-native-async-storage/async-storage');

const dna = starterAvatarDNA('starter_warm_01');
const changedDNA = () => parseAvatarDNA({
  ...dna,
  hair: { ...dna.hair, colorId: 'hair_black' },
});

describe('Avatar DNA account-scoped storage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    __resetAccountGenerationForTests();
  });

  it('writes confirmed DNA and both last-good render ids in one account-scoped commit', async () => {
    const generation = beginAccountGeneration('u1').generation;

    await expect(commitAvatarDNA({
      ownerStableId: 'u1',
      accountGeneration: generation,
      dna,
      renderIds: { portrait: 'portrait_1', studio: 'studio_1' },
      manifestVersion: 1,
    })).resolves.toEqual({ status: 'committed' });

    await expect(readAvatarDNAState('u1', generation)).resolves.toEqual({
      schemaVersion: 1,
      ownerStableId: 'u1',
      accountGeneration: generation,
      confirmedDNA: dna,
      lastConfirmedDNA: dna,
      manifestVersion: 1,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' },
      updatedAtMs: expect.any(Number),
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      avatarDNAStateStorageKey('u1', generation),
      expect.any(String),
    );
  });

  it('keeps the previous confirmed DNA as lastConfirmedDNA', async () => {
    const generation = beginAccountGeneration('u1').generation;
    const nextDNA = changedDNA();
    await commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna,
      renderIds: { portrait: 'portrait_1', studio: 'studio_1' }, manifestVersion: 1,
    });
    await commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna: nextDNA,
      renderIds: { portrait: 'portrait_2', studio: 'studio_2' }, manifestVersion: 2,
    });

    const stored = await readAvatarDNAState('u1', generation);
    expect(stored?.confirmedDNA).toEqual(nextDNA);
    expect(stored?.lastConfirmedDNA).toEqual(dna);
    expect(stored?.lastGood).toEqual({ portrait: 'portrait_2', studio: 'studio_2' });
  });

  it('returns stale-account and writes nothing for stale generation or stable id', async () => {
    const oldGeneration = beginAccountGeneration('u1').generation;
    const currentGeneration = beginAccountGeneration('u1').generation;

    await expect(commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: oldGeneration, dna,
      renderIds: { portrait: 'portrait_1', studio: 'studio_1' }, manifestVersion: 1,
    })).resolves.toEqual({ status: 'stale-account' });
    await expect(commitAvatarDNA({
      ownerStableId: 'u2', accountGeneration: currentGeneration, dna,
      renderIds: { portrait: 'portrait_1', studio: 'studio_1' }, manifestVersion: 1,
    })).resolves.toEqual({ status: 'stale-account' });

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('re-checks account identity after waiting behind a queued transition', async () => {
    const generation = beginAccountGeneration('u1').generation;
    let release!: () => void;
    const blocker = withAccountTransitionLock(() => new Promise<void>((resolve) => { release = resolve; }));
    await Promise.resolve();

    const commit = commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna,
      renderIds: { portrait: 'portrait_1', studio: 'studio_1' }, manifestVersion: 1,
    });
    invalidateAccountGeneration();
    beginAccountGeneration('u2');
    release();
    await blocker;

    await expect(commit).resolves.toEqual({ status: 'stale-account' });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('serializes commits and exposes only complete root records', async () => {
    const generation = beginAccountGeneration('u1').generation;
    const nextDNA = changedDNA();
    await Promise.all([
      commitAvatarDNA({
        ownerStableId: 'u1', accountGeneration: generation, dna,
        renderIds: { portrait: 'portrait_1', studio: 'studio_1' }, manifestVersion: 1,
      }),
      commitAvatarDNA({
        ownerStableId: 'u1', accountGeneration: generation, dna: nextDNA,
        renderIds: { portrait: 'portrait_2', studio: 'studio_2' }, manifestVersion: 2,
      }),
    ]);

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    await expect(readAvatarDNAState('u1', generation)).resolves.toMatchObject({
      confirmedDNA: nextDNA,
      lastConfirmedDNA: dna,
      lastGood: { portrait: 'portrait_2', studio: 'studio_2' },
    });
  });

  it('does not publish partial state when the durable root write fails', async () => {
    const generation = beginAccountGeneration('u1').generation;
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));

    await expect(commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna,
      renderIds: { portrait: 'portrait_1', studio: 'studio_1' }, manifestVersion: 1,
    })).rejects.toThrow('disk full');
    await expect(readAvatarDNAState('u1', generation)).resolves.toBeNull();
  });

  it.each([
    ['corrupt JSON', '{bad'],
    ['unknown root key', JSON.stringify({ extra: true })],
    ['unknown nested key', JSON.stringify({
      schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 1,
      confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1', extra: true }, updatedAtMs: 1,
    })],
    ['invalid DNA', JSON.stringify({
      schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 1,
      confirmedDNA: {}, lastConfirmedDNA: {}, manifestVersion: 1,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' }, updatedAtMs: 1,
    })],
    ['wrong owner', JSON.stringify({
      schemaVersion: 1, ownerStableId: 'u2', accountGeneration: 1,
      confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' }, updatedAtMs: 1,
    })],
    ['invalid stored generation', JSON.stringify({
      schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 0,
      confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' }, updatedAtMs: 1,
    })],
    ['fractional manifest version', JSON.stringify({
      schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 1,
      confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1.5,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' }, updatedAtMs: 1,
    })],
    ['negative timestamp', JSON.stringify({
      schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 1,
      confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1,
      lastGood: { portrait: 'portrait_1', studio: 'studio_1' }, updatedAtMs: -1,
    })],
    ['path render id', JSON.stringify({
      schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 1,
      confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1,
      lastGood: { portrait: '../portrait', studio: 'studio_1' }, updatedAtMs: 1,
    })],
    ['URL render id', JSON.stringify({
      schemaVersion: 1, ownerStableId: 'u1', accountGeneration: 1,
      confirmedDNA: dna, lastConfirmedDNA: dna, manifestVersion: 1,
      lastGood: { portrait: 'https://example.com/p', studio: 'studio_1' }, updatedAtMs: 1,
    })],
  ])('returns null for %s without falling back to another scope', async (_label, raw) => {
    await AsyncStorage.setItem(avatarDNAStateStorageKey('u1', 1), raw);
    await expect(readAvatarDNAState('u1', 1)).resolves.toBeNull();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(avatarDNAStateStorageKey('u1', 1));
  });

  it('encodes validated scope components without collisions or key injection', () => {
    expect(avatarDNAStateStorageKey('owner:1', 2)).not.toBe(
      avatarDNAStateStorageKey('owner', 2),
    );
    expect(avatarDNAStateStorageKey('owner:1', 2)).toContain('owner%3A1');
    expect(avatarDNAStateStorageKey('owner:1', 2)).toBe(
      avatarDNAStateStorageKey('owner:1', 99),
    );
    expect(avatarDNAStateStorageKey('owner:1', 2)).not.toMatch(/:2$/);
    expect(() => avatarDNAStateStorageKey(' owner ', 2)).toThrow('avatar_dna_scope_invalid');
    expect(() => avatarDNAStateStorageKey('', 2)).toThrow('avatar_dna_scope_invalid');
  });

  it('survives a process restart that resets the volatile account generation', async () => {
    beginAccountGeneration('other-owner');
    beginAccountGeneration('other-owner');
    const savedGeneration = beginAccountGeneration('u1').generation;
    await commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: savedGeneration, dna,
      renderIds: { portrait: 'portrait_restart', studio: 'studio_restart' }, manifestVersion: 1,
    });

    __resetAccountGenerationForTests();
    const restartedGeneration = beginAccountGeneration('u1').generation;
    expect(restartedGeneration).toBe(1);

    await expect(readAvatarDNAState('u1', restartedGeneration)).resolves.toMatchObject({
      ownerStableId: 'u1',
      accountGeneration: restartedGeneration,
      confirmedDNA: dna,
      lastGood: { portrait: 'portrait_restart', studio: 'studio_restart' },
    });
    await expect(readAvatarDNAState('u2', restartedGeneration)).resolves.toBeNull();
  });

  it('rolls back a completed native write when generation changes while setItem is pending', async () => {
    const generation = beginAccountGeneration('u1').generation;
    await commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna,
      renderIds: { portrait: 'portrait_before', studio: 'studio_before' }, manifestVersion: 1,
    });
    const key = avatarDNAStateStorageKey('u1', generation);
    const previousRaw = await AsyncStorage.getItem(key);
    let releaseWrite!: () => void;
    let writeStarted!: () => void;
    const pendingWrite = new Promise<void>((resolve) => { releaseWrite = resolve; });
    const started = new Promise<void>((resolve) => { writeStarted = resolve; });
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async (writeKey, raw) => {
      writeStarted();
      await pendingWrite;
      await AsyncStorage.multiSet([[writeKey, raw]]);
    });

    const committing = commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna: changedDNA(),
      renderIds: { portrait: 'portrait_after', studio: 'studio_after' }, manifestVersion: 2,
    });
    await started;
    beginAccountGeneration('u1');
    releaseWrite();

    await expect(committing).resolves.toEqual({ status: 'stale-account' });
    await expect(AsyncStorage.getItem(key)).resolves.toBe(previousRaw);
  });

  it('removes a newly written root when owner changes during the native write', async () => {
    const generation = beginAccountGeneration('u1').generation;
    const key = avatarDNAStateStorageKey('u1', generation);
    let releaseWrite!: () => void;
    let writeStarted!: () => void;
    const pendingWrite = new Promise<void>((resolve) => { releaseWrite = resolve; });
    const started = new Promise<void>((resolve) => { writeStarted = resolve; });
    (AsyncStorage.setItem as jest.Mock).mockImplementationOnce(async (writeKey, raw) => {
      writeStarted();
      await pendingWrite;
      await AsyncStorage.multiSet([[writeKey, raw]]);
    });

    const committing = commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna,
      renderIds: { portrait: 'portrait_new', studio: 'studio_new' }, manifestVersion: 1,
    });
    await started;
    beginAccountGeneration('u2');
    releaseWrite();

    await expect(committing).resolves.toEqual({ status: 'stale-account' });
    await expect(AsyncStorage.getItem(key)).resolves.toBeNull();
  });

  it('never falls back from the current account to a previous account or generation', async () => {
    const generationA = beginAccountGeneration('u1').generation;
    await commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generationA, dna,
      renderIds: { portrait: 'portrait_a', studio: 'studio_a' }, manifestVersion: 1,
    });
    const generationB = beginAccountGeneration('u2').generation;

    await expect(readAvatarDNAState('u2', generationB)).resolves.toBeNull();
    await expect(readAvatarDNAState('u1', generationA)).resolves.toMatchObject({
      ownerStableId: 'u1',
      accountGeneration: generationA,
    });
    expect(avatarDNAStateStorageKey('u1', generationA)).not.toBe(
      avatarDNAStateStorageKey('u2', generationB),
    );
  });

  it('deeply reconstructs reads and cannot be changed through caller aliases', async () => {
    const generation = beginAccountGeneration('u1').generation;
    const mutableDNA = JSON.parse(JSON.stringify(dna));
    await commitAvatarDNA({
      ownerStableId: 'u1', accountGeneration: generation, dna: mutableDNA,
      renderIds: { portrait: 'portrait_1', studio: 'studio_1' }, manifestVersion: 1,
    });
    mutableDNA.base.skinToneId = 'skin_mutated';

    const first = await readAvatarDNAState('u1', generation);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first?.confirmedDNA.face.skinDetailIds)).toBe(true);
    expect(() => {
      (first?.confirmedDNA.base as { skinToneId: string }).skinToneId = 'skin_read_mutation';
    }).toThrow();
    const second = await readAvatarDNAState('u1', generation);

    expect(second?.confirmedDNA.base.skinToneId).toBe(dna.base.skinToneId);
    expect(second?.confirmedDNA).not.toBe(second?.lastConfirmedDNA);
  });
});
