export function createRouteRefreshCoordinator({
  now = () => Date.now(),
  isVisible = () => true,
  schedule = (task) => setTimeout(task, 0),
} = {}) {
  let context = '';
  let generation = 0;
  let queuedPrefetch = null;
  const cache = new Map();
  const inFlight = new Map();

  function cacheKey(key, requestContext = context) {
    return `${requestContext}\u0000${key}`;
  }

  function setContext(nextContext) {
    if (nextContext === context) return generation;
    context = nextContext;
    generation += 1;
    return generation;
  }

  function peek(key) {
    const entry = cache.get(cacheKey(key));
    if (!entry || entry.expiresAt <= now()) return undefined;
    return entry.value;
  }

  function refresh({ key, ttlMs, load, force = false, skipIfHidden = false }) {
    if (skipIfHidden && !isVisible()) return Promise.resolve({ status: 'skipped-hidden' });
    const requestContext = context;
    const requestGeneration = generation;
    const requestKey = cacheKey(key, requestContext);
    const cached = cache.get(requestKey);
    if (!force && cached && cached.expiresAt > now()) {
      return Promise.resolve({ status: 'cached', value: cached.value });
    }
    if (inFlight.has(requestKey)) return inFlight.get(requestKey);

    let loaded;
    try {
      loaded = load();
    } catch (error) {
      loaded = Promise.reject(error);
    }
    const request = Promise.resolve(loaded)
      .then((value) => {
        if (requestGeneration !== generation || requestContext !== context) return { status: 'discarded' };
        cache.set(requestKey, { value, expiresAt: now() + ttlMs });
        return { status: 'loaded', value };
      })
      .finally(() => {
        if (inFlight.get(requestKey) === request) inFlight.delete(requestKey);
      });
    inFlight.set(requestKey, request);
    return request;
  }

  function queuePrefetch(request) {
    if (queuedPrefetch) return queuedPrefetch.promise;
    const queuedGeneration = generation;
    const queuedContext = context;
    let resolve;
    const promise = new Promise((resolvePromise) => { resolve = resolvePromise; });
    queuedPrefetch = { promise, resolve };
    schedule(() => {
      const queued = queuedPrefetch;
      queuedPrefetch = null;
      if (!isVisible()) {
        queued.resolve({ status: 'skipped-hidden' });
        return;
      }
      if (queuedGeneration !== generation || queuedContext !== context) {
        queued.resolve({ status: 'discarded' });
        return;
      }
      refresh(request).then(queued.resolve, (error) => queued.resolve({ status: 'error', error }));
    });
    return promise;
  }

  return { peek, queuePrefetch, refresh, setContext };
}
