// ════════════════════════════════════════════════════════════════════════════
// OverlayArbiter.tsx — арбитр глобальных модалок на старте/в течение сессии.
//
// Зачем:
//   На холодном старте параллельно могут «попроситься» сразу несколько модалок
//   (Update / Broadcast / ShardReward / NotifNudge / LevelUp), и без координации
//   они отрисовываются друг поверх друга. На Android при visible сразу нескольких
//   `Modal` со statusBarTranslucent система начинает мерцать и иногда подвешивает
//   System UI — это и был основной источник ANR/freeze на холодном старте.
//
// Что делает арбитр:
//   • Каждая модалка-кандидат говорит «я готова показаться» через `useOverlayVisible`.
//   • Арбитр держит ровно ОДНУ активную модалку в каждый момент времени.
//   • Когда активная закрывается, автоматически активируется следующая по приоритету.
//   • Приоритет: update > broadcast > shardReward > notifNudge > levelUp.
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

export type OverlayKey =
  | 'update'
  | 'releaseWave'
  | 'broadcast'
  | 'shardReward'
  | 'notifNudge'
  | 'levelUp';

// `releaseWave` идёт сразу после `update`: «у тебя свежий апдейт + вот тебе подарок».
// Раньше broadcast/shardReward — потому что это разовая модалка после установки
// новой сборки и её приятнее показать первой, до текущих сетевых событий.
const PRIORITY: OverlayKey[] = [
  'update',
  'releaseWave',
  'broadcast',
  'shardReward',
  'notifNudge',
  'levelUp',
];

type WantsMap = Record<OverlayKey, boolean>;

const EMPTY_WANTS: WantsMap = {
  update: false,
  releaseWave: false,
  broadcast: false,
  shardReward: false,
  notifNudge: false,
  levelUp: false,
};

type Ctx = {
  active: OverlayKey | null;
  setWants: (key: OverlayKey, wants: boolean) => void;
};

const OverlayArbiterContext = createContext<Ctx | null>(null);

export function OverlayArbiterProvider({ children }: { children: React.ReactNode }) {
  const [wantsMap, setWantsMap] = useState<WantsMap>(EMPTY_WANTS);

  const setWants = useCallback((key: OverlayKey, wants: boolean) => {
    setWantsMap((prev) => (prev[key] === wants ? prev : { ...prev, [key]: wants }));
  }, []);

  // Активная = первая в порядке приоритета, у кого wants=true.
  // Сменяется автоматически когда текущая активная отпускает слот (wants=false).
  const active = useMemo<OverlayKey | null>(() => {
    for (const k of PRIORITY) {
      if (wantsMap[k]) return k;
    }
    return null;
  }, [wantsMap]);

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
    return { active: null, setWants: () => {} };
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
  const { active, setWants } = useOverlayArbiter();

  useEffect(() => {
    setWants(key, ownState);
    return () => {
      // Размонтирование экрана с модалкой = освобождение слота.
      setWants(key, false);
    };
  }, [key, ownState, setWants]);

  return ownState && active === key;
}

/* expo-router route shim: не превращаем utility в роут при автодискавери */
export default function __RouteShim() {
  return null;
}
