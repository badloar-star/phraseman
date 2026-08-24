import { LayoutAnimation } from "react-native";
import { animateNextLayoutShiftWithoutEntryFade } from "../app/smooth_layout";

jest.mock("react-native", () => ({
  LayoutAnimation: {
    configureNext: jest.fn(),
    Types: { easeInEaseOut: "easeInEaseOut" },
    Properties: { opacity: "opacity" },
    create: jest.fn(),
  },
  Platform: { OS: "ios" },
  UIManager: {},
}));

const mockConfigureNext = LayoutAnimation.configureNext as jest.Mock;

describe("Learning V2 update-only layout shift", () => {
  beforeEach(() => {
    mockConfigureNext.mockClear();
  });

  test("does not animate inserted rows from opacity zero", () => {
    animateNextLayoutShiftWithoutEntryFade(160);

    expect(mockConfigureNext).toHaveBeenCalledWith({
      duration: 160,
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
    expect(mockConfigureNext.mock.calls[0]?.[0]).not.toHaveProperty("create");
  });
});
