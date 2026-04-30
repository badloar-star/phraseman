// Shared mutable flag — set to true while a nested horizontal ScrollView is scrolling.
// TabSlider reads this to skip swipe detection during that time.
export const tabSwipeLock = { blocked: false };

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
