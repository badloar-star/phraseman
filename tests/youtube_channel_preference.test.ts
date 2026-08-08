import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetAccountGenerationForTests, beginAccountGeneration, captureAccountGeneration } from '../app/account_generation';
import {
  getYoutubeChannelPreference,
  hydrateYoutubeChannelPreference,
  resolvePreferredYoutubeChannel,
  resetYoutubeChannelPreferenceForTests,
  setYoutubeChannelPreference,
} from '../app/youtube_channel_preference';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };
const manifest = {
  schemaVersion: 1 as const,
  activeVersion: 'v1',
  generatedAt: '2026-08-08T10:00:00.000Z',
  sourceRefreshedAt: '2026-08-08T10:00:00.000Z',
  defaultChannelId: 'english',
  localeDefaults: { en: 'english', pt: 'portuguese', 'pt-BR': 'brazil' },
  channels: [
    { id: 'english', displayName: 'English', languageTags: ['en'], order: 0 },
    { id: 'portuguese', displayName: 'Português', languageTags: ['pt'], order: 1 },
    { id: 'brazil', displayName: 'Brasil', languageTags: ['pt-BR'], order: 2 },
  ],
};

describe('YouTube channel preference', () => {
  beforeEach(() => {
    storage.__reset?.();
    __resetAccountGenerationForTests();
    resetYoutubeChannelPreferenceForTests();
  });

  it('resolves exact, base, default and valid manual selection', () => {
    expect(resolvePreferredYoutubeChannel(manifest, 'pt-BR', { mode: 'auto' }).channelId).toBe('brazil');
    expect(resolvePreferredYoutubeChannel(manifest, 'pt-PT', { mode: 'auto' }).channelId).toBe('portuguese');
    expect(resolvePreferredYoutubeChannel(manifest, 'de', { mode: 'auto' }).channelId).toBe('english');
    expect(resolvePreferredYoutubeChannel(manifest, 'de', { mode: 'manual', channelId: 'brazil' }).channelId).toBe('brazil');
  });

  it('clears removed manual channels back to auto', () => {
    expect(resolvePreferredYoutubeChannel(manifest, 'en', { mode: 'manual', channelId: 'removed' })).toEqual({ channelId: 'english', preference: { mode: 'auto' }, clearedInvalidManual: true });
  });

  it('persists and hydrates per account without leaking between generations', async () => {
    const alice = beginAccountGeneration('alice');
    await setYoutubeChannelPreference({ mode: 'manual', channelId: 'brazil' }, alice);
    expect(getYoutubeChannelPreference(alice)).toEqual({ mode: 'manual', channelId: 'brazil' });

    const bob = beginAccountGeneration('bob');
    await hydrateYoutubeChannelPreference(bob);
    expect(getYoutubeChannelPreference(bob)).toEqual({ mode: 'auto' });

    const current = captureAccountGeneration();
    await setYoutubeChannelPreference({ mode: 'manual', channelId: 'english' }, current);
    expect(getYoutubeChannelPreference(current)).toEqual({ mode: 'manual', channelId: 'english' });
  });
});
