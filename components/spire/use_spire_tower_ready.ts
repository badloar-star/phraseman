// ═══════════════════════════════════════════════════════════════════════════
// use_spire_tower_ready.ts — «башню можно монтировать»: флаг взводится через два кадра после монтажа экрана.
//
// зачем (координатор 29.10, разбор JS-стопа на «Пике», улика Сайта js_stall_peak_2026-10-29.log): башня — ~500 узлов react-native-svg, и их
// монтаж в том же кадре, что и сам экран/кадр объявления, даёт всплеск сборок мусора (кадр peak: 61 за тик при 35–45 у соседей) и рывок появления.
// Тот же паттерн уже стоит в окне этажа (SpireFloorMoment, аудит скорости 26.10): сначала лёгкий кадр, башня — следующим. Здесь он вынесен в один хук.
// Лог [SPIRE-TOWER-DEFER] пишет, через сколько мс после монтажа рамки башня разрешена, — по нему видно, что отсрочка работает и сколько стоит.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

const LOG = '[SPIRE-TOWER-DEFER]';
const FALLBACK_FRAME_MS = 16;

// зачем: где нет requestAnimationFrame (тестовая среда) кадр ≈ 16 мс таймером — поведение то же
function nextFrame(cb: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(cb);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(cb, FALLBACK_FRAME_MS);
  return () => clearTimeout(id);
}

/** false в кадре монтажа и в следующем; true — когда пора ставить тяжёлую башню. */
export function useSpireTowerReady(source: string): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t0 = Date.now();
    let cancelSecond: (() => void) | null = null;
    const cancelFirst = nextFrame(() => {
      cancelSecond = nextFrame(() => {
        setReady(true);
        console.log(LOG, 'башня разрешена', JSON.stringify({ source, afterMs: Date.now() - t0 })); // guard-ok: одна строка на показ башни
      });
    });
    return () => { cancelFirst(); cancelSecond?.(); };
  }, [source]);
  return ready;
}
