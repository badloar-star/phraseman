// Ускорение энергии за просмотр видео (владелец 2026-09-02): пока видео играет,
// остаток до следующей единицы подтягивается к 10 минутам вместо 30 — буквально
// «запустил плеер, 1 энергия за 10 минут». Проверяем и арифметику, и все ранние
// выходы: именно немые отказы уже прятали мёртвые механизмы в этом проекте.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyRemoteConfigSnapshot } from '../app/remote_flags';
import {
  creditVideoWatchSegment,
  getVideoWatchTargetRemainingMs,
  VIDEO_WATCH_TARGET_RECOVERY_MS,
} from '../app/energy_video_watch_credit';

const ENERGY_KEY = 'energy_state';
const MINUTE = 60 * 1000;

async function seedEnergy(current: number, lastRecoveryTime: number): Promise<void> {
  await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify({ current, lastRecoveryTime }));
}

/** Остаток до следующей единицы — та же формула, что в EnergyContext. */
async function readRemainingMs(intervalMs = 30 * MINUTE): Promise<number> {
  const raw = await AsyncStorage.getItem(ENERGY_KEY);
  const last = Number(JSON.parse(raw as string).lastRecoveryTime);
  const elapsed = Math.max(0, Date.now() - last);
  return intervalMs - (elapsed % intervalMs);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  applyRemoteConfigSnapshot({});
});

afterEach(() => {
  applyRemoteConfigSnapshot({});
});

describe('целевой остаток', () => {
  it('при базе 30 минут цель — 10 минут', () => {
    expect(getVideoWatchTargetRemainingMs()).toBe(VIDEO_WATCH_TARGET_RECOVERY_MS);
    expect(getVideoWatchTargetRemainingMs()).toBe(10 * MINUTE);
  });

  it('никогда не замедляет: база ниже 10 минут остаётся базой', () => {
    applyRemoteConfigSnapshot({ numbers: { energy_recovery_interval_ms: 5 * MINUTE } });
    expect(getVideoWatchTargetRemainingMs()).toBe(5 * MINUTE);
  });
});

describe('запуск видео подтягивает остаток к 10 минутам', () => {
  it('ГЛАВНОЕ: остаток 30 минут превращается в 10 сразу', async () => {
    // Долг только начался — до энергии полные 30 минут.
    await seedEnergy(1, Date.now());

    const outcome = await creditVideoWatchSegment(2000);

    expect(outcome.applied).toBe(true);
    if (!outcome.applied) return;
    // Срезали лишние 20 минут (допуск в секунду: между посевом и расчётом
    // успевает тикнуть реальное время).
    expect(Math.abs(outcome.bonusMs - 20 * MINUTE)).toBeLessThan(1000);
    const remaining = await readRemainingMs();
    expect(Math.round(remaining / 1000)).toBe(10 * 60); // осталось ровно 10 минут
  });

  it('остаток 28 минут тоже становится 10 (случай владельца)', async () => {
    await seedEnergy(1, Date.now() - 2 * MINUTE);

    const outcome = await creditVideoWatchSegment(2000);

    expect(outcome.applied).toBe(true);
    const remaining = await readRemainingMs();
    expect(Math.round(remaining / 1000)).toBe(10 * 60);
  });

  it('метка старше интервала тоже подтягивается (регрессия ложного пола)', async () => {
    // Метка на 70 минут назад: остаток ~20 минут. Прежняя версия возвращала
    // already_at_floor и не делала ничего — счётчик висел на 30 минутах.
    await seedEnergy(1, Date.now() - 70 * MINUTE);

    const outcome = await creditVideoWatchSegment(2000);

    expect(outcome.applied).toBe(true);
    const remaining = await readRemainingMs();
    expect(Math.round(remaining / 1000)).toBe(10 * 60);
  });

  it('НЕ удлиняет ожидание: остаток 5 минут остаётся пятью', async () => {
    await seedEnergy(1, Date.now() - 25 * MINUTE); // остаток 5 минут

    const outcome = await creditVideoWatchSegment(2000);

    expect(outcome).toEqual({
      applied: false,
      reason: expect.stringContaining('already_faster'),
    });
    const remaining = await readRemainingMs();
    expect(Math.round(remaining / 1000)).toBe(5 * 60);
  });

  it('повторные отрезки не сбрасывают уже утекшее время', async () => {
    await seedEnergy(1, Date.now());
    await creditVideoWatchSegment(2000); // остаток стал 10 минут
    const afterFirst = await readRemainingMs();

    // Второй отрезок при остатке 10 минут ничего не меняет: цель достигнута.
    const second = await creditVideoWatchSegment(2000);

    expect(second.applied).toBe(false);
    const afterSecond = await readRemainingMs();
    expect(Math.abs(afterSecond - afterFirst)).toBeLessThan(2000);
  });

  it('не трогает поле current — просмотр ускоряет, но не начисляет энергию сам', async () => {
    await seedEnergy(3, Date.now());
    await creditVideoWatchSegment(2000);
    const raw = await AsyncStorage.getItem(ENERGY_KEY);
    expect(JSON.parse(raw as string).current).toBe(3);
  });
});

describe('ранние выходы называют причину', () => {
  it('слишком короткий отрезок', async () => {
    await seedEnergy(1, Date.now());
    const outcome = await creditVideoWatchSegment(200);
    expect(outcome).toEqual({ applied: false, reason: expect.stringContaining('segment_too_short') });
  });

  it('состояния энергии ещё нет', async () => {
    const outcome = await creditVideoWatchSegment(2000);
    expect(outcome).toEqual({ applied: false, reason: 'no_energy_state' });
  });

  it('битый JSON в хранилище', async () => {
    await AsyncStorage.setItem(ENERGY_KEY, '{не json');
    const outcome = await creditVideoWatchSegment(2000);
    expect(outcome).toEqual({ applied: false, reason: 'corrupt_energy_state' });
  });

  it('битая метка восстановления — чинит обычная загрузка, не мы', async () => {
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify({ current: 1, lastRecoveryTime: 0 }));
    const outcome = await creditVideoWatchSegment(2000);
    expect(outcome).toEqual({ applied: false, reason: expect.stringContaining('bad_last_recovery_time') });
  });
});
