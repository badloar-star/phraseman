// Profile-name validation + local cache propagation used by settings screen.
import AsyncStorage from '@react-native-async-storage/async-storage';

const BAD_WORDS = [
  'хуй','піздець','пизда','блядь','бляд','ёбан','єбан','єбать','ебать','ебал','залупа',
  'мудак','мудила','сука','пидор','пидар','хуйня','піздюк','нахуй','нахій','сучка','мразь',
  'тварь','ублюдок','ёб','йоб','fuck','shit','bitch','cunt','dick','ass','asshole','faggot',
  'nigger','bastard',
];

export type NameValidationError = 'empty' | 'too_short' | 'too_long' | 'profanity';

export function validateProfileName(raw: string): NameValidationError | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'empty';
  if (trimmed.length < 2) return 'too_short';
  if (trimmed.length > 20) return 'too_long';
  const low = trimmed.toLowerCase();
  if (BAD_WORDS.some(w => low.includes(w))) return 'profanity';
  return null;
}

export async function syncNameAcrossLocalCaches(oldName: string, newName: string): Promise<void> {
  await Promise.all([
    updateLeaderboardName(oldName, newName),
    updateWeekLeaderboardName(oldName, newName),
    updateLeagueStateName(newName),
    updateLeaguePendingResultName(newName),
  ]);
}

async function updateLeaderboardName(oldName: string, newName: string): Promise<void> {
  const raw = await AsyncStorage.getItem('leaderboard');
  if (!raw) return;
  const arr = JSON.parse(raw);
  const updated = arr.map((e: any) => (e.name === oldName ? { ...e, name: newName } : e));
  await AsyncStorage.setItem('leaderboard', JSON.stringify(updated));
}

async function updateWeekLeaderboardName(oldName: string, newName: string): Promise<void> {
  const raw = await AsyncStorage.getItem('week_leaderboard');
  if (!raw) return;
  const arr = JSON.parse(raw);
  const updated = arr.map((e: any) => (e.name === oldName ? { ...e, name: newName } : e));
  await AsyncStorage.setItem('week_leaderboard', JSON.stringify(updated));
}

async function updateLeagueStateName(newName: string): Promise<void> {
  const raw = await AsyncStorage.getItem('league_state_v3');
  if (!raw) return;
  const state = JSON.parse(raw);
  if (!state.group) return;
  state.group = state.group.map((m: any) => (m.isMe ? { ...m, name: newName } : m));
  await AsyncStorage.setItem('league_state_v3', JSON.stringify(state));
}

async function updateLeaguePendingResultName(newName: string): Promise<void> {
  const raw = await AsyncStorage.getItem('league_result_pending');
  if (!raw) return;
  const result = JSON.parse(raw);
  if (!result.group) return;
  result.group = result.group.map((m: any) => (m.isMe ? { ...m, name: newName } : m));
  await AsyncStorage.setItem('league_result_pending', JSON.stringify(result));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
