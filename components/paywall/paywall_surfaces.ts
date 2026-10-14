// ═══════════════════════════════════════════════════════════════════════════
// paywall_surfaces.ts — поверхности пейвола Plus: лист и плашки.
//
// зачем (координатор 13.10, paywall-gap-001; после 4801981d8 и 2fb610b52): в тёмной «Авроре» PaywallPlus оставался зеленоватым (лист ≈ (40,53,53), плашки так же), хотя остальные окна нейтральны ≈ (40,40,44).
// Причина: лист и плашки брали токены темы (`opaqueCard` / `opaqueControl`), а не общую нейтраль «Тени». В тёмном оформлении теперь: лист — SHADOW_SHEET_DARK_TOP, плашки — светлее листа на 9,5 % белого
// (`shadowSheetPlateTokens`, тот же хелпер, что у шторок). Светлое оформление — прежнее: лист `opaqueSheet`, плашки `opaqueControl`. Отдельный модуль — чтобы PaywallPlus и PaywallBenefitComparison
// брали поверхности из одного места без циклического импорта.
// ═══════════════════════════════════════════════════════════════════════════
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { shadowSheetPlateTokens } from '../v2/shadow_sheet_paint';

type GlassTokens = ReturnType<typeof liquidGlassTokens>;

/** Фон листа и «впадины» на плашках (круги тайм-линии, пилюля промо). */
// зачем (владелец 13.10, №35 «все модалы слушаются тему»): лист пейвола — подложка текущей темы (opaqueSheet) и в светлом, и в тёмном оформлении.
export function paywallSheetBg(g: GlassTokens): string { return g.opaqueSheet; }

/** Плашки и плитки на листе: в тёмном — нейтральные, светлее листа; в светлом — как раньше. */
export function paywallPlateBg(g: GlassTokens): string { return g.isLight ? g.opaqueControl : shadowSheetPlateTokens(g).plateFillFrom; }
