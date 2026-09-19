import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";

export function learningV2ListenChooseOptionLabelV1(input: Readonly<{
  fallbackText: string;
  interfaceLocale: LearningV2InterfaceLocale;
  meaningByLocale: Readonly<Record<string, string>> | null;
}>): string {
  const localized = input.meaningByLocale?.[input.interfaceLocale]?.trim();
  return localized || input.fallbackText;
}
