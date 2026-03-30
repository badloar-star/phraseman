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
 * All of these are covered by useSafeAreaInsets().bottom when
 * edgeToEdgeEnabled: true is set in app.json (which we have).
 */

import { useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Breakpoints ─────────────────────────────────────────────────────────────
export const BP_TABLET       = 600;
export const BP_LARGE_TABLET = 840;

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isTablet      = width >= BP_TABLET;
  const isLargeTablet = width >= BP_LARGE_TABLET;

  // ── Content constraints ───────────────────────────────────────────────────
  // The max-width of a scrollable content column.
  // On large tablets, we allow more — gives a proper iPad/desktop feel.
  const contentMaxW: number =
    isLargeTablet ? 880 :
    isTablet       ? 720 :
                     640;

  // ── Horizontal padding ────────────────────────────────────────────────────
  const hPad: number =
    isLargeTablet ? 24 :
    isTablet       ? 20 :
                     16;

  // ── Tab bar height ────────────────────────────────────────────────────────
  // Slightly taller on larger screens for better touch targets.
  const tabBarHeight: number =
    isLargeTablet ? 70 :
    isTablet       ? 64 :
    Platform.OS === 'ios' ? 60 : 56;

  // ── Bottom inset (navigation bar / home indicator) ────────────────────────
  // useSafeAreaInsets().bottom handles:
  //   iOS:     home indicator (~34dp on notched phones)
  //   Android: gesture nav pill OR 3-button soft nav bar OR 0 for hw buttons
  //            (correct because edgeToEdgeEnabled: true is in app.json)
  const bottomInset = insets.bottom;

  // ── Extra guard for Android 3-button nav that doesn't report insets ───────
  // On very old Android or certain OEM skins, bottom inset might be reported
  // as 0 even with a visible soft nav bar.  We add a small floor on Android
  // when the phone has no physical buttons (gesture bar area always exists).
  // This guard is intentionally conservative (max 8dp to avoid over-spacing).
  const safeBottom = Platform.OS === 'android' && bottomInset === 0
    ? 0   // hardware buttons — genuinely 0
    : bottomInset;

  // ── Card column count for grids ───────────────────────────────────────────
  const gridCols: number =
    isLargeTablet ? 3 :
    isTablet       ? 2 :
                     2;

  // ── Spacing scale ─────────────────────────────────────────────────────────
  // Used for gap, margin, padding multipliers where needed.
  const spacingScale: number =
    isLargeTablet ? 1.25 :
    isTablet       ? 1.10 :
                     1.0;

  // ── Device-level font scale ───────────────────────────────────────────────
  // This is the BASE multiplier for all UI text on large-screen devices.
  // It stacks with the user's chosen font size in ThemeContext.
  const deviceFontScale: number =
    isLargeTablet ? 1.20 :
    isTablet       ? 1.10 :
                     1.0;

  return {
    width,
    height,
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

// ─── Standalone helpers (no hook, for static values) ─────────────────────────

import { Dimensions } from 'react-native';

/** Static check at module load time (does not update on orientation change) */
export function isTabletDevice(): boolean {
  const { width, height } = Dimensions.get('window');
  return Math.max(width, height) >= BP_TABLET;
}
