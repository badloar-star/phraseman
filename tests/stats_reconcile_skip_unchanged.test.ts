// зачем (замер холодного старта 04.10, запись stats_daily_breakdown ≈3 с в очереди): объединение с облаком не пишет то же самое.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reconcileStatsDailyBreakdownWithCloud } from '../app/stats_daily_breakdown';
import { statsDailyBreakdownKey } from '../app/target_storage_keys';

describe('stats daily breakdown reconcile', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('does not write when the merge result equals what is already stored', async () => {
    const same = JSON.stringify({ '2026-10-01': { lessons_completed: 2 } });
    await AsyncStorage.setItem(statsDailyBreakdownKey('en'), same);
    const spy = jest.spyOn(AsyncStorage, 'setItem');
    spy.mockClear();
    const result = await reconcileStatsDailyBreakdownWithCloud(same, 'en');
    expect(JSON.parse(result)).toEqual({ '2026-10-01': { lessons_completed: 2 } });
    expect(spy.mock.calls.filter((call) => String(call[0]).includes('stats_daily_breakdown'))).toHaveLength(0);
  });

  it('writes when the cloud brings a larger value', async () => {
    await AsyncStorage.setItem(statsDailyBreakdownKey('en'), JSON.stringify({ '2026-10-01': { lessons_completed: 2 } }));
    const spy = jest.spyOn(AsyncStorage, 'setItem');
    spy.mockClear();
    const result = await reconcileStatsDailyBreakdownWithCloud(JSON.stringify({ '2026-10-01': { lessons_completed: 5 } }), 'en');
    expect(JSON.parse(result)['2026-10-01'].lessons_completed).toBe(5);
    expect(spy.mock.calls.filter((call) => String(call[0]).includes('stats_daily_breakdown'))).toHaveLength(1);
  });
});
