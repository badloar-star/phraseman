/**
 * useScreen — Responsive layout utilities for all device sizes.
 *
 * Breakpoints:
 *   phone        < 600dp  — iPhone, small Android
 *   smallTablet  600–839dp — iPad mini, Nexus 7, Samsung Tab A
 *   largeTablet  ≥ 840dp  — iPad Air/Pro, Samsung Tab S
 *
 * Safe-area bottom:
 *   iOS home indicator        ~34dp
 *   Android gesture nav       ~16–28dp
 *   Android 3-button soft nav ~48dp
 *   Android hardware buttons  0dp
 *
 * Some Android/OEM edge-to-edge builds still report 0 while a visible
 * 3-button navigation bar is present, so normalizeSafeAreaBottomInset()
 * protects interactive UI from that system area.
 */

import { Dimensions, useWindowDimensions, Platform } from 'react-native';
import {
  BP_LARGE_TABLET,
  BP_TABLET,
  computeUiScale,
} from '../constants/layout-scale';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';

export { BP_LARGE_TABLET, BP_TABLET } from '../constants/layout-scale';

export const ANDROID_NAV_BAR_FALLBACK_INSET = 48;

export function normalizeSafeAreaBottomInset(rawBottomInset: number, os: string = Platform.OS): number {
  // Android 3-button navigation is 48dp, but some OEM/edge-to-edge builds report 0.
  if (os === 'android' && rawBottomInset === 0) return ANDROID_NAV_BAR_FALLBACK_INSET;
  return rawBottomInset;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();

  /** Вузька сторона — однакова логіка портрет/альбом; не плутаємо телефон у landscape з планшетом */
  const narrow = Math.min(width, height);
  const isTablet      = narrow >= BP_TABLET;
  const isLargeTablet = narrow >= BP_LARGE_TABLET;
  const uiScale       = computeUiScale(width, height);

  // ── Content constraints ───────────────────────────────────────────────────
  // The max-width of a scrollable content column.
  // On large tablets, we allow more — gives a proper iPad/desktop feel.
  const contentMaxW: number =
    isLargeTablet ? 880 :
    isTablet       ? 720 :
                     640;

  // ── Horizontal padding ────────────────────────────────────────────────────
  const hPad: number = Math.max(
    12,
    Math.round((isLargeTablet ? 24 : isTablet ? 20 : 16) * uiScale),
  );

  // ── Tab bar height ────────────────────────────────────────────────────────
  // Slightly taller on larger screens for better touch targets.
  const tabBarHeight: number = Math.max(
    52,
    Math.round(
      (isLargeTablet ? 70 : isTablet ? 64 : Platform.OS === 'ios' ? 60 : 56) * uiScale,
    ),
  );

  // ── Bottom inset (navigation bar / home indicator) ────────────────────────
  // Native safe-area bottom reporting handles most devices:
  //   iOS:     home indicator (~34dp on notched phones)
  //   Android: gesture nav pill OR 3-button soft nav bar on many devices
  // Some Android/OEM edge-to-edge builds return 0 even when the soft nav
  // buttons are visible, so interactive UI receives a fallback inset.
  const bottomInset = insets.bottom;
  const safeBottom = normalizeSafeAreaBottomInset(bottomInset);
  // ── Card column count for grids ───────────────────────────────────────────
  const gridCols: number =
    isLargeTablet ? 3 :
    isTablet       ? 2 :
                     2;

  // ── Spacing scale ─────────────────────────────────────────────────────────
  // Used for gap, margin, padding multipliers where needed.
  const spacingScale: number =
    (isLargeTablet ? 1.25 : isTablet ? 1.10 : 1.0) * uiScale;

  // ── Device-level font scale ───────────────────────────────────────────────
  // This is the BASE multiplier for all UI text on large-screen devices.
  // It stacks with the user\'s chosen font size in ThemeContext.
  const deviceFontScale: number =
    (isLargeTablet ? 1.20 : isTablet ? 1.10 : 1.0) * uiScale;

  return {
    width,
    height,
    narrow,
    uiScale,
    isTablet,
    isLargeTablet,
    contentMaxW,
    hPad,
    tabBarHeight,
    bottomInset: safeBottom,
    rawBottomInset: bottomInset,
    gridCols,
    spacingScale,
    deviceFontScale,
    insets,
  } as const;
}

/** Static check at module load time (does not update on orientation change) */
export function isTabletDevice(): boolean {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) >= BP_TABLET;
}
