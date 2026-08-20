import type { Theme, ThemeMode } from "./theme";

export type WeekDotTheme = {
  completeBg: string;
  completeBorder: string;
  emptyBg: string;
  todayBg: string;
  emptyBorder: string;
  todayBorder: string;
  checkColor: string;
  freezeBg: string;
  freezeBorder: string;
};

const WEEK_DOTS: Record<
  ThemeMode,
  Omit<WeekDotTheme, "freezeBg" | "freezeBorder">
> = {
  dark: {
    completeBg: "#47C870",
    completeBorder: "rgba(118,255,158,0.72)",
    emptyBg: "rgba(71,200,112,0.08)",
    todayBg: "rgba(71,200,112,0.18)",
    emptyBorder: "rgba(71,200,112,0.22)",
    todayBorder: "rgba(71,200,112,0.56)",
    checkColor: "#042010",
  },
  gold: {
    completeBg: "#F4D37A",
    completeBorder: "rgba(255,232,166,0.82)",
    emptyBg: "rgba(246,227,161,0.055)",
    todayBg: "rgba(246,227,161,0.13)",
    emptyBorder: "rgba(246,227,161,0.20)",
    todayBorder: "rgba(246,227,161,0.62)",
    checkColor: "#0A0702",
  },
  olive: {
    completeBg: "#C9A84C",
    completeBorder: "rgba(227,204,136,0.76)",
    emptyBg: "rgba(201,168,76,0.07)",
    todayBg: "rgba(201,168,76,0.15)",
    emptyBorder: "rgba(201,168,76,0.18)",
    todayBorder: "rgba(227,204,136,0.52)",
    checkColor: "#161208",
  },
  sagePorcelain: {
    completeBg: "#2F6F4F",
    completeBorder: "#315F50",
    emptyBg: "#E1E5DC",
    todayBg: "#D9E9E1",
    emptyBorder: "#CFD6CE",
    todayBorder: "#315F50",
    checkColor: "#FFFFFF",
  },
  midnight: {
    completeBg: "#8FA0FF",
    completeBorder: "rgba(201,210,255,0.74)",
    emptyBg: "rgba(143,160,255,0.08)",
    todayBg: "rgba(143,160,255,0.17)",
    emptyBorder: "rgba(143,160,255,0.24)",
    todayBorder: "rgba(143,160,255,0.56)",
    checkColor: "#0D1030",
  },
  ember: {
    completeBg: "#FFCC55",
    completeBorder: "rgba(255,233,184,0.74)",
    emptyBg: "rgba(255,204,85,0.08)",
    todayBg: "rgba(255,204,85,0.17)",
    emptyBorder: "rgba(255,204,85,0.24)",
    todayBorder: "rgba(255,204,85,0.56)",
    checkColor: "#2A1A02",
  },
  aurora: {
    completeBg: "#3DE8A6",
    completeBorder: "rgba(159,242,207,0.74)",
    emptyBg: "rgba(61,232,166,0.08)",
    todayBg: "rgba(61,232,166,0.17)",
    emptyBorder: "rgba(61,232,166,0.24)",
    todayBorder: "rgba(61,232,166,0.56)",
    checkColor: "#052A1C",
  },
  volt: {
    completeBg: "#C6FF34",
    completeBorder: "rgba(232,255,150,0.74)",
    emptyBg: "rgba(198,255,52,0.08)",
    todayBg: "rgba(198,255,52,0.16)",
    emptyBorder: "rgba(198,255,52,0.22)",
    todayBorder: "rgba(198,255,52,0.54)",
    checkColor: "#182002",
  },
  indigo: {
    completeBg: "#C8C3FF",
    completeBorder: "rgba(228,225,255,0.74)",
    emptyBg: "rgba(200,195,255,0.08)",
    todayBg: "rgba(200,195,255,0.17)",
    emptyBorder: "rgba(200,195,255,0.24)",
    todayBorder: "rgba(200,195,255,0.56)",
    checkColor: "#17162B",
  },
};

export function themedWeekDot(
  themeMode: ThemeMode,
  theme: Theme,
): WeekDotTheme {
  const base = WEEK_DOTS[themeMode] ?? WEEK_DOTS.indigo;
  return {
    ...base,
    freezeBg:
      themeMode === "gold"
        ? "rgba(218,244,255,0.18)"
        : "rgba(196,239,255,0.24)",
    freezeBorder:
      themeMode === "gold"
        ? "rgba(218,244,255,0.72)"
        : "rgba(190,240,255,0.78)",
  };
}
