// Ускорение энергии за просмотр видео (владелец 2026-09-02): каждая минута
// реального просмотра засчитывается за три обычных — единица восстанавливается
// за 10 минут вместо 30. Проверяем арифметику зачёта и все ранние выходы:
// именно немые отказы уже прятали мёртвые механизмы в этом проекте.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import {
  creditVideoWatchSegment,
  getVideoWatchSpeedMultiplier,
  watchedMsToBonusMs,
  VIDEO_WATCH_TARGET_RECOVERY_MS,
} from '../app/energy_video_watch_credit';

const ENERGY_KEY = 'energy_state';
const MINUTE = 60 * 1000;

async function seedEnergy(current: number, lastRecoveryTime: number): Promise<void> {
  await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify({ current, lastRecoveryTime }));
}

async function readLastRecoveryTime(): Promise<number> {
  const raw = await AsyncStorage.getItem(ENERGY_KEY);
  return Number(JSON.parse(raw as string).lastRecoveryTime);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  applyRemoteConfigSnapshot({});
});

afterEach(() => {
  applyRemoteConfigSnapshot({});
});

describe('множитель просмотра', () => {
  it('при базе 30 минут минута просмотра стоит трёх обычных', () => {
    expect(getVideoWatchSpeedMultiplier()).toBe(3);
  });

  it('10 минут просмотра дарят 20 минут сверх реально прошедших (итого 30)', () => {
    expect(watchedMsToBonusMs(10 * MINUTE)).toBe(20 * MINUTE);
  });

  it('никогда не замедляет: база ниже целевых 10 минут не даёт отрицательный бонус', () => {
    applyRemoteConfigSnapshot({
      numbers: { energy_recovery_interval_ms: VIDEO_WATCH_TARGET_RECOVERY_MS / 2 },
    });
    expect(getVideoWatchSpeedMultiplier()).toBe(1);
    expect(watchedMsToBonusMs(10 * MINUTE)).toBe(0);
  });
});

describe('зачёт отрезка просмотра', () => {
  it('сдвигает метку восстановления назад ровно на подаренное время', async () => {
    const startedAt = Date.now() - 5 * MINUTE; // 5 минут уже накопилось обычным ходом
    await seedEnergy(2, startedAt);

    const outcome = await creditVideoWatchSegment(10 * MINUTE);

    expect(outcome.applied).toBe(true);
    if (!outcome.applied) return;
    expect(outcome.bonusMs).toBe(20 * MINUTE);
    expect(await readLastRecoveryTime()).toBe(startedAt - 20 * MINUTE);
  });

  it('не даёт энергию пачкой: метка не уходит дальше одного полного интервала', async () => {
    // Метка почти «сейчас», а просмотр огромный — сдвиг обязан упереться в пол.
    const now = Date.now();
    await seedEnergy(1, now);

    const outcome = await creditVideoWatchSegment(60 * MINUTE);

    expect(outcome.applied).toBe(true);
    if (!outcome.applied) return;
    const shifted = await readLastRecoveryTime();
    // Не раньше, чем «сейчас минус один интервал» (30 минут).
    expect(now - shifted).toBeLessThanOrEqual(30 * MINUTE + 1000);
  });

  it('не трогает поле current — просмотр ускоряет, но не начисляет энергию сам', async () => {
    await seedEnergy(3, Date.now() - MINUTE);
    await creditVideoWatchSegment(5 * MINUTE);
    const raw = await AsyncStorage.getItem(ENERGY_KEY);
    expect(JSON.parse(raw as string).current).toBe(3);
  });
});

describe('ранние выходы называют причину', () => {
  it('слишком короткий отрезок', async () => {
    await seedEnergy(1, Date.now() - MINUTE);
    const outcome = await creditVideoWatchSegment(200);
    expect(outcome).toEqual({ applied: false, reason: expect.stringContaining('segment_too_short') });
  });

  it('состояния энергии ещё нет', async () => {
    const outcome = await creditVideoWatchSegment(5 * MINUTE);
    expect(outcome).toEqual({ applied: false, reason: 'no_energy_state' });
  });

  it('битый JSON в хранилище', async () => {
    await AsyncStorage.setItem(ENERGY_KEY, '{не json');
    const outcome = await creditVideoWatchSegment(5 * MINUTE);
    expect(outcome).toEqual({ applied: false, reason: 'corrupt_energy_state' });
  });

  it('битая метка восстановления — чинит обычная загрузка, не мы', async () => {
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify({ current: 1, lastRecoveryTime: 0 }));
    const outcome = await creditVideoWatchSegment(5 * MINUTE);
    expect(outcome).toEqual({ applied: false, reason: expect.stringContaining('bad_last_recovery_time') });
  });

  it('метка уже на полу — дарить больше нечего', async () => {
    // Метка на 40 минут назад: пол (сейчас − 30 минут) уже пройден.
    await seedEnergy(1, Date.now() - 40 * MINUTE);
    const outcome = await creditVideoWatchSegment(5 * MINUTE);
    expect(outcome).toEqual({ applied: false, reason: 'already_at_floor' });
  });
});
