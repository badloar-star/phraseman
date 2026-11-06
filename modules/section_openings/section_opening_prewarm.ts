// section_opening_prewarm.ts — прогрев героев окон «Открытие раздела» заранее (один раз за запуск), чтобы история стартовала с готовой, уже декодированной картинкой.
//
// зачем (координатор 06.11, 🔴 блокер сборки: по журналу Сверки mount → phase 1 занимал секунды — человек видел пустую историю): шесть героев (~44 КБ, 512×1024) загружаются в память через expo-image
// Image.loadAsync(require(...)) — это работает с упакованными ассетами (prefetch по file:// возвращал false), результат — готовый ImageRef, который окно показывает мгновенно. Без сети и Firestore.
// В dev-режиме (ассеты тянутся с Metro) прогрев пропускается: он только мешал бы замерам и грузил бы Metro. Каждый шаг пишет [SECTION-OPENING] prewarm (id, мс, итог);
// сбой одной картинки не ломает остальные и не мешает показу (окно стартует по потолку ожидания 300 мс).
import { Image, type ImageRef } from 'expo-image';
import { SECTION_OPENING_IDS, type SectionOpeningId } from './section_opening_core';
import { SECTION_OPENING_HERO } from './section_opening_assets';

const LOG = '[SECTION-OPENING]';
const refs = new Map<SectionOpeningId, ImageRef>();
const inFlight = new Set<SectionOpeningId>();

/** Готовый (декодированный) герой окна или null — тогда окно берёт обычный источник и картинка проявляется по готовности. */
export function getPrewarmedHero(id: SectionOpeningId): ImageRef | null {
  return refs.get(id) ?? null;
}

async function warmHero(id: SectionOpeningId): Promise<void> {
  if (refs.has(id) || inFlight.has(id)) return;
  inFlight.add(id);
  const startedAt = Date.now();
  try {
    const ref = await Image.loadAsync(SECTION_OPENING_HERO[id] as number);
    refs.set(id, ref);
    console.log(LOG, 'prewarm', JSON.stringify({ key: `hero:${id}`, ms: Date.now() - startedAt, ok: true, width: ref.width, height: ref.height })); // guard-ok: итог прогрева одного героя
  } catch (error: unknown) {
    console.warn(LOG, 'prewarm_failed', JSON.stringify({ key: `hero:${id}`, ms: Date.now() - startedAt, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch называет причину
  } finally {
    inFlight.delete(id);
  }
}

/** Прогреть героев — вызывать в простое после первого экрана. Повторный вызов ничего не делает; в dev-режиме пропускается. */
export async function prewarmSectionOpeningAssets(ids: readonly SectionOpeningId[] = SECTION_OPENING_IDS): Promise<void> {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(LOG, 'prewarm_skipped', JSON.stringify({ reason: 'dev_metro_assets' })); // guard-ok: ранний выход называет причину
    return;
  }
  const startedAt = Date.now();
  for (const id of ids) await warmHero(id);
  console.log(LOG, 'prewarm_done', JSON.stringify({ ms: Date.now() - startedAt, ready: refs.size })); // guard-ok: весь прогрев
}
