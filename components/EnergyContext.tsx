import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPersonalProgressSnapshot, hydratePersonalProgress } from '../app/personal_progress_store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, InteractionManager } from 'react-native';
import { getLevelFromXP, getMaxEnergyForLevel } from '../constants/theme';
import { readBonusEnergy, BONUS_ENERGY_KEY } from '../app/level_gift_system';
import { getVerifiedPremiumStatus, isTesterNoLimitsActive } from '../app/premium_guard';
import { captureAccountGeneration } from '../app/account_generation';
import { readDevLocalPlusOverride } from '../app/dev_plus_controls';
import { applyAdminEnergyCommand, formatTimeUntilRecovery, getRecoveryIntervalMs, secondsUntilEnergyFull } from '../app/energy_system';
import { readLeagueChestEnergyOverrideMs } from '../app/services/league_chest_rewards';
import { isEnergyFreeWindowActive, readBoonEnergyOverrideMs } from '../app/boons/boon_effects_energy';
import { createCoalescedAsyncRunner } from '../app/app_resume_policy';
// зачем (аудит 2026-08-23, третий проход): ключ energy_state пишут ДЕВЯТЬ мест.
// Подарки уровня, сезонный «полный заряд» и покупка за жемчужины идут под общим
// withStorageLock, а EnergyContext писал мимо него — читал-менял-писал целиком.
// Пересечение окон (получил подарок энергии и тут же начал урок) молча теряло
// либо подарок, либо списание: побеждал тот, кто дописал последним. Теперь все
// девять писателей стоят в одной очереди.
// ВАЖНО: замок НЕреентерабельный (app/storage_mutex.ts — флаг + очередь, без
// счётчика владельца). Внутри залоченной секции нельзя звать spendOne/refundOne
// и любой другой код, который берёт этот же замок — будет вечная блокировка.
import { withStorageLock } from '../app/storage_mutex';
import { scheduleEnergyFullNotification, cancelEnergyFullNotification } from '../app/notifications';
import type { Lang } from '../constants/i18n';
import { energyCountdownClock } from './energy_countdown_clock';
import { getMaxEnergy as getConfiguredBaseEnergy } from '../app/remote_flags';
import { isFeatureFreeForEveryone } from '../app/feature_gates';
import { emitAppEvent } from '../app/events';
import type { EnergyStartResult } from './energy_start_confirmation';
import { peekEnergy, writePeekEnergy } from '../app/energy_peek_cache';

// ── Constants ────────────────────────────────────────────────────────────────
const ENERGY_KEY = 'energy_state';
export const MAX_ENERGY = 5; // базовый минимум (уровень 1-9)
// B2 (PERF_MASTER_PLAN): последнее известное значение энергии читается синхронно
// в useState-инициализаторах ниже, иначе провайдер стартует с MAX_ENERGY и шкала
// заметно "прыгает" (полная -> реальная), когда load() досчитает настоящее число.
//
// зачем (владелец, 2026-08-24, «энергия не показывает правильную цифру сразу при
// входе»): раньше кэш жил прямо здесь и переживал только ремаунты провайдера — на
// ХОЛОДНОМ старте он был пуст, и первый кадр рисовал полную шкалу. Теперь кэш живёт
// в app/energy_peek_cache.ts и заполняется ещё стартовой гидратацией, которая
// читает диск раньше, чем этот провайдер вообще смонтируется. Модуль вынесен
// отдельно намеренно: импортируй загрузчик сам EnergyContext — холодный старт
// потянул бы весь React-провайдер со всеми его зависимостями.

interface StoredEnergy {
  current: number;
  lastRecoveryTime: number;
}

