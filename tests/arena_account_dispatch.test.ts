import { arenaReserveAccountDispatch } from '../modules/arena/account_dispatch';

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function serialLock() {
  let tail = Promise.resolve();
  return async <T>(work: () => Promise<T>): Promise<T> => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((done) => { release = done; });
    await previous;
    try { return await work(); } finally { release(); }
  };
}

describe('Arena callable account dispatch reservation', () => {
  it('holds an account transition until preflight has created the A network promise', async () => {
    const lock = serialLock();
    const preflight = deferred<() => Promise<string>>();
    let currentOwner = 'A';
    const dispatchObservations: Array<Readonly<{ owner: string; transitionFinished: boolean }>> = [];

    const reserved = arenaReserveAccountDispatch({
      isOwnerCurrent: () => currentOwner === 'A',
      withTransitionLock: lock,
      prepareDispatch: () => preflight.promise,
    });
    await new Promise<void>((resolve) => setImmediate(resolve));

    let transitionFinished = false;
    const transition = lock(async () => {
      currentOwner = 'B';
      transitionFinished = true;
    });
    preflight.resolve(() => {
      dispatchObservations.push({ owner: currentOwner, transitionFinished });
      return Promise.resolve('ok');
    });

    const box = await reserved;
    expect(box).not.toBeNull();
    expect(dispatchObservations).toEqual([{ owner: 'A', transitionFinished: false }]);
    await expect(box!.networkPromise).resolves.toBe('ok');
    await transition;
    expect(currentOwner).toBe('B');
  });

  it('aborts after paused preflight if identity invalidates outside the lock before credential use', async () => {
    const lock = serialLock();
    const preflight = deferred<() => Promise<string>>();
    let current = true;
    const dispatch = jest.fn(async () => 'wrong-owner');

    const reserved = arenaReserveAccountDispatch({
      isOwnerCurrent: () => current,
      withTransitionLock: lock,
      prepareDispatch: () => preflight.promise,
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    current = false;
    preflight.resolve(dispatch);

    await expect(reserved).resolves.toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
