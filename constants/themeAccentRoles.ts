// ═════════════════════════════════════════════════════════════════════
// themeAccentRoles.ts — цвет темы по РОЛИ для экранов, получающих объект Theme.
//
// зачем (аудит светлого акцента 768656f71; токены Тем c62e8fc70): в светлом оформлении у градиентных тем сырой `accent` — пастель,
// и графика/текст им сливались с фоном. Theme несёт `accentGraphic`/`accentTextSafe` (в тёмном — ровно accent), но поля
// необязательные: у старых тем (DARK и др.) их нет. Запасной `accent` — только здесь, чтобы экраны не держали сырой `.accent`
// (сторож tests/light_accent_graphics_ratchet считает каждое место).
// ═════════════════════════════════════════════════════════════════════

type AccentRoleSource = Readonly<{ accent: string; accentGraphic?: string; accentTextSafe?: string }>;

/** Графика цвета темы: кольца, полосы, точки, кромки, контуры, столбики. */
export function accentGraphicOf(theme: AccentRoleSource): string {
  return theme.accentGraphic ?? theme.accent;
}

/** Текст и значки цвета темы на поверхности. */
export function accentTextSafeOf(theme: AccentRoleSource): string {
  return theme.accentTextSafe ?? theme.accent;
}