// ── Context type ─────────────────────────────────────────────────────────────
export interface EnergyContextValue {
  energy: number;            // 0-maxEnergy (base only, without bonus)
  bonusEnergy: number;       // 0-N extra energy from gifts (expires next day)
  bonusExpiresAt: number;    // epoch ms when bonus expires (0 if no bonus)
  maxEnergy: number;         // динамически: 5-6 в зависимости от уровня
  recoveryIntervalMs: number;// current +1 energy recovery interval
  recoveryEndsAtMs: number;
  timeUntilNextMs: number;   // ms until +1 energy (0 if full or unlimited)
  formattedTime: string;     // e.g. "29м 12с" or "1ч 5м 3с" — ready to display
  isUnlimited: boolean;      // premium or tester mode
  restoringPremium: boolean; // true while animating premium energy restore
  spendOne: () => Promise<boolean>;  // returns false if no energy
  /** Ask before a paid start and return a distinct cancel/no-energy outcome. */
  confirmSpendOne: () => Promise<EnergyStartResult>;
  /** Spend N units: bonus first, then base. Returns false if total available < n (atomic). */
  spendAmount: (n: number) => Promise<boolean>;
  /** Multi-energy equivalent of confirmSpendOne. */
  confirmSpendAmount: (n: number) => Promise<EnergyStartResult>;
  /**
   * Вернуть 1 единицу, если оплаченный старт НЕ состоялся (упала сеть, сервер
   * отказал, экран закрылся до входа).
   *
   * зачем: владелец 2026-08-23 — энергия платится за ВХОД. Если входа не
   * случилось, плата обязана вернуться: иначе игрок теряет заряд за чужую
   * сетевую ошибку. Возвращаем в БАЗУ (не в бонус) — бонусные слоты живут до
   * полуночи, и «воскрешать» истёкший бонус было бы неверно; потолок базы
   * ограничивает возврат сам по себе.
   */
  refundOne: () => Promise<void>;
  reload: () => Promise<void>;       // force re-read (call after tester toggle)
  refillToMax: (isCurrent?: () => boolean) => Promise<boolean>; // immediate account-safe Premium refill
  /** First AsyncStorage load finished — safe to gate screens on real energy+bonus (not defaults). */
  energyReady: boolean;
}

const EnergyContext = createContext<EnergyContextValue>({
  energy: MAX_ENERGY,
  bonusEnergy: 0,
  bonusExpiresAt: 0,
  maxEnergy: MAX_ENERGY,
  recoveryIntervalMs: getRecoveryIntervalMs(0),
  recoveryEndsAtMs: 0,
  timeUntilNextMs: 0,
  formattedTime: '',
  isUnlimited: false,
  restoringPremium: false,
  spendOne: async () => true,
  confirmSpendOne: async () => 'spent',
  spendAmount: async () => true,
  confirmSpendAmount: async () => 'spent',
  refundOne: async () => {},
  reload: async () => {},
  refillToMax: async () => true,
  energyReady: false,
});

export function useEnergy(): EnergyContextValue {
  return useContext(EnergyContext);
}

