import AsyncStorage from '@react-native-async-storage/async-storage';

const FALLBACK_NICKNAME_PREFIX = 'Phraseman';

export function createRandomNickname(now = Date.now(), random = Math.random()): string {
  const rand = Math.floor(Math.max(0, Math.min(0.99999, random)) * 90_000) + 10_000;
  const suffix = String((Math.abs(Math.trunc(now)) + rand) % 100_000).padStart(5, '0');
  return `${FALLBACK_NICKNAME_PREFIX} ${suffix}`;
}

export async function ensureLocalNickname(candidate?: string | null): Promise<string> {
  const trimmedCandidate = String(candidate ?? '').trim();
  const stored = (await AsyncStorage.getItem('user_name').catch(() => null))?.trim() ?? '';
  const finalName = trimmedCandidate || stored || createRandomNickname();

  if (finalName !== stored) {
    await AsyncStorage.setItem('user_name', finalName);
    void import('./firestore_leaderboard')
      .then(({ reserveNameDetailed }) => reserveNameDetailed(finalName, stored, { source: 'onboarding' }))
      .catch(() => {});
  }

  return finalName;
}
