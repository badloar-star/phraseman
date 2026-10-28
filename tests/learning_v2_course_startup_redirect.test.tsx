import React from "react";
import { act, cleanup, render } from "@testing-library/react-native";

import LearningV2CourseScreen from "../app/learning-v2/course";

const replace = jest.fn();
const dismissToTabRoute = jest.fn();
const logLearningV2Hidden = jest.fn();
const cancelScheduledNavigation = jest.fn();
let rootNavigationKey: string | undefined;
let scheduledNavigation: (() => void) | null = null;
let learningV2Hidden = true;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ source: "cold-link" }),
  useRootNavigationState: () =>
    rootNavigationKey ? { key: rootNavigationKey } : undefined,
  useRouter: () => ({ replace }),
}));

jest.mock("../app/navigation_back", () => ({
  dismissToTabRoute: (...args: unknown[]) => dismissToTabRoute(...args),
}));

jest.mock("../app/learning_v2_visibility_switch", () => ({
  LEARNING_V2_HIDDEN_REDIRECT: "/home",
  isLearningV2Hidden: () => learningV2Hidden,
  logLearningV2Hidden: (...args: unknown[]) =>
    logLearningV2Hidden(...args),
}));

jest.mock("../app/paywall_navigation", () => ({
  scheduleAfterRootNavigationReady: (navigate: () => void) => {
    scheduledNavigation = navigate;
    return { cancel: cancelScheduledNavigation };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  rootNavigationKey = undefined;
  scheduledNavigation = null;
  learningV2Hidden = true;
});

afterEach(async () => {
  await cleanup();
});

test("cold course link waits for the root navigator and settled task before redirecting", async () => {
  const view = await render(<LearningV2CourseScreen />);

  expect(scheduledNavigation).toBeNull();
  expect(replace).not.toHaveBeenCalled();
  expect(dismissToTabRoute).not.toHaveBeenCalled();

  rootNavigationKey = "root-ready";
  await view.rerender(<LearningV2CourseScreen />);

  expect(scheduledNavigation).toEqual(expect.any(Function));
  expect(replace).not.toHaveBeenCalled();

  await act(async () => scheduledNavigation?.());

  expect(logLearningV2Hidden).toHaveBeenCalledWith(
    "route_learning_v2_course",
    "/home",
  );
  expect(replace).toHaveBeenCalledWith("/home");
  expect(dismissToTabRoute).not.toHaveBeenCalled();

  await view.unmount();
  expect(cancelScheduledNavigation).toHaveBeenCalledTimes(1);
});

test("ready visible course link keeps its tab destination and forwarded query", async () => {
  learningV2Hidden = false;
  rootNavigationKey = "root-ready";
  const view = await render(<LearningV2CourseScreen />);

  expect(scheduledNavigation).toEqual(expect.any(Function));
  expect(dismissToTabRoute).not.toHaveBeenCalled();

  await act(async () => scheduledNavigation?.());

  expect(replace).not.toHaveBeenCalled();
  expect(logLearningV2Hidden).not.toHaveBeenCalled();
  expect(dismissToTabRoute).toHaveBeenCalledWith(
    expect.objectContaining({ replace }),
    "/(tabs)/lessons?source=cold-link&courseEntry=v2",
  );

  await view.unmount();
  expect(cancelScheduledNavigation).toHaveBeenCalledTimes(1);
});
