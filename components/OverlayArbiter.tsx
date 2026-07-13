// ════════════════════════════════════════════════════════════════════════════
// OverlayArbiter.tsx — арбитр глобальных модалок на старте/в течение сессии.
//
// Зачем:
//   На холодном старте параллельно могут «попроситься» сразу несколько модалок
//   (Update / ReleaseNotes / Broadcast / NotifNudge / LevelUp), и без координации
//   они отрисовываются друг поверх друга. На Android при visible сразу нескольких
//   `Modal` со statusBarTranslucent система начинает мерцать и иногда подвешивает
//   System UI — это и был основной источник ANR/freeze на холодном старте.
//
// Что делает арбитр:
//   • Каждая модалка-кандидат говорит «я готова показаться» через `useOverlayVisible`.
//   • Арбитр держит ровно ОДНУ активную модалку в каждый момент времени.
//   • Когда активная закрывается, автоматически активируется следующая по приоритету.
//   • Приоритет: update > releaseNotes > broadcast > notifNudge > levelUp.
//
// Использование:
//   const visible = useOverlayVisible('update', !!updateInfo && !hidden);
//   <UpdateModal visible={visible} ... />
// ════════════════════════════════════════════════════════════════════════════

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  decideWantsWrite,
  EMPTY_OVERLAY_WANTS,
  hasOtherWaiters,
  isForceEvictable,
  needsHandoffGap,
  resolveNextOverlay,
  resolveNextOverlayExcluding,
  type OverlayKey,
  type WantsMap,
} from './overlay_arbiter_core';

export type { OverlayKey };
export { resolveNextOverlay };

// H-ARBITER: если владелец слота держит его дольше этого времени, ПОКА в очереди ждут
// другие оверлеи, сторож принудительно передаёт слот следующему. Защита от залипшей
// модалки, чей ownState по ошибке не сбросился в false (иначе она навсегда голодила бы
// тосты/алерты ниже по приоритету). Срабатывает только при наличии очереди — модалку,
// которую юзер просто долго читает в одиночестве, не трогаем.
const OVERLAY_MAX_HOLD_WITH_WAITERS_MS = 15_000;

// Зазор между закрытием одной нативной модалки и показом следующей нативной модалки.
// На iOS present не должен начинаться, пока идёт dismiss предыдущего Modal — иначе стек
// презентаций ломается (фриз). Сначала закрываем текущую (active=null), ждём этот зазор
// (с запасом на анимацию закрытия ~250мс + кадр), потом отдаём слот следующей. См.
// needsHandoffGap в overlay_arbiter_core.
const NATIVE_MODAL_HANDOFF_GAP_MS = 360;

type Ctx = {
  active: OverlayKey | null;
  occupied: boolean;
  setWants: (key: OverlayKey, wants: boolean) => void;
  tryClaim: (key: 'softUpsell') => Promise<OverlayLease | null>;
  disabled?: boolean;
};

export type OverlayLease = Readonly<{ token: string; release: () => void }>;

const OverlayArbiterContext = createContext<Ctx | null>(null);

export function deriveOverlayOccupied(active: OverlayKey | null, handoffGap: boolean): boolean {
  return active !== null || handoffGap;
}

