/**
 * DEV-подмена порога «полного просмотра» видео для ПОКАЗА: `dev_state?videoFullTargetSec=N` (3..600) / `videoFullTargetSec=off`.
 *
 * зачем (координатор 05.11: «кадры награды без минут просмотра»; награда +500 за 70 % видео): награда срабатывает через 70 % длительности — для кадров Сверки/Моментов
 * порог сжимается до N секунд накопленного просмотра (берётся МЕНЬШЕЕ из 70 % и N; перемотка и пауза по-прежнему не копятся, повтор по-прежнему не награждает).
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда null, установка отклоняется. Перезапуск приложения сбрасывает. Лог: [DEV-STATE] videoFullTargetSec.
 */
import { IS_STORE_RELEASE } from './config';

const MIN_SEC = 3;
const MAX_SEC = 600;
let override: number | null = null;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить порог (3..600 с) или снять (null). В стор-сборке — отказ с логом. true — применено. */
export function setDevVideoFullTargetSec(sec: number | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] videoFullTargetSec: отклонено — не dev-сборка', { sec }); // guard-ok: ранний выход логируется
    return false;
  }
  if (sec !== null && (!Number.isFinite(sec) || sec < MIN_SEC || sec > MAX_SEC)) {
    console.warn(`[DEV-STATE] videoFullTargetSec: отклонено — вне ${MIN_SEC}..${MAX_SEC}`, { sec }); // guard-ok: ранний выход логируется
    return false;
  }
  override = sec;
  console.log(sec === null ? '[DEV-STATE] videoFullTargetSec override=off' : `[DEV-STATE] videoFullTargetSec override=${sec} (порог просмотра сжат до ${sec} с)`); // guard-ok: итог
  return true;
}

/** Подменённый порог (секунды просмотра) или null. В стор-сборке всегда null. */
export function getDevVideoFullTargetSec(): number | null {
  return devAvailable() ? override : null;
}

/**
 * DEV-показ окна-истории и начисления БЕЗ реального просмотра (эмулятор без сети не грузит ролики): `dev_state?videoFullDemo=story|grant`.
 * story — только окно «Видео просмотрено: +500» (без монет); grant — настоящая выдача +500 по тому же пути, что и награда (счётчик монет в шапке растёт сразу) + окно.
 * Только `__DEV__ && !IS_STORE_RELEASE`; в стор-сборке отказ. Лог: [DEV-STATE] videoFullDemo.
 */
export async function runDevVideoFullDemo(kind: 'story' | 'grant'): Promise<boolean> {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] videoFullDemo: отклонено — не dev-сборка', { kind }); // guard-ok: ранний выход логируется
    return false;
  }
  const videoId = `dev_demo_${Date.now().toString(36)}`;
  const story = await import('./video_full_story_state');
  if (kind === 'grant') {
    const reward = await import('./video_full_reward');
    const outcome = await reward.grantVideoFullReward(videoId);
    console.log(`[DEV-STATE] videoFullDemo=grant outcome=${outcome} videoId=${videoId}`); // guard-ok: итог
    if (outcome !== 'granted') return false;
  }
  story.queueVideoFullStory(videoId, 500);
  story.markVideoFullStoryReady(videoId, 'dev_demo');
  console.log(`[DEV-STATE] videoFullDemo=${kind} videoId=${videoId}`); // guard-ok: итог
  return true;
}
