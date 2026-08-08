import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';
import {
  getDueItems,
  getTrainerCounts,
  getTrainerDashboard,
  getTrainerPremiumItems,
  recordPhraseMistake,
} from '../app/trainer_store';
import { trainerStoreKey } from '../app/target_storage_keys';
import { trainerSessionContentAvailableForTarget } from '../app/trainer_target_gate';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const ROOT = path.join(__dirname, '..');
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  });
});

describe('Gustav French trainer target gate', () => {
  it('opens French trainer session reads from the isolated trainer bucket', async () => {
    await recordPhraseMistake('Je suis ici', 'Я здесь', 'Я тут', 1, 'suis', 'verbe_etre', undefined, 'fr');

    expect(mockStorage[trainerStoreKey('fr')]).toContain('Je suis ici');
    expect(trainerSessionContentAvailableForTarget('fr')).toBe(true);
    await expect(getDueItems('phrases', 15, 'fr')).resolves.toEqual([]);
    await expect(getTrainerPremiumItems('smart_mix', 12, 'fr')).resolves.toHaveLength(1);
    await expect(getTrainerCounts('fr')).resolves.toEqual({ words: 0, phrases: 0 });

    const dashboard = await getTrainerDashboard('fr', 'ru');
    expect(dashboard.totalTracked).toBe(1);
    expect(dashboard.totalDue).toBe(0);
    expect(dashboard.nextQueue).toBeNull();
  });

  it('keeps English trainer sessions available', async () => {
    await recordPhraseMistake('I am here', 'Я здесь', 'Я тут', 1);

    await expect(getTrainerPremiumItems('smart_mix', 12)).resolves.toHaveLength(1);
  });

  it('wires trainer screens through the French source gate instead of empty English sessions', () => {
    const files = [
      'app/trainer.tsx',
      'app/trainer_words_session.tsx',
      'app/trainer_phrases_session.tsx',
      'app/review.tsx',
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(source).toContain("from './trainer_target_gate'");
      expect(source).toMatch(/trainerSessionContentAvailableForTarget|srsReviewContentAvailableForTarget/);
      expect(source).toContain('frenchTrainerGateCopy');
    }
  });

  it('normalizes French trainer target decisions through storageStudyTarget', () => {
    const storeSource = fs.readFileSync(path.join(ROOT, 'app', 'trainer_store.ts'), 'utf8');
    const screenSource = fs.readFileSync(path.join(ROOT, 'app', 'trainer.tsx'), 'utf8');

    expect(storeSource).toContain('storageStudyTarget(studyTarget) ===');
    expect(storeSource).not.toContain('getCachedFrenchRemotePersonalPractice');
    expect(storeSource).not.toContain('mergeFrenchRemotePracticeItems');
    expect(storeSource).not.toContain("studyTarget === 'fr'");
    expect(screenSource).not.toContain("studyTarget === 'fr'");
  });
});
