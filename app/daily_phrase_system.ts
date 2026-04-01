/**
 * Система "Фраза дня"
 * Идиомы показываются по кругу — каждый день следующая по порядку.
 * Когда все закончатся — начинаются снова с первой.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { IDIOMS, Idiom } from './idioms_data';

export interface DailyPhrase {
  english: string;
  literal: string;
  meaning: string;
  text: string;
  date: string;
}

const DAILY_PHRASE_KEY = 'daily_phrase_v2';
const LAST_PHRASE_DATE_KEY = 'last_phrase_date_v2';

// Считаем номер дня с эпохи (UTC) для стабильного порядка
const getDayIndex = (): number => {
  const MS_PER_DAY = 86400000;
  return Math.floor(Date.now() / MS_PER_DAY);
};

const idiomForDay = (): Idiom => {
  const idx = getDayIndex() % IDIOMS.length;
  return IDIOMS[idx];
};

export const getTodayPhrase = async (): Promise<DailyPhrase> => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const savedDate = await AsyncStorage.getItem(LAST_PHRASE_DATE_KEY);
    if (savedDate === today) {
      const phraseStr = await AsyncStorage.getItem(DAILY_PHRASE_KEY);
      if (phraseStr) return JSON.parse(phraseStr);
    }
    const idiom = idiomForDay();
    const phrase: DailyPhrase = {
      english: idiom.english,
      literal: idiom.literal,
      meaning: idiom.meaning,
      text: idiom.text,
      date: today,
    };
    await AsyncStorage.setItem(DAILY_PHRASE_KEY, JSON.stringify(phrase));
    await AsyncStorage.setItem(LAST_PHRASE_DATE_KEY, today);
    return phrase;
  } catch {
    return getDefaultPhrase();
  }
};

const getDefaultPhrase = (): DailyPhrase => {
  const idiom = IDIOMS[0];
  return {
    english: idiom.english,
    literal: idiom.literal,
    meaning: idiom.meaning,
    text: idiom.text,
    date: new Date().toISOString().split('T')[0],
  };
};
