import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

import {
  buildTrainerWordSessionDeck,
  getWarmWordSessionDeck,
  WORD_SESSION_LIMIT,
} from '../app/trainer_practice_hall';
import { getTrainerDashboard, type TrainerItem } from '../app/trainer_store';
import { trainerStoreKey } from '../app/target_storage_keys';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

function dueWord(key: string, translationRu: string): TrainerItem {
  return {
    key,
    queue: 'words',
    translationRu,
    translationUk: translationRu,
    lessonId: 1,
    mistakeCount: 2,
    correctStreak: 0,
    nextDue: Date.now() - 1_000,
    createdAt: Date.now() - 86_400_000,
    archived: false,
  };
}

describe('trainer words session warm start', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/trainer_words_session.tsx'), 'utf8');

  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.clearAllMocks();
  });

  it('hydrates from the warm cache but keeps cards hidden until Plus verification', () => {
    expect(source).toContain('getWarmWordSessionDeck');
    expect(source).toContain('useState<WordSessionCard[]>(() => warmDeck ?? [])');
    expect(source).toContain('useState(() => warmDeck === null)');
    expect(source).toContain('const [accessReady, setAccessReady] = useState(false);');
    expect(source).toContain('const sessionStartRef = useRef(0);');
    expect(source).not.toContain('useState(() => warmDeck !== null)');
    expect(source).toContain('const startedWarm = warmDeckRef.current !== null');
  });

  it('builds the same word cards for warm and async paths', () => {
    const items = [dueWord('team', 'команда'), dueWord('house', 'дом')];
    const deck = buildTrainerWordSessionDeck(items, 'ru', () => 0.9);

    expect(deck).toHaveLength(2);
    expect(deck.map((card) => card.item.key)).toEqual(['team', 'house']);
    expect(deck.every((card) => card.isCorrectTranslation)).toBe(true);
  });

  it('returns a synchronous deck after the practice dashboard warmed the store', async () => {
    const items = [dueWord('team', 'команда'), dueWord('house', 'дом')];
    await AsyncStorage.setItem(trainerStoreKey('en'), JSON.stringify(items));
    await getTrainerDashboard('en', 'ru', null);

    const deck = getWarmWordSessionDeck(WORD_SESSION_LIMIT, 'en', 'ru', 'ru', () => 0.9);
    expect(deck?.map((card) => card.item.key)).toEqual(['team', 'house']);
  });
});