export function useEnergyCountdown(options: { visible?: boolean } = {}): { timeUntilNextMs: number; formattedTime: string } {
  const { energy, maxEnergy, isUnlimited, recoveryIntervalMs, recoveryEndsAtMs } = useEnergy();
  const [now, setNow] = useState(() => Date.now());
  const visible = options.visible ?? true;

  useEffect(() => {
    const shouldTick =
      visible
      && !isUnlimited
      && energy < maxEnergy
      && recoveryEndsAtMs > 0
      && recoveryIntervalMs > 0;

    setNow(Date.now());
    if (!shouldTick) return undefined;

    return energyCountdownClock.subscribe(setNow);
  }, [energy, isUnlimited, maxEnergy, recoveryEndsAtMs, recoveryIntervalMs, visible]);

  if (isUnlimited || energy >= maxEnergy || recoveryEndsAtMs <= 0 || recoveryIntervalMs <= 0) {
    return { timeUntilNextMs: 0, formattedTime: '' };
  }

  const startedAt = recoveryEndsAtMs - recoveryIntervalMs;
  const elapsed = Math.max(0, now - startedAt);
  const step = elapsed % recoveryIntervalMs;
  const remaining = step === 0 && elapsed > 0 ? recoveryIntervalMs : recoveryIntervalMs - step;
  const timeUntilNextMs = Math.max(0, Math.min(recoveryIntervalMs, remaining));

  return {
    timeUntilNextMs,
    formattedTime: formatTimeUntilRecovery(timeUntilNextMs),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function readUnlimited(): Promise<boolean> {
  const [tester, noLimits, isPremium] = await Promise.all([
    AsyncStorage.getItem('tester_energy_disabled'),
    isTesterNoLimitsActive(),
    getVerifiedPremiumStatus(),
  ]);
  // Пульт управления может снять энергетический лимит для всех. EnergyContext —
  // основной runtime-путь траты, поэтому этот gate обязан проверяться здесь, а
  // не только во вторичном energy_system.spendEnergy().
  if (isFeatureFreeForEveryone('energy')) return true;

  // Weekly Boon «окно без энергии»: в активный вечерний час энергия не тратится у всех.
  // EnergyContext.spendOne — основной путь траты (не energy_system.spendEnergy),
  // поэтому окно ОБЯЗАНО проверяться здесь, иначе бонус не работает.
  if (isEnergyFreeWindowActive()) return true;

  // зачем (владелец 2026-08-24): DEV-центр → «Снять Plus» переключает только
  // PremiumContext (dev_local_plus_override_v1), а EnergyContext спрашивал
  // getVerifiedPremiumStatus() напрямую — эта функция override не видит.
  // Итог: кнопка молчаливо не действовала на энергию — трата и вся связанная
  // с ней анимация не включались, хотя PremiumContext честно писал «неактивен».
  // Override должен побеждать здесь так же, как в PremiumContext.
  const devAccountGeneration = captureAccountGeneration();
  const devStableId = devAccountGeneration.phase === 'active' ? devAccountGeneration.stableId : null;
  const devOverride = devStableId
    ? await readDevLocalPlusOverride(devStableId).catch(() => 'inherit' as const)
    : 'inherit';
  if (devOverride === 'removed') return false;
  if (devOverride === 'granted') return true;

  return isPremium || tester === 'true' || noLimits;
}

async function readRecoveryIntervalMs(): Promise<number> {
  try {
    // Override-ы интервала: league-chest и weekly-boon (turbo_regen). Берём наименьший
    // (быстрейшее восстановление). EnergyContext — основной читатель интервала, поэтому
    // boon-override ОБЯЗАН учитываться здесь (energy_system.ts даёт его только spendEnergy).
    const [leagueChestMs, boonMs] = await Promise.all([
      readLeagueChestEnergyOverrideMs(),
      readBoonEnergyOverrideMs(),
    ]);
    const overrides = [leagueChestMs, boonMs].filter(
      (v): v is number => typeof v === 'number' && v > 0,
    );
    if (overrides.length > 0) return Math.min(...overrides);
    return getRecoveryIntervalMs();
  } catch {
    return getRecoveryIntervalMs();
  }
}

/** Читает и восстанавливает состояние энергии с учётом динамического максимума */
async function readAndRecoverState(dynMax: number, recoveryMs: number): Promise<StoredEnergy> {
  const raw = await AsyncStorage.getItem(ENERGY_KEY);
  let state: StoredEnergy = { current: dynMax, lastRecoveryTime: Date.now() };

  if (raw) {
    // зачем: битый JSON в AsyncStorage (обрыв записи, миграция, ручная правка) раньше
    // бросал исключение и обрывал ВЕСЬ runLoad — энергия оставалась не загруженной до
    // переустановки. Падаем на дефолт и самолечимся, а не роняем загрузку.
    try {
      state = JSON.parse(raw) as StoredEnergy;
    } catch {
      state = { current: dynMax, lastRecoveryTime: Date.now() };
      await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state)).catch(() => {});
      return state;
    }
    if (state === null || typeof state !== 'object') {
      state = { current: dynMax, lastRecoveryTime: Date.now() };
      await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state)).catch(() => {});
      return state;
    }
    // Guard against corrupt/stale storage (NaN, negative, above cap)
    if (!Number.isFinite(state.current) || state.current < 0) state.current = dynMax;
    else if (state.current > dynMax) state.current = dynMax;
    if (!Number.isFinite(state.lastRecoveryTime) || state.lastRecoveryTime <= 0) state.lastRecoveryTime = Date.now();
  } else {
    await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    return state;
  }

  if (state.current < dynMax) {
    const now = Date.now();
    const elapsed = now - state.lastRecoveryTime;
    const recovered = Math.floor(elapsed / recoveryMs);
    if (recovered > 0) {
      state.current = Math.min(state.current + recovered, dynMax);
      // Advance lastRecoveryTime by completed full intervals (keeps remainder accurate)
      state.lastRecoveryTime = state.lastRecoveryTime + recovered * recoveryMs;
      // Под общим замком: восстановление идёт при каждой загрузке и легко
      // пересекается с подарком энергии или покупкой за жемчужины.
      await withStorageLock(async () => {
        await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
      });
    }
  }

  return state;
}

/** Читает текущий максимум энергии из уровня пользователя */
async function readDynMax(): Promise<number> {
  try {
    await hydratePersonalProgress();
    const xp = getPersonalProgressSnapshot().totalXp;
    return getMaxEnergyForLevel(getLevelFromXP(xp), getConfiguredBaseEnergy());
  } catch {
    return MAX_ENERGY;
  }
}

