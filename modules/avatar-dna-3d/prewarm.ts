type Avatar3DPrewarmDependencies = Readonly<{
  loadLocalAssets: () => Promise<void>;
  warmScene: () => Promise<void>;
  fetch?: unknown;
}>;

export type Avatar3DPrewarm = Readonly<{
  ready: () => Promise<void>;
  isReady: () => boolean;
  getError: () => Error | null;
}>;

export const createAvatar3DPrewarm = (dependencies: Avatar3DPrewarmDependencies): Avatar3DPrewarm => {
  if (Object.prototype.hasOwnProperty.call(dependencies, 'fetch')) {
    throw new TypeError('avatar_3d_network_forbidden');
  }

  let complete = false;
  let error: Error | null = null;
  let pending: Promise<void> | null = null;

  const ready = (): Promise<void> => {
    if (complete) return Promise.resolve();
    if (pending) return pending;

    pending = (async () => {
      try {
        await dependencies.loadLocalAssets();
        await dependencies.warmScene();
        complete = true;
      } catch (cause) {
        error = cause instanceof Error ? cause : new Error('avatar_3d_prewarm_failed');
        throw error;
      }
    })();

    return pending;
  };

  return Object.freeze({
    ready,
    isReady: () => complete,
    getError: () => error,
  });
};

