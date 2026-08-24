/**
 * Событийный прогрев дискового кэша слоёв аур аватара.
 *
 * зачем: слои колец больше не бандлятся (−2.4 МБ), они лежат в Firebase
 * Storage. Чтобы пользователь НИКОГДА не увидел незагруженное кольцо, слои
 * скачиваются ЗАРАНЕЕ и по событиям — не по таймеру:
 *   · вход в профиль и в студию аватара — там ауры показываются и примеряются;
 *   · повышение уровня — за уровни выдают новые ауры.
 * К моменту, когда ауру можно надеть, её слои уже на диске.
 *
 * Экономия трафика и стоимости Storage:
 *  · каждый слой качается ОДИН раз на устройство (диск-кэш expo-image), затем
 *    сеть не участвует вовсе;
 *  · объекты отдаются с `Cache-Control: immutable, max-age=1 год`;
 *  · в рамках сессии помним уже запрошенные URL и не дёргаем их повторно;
 *  · грузим малыми пачками, чтобы не конкурировать с тем, что юзер видит;
 *  · при неудаче URL забывается — прогрев повторится на следующем событии, а
 *    до тех пор кольцо показывает тихий ореол вместо пустоты.
 */
import { Image } from 'expo-image';
import { APPROVED_AVATAR_AURAS } from '../constants/avatar_auras';
import { avatarAuraLayerUrls } from './avatar_aura_remote_art';

// Малые пачки: сеть не забивается, видимый контент не тормозит.
const BATCH_SIZE = 6;
const BATCH_PAUSE_MS = 250;

/** URL, уже прогретые (или прогреваемые) в этой сессии. */
const warmed = new Set<string>();
let running = false;
const queue: string[] = [];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function drain(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const batch = queue.splice(0, BATCH_SIZE);
      const results = await Promise.allSettled(
        // cachePolicy 'disk' — слой нужен на будущее, память под него не занимаем.
        batch.map((url) => Image.prefetch(url, { cachePolicy: 'disk' })),
      );
      results.forEach((result, index) => {
        // Не смогли — забываем URL, чтобы следующее событие попробовало снова.
        if (result.status === 'rejected') warmed.delete(batch[index]);
      });
      if (queue.length > 0) await sleep(BATCH_PAUSE_MS);
    }
  } catch {
    // Прогрев — «best effort»: любая ошибка просто откладывает его до
    // следующего события, показ при этом никогда не остаётся пустым.
  } finally {
    running = false;
  }
}

function enqueue(urls: readonly string[]): void {
  let added = false;
  for (const url of urls) {
    if (warmed.has(url)) continue;
    warmed.add(url);
    queue.push(url);
    added = true;
  }
  if (added) void drain();
}

/**
 * Прогреть слои конкретных аур — например, тех, что видны на экране прямо
 * сейчас, или той, что пользователь вот-вот наденет.
 */
export function prefetchAvatarAuraArt(auraIds: readonly (string | null | undefined)[]): void {
  if (__DEV__) return;
  const urls: string[] = [];
  for (const auraId of auraIds) {
    if (auraId) urls.push(...avatarAuraLayerUrls(auraId));
  }
  enqueue(urls);
}

/**
 * Прогреть весь каталог аур. Вызывается на входе в профиль и в студию аватара
 * и при повышении уровня — там пользователь и видит, и примеряет кольца.
 */
export function prefetchAllAvatarAuraArt(): void {
  if (__DEV__) return;
  const urls: string[] = [];
  for (const aura of APPROVED_AVATAR_AURAS) urls.push(...avatarAuraLayerUrls(aura.id));
  enqueue(urls);
}
