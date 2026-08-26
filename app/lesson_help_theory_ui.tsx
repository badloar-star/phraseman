// ─── Общие презентационные компоненты теории урока ────────────────────────────
//
// Лёгкий слой UI для экрана теории (app/lesson_help.tsx). Вынесен из экрана,
// чтобы тяжёлый литерал контента THEORY (app/lesson_help_theory_data.tsx) мог
// импортировать эти компоненты, оставаясь при этом за ленивым require()-сеймом
// (см. app/lesson_help_theory_registry.ts и Performance Bible в AGENTS.md).
//
// Эти компоненты — маленькие и статически импортируются и экраном, и модулем
// данных: сам по себе этот файл не тянет мегабайты контента.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import { screenTextOnGradient, type Theme, type ThemeMode } from '../constants/theme';

// Разделитель текста по акцентным словам (group capture → совпадения остаются в split).
const THEORY_ACCENT_SPLIT = /\b(am|is|are|not|do|does|will|I|you|he|she|it|we|they|Am|Is|Are|Do|Does|To Be)\b|am\/is\/are/g;
// Проверка одного куска БЕЗ /g-состояния (исправляет хрупкость lastIndex у .test()).
const THEORY_ACCENT_SET = new Set(
  ['am', 'is', 'are', 'not', 'do', 'does', 'will', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'to be', 'am/is/are'],
);
function isAccentWord(part: string): boolean {
  return THEORY_ACCENT_SET.has(part.trim().toLowerCase());
}

// Модульные наборы ролевых слов (стабильные ссылки → честная мемоизация в ColoredPhrase,
// без пересоздания Set из инлайн-литералов на каждый рендер).
export const ROLE_LINK_BE = ['am', 'is', 'are'] as const;
export const ROLE_LINK_IS_ARE = ['is', 'are'] as const;
export const ROLE_LINK_IS_ARE_NOT = ['is', 'are', 'not'] as const;
const TABLE_COL_MIN_W = 132;

