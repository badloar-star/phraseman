// зачем (запрос координатора 15.10, Ядро по журналам памяти: /settings_themes даёт +52 МБ за 65 с): правило «сперва логи» — до облегчения нужны цифры:
// сколько превью смонтировано, как растут кэши токенов/арта и куча Hermes за время на экране. Только dev-сборка; на вид и поведение экрана не влияет.
import { useEffect, useRef } from 'react';
import { liquidGlassTokenCacheSize } from '../../constants/liquidGlassThemePalette';
import { themedArtCacheSize } from '../theme/themed_art_registry';
import { v2PaletteCacheSize } from '../../constants/v2Style';

const mb = (bytes: unknown): number | null => (typeof bytes === 'number' ? Math.round((bytes / 1048576) * 10) / 10 : null);

/** Куча Hermes в МБ: js_heapSize (занято под кучу), js_allocatedBytes (живые объекты), счётчик сборок мусора. */
export function readHermesHeap(): Readonly<{ heapMB: number | null; liveMB: number | null; gcs: number | null; note: string }> {
  try {
    const stats = (globalThis as { HermesInternal?: { getInstrumentedStats?: () => Record<string, unknown> } }).HermesInternal?.getInstrumentedStats?.();
    if (!stats) return { heapMB: null, liveMB: null, gcs: null, note: 'нет HermesInternal.getInstrumentedStats' };
    return { heapMB: mb(stats.js_heapSize), liveMB: mb(stats.js_allocatedBytes), gcs: typeof stats.js_numGCs === 'number' ? stats.js_numGCs : null, note: 'ok' };
  } catch (error) {
    return { heapMB: null, liveMB: null, gcs: null, note: `ошибка чтения кучи: ${error instanceof Error ? error.message : String(error)}` };
  }
}

type Info = Readonly<{ themeId: string; appearance: string; intensity: number; swatches: number; smokes: number }>;

export function useThemesMemLog(info: Info): void {
  const startedAt = useRef(Date.now());
  const base = useRef<ReturnType<typeof readHermesHeap> | null>(null);
  const changes = useRef(0);
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || __DEV__ !== true) return;
    const heap = readHermesHeap();
    const first = base.current === null;
    if (first) base.current = heap;
    else changes.current += 1;
    const b = base.current!;
    const delta = (cur: number | null, ref: number | null) => (cur !== null && ref !== null ? Math.round((cur - ref) * 10) / 10 : null);
    console.log('[THEMES-MEM]', first ? 'вход' : 'смена', JSON.stringify({ // guard-ok: dev-трассировка памяти экрана тем
      sec: Math.round((Date.now() - startedAt.current) / 100) / 10,
      changes: changes.current,
      theme: info.themeId, appearance: info.appearance, intensity: info.intensity,
      mounted: { swatchSvg: info.swatches, smokeSvg: info.smokes, rasterImages: 0 },
      cacheTokens: liquidGlassTokenCacheSize(), cachePalettes: v2PaletteCacheSize(), cacheArt: themedArtCacheSize(),
      heapMB: heap.heapMB, liveMB: heap.liveMB, dHeapMB: delta(heap.heapMB, b.heapMB), dLiveMB: delta(heap.liveMB, b.liveMB), gcs: heap.gcs, note: heap.note,
    }));
  }, [info.themeId, info.appearance, info.intensity, info.swatches, info.smokes]);
}
