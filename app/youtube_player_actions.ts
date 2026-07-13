export function runNonBlockingYoutubeAction(
  emitAnalytics: () => unknown,
  performAction: () => unknown,
): void {
  try {
    void Promise.resolve(emitAnalytics()).catch(() => undefined);
  } catch { /* analytics never blocks the user action */ }
  try {
    void Promise.resolve(performAction()).catch(() => undefined);
  } catch { /* native linking errors retain existing no-throw behavior */ }
}

export default function __RouteShim() { return null; }
