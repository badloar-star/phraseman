// ═══════════════════════════════════════════════════════════════════════════
// useOwnedPack.ts — «этот набор уже в моих»: из ЛОКАЛЬНЫХ id (AsyncStorage + прогретая копия), без Firestore.
//
// зачем (аудит кнопок Карточек #14/#15, координатор 15.10): в строках видео-наборов и на экране ролика стояло `owned={false}` — набор снова предлагался «Добавить», хотя уже добавлен.
// Набор ролика клиент знает как `video:<id>`, а в «моих» лежит документ сообщества `video_<id>` — сопоставление идёт через communityPackIdForVideoPhraseSet. Один общий снимок id на цель обучения
// на все строки (а не чтение хранилища на каждую строку), обновление — по сигналу добавления/«убрать из моих».
// Журнал: [PACK-OWNED].
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { onAppEvent } from '../events';
import { loadCommunityOwnedPackIds } from './communityOwnedStorage';
import { communityPackIdForVideoPhraseSet } from './communityPackActions';
import { notifyOwnedPackIdsChanged, ownedPackIdsVersion, subscribeOwnedPackIdsChanged } from './owned_pack_ids_signal';

// Добавление набора (из любого экрана) тоже меняет состав — сигналим один раз на уровне модуля.
onAppEvent('community_pack_added', () => { notifyOwnedPackIdsChanged(); });

type Snapshot = { version: number; ids: ReadonlySet<string> };
const sharedByTarget = new Map<string, Promise<Snapshot>>();

function sharedOwnedIds(target: string): Promise<Snapshot> {
  const version = ownedPackIdsVersion();
  const hit = sharedByTarget.get(target);
  if (hit) return hit.then((snapshot) => (snapshot.version === version ? snapshot : refresh(target, version)));
  return refresh(target, version);
}

function refresh(target: string, version: number): Promise<Snapshot> {
  const next = loadCommunityOwnedPackIds(target)
    .then((ids) => ({ version, ids: new Set(ids) as ReadonlySet<string> }))
    .catch((error: unknown) => {
      console.warn(`[PACK-OWNED] shared load failed target=${target} reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя чтения
      return { version, ids: new Set<string>() as ReadonlySet<string> };
    });
  sharedByTarget.set(target, next);
  return next;
}

/** id документа сообщества для строки: набор ролика `video:<id>` → `video_<id>`, остальные как есть. */
export function communityIdForRow(packId: string): string {
  return communityPackIdForVideoPhraseSet(packId) ?? packId;
}

export function useOwnedPack(packId: string): boolean {
  const { studyTarget } = useStudyTarget();
  const target = String(studyTarget ?? 'en');
  const communityId = communityIdForRow(packId);
  const [owned, setOwned] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const apply = (): void => {
      void sharedOwnedIds(target).then((snapshot) => {
        if (cancelled) return;
        const next = snapshot.ids.has(communityId);
        setOwned((prev) => (prev === next ? prev : next));
      });
    };
    apply();
    const off = subscribeOwnedPackIdsChanged(apply);
    return () => { cancelled = true; off(); };
  }, [target, communityId]);
  return owned;
}
