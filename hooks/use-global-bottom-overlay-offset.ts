import { useMemo } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { useScreen } from './use-screen';

/** Зазор между низом тоста и верхом таб-бара / зоной жестов */
const OVERLAY_GAP = 8;
/** Минимум от низа экрана, если insets.bottom = 0 (кнопки) */
const MIN_BOTTOM_INSET = 12;

/** Короткие пути табов (синхрон с TAB_PATH_SUFFIXES в app/(tabs)/_layout). */
const SHORT_TAB_PATHS = new Set(['/home', '/index', '/arena', '/settings']);

const TAB_PATH_SUFFIXES = ['/home', '/index', '/arena', '/settings'] as const;

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
 * Расстояние от низа окна для полноширинного оверлея: safe area + (на табах) высота кастомного
 * таб-бара, как в `paddingBottom: tabBarHeight + PB` в (tabs)/_layout.
 *
 * usePathname() в корне иногда отдаёт неочевидный путь; useSegments()[0] === '(tabs)' надёжно
 * для пяти основных табов. Без учёта таба тосты наезжали на навигацию.
 */
export function useGlobalBottomOverlayOffset(): number {
  const pathname = usePathname();
  const segments = useSegments();
  const { tabBarHeight, bottomInset } = useScreen();

  return useMemo(() => {
    const nav = Math.max(bottomInset, MIN_BOTTOM_INSET);
    const inTabsGroup = segments[0] === '(tabs)';
    const onTabSurface = isMainTabSurfacePath(pathname) || inTabsGroup;
    const tab = onTabSurface ? tabBarHeight : 0;
    return nav + tab + OVERLAY_GAP;
  }, [pathname, segments, tabBarHeight, bottomInset]);
}
