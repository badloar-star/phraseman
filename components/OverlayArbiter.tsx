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
  useState,
} from 'react';
import {
  EMPTY_OVERLAY_WANTS,
  hasOtherWaiters,
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

type Ctx = {
  active: OverlayKey | null;
  setWants: (key: OverlayKey, wants: boolean) => void;
  disabled?: boolean;
};

const OverlayArbiterContext = createContext<Ctx | null>(null);

export function OverlayArbiterProvider({ children }: { children: React.ReactNode }) {
  const [wantsMap, setWantsMap] = useState<WantsMap>(EMPTY_OVERLAY_WANTS);
  const [active, setActive] = useState<OverlayKey | null>(null);

  const setWants = useCallback((key: OverlayKey, wants: boolean) => {
    setWantsMap((prev) => (prev[key] === wants ? prev : { ...prev, [key]: wants }));
  }, []);

  // Non-preemptive queue: the current owner keeps the slot until it releases it.
  // Priority is used only when choosing the next overlay from waiting candidates.
  useEffect(() => {
    setActive((prev) => {
      const next = resolveNextOverlay(prev, wantsMap);
      return next === prev ? prev : next;
    });
  }, [wantsMap]);

  // H-ARBITER: сторож от залипшего владельца слота. Пока активный оверлей держит слот
  // И есть другие желающие, держим таймер; если за OVERLAY_MAX_HOLD_WITH_WAITERS_MS
  // владелец так и не освободил слот (его ownState завис true), принудительно передаём
  // слот следующему по приоритету — иначе тосты/алерты ниже навсегда заморожены.
  useEffect(() => {
    if (!active || !hasOtherWaiters(active, wantsMap)) return;
    const t = setTimeout(() => {
      setActive((prev) => {
        if (!prev) return prev;
        const next = resolveNextOverlayExcluding(prev, wantsMap);
        return next && next !== prev ? next : prev;
      });
    }, OVERLAY_MAX_HOLD_WITH_WAITERS_MS);
    return () => clearTimeout(t);
  }, [active, wantsMap]);

  const value = useMemo<Ctx>(() => ({ active, setWants }), [active, setWants]);

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
    return { active: null, setWants: () => {}, disabled: true };
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

/* expo-router route shim: не превращаем utility в роут при автодискавери */
export default function __RouteShim() {
  return null;
}
