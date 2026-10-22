// ═══════════════════════════════════════════════════════════════════════════
// use-after-first-frame.ts — признак «первый кадр уже показан» для декоративных слоёв.
//
// зачем (ускорение первого кадра Главной, план 4 · ТЕМЫ docs/work/home_first_frame_effects_2026-10-22.md п. 5–6; координатор 22.10):
// пятна темы на общем фоне вкладок (SVG трёх полноэкранных радиалов) и герой «Сцены» монтируются со второго кадра — первый кадр не
// ждёт растеризации SVG и декодирования картинки; дальше они проявляются тем же FadeIn, итоговый вид прежний. Один кадр — через общий
// планировщик (requestAnimationFrame, без него — setTimeout 0); выключено — готово сразу, как прежде.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

import { scheduleAnimatedStateUpdate } from '../components/animationScheduling';

export function useAfterFirstFrame(tag: string, enabled = true): boolean {
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled || ready) return undefined;
    const startedAt = Date.now();
    const task = scheduleAnimatedStateUpdate(() => {
      console.log('[HOME-FIRST-FRAME] слой после первого кадра', JSON.stringify({ tag, ms: Date.now() - startedAt })); // guard-ok: одна строка на монтирование слоя
      setReady(true);
    });
    return task.cancel;
  }, [enabled, ready, tag]);
  return ready;
}
