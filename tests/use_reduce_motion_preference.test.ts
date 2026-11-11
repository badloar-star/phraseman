import React from "react";
import { act, cleanup, render, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import {
  useReduceMotion,
  useReduceMotionPreference,
} from "../hooks/use_reduce_motion";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return {
    ...actual,
    AccessibilityInfo: {
      ...actual.AccessibilityInfo,
      isReduceMotionEnabled: jest.fn(),
      addEventListener: jest.fn(),
    },
  };
});

const mockIsReduceMotionEnabled =
  AccessibilityInfo.isReduceMotionEnabled as jest.Mock;
const mockAddEventListener = AccessibilityInfo.addEventListener as jest.Mock;

function PreferenceBank({ count = 6, onValue }: { count?: number; onValue?: (value: boolean | null) => void }) {
  return React.createElement(
    React.Fragment,
    null,
    Array.from({ length: count }, (_, index) => React.createElement(PreferenceConsumer, { key: index, onValue })),
  );
}

function PreferenceConsumer({ onValue }: { onValue?: (value: boolean | null) => void }) {
  const value = useReduceMotionPreference();
  onValue?.(value);
  return null;
}

async function flushDeferredTeardown() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

describe("reduced-motion preference lifecycle", () => {
  let resolveInitial!: (enabled: boolean) => void;
  let listener: ((enabled: boolean) => void) | null;
  const remove = jest.fn();

  beforeEach(() => {
    listener = null;
    remove.mockClear();
    mockIsReduceMotionEnabled.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveInitial = resolve;
      }),
    );
    mockAddEventListener.mockImplementation(
      (_event: string, nextListener: (enabled: boolean) => void) => {
        listener = nextListener;
        return { remove };
      },
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await cleanup();
    await flushDeferredTeardown();
  });

  test("exposes unresolved state before enabling motion-sensitive UI", async () => {
    const hook = await renderHook(() => useReduceMotionPreference());

    expect(hook.result.current).toBeNull();
    await act(async () => {
      resolveInitial(true);
      await Promise.resolve();
    });
    expect(hook.result.current).toBe(true);

    await act(() => listener?.(false));
    expect(hook.result.current).toBe(false);
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "reduceMotionChanged",
      expect.any(Function),
    );
  });

  test("preserves the legacy boolean hook while the preference is unresolved", async () => {
    const hook = await renderHook(() => useReduceMotion());

    expect(hook.result.current).toBe(false);
  });

  test("shares one native read and listener across six consumers, keeps a live event ahead of an older read, and cleans up each active cohort", async () => {
    const bank = await render(React.createElement(PreferenceBank));

    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);

    await act(() => listener?.(true));
    await act(async () => {
      resolveInitial(false);
      await Promise.resolve();
    });

    await bank.unmount();
    await flushDeferredTeardown();
    expect(remove).toHaveBeenCalledTimes(1);

    const remountSeen: Array<boolean | null> = [];
    const remountedBank = await render(React.createElement(PreferenceBank, { onValue: (value: boolean | null) => remountSeen.push(value) }));
    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    expect(remountSeen).toContain(null);
    await remountedBank.unmount();
    await flushDeferredTeardown();
    expect(remove).toHaveBeenCalledTimes(2);
  });

  test("reuses one observer and keeps the resolved preference through a same-commit keyed bank remount", async () => {
    const seen: Array<boolean | null> = [];
    const bank = await render(React.createElement(PreferenceBank, { key: "first", onValue: (value: boolean | null) => seen.push(value) }));
    await act(async () => {
      resolveInitial(true);
      await Promise.resolve();
    });
    const replacementStart = seen.length;
    await bank.rerender(React.createElement(PreferenceBank, { key: "second", onValue: (value: boolean | null) => seen.push(value) }));

    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(seen.slice(replacementStart)).not.toHaveLength(0);
    expect(seen.slice(replacementStart).every((value) => value === true)).toBe(true);

    await bank.unmount();
    await flushDeferredTeardown();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test("has no native work during render and leaves one active subscription after StrictMode effect replay", async () => {
    expect(mockIsReduceMotionEnabled).not.toHaveBeenCalled();
    expect(mockAddEventListener).not.toHaveBeenCalled();

    const bank = await render(
      React.createElement(React.StrictMode, null, React.createElement(PreferenceBank)),
    );

    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    await bank.unmount();
    await flushDeferredTeardown();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test("continues to accept a live preference event after the initial native read rejects", async () => {
    mockIsReduceMotionEnabled.mockReturnValueOnce(Promise.reject(new Error("unavailable")));
    const hook = await renderHook(() => useReduceMotionPreference());

    await act(async () => {
      await Promise.resolve();
    });
    await act(() => listener?.(true));

    expect(hook.result.current).toBe(true);
  });

  test("ignores a disposed cohort's late initial read after a zero-consumer remount", async () => {
    const resolves: Array<(enabled: boolean) => void> = [];
    mockIsReduceMotionEnabled.mockImplementation(() => new Promise<boolean>((resolve) => resolves.push(resolve)));

    const first = await renderHook(() => useReduceMotionPreference());
    await first.unmount();
    await flushDeferredTeardown();
    const second = await renderHook(() => useReduceMotionPreference());

    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    expect(second.result.current).toBeNull();

    await act(() => listener?.(true));
    await act(async () => {
      resolves[0](false);
      resolves[1](true);
      await Promise.resolve();
    });

    expect(second.result.current).toBe(true);
  });

  test("keeps one native observation while part of a consumer bank unmounts", async () => {
    const bank = await render(React.createElement(PreferenceBank));
    await bank.rerender(React.createElement(PreferenceBank, { count: 5 }));

    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    await bank.unmount();
    await flushDeferredTeardown();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test("does not rerender a consumer for a duplicate same-value native event", async () => {
    let renders = 0;
    function CountedConsumer() {
      useReduceMotionPreference();
      renders += 1;
      return null;
    }
    const view = await render(React.createElement(CountedConsumer));
    await act(() => listener?.(true));
    const afterFirstEvent = renders;
    await act(() => listener?.(true));

    expect(renders).toBe(afterFirstEvent);
    await view.unmount();
    await flushDeferredTeardown();
  });

  test("keeps a false live event when an older initial read resolves true", async () => {
    const hook = await renderHook(() => useReduceMotionPreference());
    await act(() => listener?.(false));
    await act(async () => {
      resolveInitial(true);
      await Promise.resolve();
    });

    expect(hook.result.current).toBe(false);
  });

  test("ignores a disposed cohort's late read rejection after a newer cohort is active", async () => {
    let rejectInitial!: (reason: Error) => void;
    let resolveSecond!: (enabled: boolean) => void;
    mockIsReduceMotionEnabled.mockImplementationOnce(
      () => new Promise<boolean>((_resolve, reject) => { rejectInitial = reject; }),
    ).mockImplementationOnce(
      () => new Promise<boolean>((resolve) => { resolveSecond = resolve; }),
    );
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = await renderHook(() => useReduceMotionPreference());
    await first.unmount();
    await flushDeferredTeardown();
    const second = await renderHook(() => useReduceMotionPreference());
    expect(second.result.current).toBeNull();
    await act(() => listener?.(true));
    await act(async () => {
      rejectInitial(new Error("disposed"));
      resolveSecond(false);
      await Promise.resolve();
    });

    expect(warn).not.toHaveBeenCalled();
    expect(second.result.current).toBe(true);
    await second.unmount();
    warn.mockRestore();
  });

  test("recovers from a synchronous initial-query throw without retaining a consumer", async () => {
    mockIsReduceMotionEnabled.mockImplementationOnce(() => { throw new Error("query throw"); });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const first = await renderHook(() => useReduceMotionPreference());
    expect(first.result.current).toBeNull();
    await first.unmount();
    await flushDeferredTeardown();
    const second = await renderHook(() => useReduceMotionPreference());

    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    await second.unmount();
    warn.mockRestore();
  });

  test("rolls back a synchronous listener-registration throw so a later cohort can subscribe", async () => {
    mockAddEventListener.mockImplementationOnce(() => { throw new Error("listener throw"); });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    const first = await renderHook(() => useReduceMotionPreference());
    await first.unmount();
    await flushDeferredTeardown();
    const second = await renderHook(() => useReduceMotionPreference());

    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    await second.unmount();
    warn.mockRestore();
  });

  test("survives a synchronous native remove throw and starts a fresh later cohort", async () => {
    remove.mockImplementationOnce(() => { throw new Error("remove throw"); });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = await renderHook(() => useReduceMotionPreference());

    await first.unmount();
    await flushDeferredTeardown();
    const second = await renderHook(() => useReduceMotionPreference());

    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    await second.unmount();
    warn.mockRestore();
  });

  test("recovers a still-mounted consumer after a synchronous initial-query throw", async () => {
    let resolveHealthyRead!: (enabled: boolean) => void;
    mockIsReduceMotionEnabled.mockImplementationOnce(() => { throw new Error("query throw"); })
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { resolveHealthyRead = resolve; }));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = await renderHook(() => useReduceMotionPreference());
    const second = await renderHook(() => useReduceMotionPreference());

    await act(() => listener?.(true));
    await act(async () => {
      resolveHealthyRead(false);
      await Promise.resolve();
    });

    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    await first.unmount();
    expect(remove).not.toHaveBeenCalled();
    await second.unmount();
    await flushDeferredTeardown();
    expect(remove).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  test("recovers a still-mounted consumer after a synchronous listener-registration throw", async () => {
    let resolveHealthyRead!: (enabled: boolean) => void;
    mockIsReduceMotionEnabled.mockImplementationOnce(() => new Promise<boolean>(() => undefined))
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { resolveHealthyRead = resolve; }));
    mockAddEventListener.mockImplementationOnce(() => { throw new Error("listener throw"); });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = await renderHook(() => useReduceMotionPreference());
    const second = await renderHook(() => useReduceMotionPreference());

    await act(() => listener?.(true));
    await act(async () => {
      resolveHealthyRead(false);
      await Promise.resolve();
    });

    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
    expect(mockIsReduceMotionEnabled).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    await first.unmount();
    expect(remove).not.toHaveBeenCalled();
    await second.unmount();
    await flushDeferredTeardown();
    expect(remove).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
