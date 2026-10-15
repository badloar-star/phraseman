// ═══════════════════════════════════════════════════════════════════════════
// use_legacy_bonus_burn.ts — сценарий «сгорания» строк окна «Встречайте PhraseMan 2.0» (макет Q9jqpBbjwJEFV1DpdEGx2h, playBurn).
//
// зачем: строки сгорают по очереди — первая через 350 мс после старта, каждая следующая через 720 мс; у каждой шесть монет летят в большую
// монету, и каждая прилетевшая поднимает цель счётчика (floor(монет/6), последняя — остаток). Когда счётчик дошёл до итога — праздник
// (пульс, кольцо, блик). «Уменьшить движение» — сразу итог без полётов. Ничего не хранит в состоянии React: шторка не перерисовывается.
// Если сумма строк больше итога (потолок на человека), прилёты масштабируются так, чтобы счётчик сошёлся ровно к итогу — потолок не объясняем.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef } from 'react';
import type { LegacyBonusRowVM } from '../../modules/legacy_bonus/legacy_bonus_view';
import type { LegacyBonusFlyLayerHandle, FlyPoint } from './LegacyBonusFlyLayer';
import type { LegacyBonusHeroHandle } from './LegacyBonusHero';
import type { LegacyBonusRowHandle } from './LegacyBonusRow';

/** Эталон whats-new-coins.html: первая строка через 1100 мс от открытия (700 пауза + 400), интервал 720 мс; монет на строку — 6. */
export const LEGACY_BONUS_FIRST_ROW_MS = 400;
export const LEGACY_BONUS_ROW_GAP_MS = 720;
export const LEGACY_BONUS_COINS_PER_ROW = 6;
/** Пауза между открытием шторки и стартом сценария (шторка выезжает 440 мс). */
export const LEGACY_BONUS_START_DELAY_MS = 700;

type Placed = Readonly<{ x: number; y: number; width: number; height: number }>;

/** Сколько прибавлять к счётчику с каждой из n монет строки на coins монет: floor(coins/n), последней — остаток. */
export function splitCoinsForFlight(coins: number, n: number): readonly number[] {
  const per = Math.floor(coins / n);
  const out: number[] = [];
  for (let k = 0; k < n; k += 1) out.push(k === n - 1 ? coins - per * (n - 1) : per); // guard-ok: доли анимации прилёта, не баланс
  return out;
}

/** Строки → вклад каждой в счётчик так, чтобы вместе они дали ровно total (при сумме > total — пропорциональное сжатие, остаток в последней). */
export function fitRowCoinsToTotal(rows: readonly LegacyBonusRowVM[], total: number): readonly number[] {
  const sum = rows.reduce((acc, r) => acc + r.coins, 0);
  if (sum <= 0) return rows.map(() => 0);
  if (sum <= total) return rows.map((r) => r.coins);
  const scaled = rows.map((r) => Math.floor((r.coins * total) / sum));
  const used = scaled.reduce((acc, n) => acc + n, 0);
  return scaled.map((n, i) => (i === scaled.length - 1 ? n + (total - used) : n));
}

type Input = Readonly<{
  rows: readonly LegacyBonusRowVM[];
  total: number;
  reduceMotion: boolean;
}>;

export function useLegacyBonusBurn({ rows, total, reduceMotion }: Input) {
  const rowRefs = useRef<(LegacyBonusRowHandle | null)[]>([]);
  const rowPlaces = useRef<Placed[]>([]);
  const heroRef = useRef<LegacyBonusHeroHandle>(null);
  const flyRef = useRef<LegacyBonusFlyLayerHandle>(null);
  const heroCenter = useRef<FlyPoint>({ x: 48, y: 48 });
  /** Смещение контейнера строк внутри плашки: слой полёта лежит на плашке, а строки замеряются внутри контейнера. */
  const rowsOffset = useRef<FlyPoint>({ x: 0, y: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedRef = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const burnRow = useCallback((i: number, contribution: number) => {
    const row = rows[i];
    const place = rowPlaces.current[i];
    rowRefs.current[i]?.play();
    if (!row || !place) {
      console.warn(`[LEGACY-BONUS] строка ${i}: нет замера — монеты не летят, цифра добавится сразу`); // guard-ok: ранний выход пишет причину
      heroRef.current?.coinLanded(contribution);
      return;
    }
    const from: FlyPoint = { x: rowsOffset.current.x + place.x + place.width - 10 - 32, y: rowsOffset.current.y + place.y + place.height / 2 };
    const shares = splitCoinsForFlight(contribution, LEGACY_BONUS_COINS_PER_ROW);
    flyRef.current?.launch({
      from,
      to: heroCenter.current,
      count: shares.length,
      onArrive: (k) => heroRef.current?.coinLanded(shares[k] ?? 0),
    });
  }, [rows]);

  const play = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (reduceMotion) {
      rowRefs.current.forEach((r) => r?.finish());
      heroRef.current?.settle(total);
      console.log(`[LEGACY-BONUS] уменьшить движение: итог ${total} сразу`); // guard-ok: ветка решения
      return;
    }
    const contributions = fitRowCoinsToTotal(rows, total);
    console.log(`[LEGACY-BONUS] сценарий: строк=${rows.length} итог=${total} вклады=${contributions.join(',')}`); // guard-ok: вход сценария
    rows.forEach((_, i) => after(LEGACY_BONUS_FIRST_ROW_MS + i * LEGACY_BONUS_ROW_GAP_MS, () => burnRow(i, contributions[i] ?? 0)));
  }, [after, burnRow, reduceMotion, rows, total]);

  // старт после выезда шторки; размонтирование гасит все отложенные шаги. Эффект один раз на показ: play берём из ref, чтобы смена
  // идентичности rows/total не отменила уже запланированные сгорания.
  const playRef = useRef(play);
  playRef.current = play;
  useEffect(() => {
    after(LEGACY_BONUS_START_DELAY_MS, () => playRef.current());
    return () => { clearTimers(); flyRef.current?.clear(); };
  }, [after, clearTimers]);

  return { rowRefs, rowPlaces, rowsOffset, heroRef, flyRef, heroCenter, celebrate: () => heroRef.current?.celebrate() };
}
