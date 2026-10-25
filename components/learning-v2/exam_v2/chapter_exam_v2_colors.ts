// chapter_exam_v2_colors.ts — цвета экрана экзамена главы v2 по карте 4 · ТЕМЫ (docs/work/exam-workshop-theme-token-map-2026-10-25.md).
// зачем (координатор 25.10, замок theme-colors-only): каждый цвет — токен текущей темы; hex из прототипа (снимок «Сумерек») в код не
// переносится. Карта проверена на 29 темах × светлая/тёмная × 3 уровня, 0 нарушений контраста. Четыре замены против прототипа:
// полоса/курсор/точки — accentGraphic; «Верно/Неверно» — цветом текста, цвет несёт значок ✓/✕; подсветка ошибки — text на badSoft;
// неактивная кнопка — buttonFillDisabled/buttonInkDisabled (без прозрачности 35 %). Номера ролей (E1…E32) — из карты.
// Токены берутся «родные» (liquidGlassTokens), а не useLv2Glass: там goodSoft/badSoft заменены своими прозрачностями, а карта
// мерила токены темы.
import { useMemo } from 'react';
import { useTheme } from '../../ThemeContext';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';

type Theme = ReturnType<typeof liquidGlassTokens>;

export function chapterExamV2ColorsOf(g: Theme) {
  return {
    bg: g.bg,
    counter: g.secondary, // E1
    track: g.opaqueControl, // E2 дорожка (украшение)
    trackFill: g.accentGraphic, // E2/E3
    taskTile: g.accentTile, // E4 плитка
    taskIcon: g.accentText, // E4 значок
    situationFill: g.accentSoft, // E5 плашка ситуации на фоне
    situationText: g.secondary, // E5
    situationLabel: g.text,
    card: g.opaqueCard, // E6/E7 карточки и поле
    text: g.text, // E6/E7
    placeholder: g.mutedText, // E8
    caret: g.accentGraphic, // E9
    fieldGood: g.good, // E10
    fieldBad: g.bad, // E11
    goodPlate: g.goodSoft, // E12/E13
    goodIcon: g.good, // E12
    badPlate: g.badSoft, // E14/E15
    badIcon: g.bad, // E14
    plateText: g.text, // E13/E15
    errorHighlight: g.badSoft, // E16 (буквы — text)
    ctaFill: g.ctaFill, // E17
    ctaInk: g.ctaFillInk, // E17
    ctaFillDisabled: g.buttonFillDisabled, // E18
    ctaInkDisabled: g.buttonInkDisabled, // E18
    footer: g.opaqueSheet, // E19
    score: g.text, // E20
    dotOn: g.accentGraphic, // E21
    dotOff: g.opaqueControl, // E21
    trophyFill: g.accentSoft, // E22
    trophyIcon: g.accentText, // E22
    chip: g.opaqueControl, // E23 «+40», вторые кнопки
    chipText: g.text, // E23/E30
    sectionTitle: g.secondary, // E24
    topicText: g.text, // E25
    topicEpisodes: g.secondary, // E26
    topicErrors: g.bad, // E27
    doneCheck: g.good, // E28
    waitText: g.secondary, // E29 «Пересдать через N мин»
    link: g.accentText, // E31 ссылки «Разбор ошибок», «или напиши», подсказка микрофона
    chapterTile: g.accent, // E32
    chapterIcon: g.accentInk, // E32
    secondary: g.secondary,
    iconMuted: g.iconMuted,
    divider: g.secondary,
  } as const;
}

export type ChapterExamV2Colors = ReturnType<typeof chapterExamV2ColorsOf>;

export function useChapterExamV2Colors(): ChapterExamV2Colors {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  return useMemo(() => chapterExamV2ColorsOf(g), [g]);
}
