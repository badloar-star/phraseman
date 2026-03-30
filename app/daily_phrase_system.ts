/**
 * Система "Фраза дня"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_LESSONS_RU } from './lesson_data_all';

export interface DailyPhrase {
  russian: string;
  english: string;
  lessonId: number;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  date: string;
}

const DAILY_PHRASE_KEY = 'daily_phrase';
const LAST_PHRASE_DATE_KEY = 'last_phrase_date';

export const getTodayPhrase = async (): Promise<DailyPhrase> => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const savedDate = await AsyncStorage.getItem(LAST_PHRASE_DATE_KEY);
    if (savedDate === today) {
      const phraseStr = await AsyncStorage.getItem(DAILY_PHRASE_KEY);
      if (phraseStr) return JSON.parse(phraseStr);
    }
    const newPhrase = selectRandomPhrase();
    newPhrase.date = today;
    await AsyncStorage.setItem(DAILY_PHRASE_KEY, JSON.stringify(newPhrase));
    await AsyncStorage.setItem(LAST_PHRASE_DATE_KEY, today);
    return newPhrase;
  } catch {
    return getDefaultPhrase();
  }
};

const selectRandomPhrase = (): DailyPhrase => {
  const allPhrases: DailyPhrase[] = [];
  for (let i = 1; i <= 32; i++) {
    const lesson = ALL_LESSONS_RU[i - 1];
    if (lesson && lesson.phrases && lesson.phrases.length > 0) {
      const phrase = lesson.phrases[0];
      const level = ['A1', 'A2', 'B1', 'B2'][Math.floor((i - 1) / 8)] as 'A1' | 'A2' | 'B1' | 'B2';
      allPhrases.push({
        russian: phrase.russian,
        english: phrase.english,
        lessonId: i,
        level,
        date: new Date().toISOString().split('T')[0],
      });
    }
  }
  if (allPhrases.length === 0) return getDefaultPhrase();
  const randomIdx = Math.floor(Math.random() * allPhrases.length);
  return allPhrases[randomIdx];
};

const getDefaultPhrase = (): DailyPhrase => ({
  russian: 'Привет, как дела?',
  english: 'Hello, how are you?',
  lessonId: 1,
  level: 'A1',
  date: new Date().toISOString().split('T')[0],
});
