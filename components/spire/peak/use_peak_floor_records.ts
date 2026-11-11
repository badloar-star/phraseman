import { useEffect, useState } from 'react';
import { SPIRE_FLOOR_RECORD_ENABLED } from '../../../app/spire/spire_floor_record_flag';
import { spireOpenLiveGate } from '../../../app/spire/spire_live_gate';
import { spireCall } from '../../../app/spire/spire_net';
import type { SpireConfigDoc } from '../../../modules/spire/config_contract';
import type { SpireRoomSnapshot } from '../../../modules/spire/room_rows';
import type { FloorRecordSnapshot } from '../../../shared/spire_floor_records';

export type PeakRecordSource = Readonly<{
  uid: string | null;
  stableId: string | null;
  room: SpireRoomSnapshot | null;
  config: SpireConfigDoc;
}>;

const CACHE_MS = 30 * 60_000;
type Entry = Readonly<{ key: string; at: number; records: FloorRecordSnapshot['records'] | null }>;

export function usePeakFloorRecords(source: PeakRecordSource | undefined, open: boolean) {
  const { uid, stableId, room, config } = source ?? {};
  const groupId = room?.groupId;
  const weekId = room?.weekId;
  const lang = room?.lang;
  const key = config?.floorRecordsEnabled === true && stableId && uid && room?.uid === uid && groupId && weekId && lang
    ? JSON.stringify([uid, stableId, lang, weekId, groupId])
    : null;
  const [entry, setEntry] = useState<Entry | null>(null);
  const current = entry?.key === key ? entry : null;
  const fresh = current !== null && current.records !== null && Date.now() - current.at < CACHE_MS;
  // зачем: причина пропуска — строка из примитивов, чтобы эффект зависел от неё, а не от объектов источника
  const skipWhy = key ? null : JSON.stringify({
    hasSource: source !== undefined, flag: config?.floorRecordsEnabled ?? null, hasUid: !!uid, hasStableId: !!stableId,
    roomUidMatches: room ? room.uid === uid : null, hasRoom: !!room, groupId: !!groupId, weekId: weekId ?? null, lang: lang ?? null,
  });

  useEffect(() => {
    if (!open) return;
    if (!SPIRE_FLOOR_RECORD_ENABLED) {
      console.warn('[SPIRE-RECORD] peak_off', 'SPIRE_FLOOR_RECORD_ENABLED=false — рекорд этажа выключен до выкладки сервера, в сеть не ходим');
      return;
    }
    // зачем (владелец 11.11: «Временно недоступен» на листе этажа, а вызова рекордов в логе нет): каждый ранний выход говорит причину
    if (!key || !stableId || !groupId || !weekId || !lang || !config) {
      console.warn('[SPIRE-RECORD] peak_skip', skipWhy);
      return;
    }
    if (fresh) return;
    const gate = spireOpenLiveGate(config, 'peak_floor_records');
    if (!gate) {
      console.warn('[SPIRE-RECORD] peak_gate_closed', JSON.stringify({ enabled: config.enabled }));
      setEntry({ key, at: Date.now(), records: null });
      return;
    }
    let cancelled = false;
    const request = { action: 'read', stableId, groupId, weekId, lang } as const;
    void spireCall<typeof request, FloorRecordSnapshot>(gate, 'spireFloorRecords', request)
      .then(({ records }) => {
        console.warn('[SPIRE-RECORD] peak_read_ok', JSON.stringify({ cancelled, steps: records ? Object.keys(records).length : null }));
        if (!cancelled) setEntry({ key, at: Date.now(), records });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('[SPIRE-RECORD] peak_read_failed', String(error));
        setEntry({ key, at: Date.now(), records: null });
      });
    return () => { cancelled = true; };
  }, [open, fresh, key, stableId, groupId, weekId, lang, config, skipWhy]);

  return {
    records: current?.records ?? null,
    // зачем (владелец 11.11: на листе этажа «Временно недоступен»): пока флаг выключен, сервер на любое чтение отвечает record_disabled
    // (FLOOR_RECORD_AUTHORITY_READY=false) — это не сбой, а невыпущенная функция; лист прячет карточку рекорда, как и прежний вид Пика
    status: !SPIRE_FLOOR_RECORD_ENABLED ? 'off' as const : !key || (current && !current.records) ? 'unavailable' as const : !current ? 'loading' as const : 'ready' as const,
  };
}
