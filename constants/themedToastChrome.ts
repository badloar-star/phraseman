import type { Theme, ThemeMode } from "./theme";

export type ThemedToastChrome = {
  cardColors: [string, string, string];
  accent: string;
  accentSoft: string;
  border: string;
  title: string;
  body: string;
  closeBg: string;
  shadowColor: string;
  radius: number;
};

const CHROME_BY_THEME: Record<
  ThemeMode,
  Omit<ThemedToastChrome, "title" | "body">
> = {
  dark: {
    cardColors: [
      "rgba(16,40,30,0.98)",
      "rgba(8,23,18,0.97)",
      "rgba(4,12,10,0.95)",
    ],
    accent: "#47C870",
    accentSoft: "rgba(71,200,112,0.16)",
    border: "rgba(71,200,112,0.42)",
    closeBg: "rgba(71,200,112,0.10)",
    shadowColor: "rgba(3,25,12,0.84)",
    radius: 18,
  },
  gold: {
    cardColors: [
      "rgba(34,28,16,0.96)",
      "rgba(16,13,8,0.94)",
      "rgba(5,4,3,0.92)",
    ],
    accent: "#F6E3A1",
    accentSoft: "rgba(246,227,161,0.16)",
    border: "rgba(246,227,161,0.48)",
    closeBg: "rgba(246,227,161,0.08)",
    shadowColor: "rgba(0,0,0,0.90)",
    radius: 20,
  },
  olive: {
    cardColors: [
      "rgba(31,35,20,0.98)",
      "rgba(13,15,11,0.97)",
      "rgba(5,6,4,0.95)",
    ],
    accent: "#C9A84C",
    accentSoft: "rgba(201,168,76,0.14)",
    border: "rgba(201,168,76,0.12)",
    closeBg: "rgba(201,168,76,0.08)",
    shadowColor: "rgba(0,0,0,0.82)",
    radius: 18,
  },
  sagePorcelain: {
    cardColors: ["#FCFDF9", "#F0F1EC", "#E1E5DC"],
    accent: "#315F50",
    accentSoft: "#D9E9E1",
    border: "#CFD6CE",
    closeBg: "#E1E5DC",
    shadowColor: "rgba(35,50,43,0.14)",
    radius: 16,
  },
  midnight: {
    cardColors: [
      "rgba(28,31,48,0.98)",
      "rgba(13,15,27,0.97)",
      "rgba(4,5,10,0.95)",
    ],
    accent: "#8FA0FF",
    accentSoft: "rgba(143,160,255,0.15)",
    border: "rgba(143,160,255,0.36)",
    closeBg: "rgba(143,160,255,0.09)",
    shadowColor: "rgba(0,0,0,0.78)",
    radius: 16,
  },
  ember: {
    cardColors: [
      "rgba(38,27,17,0.98)",
      "rgba(18,12,7,0.97)",
      "rgba(7,4,2,0.95)",
    ],
    accent: "#FFCC55",
    accentSoft: "rgba(255,204,85,0.15)",
    border: "rgba(255,204,85,0.38)",
    closeBg: "rgba(255,204,85,0.09)",
    shadowColor: "rgba(0,0,0,0.78)",
    radius: 16,
  },
  aurora: {
    cardColors: [
      "rgba(18,35,29,0.98)",
      "rgba(8,18,15,0.97)",
      "rgba(3,8,7,0.95)",
    ],
    accent: "#3DE8A6",
    accentSoft: "rgba(61,232,166,0.15)",
    border: "rgba(61,232,166,0.38)",
    closeBg: "rgba(61,232,166,0.09)",
    shadowColor: "rgba(0,0,0,0.78)",
    radius: 16,
  },
  volt: {
    cardColors: [
      "rgba(31,37,14,0.98)",
      "rgba(13,16,6,0.97)",
      "rgba(5,7,2,0.95)",
    ],
    accent: "#C6FF34",
    accentSoft: "rgba(198,255,52,0.14)",
    border: "rgba(198,255,52,0.36)",
    closeBg: "rgba(198,255,52,0.08)",
    shadowColor: "rgba(0,0,0,0.78)",
    radius: 16,
  },
  indigo: {
    cardColors: [
      "rgba(34,33,64,0.98)",
      "rgba(23,22,43,0.97)",
      "rgba(10,9,18,0.95)",
    ],
    accent: "#C8C3FF",
    accentSoft: "rgba(200,195,255,0.15)",
    border: "rgba(200,195,255,0.36)",
    closeBg: "rgba(200,195,255,0.09)",
    shadowColor: "rgba(0,0,0,0.78)",
    radius: 16,
  },
};

export function themedToastChrome(
  themeMode: ThemeMode,
  theme: Theme,
): ThemedToastChrome {
  const base = CHROME_BY_THEME[themeMode] ?? CHROME_BY_THEME.indigo;
  return {
    ...base,
    title: theme.textPrimary,
    body: theme.textMuted,
  };
}
