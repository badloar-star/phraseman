/**
 * A cold active tab paints its opaque shell first. Heavy synchronous module
 * evaluation is allowed only after the tab has been explicitly marked mounted.
 */
export function shouldLoadTabScreen(
  _activeTabIndex: number,
  tabIndex: number,
  mountedTabs: ReadonlySet<number>,
): boolean {
  return mountedTabs.has(tabIndex);
}
