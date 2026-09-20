jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readTutorLessonTrace,
  tutorLessonTraceKey,
  writeTutorLessonTrace,
} from '../app/tutor_lesson_local_state';

describe('tutor lesson local trace target isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('preserves the exact legacy English key and salts non-English keys', () => {
    expect(tutorLessonTraceKey('en')).toBe('tutor_lesson_last_v1');
    expect(tutorLessonTraceKey('es')).toBe('tutor_lesson_last_v1::es');
    expect(tutorLessonTraceKey('de')).not.toBe(tutorLessonTraceKey('fr'));
  });

  it('writes and reads only the selected target trace', async () => {
    await writeTutorLessonTrace('de', 'Im Café bestellen');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'tutor_lesson_last_v1::de',
      expect.stringContaining('Im Café bestellen'),
    );
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ nextTopic: 'Pedir comida', finishedAt: 42 }));
    await expect(readTutorLessonTrace('es')).resolves.toEqual({ nextTopic: 'Pedir comida', finishedAt: 42 });
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('tutor_lesson_last_v1::es');
  });
});
