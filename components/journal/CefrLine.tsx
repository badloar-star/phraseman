import React from 'react';
import { View, Text } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme, ThemeMode } from '../../constants/theme';
import type { Fonts } from '../ThemeContext';
import { statsAccent, statsSoftBg } from '../../constants/statsThemeChrome';
import { GOLD_RICH } from '../../constants/goldTheme';

export interface CefrLineProps {
  t: Theme;
  f: Fonts;
  lang: Lang;
  themeMode: ThemeMode;
  isGoldTheme: boolean;
  /** Освоенных (архивных, «выучено») фраз+слов в тренажёре — основа уровня. */
  masteredCount: number;
  onPress?: () => void;
}

type CefrLevel = 'A1' | 'A2' | 'A2+' | 'B1' | 'B1+';

/**
 * Пороги уровня по числу освоенных фраз — ПРЕДВАРИТЕЛЬНЫЕ (эвристика на глаз,
 * не откалиброваны по внешней CEFR-шкале словарного запаса). Можно уточнить
 * позже, когда накопится статистика реальных пользователей по уровням.
 */
const CEFR_THRESHOLDS: ReadonlyArray<{ level: CefrLevel; min: number }> = [
  { level: 'B1+', min: 900 },
  { level: 'B1', min: 550 },
  { level: 'A2+', min: 250 },
  { level: 'A2', min: 80 },
  { level: 'A1', min: 0 },
];

const CEFR_ORDER: readonly CefrLevel[] = ['A1', 'A2', 'A2+', 'B1', 'B1+'];

function levelForMasteredCount(n: number): CefrLevel {
  const found = CEFR_THRESHOLDS.find((entry) => n >= entry.min);
  return found ? found.level : 'A1';
}

/** Сколько фраз не хватает до следующего уровня; null — уже потолок шкалы (B1+). */
function toNextLevel(n: number, level: CefrLevel): { next: CefrLevel; remaining: number } | null {
  const idx = CEFR_ORDER.indexOf(level);
  const next = CEFR_ORDER[idx + 1];
  if (!next) return null;
  const nextThreshold = CEFR_THRESHOLDS.find((entry) => entry.level === next);
  if (!nextThreshold) return null;
  return { next, remaining: Math.max(0, nextThreshold.min - n) };
}

function pluralPhrasesRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'фраза';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'фразы';
  return 'фраз';
}

function pluralPhrasesUk(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'фраза';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'фрази';
  return 'фраз';
}

/**
 * Строка-карточка «Уровень A2 · 340 фраз · до B1 — 210».
 * Название самодостаточно — никакой подписи-расшифровки мелким шрифтом ниже.
 */
function CefrLine({ t, f, lang, themeMode, isGoldTheme, masteredCount, onPress }: CefrLineProps) {
  const safeCount = Math.max(0, Math.floor(masteredCount));
  const level = levelForMasteredCount(safeCount);
  const progress = toNextLevel(safeCount, level);

  const accent = isGoldTheme ? GOLD_RICH.metalGold : statsAccent(themeMode, 'archiveMap');
  const chipBg = isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, 'archiveMap');

  const levelLabel = triLang(lang, {
    ru: `Уровень ${level}`,
    uk: `Рівень ${level}`,
    es: `Nivel ${level}`,
    'pt-BR': `Nível ${level}`,
    vi: `Trình độ ${level}`,
    id: `Level ${level}`,
    tr: `Seviye ${level}`,
    pl: `Poziom ${level}`,
  });

  const phraseCountLabel = triLang(lang, {
    ru: `${safeCount} ${pluralPhrasesRu(safeCount)}`,
    uk: `${safeCount} ${pluralPhrasesUk(safeCount)}`,
    es: `${safeCount} frases`,
    'pt-BR': `${safeCount} frases`,
    vi: `${safeCount} cụm từ`,
    id: `${safeCount} frasa`,
    tr: `${safeCount} ifade`,
    pl: `${safeCount} fraz`,
  });

  const nextLevelLabel = progress
    ? triLang(lang, {
        ru: `до ${progress.next} — ${progress.remaining}`,
        uk: `до ${progress.next} — ${progress.remaining}`,
        es: `a ${progress.next} — ${progress.remaining}`,
        'pt-BR': `até ${progress.next} — ${progress.remaining}`,
        vi: `còn ${progress.remaining} đến ${progress.next}`,
        id: `${progress.remaining} lagi ke ${progress.next}`,
        tr: `${progress.next}'e — ${progress.remaining}`,
        pl: `do ${progress.next} — ${progress.remaining}`,
      })
    : triLang(lang, {
        ru: 'вершина шкалы',
        uk: 'вершина шкали',
        es: 'nivel máximo',
        'pt-BR': 'nível máximo',
        vi: 'mức cao nhất',
        id: 'level tertinggi',
        tr: 'zirve seviye',
        pl: 'szczyt skali',
      });

  const chipText = triLang(lang, {
    ru: level,
    uk: level,
    es: level,
    'pt-BR': level,
    vi: level,
    id: level,
    tr: level,
    pl: level,
  });

  return (
    <View
      accessibilityRole={onPress ? 'button' : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: chipBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: accent, fontSize: f.caption, fontWeight: '900' }} numberOfLines={1}>
          {chipText}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
          {levelLabel}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
          {`${phraseCountLabel} · ${nextLevelLabel}`}
        </Text>
      </View>
    </View>
  );
}

export default React.memo(CefrLine);
