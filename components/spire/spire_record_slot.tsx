// ═══════════════════════════════════════════════════════════════════════════
// spire_record_slot.tsx — слот «Рекорд этажа» для пьедестала Пика: флаг + карточка в одной функции.
//
// зачем (координатор 29.10: tests/spire_scene_contract держит экран Пика ≤ 400 строк; вход в рекорд за флагом SPIRE_FLOOR_RECORD_ENABLED, выключен до выкладки сервера):
// SpireHomeScreen зовёт одну функцию и не знает ни про флаг, ни про SpireFloorRecord. Пока флаг выключен или экран в превью — слота нет (undefined), карточка не создаётся и в сеть не ходит.
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';

import { SPIRE_FLOOR_RECORD_ENABLED } from '../../app/spire/spire_floor_record_flag';
import type { Lang } from '../../constants/i18n';
import type { SpireConfigDoc } from '../../modules/spire/config_contract';
import type { SpireRoomSnapshot } from '../../modules/spire/room_rows';
import SpireFloorRecord from './SpireFloorRecord';

type SlotArgs = Readonly<{
  preview: boolean;
  lang: Lang;
  floor: number;
  stableId: string | null;
  room: SpireRoomSnapshot | null;
  config: SpireConfigDoc | null;
  active: boolean;
}>;

/** Функция-слот для SpireScene.recordSlot; undefined — рекорда нет (превью или флаг выключен). */
export function spireRecordSlot(a: SlotArgs): ((compact: boolean) => React.ReactNode) | undefined {
  if (a.preview || !SPIRE_FLOOR_RECORD_ENABLED) return undefined;
  if (a.config?.floorRecordsEnabled !== true) return undefined;
  // зачем (линт react/display-name): у функции-слота есть имя
  return function renderRecordSlot(compact: boolean): React.ReactNode {
    return <SpireFloorRecord key={`${a.stableId}:${a.room?.groupId}`} compact={compact} lang={a.lang} floor={a.floor} stableId={a.stableId} room={a.room} config={a.config} active={a.active} />;
  };
}