export function OverlayArbiterProvider({ children }: { children: React.ReactNode }) {
  const [wantsMap, setWantsMap] = useState<WantsMap>(EMPTY_OVERLAY_WANTS);
  const [active, setActive] = useState<OverlayKey | null>(null);
  const activeRef = useRef<OverlayKey | null>(null);
  activeRef.current = active;
  const wantsMapRef = useRef<WantsMap>(EMPTY_OVERLAY_WANTS);
  wantsMapRef.current = wantsMap;
  const leaseTokenRef = useRef<string | null>(null);
  const leaseCounterRef = useRef(0);

  // Ключи, у которых сторож (H-ARBITER) принудительно отобрал слот, потому что владелец
  // завис (ownState застрял true). Пока ключ здесь, его `wants:true` ИГНОРИРУЕТСЯ — иначе
  // зависший владелец каждые 15с забирал бы слот обратно (пинг-понг). Очищается, только
  // когда модалка реально освободит слот: setWants(key, false) (закрытие/размонтирование).
  const forciblyReleasedRef = useRef<Set<OverlayKey>>(new Set());

  // Идёт ли «зазор закрытия» нативной модалки (active уже null, ждём докрытия перед
  // показом следующей). Пока true — не отдаём слот, чтобы present не наложился на dismiss.
  const handoffGapRef = useRef(false);
  // Таймер зазора держим в ref (не в cleanup эффекта): при active→null эффект
  // перезапускается, и cleanup прошлого прогона иначе отменил бы зазор досрочно.
  const handoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setWants = useCallback((key: OverlayKey, wants: boolean) => {
    const { apply, nextForciblyReleased } = decideWantsWrite(
      key,
      wants,
      forciblyReleasedRef.current,
    );
    forciblyReleasedRef.current = nextForciblyReleased;
    if (!apply) return;
    setWantsMap((prev) => (prev[key] === wants ? prev : { ...prev, [key]: wants }));
  }, []);

  const tryClaim = useCallback(async (key: 'softUpsell'): Promise<OverlayLease | null> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (activeRef.current !== null || handoffGapRef.current || leaseTokenRef.current !== null) return null;
    if (Object.entries(wantsMapRef.current).some(([candidate, wants]) => candidate !== key && wants)) return null;
    const token = `${key}:${++leaseCounterRef.current}`;
    leaseTokenRef.current = token;
    setWantsMap((current) => ({ ...current, [key]: true }));
    setActive(key);
    activeRef.current = key;
    let released = false;
    return Object.freeze({
      token,
      release: () => {
        if (released || leaseTokenRef.current !== token) return;
        released = true;
        leaseTokenRef.current = null;
        activeRef.current = null;
        setWantsMap((current) => ({ ...current, [key]: false }));
        setActive((current) => (current === key ? null : current));
      },
    });
  }, []);

  // Non-preemptive queue: the current owner keeps the slot until it releases it.
  // Priority is used only when choosing the next overlay from waiting candidates.
  //
  // NATIVE-MODAL HANDOFF GAP: если слот переходит с одной нативной модалки на ДРУГУЮ
  // нативную (present-after-dismiss риск на iOS), сначала закрываем текущую (active=null)
  // и ждём NATIVE_MODAL_HANDOFF_GAP_MS, только потом отдаём слот следующей. Эффект
  // зависит и от active: после того как зазор сбросит active в null, он перезапустится и
  // отдаст слот ждущей модалке штатно. Первый показ (prev=null), закрытие в никуда и
  // переходы с не-нативными оверлеями идут мгновенно, как раньше.
  useEffect(() => {
    if (handoffGapRef.current) return; // идёт зазор — не трогаем слот до его конца
    const next = resolveNextOverlay(active, wantsMap);
    if (next === active) return;
    if (needsHandoffGap(active, next)) {
      // Закрываем текущую нативную модалку и держим паузу перед показом следующей.
      handoffGapRef.current = true;
      setActive(null);
      if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
      handoffTimerRef.current = setTimeout(() => {
        handoffTimerRef.current = null;
        handoffGapRef.current = false;
        // Перерезолвим по актуальному wantsMap: за время зазора очередь могла измениться.
        setActive((prev) => resolveNextOverlay(prev, wantsMap));
      }, NATIVE_MODAL_HANDOFF_GAP_MS);
      return;
    }
    setActive(next);
  }, [wantsMap, active]);

  // Снять таймер зазора при размонтировании провайдера (анти-утечка).
  useEffect(() => () => {
    if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
  }, []);

  // H-ARBITER: сторож от залипшего владельца слота. Пока активный оверлей держит слот
  // И есть другие желающие, держим таймер; если за OVERLAY_MAX_HOLD_WITH_WAITERS_MS
  // владелец так и не освободил слот (его ownState завис true), принудительно передаём
  // слот следующему по приоритету — иначе тосты/алерты ниже навсегда заморожены.
  // Важно: зависшего владельца кладём в карантин (forciblyReleased) И обнуляем его wants,
  // чтобы слот не вернулся к нему через 15с (без этого был пинг-понг каждые 15с).
  //
  // КРИТИЧНО: сторож выселяет ТОЛЬКО транзиентные тосты/уведомления (isForceEvictable).
  // Крупные пользовательские модалки (level-up + сундук, праздники, intro/loyalty, celebration…)
  // закрывает ЮЗЕР — их выселять по таймеру НЕЛЬЗЯ: иначе если юзер просто читает окно >15с,
  // а за ним ждёт мелкий тост, сторож карантинил живую модалку как «зависшую» и окно (вместе с
  // наградой, напр. сундуком level-up) пропадало на всю сессию. Для таких модалок просто ждём,
  // пока юзер их закроет.
  useEffect(() => {
    if (!active || !isForceEvictable(active) || !hasOtherWaiters(active, wantsMap)) return;
    const t = setTimeout(() => {
      setActive((prev) => {
        if (!prev) return prev;
        const next = resolveNextOverlayExcluding(prev, wantsMap);
        if (!next || next === prev) return prev;
        // Карантин для зависшего владельца + снятие его wants, чтобы не было пинг-понга.
        forciblyReleasedRef.current = new Set(forciblyReleasedRef.current).add(prev);
        setWantsMap((m) => (m[prev] ? { ...m, [prev]: false } : m));
        return next;
      });
    }, OVERLAY_MAX_HOLD_WITH_WAITERS_MS);
    return () => clearTimeout(t);
  }, [active, wantsMap]);

  const occupied = deriveOverlayOccupied(active, handoffGapRef.current);
  const value = useMemo<Ctx>(() => ({ active, occupied, setWants, tryClaim }), [active, occupied, setWants, tryClaim]);

  return (
    <OverlayArbiterContext.Provider value={value}>
      {children}
    </OverlayArbiterContext.Provider>
  );
}

