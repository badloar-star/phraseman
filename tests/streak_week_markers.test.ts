import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STREAK_WEEK_MARKERS_KEY,
  addDaysToDateKey,
  readCurrentStreakWeekMarkers,
  recordMissedStreakWeekMarkersEndingYesterday,
  recordStreakWeekMarker,
} from '../app/streak_week_markers';

describe('streak week markers', () => {
  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-02T12:00:00.000Z'));
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('maps a frozen Monday into the Monday slot of the current week', async () => {
    await recordStreakWeekMarker('2026-06-01', 'freeze');

    await expect(readCurrentStreakWeekMarkers()).resolves.toEqual([
      'freeze',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('marks restored missed days ending yesterday', async () => {
    await recordMissedStreakWeekMarkersEndingYesterday('revive', 2, '2026-06-04');

    await expect(readCurrentStreakWeekMarkers(new Date('2026-06-04T12:00:00.000Z'))).resolves.toEqual([
      null,
      'revive',
      'revive',
      null,
      null,
      null,
      null,
    ]);
  });

  it('does not leak markers into the next ISO week', async () => {
    await recordStreakWeekMarker('2026-06-01', 'freeze');

    await expect(readCurrentStreakWeekMarkers(new Date('2026-06-08T12:00:00.000Z'))).resolves.toEqual(new Array(7).fill(null));
  });

  it('keeps the storage key explicit for reset and sync contracts', () => {
    expect(STREAK_WEEK_MARKERS_KEY).toBe('streak_week_day_markers_v1');
    expect(addDaysToDateKey('2026-06-01', 1)).toBe('2026-06-02');
  });
});
