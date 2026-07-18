export interface AuthPromptAttemptLifecycle {
  mount(): void;
  setVisible(visible: boolean): void;
  startAttempt(): number | null;
  isCurrent(token: number | null): boolean;
  completeAttempt(token: number | null): boolean;
  invalidateActiveAttempt(): void;
  unmount(): void;
}

export function createAuthPromptAttemptLifecycle(
  initialVisible: boolean,
): AuthPromptAttemptLifecycle {
  let mounted = true;
  let visible = initialVisible;
  let sequence = 0;
  let activeToken: number | null = null;

  const isCurrent = (token: number | null): boolean =>
    token !== null && mounted && visible && activeToken === token;

  return {
    mount() {
      mounted = true;
    },
    setVisible(nextVisible) {
      visible = nextVisible;
      if (!nextVisible) activeToken = null;
    },
    startAttempt() {
      if (!mounted || !visible || activeToken !== null) return null;
      activeToken = ++sequence;
      return activeToken;
    },
    isCurrent,
    completeAttempt(token) {
      if (!isCurrent(token)) return false;
      activeToken = null;
      return true;
    },
    invalidateActiveAttempt() {
      activeToken = null;
    },
    unmount() {
      mounted = false;
      activeToken = null;
    },
  };
}
