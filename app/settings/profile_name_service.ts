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
  await updateLeaderboardName(oldName, newName);
}

async function updateLeaderboardName(oldName: string, newName: string): Promise<void> {
  const raw = await AsyncStorage.getItem('leaderboard');
  if (!raw) return;
  const arr = JSON.parse(raw);
  const updated = arr.map((e: any) => (e.name === oldName ? { ...e, name: newName } : e));
  await AsyncStorage.setItem('leaderboard', JSON.stringify(updated));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
