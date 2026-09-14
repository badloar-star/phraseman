import React, { useState } from "react";
import { Pressable, Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import LearningV2PracticeViewport, {
  useLearningV2CompactPractice,
  useLearningV2PracticeViewportHost,
} from "../components/learning-v2/LearningV2PracticeViewport";

jest.mock("react-native", () => ({
  View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView",
  StyleSheet: { create: (styles: unknown) => styles, flatten: (styles: unknown) => styles },
}));

function Task(): React.JSX.Element {
  const compact = useLearningV2CompactPractice();
  const insidePractice = useLearningV2PracticeViewportHost();
  const [answer, setAnswer] = useState("I");
  return <Pressable testID="answer" onPress={() => setAnswer("I am")}>
    <Text>{answer}</Text><Text>{compact ? "compact" : "roomy"}</Text>
    <Text>{insidePractice ? "direct player" : "other host"}</Text>
  </Pressable>;
}

test("fits ordinary practice without scrolling and keeps answer on resize", async () => {
  const ui = await render(<LearningV2PracticeViewport><Task /></LearningV2PracticeViewport>);
  await fireEvent(ui.getByTestId("learning-v2-practice-viewport"), "layout", { nativeEvent: { layout: { height: 520 } } });
  await fireEvent(ui.getByTestId("learning-v2-practice-content"), "contentSizeChange", 358, 490);
  expect(ui.getByTestId("learning-v2-practice-content").props.scrollEnabled).toBe(false);
  expect(ui.getByText("compact")).toBeTruthy();
  await fireEvent.press(ui.getByTestId("answer"));
  await fireEvent(ui.getByTestId("learning-v2-practice-viewport"), "layout", { nativeEvent: { layout: { height: 680 } } });
  expect(ui.getByText("roomy")).toBeTruthy();
  expect(ui.getByText("I am")).toBeTruthy();
  expect(ui.getByText("direct player")).toBeTruthy();
});

test("large accessibility text stays reachable and scrolling stops when it fits again", async () => {
  const ui = await render(<LearningV2PracticeViewport><Task /></LearningV2PracticeViewport>);
  await fireEvent(ui.getByTestId("learning-v2-practice-viewport"), "layout", { nativeEvent: { layout: { height: 420 } } });
  await fireEvent(ui.getByTestId("learning-v2-practice-content"), "contentSizeChange", 288, 650);
  expect(ui.getByTestId("learning-v2-practice-content").props.scrollEnabled).toBe(true);
  await fireEvent(ui.getByTestId("learning-v2-practice-content"), "contentSizeChange", 288, 420);
  expect(ui.getByTestId("learning-v2-practice-content").props.scrollEnabled).toBe(false);
});

test("other hosts retain their original density", async () => {
  const ui = await render(<Task />);
  expect(ui.getByText("roomy")).toBeTruthy();
  expect(ui.getByText("other host")).toBeTruthy();
});
