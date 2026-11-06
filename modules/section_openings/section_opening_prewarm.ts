// section_opening_prewarm.ts — прогрев героев окон «Открытие раздела» заранее (один раз за запуск), чтобы история стартовала с готовой картинкой.
//
// зачем (координатор 06.11, 🔴 блокер сборки: по журналу Сверки mount → phase 1 занимал 2,5–11 с на слабом телефоне — человек видел пустую историю): картинки (шесть героев по ~44 КБ, 512×1024) и два арта
// раздела подтягиваются в кэш expo-image в простое после первого экрана. Без сети и без Firestore — только локальные ассеты. Каждый шаг пишет [SECTION-OPENING] prewarm (id, мс, итог);
// сбой одной картинки не ломает остальные и не мешает показу (окно всё равно стартует по потолку ожидания).
import { Image as RnImage } from 'react-native';
import { Image } from 'expo-image';
import { Asset } from 'expo-asset';
import { SECTION_OPENING_IDS, type SectionOpeningId } from './section_opening_core';
import { SECTION_OPENING_HERO } from './section_opening_assets';
import { THEMED_ART_GENERATED } from '../../components/theme/themed_art_assets.generated';

const LOG = '[SECTION-OPENING]';
const done = new Set<string>();

async function warmOne(key: string, source: number): Promise<void> {
  if (done.has(key)) return;
  done.add(key);
  const startedAt = Date.now();
  try {
    const resolved = RnImage.resolveAssetSource(source);
    const asset = await Asset.fromModule(source).downloadAsync();
    const uri = asset.localUri ?? asset.uri ?? resolved?.uri ?? '';
    // expo-image принимает адрес (http/file); res-имена Android без схемы пропускаем — их загрузит сам Image при показе из прогретого файла
    const prefetched = /^(https?|file):/i.test(uri) ? await Image.prefetch(uri, 'memory-disk') : false;
    console.log(LOG, 'prewarm', JSON.stringify({ key, ms: Date.now() - startedAt, prefetched, scheme: uri.split(':')[0] || null })); // guard-ok: итог прогрева одной картинки
  } catch (error: unknown) {
    done.delete(key); // зачем: сбой — можно попробовать ещё раз при следующем вызове
    console.warn(LOG, 'prewarm_failed', JSON.stringify({ key, ms: Date.now() - startedAt, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch называет причину
  }
}

/** Прогреть героев (и арты видео/Пика) — вызывать в простое после первого экрана. Повторный вызов ничего не делает. */
export async function prewarmSectionOpeningAssets(ids: readonly SectionOpeningId[] = SECTION_OPENING_IDS): Promise<void> {
  const startedAt = Date.now();
  for (const id of ids) await warmOne(`hero:${id}`, SECTION_OPENING_HERO[id] as number);
  for (const slot of ['intro_videos', 'spire_tile'] as const) {
    const art = THEMED_ART_GENERATED[slot];
    if (art?.dark) await warmOne(`art:${slot}:dark`, art.dark as number);
    if (art?.light) await warmOne(`art:${slot}:light`, art.light as number);
  }
  console.log(LOG, 'prewarm_done', JSON.stringify({ ms: Date.now() - startedAt, keys: done.size })); // guard-ok: весь прогрев
}