function useOverlayArbiter(): Ctx {
  const ctx = useContext(OverlayArbiterContext);
  if (!ctx) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[OverlayArbiter] Provider не смонтирован — fail-soft, всегда пускаю');
    }
    return {
      active: null,
      occupied: false,
      setWants: () => {},
      tryClaim: async () => ({ token: 'disabled', release: () => {} }),
      disabled: true,
    };
  }
  return ctx;
}

/**
 * Гейт для модалки: возвращает true, только если арбитр выбрал именно её.
 *
 * @param key       Идентификатор модалки.
 * @param ownState  Внутреннее состояние «у меня есть, что показать» (например,
 *                  `!!updateInfo`). Когда становится false — модалка освобождает слот.
 * @returns         `ownState && active === key` — пробрасывай в `<Modal visible={...}>`.
 */
export function useOverlayVisible(key: OverlayKey, ownState: boolean): boolean {
  const { active, setWants, disabled } = useOverlayArbiter();

  useEffect(() => {
    setWants(key, ownState);
    return () => {
      // Размонтирование экрана с модалкой = освобождение слота.
      setWants(key, false);
    };
  }, [key, ownState, setWants]);

  if (disabled) return ownState;
  return ownState && active === key;
}

/** Read-only signal for inline UI that must stay hidden while any overlay owns the slot. */
export function useOverlayOccupied(): boolean {
  return useOverlayArbiter().occupied;
}

/** Opportunistic claim: never joins the regular overlay queue. */
export function useOverlayTryClaim(): () => Promise<OverlayLease | null> {
  const { tryClaim } = useOverlayArbiter();
  return useCallback(() => tryClaim('softUpsell'), [tryClaim]);
}
/* expo-router route shim: не превращаем utility в роут при автодискавери */
export default function __RouteShim() {
  return null;
}
