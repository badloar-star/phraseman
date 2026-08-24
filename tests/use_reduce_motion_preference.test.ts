import { act, cleanup, renderHook } from "@testing-library/react-native";
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
});
