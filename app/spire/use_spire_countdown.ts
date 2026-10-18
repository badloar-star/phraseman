// use_spire_countdown.ts — отсчёт 3 → 2 → 1 перед стартом ступени Пика.
//
// зачем (прямая просьба владельца через координатора 18.10): после «Подняться» человеку нужна секунда собраться — крупный отсчёт 3 → 2 → 1, и только потом
// начинается ступень. Время человеку не тратится: энергия, таймер и первое задание стартуют ТОЛЬКО после «1» (раннер держит фазу 'countdown' до onDone).
// Три цифры — три setState на весь отсчёт (по ~0,9 с), покадровой перерисовки нет: масштаб и появление рисует Reanimated на UI-потоке (SpireCountdownOverlay).
// Пауза: приложение ушло в фон или открыта шторка выхода — таймеры снимаются, раунд в фоне не стартует; вернулись — отсчёт начинается заново с 3.
// Один экземпляр на ступень (раннер живёт под ключом runId), поэтому двойное «Подняться» не запускает два отсчёта. Вибрация на каждой цифре; звук — тем же слоем
// sound_v2, что остальной Пик (playEvent никогда не бросает и сам молчит, если звук выключен).
// Журнал [SPIRE-COUNTDOWN]: старт, каждая цифра, пауза (причина), перезапуск, старт раунда.
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { hapticTap } from '../../hooks/use-haptics';
import { playEvent } from '../../modules/sound_v2/sound_bank';

const SPIRE = '[SPIRE]'; // зачем: сторож spire_game_source_contract — префикс [SPIRE] во всех файлах app/spire
const LOG = `${SPIRE}[SPIRE-COUNTDOWN]`;

/** С какой цифры начинается отсчёт и сколько держится каждая (просьба: ~0,8–1 с). */
export const SPIRE_COUNTDOWN_FROM = 3;
export const SPIRE_COUNTDOWN_STEP_MS = 900;

export function useSpireCountdown(args: Readonly<{ paused: boolean; onDone: () => void }>): number | null {
  const { paused } = args;
  const [digit, setDigit] = useState<number | null>(SPIRE_COUNTDOWN_FROM);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const onDoneRef = useRef(args.onDone);
  onDoneRef.current = args.onDone;
  const doneRef = useRef(false);
  const runsRef = useRef(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => setAppActive(next === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (doneRef.current) return undefined;
    if (paused || !appActive) {
      console.log(`${LOG} pause reason=${paused ? 'exit_sheet' : 'app_background'} — раунд не стартует, отсчёт начнётся заново с ${SPIRE_COUNTDOWN_FROM}`); // guard-ok: ветка и значение, которое её решило
      setDigit(null);
      return undefined;
    }
    runsRef.current += 1;
    console.log(`${LOG} start run=${runsRef.current} from=${SPIRE_COUNTDOWN_FROM} stepMs=${SPIRE_COUNTDOWN_STEP_MS}`); // guard-ok: старт отсчёта
    setDigit(SPIRE_COUNTDOWN_FROM);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < SPIRE_COUNTDOWN_FROM; i += 1) {
      timers.push(setTimeout(() => setDigit(SPIRE_COUNTDOWN_FROM - i), i * SPIRE_COUNTDOWN_STEP_MS));
    }
    timers.push(setTimeout(() => {
      doneRef.current = true;
      setDigit(null);
      console.log(`${LOG} done — после «1» стартует раунд (энергия, таймер, первое задание)`); // guard-ok: старт раунда
      onDoneRef.current();
    }, SPIRE_COUNTDOWN_FROM * SPIRE_COUNTDOWN_STEP_MS));
    return () => { timers.forEach(clearTimeout); };
  }, [paused, appActive]);

  // вибрация и звук на каждой цифре (одна строка журнала на цифру)
  useEffect(() => {
    if (digit === null) return;
    console.log(`${LOG} digit=${digit} run=${runsRef.current}`); // guard-ok: каждая цифра
    void hapticTap();
    playEvent('tap');
  }, [digit]);

  return digit;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __SpireCountdownRouteShim() {
  return null;
}
