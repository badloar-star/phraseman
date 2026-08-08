import AsyncStorage from '@react-native-async-storage/async-storage';

export const DAILY_PHRASE_PULSE_DAY_KEY = 'daily_phrase_home_pulse_day_v1';

type PulseStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;

export function isDailyPhraseCardHalfVisible(args: {
  cardTop: number;
  cardHeight: number;
  scrollY: number;
  viewportHeight: number;
}): boolean {
  const { cardTop, cardHeight, scrollY, viewportHeight } = args;
  if (cardHeight <= 0 || viewportHeight <= 0) return false;

  const cardBottom = cardTop + cardHeight;
  const viewportBottom = scrollY + viewportHeight;
  const visibleHeight = Math.max(
    0,
    Math.min(cardBottom, viewportBottom) - Math.max(cardTop, scrollY),
  );

  return visibleHeight >= cardHeight * 0.5;
}

export async function claimDailyPhrasePulseForDay(
  localDay: string,
  storage: PulseStorage = AsyncStorage,
): Promise<boolean> {
  const previousDay = await storage.getItem(DAILY_PHRASE_PULSE_DAY_KEY);
  if (previousDay === localDay) return false;

  await storage.setItem(DAILY_PHRASE_PULSE_DAY_KEY, localDay);
  return true;
}