// Светлость определяем по реальной яркости фона карточки, а не по именам тем
// (ocean/sakura — легаси, в типе ThemeMode их нет; раньше ветка была мёртвой).
export function isLightSurface(bg?: string): boolean {
  if (typeof bg !== 'string') return false;
  const hex = bg.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return false;
  // относительная яркость (luminance)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}

export function theoryColors(t: Theme, themeMode: ThemeMode) {
  const sx = screenTextOnGradient(t, themeMode);
  const isLight = isLightSurface(t?.bgCard);
  return {
    primary: sx.primary,
    body: sx.primary,
    muted: sx.muted,
    border: t.border,
    cardBg: t.bgCard,
    surfaceBg: t.bgSurface,
    rowAltBg: isLight ? '#FFFFFFB8' : 'rgba(255,255,255,0.045)',
    accent: t.accent ?? sx.second,
    formula: isLight ? '#6D28D9' : '#C4B5FD',
    warning: t.gold ?? '#FBBF24',
    warningBg: isLight ? 'rgba(251,191,36,0.14)' : 'rgba(251,191,36,0.10)',
    success: t.correct ?? '#40C080',
    successBg: isLight ? 'rgba(64,192,128,0.12)' : 'rgba(64,192,128,0.10)',
    danger: t.wrong ?? '#FB7185',
    dangerBg: isLight ? 'rgba(251,113,133,0.12)' : 'rgba(251,113,133,0.10)',
    // ── Ролевые цвета для цветового кодирования грамматики (новый дизайн) ──
    // Ролевые цвета для цветового кодирования грамматики (3 роли всегда различимы).
    // ВАЖНО: НЕ берём из t.gold/t.correct — на некоторых темах (gold) они совпадают,
    // и две роли сливались бы в один цвет. Фиксированная палитра фиолет/янтарь/бирюза
    // со светлым и тёмным вариантом контрастна на любой карточке (8 тем).
    // Роль 1 «подлежащее/предмет» — фиолетовый; роль 2 «связка/служебное» — янтарный;
    // роль 3 «смысловая форма (V3/-ing/...)» — бирюзовый. Фоны-чипы полупрозрачные.
    roleSubject: isLight ? '#6D28D9' : '#C4B5FD',
    roleSubjectBg: isLight ? 'rgba(109,40,217,0.12)' : 'rgba(196,181,253,0.12)',
    roleLink: isLight ? '#B45309' : '#FBBF24',
    roleLinkBg: isLight ? 'rgba(180,83,9,0.14)' : 'rgba(251,191,36,0.13)',
    roleVerb: isLight ? '#0F766E' : '#40C080',
    roleVerbBg: isLight ? 'rgba(15,118,110,0.14)' : 'rgba(64,192,128,0.13)',
  };
}

export function TheoryInlineText({
  text,
  t,
  f,
  size,
  lineHeight,
  baseColor,
  weight = '400',
}: {
  text: string;
  t: Theme;
  f: any;
  size?: number;
  lineHeight?: number;
  baseColor?: string;
  weight?: '400' | '600' | '700' | '800';
}) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  const parts = text.split(THEORY_ACCENT_SPLIT).filter(Boolean);
  return (
    <Text style={{ color: baseColor ?? c.body, fontSize: size ?? f.body, lineHeight: lineHeight ?? 24, fontWeight: weight }} maxFontSizeMultiplier={1.2}>
      {parts.map((part, i) => {
        const isAccent = isAccentWord(part);
        return (
          <Text key={`${part}-${i}`} style={isAccent ? { color: c.formula, fontWeight: '800' } : undefined}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

export function Section({ title, t, f }: { title: string; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <Text style={{ color: c.primary, fontSize: f.h2, fontWeight: '800', marginTop: 24, marginBottom: 10, borderBottomWidth: 0.5, borderBottomColor: c.border, paddingBottom: 8 }} maxFontSizeMultiplier={1.1}>
      {title}
    </Text>
  );
}

export function Body({ text, t, f }: { text: string; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <View style={{ marginBottom: 10 }}>
      <TheoryInlineText text={text} t={t} f={f} baseColor={c.body} lineHeight={Math.round(f.body * 1.55)} />
    </View>
  );
}

export function Example({ eng, rus, t, f }: { eng: string; rus: string; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <View style={{ marginLeft: 8, marginBottom: 7, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: `${c.accent}66` }}>
      <Text style={{ fontSize: f.body, lineHeight: Math.round(f.body * 1.45) }} maxFontSizeMultiplier={1.2}>
        <Text style={{ color: c.primary, fontWeight: '800' }}>{eng}</Text>
        <Text style={{ color: c.muted, fontSize: f.sub }}>{'  — ' + rus}</Text>
      </Text>
    </View>
  );
}

export function Warn({ text, t, f }: { text: string; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <View style={{ backgroundColor: c.warningBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: `${c.warning}66`, marginVertical: 9, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Ionicons name="warning-outline" size={18} color={c.warning} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <TheoryInlineText text={text} t={t} f={f} baseColor={c.primary} lineHeight={Math.round(f.body * 1.45)} />
      </View>
    </View>
  );
}

export function Tip({ text, t, f }: { text: string; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <View style={{ backgroundColor: c.successBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: `${c.success}66`, marginVertical: 9, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Ionicons name="bulb-outline" size={18} color={c.success} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <TheoryInlineText text={text} t={t} f={f} baseColor={c.primary} lineHeight={Math.round(f.body * 1.45)} />
      </View>
    </View>
  );
}

// Таблица: массив строк, каждая строка — массив ячеек
export function Table({ rows, t, f }: { rows: string[][]; t: Theme; f?: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [containerW, setContainerW] = useState(0);

  if (!rows.length) return null;
  const header = rows[0];
  const body = rows.slice(1);
  const numCols = header.length;
  const contentW = numCols * TABLE_COL_MIN_W;
  const canScroll = containerW > 0 && contentW > containerW;

  // thumb width proportional, min 32px
  const thumbW = canScroll ? Math.max(32, (containerW / contentW) * containerW) : 0;
  const trackW = containerW - 8; // 4px padding each side
  const thumbTranslate = canScroll
    ? scrollX.interpolate({ inputRange: [0, contentW - containerW], outputRange: [0, trackW - thumbW], extrapolate: 'clamp' })
    : new Animated.Value(0);

  return (
    <View
      style={{ marginVertical: 10 }}
      onLayout={e => setContainerW(e.nativeEvent.layout.width)}
    >
      <View style={{ borderRadius: 10, borderWidth: 0, borderColor: c.border, overflow: 'hidden' }}>
        <Animated.ScrollView
          horizontal
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        >
          <View style={{ minWidth: contentW }}>
            {/* Заголовок */}
            <View style={{ flexDirection: 'row', backgroundColor: c.surfaceBg }}>
              {header.map((cell, i) => (
                <View key={i} style={{ width: TABLE_COL_MIN_W, paddingHorizontal: 10, paddingVertical: 11, borderRightWidth: i < numCols - 1 ? 0.5 : 0, borderRightColor: c.border }}>
                  <Text style={{ color: c.primary, fontSize: 12, fontWeight: '800' }} maxFontSizeMultiplier={1}>{cell}</Text>
                </View>
              ))}
            </View>
            {/* Строки */}
            {body.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', backgroundColor: ri % 2 === 0 ? c.cardBg : c.rowAltBg, borderTopWidth: 0.5, borderTopColor: c.border }}>
                {row.map((cell, ci) => (
                  <View key={ci} style={{ width: TABLE_COL_MIN_W, paddingHorizontal: 10, paddingVertical: 11, borderRightWidth: ci < row.length - 1 ? 0.5 : 0, borderRightColor: c.border }}>
                    <TheoryInlineText text={cell} t={t} f={f ?? { body: 11 }} size={11} lineHeight={17} baseColor={ci === 0 ? c.primary : c.body} weight={ci === 0 ? '600' : '400'} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Animated.ScrollView>
      </View>

      {/* Кастомный индикатор горизонтального скролла */}
      {canScroll && (
        <View style={{ height: 4, marginTop: 5, marginHorizontal: 4, backgroundColor: c.border, borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 4, width: thumbW, borderRadius: 2, backgroundColor: c.accent, transform: [{ translateX: thumbTranslate }] }} />
        </View>
      )}
    </View>
  );
}

// ─── Новые компоненты дизайна (формула-блоки, аккордеон, карточки) ────────────

/**
 * Подсветка ролей внутри английской фразы по словам.
 * subject/link/verb — массивы слов (без учёта регистра), которые красятся
 * соответствующим ролевым цветом. Остальной текст — обычный.
 */
export function ColoredPhrase({
  text,
  t,
  f,
  size,
  subject = [],
  link = [],
  verb = [],
}: {
  text: string;
  t: Theme;
  f: any;
  size?: number;
  subject?: readonly string[];
  link?: readonly string[];
  verb?: readonly string[];
}) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  // Мемоизация по СОДЕРЖИМОМУ (join), а не по ссылке массива-литерала — иначе useMemo бесполезен.
  const subjSet = useMemo(() => new Set(subject.map((s) => s.toLowerCase())), [subject.join('|')]);
  const linkSet = useMemo(() => new Set(link.map((s) => s.toLowerCase())), [link.join('|')]);
  const verbSet = useMemo(() => new Set(verb.map((s) => s.toLowerCase())), [verb.join('|')]);
  const tokens = text.split(/(\s+)/);
  return (
    <Text
      accessible
      accessibilityLabel={text}
      style={{ color: c.body, fontSize: size ?? f.body, lineHeight: Math.round((size ?? f.body) * 1.4), fontWeight: '400' }}
      maxFontSizeMultiplier={1.2}
    >
      {tokens.map((tok, i) => {
        const bare = tok.replace(/[.,!?;:]/g, '').toLowerCase();
        let color: string | undefined;
        let weight: '400' | '700' = '400';
        if (subjSet.has(bare)) { color = c.roleSubject; weight = '700'; }
        else if (linkSet.has(bare)) { color = c.roleLink; weight = '700'; }
        else if (verbSet.has(bare)) { color = c.roleVerb; weight = '700'; }
        return color
          ? <Text key={`${tok}-${i}`} style={{ color, fontWeight: weight }}>{tok}</Text>
          : <Text key={`${tok}-${i}`}>{tok}</Text>;
      })}
    </Text>
  );
}

// Форма теории урока: заголовки на разных языках + функции-рендеры контента.
// Тип общий для экрана (app/lesson_help.tsx) и модуля данных
// (app/lesson_help_theory_data.tsx).
export type TheoryContent = {
  titleRU: string;
  titleUK: string;
  titleES?: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
  spanishStatus?: 'ready' | 'missing';
  render: (t: Theme, isUK: boolean, f: any) => React.ReactNode[];
  renderES?: (t: Theme, f: any) => React.ReactNode[];
};
