// skeleton_geom_log.ts — журнал [SKELETON-GEOM]: высота скелетона против высоты готового блока на одном экране.
//
// зачем (координатор 18.10, правило «первый кадр = геометрия готового экрана»): расчёт по коду не доказывает, что при подмене ничего не прыгает —
// нужен замер на устройстве. Экран зовёт noteSkeletonGeom(screen, 'skeleton', h) из onLayout первой строки скелетона и (screen, 'ready', h) из onLayout
// первой готовой строки; когда пришли оба, печатается пара и разница в dp, затем состояние сбрасывается (следующий показ меряется заново).
// Показ начинается со скелетона: он открывает (или перезапускает) запись; «готово» без скелетона игнорируется (сравнивать не с чем) — устаревшее значение пару не портит.
// Повторные onLayout готового блока глушатся: после пары запись сбрасывается. Только числа и имя экрана — персональных данных нет.
export type SkeletonGeomKind = 'skeleton' | 'ready';

/** Разница выше порога считается прыжком (правило координатора: > 8 dp — дефект). */
export const SKELETON_GEOM_JUMP_DP = 8;

type Pair = { skeleton?: number };
const pending = new Map<string, Pair>();

export function noteSkeletonGeom(screen: string, kind: SkeletonGeomKind, heightDp: number): void {
  if (!Number.isFinite(heightDp) || heightDp <= 0) {
    console.warn('[SKELETON-GEOM]', screen, 'skip: bad height', JSON.stringify({ kind, heightDp })); // guard-ok: ранний выход называет причину
    return;
  }
  const rounded = Math.round(heightDp * 10) / 10;
  if (kind === 'skeleton') {
    pending.set(screen, { skeleton: rounded }); // новый показ скелетона
    return;
  }
  const entry = pending.get(screen);
  if (!entry || entry.skeleton === undefined) return; // скелетона не было — готовый экран появился сразу, сравнивать не с чем
  const delta = Math.round((rounded - entry.skeleton) * 10) / 10;
  const verdict = Math.abs(delta) > SKELETON_GEOM_JUMP_DP ? 'JUMP' : 'ok';
  console.log('[SKELETON-GEOM]', screen, JSON.stringify({ skeleton: entry.skeleton, ready: rounded, delta, verdict })); // guard-ok: итог пары
  pending.delete(screen);
}

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __SkeletonGeomLogRouteShim() {
  return null;
}