/** Язык интерфейса для текста уведомления (тот же источник, что в _layout). */
async function readNotificationLang(): Promise<Lang> {
  try {
    const raw = await AsyncStorage.getItem('app_lang');
    return raw === 'uk' ? 'uk' : raw === 'es' ? 'es' : 'ru';
  } catch {
    return 'ru';
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function EnergyProvider({ children }: { children: React.ReactNode }) {
  const initialPeek = peekEnergy();
  const [energy, setEnergy] = useState(() => initialPeek?.energy ?? MAX_ENERGY);
  const [bonusEnergy, setBonusEnergy] = useState(0);
  const [bonusExpiresAt, setBonusExpiresAt] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(() => initialPeek?.maxEnergy ?? MAX_ENERGY);
  const [recoveryIntervalMs, setRecoveryIntervalMs] = useState(getRecoveryIntervalMs(0));
  const [recoveryEndsAtMs, setRecoveryEndsAtMs] = useState(0);
  const [timeUntilNextMs, setTimeUntilNextMs] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [restoringPremium, setRestoringPremium] = useState(false);
  // Peek уже показывает последнее известное значение, поэтому энергия не
  // "прыгнет" от MAX к реальной. energyReady остаётся честным по факту первого
  // load() (тестерские тумблеры/точные гейты продолжают ждать live-данные).
  const [energyReady, setEnergyReady] = useState(false);
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');

  // Refs for use inside callbacks without stale closures
  const energyRef = useRef(initialPeek?.energy ?? MAX_ENERGY);
  const bonusRef = useRef(0);
  const dynMaxRef = useRef(initialPeek?.maxEnergy ?? MAX_ENERGY);
  const recoveryMsRef = useRef(getRecoveryIntervalMs(0));
  const lastRecoveryRef = useRef(Date.now());
  const isUnlimitedRef = useRef(false);
  /**
   * Прочитан ли реальный статус (премиум / тестер / окно без лимитов) из
   * хранилища. До этого момента isUnlimitedRef держит placeholder `false`.
   *
   * зачем: аудит 2026-08-23 нашёл класс бага — экраны списывали энергию сразу
   * при монтировании, и на холодном старте (пока идёт runLoad) у ПОДПИСЧИКА
   * снималась единица, которой у него сниматься не должно вовсе. Ждать
   * energyReady на каждом из одиннадцати экранов — значит добавить задержку
   * до первого тапа везде. Дешевле и надёжнее закрыть дыру в одной точке:
   * трата просто не проходит, пока статус неизвестен.
   */
  const energyReadyRef = useRef(false);
  /**
   * Из какого пула ушла последняя единица spendOne: 'bonus' или 'base'.
   *
   * зачем (аудит 2026-08-23, третий проход): spendOne тратит СНАЧАЛА бонус
   * (он сгорает в полночь), а первый refundOne возвращал всегда в базу. Две
   * беды разом: сгорающий бонус конвертировался в вечную базу (открыл поиск
   * матча — отменил — бонус «отмыт»), а при полной базе возвращённая единица
   * упиралась в потолок и ПРОПАДАЛА. Возврат обязан идти в тот же пул.
   * Маркер, а не возврат значения из spendOne: сигнатуру Promise<boolean>
   * читают девять экранов, а refund в наших потоках всегда следует сразу за
   * своей тратой в том же JS-потоке.
   */
  const lastSpendPoolRef = useRef<'bonus' | 'base' | null>(null);
  const restoreTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loadRunnerRef = useRef<(() => Promise<void>) | null>(null);
  const syncEnergyPushRef = useRef<(() => Promise<void>) | null>(null);
  // Точка, ОТКУДА вылетает молния списания. Её задавала модалка подтверждения;
  // после её удаления (владелец 2026-08-24) остаётся null, и EnergySpendFlightHost
  // сам берёт запасной путь — от счётчика энергии вверху экрана.
  const motionTargetRef = useRef<{ x: number; y: number } | null>(null);

  // ── Load and apply recovery ────────────────────────────────────────────────
  const runLoad = useCallback(async () => {
    try {
      // Разовая команда админки (drain/fill) применяется ДО чтения состояния —
      // иначе она никогда не применяется вовсе: прежний носитель
      // (energy_system.getEnergyState) не имел живых вызовов, и админка молча
      // врала, что энергия изменена (аудит 2026-08-23). Идемпотентно по `at`.
      await applyAdminEnergyCommand();
      const [unlimited, dynMax, recoveryMs, bonusState] = await Promise.all([readUnlimited(), readDynMax(), readRecoveryIntervalMs(), readBonusEnergy()]);
      const bonus = bonusState?.amount ?? 0;
      bonusRef.current = bonus;
      setBonusEnergy(bonus);
      setBonusExpiresAt(bonusState?.expiresAt ?? 0);
      dynMaxRef.current = dynMax;
      recoveryMsRef.current = recoveryMs;
      setMaxEnergy(dynMax);
      setRecoveryIntervalMs(recoveryMs);

      const wasUnlimited = isUnlimitedRef.current;
      isUnlimitedRef.current = unlimited;
      setIsUnlimited(unlimited);

      // Premium removed — clear any pending restore animation timers
      if (wasUnlimited && !unlimited) {
        restoreTimersRef.current.forEach(t => clearTimeout(t));
        restoreTimersRef.current = [];
        setRestoringPremium(false);
      }

      if (unlimited) {
        // Читаем реальное сохранённое значение энергии
        const storedState = await readAndRecoverState(dynMax, recoveryMs);
        const storedEnergy = storedState.current;
        setTimeUntilNextMs(0);
        setRecoveryEndsAtMs(0);

        // Если переходим в премиум (wasUnlimited=false) и энергия < макс — анимируем
        if (!wasUnlimited && storedEnergy < dynMax) {
          energyRef.current = storedEnergy;
          setEnergy(storedEnergy);
          isUnlimitedRef.current = true;
          setIsUnlimited(true);

          restoreTimersRef.current.forEach(t => clearTimeout(t));
          restoreTimersRef.current = [];
          setRestoringPremium(true);

          for (let i = storedEnergy + 1; i <= dynMax; i++) {
            const delay = (i - storedEnergy) * 350;
            const t = setTimeout(() => {
              setEnergy(i);
              energyRef.current = i;
              if (i === dynMaxRef.current) setRestoringPremium(false);
            }, delay);
            restoreTimersRef.current.push(t);
          }
        } else {
          isUnlimitedRef.current = true;
          setIsUnlimited(true);
          setEnergy(dynMax);
          energyRef.current = dynMax;
        }
        return;
      }

      const state = await readAndRecoverState(dynMax, recoveryMs);
      energyRef.current = state.current;
      lastRecoveryRef.current = state.lastRecoveryTime;
      setEnergy(state.current);

      if (state.current < dynMax) {
        const now = Date.now();
        const elapsed = now - state.lastRecoveryTime;
        const remaining = recoveryMs - (elapsed % recoveryMs);
        const safeRemaining = remaining > 0 ? remaining : 0;
        setTimeUntilNextMs(safeRemaining);
        setRecoveryEndsAtMs(safeRemaining > 0 ? now + safeRemaining : 0);
      } else {
        setTimeUntilNextMs(0);
        setRecoveryEndsAtMs(0);
      }
    } catch {
    } finally {
      energyReadyRef.current = true;
      setEnergyReady(true);
      // B2: обновляем peek-кеш последним известным значением после каждого
      // успешного load — следующий маунт провайдера (навигация назад/вперёд,
      // Fast Refresh) стартует с этого значения вместо MAX_ENERGY.
      writePeekEnergy(energyRef.current, dynMaxRef.current);
      // Синхронизируем energy-full пуш с актуальным состоянием:
      // полная/безлимит → отмена, неполная → (пере)планирование на точный момент.
      void syncEnergyPushRef.current?.();
    }
  }, []);
  const load = useCallback(async () => {
    loadRunnerRef.current ??= createCoalescedAsyncRunner(runLoad);
    await loadRunnerRef.current();
  }, [runLoad]);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  // Foreground/events reload. Recovery polling lives in a separate gated effect below.
  useEffect(() => {
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let resumeTask: { cancel?: () => void } | null = null;

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setAppActive(true);
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTask?.cancel?.();
        resumeTimer = setTimeout(() => {
          resumeTimer = null;
          resumeTask = InteractionManager.runAfterInteractions(() => {
            load();
          });
        }, 300);
      } else {
        setAppActive(false);
        if (resumeTimer) {
          clearTimeout(resumeTimer);
          resumeTimer = null;
        }
        resumeTask?.cancel?.();
      }
    });

    // Перезагружаем энергию по событию от xp_manager при level-up / смене Premium.
    const levelSub = DeviceEventEmitter.addListener('energy_reload', () => { load(); });
    const premiumOnSub = DeviceEventEmitter.addListener('premium_activated', () => { load(); });
    const premiumOffSub = DeviceEventEmitter.addListener('premium_deactivated', () => { load(); });
    const vipOnSub = DeviceEventEmitter.addListener('vip_activated', () => { load(); });
    const vipOffSub = DeviceEventEmitter.addListener('vip_deactivated', () => { load(); });
    const accessSub = DeviceEventEmitter.addListener('premium_access_changed', () => { load(); });
    const remoteConfigSub = DeviceEventEmitter.addListener('remote_config_changed', () => { load(); });

    return () => {
      sub.remove();
      levelSub.remove();
      premiumOnSub.remove();
      premiumOffSub.remove();
      vipOnSub.remove();
      vipOffSub.remove();
      accessSub.remove();
      remoteConfigSub.remove();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTask?.cancel?.();
    };
  }, [load]);

  // Check recovery near the next real refill instead of polling while the app is idle.
  useEffect(() => {
    if (!appActive || isUnlimited || energy >= maxEnergy) return;
    const remaining = timeUntilNextMs > 0 ? timeUntilNextMs : recoveryIntervalMs;
    const delay = Math.max(1000, remaining + 250);
    const timeoutId = setTimeout(load, delay);
    return () => clearTimeout(timeoutId);
  }, [appActive, energy, maxEnergy, isUnlimited, load, recoveryIntervalMs, timeUntilNextMs]);

  // ── Spend 1 energy ─────────────────────────────────────────────────────────
  const spendOne = useCallback(async (): Promise<boolean> => {
    // зачем: пока статус не прочитан, isUnlimitedRef держит placeholder `false`
    // — и трата прошла бы у премиума, тестера и в «вечер без лимитов». Ждём
    // первое живое чтение и только потом решаем. Возврат true = «проходи»:
    // отказывать нельзя, иначе на холодном старте активность не запустится.
    // load() коалесцирован: параллельные вызовы ждут один и тот же прогон,
    // лишних чтений хранилища не будет.
    if (!energyReadyRef.current) {
      await load();
    }
    if (isUnlimitedRef.current) return true;
    if (bonusRef.current <= 0 && energyRef.current <= 0) return false;

    // зачем: владелец 2026-08-23 — «при начале мы должны видеть анимацию
    // отнятия 1 единицы». Событие шлём ЗДЕСЬ, в единственной общей точке
    // траты, а не в девяти экранах по отдельности: так анимация появляется
    // всюду сама и не может «забыться» в новой активности.
    // Шлём синхронно, до записи в хранилище — картинка должна отзываться
    // на нажатие мгновенно, запись догоняет.
    emitAppEvent('energy_spent_on_start', { amount: 1, target: motionTargetRef.current ?? undefined });

    // Spend from bonus first (it expires tomorrow, use it before base energy)
    if (bonusRef.current > 0) {
      lastSpendPoolRef.current = 'bonus';
      const newBonus = bonusRef.current - 1;
      bonusRef.current = newBonus;
      setBonusEnergy(newBonus);
      try {
        if (newBonus === 0) {
          await AsyncStorage.removeItem(BONUS_ENERGY_KEY);
        } else {
          const raw = await AsyncStorage.getItem(BONUS_ENERGY_KEY);
          if (raw) {
            const b = JSON.parse(raw);
            await AsyncStorage.setItem(BONUS_ENERGY_KEY, JSON.stringify({ ...b, amount: newBonus }));
          }
        }
      } catch {}
      // База могла быть неполной от прошлых трат — синхронизируем пуш.
      void syncEnergyPushRef.current?.();
      return true;
    }

    lastSpendPoolRef.current = 'base';
    const now = Date.now();
    // Start fresh recovery timer when spending from full
    const newLastRecovery = energyRef.current >= dynMaxRef.current ? now : lastRecoveryRef.current;
    const newEnergy = energyRef.current - 1;

    energyRef.current = newEnergy;
    lastRecoveryRef.current = newLastRecovery;
    setEnergy(newEnergy);
    const recoveryMs = recoveryMsRef.current;
    const elapsed = now - newLastRecovery;
    const remaining = recoveryMs - (elapsed % recoveryMs);
    const safeRemaining = remaining > 0 ? remaining : 0;
    setTimeUntilNextMs(safeRemaining);
    setRecoveryEndsAtMs(safeRemaining > 0 ? now + safeRemaining : 0);

    const state: StoredEnergy = { current: newEnergy, lastRecoveryTime: newLastRecovery };
    await withStorageLock(async () => {
      await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    });
    writePeekEnergy(newEnergy, dynMaxRef.current);

    // Энергия упала ниже максимума → (пере)планируем пуш о восстановлении.
    void syncEnergyPushRef.current?.();

    return true;
  }, [load]);

  // ── Refund 1 energy (старт не состоялся) ──────────────────────────────────
  const refundOne = useCallback(async (): Promise<void> => {
    if (isUnlimitedRef.current) return;

    const pool = lastSpendPoolRef.current;
    lastSpendPoolRef.current = null;

    // Единица ушла из бонусного пула — туда и возвращается, ПОКА бонус жив
    // (не истёк в полночь между тратой и возвратом; тогда честный фолбэк —
    // база). Так сгорающий бонус не «отмывается» в вечную базу, а возврат при
    // полной базе не пропадает об потолок.
    if (pool === 'bonus') {
      try {
        const raw = await AsyncStorage.getItem(BONUS_ENERGY_KEY);
        if (raw) {
          const b = JSON.parse(raw) as { amount?: number; expiresAt?: number };
          if (Number(b?.expiresAt) > Date.now()) {
            const restored = Math.max(0, Math.floor(Number(b?.amount) || 0)) + 1;
            await AsyncStorage.setItem(BONUS_ENERGY_KEY, JSON.stringify({ ...b, amount: restored }));
            bonusRef.current = restored;
            setBonusEnergy(restored);
            void syncEnergyPushRef.current?.();
            return;
          }
        } else if (bonusRef.current === 0) {
          // Трата последней бонусной единицы удалила ключ целиком — восстановить
          // нечего без expiresAt. Скатываемся в базу ниже: единица не пропадает.
        }
      } catch {
        // Битое хранилище бонуса — не глотаем единицу, возвращаем в базу.
      }
    }

    // Потолок соблюдаем: возврат не может поднять базу выше максимума.
    const capped = Math.min(energyRef.current + 1, dynMaxRef.current);
    if (capped === energyRef.current) return;

    energyRef.current = capped;
    setEnergy(capped);

    const state: StoredEnergy = { current: capped, lastRecoveryTime: lastRecoveryRef.current };
    await withStorageLock(async () => {
      await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
    });
    writePeekEnergy(capped, dynMaxRef.current);
    // Баланс вырос — пуш о полном восстановлении мог стать неактуальным.
    void syncEnergyPushRef.current?.();
  }, []);

  // ── Spend N energy (bonus first, then base) in one pass ───────────────────
  const spendAmount = useCallback(async (n: number): Promise<boolean> => {
    if (n <= 0) return true;
    // Та же защита, что в spendOne: не тратим по placeholder-статусу.
    if (!energyReadyRef.current) {
      await load();
    }
    if (isUnlimitedRef.current) return true;
    if (bonusRef.current + energyRef.current < n) return false;

    const takeB = Math.min(n, bonusRef.current);
    const nFromBase = n - takeB;
    const e = energyRef.current;
    if (e < nFromBase) return false;

    // Та же анимация списания, что и в spendOne (экзамены ходят сюда).
    emitAppEvent('energy_spent_on_start', { amount: n, target: motionTargetRef.current ?? undefined });

    const newBonus = bonusRef.current - takeB;
    const newE = e - nFromBase;
    const now = Date.now();
    const wasFull = e >= dynMaxRef.current;
    const newLastRecovery = wasFull && nFromBase > 0 ? now : lastRecoveryRef.current;

    bonusRef.current = newBonus;
    setBonusEnergy(newBonus);
    try {
      if (newBonus === 0) {
        await AsyncStorage.removeItem(BONUS_ENERGY_KEY);
      } else {
        const raw = await AsyncStorage.getItem(BONUS_ENERGY_KEY);
        if (raw) {
          const b = JSON.parse(raw) as { amount?: number; expiresAt?: number };
          await AsyncStorage.setItem(BONUS_ENERGY_KEY, JSON.stringify({ ...b, amount: newBonus }));
        }
      }
    } catch { /* best-effort */ }

    if (nFromBase > 0) {
      lastRecoveryRef.current = newLastRecovery;
      energyRef.current = newE;
      setEnergy(newE);
      const recoveryMs = recoveryMsRef.current;
      const elapsed = now - newLastRecovery;
      const remaining = recoveryMs - (elapsed % recoveryMs);
      const safeRemaining = remaining > 0 ? remaining : 0;
      setTimeUntilNextMs(safeRemaining);
      setRecoveryEndsAtMs(safeRemaining > 0 ? now + safeRemaining : 0);
      const state: StoredEnergy = { current: newE, lastRecoveryTime: newLastRecovery };
      try {
        await withStorageLock(async () => {
          await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
        });
      } catch { /* best-effort */ }
      writePeekEnergy(newE, dynMaxRef.current);
    }

    // Энергия потрачена → (пере)планируем пуш о полном восстановлении.
    void syncEnergyPushRef.current?.();

    return true;
  }, [load]);

  const confirmSpendAmount = useCallback(async (n: number): Promise<EnergyStartResult> => {
    const cost = Math.max(0, Math.floor(n));
    if (cost <= 0) return 'unlimited';
    if (!energyReadyRef.current) await load();
    if (isUnlimitedRef.current) return 'unlimited';
    if (bonusRef.current + energyRef.current < cost) return 'insufficient';

    // зачем: владелец 2026-08-24 — окно «Потратить 1 энергию и начать?» убрано.
    // Лишний тап на каждый старт мешал, а цена и так видна прямо на кнопке
    // знаком «−1 ⚡». Тап по кнопке = согласие: списываем сразу.
    // Остальные ветки не тронуты — безлимит и нехватка энергии решаются выше,
    // до этой точки, и экран «энергия кончилась» остаётся на месте.
    // Анимация полёта энергии сохранена: без модалки у неё нет точки старта,
    // поэтому она летит от счётчика энергии по запасному пути (см.
    // EnergySpendFlightHost — target необязателен).
    //
    // Ждать её окончания больше НЕЛЬЗЯ: раньше эти ~1.15 с прятались за
    // модалкой, а без модалки они превратились бы в заметную паузу между тапом
    // и стартом. Молния летит фоном поверх уже открывшегося экрана —
    // отклик мгновенный, а списание всё равно видно.
    const spent = cost === 1 ? await spendOne() : await spendAmount(cost);
    if (!spent) return 'insufficient';
    return 'spent';
  }, [load, spendAmount, spendOne]);

  const confirmSpendOne = useCallback(
    (): Promise<EnergyStartResult> => confirmSpendAmount(1),
    [confirmSpendAmount],
  );

  // ── Sync energy-full push с текущим состоянием ──────────────────────────────
  // Безлимит/полная энергия → отменяем пуш. Иначе планируем на момент полного
  // восстановления. Best-effort: не должен ломать трату энергии при ошибке.
  const syncEnergyFullNotification = useCallback(async () => {
    try {
      if (isUnlimitedRef.current) {
        await cancelEnergyFullNotification();
        return;
      }
      const current = energyRef.current;
      const dynMax = dynMaxRef.current;
      if (current >= dynMax) {
        await cancelEnergyFullNotification();
        return;
      }
      const secondsUntilFull = secondsUntilEnergyFull(
        current,
        dynMax,
        recoveryMsRef.current,
        lastRecoveryRef.current,
      );
      const lang = await readNotificationLang();
      await scheduleEnergyFullNotification(secondsUntilFull, lang);
    } catch { /* best-effort: пуш не критичен */ }
  }, []);
  syncEnergyPushRef.current = syncEnergyFullNotification;

  // ── Force reload (call after tester toggle in settings) ────────────────────
  const reload = useCallback(async () => { await load(); }, [load]);

  // Confirmed Premium must feel immediate: update refs/UI/peek first, then persist
  // the same full state locally. No Firebase work and no animation timer is added.
  const refillToMax = useCallback(async (
    isCurrent: () => boolean = () => true,
  ): Promise<boolean> => {
    if (!isCurrent()) return false;
    const freshDynMax = await readDynMax();
    if (!isCurrent()) return false;
    dynMaxRef.current = freshDynMax;
    restoreTimersRef.current.forEach(timer => clearTimeout(timer));
    restoreTimersRef.current = [];
    setRestoringPremium(false);

    const fullEnergy = Math.max(1, Math.floor(freshDynMax));
    const now = Date.now();
    const state: StoredEnergy = { current: fullEnergy, lastRecoveryTime: now };
    energyRef.current = fullEnergy;
    lastRecoveryRef.current = now;
    isUnlimitedRef.current = true;
    setEnergy(fullEnergy);
    setMaxEnergy(fullEnergy);
    setIsUnlimited(true);
    setTimeUntilNextMs(0);
    setRecoveryEndsAtMs(0);
    energyReadyRef.current = true;
    setEnergyReady(true);
    writePeekEnergy(fullEnergy, fullEnergy);

    let persisted = false;
    for (let attempt = 0; attempt < 2 && isCurrent(); attempt += 1) {
      try {
        await withStorageLock(async () => {
          await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(state));
        });
        persisted = true;
        break;
      } catch {
        // One immediate retry covers a transient native-storage failure without
        // adding a timer, listener, or background worker.
      }
    }
    if (!persisted || !isCurrent()) return false;
    await cancelEnergyFullNotification().catch(() => {});
    return isCurrent();
  }, []);

  const formattedTime = energy < dynMaxRef.current && !isUnlimited ? formatTimeUntilRecovery(timeUntilNextMs) : '';

  const value = useMemo<EnergyContextValue>(() => ({
    energy, bonusEnergy, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    spendOne, confirmSpendOne, spendAmount, confirmSpendAmount,
    refundOne, reload, refillToMax, energyReady,
  }), [
    energy, bonusEnergy, bonusExpiresAt, maxEnergy, recoveryIntervalMs, recoveryEndsAtMs,
    timeUntilNextMs, formattedTime, isUnlimited, restoringPremium,
    spendOne, confirmSpendOne, spendAmount, confirmSpendAmount,
    refundOne, reload, refillToMax, energyReady,
  ]);

  return (
    <EnergyContext.Provider value={value}>
      {children}
    </EnergyContext.Provider>
  );
}
