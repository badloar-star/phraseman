/**
 * D195 (владелец 15.10): клиент конвертации старых бонусов в монеты — вызов legacyBonusConvertMine один раз на владельца,
 * подмес нового баланса монет в кошелёк телефона и данные для окна «Встречайте PhraseMan 2.0» (рисует Дизайн).
 *
 * зачем так:
 *  - вызов ленивый — после первого кадра Главной (home.tsx), раз за процесс; после ответа сервера с итогом (converted / replayed /
 *    nothing / merged_orphan) — локальная метка владельца, сеть больше не трогаем; пока сервер выключен (disabled) — повтор не чаще
 *    раза в 12 ч. Неактивные люди Firebase не стоят ничего;
 *  - монеты начисляет только сервер; телефон доливает серверный снимок кошелька (mergeLevelSpinServerStars, только более новый seq);
 *  - поздравление НЕ durable (правило 01.09): в памяти процесса, только когда сервер реально начислил сейчас; пропущенный показ ничего
 *    не стоит — монеты уже на балансе;
 *  - ошибка — без окна и без текста, причина в журнале [LEGACY-BONUS], повтор при следующем запуске.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';

const LOG = '[LEGACY-BONUS]';
const DONE_PREFIX = 'legacy_bonus_done_v1:';
const RETRY_AFTER_MS = 12 * 60 * 60_000;

export type LegacyBonusStatus = 'converted' | 'replayed' | 'nothing' | 'merged_orphan' | 'disabled';
export type LegacyBonusResult = Readonly<{
  status: LegacyBonusStatus;
  from: Readonly<{ xp: number; pearls: number; spins: number }>;
  coins: Readonly<{ xp: number; pearls: number; spins: number; total: number }>;
  cappedBy: 'none' | 'currency' | 'person';
  starsBalance: number;
}>;

let welcome: LegacyBonusResult | null = null;
let ranThisProcess = false;
const listeners = new Set<() => void>();
function emit(): void {
  for (const listener of listeners) listener();
}

const int = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

function parseResponse(raw: unknown): (LegacyBonusResult & { starsSeq: number }) | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const status = r.status;
  if (status !== 'converted' && status !== 'replayed' && status !== 'nothing' && status !== 'merged_orphan' && status !== 'disabled') return null;
  const from = (r.from ?? {}) as Record<string, unknown>;
  const coins = (r.coins ?? {}) as Record<string, unknown>;
  return {
    status,
    from: { xp: int(from.xp), pearls: int(from.pearls), spins: int(from.spins) },
    coins: { xp: int(coins.xp), pearls: int(coins.pearls), spins: int(coins.spins), total: int(coins.total) },
    cappedBy: r.cappedBy === 'currency' || r.cappedBy === 'person' ? r.cappedBy : 'none',
    starsBalance: int(r.starsBalance),
    starsSeq: int(r.starsSeq),
  };
}

/** Один вызов за процесс; см. шапку. Никогда не бросает. */
export async function runLegacyBonusConvertOnce(source: string): Promise<void> {
  if (ranThisProcess) {
    console.log(`${LOG} skip reason=already_ran source=${source}`);
    return;
  }
  ranThisProcess = true;
  const token = captureAccountGeneration();
  const owner = token.stableId?.trim() || '';
  if (!owner) {
    console.log(`${LOG} skip reason=no_owner phase=${token.phase} source=${source}`);
    ranThisProcess = false;
    return;
  }
  const doneKey = `${DONE_PREFIX}${encodeURIComponent(owner)}`;
  const startedAt = Date.now();
  try {
    const stored = await AsyncStorage.getItem(doneKey);
    if (stored) {
      const parsed = JSON.parse(stored) as { status?: string; retryAfterMs?: number };
      if (parsed.status !== 'disabled') {
        console.log(`${LOG} skip reason=done status=${parsed.status} source=${source}`);
        return;
      }
      if (Number(parsed.retryAfterMs) > Date.now()) {
        console.log(`${LOG} skip reason=disabled_recently source=${source}`);
        return;
      }
    }
    const { getApp } = await import('@react-native-firebase/app');
    const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
    const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'legacyBonusConvertMine');
    const response = await fn({ ownerStableId: owner });
    const result = parseResponse(response?.data);
    if (!result) {
      console.warn(`${LOG} bad_response source=${source} ms=${Date.now() - startedAt}`);
      return;
    }
    console.log(`${LOG} response status=${result.status} total=${result.coins.total} cappedBy=${result.cappedBy} ms=${Date.now() - startedAt}`);
    if (!isCurrentAccountGeneration(token)) {
      console.log(`${LOG} drop reason=account_changed status=${result.status}`);
      return;
    }
    await AsyncStorage.setItem(doneKey, JSON.stringify(
      result.status === 'disabled' ? { status: 'disabled', retryAfterMs: Date.now() + RETRY_AFTER_MS } : { status: result.status, total: result.coins.total },
    ));
    if (result.status !== 'converted' || result.coins.total <= 0) return;
    // монеты уже на сервере — доливаем снимок кошелька телефону (только более новый seq, повтор не удваивает)
    try {
      const { mergeLevelSpinServerStars } = await import('./level_spin_star_grants');
      const visible = await mergeLevelSpinServerStars(token, {
        stars: result.starsBalance,
        starsSeq: result.starsSeq,
        serverCreditedDelta: result.coins.total,
      });
      console.log(`${LOG} wallet merged balance=${visible.balance} seq=${result.starsSeq}`);
    } catch (error: unknown) {
      console.warn(`${LOG} wallet_merge_failed reason=${error instanceof Error ? error.message : String(error)} — баланс догонит следующий снимок`);
    }
    welcome = { status: result.status, from: result.from, coins: result.coins, cappedBy: result.cappedBy, starsBalance: result.starsBalance };
    emit();
  } catch (error: unknown) {
    console.warn(`${LOG} failed source=${source} reason=${error instanceof Error ? error.message : String(error)} ms=${Date.now() - startedAt}`);
    ranThisProcess = false;
  }
}

/** Для окна «Встречайте PhraseMan 2.0»: show — только когда сервер начислил в этом запуске и окно ещё не закрыто. */
export function useLegacyBonusWelcome(): Readonly<{ kind: 'none' | 'show'; result?: LegacyBonusResult }> {
  const [value, setValue] = useState(welcome);
  useEffect(() => {
    const sync = () => setValue(welcome);
    listeners.add(sync);
    sync();
    return () => { listeners.delete(sync); };
  }, []);
  return value ? { kind: 'show', result: value } : { kind: 'none' };
}

export function dismissLegacyBonusWelcome(): void {
  console.log(`${LOG} welcome dismissed total=${welcome?.coins.total ?? 0}`);
  welcome = null;
  emit();
}

/** DEV (съёмка окна): dev_state?legacybonus=demo — показать окно с примерными цифрами; только память, в стор-сборке выключено. */
export function setDevLegacyBonusDemo(on: boolean): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  welcome = on
    ? { status: 'converted', from: { xp: 8362, pearls: 120, spins: 1 }, coins: { xp: 836, pearls: 1200, spins: 130, total: 2166 }, cappedBy: 'none', starsBalance: 4166 }
    : null;
  console.log(`[DEV-STATE] legacybonus=${on ? 'demo' : 'off'}`); // guard-ok: dev-ветка
  emit();
  return true;
}

/** Только для тестов. */
export function resetLegacyBonusClientForTests(): void {
  welcome = null;
  ranThisProcess = false;
  listeners.clear();
}

/* expo-router: keep this utility from being treated as a screen */
export default function __LegacyBonusClientRouteShim() {
  return null;
}
