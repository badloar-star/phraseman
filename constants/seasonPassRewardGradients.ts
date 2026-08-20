// ════════════════════════════════════════════════════════════════════════════
// seasonPassRewardGradients.ts — уникальный градиент карточки подарка Season
// Pass на КАЖДУЮ тему приложения.
//
// зачем 2026-08-04 (владелец, со скриншотом: «контейнеры подарков сливаются с
// фоном, добавь туда градиенты в каждую тему уникальные, плюс контейнеры
// отличаются от обычных»): карточка красилась в t.bgSurface (плоский тон,
// чуть темнее bgCard) — этого хватало не везде, особенно на светлых темах.
// Пробовали переиспользовать общий t.cardGradient — не годится: он задуман
// для карточек НА светлом экране (lightOcean/lightSakura) или для затемнения
// на тёмном фоне, а на sagePorcelain сам почти белый-в-белый
// (['#FFFFFF','#FFFFFF'], ['#FCFDF9','#F5F7F2']) — та же болезнь слияния,
// которую и просили вылечить. Значит нужен НЕ общий токен, а отдельная
// палитра, которая на каждом bgPrimary даёт реальный, а не формальный
// контраст, и заодно визуально выделяет карточку подарка как особый элемент
// (не разновидность обычной плитки с фоном bgSurface, а собственный акцент).
//
// pass (правая, платная линия) — градиент в полную силу, ярче, премиальнее.
// free (левая линия) — тот же градиент вполовину непрозрачности поверх
// непрозрачного t.bgSurface2: остаётся узнаваемо той же темой, но заметно
// тише, чем pass — сохраняет прежнюю иерархию free/premium.
// ════════════════════════════════════════════════════════════════════════════
import type { ThemeMode } from "./theme";

export type SeasonRewardGradient = readonly [string, string];

const SEASON_REWARD_GRADIENTS: Record<ThemeMode, SeasonRewardGradient> = {
  // Тёмные темы — насыщенный акцент по диагонали, ощутимо ярче bgSurface.
  dark: ["#1E4A2E", "#0A140D"],
  gold: ["#4A3712", "#141005"],
  olive: ["#2A2D19", "#090A06"],
  midnight: ["#2A2E6E", "#0C0E22"],
  ember: ["#5A3410", "#1C0E04"],
  aurora: ["#0E4A3C", "#04140F"],
  volt: ["#3A4A0E", "#101604"],
  indigo: ["#3A2E70", "#120E24"],
  // Светлые темы — фон экрана уже белый/бежевый, поэтому карточка должна
  // сама нести цвет (не растворяться в ещё одном оттенке белого).
  sagePorcelain: ["#DCEADF", "#9FC4A8"],
} as const;

/** Текст/иконки поверх градиента карточки подарка — тёмный на светлых темах, светлый на тёмных. */
const SEASON_REWARD_ON_GRADIENT: Record<ThemeMode, string> = {
  dark: "#F0F7F2",
  gold: "#F7F1E4",
  olive: "#F4ECD8",
  midnight: "#FFFFFF",
  ember: "#FFFFFF",
  aurora: "#FFFFFF",
  volt: "#FFFFFF",
  indigo: "#F1EFFF",
  sagePorcelain: "#17201D",
} as const;

export function seasonRewardGradient(
  themeMode: ThemeMode | string,
): SeasonRewardGradient {
  return (
    SEASON_REWARD_GRADIENTS[themeMode as ThemeMode] ??
    SEASON_REWARD_GRADIENTS.dark
  );
}

export function seasonRewardOnGradientColor(
  themeMode: ThemeMode | string,
): string {
  return (
    SEASON_REWARD_ON_GRADIENT[themeMode as ThemeMode] ??
    SEASON_REWARD_ON_GRADIENT.dark
  );
}
