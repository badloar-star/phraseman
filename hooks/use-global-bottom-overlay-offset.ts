import { useMemo } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { tabPillTopOffset } from '../components/v2/tab_bar_geometry';
import { useScreen } from './use-screen';

/** Зазор между низом тоста и верхом таб-бара / зоной жестов */
const OVERLAY_GAP = 8;
/** Минимум от низа экрана, если insets.bottom = 0 (кнопки) */
const MIN_BOTTOM_INSET = 12;

/** Короткие пути табов (синхрон с TAB_PATH_SUFFIXES в app/(tabs)/_layout). */
const SHORT_TAB_PATHS = new Set(['/home', '/lessons', '/friends', '/settings']);

const TAB_PATH_SUFFIXES = ['/home', '/lessons', '/friends', '/settings'] as const;

function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return '';
  const noQuery = pathname.split('?')[0];
  let p = noQuery.replace(/\/$/, '') || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

/**
 * True when the custom bottom tab bar from `app/(tabs)/_layout.tsx` is visible.
 * Stack screens (lessons, flashcards, modals, …) are NOT tab surfaces — overlays sit lower.
 */
export function isMainTabSurfacePath(pathname: string | null | undefined): boolean {
  const p = normalizePathname(pathname);
  if (!p) return false;
  if (p === '/' || p === '/(tabs)') return true;
  if (p.startsWith('/(tabs)/')) return true;
  if (SHORT_TAB_PATHS.has(p)) return true;
  for (const suf of TAB_PATH_SUFFIXES) {
    if (p === suf || p.endsWith(suf)) return true;
  }
  return false;
}

/**
 * Расстояние от низа окна для полноширинного оверлея: safe area, а на табах — верх плавающей капсулы
 * (`tabPillTopOffset`, тот же источник, что в (tabs)/_layout) + зазор. Старая высота таб-бара 56/60 из useScreen
 * была меньше настоящей капсулы (66) — тосты наезжали на неё (владелец 15.10).
 *
 * usePathname() в корне иногда отдаёт неочевидный путь; useSegments()[0] === '(tabs)' надёжно
 * для четырёх основных табов. Без учёта таба тосты наезжали на навигацию.
 */
export function useGlobalBottomOverlayOffset(): number {
  const pathname = usePathname();
  // зачем: useSegments() в expo-router 6 типизирован union'ом ВСЕХ маршрутов
  // проекта — в массиве зависимостей TS падает с TS2590 («union слишком
  // сложный»). Нужен только первый сегмент, поэтому сразу сужаем до string:
  // union исчезает, а сравнение с '(tabs)' работает как раньше.
  const rootSegment: string = useSegments()[0] ?? '';
  const { bottomInset } = useScreen();

  return useMemo(() => {
    const inTabsGroup = rootSegment === '(tabs)';
    const onTabSurface = isMainTabSurfacePath(pathname) || inTabsGroup;
    if (onTabSurface) return tabPillTopOffset(bottomInset) + OVERLAY_GAP;
    return Math.max(bottomInset, MIN_BOTTOM_INSET) + OVERLAY_GAP;
  }, [pathname, rootSegment, bottomInset]);
}
