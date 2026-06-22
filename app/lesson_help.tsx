import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TapScale from '../components/TapScale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import XpGainBadge from '../components/XpGainBadge';
import { updateTaskProgress } from './daily_tasks';
import { registerXP, getCurrentMultiplier } from './xp_manager';
import ReportErrorButton from '../components/ReportErrorButton';
import { screenTextOnGradient, type Theme, type ThemeMode } from '../constants/theme';
import { openLessonGateByRuntime, shouldBlockLessonAccess } from './lesson_premium_gate';
import { getLessonIntroScreens } from './lesson_data_all';
import { getFrenchLessonIntroScreens } from './lesson_intro_screens_fr';
import type { IntroLine, LessonIntroScreen } from './lesson_data_types';
import { frenchStudyActive } from './spanish_content_gate';
import { lessonTheoryXpClaimedKey } from './target_storage_keys';
import {
  frenchLessonSupportGateCopy,
  lessonSupportContentAvailableForTarget,
} from './lesson_support_target_gate';
import { safeRouterBack } from './navigation_back';

// ─── UI компоненты ────────────────────────────────────────────────────────────

/*
 * Правила заполнения THEORY:
 * - В RU/UK формулах локализуем служебные слова: "кто", "описание", "вопрос", "действие".
 *   Не пишем для новичков "who + description", если это не слова из собираемой английской фразы.
 * - Английскими оставляем только реальные элементы конструкции: am/is/are, not, do/does, will,
 *   местоимения и сами примеры.
 * - Один блок = одна мысль. Table — для формул и сравнений, Warn — только для типичных ошибок,
 *   Tip — для короткого правила, которое надо держать в голове.
 * - Не задаем цвета внутри контента. Визуальный смысл задают компоненты ниже.
 */

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
const ROLE_LINK_BE = ['am', 'is', 'are'] as const;
const ROLE_LINK_IS_ARE = ['is', 'are'] as const;
const ROLE_LINK_IS_ARE_NOT = ['is', 'are', 'not'] as const;
const TABLE_COL_MIN_W = 132;

// Светлость определяем по реальной яркости фона карточки, а не по именам тем
// (ocean/sakura — легаси, в типе ThemeMode их нет; раньше ветка была мёртвой).
function isLightSurface(bg?: string): boolean {
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

function theoryColors(t: Theme, themeMode: ThemeMode) {
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

function TheoryInlineText({
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

function Section({ title, t, f }: { title: string; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <Text style={{ color: c.primary, fontSize: f.h2, fontWeight: '800', marginTop: 24, marginBottom: 10, borderBottomWidth: 0.5, borderBottomColor: c.border, paddingBottom: 8 }} maxFontSizeMultiplier={1.1}>
      {title}
    </Text>
  );
}

function Body({ text, t, f }: { text: string; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <View style={{ marginBottom: 10 }}>
      <TheoryInlineText text={text} t={t} f={f} baseColor={c.body} lineHeight={Math.round(f.body * 1.55)} />
    </View>
  );
}

function Example({ eng, rus, t, f }: { eng: string; rus: string; t: Theme; f: any }) {
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

function Warn({ text, t, f }: { text: string; t: Theme; f: any }) {
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

function Tip({ text, t, f }: { text: string; t: Theme; f: any }) {
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
function Table({ rows, t, f }: { rows: string[][]; t: Theme; f?: any }) {
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
      <View style={{ borderRadius: 10, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        <Animated.ScrollView
          horizontal
          decelerationRate="normal"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
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
function ColoredPhrase({
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

/** Цветная формула из блоков-ролей: [предмет] + [связка] + [V3] → пример. */
type FormulaSlot = { text: string; sub?: string; role: 'subject' | 'link' | 'verb' | 'neutral' };
function Formula({ slots, example, t, f }: { slots: FormulaSlot[]; example?: string; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  const isLight = isLightSurface(t?.bgCard);
  const roleStyle = (role: FormulaSlot['role']) => {
    if (role === 'subject') return { fg: c.roleSubject, bg: c.roleSubjectBg };
    if (role === 'link') return { fg: c.roleLink, bg: c.roleLinkBg };
    if (role === 'verb') return { fg: c.roleVerb, bg: c.roleVerbBg };
    return { fg: c.muted, bg: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' };
  };
  // Доступность: озвучиваем формулу словами (роль + текст), затем пример.
  const a11y = slots.map((s) => (s.sub ? `${s.text} (${s.sub})` : s.text)).join(' плюс ')
    + (example ? `. Пример: ${example}` : '');
  return (
    <View
      accessible
      accessibilityLabel={a11y}
      style={{ backgroundColor: c.cardBg, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, marginVertical: 10 }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        {slots.map((s, i) => {
          const rs = roleStyle(s.role);
          // На светлых темах добавляем тонкий бордер цвета роли, чтобы «кубик» читался при бледной заливке.
          const chipBorder = isLight && s.role !== 'neutral'
            ? { borderWidth: 1, borderColor: `${rs.fg}55` }
            : {};
          return (
            <React.Fragment key={`${s.text}-${i}`}>
              <View style={{ backgroundColor: rs.bg, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7, alignItems: 'center', ...chipBorder }}>
                <Text style={{ color: rs.fg, fontSize: f.body, fontWeight: '800' }} maxFontSizeMultiplier={1.15}>{s.text}</Text>
                {s.sub ? <Text style={{ color: rs.fg, fontSize: 10, opacity: 0.85, marginTop: 3 }} maxFontSizeMultiplier={1.1}>{s.sub}</Text> : null}
              </View>
              {i < slots.length - 1 ? <Text style={{ color: c.muted, fontSize: 16, fontWeight: '700' }}>+</Text> : null}
            </React.Fragment>
          );
        })}
      </View>
      {example ? (
        <View style={{ marginTop: 11, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: c.border }}>
          <Text style={{ color: c.body, fontSize: f.sub, textAlign: 'center' }} maxFontSizeMultiplier={1.2}>→ <Text style={{ fontWeight: '700', color: c.primary }}>{example}</Text></Text>
        </View>
      ) : null}
    </View>
  );
}

/** Мини-схема трансформации: верхняя строка → стрелка вниз → нижняя (для вопросов/отрицаний). */
function Transform({ from, to, t, label }: { from: React.ReactNode; to: React.ReactNode; t: Theme; label?: string }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <View
      accessible={!!label}
      accessibilityLabel={label}
      style={{ backgroundColor: c.cardBg, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 13, marginVertical: 10, alignItems: 'center' }}
    >
      <View style={{ alignItems: 'center' }}>{from}</View>
      <Ionicons name="arrow-down" size={18} color={c.muted} style={{ marginVertical: 5 }} />
      <View style={{ alignItems: 'center' }}>{to}</View>
    </View>
  );
}

/** Карточка примера eng→ru с цветовым разбором ролей. */
function ExampleCard({
  eng,
  rus,
  t,
  f,
  subject = [],
  link = [],
  verb = [],
}: {
  eng: string;
  rus: string;
  t: Theme;
  f: any;
  subject?: readonly string[];
  link?: readonly string[];
  verb?: readonly string[];
}) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <View
      accessible
      accessibilityLabel={`${eng}. ${rus}`}
      style={{ backgroundColor: c.cardBg, borderRadius: 10, borderWidth: 0.5, borderColor: c.border, borderLeftWidth: 3, borderLeftColor: `${c.roleVerb}99`, paddingVertical: 9, paddingHorizontal: 11, marginBottom: 7 }}
    >
      <ColoredPhrase text={eng} t={t} f={f} subject={subject} link={link} verb={verb} />
      <Text style={{ color: c.muted, fontSize: f.sub - 1, marginTop: 2 }} maxFontSizeMultiplier={1.2}>{rus}</Text>
    </View>
  );
}

/** Две карточки рядом (например is / are) — каждая с тегом, описанием и списком. */
type DuoColumn = { tag: string; tagRole?: 'subject' | 'link' | 'verb'; desc: string; items: string[]; highlight?: string };
function DuoCards({ left, right, t, f }: { left: DuoColumn; right: DuoColumn; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  const tagColors = (role?: DuoColumn['tagRole']) => {
    if (role === 'link') return { fg: c.roleLink, bg: c.roleLinkBg };
    if (role === 'verb') return { fg: c.roleVerb, bg: c.roleVerbBg };
    return { fg: c.roleSubject, bg: c.roleSubjectBg };
  };
  const renderCol = (col: DuoColumn) => {
    const tc = tagColors(col.tagRole);
    const hi = col.highlight?.toLowerCase();
    return (
      <View style={{ flex: 1, backgroundColor: c.cardBg, borderRadius: 12, borderWidth: 0.5, borderColor: c.border, padding: 11 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: tc.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 }}>
          <Text style={{ color: tc.fg, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.15}>{col.tag}</Text>
        </View>
        <Text style={{ color: c.muted, fontSize: f.caption, marginBottom: 7 }} maxFontSizeMultiplier={1.2}>{col.desc}</Text>
        {col.items.map((it, i) => {
          const tokens = it.split(/(\s+)/);
          return (
            <Text
              key={i}
              accessibilityLabel={it}
              style={{ color: c.body, fontSize: f.sub - 1, paddingVertical: 2.5, lineHeight: Math.round(f.sub * 1.3) }}
              maxFontSizeMultiplier={1.15}
            >
              {tokens.map((tok, j) => {
                const bare = tok.replace(/[.,!?;:]/g, '').toLowerCase();
                return hi && bare === hi
                  ? <Text key={`${tok}-${j}`} style={{ color: tc.fg, fontWeight: '700' }}>{tok}</Text>
                  : <Text key={`${tok}-${j}`}>{tok}</Text>;
              })}
            </Text>
          );
        })}
      </View>
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
      {renderCol(left)}
      {renderCol(right)}
    </View>
  );
}

/** Раскрывающаяся секция (аккордеон). defaultOpen — раскрыт по умолчанию (гибрид). */
function Accordion({
  title,
  count,
  icon = 'list',
  iconColor,
  defaultOpen = false,
  t,
  f,
  children,
}: {
  title: string;
  count?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  defaultOpen?: boolean;
  t: Theme;
  f: any;
  children: React.ReactNode;
}) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ backgroundColor: c.cardBg, borderRadius: 12, borderWidth: 0.5, borderColor: c.border, marginVertical: 8, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: defaultOpen ? c.surfaceBg : 'transparent' }}
      >
        <Ionicons name={icon} size={17} color={iconColor ?? c.accent} />
        <Text style={{ flex: 1, color: c.primary, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2} numberOfLines={2}>{title}</Text>
        {count ? <Text style={{ color: c.muted, fontSize: f.caption }} maxFontSizeMultiplier={1.1}>{count}</Text> : null}
        <Ionicons name="chevron-down" size={17} color={c.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>
      {open ? <View style={{ paddingHorizontal: 14, paddingBottom: 13, paddingTop: 2 }}>{children}</View> : null}
    </View>
  );
}

/** Чип-форма глагола вида «base → form» для сеток V3/-ing. */
function FormChips({ pairs, t, f }: { pairs: Array<[string, string]>; t: Theme; f: any }) {
  const { themeMode } = useTheme();
  const c = useMemo(() => theoryColors(t, themeMode), [t, themeMode]);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {pairs.map(([base, form]) => (
        <View key={base} style={{ backgroundColor: c.surfaceBg, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 }}>
          <Text style={{ fontSize: f.sub - 1 }} maxFontSizeMultiplier={1.15}>
            <Text style={{ color: c.muted }}>{base} → </Text>
            <Text style={{ color: c.roleVerb, fontWeight: '700' }}>{form}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Контент уроков ───────────────────────────────────────────────────────────

/** Урок 1 — местоимения и To Be: полная теория на испанском. */
function renderLesson1TheoryEs(t: Theme, f: any): React.ReactNode[] {
  return [
    <Section key="s1" t={t} f={f} title="1. La idea principal de la lección" />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text="En esta lección aprendes a formar una de las frases inglesas más simples: quién + am/is/are + descripción o lugar. En español muchas veces decimos algo parecido con ser o estar: «Estoy aquí», «Él está ocupado», «Es importante». En inglés, en este patrón, entre la persona o cosa y la descripción necesitas am, is o are."
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text="❌ I here → ✅ I am here. En inglés no puedes poner simplemente «yo» y «aquí» uno al lado del otro. Necesitas am."
    />,

    <Section key="s2" t={t} f={f} title="2. Tres formas: am, is, are" />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text="To Be cambia en presente según de quién hablas. En esta lección no hace falta traducir am / is / are por separado; es mejor reconocerlos como una parte obligatoria de la frase inglesa."
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        ['¿Quién?', 'To Be', 'Ejemplo de la lección'],
        ['I', 'am', 'I am here'],
        ['He / She / It', 'is', 'He is busy / She is calm / It is important'],
        ['You / We / They', 'are', 'You are ready / We are safe / They are happy'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text="Recuerda el patrón corto: I → am. He / She / It → is. You / We / They → are."
    />,

    <Section key="s3" t={t} f={f} title="3. Qué puede ir después de To Be" />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text="En las frases de esta lección, después de am / is / are suele ir una palabra que describe estado, cualidad o lugar."
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        ['Tipo', 'Qué significa', 'Ejemplos'],
        ['Estado', 'cómo se siente alguien o en qué estado está', 'I am tired / She is sad / They are hungry'],
        ['Cualidad', 'cómo es alguien o algo', 'He is strong / She is smart / It is important'],
        ['Lugar', 'dónde está alguien o algo', 'I am here / They are outside / He is inside'],
        ['Situación', 'rol, relación o situación general', 'We are friends / You are right / We are together'],
      ]}
    />,

    <Section key="s4" t={t} f={f} title="4. It is = esto / eso" />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text="Cuando evalúas una situación o una cosa, el inglés usa a menudo It is. En español puede sonar como «esto es», «eso es» o simplemente «es»."
    />,

    <Example key="e1" t={t} f={f} eng="It is important" rus="Es importante" />,
    <Example key="e2" t={t} f={f} eng="It is cheap" rus="Es barato" />,
    <Example key="e3" t={t} f={f} eng="It is free" rus="Es gratis" />,
    <Example key="e4" t={t} f={f} eng="It is broken" rus="Está roto" />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text="It no siempre se traduce como «ello». En frases de evaluación, It is muchas veces funciona como «esto / eso es» o simplemente «es»."
    />,

    <Section key="s5" t={t} f={f} title="5. Por qué la traducción no siempre es literal" />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text="La frase inglesa a menudo describe un estado con To Be, mientras que en español podemos traducirla con un verbo o una expresión natural. Eso es normal. Lo importante es ver la construcción inglesa."
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        ['Lógica inglesa', 'Traducción natural'],
        ['You are late', 'Llegas tarde'],
        ['She is nervous', 'Ella está nerviosa'],
        ['We are safe', 'Estamos a salvo'],
        ['You are right', 'Tienes razón / Tiene razón'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text="No intentes traducir palabra por palabra de forma mecánica. You are late no se traduce naturalmente como «tú eres tarde». Es «llegas tarde»."
    />,

    <Section key="s6" t={t} f={f} title="6. Broken, tired, ready son estados" />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text="Algunas palabras parecen una acción o el resultado de una acción, pero en esta lección funcionan como descripción de estado. Después de To Be responden a la pregunta «¿cómo está?» o «¿en qué estado está?»."
    />,

    <Example key="e5" t={t} f={f} eng="I am tired" rus="Estoy cansado / cansada" />,
    <Example key="e6" t={t} f={f} eng="It is broken" rus="Está roto" />,
    <Example key="e7" t={t} f={f} eng="She is ready" rus="Ella está lista" />,
    <Example key="e8" t={t} f={f} eng="They are calm" rus="Están tranquilos" />,

    <Section key="s7" t={t} f={f} title="7. Errores frecuentes" />,

    <Warn key="w3" t={t} f={f} text="❌ I is ready → ✅ I am ready. Con I, en este patrón, va am." />,
    <Warn key="w4" t={t} f={f} text="❌ He are busy → ✅ He is busy. Con he / she / it, en este patrón, va is." />,
    <Warn key="w5" t={t} f={f} text="❌ They is happy → ✅ They are happy. Con they / we / you, en este patrón, va are." />,
    <Warn key="w6" t={t} f={f} text="❌ It important → ✅ It is important. Si aparece It + descripción, necesitas is." />,

    <Section key="s8" t={t} f={f} title="8. Qué debes llevarte de la lección" />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text="En esta lección no solo memorizas frases. Construyes el armazón básico de la frase inglesa: I am, He is, She is, It is, You are, We are, They are. Después puedes añadir estados, lugares, cualidades y situaciones simples."
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text="Antes de practicar, ten en mente una fórmula: quién + am/is/are + descripción. I am ready. She is tired. We are here. It is important."
    />,
  ];
}
type TheoryContent = {
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

function theoryTitleEsFor(lessonId: number, theory?: TheoryContent): string {
  if (theory?.titleES) {
    const title = theory.titleES;
    return title;
  }
  return lessonId >= 1 && lessonId <= 32
    ? lessonNamesForLang('es')[lessonId - 1] ?? `Lecci\u00f3n ${lessonId}`
    : `Lecci\u00f3n ${lessonId}`;
}

const THEORY_TITLE_PLANNED: Record<number, {
  ptBR: string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}> = {
  1: { ptBR: 'To Be: afirmações', vi: 'To Be: câu khẳng định', id: 'To Be: pernyataan', tr: 'To Be: olumlu cümleler', pl: 'To Be: zdania twierdzące' },
  2: { ptBR: 'To Be: negações e perguntas', vi: 'To Be: phủ định và câu hỏi', id: 'To Be: negatif dan pertanyaan', tr: 'To Be: olumsuz ve soru cümleleri', pl: 'To Be: przeczenia i pytania' },
  3: { ptBR: 'Present Simple: afirmações', vi: 'Present Simple: câu khẳng định', id: 'Present Simple: pernyataan', tr: 'Present Simple: olumlu cümleler', pl: 'Present Simple: zdania twierdzące' },
  4: { ptBR: 'Present Simple: negação', vi: 'Present Simple: phủ định', id: 'Present Simple: negatif', tr: 'Present Simple: olumsuz cümleler', pl: 'Present Simple: przeczenia' },
  5: { ptBR: 'Present Simple: perguntas', vi: 'Present Simple: câu hỏi', id: 'Present Simple: pertanyaan', tr: 'Present Simple: sorular', pl: 'Present Simple: pytania' },
  6: { ptBR: 'Perguntas especiais: Where, What, When, Why, How', vi: 'Câu hỏi đặc biệt: Where, What, When, Why, How', id: 'Pertanyaan khusus: Where, What, When, Why, How', tr: 'Özel sorular: Where, What, When, Why, How', pl: 'Pytania szczegółowe: Where, What, When, Why, How' },
  7: { ptBR: 'Have / Has: eu tenho', vi: 'Have / Has: tôi có', id: 'Have / Has: saya punya', tr: 'Have / Has: sahip olmak', pl: 'Have / Has: mam' },
  8: { ptBR: 'Preposições de tempo: at, in, on', vi: 'Giới từ chỉ thời gian: at, in, on', id: 'Preposisi waktu: at, in, on', tr: 'Zaman edatları: at, in, on', pl: 'Przyimki czasu: at, in, on' },
  9: { ptBR: 'There is / There are: existe / fica', vi: 'There is / There are: có / nằm ở', id: 'There is / There are: ada / terletak', tr: 'There is / There are: var / bulunur', pl: 'There is / There are: jest / znajduje się' },
  10: { ptBR: 'Verbos modais: can, should, must, have to', vi: 'Động từ khuyết thiếu: can, should, must, have to', id: 'Kata kerja modal: can, should, must, have to', tr: 'Modal fiiller: can, should, must, have to', pl: 'Czasowniki modalne: can, should, must, have to' },
  11: { ptBR: 'Past Simple: verbos regulares', vi: 'Past Simple: động từ có quy tắc', id: 'Past Simple: kata kerja beraturan', tr: 'Past Simple: düzenli fiiller', pl: 'Past Simple: czasowniki regularne' },
  12: { ptBR: 'Past Simple: verbos irregulares', vi: 'Past Simple: động từ bất quy tắc', id: 'Past Simple: kata kerja tidak beraturan', tr: 'Past Simple: düzensiz fiiller', pl: 'Past Simple: czasowniki nieregularne' },
  13: { ptBR: 'Future Simple: will', vi: 'Future Simple: will', id: 'Future Simple: will', tr: 'Future Simple: will', pl: 'Future Simple: will' },
  14: { ptBR: 'Comparação: cheaper, better, the best', vi: 'So sánh: cheaper, better, the best', id: 'Perbandingan: cheaper, better, the best', tr: 'Karşılaştırma: cheaper, better, the best', pl: 'Porównania: cheaper, better, the best' },
  15: { ptBR: 'Formas possessivas: my e mine', vi: 'Dạng sở hữu: my và mine', id: 'Bentuk kepemilikan: my dan mine', tr: 'İyelik biçimleri: my ve mine', pl: 'Formy dzierżawcze: my i mine' },
  16: { ptBR: 'Phrasal verbs', vi: 'Cụm động từ', id: 'Phrasal verbs', tr: 'Phrasal verbs', pl: 'Czasowniki frazowe' },
  17: { ptBR: 'Present Continuous: ações agora', vi: 'Present Continuous: hành động đang diễn ra', id: 'Present Continuous: tindakan sekarang', tr: 'Present Continuous: şu anda olan eylemler', pl: 'Present Continuous: czynności teraz' },
  18: { ptBR: 'Pedidos, comandos e sugestões', vi: 'Lời nhờ, mệnh lệnh và gợi ý', id: 'Permintaan, perintah, dan saran', tr: 'Ricalar, emirler ve öneriler', pl: 'Prośby, polecenia i sugestie' },
  19: { ptBR: 'Preposições de lugar', vi: 'Giới từ chỉ nơi chốn', id: 'Preposisi tempat', tr: 'Yer edatları', pl: 'Przyimki miejsca' },
  20: { ptBR: 'Artigos: a, an, the', vi: 'Mạo từ: a, an, the', id: 'Artikel: a, an, the', tr: 'Artikeller: a, an, the', pl: 'Przedimki: a, an, the' },
  21: { ptBR: 'Pronomes indefinidos', vi: 'Đại từ bất định', id: 'Kata ganti tak tentu', tr: 'Belirsiz zamirler', pl: 'Zaimki nieokreślone' },
  22: { ptBR: 'Gerúndio: -ing como ideia de ação', vi: 'Danh động từ: -ing như một ý hành động', id: 'Gerund: -ing sebagai ide tindakan', tr: 'Gerund: eylem fikri olarak -ing', pl: 'Gerund: -ing jako idea czynności' },
  23: { ptBR: 'Voz passiva: Present Simple', vi: 'Câu bị động: Present Simple', id: 'Kalimat pasif: Present Simple', tr: 'Edilgen çatı: Present Simple', pl: 'Strona bierna: Present Simple' },
  24: { ptBR: 'Present Perfect: have / has + V3', vi: 'Present Perfect: have / has + V3', id: 'Present Perfect: have / has + V3', tr: 'Present Perfect: have / has + V3', pl: 'Present Perfect: have / has + V3' },
  25: { ptBR: 'Past Continuous: ação em progresso', vi: 'Past Continuous: hành động đang diễn ra trong quá khứ', id: 'Past Continuous: tindakan sedang berlangsung', tr: 'Past Continuous: devam eden geçmiş eylem', pl: 'Past Continuous: czynność w trakcie' },
  26: { ptBR: 'Orações condicionais: if', vi: 'Câu điều kiện: if', id: 'Kalimat pengandaian: if', tr: 'Koşul cümleleri: if', pl: 'Zdania warunkowe: if' },
  27: { ptBR: 'Discurso indireto: said that / told me that', vi: 'Câu tường thuật: said that / told me that', id: 'Kalimat tidak langsung: said that / told me that', tr: 'Dolaylı anlatım: said that / told me that', pl: 'Mowa zależna: said that / told me that' },
  28: { ptBR: 'Pronomes reflexivos: myself, yourself', vi: 'Đại từ phản thân: myself, yourself', id: 'Kata ganti refleksif: myself, yourself', tr: 'Dönüşlü zamirler: myself, yourself', pl: 'Zaimki zwrotne: myself, yourself' },
  29: { ptBR: 'Used to: antes era assim, agora não', vi: 'Used to: trước đây có, bây giờ không', id: 'Used to: dulu begitu, sekarang tidak', tr: 'Used to: eskiden vardı, şimdi yok', pl: 'Used to: kiedyś tak było, teraz nie' },
  30: { ptBR: 'Orações relativas: who, that, where, whose', vi: 'Mệnh đề quan hệ: who, that, where, whose', id: 'Klausa relatif: who, that, where, whose', tr: 'İlgi cümleleri: who, that, where, whose', pl: 'Zdania względne: who, that, where, whose' },
  31: { ptBR: 'Construções complexas: make, let, feel, hear, would rather', vi: 'Cấu trúc phức tạp: make, let, feel, hear, would rather', id: 'Konstruksi kompleks: make, let, feel, hear, would rather', tr: 'Karmaşık yapılar: make, let, feel, hear, would rather', pl: 'Złożone konstrukcje: make, let, feel, hear, would rather' },
  32: { ptBR: 'Aula final mista', vi: 'Bài học tổng hợp cuối cùng', id: 'Pelajaran campuran terakhir', tr: 'Son karma ders', pl: 'Ostatnia lekcja mieszana' },
};

function plannedTheoryTitle(lessonId: number, locale: keyof (typeof THEORY_TITLE_PLANNED)[number], backup: string): string {
  return THEORY_TITLE_PLANNED[lessonId]?.[locale] ?? backup;
}

type PlannedTheoryLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

function plannedTheoryLocale(lang: Lang): PlannedTheoryLocale | null {
  if (lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl') return lang;
  return null;
}

function plannedTheoryTitleKey(locale: PlannedTheoryLocale): keyof (typeof THEORY_TITLE_PLANNED)[number] {
  return locale === 'pt-BR' ? 'ptBR' : locale;
}

function theoryTitleForLang(lessonId: number, theory: TheoryContent, lang: Lang, spanishBackup: string): string {
  const plannedLocale = plannedTheoryLocale(lang);
  if (!plannedLocale) {
    const legacyLang = legacyUiLang(lang);
    const primaryTitle = theory.titleRU;
    const secondaryTitle = theory.titleUK;
    const tertiaryTitle = spanishBackup;
    if (legacyLang === 'uk') return secondaryTitle;
    if (legacyLang === 'es') return tertiaryTitle;
    return primaryTitle;
  }
  const explicitTitle =
    plannedLocale === 'pt-BR' ? theory.titlePtBr
      : plannedLocale === 'vi' ? theory.titleVi
        : plannedLocale === 'id' ? theory.titleId
          : plannedLocale === 'tr' ? theory.titleTr
            : theory.titlePl;
  return explicitTitle ?? plannedTheoryTitle(lessonId, plannedTheoryTitleKey(plannedLocale), spanishBackup);
}

function hasSpanishTheoryContent(theory?: TheoryContent): boolean {
  const hasRenderer = typeof theory?.renderES === 'function';
  return theory?.spanishStatus === 'ready' && hasRenderer;
}

function introLinePlain(line: IntroLine): string {
  return line.text ?? line.parts?.map((part) => part.text).join('') ?? '';
}

function legacyUiLang(lang: Lang): 'ru' | 'uk' | 'es' {
  const legacyByLang: Record<Lang, 'ru' | 'uk' | 'es'> = {
    ru: 'ru',
    uk: 'uk',
    es: 'es',
    'pt-BR': 'ru',
    vi: 'ru',
    id: 'ru',
    tr: 'ru',
    pl: 'ru',
  };
  return legacyByLang[lang];
}

function firstTheoryValue<T>(...values: Array<T | undefined>): T | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function introTitleForUi(screen: LessonIntroScreen, lang: Lang): string {
  const plannedTitles: Record<PlannedTheoryLocale, string | undefined> = {
    'pt-BR': screen.titlePtBr,
    vi: screen.titleVi,
    id: screen.titleId,
    tr: screen.titleTr,
    pl: screen.titlePl,
  };
  const plannedLocale = plannedTheoryLocale(lang);
  if (plannedLocale) return plannedTitles[plannedLocale] ?? '';

  const legacyLang = legacyUiLang(lang);
  const primaryTitle = firstTheoryValue(screen.titleRU, '') ?? '';
  const secondaryTitle = firstTheoryValue(screen.titleUK, primaryTitle) ?? primaryTitle;
  const tertiaryTitle = firstTheoryValue(screen.titleES, primaryTitle) ?? primaryTitle;
  if (legacyLang === 'uk') return secondaryTitle;
  if (legacyLang === 'es') return tertiaryTitle;
  return primaryTitle;
}

function introLinesForUi(screen: LessonIntroScreen, lang: Lang): IntroLine[] {
  const plannedLines: Record<PlannedTheoryLocale, IntroLine[] | undefined> = {
    'pt-BR': screen.linesPtBr,
    vi: screen.linesVi,
    id: screen.linesId,
    tr: screen.linesTr,
    pl: screen.linesPl,
  };
  const plannedLocale = plannedTheoryLocale(lang);
  if (plannedLocale) return plannedLines[plannedLocale] ?? [];

  const legacyLang = legacyUiLang(lang);
  const primaryLines = firstTheoryValue(screen.linesRU, []) ?? [];
  const secondaryLines = firstTheoryValue(screen.linesUK, primaryLines) ?? primaryLines;
  const tertiaryLines = firstTheoryValue(screen.linesES, primaryLines) ?? primaryLines;
  if (legacyLang === 'uk') return secondaryLines;
  if (legacyLang === 'es') return tertiaryLines;
  return primaryLines;
}

function introTextForUi(screen: LessonIntroScreen, lang: Lang): string {
  const plannedText: Record<PlannedTheoryLocale, string | undefined> = {
    'pt-BR': screen.textPtBr,
    vi: screen.textVi,
    id: screen.textId,
    tr: screen.textTr,
    pl: screen.textPl,
  };
  const plannedLocale = plannedTheoryLocale(lang);
  let explicit = plannedLocale ? plannedText[plannedLocale] : undefined;
  if (!plannedLocale) {
    const legacyLang = legacyUiLang(lang);
    const primaryText = firstTheoryValue(screen.textRU, screen.textUK);
    const secondaryText = firstTheoryValue(screen.textUK, screen.textRU);
    const tertiaryText = firstTheoryValue(screen.textES, screen.textRU);
    if (legacyLang === 'uk') {
      explicit = secondaryText;
    } else if (legacyLang === 'es') {
      explicit = tertiaryText;
    } else {
      explicit = primaryText;
    }
  }
  if (explicit?.trim()) return explicit;
  return introLinesForUi(screen, lang).map(introLinePlain).filter(Boolean).join(' ');
}

function introExampleEnglish(example: any): string {
  if (typeof example?.en === 'string') return example.en;
  if (Array.isArray(example?.en)) {
    return example.en.map((part: { text?: string }) => part.text ?? '').join('');
  }
  return '';
}

function introExampleTranslation(example: any, lang: Lang): string {
  const plannedTranslations: Record<PlannedTheoryLocale, string | undefined> = {
    'pt-BR': example?.['pt-BR'] ?? example?.trPtBr,
    vi: example?.vi ?? example?.trVi,
    id: example?.id ?? example?.trId,
    tr: example?.tr ?? example?.trTr,
    pl: example?.pl ?? example?.trPl,
  };
  const plannedLocale = plannedTheoryLocale(lang);
  if (plannedLocale) return plannedTranslations[plannedLocale] ?? '';

  const legacyLang = legacyUiLang(lang);
  const primaryTranslation = firstTheoryValue(example?.ru, example?.trRU, example?.uk, example?.trUK, '');
  const secondaryTranslation = firstTheoryValue(example?.uk, example?.trUK, example?.ru, example?.trRU, '');
  const tertiaryTranslation = firstTheoryValue(example?.es, example?.trES, example?.ru, example?.trRU, '');
  if (legacyLang === 'uk') return secondaryTranslation;
  if (legacyLang === 'es') return tertiaryTranslation;
  return primaryTranslation;
}

function renderFrenchTheoryFromIntroScreens(
  screens: LessonIntroScreen[],
  t: Theme,
  lang: Lang,
  f: any,
): React.ReactNode[] {
  return screens.flatMap((screen, screenIndex) => {
    const lines = introLinesForUi(screen, lang)
      .map((line, lineIndex) => ({ line, text: introLinePlain(line).trim(), lineIndex }))
      .filter((entry) => entry.text.length > 0 && entry.line.type !== 'spacer');
    const examples = screen.examples?.filter((example) => introExampleEnglish(example).trim()).slice(0, 3) ?? [];
    return [
      <Section
        key={`fr-section-${screen.screenId ?? screenIndex}`}
        t={t}
        f={f}
        title={introTitleForUi(screen, lang)}
      />,
      <Body
        key={`fr-body-${screen.screenId ?? screenIndex}`}
        t={t}
        f={f}
        text={introTextForUi(screen, lang)}
      />,
      ...lines.slice(0, 8).map(({ line, text, lineIndex }) => {
        if (line.type === 'wrong') {
          return <Warn key={`fr-line-${screen.screenId}-${lineIndex}`} t={t} f={f} text={text} />;
        }
        if (line.type === 'tip') {
          return <Tip key={`fr-line-${screen.screenId}-${lineIndex}`} t={t} f={f} text={text} />;
        }
        return <Body key={`fr-line-${screen.screenId}-${lineIndex}`} t={t} f={f} text={text} />;
      }),
      ...examples.map((example, exampleIndex) => (
        <Example
          key={`fr-example-${screen.screenId}-${exampleIndex}`}
          t={t}
          f={f}
          eng={introExampleEnglish(example)}
          rus={introExampleTranslation(example, lang)}
        />
      )),
    ];
  });
}


const THEORY: Record<number, TheoryContent> = {
1: {
  titleRU: 'To Be: утверждения',
  titleUK: 'To Be: ствердження',
  titleES: 'To Be: afirmaciones',
  titlePtBr: "To Be: afirmações",
  titleVi: "To Be: câu khẳng định",
  titleId: "To Be: pernyataan",
  titleTr: "To Be: olumlu cümleler",
  titlePl: "To Be: zdania twierdzące",
  spanishStatus: 'ready',
  renderES: renderLesson1TheoryEs,
  render: (t, isUK, f) => [
    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати одну з найпростіших англійських фраз: хто + am/is/are + опис. Українською або російською ми часто кажемо коротко: «Я тут», «Він зайнятий», «Це важливо». В англійській у такій фразі між людиною або предметом і описом потрібне am, is або are.'
        : 'В этом уроке ты учишься строить одну из самых простых английских фраз: кто + am/is/are + описание. По-русски мы часто говорим коротко: «Я здесь», «Он занят», «Это важно». В английском в такой фразе между человеком или предметом и описанием нужно am, is или are.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Без англійської логіки' : 'Без английской логики', isUK ? 'Правильно' : 'Правильно'],
        ['I here', 'I am here'],
        ['He busy', 'He is busy'],
        ['We ready', 'We are ready'],
        ['It important', 'It is important'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I here → ✅ I am here. В англійській не можна просто поставити «я» і «тут» поруч. Потрібен am.'
        : '❌ I here → ✅ I am here. В английском нельзя просто поставить «я» и «здесь» рядом. Нужен am.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Головна формула уроку дуже проста: хто або що + правильна форма To Be + опис. Опис може показувати стан, якість, місце або ситуацію.'
        : 'Главная формула урока очень простая: кто или что + правильная форма To Be + описание. Описание может показывать состояние, качество, место или ситуацию.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто / що' : 'Кто / что', 'To Be', isUK ? 'Опис' : 'Описание', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'am', 'here', 'I am here'],
        ['You', 'are', 'ready', 'You are ready'],
        ['He', 'is', 'busy', 'He is busy'],
        ['She', 'is', 'calm', 'She is calm'],
        ['We', 'are', 'safe', 'We are safe'],
        ['They', 'are', 'happy', 'They are happy'],
        ['It', 'is', 'important', 'It is important'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Запам\'ятай не окремі слова, а блоки: I am, he is, she is, it is, you are, we are, they are.'
        : 'Запоминай не отдельные слова, а блоки: I am, he is, she is, it is, you are, we are, they are.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Три форми: am, is, are' : '3. Три формы: am, is, are'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'To Be у теперішньому часі змінюється залежно від того, про кого ти говориш. Важливо не перекладати am, is, are окремо, а впізнавати їх як обов\'язкову частину англійського речення.'
        : 'To Be в настоящем времени меняется в зависимости от того, о ком ты говоришь. Важно не переводить am, is, are отдельно, а узнавать их как обязательную часть английского предложения.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', 'To Be', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        ['I', 'am', 'I am here / I am okay / I am ready / I am tired / I am strong / I am sick'],
        ['He', 'is', 'He is busy / He is sick / He is strong / He is inside / He is angry / He is calm'],
        ['She', 'is', 'She is calm / She is sad / She is tired / She is happy / She is smart / She is ready'],
        ['It', 'is', 'It is important / It is cheap / It is free / It is serious / It is near / It is broken / It is empty'],
        ['You', 'are', 'You are ready / You are right / You are late / You are kind / You are okay / You are safe'],
        ['We', 'are', 'We are together / We are safe / We are friends / We are here / We are inside / We are calm / We are ready / We are late / We are okay'],
        ['They', 'are', 'They are happy / They are outside / They are calm / They are ready / They are tired / They are hungry'],
      ]}
    />,

    <Warn key="w2" t={t} f={f} text={isUK ? '❌ I is ready → ✅ I am ready. З I завжди am.' : '❌ I is ready → ✅ I am ready. С I всегда am.'} />,
    <Warn key="w3" t={t} f={f} text={isUK ? '❌ He are busy → ✅ He is busy. З he / she / it потрібне is.' : '❌ He are busy → ✅ He is busy. С he / she / it нужно is.'} />,
    <Warn key="w4" t={t} f={f} text={isUK ? '❌ They is happy → ✅ They are happy. З you / we / they потрібне are.' : '❌ They is happy → ✅ They are happy. С you / we / they нужно are.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. I am — коли говориш про себе' : '4. I am - когда говоришь о себе'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Коли ти говориш про себе, використовуй I am. У цьому уроці після I am стоять місце, стан або якість.' : 'Когда ты говоришь о себе, используй I am. В этом уроке после I am стоят место, состояние или качество.'} />,
    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I am here', isUK ? 'Я тут' : 'Я здесь'],
        ['I am okay', isUK ? 'Я в порядку' : 'Я в порядке'],
        ['I am ready', isUK ? 'Я готовий' : 'Я готов'],
        ['I am tired', isUK ? 'Я втомлений' : 'Я устал'],
        ['I am outside', isUK ? 'Я зовні' : 'Я снаружи'],
        ['I am strong', isUK ? 'Я сильний' : 'Я сильный'],
        ['I am sick', isUK ? 'Я хворий' : 'Я болен'],
      ]}
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. He is, She is, It is' : '5. He is, She is, It is'} />,
    <Body key="b5a" t={t} f={f} text={isUK ? 'З he, she та it використовується is. He — для чоловіка або хлопця. She — для жінки або дівчини. It — для предмета, ситуації або слова «це».' : 'С he, she и it используется is. He - для мужчины или парня. She - для женщины или девушки. It - для предмета, ситуации или слова «это».'} />,
    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        ['He is', 'He is busy / He is sick / He is strong / He is inside / He is angry / He is calm'],
        ['She is', 'She is calm / She is sad / She is tired / She is happy / She is smart / She is ready'],
        ['It is', 'It is important / It is cheap / It is free / It is serious / It is near / It is broken / It is empty'],
      ]}
    />,
    <Tip key="tip2" t={t} f={f} text={isUK ? 'It у цьому уроці часто перекладається як «це»: It is important - це важливо. It is broken - це зламано.' : 'It в этом уроке часто переводится как «это»: It is important - это важно. It is broken - это сломано.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. You are, We are, They are' : '6. You are, We are, They are'} />,
    <Body key="b6a" t={t} f={f} text={isUK ? 'З you, we та they використовується are. You може означати «ти» або «ви». We — «ми». They — «вони».' : 'С you, we и they используется are. You может означать «ты» или «вы». We - «мы». They - «они».'} />,
    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        ['You are', 'You are ready / You are right / You are late / You are kind / You are okay / You are safe'],
        ['We are', 'We are together / We are safe / We are friends / We are here / We are inside / We are calm / We are ready / We are late / We are okay'],
        ['They are', 'They are happy / They are outside / They are calm / They are ready / They are tired / They are hungry / They are together'],
      ]}
    />,
    <Tip key="tip3" t={t} f={f} text={isUK ? 'You are right може означати і «ти правий», і «ви праві». Англійське you працює для обох значень.' : 'You are right может означать и «ты прав», и «вы правы». Английское you работает для обоих значений.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Що може стояти після To Be' : '7. Что может стоять после To Be'} />,
    <Body key="b7a" t={t} f={f} text={isUK ? 'У фразах цього уроку після am, is та are стоїть не дія, а опис. Цей опис може показувати стан, якість, місце або ситуацію.' : 'Во фразах этого урока после am, is и are стоит не действие, а описание. Это описание может показывать состояние, качество, место или ситуацию.'} />,
    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип опису' : 'Тип описания', isUK ? 'Що означає' : 'Что означает', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        [isUK ? 'Стан людини' : 'Состояние человека', isUK ? 'як людина себе почуває або в якому стані знаходиться' : 'как человек себя чувствует или в каком состоянии находится', 'ready, busy, calm, happy, okay, tired, sick, sad, nervous, hungry, angry'],
        [isUK ? 'Якість або оцінка' : 'Качество или оценка', isUK ? 'який хтось або щось' : 'какой кто-то или что-то', 'important, cheap, free, serious, strong, kind, smart, broken, empty'],
        [isUK ? 'Місце' : 'Место', isUK ? 'де хтось або щось знаходиться' : 'где кто-то или что-то находится', 'here, outside, inside, near'],
        [isUK ? 'Ситуація або зв\'язок' : 'Ситуация или связь', isUK ? 'відношення, роль або загальний стан справ' : 'отношение, роль или общее положение дел', 'together, safe, friends, right, late, fine'],
      ]}
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Стан людини після To Be' : '8. Состояние человека после To Be'} />,
    <Body key="b8a" t={t} f={f} text={isUK ? 'Багато фраз уроку описують стан людини. В англійській для цього часто потрібна конструкція To Be + слово стану.' : 'Многие фразы урока описывают состояние человека. В английском для этого часто нужна конструкция To Be + слово состояния.'} />,
    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['You are ready', isUK ? 'Ти готовий' : 'Ты готов'],
        ['He is busy', isUK ? 'Він зайнятий' : 'Он занят'],
        ['She is calm', isUK ? 'Вона спокійна' : 'Она спокойна'],
        ['They are happy', isUK ? 'Вони щасливі' : 'Они счастливы'],
        ['I am okay', isUK ? 'Я в порядку' : 'Я в порядке'],
        ['She is tired', isUK ? 'Вона втомлена' : 'Она устала'],
        ['They are hungry', isUK ? 'Вони голодні' : 'Они голодны'],
      ]}
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Місце після To Be' : '9. Место после To Be'} />,
    <Body key="b9a" t={t} f={f} text={isUK ? 'Після To Be може стояти місце. У цьому уроці це here, outside, inside та near. Вони відповідають на питання «де?».' : 'После To Be может стоять место. В этом уроке это here, outside, inside и near. Они отвечают на вопрос «где?».'} />,
    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['here', isUK ? 'тут' : 'здесь', 'I am here / We are here'],
        ['outside', isUK ? 'зовні' : 'снаружи', 'They are outside / I am outside'],
        ['inside', isUK ? 'всередині' : 'внутри', 'We are inside / He is inside'],
        ['near', isUK ? 'близько' : 'близко', 'It is near'],
      ]}
    />,
    <Warn key="w5" t={t} f={f} text={isUK ? 'У цих фразах не додавай at, in або on до here, outside, inside, near. Вивчай саме ті блоки, які є в уроці: I am here, They are outside, He is inside, It is near.' : 'В этих фразах не добавляй at, in или on к here, outside, inside, near. Учи именно те блоки, которые есть в уроке: I am here, They are outside, He is inside, It is near.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. It is = це' : '10. It is = это'} />,
    <Body key="b10a" t={t} f={f} text={isUK ? 'Коли ти оцінюєш ситуацію або предмет, англійська часто використовує It is. Українською або російською це звучить як «це».' : 'Когда ты оцениваешь ситуацию или предмет, английский часто использует It is. По-русски это звучит как «это».'} />,
    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['It is important', isUK ? 'Це важливо' : 'Это важно'],
        ['It is cheap', isUK ? 'Це дешево' : 'Это дешево'],
        ['It is free', isUK ? 'Це безкоштовно' : 'Это бесплатно'],
        ['It is serious', isUK ? 'Це серйозно' : 'Это серьёзно'],
        ['It is near', isUK ? 'Це близько' : 'Это близко'],
        ['It is broken', isUK ? 'Це зламано' : 'Это сломано'],
        ['It is empty', isUK ? 'Це порожньо' : 'Это пусто'],
      ]}
    />,
    <Tip key="tip4" t={t} f={f} text={isUK ? 'It не завжди перекладається як «воно». У таких фразах It is часто просто означає «це».' : 'It не всегда переводится как «оно». В таких фразах It is часто просто означает «это».'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Broken, tired, ready — це стани' : '11. Broken, tired, ready - это состояния'} />,
    <Body key="b11a" t={t} f={f} text={isUK ? 'Деякі слова виглядають як дія або результат дії, але в цьому уроці вони працюють як опис стану. Після To Be вони відповідають на питання «який?» або «в якому стані?».' : 'Некоторые слова выглядят как действие или результат действия, но в этом уроке они работают как описание состояния. После To Be они отвечают на вопрос «какой?» или «в каком состоянии?».'} />,
    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що це описує' : 'Что это описывает'],
        ['I am tired', isUK ? 'мій стан' : 'моё состояние'],
        ['She is ready', isUK ? 'її стан готовності' : 'её состояние готовности'],
        ['It is broken', isUK ? 'стан предмета' : 'состояние предмета'],
        ['It is empty', isUK ? 'стан предмета або місця' : 'состояние предмета или места'],
      ]}
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Friends, together, safe, right, late' : '12. Friends, together, safe, right, late'} />,
    <Body key="b12a" t={t} f={f} text={isUK ? 'У частині фраз після To Be стоїть не просто якість, а ситуація або відношення: ми друзі, ми разом, ми в безпеці, ти правий, ми запізнюємося.' : 'В части фраз после To Be стоит не просто качество, а ситуация или отношение: мы друзья, мы вместе, мы в безопасности, ты прав, мы опаздываем.'} />,
    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['We are friends', isUK ? 'Ми друзі' : 'Мы друзья'],
        ['We are together', isUK ? 'Ми разом' : 'Мы вместе'],
        ['They are together', isUK ? 'Вони разом' : 'Они вместе'],
        ['We are safe', isUK ? 'Ми в безпеці' : 'Мы в безопасности'],
        ['You are safe', isUK ? 'Ти в безпеці' : 'Ты в безопасности'],
        ['You are right', isUK ? 'Ти правий / Ви праві' : 'Ты прав / Вы правы'],
        ['You are late', isUK ? 'Ти запізнюєшся' : 'Ты опаздываешь'],
        ['We are late', isUK ? 'Ми запізнюємося' : 'Мы опаздываем'],
        ['You are okay', isUK ? 'Ти в порядку' : 'Ты в порядке'],
      ]}
    />,
    <Tip key="tip5" t={t} f={f} text={isUK ? 'You are late і We are late перекладаються дієсловом «запізнюєшся / запізнюємося», але англійська логіка тут усе одно To Be + late.' : 'You are late и We are late переводятся глаголом «опаздываешь / опаздываем», но английская логика здесь всё равно To Be + late.'} />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Переклад не завжди дослівний' : '13. Перевод не всегда дословный'} />,
    <Body key="b13a" t={t} f={f} text={isUK ? 'Англійська часто описує стан через To Be, а українською або російською ми перекладаємо це природно, іноді через дієслово або готовий вираз. Це нормально.' : 'Английский часто описывает состояние через To Be, а по-русски мы переводим это естественно, иногда через глагол или готовое выражение. Это нормально.'} />,
    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська логіка' : 'Английская логика', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['You are late', isUK ? 'Ти запізнюєшся' : 'Ты опаздываешь'],
        ['We are late', isUK ? 'Ми запізнюємося' : 'Мы опаздываем'],
        ['She is nervous', isUK ? 'Вона нервує' : 'Она нервничает'],
        ['We are safe', isUK ? 'Ми в безпеці' : 'Мы в безопасности'],
        ['You are right', isUK ? 'Ти правий / Ви праві' : 'Ты прав / Вы правы'],
        ['I am okay', isUK ? 'Я в порядку' : 'Я в порядке'],
      ]}
    />,
    <Warn key="w6" t={t} f={f} text={isUK ? 'Не перекладай механічно слово в слово. You are late - це не дивна калька, а природно «ти запізнюєшся».' : 'Не переводи механически слово в слово. You are late - это не странная калька, а естественно «ты опаздываешь».'} />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Найчастіші помилки' : '14. Самые частые ошибки'} />,
    <Warn key="w7" t={t} f={f} text={isUK ? '❌ I here → ✅ I am here. Без am фраза неповна.' : '❌ I here → ✅ I am here. Без am фраза неполная.'} />,
    <Warn key="w8" t={t} f={f} text={isUK ? '❌ I are ready → ✅ I am ready. З I завжди am.' : '❌ I are ready → ✅ I am ready. С I всегда am.'} />,
    <Warn key="w9" t={t} f={f} text={isUK ? '❌ He am busy → ✅ He is busy. З he потрібне is.' : '❌ He am busy → ✅ He is busy. С he нужно is.'} />,
    <Warn key="w10" t={t} f={f} text={isUK ? '❌ She are tired → ✅ She is tired. З she потрібне is.' : '❌ She are tired → ✅ She is tired. С she нужно is.'} />,
    <Warn key="w11" t={t} f={f} text={isUK ? '❌ It are important → ✅ It is important. З it потрібне is.' : '❌ It are important → ✅ It is important. С it нужно is.'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ We is friends → ✅ We are friends. З we потрібне are.' : '❌ We is friends → ✅ We are friends. С we нужно are.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ They is outside → ✅ They are outside. З they потрібне are.' : '❌ They is outside → ✅ They are outside. С they нужно are.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ It broken → ✅ It is broken. Якщо є it + опис, потрібне is.' : '❌ It broken → ✅ It is broken. Если есть it + описание, нужно is.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Що треба винести з уроку' : '15. Что нужно вынести из урока'} />,
    <Body key="b15a" t={t} f={f} text={isUK ? 'У цьому уроці ти ставиш базовий каркас англійського речення: I am, he is, she is, it is, you are, we are, they are. Після цього каркаса можна додавати стан, якість, місце або ситуацію.' : 'В этом уроке ты ставишь базовый каркас английского предложения: I am, he is, she is, it is, you are, we are, they are. После этого каркаса можно добавлять состояние, качество, место или ситуацию.'} />,
    <Tip key="tip6" t={t} f={f} text={isUK ? 'Перед практикою тримай одну формулу: хто + am/is/are + опис. I am ready. She is tired. We are here. It is important.' : 'Перед практикой держи одну формулу: кто + am/is/are + описание. I am ready. She is tired. We are here. It is important.'} />,
  ],
},
// ── УРОК 2 ──────────────────────────────────────────────────
2: {
  titleRU: 'To Be: отрицания и вопросы',
  titleUK: 'To Be: заперечення та питання',
  titlePtBr: "To Be: negações e perguntas",
  titleVi: "To Be: phủ định và câu hỏi",
  titleId: "To Be: negatif dan pertanyaan",
  titleTr: "To Be: olumsuz ve soru cümleleri",
  titlePl: "To Be: przeczenia i pytania",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У першому уроці ти будував прості фрази з am, is та are: I am ready, She is calm, We are safe. У цьому уроці ти вчишся робити з цієї ж конструкції заперечення та питання.'
        : 'В первом уроке ты строил простые фразы с am, is и are: I am ready, She is calm, We are safe. В этом уроке ты учишься делать из этой же конструкции отрицание и вопрос.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип фрази' : 'Тип фразы', isUK ? 'Формула' : 'Формула', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'хто + am/is/are + опис' : 'кто + am/is/are + описание', 'You are ready'],
        [isUK ? 'Заперечення' : 'Отрицание', isUK ? 'хто + am/is/are + not + опис' : 'кто + am/is/are + not + описание', 'You are not ready'],
        [isUK ? 'Питання' : 'Вопрос', isUK ? 'am/is/are + хто + опис?' : 'am/is/are + кто + описание?', 'Are you ready?'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна думка проста: To Be сам робить заперечення і питання. Для цього не потрібні do або does.'
        : 'Главная мысль простая: To Be сам делает отрицания и вопросы. Для этого не нужны do или does.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Як сказати «не» з To Be' : '2. Как сказать «не» с To Be'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб зробити заперечення, постав not після am, is або are. Саме після To Be, не перед ним і не замість нього.'
        : 'Чтобы сделать отрицание, поставь not после am, is или are. Именно после To Be, не перед ним и не вместо него.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Було' : 'Было', isUK ? 'Стало' : 'Стало', isUK ? 'Переклад' : 'Перевод'],
        ['I am hungry', 'I am not hungry', isUK ? 'Я не голодний' : 'Я не голоден'],
        ['He is here', 'He is not here', isUK ? 'Він не тут' : 'Он не здесь'],
        ['We are ready', 'We are not ready', isUK ? 'Ми не готові' : 'Мы не готовы'],
        ['They are happy', 'They are not happy', isUK ? 'Вони не щасливі' : 'Они не счастливы'],
      ]}
    />,

    <Warn key="w1" t={t} f={f} text={isUK ? '❌ I not hungry → ✅ I am not hungry. Not не замінює am. Воно ставиться після am.' : '❌ I not hungry → ✅ I am not hungry. Not не заменяет am. Оно ставится после am.'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ He not here → ✅ He is not here. У запереченні все одно потрібен is.' : '❌ He not here → ✅ He is not here. В отрицании всё равно нужен is.'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Am not, is not, are not' : '3. Am not, is not, are not'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Форма To Be у теперішньому часі залежить від того, про кого ти говориш. Not просто додається після правильної форми.'
        : 'Форма To Be в настоящем времени зависит от того, о ком ты говоришь. Not просто добавляется после правильной формы.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Заперечення' : 'Отрицание', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['I', 'am not', 'I am not tired / I am not afraid / I am not okay'],
        ['He / She / It', 'is not', 'He is not busy / She is not sad / It is not funny'],
        ['You / We / They', 'are not', 'You are not ready / We are not safe / They are not together'],
      ]}
    />,

    <Tip key="tip2" t={t} f={f} text={isUK ? 'Запам\'ятай як блоки: I am not. He is not. She is not. It is not. You are not. We are not. They are not.' : 'Запомни как блоки: I am not. He is not. She is not. It is not. You are not. We are not. They are not.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Як поставити питання з To Be' : '4. Как задать вопрос с To Be'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб зробити питання, перенеси am, is або are на початок. В українській або російській часто достатньо інтонації, але в англійській потрібен інший порядок слів.'
        : 'Чтобы сделать вопрос, перенеси am, is или are в начало. По-русски часто хватает интонации, но в английском нужен другой порядок слов.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайна логіка' : 'Обычная логика', isUK ? 'Питання з уроку' : 'Вопрос из урока', isUK ? 'Переклад' : 'Перевод'],
        ['You are sure', 'Are you sure?', isUK ? 'Ти впевнений?' : 'Ты уверен?'],
        ['It is expensive', 'Is it expensive?', isUK ? 'Це дорого?' : 'Это дорого?'],
        ['She is ready', 'Is she ready?', isUK ? 'Вона готова?' : 'Она готова?'],
        ['He is angry', 'Is he angry?', isUK ? 'Він злий?' : 'Он злой?'],
        ['They are here', 'Are they here?', isUK ? 'Вони тут?' : 'Они здесь?'],
      ]}
    />,

    <Warn key="w3" t={t} f={f} text={isUK ? '❌ You are ready? → ✅ Are you ready? Для звичайного нейтрального питання To Be виходить на перше місце.' : '❌ You are ready? → ✅ Are you ready? Для обычного нейтрального вопроса To Be выходит на первое место.'} />,
    <Warn key="w4" t={t} f={f} text={isUK ? '❌ Do you are ready? → ✅ Are you ready? З To Be не ставимо do.' : '❌ Do you are ready? → ✅ Are you ready? С To Be не ставим do.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Are, Is, Am у питаннях' : '5. Are, Is, Am в вопросах'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'На початку питання ставиться та сама форма To Be у теперішньому часі, яка була б у звичайній фразі: am для I, is для he/she/it, are для you/we/they.'
        : 'В начале вопроса ставится та же форма To Be в настоящем времени, которая была бы в обычной фразе: am для I, is для he/she/it, are для you/we/they.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Питання' : 'Вопрос', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['I', 'Am I...?', 'Am I right?'],
        ['He', 'Is he...?', 'Is he angry? / Is he ready? / Is he inside?'],
        ['She', 'Is she...?', 'Is she ready? / Is she outside?'],
        ['It', 'Is it...?', 'Is it expensive? / Is it open? / Is it true?'],
        ['You', 'Are you...?', 'Are you busy? / Are you okay? / Are you inside?'],
        ['We', 'Are we...?', 'Are we ready?'],
        ['They', 'Are they...?', 'Are they here?'],
      ]}
    />,

    <Warn key="w5" t={t} f={f} text={isUK ? '❌ Is you busy? → ✅ Are you busy? З you потрібне are.' : '❌ Is you busy? → ✅ Are you busy? С you нужно are.'} />,
    <Warn key="w6" t={t} f={f} text={isUK ? '❌ Are he ready? → ✅ Is he ready? З he потрібне is.' : '❌ Are he ready? → ✅ Is he ready? С he нужно is.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. It is not і Is it...?' : '6. It is not и Is it...?'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли ти говориш про ситуацію, предмет або загальну оцінку, англійська часто використовує it. Українською або російською це зазвичай звучить як «це».'
        : 'Когда ты говоришь о ситуации, предмете или общей оценке, английский часто использует it. По-русски это обычно звучит как «это».'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Is it expensive?', isUK ? 'Це дорого?' : 'Это дорого?'],
        ['Is it open?', isUK ? 'Це відкрито?' : 'Это открыто?'],
        ['Is it free?', isUK ? 'Це безкоштовно?' : 'Это бесплатно?'],
        ['Is it far?', isUK ? 'Це далеко?' : 'Это далеко?'],
        ['Is it true?', isUK ? 'Це правда?' : 'Это правда?'],
        ['It is not scary', isUK ? 'Це не страшно' : 'Это не страшно'],
        ['It is not funny', isUK ? 'Це не смішно' : 'Это не смешно'],
        ['It is not important', isUK ? 'Це не важливо' : 'Это не важно'],
        ['It is not dangerous', isUK ? 'Це не небезпечно' : 'Это не опасно'],
        ['It is not serious', isUK ? 'Це не серйозно' : 'Это не серьёзно'],
      ]}
    />,

    <Tip key="tip3" t={t} f={f} text={isUK ? 'It тут не треба перекладати як «воно». У таких фразах It is часто означає просто «це».' : 'It здесь не нужно переводить как «оно». В таких фразах It is часто означает просто «это».'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Слова після To Be в цьому уроці' : '7. Слова после To Be в этом уроке'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Після am, is та are у цьому уроці стоять не дії, а стани, місця або оцінки. Саме тому тут працює To Be, а не do.'
        : 'После am, is и are в этом уроке стоят не действия, а состояния, места или оценки. Именно поэтому здесь работает To Be, а не do.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        [isUK ? 'Стан людини' : 'Состояние человека', 'hungry, tired, nervous, angry, afraid, sick, sad'],
        [isUK ? 'Готовність або впевненість' : 'Готовность или уверенность', 'ready, sure, okay, right, wrong'],
        [isUK ? 'Місце' : 'Место', 'here, outside, inside'],
        [isUK ? 'Оцінка ситуації' : 'Оценка ситуации', 'expensive, scary, funny, open, free, far, true, important, dangerous, serious'],
        [isUK ? 'Зв\'язок між людьми' : 'Связь между людьми', 'together'],
      ]}
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Чому переклад не завжди дослівний' : '8. Почему перевод не всегда дословный'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Англійська часто говорить через стан: you are wrong, she is angry, I am afraid. Українською або російською це може звучати як дія: ти помиляєшся, вона злиться, я боюся. Це нормально. Англійська конструкція все одно залишається To Be.'
        : 'Английский часто говорит через состояние: you are wrong, she is angry, I am afraid. По-русски это может звучать как действие: ты ошибаешься, она злится, я боюсь. Это нормально. Английская конструкция всё равно остаётся To Be.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська логіка' : 'Английская логика', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Are you wrong?', isUK ? 'Ти помиляєшся?' : 'Ты неправ? / Ты ошибаешься?'],
        ['We are not wrong', isUK ? 'Ми не помиляємося' : 'Мы не ошибаемся'],
        ['She is not angry', isUK ? 'Вона не злиться' : 'Она не злится'],
        ['I am not afraid', isUK ? 'Я не боюся' : 'Я не боюсь'],
        ['We are not late', isUK ? 'Ми не спізнюємося' : 'Мы не опаздываем'],
        ['We are not safe', isUK ? 'Ми не в безпеці' : 'Мы не в безопасности'],
      ]}
    />,

    <Warn key="w7" t={t} f={f} text={isUK ? 'Не перекладай механічно слово в слово. Are you wrong? природно означає «ти помиляєшся?» або «ти неправ?», а не дивну кальку.' : 'Не переводи механически слово в слово. Are you wrong? естественно означает «ты ошибаешься?» или «ты неправ?», а не странную кальку.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Не змішуй To Be з do/does' : '9. Не смешивай To Be с do/does'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці немає звичайних дій типу drink, work, live. Тут усе тримається на am, is, are. Тому для питань і заперечень не потрібні do або does.'
        : 'В этом уроке нет обычных действий типа drink, work, live. Здесь всё держится на am, is, are. Поэтому для вопросов и отрицаний не нужны do или does.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Помилка' : 'Ошибка', isUK ? 'Правильно' : 'Правильно'],
        ['Do you are ready?', 'Are you ready?'],
        ['Does it is free?', 'Is it free?'],
        ['I do not am tired', 'I am not tired'],
        ['She does not is ready', 'She is not ready'],
      ]}
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Найчастіші помилки' : '10. Самые частые ошибки'} />,

    <Warn key="w8" t={t} f={f} text={isUK ? '❌ I not tired → ✅ I am not tired. З I потрібне am.' : '❌ I not tired → ✅ I am not tired. С I нужно am.'} />,
    <Warn key="w9" t={t} f={f} text={isUK ? '❌ He are not here → ✅ He is not here. З he потрібне is.' : '❌ He are not here → ✅ He is not here. С he нужно is.'} />,
    <Warn key="w10" t={t} f={f} text={isUK ? '❌ They is not ready → ✅ They are not ready. З they потрібне are.' : '❌ They is not ready → ✅ They are not ready. С they нужно are.'} />,
    <Warn key="w11" t={t} f={f} text={isUK ? '❌ Is you okay? → ✅ Are you okay? З you потрібне are.' : '❌ Is you okay? → ✅ Are you okay? С you нужно are.'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ Are it true? → ✅ Is it true? З it потрібне is.' : '❌ Are it true? → ✅ Is it true? С it нужно is.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ Do you are sure? → ✅ Are you sure? З To Be не ставимо do.' : '❌ Do you are sure? → ✅ Are you sure? С To Be не ставим do.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ I do not am afraid → ✅ I am not afraid. Заперечення з To Be робиться через not після am.' : '❌ I do not am afraid → ✅ I am not afraid. Отрицание с To Be делается через not после am.'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Що треба винести з уроку' : '11. Что нужно вынести из урока'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся керувати To Be у двох напрямках: заперечення і питання. Для заперечення став not після am / is / are. Для питання перенось am / is / are на початок.'
        : 'В этом уроке ты учишься управлять To Be в двух направлениях: отрицание и вопрос. Для отрицания ставь not после am / is / are. Для вопроса переноси am / is / are в начало.'
      }
    />,

    <Tip key="tip4" t={t} f={f} text={isUK ? 'Перед практикою тримай три моделі: You are ready. You are not ready. Are you ready?' : 'Перед практикой держи три модели: You are ready. You are not ready. Are you ready?'} />,
  ],
},

// ── УРОК 3 ──────────────────────────────────────────────────
3: {
  titleRU: 'Present Simple: Утверждения',
  titleUK: 'Present Simple: Ствердження',
  titlePtBr: "Present Simple: afirmações",
  titleVi: "Present Simple: câu khẳng định",
  titleId: "Present Simple: pernyataan",
  titleTr: "Present Simple: olumlu cümleler",
  titlePl: "Present Simple: zdania twierdzące",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У перших двох уроках ти працював з To Be: I am, He is, We are. У цьому уроці ти переходиш до звичайних дій: я працюю, ти розумієш, він живе, вона говорить, ми купуємо, вони дивляться.'
        : 'В первых двух уроках ты работал с To Be: I am, He is, We are. В этом уроке ты переходишь к обычным действиям: я работаю, ты понимаешь, он живёт, она говорит, мы покупаем, они смотрят.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Було з To Be' : 'Было с To Be', isUK ? 'Тепер зі звичайною дією' : 'Теперь с обычным действием'],
        ['I am here', 'I work here'],
        ['She is calm', 'She speaks English'],
        ['They are ready', 'They watch TV'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея уроку: хто + дія + продовження. I work here. You understand me. She speaks English.'
        : 'Главная идея урока: кто + действие + продолжение. I work here. You understand me. She speaks English.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'В англійському твердженні порядок слів дуже важливий. Спочатку йде той, хто робить дію. Потім сама дія. Потім уточнення: що, кого, де або як.'
        : 'В английском утверждении порядок слов очень важен. Сначала идёт тот, кто делает действие. Потом само действие. Потом уточнение: что, кого, где или как.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Дія' : 'Действие', isUK ? 'Продовження' : 'Продолжение', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'work', 'here', 'I work here'],
        ['You', 'understand', 'me', 'You understand me'],
        ['We', 'drink', 'coffee', 'We drink coffee'],
        ['They', 'watch', 'TV', 'They watch TV'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I am work here → ✅ I work here. Якщо є звичайна дія work, am не потрібен.'
        : '❌ I am work here → ✅ I work here. Если есть обычное действие work, am не нужен.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ She is speaks English → ✅ She speaks English. Не змішуй To Be і звичайну дію.'
        : '❌ She is speaks English → ✅ She speaks English. Не смешивай To Be и обычное действие.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. I, you, we, they — дія без -s' : '3. I, you, we, they - действие без -s'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'З I, you, we, they основна дія зазвичай стоїть у простій формі. Нічого не додаємо.'
        : 'С I, you, we, they основное действие обычно стоит в простой форме. Ничего не добавляем.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I', 'I work here', isUK ? 'Я працюю тут' : 'Я работаю здесь'],
        ['You', 'You understand me', isUK ? 'Ти розумієш мене' : 'Ты понимаешь меня'],
        ['We', 'We drink coffee', isUK ? 'Ми п\'ємо каву' : 'Мы пьём кофе'],
        ['They', 'They watch TV', isUK ? 'Вони дивляться телевізор' : 'Они смотрят телевизор'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ They watches TV → ✅ They watch TV. З they не додаємо -s.'
        : '❌ They watches TV → ✅ They watch TV. С they не добавляем -s.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. He, she, it — дія з -s або -es' : '4. He, she, it - действие с -s или -es'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'З he, she, it у Present Simple до дієслова додається -s або -es. Це не множина. Це форма дії для he / she / it.'
        : 'С he, she, it в Present Simple к глаголу добавляется -s или -es. Это не множественное число. Это форма действия для he / she / it.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайна форма' : 'Обычная форма', isUK ? 'З he / she / it' : 'С he / she / it', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['live', 'lives', 'He lives here'],
        ['speak', 'speaks', 'She speaks English'],
        ['help', 'helps', 'It helps people'],
        ['eat', 'eats', 'He eats meat'],
        ['cost', 'costs', 'It costs money'],
        ['work', 'works', 'It works well'],
        ['take', 'takes', 'It takes time'],
        ['sound', 'sounds', 'It sounds good'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Запам\'ятай коротко: I work here, але He lives here. I know you, але She knows him. They hear us, але He remembers me.'
        : 'Запомни коротко: I work here, но He lives here. I know you, но She knows him. They hear us, но He remembers me.'
      }
    />,

    <Warn key="w4" t={t} f={f} text={isUK ? '❌ He live here → ✅ He lives here. З he у Present Simple потрібна форма lives.' : '❌ He live here → ✅ He lives here. С he в Present Simple нужна форма lives.'} />,
    <Warn key="w5" t={t} f={f} text={isUK ? '❌ It cost money → ✅ It costs money. З it потрібне -s.' : '❌ It cost money → ✅ It costs money. С it нужно -s.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Коли додаємо -es' : '5. Когда добавляем -es'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Іноді до дієслова додається не просто -s, а -es. У цьому уроці це видно у фразах She washes dishes і She teaches English.'
        : 'Иногда к глаголу добавляется не просто -s, а -es. В этом уроке это видно во фразах She washes dishes и She teaches English.'
      }
    />,

    <Table key="t5" t={t} f={f} rows={[[isUK ? 'Дієслово' : 'Глагол', isUK ? 'Форма з she' : 'Форма с she', isUK ? 'Фраза' : 'Фраза'], ['wash', 'washes', 'She washes dishes'], ['teach', 'teaches', 'She teaches English']]} />,
    <Warn key="w6" t={t} f={f} text={isUK ? '❌ She wash dishes → ✅ She washes dishes. Після she потрібна форма washes.' : '❌ She wash dishes → ✅ She washes dishes. После she нужна форма washes.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Що може стояти після дії' : '6. Что может стоять после действия'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Після дії часто йде відповідь на питання: що? кого? де? як? Так фраза стає повною.'
        : 'После действия часто идёт ответ на вопрос: что? кого? где? как? Так фраза становится полной.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання' : 'Вопрос', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        [isUK ? 'Що?' : 'Что?', 'We drink coffee / We buy food / She cooks dinner / We order pizza'],
        [isUK ? 'Кого?' : 'Кого?', 'You understand me / He calls her / We help them / They hear us'],
        [isUK ? 'Де?' : 'Где?', 'I work here / He lives here / We wait here / They work here'],
        [isUK ? 'Як?' : 'Как?', 'It works well / You look great / It sounds good'],
      ]}
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Me, you, him, her, us, them після дії' : '7. Me, you, him, her, us, them после действия'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці багато фраз, де дія спрямована на людину: розуміє мене, дзвонить їй, допомагаємо їм, чують нас. Після дії в англійській потрібні об\'єктні форми.'
        : 'В этом уроке много фраз, где действие направлено на человека: понимаешь меня, звонит ей, помогаем им, слышат нас. После действия в английском нужны объектные формы.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма після дії' : 'Форма после действия', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', isUK ? 'мене / мені' : 'меня / мне', 'You understand me / You help me / He remembers me'],
        ['you', isUK ? 'тебе / тобі / вас / вам' : 'тебя / тебе / вас / вам', 'I know you / We trust you'],
        ['him', isUK ? 'його / йому' : 'его / ему', 'I remember him / She knows him'],
        ['her', isUK ? 'її / їй' : 'её / ей', 'He calls her / I understand her'],
        ['us', isUK ? 'нас / нам' : 'нас / нам', 'They hear us'],
        ['them', isUK ? 'їх / їм' : 'их / им', 'We help them / She knows them'],
      ]}
    />,

    <Warn key="w7" t={t} f={f} text={isUK ? '❌ I remember he → ✅ I remember him. Після дії потрібна форма him.' : '❌ I remember he → ✅ I remember him. После действия нужна форма him.'} />,
    <Warn key="w8" t={t} f={f} text={isUK ? '❌ I understand she → ✅ I understand her. Після understand потрібна форма her.' : '❌ I understand she → ✅ I understand her. После understand нужна форма her.'} />,
    <Warn key="w9" t={t} f={f} text={isUK ? '❌ They hear we → ✅ They hear us. Після hear потрібна форма us.' : '❌ They hear we → ✅ They hear us. После hear нужна форма us.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. It + дія: це працює, коштує, займає час' : '8. It + действие: это работает, стоит, занимает время'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'It часто означає «це». Але тут після it стоїть не is, а звичайна дія. Тому в Present Simple дія отримує -s: helps, costs, works, takes, sounds.'
        : 'It часто означает «это». Но здесь после it стоит не is, а обычное действие. Поэтому в Present Simple действие получает -s: helps, costs, works, takes, sounds.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['It helps people', isUK ? 'Це допомагає людям' : 'Это помогает людям'],
        ['It costs money', isUK ? 'Це коштує грошей' : 'Это стоит денег'],
        ['It works well', isUK ? 'Це добре працює' : 'Это хорошо работает'],
        ['It takes time', isUK ? 'Це потребує часу' : 'Это требует времени'],
        ['It sounds good', isUK ? 'Це звучить добре' : 'Это звучит хорошо'],
      ]}
    />,

    <Tip key="tip3" t={t} f={f} text={isUK ? 'Не плутай: It is important - це To Be. It works well - це звичайна дія.' : 'Не путай: It is important - это To Be. It works well - это обычное действие.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Listen to music' : '9. Listen to music'} />,

    <Body key="b9a" t={t} f={f} text={isUK ? 'У фразі We listen to music після listen потрібне to. Англійською зазвичай кажуть listen to something - слухати щось конкретне.' : 'Во фразе We listen to music после listen нужно to. По-английски обычно говорят listen to something - слушать что-то конкретное.'} />,
    <Example key="e1" t={t} f={f} eng="We listen to music" rus={isUK ? 'Ми слухаємо музику' : 'Мы слушаем музыку'} />,
    <Warn key="w10" t={t} f={f} text={isUK ? '❌ We listen music → ✅ We listen to music. У цій конструкції listen потребує to.' : '❌ We listen music → ✅ We listen to music. В этой конструкции listen требует to.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Feel, look, sound' : '10. Feel, look, sound'} />,

    <Body key="b10a" t={t} f={f} text={isUK ? 'Деякі дієслова в цьому уроці не показують фізичну дію. Вони описують відчуття, вигляд або звучання.' : 'Некоторые глаголы в этом уроке не показывают физическое действие. Они описывают ощущение, внешний вид или звучание.'} />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I feel tired', isUK ? 'Я відчуваю втому' : 'Я чувствую усталость'],
        ['You look great', isUK ? 'Ти чудово виглядаєш' : 'Ты отлично выглядишь'],
        ['It sounds good', isUK ? 'Це звучить добре' : 'Это звучит хорошо'],
      ]}
    />,

    <Tip key="tip4" t={t} f={f} text={isUK ? 'Look у You look great означає «виглядаєш», а не «дивишся». Sound у It sounds good означає «звучить».' : 'Look в You look great означает «выглядишь», а не «смотришь». Sound в It sounds good означает «звучит».'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Need time, need rest, need it' : '11. Need time, need rest, need it'} />,

    <Body key="b11a" t={t} f={f} text={isUK ? 'Need означає «потребувати / бути потрібним». В українській або російській переклад часто звучить не дослівно: I need it - мені це потрібно.' : 'Need означает «нуждаться / быть нужным». По-русски перевод часто звучит не дословно: I need it - мне это нужно.'} />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I need it', isUK ? 'Мені це потрібно' : 'Мне это нужно'],
        ['We need time', isUK ? 'Нам потрібен час' : 'Нам нужно время'],
        ['You need rest', isUK ? 'Тобі потрібен відпочинок' : 'Тебе нужен отдых'],
      ]}
    />,

    <Tip key="tip5" t={t} f={f} text={isUK ? 'В англійській need - звичайна дія: I need it. We need time. You need rest.' : 'В английском need - обычное действие: I need it. We need time. You need rest.'} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Often і late' : '12. Often и late'} />,

    <Body key="b12a" t={t} f={f} text={isUK ? 'У цьому уроці є короткі слова, які додають обставину до дії: often означає «часто», late означає «пізно / із запізненням».' : 'В этом уроке есть короткие слова, которые добавляют обстоятельство к действию: often означает «часто», late означает «поздно / с опозданием».'} />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['often', isUK ? 'часто' : 'часто', 'They travel often'],
        ['late', isUK ? 'пізно / із запізненням' : 'поздно / с опозданием', 'They come late'],
        ['well', isUK ? 'добре' : 'хорошо', 'It works well'],
      ]}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Готові блоки з уроку' : '13. Готовые блоки из урока'} />,

    <Body key="b13a" t={t} f={f} text={isUK ? 'У цих фразах головна граматика однакова: хто + дія + продовження. Але самі словосполучення краще впізнавати цілими блоками.' : 'В этих фразах главная грамматика одинаковая: кто + действие + продолжение. Но сами словосочетания лучше узнавать цельными блоками.'} />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['work here', isUK ? 'працювати тут' : 'работать здесь', 'I work here / They work here'],
        ['speak English', isUK ? 'говорити англійською' : 'говорить по-английски', 'She speaks English'],
        ['watch TV', isUK ? 'дивитися телевізор' : 'смотреть телевизор', 'They watch TV'],
        ['buy food', isUK ? 'купувати їжу' : 'покупать еду', 'We buy food'],
        ['write messages', isUK ? 'писати повідомлення' : 'писать сообщения', 'He writes messages'],
        ['wash dishes', isUK ? 'мити посуд' : 'мыть посуду', 'She washes dishes'],
        ['drive cars', isUK ? 'водити машини' : 'водить машины', 'They drive cars'],
        ['cook dinner', isUK ? 'готувати вечерю' : 'готовить ужин', 'She cooks dinner'],
        ['order pizza', isUK ? 'замовляти піцу' : 'заказывать пиццу', 'We order pizza'],
        ['use apps', isUK ? 'використовувати застосунки' : 'использовать приложения', 'She uses apps'],
        ['wear glasses', isUK ? 'носити окуляри' : 'носить очки', 'He wears glasses'],
        ['order food', isUK ? 'замовляти їжу' : 'заказывать еду', 'We order food'],
        ['help friends', isUK ? 'допомагати друзям' : 'помогать друзьям', 'You help friends'],
      ]}
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Найчастіші помилки' : '14. Самые частые ошибки'} />,

    <Warn key="w11" t={t} f={f} text={isUK ? '❌ He live here → ✅ He lives here. З he потрібне -s.' : '❌ He live here → ✅ He lives here. С he нужно -s.'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ She speak English → ✅ She speaks English. З she потрібне -s.' : '❌ She speak English → ✅ She speaks English. С she нужно -s.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ They works here → ✅ They work here. З they не додаємо -s.' : '❌ They works here → ✅ They work here. С they не добавляем -s.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ I am know you → ✅ I know you. Звичайна дія не потребує am.' : '❌ I am know you → ✅ I know you. Обычное действие не требует am.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ He calls she → ✅ He calls her. Після дії потрібна форма her.' : '❌ He calls she → ✅ He calls her. После действия нужна форма her.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ We listen music → ✅ We listen to music. Після listen потрібне to.' : '❌ We listen music → ✅ We listen to music. После listen нужно to.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ It take time → ✅ It takes time. З it потрібне -s.' : '❌ It take time → ✅ It takes time. С it нужно -s.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Що треба винести з уроку' : '15. Что нужно вынести из урока'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати просте твердження зі звичайною дією. Головна формула: хто + дія + продовження. З I, you, we, they дія зазвичай проста. З he, she, it додається -s або -es.'
        : 'В этом уроке ты учишься строить простое утверждение с обычным действием. Главная формула: кто + действие + продолжение. С I, you, we, they действие обычно простое. С he, she, it добавляется -s или -es.'
      }
    />,

    <Tip key="tip6" t={t} f={f} text={isUK ? 'Перед практикою тримай три моделі: I work here. She speaks English. It works well.' : 'Перед практикой держи три модели: I work here. She speaks English. It works well.'} />,
  ],
},

// ── УРОК 4 ──────────────────────────────────────────────────
4: {
  titleRU: 'Present Simple: Отрицание',
  titleUK: 'Present Simple: Заперечення',
  titlePtBr: "Present Simple: negação",
  titleVi: "Present Simple: phủ định",
  titleId: "Present Simple: negatif",
  titleTr: "Present Simple: olumsuz cümleler",
  titlePl: "Present Simple: przeczenia",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У минулому уроці ти будував звичайні твердження: I drink coffee, She speaks English, It works well. У цьому уроці ти вчишся казати, що дія не відбувається: я не п\'ю, він не курить, це не працює.'
        : 'В прошлом уроке ты строил обычные утверждения: I drink coffee, She speaks English, It works well. В этом уроке ты учишься говорить, что действие не происходит: я не пью, он не курит, это не работает.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Заперечення' : 'Отрицание'],
        ['I drink milk', 'I do not drink milk'],
        ['He smokes', 'He does not smoke'],
        ['She eats sugar', 'She does not eat sugar'],
        ['It works', 'It does not work'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: для заперечення звичайної дії в Present Simple потрібен помічник do not або does not.'
        : 'Главная идея: для отрицания обычного действия в Present Simple нужен помощник do not или does not.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'У запереченні do not або does not стоїть перед основною дією. Після них основне дієслово завжди залишається у базовій формі.'
        : 'В отрицании do not или does not стоит перед основным действием. После них основной глагол всегда остаётся в базовой форме.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Заперечення' : 'Отрицание', isUK ? 'Дія' : 'Действие', isUK ? 'Фраза' : 'Фраза'],
        ['I / You / We / They', 'do not', 'drink / know / use / live', 'I do not drink milk'],
        ['He / She / It', 'does not', 'smoke / eat / work / need', 'He does not smoke'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I not drink milk → ✅ I do not drink milk. Для звичайної дії потрібен do not.'
        : '❌ I not drink milk → ✅ I do not drink milk. Для обычного действия нужен do not.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ He not smoke → ✅ He does not smoke. З he / she / it потрібен does not.'
        : '❌ He not smoke → ✅ He does not smoke. С he / she / it нужен does not.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Do not для I, you, we, they' : '3. Do not для I, you, we, they'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'З I, you, we, they використовуй do not. Після do not дієслово не змінюється.'
        : 'С I, you, we, they используй do not. После do not глагол не меняется.'
      }
    />,

    <Example key="e1" t={t} f={f} eng="I do not drink milk" rus={isUK ? 'Я не п\'ю молоко' : 'Я не пью молоко'} />,
    <Example key="e2" t={t} f={f} eng="You do not listen" rus={isUK ? 'Ти не слухаєш' : 'Ты не слушаешь'} />,
    <Example key="e3" t={t} f={f} eng="We do not understand" rus={isUK ? 'Ми не розуміємо' : 'Мы не понимаем'} />,
    <Example key="e4" t={t} f={f} eng="They do not live here" rus={isUK ? 'Вони не живуть тут' : 'Они не живут здесь'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Does not для he, she, it' : '4. Does not для he, she, it'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'З he, she, it використовуй does not. Важливо: після does not основне дієслово повертається до звичайної форми без -s.'
        : 'С he, she, it используй does not. Важно: после does not основной глагол возвращается к обычной форме без -s.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Заперечення' : 'Отрицание'],
        ['He smokes', 'He does not smoke'],
        ['She eats sugar', 'She does not eat sugar'],
        ['It works', 'It does not work'],
        ['He needs money', 'He does not need money'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ She does not eats sugar → ✅ She does not eat sugar. -s уже заховане в does.'
        : '❌ She does not eats sugar → ✅ She does not eat sugar. -s уже спрятано в does.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ He do not smoke → ✅ He does not smoke. Для he / she / it потрібне does not, не do not.'
        : '❌ He do not smoke → ✅ He does not smoke. Для he / she / it нужно does not, не do not.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Не плутай To Be і звичайну дію' : '5. Не путай To Be и обычное действие'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок 2 був про заперечення з To Be: I am not, He is not, They are not. Але в цьому уроці фрази мають звичайні дії: drink, eat, work, know, use, remember. Для таких дій потрібні do not або does not.'
        : 'Урок 2 был про отрицание с To Be: I am not, He is not, They are not. Но в этом уроке фразы имеют обычные действия: drink, eat, work, know, use, remember. Для таких действий нужны do not или does not.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        ['To Be', isUK ? 'Звичайна дія' : 'Обычное действие'],
        ['I am not tired', 'I do not feel tired'],
        ['He is not here', 'He does not live here'],
        ['It is not broken', 'It does not work'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ I am not drink milk → ✅ I do not drink milk. Якщо є дія drink, потрібен do not.'
        : '❌ I am not drink milk → ✅ I do not drink milk. Если есть действие drink, нужен do not.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Me, you, him, us, them після дії' : '6. Me, you, him, us, them после действия'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці багато фраз, де дія спрямована на людину: не знаєш мене, не бачить мене, не дзвонить йому, не допомагають нам. Після дії потрібні форми me, you, him, us, them.'
        : 'В этом уроке много фраз, где действие направлено на человека: не знаешь меня, не видит меня, не звонит ему, не помогают нам. После действия нужны формы me, you, him, us, them.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', isUK ? 'мене / мені' : 'меня / мне', 'You do not know me / He does not see me'],
        ['you', isUK ? 'тебе / тобі / вас / вам' : 'тебя / тебе / вас / вам', 'I do not remember you / We do not believe you / They do not trust you'],
        ['him', isUK ? 'його / йому' : 'его / ему', 'She does not call him'],
        ['us', isUK ? 'нас / нам' : 'нас / нам', 'They do not help us / She does not hear us'],
        ['them', isUK ? 'їх / їм' : 'их / им', 'She does not remember them'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ She does not call he → ✅ She does not call him. Після дії потрібна форма him.'
        : '❌ She does not call he → ✅ She does not call him. После действия нужна форма him.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ They do not help we → ✅ They do not help us. Після help потрібна форма us.'
        : '❌ They do not help we → ✅ They do not help us. После help нужна форма us.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. It після дієслова' : '7. It после глагола'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'It може означати «це» і стояти після дії, якщо ти говориш, що не купуєш або не робиш саме цю річ.'
        : 'It может означать «это» и стоять после действия, если ты говоришь, что не покупаешь или не делаешь именно эту вещь.'
      }
    />,

    <Example key="e5" t={t} f={f} eng="We do not buy it" rus={isUK ? 'Ми не купуємо це' : 'Мы не покупаем это'} />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Порівняй: It does not work = це не працює. We do not buy it = ми не купуємо це. У першій фразі it — головний герой, у другій it — об\'єкт після дії.'
        : 'Сравни: It does not work = это не работает. We do not buy it = мы не покупаем это. В первой фразе it - главный герой, во второй it - объект после действия.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Готові блоки з уроку' : '8. Готовые блоки из урока'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У цих фразах головна граматика однакова: do not / does not + дія. Але самі словосполучення краще запам\'ятати як готові блоки.'
        : 'В этих фразах главная грамматика одинаковая: do not / does not + действие. Но сами словосочетания лучше запомнить как готовые блоки.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['listen to me', isUK ? 'слухати мене' : 'слушать меня', 'You do not listen to me'],
        ['ask for help', isUK ? 'просити допомоги' : 'просить помощи', 'He does not ask for help'],
        ['feel tired', isUK ? 'відчувати втому' : 'чувствовать усталость', 'I do not feel tired'],
        ['pay cash', isUK ? 'платити готівкою' : 'платить наличными', 'We do not pay cash / You do not pay cash'],
        ['carry cash', isUK ? 'носити готівку з собою' : 'носить наличные с собой', 'I do not carry cash'],
        ['skip breakfast', isUK ? 'пропускати сніданок' : 'пропускать завтрак', 'We do not skip breakfast'],
        ['waste time', isUK ? 'марнувати час' : 'тратить время зря', 'We do not waste time'],
        ['share food', isUK ? 'ділитися їжею' : 'делиться едой', 'We do not share food'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ You do not listen me → ✅ You do not listen to me. У блоці listen to після listen потрібне to.'
        : '❌ You do not listen me → ✅ You do not listen to me. В блоке listen to после listen нужно to.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ He does not ask help → ✅ He does not ask for help. У цій фразі потрібне for.'
        : '❌ He does not ask help → ✅ He does not ask for help. В этой фразе нужно for.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Дії з предметами' : '9. Действия с предметами'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Багато фраз у цьому уроці мають просту схему: хто + не робить + що. Після дії стоїть предмет: молоко, м\'ясо, квитки, гроші, повідомлення, карти.'
        : 'Много фраз в этом уроке имеют простую схему: кто + не делает + что. После действия стоит предмет: молоко, мясо, билеты, деньги, сообщения, карты.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Дія' : 'Действие', isUK ? 'Об\'єкт' : 'Объект', isUK ? 'Приклад' : 'Пример'],
        ['drink', 'milk / coffee / tea', 'I do not drink milk / She does not drink coffee / They do not drink tea'],
        ['eat', 'meat / sugar', 'I do not eat meat / She does not eat sugar'],
        ['sell', 'tickets', 'They do not sell tickets'],
        ['send', 'messages', 'She does not send messages'],
        ['use', 'apps / maps', 'You do not use apps / They do not use maps'],
        ['wear', 'glasses', 'They do not wear glasses / You do not wear glasses'],
        ['lose', 'money', 'We do not lose money / They do not lose money'],
      ]}
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Need help / need money' : '10. Need help / need money'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Need означає «потребувати / бути потрібним». В англійській це звичайне дієслово, тому в запереченні воно працює через do not або does not.'
        : 'Need означает «нуждаться / быть нужным». В английском это обычный глагол, поэтому в отрицании он работает через do not или does not.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод', isUK ? 'Що важливо' : 'Что важно'],
        ['I do not need help', isUK ? 'Мені не потрібна допомога' : 'Мне не нужна помощь', isUK ? 'help тут означає «допомога»' : 'help здесь означает «помощь»'],
        ['He does not need money', isUK ? 'Йому не потрібні гроші' : 'Ему не нужны деньги', isUK ? 'money = гроші' : 'money = деньги'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ He does not needs money → ✅ He does not need money. Після does not основне дієслово без -s.'
        : '❌ He does not needs money → ✅ He does not need money. После does not основной глагол без -s.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Переклад не завжди дослівний' : '11. Перевод не всегда дословный'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Англійська конструкція може бути дуже прямою, але українською або російською природний переклад звучить інакше. Це нормально. Важливо бачити англійську формулу.'
        : 'Английская конструкция может быть очень прямой, но по-русски естественный перевод звучит иначе. Это нормально. Важно видеть английскую формулу.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I do not feel tired', isUK ? 'Я не відчуваю втоми' : 'Я не чувствую усталости'],
        ['I do not need help', isUK ? 'Мені не потрібна допомога' : 'Мне не нужна помощь'],
        ['He does not need money', isUK ? 'Йому не потрібні гроші' : 'Ему не нужны деньги'],
        ['We do not waste time', isUK ? 'Ми не марнуємо час' : 'Мы не тратим время зря'],
        ['We do not share food', isUK ? 'Ми не ділимося їжею' : 'Мы не делимся едой'],
      ]}
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Найчастіші помилки' : '12. Самые частые ошибки'} />,

    <Warn key="w11" t={t} f={f} text={isUK ? '❌ She does not drinks coffee → ✅ She does not drink coffee. Після does not дієслово без -s.' : '❌ She does not drinks coffee → ✅ She does not drink coffee. После does not глагол без -s.'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ It do not work → ✅ It does not work. З it потрібне does not.' : '❌ It do not work → ✅ It does not work. С it нужно does not.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ They does not live here → ✅ They do not live here. З they потрібне do not.' : '❌ They does not live here → ✅ They do not live here. С they нужно do not.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ I do not am tired → ✅ I do not feel tired або I am not tired. Не змішуй To Be і звичайну дію.' : '❌ I do not am tired → ✅ I do not feel tired или I am not tired. Не смешивай To Be и обычное действие.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ She does not remember they → ✅ She does not remember them. Після remember потрібна форма them.' : '❌ She does not remember they → ✅ She does not remember them. После remember нужна форма them.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ He does not ask help → ✅ He does not ask for help. Після ask у цій фразі потрібне for.' : '❌ He does not ask help → ✅ He does not ask for help. После ask в этой фразе нужен for.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ You do not listen me → ✅ You do not listen to me. Після listen потрібне to.' : '❌ You do not listen me → ✅ You do not listen to me. После listen нужно to.'} />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Що треба винести з уроку' : '13. Что нужно вынести из урока'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся заперечувати звичайні дії. Якщо дія з I, you, we, they - став do not. Якщо дія з he, she, it - став does not. Після do not і does not основне дієслово завжди залишається простим.'
        : 'В этом уроке ты учишься отрицать обычные действия. Если действие с I, you, we, they - ставь do not. Если действие с he, she, it - ставь does not. После do not и does not основной глагол всегда остаётся простым.'
      }
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: I do not drink milk. She does not eat sugar. It does not work.'
        : 'Перед практикой держи три модели: I do not drink milk. She does not eat sugar. It does not work.'
      }
    />,
  ],
},

// ── УРОК 5 ──────────────────────────────────────────────────
5: {
  titleRU: 'Present Simple: Вопросы',
  titleUK: 'Present Simple: Питання',
  titlePtBr: "Present Simple: perguntas",
  titleVi: "Present Simple: câu hỏi",
  titleId: "Present Simple: pertanyaan",
  titleTr: "Present Simple: sorular",
  titlePl: "Present Simple: pytania",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся ставити питання про звичайні дії, звички, факти та ситуації: ти п\'єш каву? він тут живе? вона розуміє англійську? це дорого коштує?'
        : 'В этом уроке ты учишься задавать вопросы про обычные действия, привычки, факты и ситуации: ты пьёшь кофе? он здесь живёт? она понимает английский? это дорого стоит?'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['You drink coffee', 'Do you drink coffee?'],
        ['He lives here', 'Does he live here?'],
        ['She understands English', 'Does she understand English?'],
        ['It costs much', 'Does it cost much?'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: для питання зі звичайною дією в Present Simple потрібен помічник Do або Does на початку.'
        : 'Главная идея: для вопроса с обычным действием в Present Simple нужен помощник Do или Does в начале.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула питання' : '2. Главная формула вопроса'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Порядок слів у питанні дуже важливий. Спочатку ставиться Do або Does, потім людина або предмет, потім основна дія, потім продовження.'
        : 'Порядок слов в вопросе очень важен. Сначала ставится Do или Does, потом человек или предмет, потом основное действие, потом продолжение.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Помічник' : 'Помощник', isUK ? 'Хто?' : 'Кто?', isUK ? 'Дія' : 'Действие', isUK ? 'Продовження' : 'Продолжение', isUK ? 'Фраза' : 'Фраза'],
        ['Do', 'you', 'drink', 'coffee', 'Do you drink coffee?'],
        ['Does', 'he', 'live', 'here', 'Does he live here?'],
        ['Do', 'we', 'work', 'here', 'Do we work here?'],
        ['Does', 'she', 'understand', 'English', 'Does she understand English?'],
        ['Do', 'they', 'know', 'you', 'Do they know you?'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ You drink coffee? → ✅ Do you drink coffee? В англійській для нормального питання зі звичайною дією потрібен Do.'
        : '❌ You drink coffee? → ✅ Do you drink coffee? В английском для нормального вопроса с обычным действием нужен Do.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Do для I, you, we, they' : '3. Do для I, you, we, they'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'З I, you, we, they у питанні використовуй Do. Основне дієслово після Do залишається простим.'
        : 'С I, you, we, they в вопросе используй Do. Основной глагол после Do остаётся простым.'
      }
    />,

    <Example key="e1" t={t} f={f} eng="Do you drink coffee?" rus={isUK ? 'Ти п\'єш каву?' : 'Ты пьёшь кофе?'} />,
    <Example key="e2" t={t} f={f} eng="Do we work here?" rus={isUK ? 'Ми працюємо тут?' : 'Мы работаем здесь?'} />,
    <Example key="e3" t={t} f={f} eng="Do they know you?" rus={isUK ? 'Вони знають тебе?' : 'Они знают тебя?'} />,
    <Example key="e4" t={t} f={f} eng="Do you understand me?" rus={isUK ? 'Ти розумієш мене?' : 'Ты понимаешь меня?'} />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ Does you drink coffee? → ✅ Do you drink coffee? З you потрібен Do.'
        : '❌ Does you drink coffee? → ✅ Do you drink coffee? С you нужен Do.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Does для he, she, it' : '4. Does для he, she, it'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'З he, she, it у питанні використовуй Does. Після Does основне дієслово йде без -s, тому що -s уже заховане в Does.'
        : 'С he, she, it в вопросе используй Does. После Does основной глагол идёт без -s, потому что -s уже спрятано в Does.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['He lives here', 'Does he live here?'],
        ['She understands English', 'Does she understand English?'],
        ['She wears glasses', 'Does she wear glasses?'],
        ['It costs much', 'Does it cost much?'],
        ['He knows her', 'Does he know her?'],
        ['She needs help', 'Does she need help?'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ Does he lives here? → ✅ Does he live here? Після Does дієслово без -s.'
        : '❌ Does he lives here? → ✅ Does he live here? После Does глагол без -s.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ Do she understand English? → ✅ Does she understand English? З she потрібен Does.'
        : '❌ Do she understand English? → ✅ Does she understand English? С she нужен Does.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Do I...? — питання про себе' : '5. Do I...? - вопрос про себя'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці є кілька питань про себе: Do I write well? Do I look tired? Do I sing well? Do I look good? Do I sleep well? Це нормальна англійська структура, навіть якщо спочатку вона звучить незвично.'
        : 'В этом уроке есть несколько вопросов про себя: Do I write well? Do I look tired? Do I sing well? Do I look good? Do I sleep well? Это нормальная английская структура, даже если сначала она звучит непривычно.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Do I write well?', isUK ? 'Я добре пишу?' : 'Я хорошо пишу?'],
        ['Do I look tired?', isUK ? 'Я виглядаю втомленим?' : 'Я выгляжу усталым?'],
        ['Do I sing well?', isUK ? 'Я добре співаю?' : 'Я хорошо пою?'],
        ['Do I look good?', isUK ? 'Я добре виглядаю?' : 'Я выгляжу хорошо?'],
        ['Do I sleep well?', isUK ? 'Я добре сплю?' : 'Я хорошо сплю?'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Do I...? буквально запускає питання: чи я роблю це? Do I look good? - чи я добре виглядаю?'
        : 'Do I...? буквально запускает вопрос: делаю ли я это? Do I look good? - хорошо ли я выгляжу?'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Не плутай питання з To Be і дією' : '6. Не путай вопрос с To Be и действием'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок 2 був про питання з To Be: Are you busy? Is it free? Is she ready? Там Do не потрібен. Але в цьому уроці питання будуються зі звичайними діями: drink, live, understand, work, know, wear, help.'
        : 'Урок 2 был про вопросы с To Be: Are you busy? Is it free? Is she ready? Там Do не нужен. Но в этом уроке вопросы строятся с обычными действиями: drink, live, understand, work, know, wear, help.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання з To Be' : 'Вопрос с To Be', isUK ? 'Питання з дією' : 'Вопрос с действием'],
        ['Are you busy?', 'Do you drink coffee?'],
        ['Is she ready?', 'Does she understand English?'],
        ['Is it free?', 'Does it cost much?'],
        ['Are you okay?', 'Do you feel cold?'],
      ]}
    />,

    <Warn key="w5" t={t} f={f} text={isUK ? '❌ Are you drink coffee? → ✅ Do you drink coffee? Якщо є дія drink, потрібен Do.' : '❌ Are you drink coffee? → ✅ Do you drink coffee? Если есть действие drink, нужен Do.'} />,
    <Warn key="w6" t={t} f={f} text={isUK ? '❌ Do you are busy? → ✅ Are you busy? Якщо це To Be, Do не потрібен.' : '❌ Do you are busy? → ✅ Are you busy? Если это To Be, Do не нужен.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Me, you, her, us, them у питаннях' : '7. Me, you, her, us, them в вопросах'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'У питанні після дії може стояти людина, на яку ця дія спрямована: мене, тебе, її, нас, їх. В англійській для цього використовуються me, you, her, us, them.'
        : 'В вопросе после действия может стоять человек, на которого это действие направлено: меня, тебя, её, нас, их. В английском для этого используются me, you, her, us, them.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', isUK ? 'мене / мені' : 'меня / мне', 'Do you remember me? / Do you hear me?'],
        ['you', isUK ? 'тебе / тобі / вас / вам' : 'тебя / тебе / вас / вам', 'Do they know you?'],
        ['her', isUK ? 'її / їй' : 'её / ей', 'Does he know her?'],
        ['us', isUK ? 'нас / нам' : 'нас / нам', 'Do they know us? / Do they hear us?'],
        ['them', isUK ? 'їх / їм' : 'их / им', 'Do you understand them?'],
      ]}
    />,

    <Warn key="w7" t={t} f={f} text={isUK ? '❌ Does he know she? → ✅ Does he know her? Після дії потрібна форма her.' : '❌ Does he know she? → ✅ Does he know her? После действия нужна форма her.'} />,
    <Warn key="w8" t={t} f={f} text={isUK ? '❌ Do they hear we? → ✅ Do they hear us? Після hear потрібна форма us.' : '❌ Do they hear we? → ✅ Do they hear us? После hear нужна форма us.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Well, often, hard, much' : '8. Well, often, hard, much'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці є слова, які додають уточнення до питання: як добре? як часто? наскільки багато? Вони не змінюють головну формулу Do / Does.'
        : 'В этом уроке есть слова, которые добавляют уточнение к вопросу: как хорошо? как часто? насколько много? Они не меняют главную формулу Do / Does.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['well', isUK ? 'добре / якісно' : 'хорошо / качественно', 'Do I write well? / Do I sing well? / Do I sleep well?'],
        ['often', isUK ? 'часто' : 'часто', 'Do you travel often? / Does he call often? / Does she cook often?'],
        ['hard', isUK ? 'старанно / наполегливо' : 'усердно / напряжённо', 'Do we study hard?'],
        ['much', isUK ? 'багато / сильно' : 'много / сильно', 'Does it cost much?'],
      ]}
    />,

    <Tip key="tip3" t={t} f={f} text={isUK ? 'Do I write well? - питання не про сам факт письма, а про якість: чи я добре пишу?' : 'Do I write well? - вопрос не про сам факт письма, а про качество: хорошо ли я пишу?'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Де стоїть often' : '9. Где стоит often'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Often означає «часто». У цьому уроці воно може стояти в кінці питання або перед основною дією. Обидві моделі зустрічаються в живій англійській.'
        : 'Often означает «часто». В этом уроке оно может стоять в конце вопроса или перед основным действием. Обе модели встречаются в живом английском.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Місце often' : 'Место often', isUK ? 'Приклади' : 'Примеры'],
        [isUK ? 'В кінці питання' : 'В конце вопроса', 'Do you travel often? / Does he call often? / Does she cook often?'],
        [isUK ? 'Перед основною дією' : 'Перед основным действием', 'Does he often forget?'],
      ]}
    />,

    <Tip key="tip4" t={t} f={f} text={isUK ? 'Для новачка безпечна модель: став often у кінці короткого питання. Do you travel often? Does she cook often?' : 'Для новичка безопасная модель: ставь often в конце короткого вопроса. Do you travel often? Does she cook often?'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Look і feel у цьому уроці' : '10. Look и feel в этом уроке'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Look у цих фразах означає «виглядати», а не «дивитися». Feel означає «відчувати себе / відчувати». Це важливо, бо переклад не завжди дослівний.'
        : 'Look в этих фразах означает «выглядеть», а не «смотреть». Feel означает «чувствовать себя / чувствовать». Это важно, потому что перевод не всегда дословный.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Do I look tired?', isUK ? 'Я виглядаю втомленим?' : 'Я выгляжу усталым?'],
        ['Do I look good?', isUK ? 'Я добре виглядаю?' : 'Я выгляжу хорошо?'],
        ['Do you feel cold?', isUK ? 'Тобі холодно?' : 'Тебе холодно?'],
        ['Does she feel tired?', isUK ? 'Вона відчуває втому?' : 'Она чувствует усталость?'],
      ]}
    />,

    <Warn key="w9" t={t} f={f} text={isUK ? '❌ Do I look at tired? → ✅ Do I look tired? Look тут означає «виглядати», тому at не потрібне.' : '❌ Do I look at tired? → ✅ Do I look tired? Look здесь означает «выглядеть», поэтому at не нужен.'} />,
    <Tip key="tip5" t={t} f={f} text={isUK ? 'Do you feel cold? дослівно схоже на «ти відчуваєш холод?», але природно це «тобі холодно?».' : 'Do you feel cold? дословно похоже на «ты чувствуешь холод?», но естественно это «тебе холодно?».'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. It + cost у питанні' : '11. It + cost в вопросе'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У твердженні ми кажемо It costs much. Але в питанні Does забирає на себе граматичну роботу, тому основна дія стає просто cost.'
        : 'В утверждении мы говорим It costs much. Но в вопросе Does забирает на себя грамматическую работу, поэтому основное действие становится просто cost.'
      }
    />,

    <Table key="t10" t={t} f={f} rows={[[isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'], ['It costs much', 'Does it cost much?']]} />,
    <Warn key="w10" t={t} f={f} text={isUK ? '❌ Does it costs much? → ✅ Does it cost much? Після Does основна дія без -s.' : '❌ Does it costs much? → ✅ Does it cost much? После Does основное действие без -s.'} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Готові блоки з уроку' : '12. Готовые блоки из урока'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У цих фразах головна граматика така сама: Do / Does + хто + дія. Але самі словосполучення краще запам\'ятати як готові блоки.'
        : 'В этих фразах главная грамматика та же: Do / Does + кто + действие. Но сами словосочетания лучше запомнить как готовые блоки.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['pay cash', isUK ? 'платити готівкою' : 'платить наличными', 'Do we pay cash?'],
        ['take cards', isUK ? 'приймати картки' : 'принимать карты', 'Do they take cards?'],
        ['reserve rooms', isUK ? 'бронювати номери' : 'бронировать номера', 'Do we reserve rooms?'],
        ['find mistakes', isUK ? 'знаходити помилки' : 'находить ошибки', 'Does he find mistakes?'],
        ['wear glasses', isUK ? 'носити окуляри' : 'носить очки', 'Do you wear glasses?'],
        ['pay taxes', isUK ? 'платити податки' : 'платить налоги', 'Do we pay taxes?'],
        ['sell tickets', isUK ? 'продавати квитки' : 'продавать билеты', 'Do they sell tickets?'],
        ['sell vegetables', isUK ? 'продавати овочі' : 'продавать овощи', 'Do they sell vegetables?'],
      ]}
    />,

    <Warn key="w11" t={t} f={f} text={isUK ? 'Take cards у цій фразі означає «приймати картки», а не буквально «брати картки руками».' : 'Take cards в этой фразе означает «принимать карты», а не буквально «брать карты руками».'} />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Need help і want work' : '13. Need help и want work'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Need і want у цьому уроці працюють як звичайні дієслова, тому в питанні вони йдуть після Do або Does. Але важливо зрозуміти, що help і work тут можуть бути іменниками.'
        : 'Need и want в этом уроке работают как обычные глаголы, поэтому в вопросе они идут после Do или Does. Но важно понять, что help и work здесь могут быть существительными.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо зрозуміти' : 'Что важно понять'],
        ['Does she need help?', isUK ? 'help тут означає «допомога»' : 'help здесь означает «помощь»'],
        ['Does she want work?', isUK ? 'work тут означає «робота», а не дія «працювати»' : 'work здесь означает «работа», а не действие «работать»'],
      ]}
    />,

    <Warn key="w12" t={t} f={f} text={isUK ? '❌ Does she needs help? → ✅ Does she need help? Після Does основне дієслово без -s.' : '❌ Does she needs help? → ✅ Does she need help? После Does основной глагол без -s.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '⚠️ Does she want to work? — це інший зміст: «вона хоче працювати?» У фразі уроку Does she want work? зміст: «вона хоче роботу?»' : '⚠️ Does she want to work? - это другой смысл: «она хочет работать?» Во фразе урока Does she want work? смысл: «она хочет работу?»'} />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Найчастіші помилки' : '14. Самые частые ошибки'} />,

    <Warn key="w14" t={t} f={f} text={isUK ? '❌ Does he drinks tea? → ✅ Does he drink tea? Після Does дієслово без -s.' : '❌ Does he drinks tea? → ✅ Does he drink tea? После Does глагол без -s.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ Do she eat meat? → ✅ Does she eat meat? З she потрібен Does.' : '❌ Do she eat meat? → ✅ Does she eat meat? С she нужен Does.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ Does they sell tickets? → ✅ Do they sell tickets? З they потрібен Do.' : '❌ Does they sell tickets? → ✅ Do they sell tickets? С they нужен Do.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ Are you understand me? → ✅ Do you understand me? Understand — це звичайна дія/стан, тут потрібен Do.' : '❌ Are you understand me? → ✅ Do you understand me? Understand - это обычное действие/состояние, тут нужен Do.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ Does she wears glasses? → ✅ Does she wear glasses? Після Does основна дія без -s.' : '❌ Does she wears glasses? → ✅ Does she wear glasses? После Does основное действие без -s.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ Do I looks tired? → ✅ Do I look tired? З Do основна дія не отримує -s.' : '❌ Do I looks tired? → ✅ Do I look tired? С Do основное действие не получает -s.'} />,
    <Warn key="w20" t={t} f={f} text={isUK ? '❌ Does he know she? → ✅ Does he know her? Після know потрібна форма her.' : '❌ Does he know she? → ✅ Does he know her? После know нужна форма her.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Що треба винести з уроку' : '15. Что нужно вынести из урока'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся ставити питання про звичайні дії та факти. З I, you, we, they використовуй Do. З he, she, it використовуй Does. Після Does основне дієслово завжди йде без -s.'
        : 'В этом уроке ты учишься задавать вопросы про обычные действия и факты. С I, you, we, they используй Do. С he, she, it используй Does. После Does основной глагол всегда идёт без -s.'
      }
    />,

    <Tip
      key="tip6"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: Do you drink coffee? Does he live here? Does it cost much?'
        : 'Перед практикой держи три модели: Do you drink coffee? Does he live here? Does it cost much?'
      }
    />,
  ],
},

// ── УРОК 6 ──────────────────────────────────────────────────
6: {
  titleRU: 'Специальные вопросы: Where, What, When, Why, How',
  titleUK: 'Спеціальні питання: Where, What, When, Why, How',
  titlePtBr: "Perguntas especiais: Where, What, When, Why, How",
  titleVi: "Câu hỏi đặc biệt: Where, What, When, Why, How",
  titleId: "Pertanyaan khusus: Where, What, When, Why, How",
  titleTr: "Özel sorular: Where, What, When, Why, How",
  titlePl: "Pytania szczegółowe: Where, What, When, Why, How",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У минулому уроці ти ставив питання, на які можна відповісти так або ні: Do you drink coffee? Does he live here? У цьому уроці ти вчишся ставити точніші питання: де, що, коли, чому, як і скільки.'
        : 'В прошлом уроке ты задавал вопросы, на которые можно ответить да или нет: Do you drink coffee? Does he live here? В этом уроке ты учишься задавать более точные вопросы: где, что, когда, почему, как и сколько.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання так/ні з уроку 5' : 'Вопрос да/нет из урока 5', isUK ? 'Точне питання з уроку 6' : 'Точный вопрос из урока 6'],
        ['Do you drink coffee?', 'What do you drink?'],
        ['Does he live here?', 'Where does he go?'],
        ['Do we work here?', 'When do we start?'],
        ['Does it cost much?', 'How much does it cost?'],
        ['Does she cook often?', 'What does she usually cook?'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: питальне слово ставиться перед do або does. Далі порядок такий самий, як у звичайному питанні Present Simple.'
        : 'Главная идея: вопросительное слово ставится перед do или does. Дальше порядок такой же, как в обычном вопросе Present Simple.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Спеціальне питання будується так: питальне слово + do/does + людина або предмет + дія. Не міняй цю логіку місцями.'
        : 'Специальный вопрос строится так: вопросительное слово + do/does + человек или предмет + действие. Не меняй эту логику местами.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питальне слово' : 'Вопросительное слово', 'do/does', isUK ? 'Хто?' : 'Кто?', isUK ? 'Дія' : 'Действие', isUK ? 'Фраза' : 'Фраза'],
        ['Where', 'do', 'you', 'live', 'Where do you live?'],
        ['What', 'does', 'he', 'eat', 'What does he eat?'],
        ['When', 'do', 'we', 'start', 'When do we start?'],
        ['Why', 'does', 'she', 'cry', 'Why does she cry?'],
        ['How', 'do', 'they', 'work', 'How do they work?'],
        ['How much', 'does', 'it', 'cost', 'How much does it cost?'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ Where you live? → ✅ Where do you live? У Present Simple після where потрібен do або does.'
        : '❌ Where you live? → ✅ Where do you live? В Present Simple после where нужен do или does.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Що означають питальні слова' : '3. Что означают вопросительные слова'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Кожне питальне слово відкриває свій тип відповіді. У цьому уроці вони повторюються багато разів, щоб ти почав упізнавати їх автоматично.'
        : 'Каждое вопросительное слово открывает свой тип ответа. В этом уроке они повторяются много раз, чтобы ты начал узнавать их автоматически.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Питає про' : 'Спрашивает про', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['Where', isUK ? 'місце або напрямок' : 'место или направление', 'Where do you live? / Where does he go?'],
        ['What', isUK ? 'предмет, дію або інформацію' : 'предмет, действие или информацию', 'What do you drink? / What do I sign?'],
        ['When', isUK ? 'час' : 'время', 'When do we start? / When does she call?'],
        ['Why', isUK ? 'причину' : 'причину', 'Why do we wait? / Why does she want help?'],
        ['How', isUK ? 'спосіб' : 'способ', 'How do you get home? / How does he do it?'],
        ['How much', isUK ? 'ціну або кількість' : 'цену или количество', 'How much does it cost?'],
      ]}
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Do для I, you, we, they' : '4. Do для I, you, we, they'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'З I, you, we, they після питального слова використовуй do. Основне дієслово після do залишається простим.'
        : 'С I, you, we, they после вопросительного слова используй do. Основной глагол после do остаётся простым.'
      }
    />,

    <Example key="e1" t={t} f={f} eng="Where do you live?" rus={isUK ? 'Де ти живеш?' : 'Где ты живёшь?'} />,
    <Example key="e2" t={t} f={f} eng="When do we start?" rus={isUK ? 'Коли ми починаємо?' : 'Когда мы начинаем?'} />,
    <Example key="e3" t={t} f={f} eng="Why do they close doors?" rus={isUK ? 'Чому вони зачиняють двері?' : 'Почему они закрывают двери?'} />,
    <Example key="e4" t={t} f={f} eng="What do you usually buy?" rus={isUK ? 'Що ти зазвичай купуєш?' : 'Что ты обычно покупаешь?'} />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ What does you drink? → ✅ What do you drink? З you потрібен do.'
        : '❌ What does you drink? → ✅ What do you drink? С you нужен do.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Does для he, she, it' : '5. Does для he, she, it'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'З he, she, it після питального слова використовуй does. Після does основне дієслово йде без -s.'
        : 'С he, she, it после вопросительного слова используй does. После does основной глагол идёт без -s.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питальне слово' : 'Вопросительное слово', 'does', isUK ? 'Дія без -s' : 'Действие без -s', isUK ? 'Фраза з уроку' : 'Фраза из урока'],
        ['What', 'does he', 'eat', 'What does he eat?'],
        ['When', 'does she', 'call', 'When does she call?'],
        ['Where', 'does he', 'work', 'Where does he work?'],
        ['How', 'does she', 'open', 'How does she open apps?'],
        ['How much', 'does it', 'cost', 'How much does it cost?'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ What does he eats? → ✅ What does he eat? Після does дієслово без -s.'
        : '❌ What does he eats? → ✅ What does he eat? После does глагол без -s.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ How do she open apps? → ✅ How does she open apps? З she потрібен does.'
        : '❌ How do she open apps? → ✅ How does she open apps? С she нужен does.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Where може означати «де» і «куди»' : '6. Where может означать «где» и «куда»'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'В англійській where часто використовується і для місця, і для напрямку. Українською або російською ми можемо перекладати це як «де» або «куди» залежно від дії.'
        : 'В английском where часто используется и для места, и для направления. По-русски мы можем переводить это как «где» или «куда» в зависимости от действия.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Where do you live?', isUK ? 'Де ти живеш?' : 'Где ты живёшь?'],
        ['Where does he work?', isUK ? 'Де він працює?' : 'Где он работает?'],
        ['Where does he go?', isUK ? 'Куди він іде?' : 'Куда он идёт?'],
        ['Where do we send reports?', isUK ? 'Куди ми відправляємо звіти?' : 'Куда мы отправляем отчёты?'],
        ['Where do we put luggage?', isUK ? 'Куди ми кладемо багаж?' : 'Куда мы кладём багаж?'],
        ['Where does she put bags?', isUK ? 'Куди вона кладе сумки?' : 'Куда она кладёт сумки?'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Не шукай окреме слово для «куди» в цих фразах. В англійській тут працює where.'
        : 'Не ищи отдельное слово для «куда» в этих фразах. В английском здесь работает where.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. How much does it cost?' : '7. How much does it cost?'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'How much означає «скільки» у питаннях про ціну або кількість. У цьому уроці це головний блок для питання про вартість.'
        : 'How much означает «сколько» в вопросах про цену или количество. В этом уроке это главный блок для вопроса о стоимости.'
      }
    />,

    <Example key="e5" t={t} f={f} eng="How much does it cost?" rus={isUK ? 'Скільки це коштує?' : 'Сколько это стоит?'} />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Cost з it працює через does у питанні: It costs → How much does it cost?'
        : 'Cost с it работает через does в вопросе: It costs → How much does it cost?'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Готові смислові блоки з уроку' : '8. Готовые смысловые блоки из урока'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці важливо не тільки знати формулу питання, а й упізнавати готові смислові блоки. Саме вони роблять фразу природною.'
        : 'В этом уроке важно не только знать формулу вопроса, но и узнавать готовые смысловые блоки. Именно они делают фразу естественной.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['get home', isUK ? 'дістатися додому' : 'добраться домой', 'How do you get home?'],
        ['come home', isUK ? 'приходити додому' : 'приходить домой', 'When do they come home?'],
        ['finish work', isUK ? 'закінчувати роботу' : 'заканчивать работу', 'When do they finish work?'],
        ['want help', isUK ? 'хотіти допомоги' : 'хотеть помощи', 'Why does she want help?'],
        ['need help', isUK ? 'потребувати допомоги / потрібна допомога' : 'нуждаться в помощи / нужна помощь', 'Why do they need help?'],
        ['keep money', isUK ? 'зберігати гроші' : 'хранить деньги', 'Where does he keep money?'],
        ['carry cash', isUK ? 'носити готівку з собою' : 'носить наличные с собой', 'Why does she carry cash?'],
        ['meet guests', isUK ? 'зустрічати гостей' : 'встречать гостей', 'Where do we meet guests?'],
        ['find exits', isUK ? 'знаходити виходи' : 'находить выходы', 'How do we find exits?'],
        ['find routes', isUK ? 'знаходити маршрути' : 'находить маршруты', 'How does he find routes?'],
        ['book it', isUK ? 'забронювати це' : 'забронировать это', 'How do we book it?'],
        ['buy groceries', isUK ? 'купувати продукти' : 'покупать продукты', 'Where does he buy groceries?'],
        ['speak slowly', isUK ? 'говорити повільно' : 'говорить медленно', 'Why does she speak slowly?'],
        ['check bills', isUK ? 'перевіряти рахунки' : 'проверять счета', 'How do we check bills?'],
      ]}
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Ці блоки краще вчити не окремими словами, а цілими шматками: get home, want help, keep money, carry cash, check bills.'
        : 'Эти блоки лучше учить не отдельными словами, а цельными кусками: get home, want help, keep money, carry cash, check bills.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Help, work, cash, money, luggage — тут це речі, не дії' : '9. Help, work, cash, money, luggage - здесь это вещи, не действия'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Деякі слова можуть збивати з пантелику, бо виглядають знайомо як дії. Але в цих фразах вони працюють як іменники: допомога, робота, готівка, гроші, багаж.'
        : 'Некоторые слова могут сбивать с толку, потому что выглядят знакомо как действия. Но в этих фразах они работают как существительные: помощь, работа, наличные, деньги, багаж.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо зрозуміти' : 'Что важно понять'],
        ['Why does she want help?', isUK ? 'help тут означає «допомога», а не дія «допомагати»' : 'help здесь означает «помощь», а не действие «помогать»'],
        ['Why do they need help?', isUK ? 'need help = потребувати допомоги / потрібна допомога' : 'need help = нуждаться в помощи / нужна помощь'],
        ['When do they finish work?', isUK ? 'work тут означає «робота», а не дія «працювати»' : 'work здесь означает «работа», а не действие «работать»'],
        ['Why does she carry cash?', isUK ? 'cash = готівка, яку людина носить із собою' : 'cash = наличные, которые человек носит с собой'],
        ['Where does he keep money?', isUK ? 'money = гроші, а keep money = зберігати гроші' : 'money = деньги, а keep money = хранить деньги'],
        ['Where do we put luggage?', isUK ? 'luggage = багаж. Зазвичай без a/an і без множини' : 'luggage = багаж. Обычно без a/an и без множественного числа'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ Why does she want to help? — це вже інший зміст: «чому вона хоче допомогти?» У фразі уроку Why does she want help? зміст: «чому вона хоче допомоги?»'
        : '❌ Why does she want to help? - это уже другой смысл: «почему она хочет помочь?» Во фразе урока Why does she want help? смысл: «почему она хочет помощи?»'
      }
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ When do they finish to work? → ✅ When do they finish work? У цій фразі work — іменник «робота», тому to не потрібне.'
        : '❌ When do they finish to work? → ✅ When do they finish work? В этой фразе work - существительное «работа», поэтому to не нужно.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Put, find, start, close — дії з об\'єктом' : '10. Put, find, start, close - действия с объектом'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У частині фраз після дії одразу стоїть об\'єкт: що саме кладемо, знаходимо, починаємо або закриваємо. Це нормальна англійська структура: дія + що.'
        : 'В части фраз после действия сразу стоит объект: что именно кладём, находим, начинаем или закрываем. Это нормальная английская структура: действие + что.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Дія' : 'Действие', isUK ? 'Об\'єкт' : 'Объект', isUK ? 'Фраза' : 'Фраза', isUK ? 'Переклад' : 'Перевод'],
        ['put', 'luggage', 'Where do we put luggage?', isUK ? 'Куди ми кладемо багаж?' : 'Куда мы кладём багаж?'],
        ['put', 'bags', 'Where does she put bags?', isUK ? 'Куди вона кладе сумки?' : 'Куда она кладёт сумки?'],
        ['find', 'exits', 'How do we find exits?', isUK ? 'Як ми знаходимо виходи?' : 'Как мы находим выходы?'],
        ['find', 'routes', 'How does he find routes?', isUK ? 'Як він знаходить маршрути?' : 'Как он находит маршруты?'],
        ['start', 'meetings', 'When do they start meetings?', isUK ? 'Коли вони починають зустрічі?' : 'Когда они начинают встречи?'],
        ['close', 'doors', 'Why do they close doors?', isUK ? 'Чому вони зачиняють двері?' : 'Почему они закрывают двери?'],
        ['close', 'windows', 'Why does she close windows?', isUK ? 'Чому вона зачиняє вікна?' : 'Почему она закрывает окна?'],
        ['close', 'the cafe', 'When do they close the cafe?', isUK ? 'Коли вони зачиняють кафе?' : 'Когда они закрывают кафе?'],
      ]}
    />,

    <Tip
      key="tip5"
      t={t}
      f={f}
      text={isUK
        ? 'Put у таких фразах означає «покласти / поставити». Where do we put luggage? буквально питає: куди ми кладемо багаж?'
        : 'Put в таких фразах означает «положить / поставить». Where do we put luggage? буквально спрашивает: куда мы кладём багаж?'
      }
    />,

    <Tip
      key="tip6"
      t={t}
      f={f}
      text={isUK
        ? 'Find у цьому уроці означає саме «знаходити»: find exits, find routes, find it.'
        : 'Find в этом уроке означает именно «находить»: find exits, find routes, find it.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. It на початку і it після дії' : '11. It в начале и it после действия'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Слово it може стояти на початку речення або після дії. На початку it часто означає «це» як головний предмет розмови. Після дії it означає «це» як об\'єкт дії.'
        : 'Слово it может стоять в начале предложения или после действия. В начале it часто означает «это» как главный предмет разговора. После действия it означает «это» как объект действия.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'It як головний предмет' : 'It как главный предмет', isUK ? 'It після дії' : 'It после действия'],
        ['How much does it cost?', 'How does he do it?'],
        [isUK ? 'Скільки це коштує?' : 'Сколько это стоит?', isUK ? 'Як він це робить?' : 'Как он это делает?'],
        ['Does it work?', 'How do you find it?'],
        [isUK ? 'Це працює?' : 'Это работает?', isUK ? 'Як ти це знаходиш?' : 'Как ты это находишь?'],
        ['It costs money', 'How do we book it?'],
        [isUK ? 'Це коштує грошей' : 'Это стоит денег', isUK ? 'Як ми це бронюємо?' : 'Как мы это бронируем?'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? 'Не плутай: How much does it cost? — it стоїть перед дією і означає «це». How do we book it? — it стоїть після дії і теж означає «це», але вже як об\'єкт.'
        : 'Не путай: How much does it cost? - it стоит перед действием и означает «это». How do we book it? - it стоит после действия и тоже означает «это», но уже как объект.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Usually і always у питаннях' : '12. Usually и always в вопросах'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Usually означає «зазвичай», always означає «завжди». У питаннях цього уроку вони стоять після do/does + людина, перед основною дією.'
        : 'Usually означает «обычно», always означает «всегда». В вопросах этого урока они стоят после do/does + человек, перед основным действием.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Переклад' : 'Перевод'],
        ['What do you usually buy?', isUK ? 'Що ти зазвичай купуєш?' : 'Что ты обычно покупаешь?'],
        ['When does she usually come?', isUK ? 'Коли вона зазвичай приходить?' : 'Когда она обычно приходит?'],
        ['What does she usually cook?', isUK ? 'Що вона зазвичай готує?' : 'Что она обычно готовит?'],
        ['What do you usually wear?', isUK ? 'Що ти зазвичай носиш?' : 'Что ты обычно носишь?'],
        ['What do you usually watch?', isUK ? 'Що ти зазвичай дивишся?' : 'Что ты обычно смотришь?'],
        ['What do you usually order?', isUK ? 'Що ти зазвичай замовляєш?' : 'Что ты обычно заказываешь?'],
        ['Why does she always help?', isUK ? 'Чому вона завжди допомагає?' : 'Почему она всегда помогает?'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ What usually do you buy? → ✅ What do you usually buy? У цій моделі usually стоїть після do you.'
        : '❌ What usually do you buy? → ✅ What do you usually buy? В этой модели usually стоит после do you.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ Why always does she help? → ✅ Why does she always help? Always стоїть після does she.'
        : '❌ Why always does she help? → ✅ Why does she always help? Always стоит после does she.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Найчастіші помилки' : '13. Самые частые ошибки'} />,

    <Warn key="w10" t={t} f={f} text={isUK ? '❌ Where you live? → ✅ Where do you live? Після where потрібен do.' : '❌ Where you live? → ✅ Where do you live? После where нужен do.'} />,
    <Warn key="w11" t={t} f={f} text={isUK ? '❌ What does he eats? → ✅ What does he eat? Після does дієслово без -s.' : '❌ What does he eats? → ✅ What does he eat? После does глагол без -s.'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ When she calls? → ✅ When does she call? У Present Simple питання потребує does.' : '❌ When she calls? → ✅ When does she call? В Present Simple вопрос требует does.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ Why do she cry? → ✅ Why does she cry? З she потрібен does.' : '❌ Why do she cry? → ✅ Why does she cry? С she нужен does.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ How much it costs? → ✅ How much does it cost? У питанні потрібен does, а cost без -s.' : '❌ How much it costs? → ✅ How much does it cost? В вопросе нужен does, а cost без -s.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ Where does he keeps money? → ✅ Where does he keep money? Після does основна дія без -s.' : '❌ Where does he keeps money? → ✅ Where does he keep money? После does основное действие без -s.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ Where do we put a luggage? → ✅ Where do we put luggage? Luggage зазвичай не отримує a.' : '❌ Where do we put a luggage? → ✅ Where do we put luggage? Luggage обычно не получает a.'} />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Що треба винести з уроку' : '14. Что нужно вынести из урока'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся ставити спеціальні питання в Present Simple. Спочатку став питальне слово: where, what, when, why, how або how much. Потім став do або does. Потім людину або предмет. Потім дію. Якщо є does, основна дія йде без -s.'
        : 'В этом уроке ты учишься задавать специальные вопросы в Present Simple. Сначала ставь вопросительное слово: where, what, when, why, how или how much. Потом ставь do или does. Потом человека или предмет. Потом действие. Если есть does, основное действие идёт без -s.'
      }
    />,

    <Tip
      key="tip7"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай формулу: Where do you live? What does he eat? How much does it cost? А потім додавай блоки: get home, want help, keep money, put luggage, check bills.'
        : 'Перед практикой держи формулу: Where do you live? What does he eat? How much does it cost? А потом добавляй блоки: get home, want help, keep money, put luggage, check bills.'
      }
    />,
  ],
},

// ── УРОК 7 ──────────────────────────────────────────────────
// ── УРОК 7 ──────────────────────────────────────────────────
7: {
  titleRU: 'Have / Has: у меня есть',
  titleUK: 'Have / Has: у мене є',
  titlePtBr: "Have / Has: eu tenho",
  titleVi: "Have / Has: tôi có",
  titleId: "Have / Has: saya punya",
  titleTr: "Have / Has: sahip olmak",
  titlePl: "Have / Has: mam",
  render: (t, isUK, f) => [
    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити, що у когось щось є: у мене є час, у тебе є гроші, у нього є телефон, у нас є документи. В англійській для цього використовується have або has.'
        : 'В этом уроке ты учишься говорить, что у кого-то что-то есть: у меня есть время, у тебя есть деньги, у него есть телефон, у нас есть документы. В английском для этого используется have или has.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Українська / російська логіка' : 'Русская логика', isUK ? 'Англійська логіка' : 'Английская логика'],
        [isUK ? 'У мене є час' : 'У меня есть время', 'I have time'],
        [isUK ? 'У тебе є гроші' : 'У тебя есть деньги', 'You have money'],
        [isUK ? 'У нього є телефон' : 'У него есть телефон', 'He has a phone'],
        [isUK ? 'У нас є документи' : 'У нас есть документы', 'We have documents'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: англійська не каже буквально «у мене є». Вона каже I have - я маю / у мене є.'
        : 'Главная идея: английский не говорит буквально «у меня есть». Он говорит I have - я имею / у меня есть.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Базова формула дуже проста: хто + have/has + що. Have або has показує, що щось є у людини або групи.'
        : 'Базовая формула очень простая: кто + have/has + что. Have или has показывает, что что-то есть у человека или группы.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', 'have / has', isUK ? 'Що є?' : 'Что есть?', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'have', 'time', 'I have time'],
        ['You', 'have', 'money', 'You have money'],
        ['He', 'has', 'a phone', 'He has a phone'],
        ['She', 'has', 'a bag', 'She has a bag'],
        ['We', 'have', 'Wi-Fi', 'We have Wi-Fi'],
        ['They', 'have', 'tickets', 'They have tickets'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I am have time → ✅ I have time. Have вже є головним дієсловом, тому am не потрібен.'
        : '❌ I am have time → ✅ I have time. Have уже является главным глаголом, поэтому am не нужен.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Have для I, you, we, they' : '3. Have для I, you, we, they'} />,

    <Body key="b3a" t={t} f={f} text={isUK ? 'З I, you, we, they використовуй have. Це основна форма.' : 'С I, you, we, they используй have. Это основная форма.'} />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I', 'I have time', isUK ? 'У мене є час' : 'У меня есть время'],
        ['I', 'I have cash', isUK ? 'У мене є готівка' : 'У меня есть наличные'],
        ['I', 'I have a question', isUK ? 'У мене є питання' : 'У меня есть вопрос'],
        ['You', 'You have money', isUK ? 'У тебе є гроші' : 'У тебя есть деньги'],
        ['You', 'You have a problem', isUK ? 'У тебе є проблема' : 'У тебя есть проблема'],
        ['We', 'We have Wi-Fi', isUK ? 'У нас є Wi-Fi' : 'У нас есть Wi-Fi'],
        ['We', 'We have documents', isUK ? 'У нас є документи' : 'У нас есть документы'],
        ['They', 'They have tickets', isUK ? 'У них є квитки' : 'У них есть билеты'],
      ]}
    />,

    <Warn key="w2" t={t} f={f} text={isUK ? '❌ I has time → ✅ I have time. З I потрібне have.' : '❌ I has time → ✅ I have time. С I нужно have.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Has для he, she' : '4. Has для he, she'} />,

    <Body key="b4a" t={t} f={f} text={isUK ? 'З he та she використовуй has. Це та сама ідея «у нього є / у неї є», але форма змінюється.' : 'С he и she используй has. Это та же идея «у него есть / у неё есть», но форма меняется.'} />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['He', 'He has a phone', isUK ? 'У нього є телефон' : 'У него есть телефон'],
        ['He', 'He has an idea', isUK ? 'У нього є ідея' : 'У него есть идея'],
        ['He', 'He has a key', isUK ? 'У нього є ключ' : 'У него есть ключ'],
        ['He', 'He has a passport', isUK ? 'У нього є паспорт' : 'У него есть паспорт'],
        ['She', 'She has a bag', isUK ? 'У неї є сумка' : 'У неё есть сумка'],
        ['She', 'She has a plan', isUK ? 'У неї є план' : 'У неё есть план'],
        ['She', 'She has an umbrella', isUK ? 'У неї є парасоля' : 'У неё есть зонт'],
      ]}
    />,

    <Warn key="w3" t={t} f={f} text={isUK ? '❌ He have a phone → ✅ He has a phone. З he потрібне has.' : '❌ He have a phone → ✅ He has a phone. С he нужно has.'} />,
    <Warn key="w4" t={t} f={f} text={isUK ? '❌ She have a plan → ✅ She has a plan. З she потрібне has.' : '❌ She have a plan → ✅ She has a plan. С she нужно has.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Питання з have: Do / Does' : '5. Вопросы с have: Do / Does'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Have у цьому уроці працює як звичайне дієслово. Тому питання будуються через Do або Does: Do you have...? Does he have...?'
        : 'Have в этом уроке работает как обычный глагол. Поэтому вопросы строятся через Do или Does: Do you have...? Does he have...?'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання з уроку' : 'Вопрос из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Do you have time?', isUK ? 'У тебе є час?' : 'У тебя есть время?'],
        ['Does he have money?', isUK ? 'У нього є гроші?' : 'У него есть деньги?'],
        ['Does she have a phone?', isUK ? 'У неї є телефон?' : 'У неё есть телефон?'],
        ['Do you have a question?', isUK ? 'У тебе є питання?' : 'У тебя есть вопрос?'],
        ['Do we have documents?', isUK ? 'У нас є документи?' : 'У нас есть документы?'],
        ['Do they have bags?', isUK ? 'У них є сумки?' : 'У них есть сумки?'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ Have you time? → ✅ Do you have time? У цьому курсі тримаємо сучасну базову модель: Do you have...?'
        : '❌ Have you time? → ✅ Do you have time? В этом курсе держим современную базовую модель: Do you have...?'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Після Does завжди have, не has' : '6. После Does всегда have, не has'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'У твердженні з he або she ми кажемо has. Але в питанні does забирає граматичну роботу на себе, тому після does ставимо have.'
        : 'В утверждении с he или she мы говорим has. Но в вопросе does забирает грамматическую работу на себя, поэтому после does ставим have.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма з уроку' : 'Форма из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['He has an idea', isUK ? 'у твердженні з he стоїть has' : 'в утверждении с he стоит has'],
        ['Does he have an idea?', isUK ? 'після Does стоїть have' : 'после Does стоит have'],
        ['Does he have a key?', isUK ? 'не has, а have' : 'не has, а have'],
        ['Does she have an umbrella?', isUK ? 'не has, а have' : 'не has, а have'],
        ['Does she have a passport?', isUK ? 'не has, а have' : 'не has, а have'],
      ]}
    />,

    <Warn key="w6" t={t} f={f} text={isUK ? '❌ Does he has money? → ✅ Does he have money? Після Does завжди have.' : '❌ Does he has money? → ✅ Does he have money? После Does всегда have.'} />,
    <Warn key="w7" t={t} f={f} text={isUK ? '❌ Does she has a phone? → ✅ Does she have a phone? Has повертається в have після Does.' : '❌ Does she has a phone? → ✅ Does she have a phone? Has возвращается в have после Does.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Заперечення: do not have / does not have' : '7. Отрицание: do not have / does not have'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб сказати, що чогось немає, використовуй do not have або does not have. Після does not також завжди стоїть have, не has.'
        : 'Чтобы сказать, что чего-то нет, используй do not have или does not have. После does not тоже всегда стоит have, не has.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Заперечення' : 'Отрицание', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['I', 'do not have', 'I do not have cash / I do not have a ticket'],
        ['We', 'do not have', 'We do not have time / We do not have documents'],
        ['They', 'do not have', 'They do not have tickets / They do not have bags / They do not have chargers'],
        ['He', 'does not have', 'He does not have a bag / He does not have a key'],
        ['She', 'does not have', 'She does not have money / She does not have an umbrella'],
      ]}
    />,

    <Warn key="w8" t={t} f={f} text={isUK ? '❌ He does not has a key → ✅ He does not have a key. Після does not ставимо have.' : '❌ He does not has a key → ✅ He does not have a key. После does not ставим have.'} />,
    <Warn key="w9" t={t} f={f} text={isUK ? '❌ They does not have tickets → ✅ They do not have tickets. З they потрібне do not.' : '❌ They does not have tickets → ✅ They do not have tickets. С they нужно do not.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. A / an перед одним предметом' : '8. A / an перед одним предметом'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли ти говориш про один звичайний предмет, перед ним часто стоїть a або an. A ставиться перед звичайним приголосним звуком. An ставиться перед голосним звуком.'
        : 'Когда ты говоришь об одном обычном предмете, перед ним часто стоит a или an. A ставится перед обычным согласным звуком. An ставится перед гласным звуком.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        ['a', 'an'],
        ['a phone', 'an idea'],
        ['a bag', 'an umbrella'],
        ['a question', ''],
        ['a problem', ''],
        ['a plan', ''],
        ['a ticket', ''],
        ['a key', ''],
        ['a charger', ''],
        ['a passport', ''],
        ['a break', ''],
      ]}
    />,

    <Warn key="w10" t={t} f={f} text={isUK ? '❌ He has idea → ✅ He has an idea. Перед idea потрібне an.' : '❌ He has idea → ✅ He has an idea. Перед idea нужно an.'} />,
    <Warn key="w11" t={t} f={f} text={isUK ? '❌ She has umbrella → ✅ She has an umbrella. Перед umbrella потрібне an.' : '❌ She has umbrella → ✅ She has an umbrella. Перед umbrella нужно an.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Коли a / an не потрібні' : '9. Когда a / an не нужны'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'A або an не ставиться перед множиною та перед словами, які в цьому уроці сприймаються як маса або загальне поняття: time, money, cash, Wi-Fi, documents, tickets, bags, good news.'
        : 'A или an не ставится перед множественным числом и перед словами, которые в этом уроке воспринимаются как масса или общее понятие: time, money, cash, Wi-Fi, documents, tickets, bags, good news.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Без a/an' : 'Без a/an', isUK ? 'Чому' : 'Почему', isUK ? 'Приклад' : 'Пример'],
        ['time', isUK ? 'час як загальне поняття' : 'время как общее понятие', 'I have time / We do not have time'],
        ['money', isUK ? 'гроші як загальне поняття' : 'деньги как общее понятие', 'You have money / She does not have money'],
        ['cash', isUK ? 'готівка як маса' : 'наличные как масса', 'I have cash / I do not have cash'],
        ['Wi-Fi', isUK ? 'назва послуги / доступу' : 'название услуги / доступа', 'We have Wi-Fi'],
        ['tickets', isUK ? 'множина' : 'множественное число', 'They have tickets'],
        ['documents', isUK ? 'множина' : 'множественное число', 'We have documents'],
        ['bags', isUK ? 'множина' : 'множественное число', 'They have bags'],
        ['good news', isUK ? 'news в англійській не рахується як one news' : 'news в английском не считается как one news', 'They have good news'],
      ]}
    />,

    <Warn key="w12" t={t} f={f} text={isUK ? '❌ I have a money → ✅ I have money. Money не отримує a.' : '❌ I have a money → ✅ I have money. Money не получает a.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ We have a documents → ✅ We have documents. Documents - це множина, тому a не потрібне.' : '❌ We have a documents → ✅ We have documents. Documents - это множественное число, поэтому a не нужен.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ They have a good news → ✅ They have good news. News не використовується з a в цій фразі.' : '❌ They have a good news → ✅ They have good news. News не используется с a в этой фразе.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Один предмет і багато предметів' : '10. Один предмет и много предметов'} />,

    <Body key="b10a" t={t} f={f} text={isUK ? 'У цьому уроці є слова в однині та множині. Один предмет часто має a або an. Багато предметів ідуть без a/an.' : 'В этом уроке есть слова в единственном и множественном числе. Один предмет часто имеет a или an. Много предметов идут без a/an.'} />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один предмет' : 'Один предмет', isUK ? 'Багато / загально' : 'Много / общее'],
        ['a ticket', 'tickets'],
        ['a question', 'questions'],
        ['a problem', 'problems'],
        ['a bag', 'bags'],
        ['a document', 'documents'],
        ['a charger', 'chargers'],
      ]}
    />,

    <Tip key="tip2" t={t} f={f} text={isUK ? 'У фразах уроку є обидва варіанти: I have a question, але We have questions. You have a problem, але They have problems.' : 'Во фразах урока есть оба варианта: I have a question, но We have questions. You have a problem, но They have problems.'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Time for coffee' : '11. Time for coffee'} />,

    <Body key="b11a" t={t} f={f} text={isUK ? 'У фразі I do not have time for coffee слово for показує, для чого немає часу. Time for coffee = час на каву.' : 'Во фразе I do not have time for coffee слово for показывает, для чего нет времени. Time for coffee = время на кофе.'} />,

    <Example key="e1" t={t} f={f} eng="I do not have time for coffee" rus={isUK ? 'У мене немає часу на каву' : 'У меня нет времени на кофе'} />,

    <Warn key="w15" t={t} f={f} text={isUK ? '❌ I do not have time to coffee → ✅ I do not have time for coffee. У цій фразі потрібне for.' : '❌ I do not have time to coffee → ✅ I do not have time for coffee. В этой фразе нужен for.'} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Готові блоки з уроку' : '12. Готовые блоки из урока'} />,

    <Body key="b12a" t={t} f={f} text={isUK ? 'У цьому уроці головна граматика однакова: have / has / do not have / does not have. Але самі словосполучення краще впізнавати готовими блоками.' : 'В этом уроке главная грамматика одинаковая: have / has / do not have / does not have. Но сами словосочетания лучше узнавать готовыми блоками.'} />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['have time', isUK ? 'мати час / є час' : 'иметь время / есть время', 'I have time / Do you have time?'],
        ['have money', isUK ? 'мати гроші / є гроші' : 'иметь деньги / есть деньги', 'You have money / Does he have money?'],
        ['have cash', isUK ? 'мати готівку / є готівка' : 'иметь наличные / есть наличные', 'I have cash / I do not have cash'],
        ['have Wi-Fi', isUK ? 'мати Wi-Fi / є Wi-Fi' : 'иметь Wi-Fi / есть Wi-Fi', 'We have Wi-Fi'],
        ['have a question', isUK ? 'мати питання / є питання' : 'иметь вопрос / есть вопрос', 'I have a question / Do you have a question?'],
        ['have a problem', isUK ? 'мати проблему / є проблема' : 'иметь проблему / есть проблема', 'You have a problem / I do not have a problem'],
        ['have documents', isUK ? 'мати документи / є документи' : 'иметь документы / есть документы', 'We have documents / Do we have documents?'],
        ['have good news', isUK ? 'мати гарні новини / є гарні новини' : 'иметь хорошие новости / есть хорошие новости', 'They have good news'],
      ]}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Переклад не завжди дослівний' : '13. Перевод не всегда дословный'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Англійська каже I have, You have, He has. Українською або російською це природно перекладається як «у мене є», «у тебе є», «у нього є». Не намагайся перекладати have як окреме слово в кожній фразі.'
        : 'Английский говорит I have, You have, He has. По-русски это естественно переводится как «у меня есть», «у тебя есть», «у него есть». Не пытайся переводить have как отдельное слово в каждой фразе.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I have time', isUK ? 'У мене є час' : 'У меня есть время'],
        ['You have money', isUK ? 'У тебе є гроші' : 'У тебя есть деньги'],
        ['He has a phone', isUK ? 'У нього є телефон' : 'У него есть телефон'],
        ['She has a bag', isUK ? 'У неї є сумка' : 'У неё есть сумка'],
        ['We have a break', isUK ? 'У нас є перерва' : 'У нас есть перерыв'],
        ['They have good news', isUK ? 'У них гарні новини' : 'У них хорошие новости'],
      ]}
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Найчастіші помилки' : '14. Самые частые ошибки'} />,

    <Warn key="w16" t={t} f={f} text={isUK ? '❌ I am have time → ✅ I have time. З have не потрібен am.' : '❌ I am have time → ✅ I have time. С have не нужен am.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ He have a phone → ✅ He has a phone. З he потрібне has.' : '❌ He have a phone → ✅ He has a phone. С he нужно has.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ Does she has a plan? → ✅ Does she have a plan? Після Does ставимо have.' : '❌ Does she has a plan? → ✅ Does she have a plan? После Does ставим have.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ He does not has a key → ✅ He does not have a key. Після does not ставимо have.' : '❌ He does not has a key → ✅ He does not have a key. После does not ставим have.'} />,
    <Warn key="w20" t={t} f={f} text={isUK ? '❌ I have a cash → ✅ I have cash. Cash не отримує a.' : '❌ I have a cash → ✅ I have cash. Cash не получает a.'} />,
    <Warn key="w21" t={t} f={f} text={isUK ? '❌ We have a Wi-Fi → ✅ We have Wi-Fi. Перед Wi-Fi у цій фразі a не потрібне.' : '❌ We have a Wi-Fi → ✅ We have Wi-Fi. Перед Wi-Fi в этой фразе a не нужен.'} />,
    <Warn key="w22" t={t} f={f} text={isUK ? '❌ They have a tickets → ✅ They have tickets. Tickets - множина, тому a не потрібне.' : '❌ They have a tickets → ✅ They have tickets. Tickets - множественное число, поэтому a не нужен.'} />,
    <Warn key="w23" t={t} f={f} text={isUK ? '❌ I do not have time to coffee → ✅ I do not have time for coffee. У цій фразі потрібне for.' : '❌ I do not have time to coffee → ✅ I do not have time for coffee. В этой фразе нужен for.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Що треба винести з уроку' : '15. Что нужно вынести из урока'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити, що у когось щось є. З I, you, we, they використовуй have. З he і she використовуй has. У питаннях і запереченнях з does форма has повертається в have.'
        : 'В этом уроке ты учишься говорить, что у кого-то что-то есть. С I, you, we, they используй have. С he и she используй has. В вопросах и отрицаниях с does форма has возвращается в have.'
      }
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: I have time. Does she have a phone? He does not have a key.'
        : 'Перед практикой держи три модели: I have time. Does she have a phone? He does not have a key.'
      }
    />,
  ],
},
// ── УРОК 8 ──────────────────────────────────────────────────
// ── УРОК 8 ──────────────────────────────────────────────────
8: {
  titleRU: 'Предлоги времени: at, in, on',
  titleUK: 'Прийменники часу: at, in, on',
  titlePtBr: "Preposições de tempo: at, in, on",
  titleVi: "Giới từ chỉ thời gian: at, in, on",
  titleId: "Preposisi waktu: at, in, on",
  titleTr: "Zaman edatları: at, in, on",
  titlePl: "Przyimki czasu: at, in, on",
  render: (t, isUK, f) => [
    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся додавати час до вже знайомих конструкцій: I work, She leaves, We travel, Do you work?, I do not work. Головна тема - три прийменники часу: at, in, on.'
        : 'В этом уроке ты учишься добавлять время к уже знакомым конструкциям: I work, She leaves, We travel, Do you work?, I do not work. Главная тема - три предлога времени: at, in, on.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Прийменник' : 'Предлог', isUK ? 'Головна ідея' : 'Главная идея', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['at', isUK ? 'точка часу' : 'точка времени', 'She leaves at eight'],
        ['in', isUK ? 'період часу' : 'период времени', 'We rest in July'],
        ['on', isUK ? 'день або регулярний день' : 'день или регулярный день', 'I work on Monday'],
      ]}
    />,

    <Tip key="tip1" t={t} f={f} text={isUK ? 'Запам\'ятай просту логіку: at - точка, in - період, on - день.' : 'Запомни простую логику: at - точка, in - период, on - день.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. AT - точний час і точки доби' : '2. AT - точное время и точки суток'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'At використовується, коли час сприймається як точка: конкретна година, noon, midnight або night.'
        : 'At используется, когда время воспринимается как точка: конкретный час, noon, midnight или night.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Час' : 'Время', isUK ? 'Приклад з уроку' : 'Пример из урока', isUK ? 'Переклад' : 'Перевод'],
        ['at eight', 'She leaves at eight', isUK ? 'Вона йде о восьмій' : 'Она уходит в восемь'],
        ['at noon', 'He has lunch at noon', isUK ? 'Він обідає опівдні' : 'Он обедает в полдень'],
        ['at midnight', 'They sleep at midnight', isUK ? 'Вони сплять опівночі' : 'Они спят в полночь'],
        ['at nine', 'I start work at nine', isUK ? 'Я починаю роботу о дев\'ятій' : 'Я начинаю работу в девять'],
        ['at one', 'We have lunch at one', isUK ? 'Ми обідаємо о першій' : 'Мы обедаем в час'],
        ['at five', 'She finishes work at five', isUK ? 'Вона закінчує роботу о п\'ятій' : 'Она заканчивает работу в пять'],
        ['at six', 'I listen to music at six', isUK ? 'Я слухаю музику о шостій' : 'Я слушаю музыку в шесть'],
      ]}
    />,

    <Warn key="w1" t={t} f={f} text={isUK ? '❌ in eight → ✅ at eight. Для конкретної години використовуємо at.' : '❌ in eight → ✅ at eight. Для конкретного часа используем at.'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. At night, at noon, at midnight' : '3. At night, at noon, at midnight'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці at також стоїть з night, noon і midnight. Це сталі часові блоки, які краще впізнавати цілими.'
        : 'В этом уроке at также стоит с night, noon и midnight. Это устойчивые временные блоки, которые лучше узнавать целиком.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['at night', isUK ? 'вночі' : 'ночью', 'He calls at night / Do you sleep well at night? / He checks documents at night'],
        ['at noon', isUK ? 'опівдні' : 'в полдень', 'He has lunch at noon / They order food at noon'],
        ['at midnight', isUK ? 'опівночі' : 'в полночь', 'They sleep at midnight / They do not eat at midnight'],
      ]}
    />,

    <Warn key="w2" t={t} f={f} text={isUK ? '❌ in night → ✅ at night. У фразах цього уроку використовуй саме at night.' : '❌ in night → ✅ at night. Во фразах этого урока используй именно at night.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. IN - місяці, сезони, частини доби' : '4. IN - месяцы, сезоны, части суток'} />,

    <Body key="b4a" t={t} f={f} text={isUK ? 'In використовується для більших періодів часу: місяців, сезонів і частин доби.' : 'In используется для более крупных периодов времени: месяцев, сезонов и частей суток.'} />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип часу' : 'Тип времени', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        [isUK ? 'Місяці' : 'Месяцы', 'in July / in May / in January / in October'],
        [isUK ? 'Сезони' : 'Сезоны', 'in winter / in summer'],
        [isUK ? 'Частини доби' : 'Части суток', 'in the morning / in the evening'],
      ]}
    />,

    <Example key="e1" t={t} f={f} eng="We rest in July" rus={isUK ? 'Ми відпочиваємо в липні' : 'Мы отдыхаем в июле'} />,
    <Example key="e2" t={t} f={f} eng="We travel in winter" rus={isUK ? 'Ми подорожуємо взимку' : 'Мы путешествуем зимой'} />,
    <Example key="e3" t={t} f={f} eng="They call in the morning" rus={isUK ? 'Вони телефонують вранці' : 'Они звонят утром'} />,
    <Example key="e4" t={t} f={f} eng="They walk in the evening" rus={isUK ? 'Вони гуляють увечері' : 'Они гуляют вечером'} />,

    <Warn key="w3" t={t} f={f} text={isUK ? '❌ on July → ✅ in July. Для місяців використовуємо in.' : '❌ on July → ✅ in July. Для месяцев используем in.'} />,
    <Warn key="w4" t={t} f={f} text={isUK ? '❌ at winter → ✅ in winter. Для сезону використовуємо in.' : '❌ at winter → ✅ in winter. Для сезона используем in.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. In the morning / in the evening' : '5. In the morning / in the evening'} />,

    <Body key="b5a" t={t} f={f} text={isUK ? 'Morning і evening у цьому уроці йдуть з in the. Це важливо: не просто in morning, а in the morning.' : 'Morning и evening в этом уроке идут с in the. Это важно: не просто in morning, а in the morning.'} />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Правильний блок' : 'Правильный блок', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['in the morning', 'They call in the morning / Does she call in the morning? / We study English in the morning'],
        ['in the evening', 'They walk in the evening / When do they call in the evening? / She reads books in the evening'],
      ]}
    />,

    <Warn key="w5" t={t} f={f} text={isUK ? '❌ in morning → ✅ in the morning. У цьому часовому блоці потрібне the.' : '❌ in morning → ✅ in the morning. В этом временном блоке нужен the.'} />,
    <Warn key="w6" t={t} f={f} text={isUK ? '❌ at evening → ✅ in the evening. Для evening у цьому уроці використовуємо in the evening.' : '❌ at evening → ✅ in the evening. Для evening в этом уроке используем in the evening.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. ON - дні тижня' : '6. ON - дни недели'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'On використовується з днями тижня: Monday, Tuesday, Friday, Sunday, Saturday. Українською або російською це часто перекладається просто як «у понеділок / у п\'ятницю».'
        : 'On используется с днями недели: Monday, Tuesday, Friday, Sunday, Saturday. По-русски это часто переводится просто как «в понедельник / в пятницу».'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'День' : 'День', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['on Monday', 'I work on Monday / Do we meet on Monday? / What do you do on Monday?'],
        ['on Tuesday', 'She studies on Tuesday'],
        ['on Friday', 'You pay cash on Friday / Do you work on Friday? / Where do we meet on Friday?'],
        ['on Sunday', 'They rest on Sunday / I do not work on Sunday'],
        ['on Saturday', 'He has time on Saturday'],
      ]}
    />,

    <Warn key="w7" t={t} f={f} text={isUK ? '❌ in Monday → ✅ on Monday. Для дня тижня використовуємо on.' : '❌ in Monday → ✅ on Monday. Для дня недели используем on.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. On weekends / on Tuesdays / on Mondays' : '7. On weekends / on Tuesdays / on Mondays'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли день стоїть у множині, це часто означає регулярність: по вівторках, по середах, по понеділках. On weekends означає «по вихідних».'
        : 'Когда день стоит во множественном числе, это часто означает регулярность: по вторникам, по средам, по понедельникам. On weekends означает «по выходным».'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['on weekends', isUK ? 'по вихідних' : 'по выходным', 'He works on weekends / They meet on weekends'],
        ['on Tuesdays', isUK ? 'по вівторках' : 'по вторникам', 'We have class on Tuesdays'],
        ['on Wednesdays', isUK ? 'по середах' : 'по средам', 'She studies on Wednesdays'],
        ['on Mondays', isUK ? 'по понеділках' : 'по понедельникам', 'I feel tired on Mondays'],
      ]}
    />,

    <Tip key="tip2" t={t} f={f} text={isUK ? 'Monday = один конкретний понеділок. Mondays = понеділки взагалі / регулярно.' : 'Monday = один конкретный понедельник. Mondays = понедельники вообще / регулярно.'} />,
    <Warn key="w8" t={t} f={f} text={isUK ? '❌ in weekends → ✅ on weekends. У фразах уроку використовуємо on weekends.' : '❌ in weekends → ✅ on weekends. Во фразах урока используем on weekends.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Питання з часом' : '8. Вопросы со временем'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок 8 не тільки про at, in, on. У ньому ці часові блоки додаються до вже знайомих питань з Do / Does і до спеціальних питань What, When, Why, Where, How much.'
        : 'Урок 8 не только про at, in, on. В нём эти временные блоки добавляются к уже знакомым вопросам с Do / Does и к специальным вопросам What, When, Why, Where, How much.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип питання' : 'Тип вопроса', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['Do / Does', 'Do you work on Friday? / Does she call in the morning? / Does he start at eight?'],
        ['What', 'What do you do on Monday?'],
        ['When', 'When do they call in the evening?'],
        ['Why', 'Why does he work at night?'],
        ['Where', 'Where do we meet on Friday?'],
        ['How much', 'How much does it cost in winter?'],
      ]}
    />,

    <Warn key="w9" t={t} f={f} text={isUK ? '❌ Does he starts at eight? → ✅ Does he start at eight? Після Does основна дія без -s.' : '❌ Does he starts at eight? → ✅ Does he start at eight? После Does основное действие без -s.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Заперечення з часом' : '9. Отрицания со временем'} />,

    <Body key="b9a" t={t} f={f} text={isUK ? 'Часовий блок можна додати і до заперечення. Граматика заперечення залишається тією самою: do not або does not + дія.' : 'Временной блок можно добавить и к отрицанию. Грамматика отрицания остаётся той же: do not или does not + действие.'} />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо' : 'Что важно'],
        ['I do not work on Sunday', isUK ? 'on Sunday = у неділю' : 'on Sunday = в воскресенье'],
        ['She does not call at night', isUK ? 'at night = вночі' : 'at night = ночью'],
        ['We do not travel in winter', isUK ? 'in winter = взимку' : 'in winter = зимой'],
        ['They do not eat at midnight', isUK ? 'at midnight = опівночі' : 'at midnight = в полночь'],
        ['He does not work on weekends', isUK ? 'on weekends = по вихідних' : 'on weekends = по выходным'],
      ]}
    />,

    <Warn key="w10" t={t} f={f} text={isUK ? '❌ She does not calls at night → ✅ She does not call at night. Після does not дія без -s.' : '❌ She does not calls at night → ✅ She does not call at night. После does not действие без -s.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Have lunch, have dinner, have class, have time' : '10. Have lunch, have dinner, have class, have time'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці have не завжди перекладається як «мати». У блоках have lunch і have dinner воно означає «їсти / обідати / вечеряти».'
        : 'В этом уроке have не всегда переводится как «иметь». В блоках have lunch и have dinner оно означает «есть / обедать / ужинать».'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Природний переклад' : 'Естественный перевод', isUK ? 'Приклад' : 'Пример'],
        ['have lunch', isUK ? 'обідати' : 'обедать', 'He has lunch at noon / We have lunch at one'],
        ['have dinner', isUK ? 'вечеряти' : 'ужинать', 'They have dinner at eight'],
        ['have class', isUK ? 'мати заняття / у нас заняття' : 'иметь занятие / у нас занятия', 'We have class on Tuesdays'],
        ['have time', isUK ? 'мати час / є час' : 'иметь время / есть время', 'He has time on Saturday / Does she have time on Friday?'],
        ['have a birthday', isUK ? 'мати день народження / день народження в...' : 'иметь день рождения / день рождения в...', 'He has a birthday in October'],
      ]}
    />,

    <Tip key="tip3" t={t} f={f} text={isUK ? 'He has lunch at noon природно перекладається як «він обідає опівдні», а не «він має обід».' : 'He has lunch at noon естественно переводится как «он обедает в полдень», а не «он имеет обед».'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Готові блоки дій з уроку' : '11. Готовые блоки действий из урока'} />,

    <Body key="b11a" t={t} f={f} text={isUK ? 'Окрім часу, в уроці є готові дієслівні блоки. Їх краще впізнавати цілими, бо так фрази швидше читаються і сприймаються на слух.' : 'Кроме времени, в уроке есть готовые глагольные блоки. Их лучше узнавать целиком, потому что так фразы быстрее читаются и воспринимаются на слух.'} />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['start work', isUK ? 'починати роботу' : 'начинать работу', 'I start work at nine'],
        ['pay cash', isUK ? 'платити готівкою' : 'платить наличными', 'You pay cash on Friday'],
        ['pay rent', isUK ? 'платити оренду' : 'платить аренду', 'We pay rent in January'],
        ['take a shower', isUK ? 'приймати душ' : 'принимать душ', 'He takes a shower at eight'],
        ['finish work', isUK ? 'закінчувати роботу' : 'заканчивать работу', 'She finishes work at five'],
        ['listen to music', isUK ? 'слухати музику' : 'слушать музыку', 'I listen to music at six'],
        ['sleep well', isUK ? 'добре спати' : 'хорошо спать', 'Do you sleep well at night?'],
        ['check documents', isUK ? 'перевіряти документи' : 'проверять документы', 'He checks documents at night'],
        ['study English', isUK ? 'вчити англійську' : 'учить английский', 'We study English in the morning'],
        ['order food', isUK ? 'замовляти їжу' : 'заказывать еду', 'They order food at noon'],
        ['read books', isUK ? 'читати книги' : 'читать книги', 'She reads books in the evening'],
      ]}
    />,

    <Warn key="w11" t={t} f={f} text={isUK ? '❌ I listen music at six → ✅ I listen to music at six. Після listen потрібне to.' : '❌ I listen music at six → ✅ I listen to music at six. После listen нужно to.'} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. He / She / It + дія з -s' : '12. He / She / It + действие с -s'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці час додається до Present Simple. Тому з he, she, it дія часто отримує -s або -es: leaves, works, calls, studies, has, takes, finishes, checks, reads.'
        : 'В этом уроке время добавляется к Present Simple. Поэтому с he, she, it действие часто получает -s или -es: leaves, works, calls, studies, has, takes, finishes, checks, reads.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо' : 'Что важно'],
        ['She leaves at eight', 'leaves'],
        ['He works on weekends', 'works'],
        ['He calls at night', 'calls'],
        ['She studies on Tuesday', 'studies'],
        ['He has lunch at noon', 'has'],
        ['He takes a shower at eight', 'takes'],
        ['She finishes work at five', 'finishes'],
        ['He checks documents at night', 'checks'],
        ['She reads books in the evening', 'reads'],
      ]}
    />,

    <Warn key="w12" t={t} f={f} text={isUK ? '❌ She leave at eight → ✅ She leaves at eight. З she у Present Simple потрібне -s.' : '❌ She leave at eight → ✅ She leaves at eight. С she в Present Simple нужно -s.'} />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Переклад не завжди дослівний' : '13. Перевод не всегда дословный'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Часові фрази в англійській часто перекладаються природно, а не слово в слово. Особливо це видно з have lunch, have dinner, have a birthday і feel tired.'
        : 'Временные фразы в английском часто переводятся естественно, а не слово в слово. Особенно это видно с have lunch, have dinner, have a birthday и feel tired.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['He has lunch at noon', isUK ? 'Він обідає опівдні' : 'Он обедает в полдень'],
        ['They have dinner at eight', isUK ? 'Вони вечеряють о восьмій' : 'Они ужинают в восемь'],
        ['He has a birthday in October', isUK ? 'У нього день народження в жовтні' : 'У него день рождения в октябре'],
        ['I feel tired on Mondays', isUK ? 'Я відчуваю втому по понеділках' : 'Я чувствую усталость по понедельникам'],
        ['We have class on Tuesdays', isUK ? 'У нас заняття по вівторках' : 'У нас занятия по вторникам'],
      ]}
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Найчастіші помилки' : '14. Самые частые ошибки'} />,

    <Warn key="w13" t={t} f={f} text={isUK ? '❌ at Monday → ✅ on Monday. Дні тижня йдуть з on.' : '❌ at Monday → ✅ on Monday. Дни недели идут с on.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ on July → ✅ in July. Місяці йдуть з in.' : '❌ on July → ✅ in July. Месяцы идут с in.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ in eight → ✅ at eight. Точний час йде з at.' : '❌ in eight → ✅ at eight. Точное время идёт с at.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ on winter → ✅ in winter. Сезони йдуть з in.' : '❌ on winter → ✅ in winter. Сезоны идут с in.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ at the morning → ✅ in the morning. Morning у цьому уроці йде як in the morning.' : '❌ at the morning → ✅ in the morning. Morning в этом уроке идёт как in the morning.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ in weekends → ✅ on weekends. Вихідні йдуть з on.' : '❌ in weekends → ✅ on weekends. Выходные идут с on.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ Does she calls in the morning? → ✅ Does she call in the morning? Після Does дія без -s.' : '❌ Does she calls in the morning? → ✅ Does she call in the morning? После Does действие без -s.'} />,
    <Warn key="w20" t={t} f={f} text={isUK ? '❌ She study on Wednesdays → ✅ She studies on Wednesdays. З she потрібна форма studies.' : '❌ She study on Wednesdays → ✅ She studies on Wednesdays. С she нужна форма studies.'} />,
    <Warn key="w21" t={t} f={f} text={isUK ? '❌ I feel tired in Mondays → ✅ I feel tired on Mondays. Для регулярних понеділків використовуємо on Mondays.' : '❌ I feel tired in Mondays → ✅ I feel tired on Mondays. Для регулярных понедельников используем on Mondays.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Що треба винести з уроку' : '15. Что нужно вынести из урока'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти додаєш час до простих фраз. At використовується для точок часу: at eight, at noon, at night. In - для більших періодів: in July, in winter, in the morning. On - для днів: on Monday, on Friday, on weekends, on Tuesdays.'
        : 'В этом уроке ты добавляешь время к простым фразам. At используется для точек времени: at eight, at noon, at night. In - для больших периодов: in July, in winter, in the morning. On - для дней: on Monday, on Friday, on weekends, on Tuesdays.'
      }
    />,

    <Tip key="tip4" t={t} f={f} text={isUK ? 'Перед практикою тримай три моделі: at eight, in July, on Monday.' : 'Перед практикой держи три модели: at eight, in July, on Monday.'} />,
  ],
},
// ── УРОК 9 ──────────────────────────────────────────────────
// ── УРОК 9 ──────────────────────────────────────────────────
9: {
  titleRU: 'There is / There are: есть / находится',
  titleUK: 'There is / There are: є / знаходиться',
  titlePtBr: "There is / There are: existe / fica",
  titleVi: "There is / There are: có / nằm ở",
  titleId: "There is / There are: ada / terletak",
  titleTr: "There is / There are: var / bulunur",
  titlePl: "There is / There are: jest / znajduje się",
  render: (t, isUK, f) => [
    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити, що щось десь є або існує: є проблема, є питання, є Wi-Fi, є документи, немає часу. Для цього в англійській використовується конструкція There is або There are.'
        : 'В этом уроке ты учишься говорить, что что-то где-то есть или существует: есть проблема, есть вопрос, есть Wi-Fi, есть документы, нет времени. Для этого в английском используется конструкция There is или There are.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Українська / російська логіка' : 'Русская логика', isUK ? 'Англійська логіка' : 'Английская логика'],
        [isUK ? 'Є проблема' : 'Есть проблема', 'There is a problem'],
        [isUK ? 'Є проблеми' : 'Есть проблемы', 'There are problems'],
        [isUK ? 'Є питання?' : 'Есть вопрос?', 'Is there a question?'],
        [isUK ? 'Немає проблем' : 'Нет проблем', 'There are no problems'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: There is / There are не перекладається слово в слово. Це готовий англійський механізм для «є / існує / знаходиться».'
        : 'Главная идея: There is / There are не переводится слово в слово. Это готовый английский механизм для «есть / существует / находится».'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Вибір між There is і There are залежить від того, про що ти говориш: один предмет, багато предметів або слово, яке не рахується як один-два-три.'
        : 'Выбор между There is и There are зависит от того, о чём ты говоришь: один предмет, много предметов или слово, которое не считается как один-два-три.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Скільки?' : 'Сколько?', isUK ? 'Форма' : 'Форма', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'один предмет / одна річ' : 'один предмет / одна вещь', 'There is', 'There is a problem'],
        [isUK ? 'багато предметів' : 'много предметов', 'There are', 'There are problems'],
        [isUK ? 'речовина / загальне поняття' : 'вещество / общее понятие', 'There is', 'There is Wi-Fi / There is money / There is time'],
      ]}
    />,

    <Warn key="w1" t={t} f={f} text={isUK ? '❌ There are a problem → ✅ There is a problem. Один предмет бере There is.' : '❌ There are a problem → ✅ There is a problem. Один предмет берёт There is.'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ There is problems → ✅ There are problems. Множина бере There are.' : '❌ There is problems → ✅ There are problems. Множественное число берёт There are.'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. There is для одного предмета' : '3. There is для одного предмета'} />,

    <Body key="b3a" t={t} f={f} text={isUK ? 'There is використовується, коли ти говориш про один предмет, одну річ або одну ідею. У таких фразах часто з\'являється a або an.' : 'There is используется, когда ты говоришь об одном предмете, одной вещи или одной идее. В таких фразах часто появляется a или an.'} />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['There is a problem', isUK ? 'Є проблема' : 'Есть проблема'],
        ['There is a phone', isUK ? 'Є телефон' : 'Есть телефон'],
        ['There is a key', isUK ? 'Є ключ' : 'Есть ключ'],
        ['There is a ticket', isUK ? 'Є квиток' : 'Есть билет'],
        ['There is a bag', isUK ? 'Є сумка' : 'Есть сумка'],
        ['There is a charger', isUK ? 'Є зарядка' : 'Есть зарядка'],
        ['There is an idea', isUK ? 'Є ідея' : 'Есть идея'],
        ['There is a plan', isUK ? 'Є план' : 'Есть план'],
      ]}
    />,

    <Warn key="w3" t={t} f={f} text={isUK ? '❌ There is problem → ✅ There is a problem. Перед одним звичайним предметом часто потрібне a або an.' : '❌ There is problem → ✅ There is a problem. Перед одним обычным предметом часто нужно a или an.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. There are для множини' : '4. There are для множественного числа'} />,

    <Body key="b4a" t={t} f={f} text={isUK ? 'There are використовується, коли предметів більше одного: проблеми, телефони, ключі, квитки, сумки, документи, помилки, люди.' : 'There are используется, когда предметов больше одного: проблемы, телефоны, ключи, билеты, сумки, документы, ошибки, люди.'} />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['There are problems', isUK ? 'Є проблеми' : 'Есть проблемы'],
        ['There are phones', isUK ? 'Є телефони' : 'Есть телефоны'],
        ['There are keys', isUK ? 'Є ключі' : 'Есть ключи'],
        ['There are tickets', isUK ? 'Є квитки' : 'Есть билеты'],
        ['There are bags', isUK ? 'Є сумки' : 'Есть сумки'],
        ['There are documents', isUK ? 'Є документи' : 'Есть документы'],
        ['There are mistakes', isUK ? 'Є помилки' : 'Есть ошибки'],
        ['There are people', isUK ? 'Є люди' : 'Есть люди'],
      ]}
    />,

    <Tip key="tip2" t={t} f={f} text={isUK ? 'A або an не ставиться перед множиною: There are tickets, не There are a tickets.' : 'A или an не ставится перед множественным числом: There are tickets, не There are a tickets.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Питання: Is there...? / Are there...?' : '5. Вопросы: Is there...? / Are there...?'} />,

    <Body key="b5a" t={t} f={f} text={isUK ? 'Щоб зробити питання, перенеси is або are на початок. There залишається після is або are.' : 'Чтобы сделать вопрос, перенеси is или are в начало. There остаётся после is или are.'} />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Твердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['There is a question', 'Is there a question?'],
        ['There are questions', 'Are there questions?'],
        ['There is a key', 'Is there a key?'],
        ['There are keys', 'Are there keys?'],
        ['There is a plan', 'Is there a plan?'],
        ['There are documents', 'Are there documents?'],
        ['There are mistakes', 'Are there mistakes?'],
      ]}
    />,

    <Warn key="w4" t={t} f={f} text={isUK ? '❌ There is a question? → ✅ Is there a question? Для нормального питання is виходить на перше місце.' : '❌ There is a question? → ✅ Is there a question? Для нормального вопроса is выходит на первое место.'} />,
    <Warn key="w5" t={t} f={f} text={isUK ? '❌ Is there questions? → ✅ Are there questions? З множиною потрібне Are there.' : '❌ Is there questions? → ✅ Are there questions? С множественным числом нужно Are there.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Заперечення: There is no / There are no' : '6. Отрицание: There is no / There are no'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці заперечення будується через no: There is no problem, There are no problems. Це природний спосіб сказати «немає».'
        : 'В этом уроке отрицание строится через no: There is no problem, There are no problems. Это естественный способ сказать «нет / не имеется».'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Є' : 'Есть', isUK ? 'Немає' : 'Нет'],
        ['There is a problem', 'There is no problem'],
        ['There are problems', 'There are no problems'],
        ['There is a key', 'There is no key'],
        ['There are keys', 'There are no keys'],
        ['There are messages', 'There are no messages'],
        ['There are documents', 'There are no documents'],
        ['There are people', 'There are no people'],
      ]}
    />,

    <Tip key="tip3" t={t} f={f} text={isUK ? 'There is no problem часто звучить природніше, ніж дослівна спроба "there is not a problem". У цьому уроці тренуємо саме модель з no.' : 'There is no problem часто звучит естественнее, чем дословная попытка "there is not a problem". В этом уроке тренируем именно модель с no.'} />,
    <Warn key="w6" t={t} f={f} text={isUK ? '❌ There is not problem → ✅ There is no problem. У цій моделі після is ставимо no.' : '❌ There is not problem → ✅ There is no problem. В этой модели после is ставим no.'} />,
    <Warn key="w7" t={t} f={f} text={isUK ? '❌ There are not keys → ✅ There are no keys. У фразах уроку використовуємо no для значення «немає».' : '❌ There are not keys → ✅ There are no keys. Во фразах урока используем no для значения «нет».'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. No перед одниною, множиною і масою' : '7. No перед единственным числом, множественным числом и массой'} />,

    <Body key="b7a" t={t} f={f} text={isUK ? 'No може стояти перед одним предметом, перед множиною або перед словом, яке не рахується як один-два-три.' : 'No может стоять перед одним предметом, перед множественным числом или перед словом, которое не считается как один-два-три.'} />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'один предмет' : 'один предмет', 'There is no key / There is no charger'],
        [isUK ? 'множина' : 'множественное число', 'There are no problems / There are no messages / There are no documents'],
        [isUK ? 'маса / загальне поняття' : 'масса / общее понятие', 'There is no Wi-Fi / There is no money / There is no food / There is no time'],
      ]}
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Слова-маси і much' : '8. Слова-массы и much'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У цих словах ми не говоримо про один конкретний предмет. Це доступ, гроші, готівка, їжа, кава або час як загальне поняття. Тому в уроці вони йдуть з There is, а не There are. Для кількості зі словами-масами використовуємо much, особливо в питаннях і запереченнях: Is there much time? / There isn\'t much time.'
        : 'В этих словах мы не говорим об одном конкретном предмете. Это доступ, деньги, наличные, еда, кофе или время как общее понятие. Поэтому в уроке они идут с There is, а не There are. Для количества со словами-массами используем much, особенно в вопросах и отрицаниях: Is there much time? / There isn\'t much time.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Is there Wi-Fi?', isUK ? 'Є Wi-Fi?' : 'Есть Wi-Fi?'],
        ['There is no Wi-Fi', isUK ? 'Немає Wi-Fi' : 'Нет Wi-Fi'],
        ['There is money', isUK ? 'Є гроші' : 'Есть деньги'],
        ['There is no money', isUK ? 'Немає грошей' : 'Нет денег'],
        ['There is cash', isUK ? 'Є готівка' : 'Есть наличные'],
        ['There is no cash', isUK ? 'Немає готівки' : 'Нет наличных'],
        ['There is food', isUK ? 'Є їжа' : 'Есть еда'],
        ['There is no food', isUK ? 'Немає їжі' : 'Нет еды'],
        ['There is coffee', isUK ? 'Є кава' : 'Есть кофе'],
        ['There is no coffee', isUK ? 'Немає кави' : 'Нет кофе'],
        ['There is time', isUK ? 'Є час' : 'Есть время'],
        ['Is there much time?', isUK ? 'Є багато часу?' : 'Есть много времени?'],
        ["There isn't much time", isUK ? 'Часу небагато' : 'Времени немного'],
        ['There is no time', isUK ? 'Немає часу' : 'Нет времени'],
      ]}
    />,

    <Warn key="w8" t={t} f={f} text={isUK ? '❌ There are money → ✅ There is money. Money у цій фразі не рахується як множина.' : '❌ There are money → ✅ There is money. Money в этой фразе не считается как множественное число.'} />,
    <Warn key="w9" t={t} f={f} text={isUK ? '❌ Is there a Wi-Fi? → ✅ Is there Wi-Fi? У цій фразі Wi-Fi іде без a.' : '❌ Is there a Wi-Fi? → ✅ Is there Wi-Fi? В этой фразе Wi-Fi идёт без a.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. A / an перед одним предметом' : '9. A / an перед одним предметом'} />,

    <Body key="b9a" t={t} f={f} text={isUK ? 'Коли після There is стоїть один звичайний предмет, часто потрібне a або an. A - перед звичайним приголосним звуком, an - перед голосним звуком.' : 'Когда после There is стоит один обычный предмет, часто нужно a или an. A - перед обычным согласным звуком, an - перед гласным звуком.'} />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Артикль' : 'Артикль', isUK ? 'Перед яким звуком' : 'Перед каким звуком', isUK ? 'Приклади' : 'Примеры'],
        ['a', isUK ? 'приголосний' : 'согласный', 'a problem, a question, a phone, a key, a ticket, a bag, a charger, a plan'],
        ['an', isUK ? 'голосний' : 'гласный', 'an idea, an app, an option, an umbrella'],
      ]}
    />,

    <Warn key="w10" t={t} f={f} text={isUK ? '❌ There is idea → ✅ There is an idea. Перед idea потрібне an.' : '❌ There is idea → ✅ There is an idea. Перед idea нужно an.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Some, many і much' : '10. Some, many и much'} />,

    <Body key="b10a" t={t} f={f} text={isUK ? 'У цьому уроці є some, many і much. Some означає «кілька / деякі». Many означає «багато» перед множиною. Much означає «багато» перед словами-масами: time, money, food.' : 'В этом уроке есть some, many и much. Some означает «несколько / некоторые». Many означает «много» перед множественным числом. Much означает «много» перед словами-массами: time, money, food.'} />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['some', isUK ? 'кілька / деякі' : 'несколько / некоторые', 'There are some messages'],
        ['many', isUK ? 'багато' : 'много', 'There are many messages'],
        ['many', isUK ? 'багато' : 'много', 'There are many people / Are there many people?'],
        ['much', isUK ? 'багато з масою' : 'много с массой', "Is there much time? / There isn't much time"],
      ]}
    />,

    <Tip key="tip4" t={t} f={f} text={isUK ? 'Messages і people - множина, тому з ними використовується There are. Time не рахується як множина, тому: Is there much time?' : 'Messages и people - множественное число, поэтому с ними используется There are. Time не считается как множественное число, поэтому: Is there much time?'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. People — це множина' : '11. People - это множественное число'} />,

    <Body key="b11a" t={t} f={f} text={isUK ? 'People означає «люди» і в цьому уроці працює як множина. Тому говоримо There are people, There are many people, Are there many people?, There are no people.' : 'People означает «люди» и в этом уроке работает как множественное число. Поэтому говорим There are people, There are many people, Are there many people?, There are no people.'} />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Правильно' : 'Правильно', isUK ? 'Переклад' : 'Перевод'],
        ['There are people', isUK ? 'Є люди' : 'Есть люди'],
        ['Are there many people?', isUK ? 'Багато людей?' : 'Много людей?'],
        ['There are many people', isUK ? 'Багато людей' : 'Много людей'],
        ['There are no people', isUK ? 'Немає людей' : 'Нет людей'],
      ]}
    />,

    <Warn key="w11" t={t} f={f} text={isUK ? '❌ There is people → ✅ There are people. People - це множина.' : '❌ There is people → ✅ There are people. People - это множественное число.'} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Готові блоки з уроку' : '12. Готовые блоки из урока'} />,

    <Body key="b12a" t={t} f={f} text={isUK ? 'У цьому уроці головна граматика повторюється багато разів. Тому важливо впізнавати готові блоки: є проблема, є ключ, немає Wi-Fi, немає часу.' : 'В этом уроке главная грамматика повторяется много раз. Поэтому важно узнавать готовые блоки: есть проблема, есть ключ, нет Wi-Fi, нет времени.'} />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['there is a problem', isUK ? 'є проблема' : 'есть проблема', 'There is a problem'],
        ['there are problems', isUK ? 'є проблеми' : 'есть проблемы', 'There are problems'],
        ['is there a question?', isUK ? 'є питання?' : 'есть вопрос?', 'Is there a question?'],
        ['are there questions?', isUK ? 'є питання?' : 'есть вопросы?', 'Are there questions?'],
        ['there is no key', isUK ? 'немає ключа' : 'нет ключа', 'There is no key'],
        ['there are no keys', isUK ? 'немає ключів' : 'нет ключей', 'There are no keys'],
        ['there is no time', isUK ? 'немає часу' : 'нет времени', 'There is no time'],
        ['there are no mistakes', isUK ? 'немає помилок' : 'нет ошибок', 'There are no mistakes'],
      ]}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Переклад не завжди дослівний' : '13. Перевод не всегда дословный'} />,

    <Body key="b13a" t={t} f={f} text={isUK ? 'There is / There are не треба перекладати як «там є» у кожній фразі. Найчастіше природний переклад - просто «є» або «немає».' : 'There is / There are не нужно переводить как «там есть» в каждой фразе. Чаще всего естественный перевод - просто «есть» или «нет».'} />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['There is a problem', isUK ? 'Є проблема' : 'Есть проблема'],
        ['There are problems', isUK ? 'Є проблеми' : 'Есть проблемы'],
        ['Is there Wi-Fi?', isUK ? 'Є Wi-Fi?' : 'Есть Wi-Fi?'],
        ['There is no money', isUK ? 'Немає грошей' : 'Нет денег'],
        ['There are many people', isUK ? 'Багато людей' : 'Много людей'],
      ]}
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Не плутай There is і have' : '14. Не путай There is и have'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'There is говорить, що щось існує або є в ситуації. Have / has говорить, що щось є саме у когось. Це різні конструкції.'
        : 'There is говорит, что что-то существует или есть в ситуации. Have / has говорит, что что-то есть именно у кого-то. Это разные конструкции.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Є в ситуації' : 'Есть в ситуации', isUK ? 'Є у когось' : 'Есть у кого-то'],
        ['There is a phone', 'He has a phone'],
        [isUK ? 'Є телефон' : 'Есть телефон', isUK ? 'У нього є телефон' : 'У него есть телефон'],
        ['There is no money', 'She does not have money'],
        [isUK ? 'Немає грошей' : 'Нет денег', isUK ? 'У неї немає грошей' : 'У неё нет денег'],
      ]}
    />,

    <Tip key="tip5" t={t} f={f} text={isUK ? 'There is a key - десь є ключ. He has a key - ключ є у нього.' : 'There is a key - где-то есть ключ. He has a key - ключ есть у него.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Найчастіші помилки' : '15. Самые частые ошибки'} />,

    <Warn key="w12" t={t} f={f} text={isUK ? '❌ There is problems → ✅ There are problems. З множиною потрібне are.' : '❌ There is problems → ✅ There are problems. С множественным числом нужно are.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ There are a problem → ✅ There is a problem. Один предмет бере is.' : '❌ There are a problem → ✅ There is a problem. Один предмет берёт is.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ Is there questions? → ✅ Are there questions? Questions - множина.' : '❌ Is there questions? → ✅ Are there questions? Questions - множественное число.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ Are there a key? → ✅ Is there a key? A key - один ключ.' : '❌ Are there a key? → ✅ Is there a key? A key - один ключ.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ There is not Wi-Fi → ✅ There is no Wi-Fi. У моделі уроку використовуємо no.' : '❌ There is not Wi-Fi → ✅ There is no Wi-Fi. В модели урока используем no.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ There are no Wi-Fi → ✅ There is no Wi-Fi. Wi-Fi тут не множина.' : '❌ There are no Wi-Fi → ✅ There is no Wi-Fi. Wi-Fi здесь не множественное число.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ There is a money → ✅ There is money. Money не отримує a.' : '❌ There is a money → ✅ There is money. Money не получает a.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ There is many people → ✅ There are many people. People - множина.' : '❌ There is many people → ✅ There are many people. People - множественное число.'} />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Що треба винести з уроку' : '16. Что нужно вынести из урока'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити, що щось є або чогось немає. Для одного предмета використовуй There is. Для множини використовуй There are. Для заперечення в цьому уроці використовуй There is no або There are no.'
        : 'В этом уроке ты учишься говорить, что что-то есть или чего-то нет. Для одного предмета используй There is. Для множественного числа используй There are. Для отрицания в этом уроке используй There is no или There are no.'
      }
    />,

    <Tip key="tip6" t={t} f={f} text={isUK ? 'Перед практикою тримай чотири моделі: There is a problem. There are problems. There is no time. Is there much time?' : 'Перед практикой держи четыре модели: There is a problem. There are problems. There is no time. Is there much time?'} />,
  ],
},
// ── УРОК 10 ──────────────────────────────────────────────────
// ── УРОК 10 ──────────────────────────────────────────────────
10: {
  titleRU: 'Модальные глаголы: can, should, must, have to',
  titleUK: 'Модальні дієслова: can, should, must, have to',
  titlePtBr: "Verbos modais: can, should, must, have to",
  titleVi: "Động từ khuyết thiếu: can, should, must, have to",
  titleId: "Kata kerja modal: can, should, must, have to",
  titleTr: "Modal fiiller: can, should, must, have to",
  titlePl: "Czasowniki modalne: can, should, must, have to",
  render: (t, isUK, f) => [
    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити про можливість, пораду, обов\'язок і необхідність. Для цього в англійській використовуються can, should, must і have to.'
        : 'В этом уроке ты учишься говорить про возможность, совет, обязанность и необходимость. Для этого в английском используются can, should, must и have to.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Головний зміст' : 'Главный смысл', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['can', isUK ? 'можу / вмію / можна' : 'могу / умею / можно', 'I can help / Can I ask a question?'],
        ['cannot', isUK ? 'не можу / не може' : 'не могу / не может', 'I cannot wait'],
        ['should', isUK ? 'варто / слід' : 'стоит / следует', 'You should rest'],
        ['should not', isUK ? 'не варто / не слід' : 'не стоит / не следует', 'You should not wait'],
        ['must', isUK ? 'мушу / повинен' : 'должен / обязан', 'I must go now'],
        ['must not', isUK ? 'не можна / заборонено' : 'нельзя / запрещено', 'You must not smoke here'],
        ['have to', isUK ? 'потрібно / доводиться' : 'нужно / приходится', 'I have to work today'],
      ]}
    />,

    <Tip key="tip1" t={t} f={f} text={isUK ? 'Головна ідея: після can, should і must дієслово йде в базовій формі: can help, should rest, must go.' : 'Главная идея: после can, should и must глагол идёт в базовой форме: can help, should rest, must go.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головне правило: без -s і без to' : '2. Главное правило: без -s и без to'} />,

    <Body key="b2a" t={t} f={f} text={isUK ? 'Can, should і must не змінюються після he, she, it. І після них не ставиться to перед основною дією.' : 'Can, should и must не меняются после he, she, it. И после них не ставится to перед основным действием.'} />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Правильно' : 'Правильно', isUK ? 'Чому' : 'Почему'],
        ['He can call later', isUK ? 'не he cans' : 'не he cans'],
        ['She can speak English', isUK ? 'не she cans' : 'не she cans'],
        ['He should call her', isUK ? 'не he shoulds' : 'не he shoulds'],
        ['She must check messages', isUK ? 'не she musts' : 'не she musts'],
        ['I can help', isUK ? 'не can to help' : 'не can to help'],
        ['You should rest', isUK ? 'не should to rest' : 'не should to rest'],
        ['I must go now', isUK ? 'не must to go' : 'не must to go'],
      ]}
    />,

    <Warn key="w1" t={t} f={f} text={isUK ? '❌ He cans call later → ✅ He can call later. Can не отримує -s.' : '❌ He cans call later → ✅ He can call later. Can не получает -s.'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ I can to help → ✅ I can help. Після can не ставимо to.' : '❌ I can to help → ✅ I can help. После can не ставим to.'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Can: можу, вмію, можна' : '3. Can: могу, умею, можно'} />,

    <Body key="b3a" t={t} f={f} text={isUK ? 'Can показує можливість або вміння. У перекладі це може звучати як «можу», «може», «вміє» або «можна».' : 'Can показывает возможность или умение. В переводе это может звучать как «могу», «может», «умеет» или «можно».'} />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I can help', isUK ? 'Я можу допомогти' : 'Я могу помочь'],
        ['You can start now', isUK ? 'Ти можеш почати зараз' : 'Ты можешь начать сейчас'],
        ['He can call later', isUK ? 'Він може зателефонувати пізніше' : 'Он может позвонить позже'],
        ['She can speak English', isUK ? 'Вона може говорити англійською' : 'Она может говорить по-английски'],
        ['They can work today', isUK ? 'Вони можуть працювати сьогодні' : 'Они могут работать сегодня'],
        ['It can work well', isUK ? 'Це може добре працювати' : 'Это может хорошо работать'],
      ]}
    />,

    <Tip key="tip2" t={t} f={f} text={isUK ? 'Can однаковий для всіх: I can, you can, he can, she can, we can, they can, it can.' : 'Can одинаковый для всех: I can, you can, he can, she can, we can, they can, it can.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Питання з can' : '4. Вопросы с can'} />,

    <Body key="b4a" t={t} f={f} text={isUK ? 'Щоб зробити питання, постав can на початок. Do або does не потрібні.' : 'Чтобы сделать вопрос, поставь can в начало. Do или does не нужны.'} />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Твердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['You can help me', 'Can you help me?'],
        ['He can drive cars', 'Can he drive cars?'],
        ['She can call us', 'Can she call us?'],
        ['We can start at noon', 'Can we start at noon?'],
        ['They can hear us', 'Can they hear us?'],
        ['I can ask a question', 'Can I ask a question?'],
      ]}
    />,

    <Warn key="w3" t={t} f={f} text={isUK ? '❌ Do you can help me? → ✅ Can you help me? У питанні can сам виходить на початок.' : '❌ Do you can help me? → ✅ Can you help me? В вопросе can сам выходит в начало.'} />,
    <Warn key="w4" t={t} f={f} text={isUK ? '❌ Can he drives cars? → ✅ Can he drive cars? Після can дія без -s.' : '❌ Can he drives cars? → ✅ Can he drive cars? После can действие без -s.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Can I...? = можна я...?' : '5. Can I...? = можно я...?'} />,

    <Body key="b5a" t={t} f={f} text={isUK ? 'Can I...? часто використовується, коли ти питаєш дозвіл або можливість зробити щось самому.' : 'Can I...? часто используется, когда ты спрашиваешь разрешение или возможность сделать что-то самому.'} />,
    <Example key="e1" t={t} f={f} eng="Can I ask a question?" rus={isUK ? 'Можна я поставлю питання?' : 'Можно я задам вопрос?'} />,
    <Tip key="tip3" t={t} f={f} text={isUK ? 'Can I ask a question? дослівно ближче до «чи можу я поставити питання?», але природно це «можна я поставлю питання?»' : 'Can I ask a question? дословно ближе к «могу ли я задать вопрос?», но естественно это «можно я задам вопрос?»'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Cannot: не можу / не може' : '6. Cannot: не могу / не может'} />,

    <Body key="b6a" t={t} f={f} text={isUK ? 'Cannot означає «не можу / не може». У цьому уроці воно пишеться одним словом: cannot.' : 'Cannot означает «не могу / не может». В этом уроке оно пишется одним словом: cannot.'} />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I cannot wait', isUK ? 'Я не можу чекати' : 'Я не могу ждать'],
        ['You cannot go there', isUK ? 'Ти не можеш іти туди' : 'Ты не можешь идти туда'],
        ['He cannot help us', isUK ? 'Він не може допомогти нам' : 'Он не может помочь нам'],
        ['She cannot come today', isUK ? 'Вона не може прийти сьогодні' : 'Она не может прийти сегодня'],
        ['We cannot find documents', isUK ? 'Ми не можемо знайти документи' : 'Мы не можем найти документы'],
        ['They cannot use cash', isUK ? 'Вони не можуть використовувати готівку' : 'Они не могут использовать наличные'],
        ['It cannot work now', isUK ? 'Це не може працювати зараз' : 'Это не может работать сейчас'],
      ]}
    />,

    <Warn key="w5" t={t} f={f} text={isUK ? '❌ I do not can wait → ✅ I cannot wait. Для заперечення can не потрібен do not.' : '❌ I do not can wait → ✅ I cannot wait. Для отрицания can не нужен do not.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Should: варто / слід' : '7. Should: стоит / следует'} />,

    <Body key="b7a" t={t} f={f} text={isUK ? 'Should звучить м\'якше, ніж must. Це не жорсткий наказ, а порада або рекомендація: тобі варто, йому варто, нам варто.' : 'Should звучит мягче, чем must. Это не жёсткий приказ, а совет или рекомендация: тебе стоит, ему стоит, нам стоит.'} />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['You should rest', isUK ? 'Тобі варто відпочити' : 'Тебе стоит отдохнуть'],
        ['He should call her', isUK ? 'Йому варто зателефонувати їй' : 'Ему стоит позвонить ей'],
        ['She should drink water', isUK ? 'Їй варто пити воду' : 'Ей стоит пить воду'],
        ['We should start now', isUK ? 'Нам варто почати зараз' : 'Нам стоит начать сейчас'],
        ['They should wait outside', isUK ? 'Їм варто чекати надворі' : 'Им стоит ждать снаружи'],
      ]}
    />,

    <Warn key="w6" t={t} f={f} text={isUK ? '❌ He shoulds call her → ✅ He should call her. Should не отримує -s.' : '❌ He shoulds call her → ✅ He should call her. Should не получает -s.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Питання з should' : '8. Вопросы с should'} />,

    <Body key="b8a" t={t} f={f} text={isUK ? 'У питанні should виходить на початок. Це схоже на can: Should I...? Should we...? Should they...?' : 'В вопросе should выходит в начало. Это похоже на can: Should I...? Should we...? Should they...?'} />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Should I call him?', isUK ? 'Мені варто зателефонувати йому?' : 'Мне стоит позвонить ему?'],
        ['Should we order food?', isUK ? 'Нам варто замовити їжу?' : 'Нам стоит заказать еду?'],
        ['Should they help people?', isUK ? 'Їм варто допомагати людям?' : 'Им стоит помогать людям?'],
      ]}
    />,

    <Warn key="w7" t={t} f={f} text={isUK ? '❌ Do I should call him? → ✅ Should I call him? У питанні should сам виходить на початок.' : '❌ Do I should call him? → ✅ Should I call him? В вопросе should сам выходит в начало.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Should not: не варто' : '9. Should not: не стоит'} />,

    <Body key="b9a" t={t} f={f} text={isUK ? 'Should not означає «не варто / не слід». Це порада не робити щось, а не сувора заборона.' : 'Should not означает «не стоит / не следует». Это совет не делать что-то, а не строгий запрет.'} />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['You should not wait', isUK ? 'Тобі не варто чекати' : 'Тебе не стоит ждать'],
        ['He should not drive fast', isUK ? 'Йому не варто їхати швидко' : 'Ему не стоит ехать быстро'],
        ['She should not work at night', isUK ? 'Їй не варто працювати вночі' : 'Ей не стоит работать ночью'],
        ['We should not waste time', isUK ? 'Нам не варто витрачати час даремно' : 'Нам не стоит тратить время зря'],
        ['They should not use this app', isUK ? 'Їм не варто використовувати цей застосунок' : 'Им не стоит использовать это приложение'],
      ]}
    />,

    <Warn key="w8" t={t} f={f} text={isUK ? '❌ You do not should wait → ✅ You should not wait. Для заперечення з should не потрібен do not.' : '❌ You do not should wait → ✅ You should not wait. Для отрицания с should не нужен do not.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Must: мушу / повинен' : '10. Must: должен / обязан'} />,

    <Body key="b10a" t={t} f={f} text={isUK ? 'Must звучить сильніше, ніж should. Це вже обов\'язок, вимога або сильна необхідність.' : 'Must звучит сильнее, чем should. Это уже обязанность, требование или сильная необходимость.'} />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I must go now', isUK ? 'Я мушу йти зараз' : 'Я должен идти сейчас'],
        ['You must listen', isUK ? 'Ти мусиш слухати' : 'Ты должен слушать'],
        ['He must finish work', isUK ? 'Він мусить закінчити роботу' : 'Он должен закончить работу'],
        ['She must check messages', isUK ? 'Вона мусить перевірити повідомлення' : 'Она должна проверить сообщения'],
        ['We must pay today', isUK ? 'Ми мусимо заплатити сьогодні' : 'Мы должны заплатить сегодня'],
        ['They must wait here', isUK ? 'Вони мусять чекати тут' : 'Они должны ждать здесь'],
      ]}
    />,

    <Warn key="w9" t={t} f={f} text={isUK ? '❌ He musts finish work → ✅ He must finish work. Must не отримує -s.' : '❌ He musts finish work → ✅ He must finish work. Must не получает -s.'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Питання з must' : '11. Вопросы с must'} />,

    <Body key="b11a" t={t} f={f} text={isUK ? 'У питанні must виходить на початок. Так ти питаєш про обов\'язок або необхідність.' : 'В вопросе must выходит в начало. Так ты спрашиваешь об обязанности или необходимости.'} />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Must I sign it?', isUK ? 'Я мушу це підписати?' : 'Я должен это подписать?'],
        ['Must we start now?', isUK ? 'Ми мусимо почати зараз?' : 'Мы должны начать сейчас?'],
        ['Must they show documents?', isUK ? 'Вони мусять показати документи?' : 'Они должны показать документы?'],
      ]}
    />,

    <Warn key="w10" t={t} f={f} text={isUK ? '❌ Do I must sign it? → ✅ Must I sign it? У питанні must сам виходить на початок.' : '❌ Do I must sign it? → ✅ Must I sign it? В вопросе must сам выходит в начало.'} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Must not: не можна / заборонено' : '12. Must not: нельзя / запрещено'} />,

    <Body key="b12a" t={t} f={f} text={isUK ? 'Must not не означає «не повинен» у м\'якому сенсі. У фразах цього уроку це заборона: не можна курити, не можна ділитися паролями, не можна входити.' : 'Must not не означает «не должен» в мягком смысле. Во фразах этого урока это запрет: нельзя курить, нельзя делиться паролями, нельзя входить.'} />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['You must not smoke here', isUK ? 'Тобі не можна курити тут' : 'Тебе нельзя курить здесь'],
        ['He must not share passwords', isUK ? 'Йому не можна ділитися паролями' : 'Ему нельзя делиться паролями'],
        ['They must not enter this room', isUK ? 'Їм не можна входити до цієї кімнати' : 'Им нельзя входить в эту комнату'],
      ]}
    />,

    <Tip key="tip4" t={t} f={f} text={isUK ? 'Should not = не варто. Must not = не можна. Це різна сила.' : 'Should not = не стоит. Must not = нельзя. Это разная сила.'} />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Have to: потрібно / доводиться' : '13. Have to: нужно / приходится'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Have to означає, що щось потрібно зробити через ситуацію, правило або обставини. На відміну від can, should і must, конструкція have to змінюється як звичайна дія.'
        : 'Have to означает, что что-то нужно сделать из-за ситуации, правила или обстоятельств. В отличие от can, should и must, конструкция have to меняется как обычное действие.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I have to work today', isUK ? 'Мені потрібно працювати сьогодні' : 'Мне нужно работать сегодня'],
        ['We have to pay rent', isUK ? 'Нам потрібно платити оренду' : 'Нам нужно платить аренду'],
      ]}
    />,

    <Tip key="tip5" t={t} f={f} text={isUK ? 'I have to work today не означає «я маю роботу сьогодні». Це означає «мені потрібно працювати сьогодні».' : 'I have to work today не означает «у меня есть работа сегодня». Это означает «мне нужно работать сегодня».'} />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Питання і заперечення з have to' : '14. Вопросы и отрицания с have to'} />,

    <Body key="b14a" t={t} f={f} text={isUK ? 'Have to працює як звичайне дієслово, тому в питаннях і запереченнях потрібні do / does / do not / does not.' : 'Have to работает как обычный глагол, поэтому в вопросах и отрицаниях нужны do / does / do not / does not.'} />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Фраза з уроку' : 'Фраза из урока'],
        [isUK ? 'питання' : 'вопрос', 'Do you have to go now?'],
        [isUK ? 'заперечення з she' : 'отрицание с she', 'She does not have to wait'],
        [isUK ? 'заперечення з you' : 'отрицание с you', 'You do not have to answer now'],
      ]}
    />,

    <Warn key="w11" t={t} f={f} text={isUK ? '❌ Does she has to wait? → ✅ Does she have to wait? Після does форма has повертається в have.' : '❌ Does she has to wait? → ✅ Does she have to wait? После does форма has возвращается в have.'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ She does not has to wait → ✅ She does not have to wait. Після does not ставимо have.' : '❌ She does not has to wait → ✅ She does not have to wait. После does not ставим have.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Do not have to = не потрібно, а не "не можна"' : '15. Do not have to = не нужно, а не "нельзя"'} />,

    <Body key="b15a" t={t} f={f} text={isUK ? 'Це дуже важлива різниця. Must not означає заборону. Do not have to означає, що немає необхідності.' : 'Это очень важная разница. Must not означает запрет. Do not have to означает, что нет необходимости.'} />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Заборона' : 'Запрет', isUK ? 'Немає необхідності' : 'Нет необходимости'],
        ['You must not smoke here', 'You do not have to answer now'],
        [isUK ? 'Тобі не можна курити тут' : 'Тебе нельзя курить здесь', isUK ? 'Тобі не потрібно відповідати зараз' : 'Тебе не нужно отвечать сейчас'],
        ['They must not enter this room', 'She does not have to wait'],
        [isUK ? 'Їм не можна входити до цієї кімнати' : 'Им нельзя входить в эту комнату', isUK ? 'Їй не потрібно чекати' : 'Ей не нужно ждать'],
      ]}
    />,

    <Warn key="w13" t={t} f={f} text={isUK ? 'Не плутай: must not = заборонено. do not have to = не обов\'язково / не потрібно.' : 'Не путай: must not = запрещено. do not have to = не обязательно / не нужно.'} />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Me, us, her, him, it, them після дії' : '16. Me, us, her, him, it, them после действия'} />,

    <Body key="b16a" t={t} f={f} text={isUK ? 'Після модального слова стоїть дія, а після дії може стояти людина або предмет: help me, call us, help us, call her, sign it.' : 'После модального слова стоит действие, а после действия может стоять человек или предмет: help me, call us, help us, call her, sign it.'} />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['help me', 'Can you help me?'],
        ['call us', 'Can she call us?'],
        ['hear us', 'Can they hear us?'],
        ['help us', 'He cannot help us'],
        ['call her', 'He should call her'],
        ['call him', 'Should I call him?'],
        ['sign it', 'Must I sign it?'],
      ]}
    />,

    <Warn key="w14" t={t} f={f} text={isUK ? '❌ Can she call we? → ✅ Can she call us? Після call потрібна форма us.' : '❌ Can she call we? → ✅ Can she call us? После call нужна форма us.'} />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Готові блоки з уроку' : '17. Готовые блоки из урока'} />,

    <Body key="b17a" t={t} f={f} text={isUK ? 'У цьому уроці важливо впізнавати не тільки can, should і must, а й готові дієслівні блоки після них.' : 'В этом уроке важно узнавать не только can, should и must, но и готовые глагольные блоки после них.'} />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['start now', isUK ? 'почати зараз' : 'начать сейчас', 'You can start now / We should start now / Must we start now?'],
        ['call later', isUK ? 'зателефонувати пізніше' : 'позвонить позже', 'He can call later'],
        ['speak English', isUK ? 'говорити англійською' : 'говорить по-английски', 'She can speak English'],
        ['start at noon', isUK ? 'почати опівдні' : 'начать в полдень', 'Can we start at noon?'],
        ['go there', isUK ? 'іти туди' : 'идти туда', 'You cannot go there'],
        ['come today', isUK ? 'прийти сьогодні' : 'прийти сегодня', 'She cannot come today'],
        ['find documents', isUK ? 'знайти документи' : 'найти документы', 'We cannot find documents'],
        ['use cash', isUK ? 'використовувати готівку' : 'использовать наличные', 'They cannot use cash'],
        ['drive fast', isUK ? 'їхати швидко / водити швидко' : 'ехать быстро / водить быстро', 'He should not drive fast'],
        ['work at night', isUK ? 'працювати вночі' : 'работать ночью', 'She should not work at night'],
        ['waste time', isUK ? 'витрачати час даремно' : 'тратить время зря', 'We should not waste time'],
        ['finish work', isUK ? 'закінчити роботу' : 'закончить работу', 'He must finish work'],
        ['check messages', isUK ? 'перевірити повідомлення' : 'проверить сообщения', 'She must check messages'],
        ['pay rent', isUK ? 'платити оренду' : 'платить аренду', 'We have to pay rent'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Найчастіші помилки' : '18. Самые частые ошибки'} />,

    <Warn key="w15" t={t} f={f} text={isUK ? '❌ She can speaks English → ✅ She can speak English. Після can дія без -s.' : '❌ She can speaks English → ✅ She can speak English. После can действие без -s.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ Can you to help me? → ✅ Can you help me? Після can не ставимо to.' : '❌ Can you to help me? → ✅ Can you help me? После can не ставим to.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ I do not can wait → ✅ I cannot wait. Cannot саме робить заперечення.' : '❌ I do not can wait → ✅ I cannot wait. Cannot само делает отрицание.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ He should calls her → ✅ He should call her. Після should дія без -s.' : '❌ He should calls her → ✅ He should call her. После should действие без -s.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ You do not should wait → ✅ You should not wait. Should not без do.' : '❌ You do not should wait → ✅ You should not wait. Should not без do.'} />,
    <Warn key="w20" t={t} f={f} text={isUK ? '❌ He must finishes work → ✅ He must finish work. Після must дія без -s.' : '❌ He must finishes work → ✅ He must finish work. После must действие без -s.'} />,
    <Warn key="w21" t={t} f={f} text={isUK ? '❌ They do not must enter this room → ✅ They must not enter this room. Must not = заборона.' : '❌ They do not must enter this room → ✅ They must not enter this room. Must not = запрет.'} />,
    <Warn key="w22" t={t} f={f} text={isUK ? '❌ She does not has to wait → ✅ She does not have to wait. Після does not ставимо have.' : '❌ She does not has to wait → ✅ She does not have to wait. После does not ставим have.'} />,
    <Warn key="w23" t={t} f={f} text={isUK ? '❌ You must not answer now → це означає «тобі не можна відповідати зараз». Якщо зміст «не потрібно», правильно: ✅ You do not have to answer now.' : '❌ You must not answer now → это означает «тебе нельзя отвечать сейчас». Если смысл «не нужно», правильно: ✅ You do not have to answer now.'} />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Що треба винести з уроку' : '19. Что нужно вынести из урока'} />,

    <Body
      key="b19a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся керувати дією через модальні слова. Can говорить про можливість. Should дає пораду. Must показує сильний обов\'язок або заборону в must not. Have to показує необхідність через ситуацію або правило.'
        : 'В этом уроке ты учишься управлять действием через модальные слова. Can говорит о возможности. Should даёт совет. Must показывает сильную обязанность или запрет в must not. Have to показывает необходимость из-за ситуации или правила.'
      }
    />,

    <Tip key="tip6" t={t} f={f} text={isUK ? 'Перед практикою тримай моделі: I can help. You should rest. I must go now. You do not have to answer now.' : 'Перед практикой держи модели: I can help. You should rest. I must go now. You do not have to answer now.'} />,
  ],
},
// ── УРОК 11 ──────────────────────────────────────────────────
11: {
  titleRU: 'Past Simple: правильные глаголы',
  titleUK: 'Past Simple: правильні дієслова',
  titlePtBr: "Past Simple: verbos regulares",
  titleVi: "Past Simple: động từ có quy tắc",
  titleId: "Past Simple: kata kerja beraturan",
  titleTr: "Past Simple: düzenli fiiller",
  titlePl: "Past Simple: czasowniki regularne",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити про завершені дії в минулому: я працював учора, ти допоміг мені, він зателефонував їй, ми закінчили роботу, вони повернули квитки.'
        : 'В этом уроке ты учишься говорить о завершённых действиях в прошлом: я работал вчера, ты помог мне, он позвонил ей, мы закончили работу, они вернули билеты.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Зараз / зазвичай' : 'Сейчас / обычно', isUK ? 'Минуле' : 'Прошлое'],
        ['I work', 'I worked yesterday'],
        ['You help me', 'You helped me yesterday'],
        ['He calls her', 'He called her yesterday'],
        ['She cooks dinner', 'She cooked dinner yesterday'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: Past Simple показує дію, яка вже сталася і закінчилася.'
        : 'Главная идея: Past Simple показывает действие, которое уже произошло и закончилось.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах цього уроку формула проста: хто + дія в минулому + продовження або час. Для правильних дієслів минуле часто утворюється через -ed або -d.'
        : 'Во фразах этого урока формула простая: кто + действие в прошлом + продолжение или время. Для правильных глаголов прошлое часто образуется через -ed или -d.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Дія в минулому' : 'Действие в прошлом', isUK ? 'Коли / що?' : 'Когда / что?', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'worked', 'yesterday', 'I worked yesterday'],
        ['You', 'helped', 'me yesterday', 'You helped me yesterday'],
        ['He', 'called', 'her yesterday', 'He called her yesterday'],
        ['She', 'cooked', 'dinner yesterday', 'She cooked dinner yesterday'],
        ['We', 'finished', 'work at five', 'We finished work at five'],
        ['They', 'started', 'work at nine', 'They started work at nine'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I work yesterday → ✅ I worked yesterday. Якщо дія була в минулому, потрібна минула форма.'
        : '❌ I work yesterday → ✅ I worked yesterday. Если действие было в прошлом, нужна прошедшая форма.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. -ed для правильних дієслів' : '3. -ed для правильных глаголов'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Більшість дієслів у цьому уроці правильні. Це означає, що для минулого часу ми додаємо -ed.'
        : 'Большинство глаголов в этом уроке правильные. Это значит, что для прошедшего времени мы добавляем -ed.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['work', 'worked', 'I worked yesterday'],
        ['help', 'helped', 'You helped me yesterday'],
        ['cook', 'cooked', 'She cooked dinner yesterday'],
        ['watch', 'watched', 'We watched TV yesterday'],
        ['play', 'played', 'They played music yesterday'],
        ['wash', 'washed', 'I washed the dishes this morning'],
        ['open', 'opened', 'You opened apps this morning'],
        ['check', 'checked', 'He checked messages this morning'],
        ['wash', 'washed', 'She washed clothes this morning'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'У Past Simple форма однакова для всіх: I worked, he worked, she worked, we worked, they worked.'
        : 'В Past Simple форма одинаковая для всех: I worked, he worked, she worked, we worked, they worked.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Немає -s для he / she / it у Past Simple' : '4. Нет -s для he / she / it в Past Simple'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'У Present Simple ми додавали -s з he / she / it: He calls, She cooks. Але в Past Simple форма вже минула, тому додаткове -s не потрібне.'
        : 'В Present Simple мы добавляли -s с he / she / it: He calls, She cooks. Но в Past Simple форма уже прошедшая, поэтому дополнительное -s не нужно.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Теперішній час' : 'Настоящее время', isUK ? 'Минуле' : 'Прошлое'],
        ['He calls her', 'He called her yesterday'],
        ['She cooks dinner', 'She cooked dinner yesterday'],
        ['He checks messages', 'He checked messages this morning'],
        ['She washes clothes', 'She washed clothes this morning'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ He calleds her yesterday → ✅ He called her yesterday. У Past Simple не додаємо ще одне -s.'
        : '❌ He calleds her yesterday → ✅ He called her yesterday. В Past Simple не добавляем ещё одно -s.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Якщо дієслово вже закінчується на -e' : '5. Если глагол уже заканчивается на -e'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Якщо дієслово вже закінчується на -e, зазвичай додаємо тільки -d. У цьому уроці це видно в use, close, move, save, change, prepare, delete, charge.'
        : 'Если глагол уже заканчивается на -e, обычно добавляем только -d. В этом уроке это видно в use, close, move, save, change, prepare, delete, charge.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['use', 'used', 'He used cash yesterday'],
        ['close', 'closed', 'She closed apps yesterday'],
        ['move', 'moved', 'We moved tables last week'],
        ['save', 'saved', 'You saved money last month'],
        ['change', 'changed', 'He changed plans yesterday'],
        ['prepare', 'prepared', 'She prepared lunch yesterday'],
        ['delete', 'deleted', 'You deleted messages two hours ago'],
        ['charge', 'charged', 'She charged a phone last week'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ She closeed apps → ✅ She closed apps. Якщо дієслово вже має -e, додаємо тільки -d.'
        : '❌ She closeed apps → ✅ She closed apps. Если глагол уже имеет -e, добавляем только -d.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Закінчення -ed може звучати по-різному' : '6. Окончание -ed может звучать по-разному'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'На письмі ти часто бачиш -ed, але на слух воно не завжди звучить однаково. Не треба зараз заучувати фонетику глибоко, але важливо знати: -ed може звучати коротко або як окремий склад.'
        : 'На письме ты часто видишь -ed, но на слух оно не всегда звучит одинаково. Не нужно сейчас глубоко учить фонетику, но важно знать: -ed может звучать коротко или как отдельный слог.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип звучання' : 'Тип звучания', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        [isUK ? 'коротке /t/' : 'короткое /t/', 'worked / helped / watched / cooked / checked / washed / packed / fixed / locked / brushed'],
        [isUK ? 'коротке /d/' : 'короткое /d/', 'called / cleaned / opened / played / ordered / used / closed / saved / changed / mailed'],
        [isUK ? 'окремий склад /id/' : 'отдельный слог /id/', 'started / waited / needed / wanted / rented / printed / visited / deleted / painted'],
      ]}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Для практики головне впізнавати форму на слух: worked, called, started. Не вимовляй усі -ed як окреме "ед".'
        : 'Для практики главное узнавать форму на слух: worked, called, started. Не произноси все -ed как отдельное "эд".'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Маркери минулого часу' : '7. Маркеры прошедшего времени'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку є слова, які прямо показують минуле: yesterday, this morning, last week, last month, two hours ago, on Monday, on Friday, at night.'
        : 'Во фразах урока есть слова, которые прямо показывают прошлое: yesterday, this morning, last week, last month, two hours ago, on Monday, on Friday, at night.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Маркер' : 'Маркер', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['yesterday', isUK ? 'учора' : 'вчера', 'I worked yesterday / He called her yesterday'],
        ['this morning', isUK ? 'сьогодні вранці' : 'сегодня утром', 'I washed the dishes this morning'],
        ['last week', isUK ? 'минулого тижня' : 'на прошлой неделе', 'I booked tickets last week'],
        ['last month', isUK ? 'минулого місяця' : 'в прошлом месяце', 'You saved money last month'],
        ['two hours ago', isUK ? 'дві години тому' : 'два часа назад', 'I fixed a problem two hours ago'],
        ['on Monday', isUK ? 'у понеділок' : 'в понедельник', 'We discussed problems on Monday'],
        ['on Friday', isUK ? 'у п\'ятницю' : 'в пятницу', 'They delivered food on Friday'],
        ['at night', isUK ? 'вночі' : 'ночью', 'I locked the door at night'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ two hours before → ✅ two hours ago. Коли рахуємо назад від зараз, використовуємо ago.'
        : '❌ two hours before → ✅ two hours ago. Когда считаем назад от сейчас, используем ago.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Yesterday, this morning, last week' : '8. Yesterday, this morning, last week'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок багато разів повторює часові маркери, щоб ти автоматично чув минулий час. Якщо є yesterday або last week, дія майже точно вже завершена.'
        : 'Урок много раз повторяет временные маркеры, чтобы ты автоматически слышал прошедшее время. Если есть yesterday или last week, действие почти точно уже завершено.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Часовий блок' : 'Временной блок', isUK ? 'Приклади' : 'Примеры'],
        ['yesterday', 'worked yesterday / helped me yesterday / called her yesterday / prepared lunch yesterday'],
        ['this morning', 'washed the dishes this morning / opened apps this morning / missed a call this morning'],
        ['last week', 'booked tickets last week / rented a car last week / printed documents last week'],
        ['last month', 'saved money last month / visited our friends last month'],
        ['two hours ago', 'fixed a problem two hours ago / deleted messages two hours ago / mailed documents two hours ago'],
      ]}
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Слова після дії: що, кого, де, коли' : '9. Слова после действия: что, кого, где, когда'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Після дії в минулому може стояти об\'єкт, людина, місце або час. Це та сама логіка, яку ти вже бачив у Present Simple, тільки дія тепер у минулому.'
        : 'После действия в прошлом может стоять объект, человек, место или время. Это та же логика, которую ты уже видел в Present Simple, только действие теперь в прошлом.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання' : 'Вопрос', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        [isUK ? 'Що?' : 'Что?', 'cooked dinner / watched TV / played music / ordered food / packed bags / returned tickets'],
        [isUK ? 'Кого?' : 'Кого?', 'helped me / called her / called my friend / helped her sister'],
        [isUK ? 'Де?' : 'Где?', 'waited outside / parked outside'],
        [isUK ? 'Коли?' : 'Когда?', 'yesterday / this morning / last week / two hours ago / on Monday / at night'],
      ]}
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Me, her, my, our, their після дії' : '10. Me, her, my, our, their после действия'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці є не тільки дієслова, а й короткі слова після них: me, her, my, our, their. Вони показують, кого торкнулася дія або чия це річ.'
        : 'В этом уроке есть не только глаголы, но и короткие слова после них: me, her, my, our, their. Они показывают, кого коснулось действие или чья это вещь.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['me', isUK ? 'мені / мене' : 'мне / меня', 'You helped me yesterday'],
        ['her', isUK ? 'їй / її' : 'ей / её', 'He called her yesterday'],
        ['my', isUK ? 'мій / моя / моє' : 'мой / моя / моё', 'She called my friend yesterday'],
        ['her', isUK ? 'її' : 'её', 'He helped her sister yesterday'],
        ['our', isUK ? 'наш / наших' : 'наш / наших', 'We visited our friends last month'],
        ['their', isUK ? 'їхній / свою' : 'их / свою', 'They cleaned their room last Sunday'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ You helped I yesterday → ✅ You helped me yesterday. Після helped потрібна форма me.'
        : '❌ You helped I yesterday → ✅ You helped me yesterday. После helped нужна форма me.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Готові блоки з уроку' : '11. Готовые блоки из урока'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці краще впізнавати не тільки окремі дієслова, а цілі блоки. Саме вони будуть швидше читатися і сприйматися на слух.'
        : 'В этом уроке лучше узнавать не только отдельные глаголы, а целые блоки. Именно они будут быстрее читаться и восприниматься на слух.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['helped me', isUK ? 'допоміг мені' : 'помог мне', 'You helped me yesterday'],
        ['called her', isUK ? 'зателефонував їй' : 'позвонил ей', 'He called her yesterday'],
        ['cooked dinner', isUK ? 'приготувала вечерю' : 'приготовила ужин', 'She cooked dinner yesterday'],
        ['watched TV', isUK ? 'дивилися телевізор' : 'смотрели телевизор', 'We watched TV yesterday'],
        ['played music', isUK ? 'грали музику' : 'играли музыку', 'They played music yesterday'],
        ['listened to music', isUK ? 'слухав музику' : 'слушал музыку', 'You listened to music'],
        ['asked for help', isUK ? 'попросив допомоги' : 'попросил помощи', 'He asked for help'],
        ['answered questions', isUK ? 'відповіла на питання' : 'ответила на вопросы', 'She answered questions'],
        ['ordered food', isUK ? 'замовили їжу' : 'заказали еду', 'We ordered food'],
        ['canceled plans', isUK ? 'скасували плани' : 'отменили планы', 'We canceled plans yesterday'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ You listened music → ✅ You listened to music. Після listen потрібне to навіть у минулому.'
        : '❌ You listened music → ✅ You listened to music. После listen нужно to даже в прошлом.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ He asked help → ✅ He asked for help. У цьому блоці потрібне for.'
        : '❌ He asked help → ✅ He asked for help. В этом блоке нужен for.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Дії з предметами' : '12. Действия с предметами'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Багато фраз уроку мають просту структуру: хто + дія в минулому + предмет. Це допомагає швидко збирати речення.'
        : 'Много фраз урока имеют простую структуру: кто + действие в прошлом + предмет. Это помогает быстро собирать предложения.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Дія' : 'Действие', isUK ? 'Об\'єкт' : 'Объект', isUK ? 'Приклад' : 'Пример'],
        ['checked', 'messages / documents', 'He checked messages / We checked documents'],
        ['washed', 'clothes', 'She washed clothes'],
        ['closed', 'apps', 'She closed apps'],
        ['packed', 'bags', 'They packed bags'],
        ['booked', 'tickets', 'I booked tickets'],
        ['printed', 'documents', 'He printed documents'],
        ['charged', 'a phone', 'She charged a phone'],
        ['moved', 'tables', 'We moved tables'],
        ['painted', 'walls', 'They painted walls'],
        ['returned', 'tickets / a book', 'They returned tickets / I returned a book'],
      ]}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Time, help, cash, money' : '13. Time, help, cash, money'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Деякі слова в уроці виглядають простими, але перекладаються не дослівно. Needed time, wanted help, used cash, saved money краще вчити як готові блоки.'
        : 'Некоторые слова в уроке выглядят простыми, но переводятся не дословно. Needed time, wanted help, used cash, saved money лучше учить как готовые блоки.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I needed time', isUK ? 'Мені потрібен був час' : 'Мне нужно было время'],
        ['You wanted help', isUK ? 'Ти хотів допомоги' : 'Ты хотел помощи'],
        ['He used cash yesterday', isUK ? 'Він використовував готівку вчора' : 'Он использовал наличные вчера'],
        ['You saved money last month', isUK ? 'Ти заощадив гроші минулого місяця' : 'Ты сэкономил деньги в прошлом месяце'],
      ]}
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Help у wanted help означає «допомога», а не дію «допомагати».'
        : 'Help в wanted help означает «помощь», а не действие «помогать».'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Часові блоки: at, on, last, ago' : '14. Временные блоки: at, on, last, ago'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'У Past Simple часто важлива не тільки дія, а й те, коли вона відбулася. У цьому уроці є кілька знайомих часових блоків.'
        : 'В Past Simple часто важно не только действие, но и когда оно произошло. В этом уроке есть несколько знакомых временных блоков.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок часу' : 'Блок времени', isUK ? 'Приклад' : 'Пример'],
        ['at five', 'We finished work at five'],
        ['at nine', 'They started work at nine'],
        ['at night', 'I locked the door at night'],
        ['on Monday', 'We discussed problems on Monday'],
        ['on Friday', 'They delivered food on Friday'],
        ['last Sunday', 'They cleaned their room last Sunday'],
        ['last Tuesday', 'I returned a book last Tuesday'],
        ['two hours ago', 'She mailed documents two hours ago'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ in Monday → ✅ on Monday. Для дня тижня використовуємо on.'
        : '❌ in Monday → ✅ on Monday. Для дня недели используем on.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ two hours last → ✅ two hours ago. Для «дві години тому» використовуємо ago.'
        : '❌ two hours last → ✅ two hours ago. Для «два часа назад» используем ago.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Переклад не завжди дослівний' : '15. Перевод не всегда дословный'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'Past Simple часто перекладається природно, а не слово в слово. Особливо це видно у фразах з needed, wanted, missed, saved, brushed.'
        : 'Past Simple часто переводится естественно, а не слово в слово. Особенно это видно во фразах с needed, wanted, missed, saved, brushed.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I needed time', isUK ? 'Мені потрібен був час' : 'Мне нужно было время'],
        ['You wanted help', isUK ? 'Ти хотів допомоги' : 'Ты хотел помощи'],
        ['I missed a call this morning', isUK ? 'Я пропустив дзвінок сьогодні вранці' : 'Я пропустил звонок сегодня утром'],
        ['You saved money last month', isUK ? 'Ти заощадив гроші минулого місяця' : 'Ты сэкономил деньги в прошлом месяце'],
        ['She brushed her hair this morning', isUK ? 'Вона розчесала волосся сьогодні вранці' : 'Она расчесала волосы сегодня утром'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Тільки твердження' : '16. Только утверждения'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці всі фрази — твердження. Ми не тренуємо питання або заперечення в минулому часі. Головна задача тут — навчитися бачити і чути минулу форму правильного дієслова.'
        : 'В этом уроке все фразы - утверждения. Мы не тренируем вопросы или отрицания в прошедшем времени. Главная задача здесь - научиться видеть и слышать прошедшую форму правильного глагола.'
      }
    />,

    <Tip
      key="tip5"
      t={t}
      f={f}
      text={isUK
        ? 'Питання й заперечення в минулому часі будуть окремим механізмом пізніше. Урок 11 ставить базу: правильне дієслово + минулий маркер.'
        : 'Вопросы и отрицания в прошедшем времени будут отдельным механизмом позже. Урок 11 ставит базу: правильный глагол + маркер прошлого.'
      }
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Найчастіші помилки' : '17. Самые частые ошибки'} />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ I work yesterday → ✅ I worked yesterday. Для минулого потрібна форма worked.'
        : '❌ I work yesterday → ✅ I worked yesterday. Для прошлого нужна форма worked.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ He call her yesterday → ✅ He called her yesterday. У минулому додаємо -ed або -d.'
        : '❌ He call her yesterday → ✅ He called her yesterday. В прошлом добавляем -ed или -d.'
      }
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ She cooked dinner tomorrow → ✅ She cooked dinner yesterday. Past Simple потребує минулого контексту.'
        : '❌ She cooked dinner tomorrow → ✅ She cooked dinner yesterday. Past Simple требует прошлого контекста.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ She closeed apps yesterday → ✅ She closed apps yesterday. Якщо є -e, додаємо тільки -d.'
        : '❌ She closeed apps yesterday → ✅ She closed apps yesterday. Если есть -e, добавляем только -d.'
      }
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ He checked messages this morning ago → ✅ He checked messages this morning. Не змішуй this morning і ago.'
        : '❌ He checked messages this morning ago → ✅ He checked messages this morning. Не смешивай this morning и ago.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ You listened music → ✅ You listened to music. Після listen потрібне to.'
        : '❌ You listened music → ✅ You listened to music. После listen нужно to.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ He asked help → ✅ He asked for help. Після ask у цій фразі потрібне for.'
        : '❌ He asked help → ✅ He asked for help. После ask в этой фразе нужен for.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ You helped I yesterday → ✅ You helped me yesterday. Після дії потрібна форма me.'
        : '❌ You helped I yesterday → ✅ You helped me yesterday. После действия нужна форма me.'
      }
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Що треба винести з уроку' : '18. Что нужно вынести из урока'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати твердження в минулому часі з правильними дієсловами. Більшість таких дієслів отримують -ed. Якщо дієслово вже закінчується на -e, додаємо тільки -d. Форма однакова для I, you, he, she, we і they.'
        : 'В этом уроке ты учишься строить утверждения в прошедшем времени с правильными глаголами. Большинство таких глаголов получают -ed. Если глагол уже заканчивается на -e, добавляем только -d. Форма одинаковая для I, you, he, she, we и they.'
      }
    />,

    <Tip
      key="tip6"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: I worked yesterday. She closed apps yesterday. You deleted messages two hours ago.'
        : 'Перед практикой держи три модели: I worked yesterday. She closed apps yesterday. You deleted messages two hours ago.'
      }
    />,
  ],
},
// ── УРОК 12 ──────────────────────────────────────────────────
12: {
  titleRU: 'Past Simple: неправильные глаголы',
  titleUK: 'Past Simple: неправильні дієслова',
  titlePtBr: "Past Simple: verbos irregulares",
  titleVi: "Past Simple: động từ bất quy tắc",
  titleId: "Past Simple: kata kerja tidak beraturan",
  titleTr: "Past Simple: düzensiz fiiller",
  titlePl: "Past Simple: czasowniki nieregularne",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У минулому уроці ти тренував Past Simple з правильними дієсловами: worked, helped, called, cleaned. У цьому уроці ти переходиш до неправильних дієслів. Вони не додають -ed, а змінюють форму: buy → bought, drink → drank, go → went, see → saw.'
        : 'В прошлом уроке ты тренировал Past Simple с правильными глаголами: worked, helped, called, cleaned. В этом уроке ты переходишь к неправильным глаголам. Они не добавляют -ed, а меняют форму: buy → bought, drink → drank, go → went, see → saw.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Теперішній / базова форма' : 'Настоящее / базовая форма', isUK ? 'Минуле' : 'Прошлое'],
        ['I buy bread', 'I bought bread yesterday'],
        ['She drinks coffee', 'She drank coffee this morning'],
        ['We find keys', 'We found keys this morning'],
        ['They come late', 'They came late yesterday'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: у неправильних дієсловах минулий час треба впізнавати як окрему форму. Не boughted, не drinked, не goed.'
        : 'Главная идея: у неправильных глаголов прошедшее время нужно узнавать как отдельную форму. Не boughted, не drinked, не goed.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Формула така сама, як у Past Simple: хто + дія в минулому + продовження або час. Різниця тільки в тому, що дія має неправильну форму.'
        : 'Формула такая же, как в Past Simple: кто + действие в прошлом + продолжение или время. Разница только в том, что действие имеет неправильную форму.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Неправильна форма' : 'Неправильная форма', isUK ? 'Продовження' : 'Продолжение', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'bought', 'bread yesterday', 'I bought bread yesterday'],
        ['She', 'drank', 'coffee this morning', 'She drank coffee this morning'],
        ['We', 'found', 'keys this morning', 'We found keys this morning'],
        ['They', 'sold', 'tickets last week', 'They sold tickets last week'],
        ['You', 'sent', 'messages yesterday', 'You sent messages yesterday'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I buy bread yesterday → ✅ I bought bread yesterday. Якщо дія була в минулому, потрібна минула форма.'
        : '❌ I buy bread yesterday → ✅ I bought bread yesterday. Если действие было в прошлом, нужна прошедшая форма.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ I buyed bread → ✅ I bought bread. Buy — неправильне дієслово.'
        : '❌ I buyed bread → ✅ I bought bread. Buy - неправильный глагол.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Неправильні форми з уроку' : '3. Неправильные формы из урока'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Ці форми не виводяться простим правилом -ed. Їх треба впізнавати як готові пари: buy - bought, drink - drank, find - found.'
        : 'Эти формы не выводятся простым правилом -ed. Их нужно узнавать как готовые пары: buy - bought, drink - drank, find - found.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['buy', 'bought', 'I bought bread yesterday / He bought headphones yesterday'],
        ['drink', 'drank', 'She drank coffee this morning / You drank juice this morning'],
        ['find', 'found', 'We found keys this morning / They found it this morning'],
        ['sell', 'sold', 'They sold tickets last week'],
        ['send', 'sent', 'You sent messages yesterday'],
        ['come', 'came', 'They came late yesterday'],
        ['see', 'saw', 'You saw him yesterday / We saw them yesterday'],
        ['build', 'built', 'We built a plan last week'],
        ['write', 'wrote', 'I wrote messages this morning'],
        ['bring', 'brought', 'She brought food two hours ago / I brought a charger'],
      ]}
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['go', 'went', 'We went home last night'],
        ['put', 'put', 'I put it here'],
        ['give', 'gave', 'They gave me advice last month / He gave her a key'],
        ['eat', 'ate', 'He ate breakfast at eight'],
        ['take', 'took', 'She took cash yesterday'],
        ['make', 'made', 'We made dinner yesterday / They made mistakes yesterday'],
        ['hear', 'heard', 'They heard us at night'],
        ['get', 'got', 'I got tickets last week / We got good news yesterday'],
        ['lose', 'lost', 'You lost money yesterday'],
        ['leave', 'left', 'He left early this morning / She left documents at home'],
      ]}
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['feel', 'felt', 'She felt tired yesterday'],
        ['meet', 'met', 'We met friends on Friday'],
        ['read', 'read', 'They read books last month'],
        ['speak', 'spoke', 'I spoke English yesterday'],
        ['know', 'knew', 'You knew him before'],
        ['think', 'thought', 'He thought about it yesterday'],
        ['say', 'said', 'She said yes'],
        ['pay', 'paid', 'We paid cash yesterday'],
        ['run', 'ran', 'They ran outside this morning'],
        ['sleep', 'slept', 'I slept well last night'],
      ]}
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['sit', 'sat', 'You sat here yesterday'],
        ['stand', 'stood', 'He stood outside'],
        ['wear', 'wore', 'She wore glasses yesterday'],
        ['drive', 'drove', 'We drove cars last week'],
        ['do', 'did', 'They did it yesterday'],
        ['have', 'had', 'I had time yesterday / You had a question yesterday / She had a problem last week'],
        ['tell', 'told', 'She told me a story'],
        ['forget', 'forgot', 'You forgot a key yesterday'],
        ['choose', 'chose', 'He chose a plan last week'],
      ]}
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Форма однакова для всіх' : '4. Форма одинаковая для всех'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'У Past Simple неправильна форма не змінюється для he, she, it. Не додавай -s до минулої форми.'
        : 'В Past Simple неправильная форма не меняется для he, she, it. Не добавляй -s к прошедшей форме.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Правильно' : 'Правильно', isUK ? 'Чому' : 'Почему'],
        ['I bought bread', isUK ? 'минула форма bought' : 'прошедшая форма bought'],
        ['He bought headphones', isUK ? 'не boughts' : 'не boughts'],
        ['She drank coffee', isUK ? 'не dranks' : 'не dranks'],
        ['They came late', isUK ? 'та сама форма для they' : 'та же форма для they'],
        ['He left early', isUK ? 'не lefts' : 'не lefts'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ He boughts headphones → ✅ He bought headphones. У Past Simple не додаємо -s.'
        : '❌ He boughts headphones → ✅ He bought headphones. В Past Simple не добавляем -s.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Часові маркери минулого' : '5. Временные маркеры прошлого'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази уроку часто мають слова, які прямо показують минуле: yesterday, this morning, last week, last month, two hours ago, last night, on Friday, before.'
        : 'Фразы урока часто имеют слова, которые прямо показывают прошлое: yesterday, this morning, last week, last month, two hours ago, last night, on Friday, before.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Маркер' : 'Маркер', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['yesterday', isUK ? 'вчора' : 'вчера', 'I bought bread yesterday / You saw him yesterday'],
        ['this morning', isUK ? 'сьогодні вранці' : 'сегодня утром', 'She drank coffee this morning / We found keys this morning'],
        ['last week', isUK ? 'минулого тижня' : 'на прошлой неделе', 'They sold tickets last week / We drove cars last week'],
        ['last month', isUK ? 'минулого місяця' : 'в прошлом месяце', 'They gave me advice last month / They read books last month'],
        ['two hours ago', isUK ? 'дві години тому' : 'два часа назад', 'She brought food two hours ago'],
        ['last night', isUK ? 'минулої ночі' : 'прошлой ночью', 'We went home last night / I slept well last night'],
        ['on Friday', isUK ? 'у п\'ятницю' : 'в пятницу', 'We met friends on Friday'],
        ['before', isUK ? 'раніше' : 'раньше', 'You knew him before'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ two hours before → ✅ two hours ago. Якщо значення «дві години тому», використовуй ago.'
        : '❌ two hours before → ✅ two hours ago. Если значение «два часа назад», используй ago.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Форми, які не змінюються на письмі: put і read' : '6. Формы, которые не меняются на письме: put и read'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Деякі неправильні дієслова в Past Simple виглядають так само, як базова форма. У цьому уроці це put і read. Але read у минулому вимовляється інакше.'
        : 'Некоторые неправильные глаголы в Past Simple выглядят так же, как базовая форма. В этом уроке это put и read. Но read в прошлом произносится иначе.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад' : 'Пример'],
        ['put', 'put', 'I put it here'],
        ['read', 'read', 'They read books last month'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'На письмі read виглядає однаково, але в минулому звучить як red. Для цього уроку головне - впізнати його як Past Simple через last month.'
        : 'На письме read выглядит одинаково, но в прошлом звучит как red. Для этого урока главное - узнать его как Past Simple через last month.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Had = було / був / була у когось' : '7. Had = было / был / была у кого-то'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Had - це минула форма have / has. У цьому уроці вона означає, що щось було у людини в минулому.'
        : 'Had - это прошедшая форма have / has. В этом уроке она означает, что что-то было у человека в прошлом.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Теперішній час' : 'Настоящее время', isUK ? 'Минуле' : 'Прошлое'],
        ['I have time', 'I had time yesterday'],
        ['You have a question', 'You had a question yesterday'],
        ['She has a problem', 'She had a problem last week'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ She haved a problem → ✅ She had a problem. Have / has у минулому стає had.'
        : '❌ She haved a problem → ✅ She had a problem. Have / has в прошлом становится had.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Gave і told: кому + що' : '8. Gave и told: кому + что'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах gave і told після дії може бути людина, а потім предмет або інформація: дали мені пораду, дав їй ключ, розповіла мені історію.'
        : 'Во фразах gave и told после действия может быть человек, а потом предмет или информация: дали мне совет, дал ей ключ, рассказала мне историю.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Логіка' : 'Логика', isUK ? 'Переклад' : 'Перевод'],
        ['They gave me advice last month', isUK ? 'gave + кому + що' : 'gave + кому + что', isUK ? 'Вони дали мені пораду минулого місяця' : 'Они дали мне совет в прошлом месяце'],
        ['He gave her a key', isUK ? 'gave + кому + що' : 'gave + кому + что', isUK ? 'Він дав їй ключ' : 'Он дал ей ключ'],
        ['She told me a story', isUK ? 'told + кому + що' : 'told + кому + что', isUK ? 'Вона розповіла мені історію' : 'Она рассказала мне историю'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ He gave she a key → ✅ He gave her a key. Після gave потрібна форма her.'
        : '❌ He gave she a key → ✅ He gave her a key. После gave нужна форма her.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Me, him, her, us, them, it після дії' : '9. Me, him, her, us, them, it после действия'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Після дії часто стоїть людина або предмет, на який спрямована дія: бачив його, чули нас, дали мені, бачили їх, знайшли це.'
        : 'После действия часто стоит человек или предмет, на который направлено действие: видел его, слышали нас, дали мне, видели их, нашли это.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', isUK ? 'мені / мене' : 'мне / меня', 'They gave me advice / She told me a story'],
        ['him', isUK ? 'його / йому' : 'его / ему', 'You saw him yesterday / You knew him before'],
        ['her', isUK ? 'їй / її' : 'ей / её', 'He gave her a key'],
        ['us', isUK ? 'нас / нам' : 'нас / нам', 'They heard us at night'],
        ['them', isUK ? 'їх / їм' : 'их / им', 'We saw them yesterday'],
        ['it', isUK ? 'це / його' : 'это / его', 'I put it here / They did it yesterday / They found it this morning'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ We saw they yesterday → ✅ We saw them yesterday. Після saw потрібна форма them.'
        : '❌ We saw they yesterday → ✅ We saw them yesterday. После saw нужна форма them.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Готові блоки з уроку' : '10. Готовые блоки из урока'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Неправильні дієслова краще вчити не голим списком, а готовими блоками з уроку.'
        : 'Неправильные глаголы лучше учить не голым списком, а готовыми блоками из урока.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['bought bread', isUK ? 'купив хліб' : 'купил хлеб', 'I bought bread yesterday'],
        ['drank coffee', isUK ? 'випила каву' : 'выпила кофе', 'She drank coffee this morning'],
        ['found keys', isUK ? 'знайшли ключі' : 'нашли ключи', 'We found keys this morning'],
        ['sold tickets', isUK ? 'продали квитки' : 'продали билеты', 'They sold tickets last week'],
        ['sent messages', isUK ? 'надіслав повідомлення' : 'отправил сообщения', 'You sent messages yesterday'],
        ['came late', isUK ? 'прийшли пізно' : 'пришли поздно', 'They came late yesterday'],
        ['wrote messages', isUK ? 'написав повідомлення' : 'написал сообщения', 'I wrote messages this morning'],
        ['brought food', isUK ? 'принесла їжу' : 'принесла еду', 'She brought food two hours ago'],
        ['went home', isUK ? 'пішли додому' : 'пошли домой', 'We went home last night'],
        ['paid cash', isUK ? 'заплатили готівкою' : 'заплатили наличными', 'We paid cash yesterday'],
      ]}
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['ate breakfast', isUK ? 'поснідав' : 'съел завтрак / позавтракал', 'He ate breakfast at eight'],
        ['took cash', isUK ? 'взяла готівку' : 'взяла наличные', 'She took cash yesterday'],
        ['made dinner', isUK ? 'приготували вечерю' : 'приготовили ужин', 'We made dinner yesterday'],
        ['got tickets', isUK ? 'отримав квитки' : 'получил билеты', 'I got tickets last week'],
        ['lost money', isUK ? 'загубив гроші' : 'потерял деньги', 'You lost money yesterday'],
        ['left early', isUK ? 'пішов рано' : 'ушёл рано', 'He left early this morning'],
        ['felt tired', isUK ? 'відчувала втому' : 'чувствовала усталость', 'She felt tired yesterday'],
        ['met friends', isUK ? 'зустріли друзів' : 'встретили друзей', 'We met friends on Friday'],
        ['spoke English', isUK ? 'говорив англійською' : 'говорил по-английски', 'I spoke English yesterday'],
        ['made mistakes', isUK ? 'зробили помилки' : 'сделали ошибки', 'They made mistakes yesterday'],
      ]}
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Переклад не завжди дослівний' : '11. Перевод не всегда дословный'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У неправильних дієсловах важливо не тільки знати форму, а й бачити природний переклад. Деякі фрази не перекладаються слово в слово.'
        : 'В неправильных глаголах важно не только знать форму, но и видеть естественный перевод. Некоторые фразы не переводятся слово в слово.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['He ate breakfast at eight', isUK ? 'Він поснідав о восьмій' : 'Он позавтракал / съел завтрак в восемь'],
        ['We made dinner yesterday', isUK ? 'Ми приготували вечерю вчора' : 'Мы приготовили ужин вчера'],
        ['They made mistakes yesterday', isUK ? 'Вони зробили помилки вчора' : 'Они сделали ошибки вчера'],
        ['I had time yesterday', isUK ? 'У мене був час учора' : 'У меня было время вчера'],
        ['They gave me advice last month', isUK ? 'Вони дали мені пораду минулого місяця' : 'Они дали мне совет в прошлом месяце'],
        ['She told me a story', isUK ? 'Вона розповіла мені історію' : 'Она рассказала мне историю'],
        ['We got good news yesterday', isUK ? 'Ми отримали гарні новини вчора' : 'Мы получили хорошие новости вчера'],
      ]}
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. At home, at eight, at night, on Friday' : '12. At home, at eight, at night, on Friday'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці є кілька знайомих часових і місцевих блоків. Вони не головна тема, але вони є у фразах, тому їх треба впізнавати.'
        : 'В этом уроке есть несколько знакомых временных и местных блоков. Они не главная тема, но они есть во фразах, поэтому их нужно узнавать.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['at eight', isUK ? 'о восьмій' : 'в восемь', 'He ate breakfast at eight'],
        ['at night', isUK ? 'вночі' : 'ночью', 'They heard us at night'],
        ['on Friday', isUK ? 'у п\'ятницю' : 'в пятницу', 'We met friends on Friday'],
        ['at home', isUK ? 'вдома' : 'дома', 'She left documents at home'],
        ['outside', isUK ? 'надворі / зовні' : 'снаружи', 'They ran outside / He stood outside'],
        ['here', isUK ? 'тут' : 'здесь', 'I put it here / You sat here yesterday'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ She left documents in home → ✅ She left documents at home. Блок at home краще запам\'ятати цілим.'
        : '❌ She left documents in home → ✅ She left documents at home. Блок at home лучше запомнить целиком.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Good news без a' : '13. Good news без a'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразі We got good news yesterday слово news не використовується як one news. Тому не ставимо a.'
        : 'Во фразе We got good news yesterday слово news не используется как one news. Поэтому не ставим a.'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="We got good news yesterday"
      rus={isUK ? 'Ми отримали гарні новини вчора' : 'Мы получили хорошие новости вчера'}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ We got a good news → ✅ We got good news. News не отримує a.'
        : '❌ We got a good news → ✅ We got good news. News не получает a.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Тільки твердження' : '14. Только утверждения'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці всі фрази - твердження. Ми не тренуємо питання або заперечення в минулому часі. Головна задача зараз - впізнавати неправильну минулу форму в готовій фразі.'
        : 'В этом уроке все фразы - утверждения. Мы не тренируем вопросы или отрицания в прошедшем времени. Главная задача сейчас - узнавать неправильную прошедшую форму в готовой фразе.'
      }
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Питання й заперечення в минулому часі будуть окремим механізмом пізніше. Тут тримай фокус на bought, drank, found, went, saw, made, had.'
        : 'Вопросы и отрицания в прошедшем времени будут отдельным механизмом позже. Здесь держи фокус на bought, drank, found, went, saw, made, had.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Найчастіші помилки' : '15. Самые частые ошибки'} />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ She drinked coffee → ✅ She drank coffee. Drink у минулому стає drank.'
        : '❌ She drinked coffee → ✅ She drank coffee. Drink в прошлом становится drank.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ We finded keys → ✅ We found keys. Find у минулому стає found.'
        : '❌ We finded keys → ✅ We found keys. Find в прошлом становится found.'
      }
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ We goed home → ✅ We went home. Go у минулому стає went.'
        : '❌ We goed home → ✅ We went home. Go в прошлом становится went.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ He buyed headphones → ✅ He bought headphones. Buy у минулому стає bought.'
        : '❌ He buyed headphones → ✅ He bought headphones. Buy в прошлом становится bought.'
      }
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ I writed messages → ✅ I wrote messages. Write у минулому стає wrote.'
        : '❌ I writed messages → ✅ I wrote messages. Write в прошлом становится wrote.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ She taked cash → ✅ She took cash. Take у минулому стає took.'
        : '❌ She taked cash → ✅ She took cash. Take в прошлом становится took.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ They maked mistakes → ✅ They made mistakes. Make у минулому стає made.'
        : '❌ They maked mistakes → ✅ They made mistakes. Make в прошлом становится made.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ You saw he yesterday → ✅ You saw him yesterday. Після saw потрібна форма him.'
        : '❌ You saw he yesterday → ✅ You saw him yesterday. После saw нужна форма him.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ We got a good news → ✅ We got good news. News без a.'
        : '❌ We got a good news → ✅ We got good news. News без a.'
      }
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Що треба винести з уроку' : '16. Что нужно вынести из урока'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати твердження в Past Simple з неправильними дієсловами. Вони не отримують -ed, а мають окрему минулу форму: bought, drank, found, went, saw, made, had, told, chose. Форма однакова для всіх осіб.'
        : 'В этом уроке ты учишься строить утверждения в Past Simple с неправильными глаголами. Они не получают -ed, а имеют отдельную прошедшую форму: bought, drank, found, went, saw, made, had, told, chose. Форма одинаковая для всех лиц.'
      }
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: I bought bread yesterday. She drank coffee this morning. We found keys this morning.'
        : 'Перед практикой держи три модели: I bought bread yesterday. She drank coffee this morning. We found keys this morning.'
      }
    />,
  ],
},
// ── УРОК 13 ──────────────────────────────────────────────────
13: {
  titleRU: 'Future Simple: will',
  titleUK: 'Future Simple: will',
  titlePtBr: "Future Simple: will",
  titleVi: "Future Simple: will",
  titleId: "Future Simple: will",
  titleTr: "Future Simple: will",
  titlePl: "Future Simple: will",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити про майбутнє через will: я зателефоную, вона допоможе, ми зустрінемося, вони куплять їжу, він надішле повідомлення. Will - це простий спосіб показати майбутню дію.'
        : 'В этом уроке ты учишься говорить о будущем через will: я позвоню, она поможет, мы встретимся, они купят еду, он отправит сообщения. Will - это простой способ показать будущее действие.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Зараз / загалом' : 'Сейчас / вообще', isUK ? 'Майбутнє' : 'Будущее'],
        ['I call you', 'I will call you tomorrow'],
        ['She helps us', 'She will help us next week'],
        ['We meet', 'We will meet soon'],
        ['They buy food', 'They will buy food tomorrow'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: will ставиться перед дією і переносить її в майбутнє.'
        : 'Главная идея: will ставится перед действием и переносит его в будущее.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Формула дуже проста: хто + will + дія + продовження. Після will дієслово завжди стоїть у базовій формі.'
        : 'Формула очень простая: кто + will + действие + продолжение. После will глагол всегда стоит в базовой форме.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', 'will', isUK ? 'Дія' : 'Действие', isUK ? 'Продовження' : 'Продолжение', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'will', 'call', 'you tomorrow', 'I will call you tomorrow'],
        ['She', 'will', 'help', 'us next week', 'She will help us next week'],
        ['We', 'will', 'meet', 'soon', 'We will meet soon'],
        ['They', 'will', 'buy', 'food tomorrow', 'They will buy food tomorrow'],
        ['He', 'will', 'send', 'messages in ten minutes', 'He will send messages in ten minutes'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ She will helps us → ✅ She will help us. Після will дія без -s.'
        : '❌ She will helps us → ✅ She will help us. После will действие без -s.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ He will sends messages → ✅ He will send messages. Will забирає граматику на себе, тому дія проста.'
        : '❌ He will sends messages → ✅ He will send messages. Will забирает грамматику на себя, поэтому действие простое.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Will однаковий для всіх' : '3. Will одинаковый для всех'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Will не змінюється після I, you, he, she, we, they. Це одна з причин, чому Future Simple зручний для новачка.'
        : 'Will не меняется после I, you, he, she, we, they. Это одна из причин, почему Future Simple удобный для новичка.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Фраза з уроку' : 'Фраза из урока'],
        ['I', 'I will call you tomorrow / I will take cash tomorrow / I will pay rent next month'],
        ['You', 'You will bring documents later / You will read books next week / You will answer questions later'],
        ['He', 'He will send messages in ten minutes / He will drink coffee in the morning'],
        ['She', 'She will wear glasses tomorrow / She will choose a plan tomorrow / She will write messages tonight'],
        ['We', 'We will meet soon / We will cook soup soon / We will find keys soon'],
        ['They', 'They will buy food tomorrow / They will sell tickets next month / They will get documents in two days'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Не треба думати про -s: he will send, she will choose, it will cost.'
        : 'Не нужно думать про -s: he will send, she will choose, it will cost.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Маркери майбутнього часу' : '4. Маркеры будущего времени'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку є слова, які прямо показують майбутнє: tomorrow, soon, later, tonight, next week, next month, in ten minutes, in two days, later today. Є також часові блоки today та in the morning.'
        : 'Во фразах урока есть слова, которые прямо показывают будущее: tomorrow, soon, later, tonight, next week, next month, in ten minutes, in two days, later today. Есть также временные блоки today и in the morning.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Маркер' : 'Маркер', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['tomorrow', isUK ? 'завтра' : 'завтра', 'I will call you tomorrow / They will buy food tomorrow'],
        ['soon', isUK ? 'скоро' : 'скоро', 'We will meet soon / They will close soon'],
        ['later', isUK ? 'пізніше' : 'позже', 'You will bring documents later / You will answer questions later'],
        ['tonight', isUK ? 'сьогодні ввечері / цієї ночі' : 'сегодня вечером / этой ночью', 'She will write messages tonight / She will not call him tonight'],
        ['next week', isUK ? 'наступного тижня' : 'на следующей неделе', 'She will help us next week'],
        ['next month', isUK ? 'наступного місяця' : 'в следующем месяце', 'They will sell tickets next month / I will pay rent next month'],
        ['in ten minutes', isUK ? 'через десять хвилин' : 'через десять минут', 'He will send messages in ten minutes'],
        ['in two days', isUK ? 'через два дні' : 'через два дня', 'They will get documents in two days'],
        ['later today', isUK ? 'пізніше сьогодні' : 'позже сегодня', 'She will sing later today'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ after ten minutes → ✅ in ten minutes. Коли значення «через десять хвилин», використовуй in ten minutes.'
        : '❌ after ten minutes → ✅ in ten minutes. Когда значение «через десять минут», используй in ten minutes.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Заперечення: will not' : '5. Отрицание: will not'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб сказати, що дія не відбудеться в майбутньому, постав not після will: will not. Після will not дія теж залишається базовою.'
        : 'Чтобы сказать, что действие не произойдёт в будущем, поставь not после will: will not. После will not действие тоже остаётся базовым.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Заперечення' : 'Отрицание'],
        ['I will wait', 'I will not wait'],
        ['She will call him tonight', 'She will not call him tonight'],
        ['We will work tomorrow', 'We will not work tomorrow'],
        ['They will come today', 'They will not come today'],
        ['He will help them next week', 'He will not help them next week'],
        ['I will forget it', 'I will not forget it'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ I do not will wait → ✅ I will not wait. Для заперечення з will не потрібен do.'
        : '❌ I do not will wait → ✅ I will not wait. Для отрицания с will не нужен do.'
      }
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ She will not calls him → ✅ She will not call him. Після will not дія без -s.'
        : '❌ She will not calls him → ✅ She will not call him. После will not действие без -s.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Питання: Will + хто + дія?' : '6. Вопрос: Will + кто + действие?'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб зробити питання, постав will на початок. Do або does не потрібні.'
        : 'Чтобы сделать вопрос, поставь will в начало. Do или does не нужны.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['You will call me tomorrow', 'Will you call me tomorrow?'],
        ['He will help us', 'Will he help us?'],
        ['She will come today', 'Will she come today?'],
        ['They will work tomorrow', 'Will they work tomorrow?'],
        ['We will meet soon', 'Will we meet soon?'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ Do you will call me? → ✅ Will you call me? У питанні will сам виходить на початок.'
        : '❌ Do you will call me? → ✅ Will you call me? В вопросе will сам выходит в начало.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ Will he helps us? → ✅ Will he help us? Після will дія без -s.'
        : '❌ Will he helps us? → ✅ Will he help us? После will действие без -s.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Will I...? — питання про себе' : '7. Will I...? - вопрос про себя'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці є питання Will I need cash? Це нормальна структура, коли ти питаєш про себе в майбутньому.'
        : 'В этом уроке есть вопрос Will I need cash? Это нормальная структура, когда ты спрашиваешь о себе в будущем.'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="Will I need cash?"
      rus={isUK ? 'Мені знадобиться готівка?' : 'Мне понадобятся наличные?'}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Will I need cash? дослівно ближче до «чи буду я потребувати готівку?», але природно: «мені знадобиться готівка?»'
        : 'Will I need cash? дословно ближе к «буду ли я нуждаться в наличных?», но естественно: «мне понадобятся наличные?»'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Спеціальні питання з will' : '8. Специальные вопросы с will'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Якщо потрібно спитати що, коли, де, чому, скільки або хто, постав питальне слово перед will.'
        : 'Если нужно спросить что, когда, где, почему, сколько или кто, поставь вопросительное слово перед will.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питальне слово' : 'Вопросительное слово', 'will', isUK ? 'Хто?' : 'Кто?', isUK ? 'Дія' : 'Действие', isUK ? 'Фраза' : 'Фраза'],
        ['What', 'will', 'you', 'do', 'What will you do tomorrow?'],
        ['When', 'will', 'she', 'call', 'When will she call?'],
        ['Where', 'will', 'we', 'meet', 'Where will we meet?'],
        ['Why', 'will', 'they', 'wait', 'Why will they wait?'],
        ['How much', 'will', 'it', 'cost', 'How much will it cost?'],
        ['Who', 'will', '', 'help', 'Who will help them?'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ What you will do tomorrow? → ✅ What will you do tomorrow? У спеціальному питанні will стоїть перед людиною.'
        : '❌ What you will do tomorrow? → ✅ What will you do tomorrow? В специальном вопросе will стоит перед человеком.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ How much it will cost? → ✅ How much will it cost? Після how much ставимо will.'
        : '❌ How much it will cost? → ✅ How much will it cost? После how much ставим will.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Who will help them?' : '9. Who will help them?'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Who може бути самим виконавцем дії. У фразі Who will help them? ми питаємо не «кого», а «хто допоможе їм».'
        : 'Who может быть самим исполнителем действия. Во фразе Who will help them? мы спрашиваем не «кого», а «кто поможет им».'
      }
    />,

    <Example
      key="e2"
      t={t}
      f={f}
      eng="Who will help them?"
      rus={isUK ? 'Хто допоможе їм?' : 'Кто поможет им?'}
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'У цій моделі who вже є «хто», тому після who одразу йде will + дія.'
        : 'В этой модели who уже является «кто», поэтому после who сразу идёт will + действие.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Об\'єкти після дії: you, us, it, them, him' : '10. Объекты после действия: you, us, it, them, him'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Після майбутньої дії може стояти людина або предмет, на який спрямована дія: зателефоную тобі, допоможе нам, зрозуміють це, побачимо їх, не зателефонує йому.'
        : 'После будущего действия может стоять человек или предмет, на который направлено действие: позвоню тебе, поможет нам, поймут это, увидим их, не позвонит ему.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['you', isUK ? 'тобі / тебе' : 'тебе / тебя', 'I will call you tomorrow'],
        ['us', isUK ? 'нам / нас' : 'нам / нас', 'She will help us next week / Will he help us?'],
        ['it', isUK ? 'це / його' : 'это / его', 'They will understand it soon / I will not forget it'],
        ['them', isUK ? 'їх / їм' : 'их / им', 'We will see them soon / Who will help them?'],
        ['him', isUK ? 'йому / його' : 'ему / его', 'She will not call him tonight'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ She will help we → ✅ She will help us. Після help потрібна форма us.'
        : '❌ She will help we → ✅ She will help us. После help нужна форма us.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ We will see they → ✅ We will see them. Після see потрібна форма them.'
        : '❌ We will see they → ✅ We will see them. После see нужна форма them.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Після will навіть неправильні дієслова прості' : '11. После will даже неправильные глаголы простые'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці після will є дієслова, які в Past Simple були неправильними: bring, send, wear, read, see, sell, take, drink, find, get, choose, forget. Але після will вони всі стоять у базовій формі.'
        : 'В этом уроке после will есть глаголы, которые в Past Simple были неправильными: bring, send, wear, read, see, sell, take, drink, find, get, choose, forget. Но после will они все стоят в базовой форме.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Past Simple' : 'Past Simple', isUK ? 'Після will' : 'После will', isUK ? 'Приклад' : 'Пример'],
        ['brought', 'bring', 'You will bring documents later'],
        ['sent', 'send', 'He will send messages in ten minutes'],
        ['wore', 'wear', 'She will wear glasses tomorrow'],
        ['read', 'read', 'You will read books next week'],
        ['saw', 'see', 'We will see them soon'],
        ['sold', 'sell', 'They will sell tickets next month'],
        ['took', 'take', 'I will take cash tomorrow'],
        ['drank', 'drink', 'He will drink coffee in the morning'],
        ['found', 'find', 'We will find keys soon'],
        ['got', 'get', 'They will get documents in two days'],
        ['chose', 'choose', 'She will choose a plan tomorrow'],
        ['forgot', 'forget', 'I will not forget it'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ I will forgot it → ✅ I will forget it. Після will потрібна базова форма, не Past Simple.'
        : '❌ I will forgot it → ✅ I will forget it. После will нужна базовая форма, не Past Simple.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ We will found keys → ✅ We will find keys. Після will не використовуємо минулу форму.'
        : '❌ We will found keys → ✅ We will find keys. После will не используем прошедшую форму.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Готові блоки з уроку' : '12. Готовые блоки из урока'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці важливо впізнавати не тільки will, а й готові блоки після нього.'
        : 'В этом уроке важно узнавать не только will, но и готовые блоки после него.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['call you', isUK ? 'зателефонувати тобі' : 'позвонить тебе', 'I will call you tomorrow'],
        ['help us', isUK ? 'допомогти нам' : 'помочь нам', 'She will help us next week'],
        ['buy food', isUK ? 'купити їжу' : 'купить еду', 'They will buy food tomorrow'],
        ['bring documents', isUK ? 'принести документи' : 'принести документы', 'You will bring documents later'],
        ['send messages', isUK ? 'надіслати повідомлення' : 'отправить сообщения', 'He will send messages in ten minutes'],
        ['cook soup', isUK ? 'приготувати суп' : 'приготовить суп', 'We will cook soup soon'],
        ['wear glasses', isUK ? 'носити / надягнути окуляри' : 'носить / надеть очки', 'She will wear glasses tomorrow'],
        ['read books', isUK ? 'читати книги' : 'читать книги', 'You will read books next week'],
        ['write messages', isUK ? 'написати повідомлення' : 'написать сообщения', 'She will write messages tonight'],
        ['sell tickets', isUK ? 'продати квитки' : 'продать билеты', 'They will sell tickets next month'],
        ['pay rent', isUK ? 'заплатити оренду' : 'заплатить аренду', 'I will pay rent next month'],
        ['answer questions', isUK ? 'відповісти на питання' : 'ответить на вопросы', 'You will answer questions later'],
      ]}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Feel better, leave early, close soon' : '13. Feel better, leave early, close soon'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У кінці уроку є природні блоки, які краще вчити цілими: feel better, leave early, sing later today, close soon.'
        : 'В конце урока есть естественные блоки, которые лучше учить целиком: feel better, leave early, sing later today, close soon.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I will feel better tomorrow', isUK ? 'Я буду почуватися краще завтра' : 'Я буду чувствовать себя лучше завтра'],
        ['We will leave early tomorrow', isUK ? 'Ми підемо рано завтра' : 'Мы уйдём рано завтра'],
        ['She will sing later today', isUK ? 'Вона заспіває пізніше сьогодні' : 'Она споёт позже сегодня'],
        ['They will close soon', isUK ? 'Вони скоро закриються' : 'Они скоро закроются'],
      ]}
    />,

    <Tip
      key="tip5"
      t={t}
      f={f}
      text={isUK
        ? 'Close у They will close soon означає «закриються», бо мова про місце або заклад, а не про те, що вони щось закриють руками.'
        : 'Close в They will close soon означает «закроются», потому что речь о месте или заведении, а не о том, что они что-то закроют руками.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Переклад не завжди дослівний' : '14. Перевод не всегда дословный'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Future Simple з will часто перекладається українською або російською майбутньою формою дієслова. Не треба перекладати will окремим словом у кожній фразі.'
        : 'Future Simple с will часто переводится по-русски будущей формой глагола. Не нужно переводить will отдельным словом в каждой фразе.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I will call you tomorrow', isUK ? 'Я зателефоную тобі завтра' : 'Я позвоню тебе завтра'],
        ['She will help us next week', isUK ? 'Вона допоможе нам наступного тижня' : 'Она поможет нам на следующей неделе'],
        ['You will read books next week', isUK ? 'Ти будеш читати книги наступного тижня' : 'Ты будешь читать книги на следующей неделе'],
        ['Will I need cash?', isUK ? 'Мені знадобиться готівка?' : 'Мне понадобятся наличные?'],
        ['How much will it cost?', isUK ? 'Скільки це коштуватиме?' : 'Сколько это будет стоить?'],
        ['They will close soon', isUK ? 'Вони скоро закриються' : 'Они скоро закроются'],
      ]}
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Найчастіші помилки' : '15. Самые частые ошибки'} />,

    <Warn key="w14" t={t} f={f} text={isUK ? '❌ She will helps us → ✅ She will help us. Після will дія без -s.' : '❌ She will helps us → ✅ She will help us. После will действие без -s.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ He will sent messages → ✅ He will send messages. Після will не використовуємо Past Simple.' : '❌ He will sent messages → ✅ He will send messages. После will не используем Past Simple.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ I do not will wait → ✅ I will not wait. Заперечення з will робиться через will not.' : '❌ I do not will wait → ✅ I will not wait. Отрицание с will делается через will not.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ Will she comes today? → ✅ Will she come today? Після will дія без -s.' : '❌ Will she comes today? → ✅ Will she come today? После will действие без -s.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ What you will do tomorrow? → ✅ What will you do tomorrow? У спеціальному питанні will стоїть перед you.' : '❌ What you will do tomorrow? → ✅ What will you do tomorrow? В специальном вопросе will стоит перед you.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ How much it will cost? → ✅ How much will it cost? Після how much ставимо will.' : '❌ How much it will cost? → ✅ How much will it cost? После how much ставим will.'} />,
    <Warn key="w20" t={t} f={f} text={isUK ? '❌ We will see they soon → ✅ We will see them soon. Після see потрібна форма them.' : '❌ We will see they soon → ✅ We will see them soon. После see нужна форма them.'} />,
    <Warn key="w21" t={t} f={f} text={isUK ? '❌ She will help we → ✅ She will help us. Після help потрібна форма us.' : '❌ She will help we → ✅ She will help us. После help нужна форма us.'} />,
    <Warn key="w22" t={t} f={f} text={isUK ? '❌ He will send messages after ten minutes → ✅ He will send messages in ten minutes. Для значення «через десять хвилин» використовуємо in ten minutes.' : '❌ He will send messages after ten minutes → ✅ He will send messages in ten minutes. Для значения «через десять минут» используем in ten minutes.'} />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Що треба винести з уроку' : '16. Что нужно вынести из урока'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати майбутнє через will. Для твердження став will перед дією. Для заперечення використовуй will not. Для питання став will на початок. У спеціальному питанні став question word перед will.'
        : 'В этом уроке ты учишься строить будущее через will. Для утверждения ставь will перед действием. Для отрицания используй will not. Для вопроса ставь will в начало. В специальном вопросе ставь question word перед will.'
      }
    />,

    <Tip
      key="tip6"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: I will call you tomorrow. I will not wait. Will you call me tomorrow?'
        : 'Перед практикой держи три модели: I will call you tomorrow. I will not wait. Will you call me tomorrow?'
      }
    />,
  ],
},
// ── УРОК 14 ──────────────────────────────────────────────────
14: {
  titleRU: 'Сравнение: cheaper, better, the best',
  titleUK: 'Порівняння: cheaper, better, the best',
  titlePtBr: "Comparação: cheaper, better, the best",
  titleVi: "So sánh: cheaper, better, the best",
  titleId: "Perbandingan: cheaper, better, the best",
  titleTr: "Karşılaştırma: cheaper, better, the best",
  titlePl: "Porównania: cheaper, better, the best",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся порівнювати речі, людей, місця, варіанти і ситуації: дешевше, дорожче, краще, гірше, швидше, повільніше, простіше, складніше. Також ти вчишся говорити "найкращий", "найгірший", "найдешевший", "найдорожчий".'
        : 'В этом уроке ты учишься сравнивать вещи, людей, места, варианты и ситуации: дешевле, дороже, лучше, хуже, быстрее, медленнее, проще, сложнее. Также ты учишься говорить "лучший", "худший", "самый дешёвый", "самый дорогой".'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Що означає' : 'Что означает', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        [isUK ? 'Порівняння' : 'Сравнение', isUK ? 'одна річ має більше / менше якості' : 'одна вещь имеет больше / меньше качества', 'This is cheaper / This is more expensive'],
        [isUK ? 'Найвищий ступінь' : 'Превосходная степень', isUK ? 'найсильніший варіант серед усіх' : 'самый сильный вариант среди всех', 'This is the best option / This is the cheapest ticket'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: cheaper = дешевше, the cheapest = найдешевший. Better = краще, the best = найкращий.'
        : 'Главная идея: cheaper = дешевле, the cheapest = самый дешёвый. Better = лучше, the best = лучший.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула порівняння' : '2. Главная формула сравнения'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли ми порівнюємо, після is або looks може стояти форма з -er або more + слово. Короткі слова частіше отримують -er. Довші слова частіше йдуть з more.'
        : 'Когда мы сравниваем, после is или looks может стоять форма с -er или more + слово. Короткие слова чаще получают -er. Более длинные слова чаще идут с more.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Модель' : 'Модель', isUK ? 'Приклад' : 'Пример', isUK ? 'Переклад' : 'Перевод'],
        ['This is + -er', 'This is cheaper', isUK ? 'Це дешевше' : 'Это дешевле'],
        ['This is + more + word', 'This is more expensive', isUK ? 'Це дорожче' : 'Это дороже'],
        ['It is + irregular form', 'It is better now', isUK ? 'Зараз краще' : 'Сейчас лучше'],
        ['looks + comparative', 'She looks happier today', isUK ? 'Вона сьогодні виглядає щасливішою' : 'Она сегодня выглядит счастливее'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is more cheaper → ✅ This is cheaper. Не став more перед словом, яке вже має -er.'
        : '❌ This is more cheaper → ✅ This is cheaper. Не ставь more перед словом, которое уже имеет -er.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. -er: cheaper, faster, slower' : '3. -er: cheaper, faster, slower'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Багато коротких слів у цьому уроці отримують -er. Так англійська робить значення "більш": cheap → cheaper, fast → faster, slow → slower.'
        : 'Многие короткие слова в этом уроке получают -er. Так английский делает значение "более": cheap → cheaper, fast → faster, slow → slower.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайне слово' : 'Обычное слово', isUK ? 'Порівняння' : 'Сравнение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['cheap', 'cheaper', 'This is cheaper / This option is cheaper'],
        ['fast', 'faster', 'This way is faster'],
        ['slow', 'slower', 'That way is slower'],
        ['easy', 'easier', 'This question is easier / This app is easier'],
        ['hard', 'harder', 'That question is harder / That app is harder'],
        ['safe', 'safer', 'This place is safer'],
        ['cold', 'colder', 'This room is colder'],
        ['warm', 'warmer', 'That room is warmer'],
        ['light', 'lighter', 'This bag is lighter'],
        ['heavy', 'heavier', 'That bag is heavier'],
        ['new', 'newer', 'This phone is newer'],
        ['old', 'older', 'That phone is older'],
        ['short', 'shorter', 'This lesson is shorter'],
        ['long', 'longer', 'That lesson is longer'],
        ['clear', 'clearer', 'This answer is clearer'],
      ]}
    />,

    <Warn key="w2" t={t} f={f} text={isUK ? '❌ more faster → ✅ faster. Faster уже означає "швидше".' : '❌ more faster → ✅ faster. Faster уже означает "быстрее".'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. More + слово: more expensive, more dangerous' : '4. More + слово: more expensive, more dangerous'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Довші слова частіше не отримують -er. Перед ними ставиться more: more expensive, more interesting, more important, more dangerous, more confusing.'
        : 'Более длинные слова чаще не получают -er. Перед ними ставится more: more expensive, more interesting, more important, more dangerous, more confusing.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока', isUK ? 'Переклад' : 'Перевод'],
        ['more expensive', 'This is more expensive / This option is more expensive', isUK ? 'дорожче' : 'дороже'],
        ['more serious', 'He looks more serious today', isUK ? 'серйознішим' : 'серьёзнее'],
        ['more interesting', 'This job is more interesting', isUK ? 'цікавіша' : 'интереснее'],
        ['more important', 'This work is more important', isUK ? 'важливіша' : 'важнее'],
        ['more dangerous', 'That place is more dangerous', isUK ? 'небезпечніше' : 'опаснее'],
        ['more confusing', 'That answer is more confusing', isUK ? 'більш заплутана' : 'более запутанный'],
      ]}
    />,

    <Warn key="w3" t={t} f={f} text={isUK ? '❌ expensiver → ✅ more expensive. Expensive занадто довге для простої форми з -er.' : '❌ expensiver → ✅ more expensive. Expensive слишком длинное для простой формы с -er.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Better і worse — неправильні форми' : '5. Better и worse - неправильные формы'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Good і bad не стають gooder або badder. У них є особливі форми: better і worse.'
        : 'Good и bad не становятся gooder или badder. У них есть особые формы: better и worse.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайна форма' : 'Обычная форма', isUK ? 'Порівняльна форма' : 'Сравнительная форма', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['good', 'better', 'It is better now / This plan is better / We need a better plan'],
        ['bad', 'worse', 'It is worse now / This plan is worse / He feels worse today'],
      ]}
    />,

    <Warn key="w4" t={t} f={f} text={isUK ? '❌ more good → ✅ better. Better уже означає "краще".' : '❌ more good → ✅ better. Better уже означает "лучше".'} />,
    <Warn key="w5" t={t} f={f} text={isUK ? '❌ badder → ✅ worse. Для "гірше / хуже" використовуй worse.' : '❌ badder → ✅ worse. Для "хуже" используй worse.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Looks і feels з порівнянням' : '6. Looks и feels со сравнением'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці порівняння може стояти після looks і feels. Looks описує зовнішній вигляд. Feels описує самопочуття.'
        : 'В этом уроке сравнение может стоять после looks и feels. Looks описывает внешний вид. Feels описывает самочувствие.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['She looks happier today', isUK ? 'Вона сьогодні виглядає щасливішою' : 'Она сегодня выглядит счастливее'],
        ['He looks more serious today', isUK ? 'Він сьогодні виглядає серйознішим' : 'Он сегодня выглядит серьёзнее'],
        ['I feel much better today', isUK ? 'Сьогодні я почуваюся набагато краще' : 'Я сегодня чувствую себя намного лучше'],
        ['He feels worse today', isUK ? 'Він сьогодні почувається гірше' : 'Он сегодня чувствует себя хуже'],
      ]}
    />,

    <Tip key="tip2" t={t} f={f} text={isUK ? 'Look тут означає "виглядати", а feel - "почуватися".' : 'Look здесь означает "выглядеть", а feel - "чувствовать себя".'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Much better = набагато краще' : '7. Much better = намного лучше'} />,

    <Body key="b7a" t={t} f={f} text={isUK ? 'Much перед порівняльною формою підсилює різницю. I feel much better today означає не просто "краще", а "набагато краще".' : 'Much перед сравнительной формой усиливает разницу. I feel much better today означает не просто "лучше", а "намного лучше".'} />,
    <Example key="e1" t={t} f={f} eng="I feel much better today" rus={isUK ? 'Сьогодні я почуваюся набагато краще' : 'Я сегодня чувствую себя намного лучше'} />,
    <Warn key="w6" t={t} f={f} text={isUK ? '❌ I feel very better → ✅ I feel much better. З порівняльною формою better використовуй much.' : '❌ I feel very better → ✅ I feel much better. Со сравнительной формой better используй much.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Найвищий ступінь: the best, the cheapest' : '8. Превосходная степень: the best, the cheapest'} />,

    <Body key="b8a" t={t} f={f} text={isUK ? 'Коли ми говоримо не просто "краще", а "найкращий серед усіх", потрібен найвищий ступінь. У цьому уроці він часто починається з the.' : 'Когда мы говорим не просто "лучше", а "лучший среди всех", нужна превосходная степень. В этом уроке она часто начинается с the.'} />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Порівняння' : 'Сравнение', isUK ? 'Найвищий ступінь' : 'Превосходная степень', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['better', 'the best', 'This is the best option'],
        ['worse', 'the worst', 'This is the worst option'],
        ['cheaper', 'the cheapest', 'This is the cheapest ticket'],
        ['more expensive', 'the most expensive', 'This is the most expensive ticket'],
        ['faster', 'the fastest', 'This is the fastest way'],
        ['slower', 'the slowest', 'This is the slowest way'],
        ['easier', 'the easiest', 'This is the easiest question'],
        ['harder', 'the hardest', 'This is the hardest question'],
        ['safer', 'the safest', 'This is the safest place'],
        ['more dangerous', 'the most dangerous', 'This is the most dangerous place'],
      ]}
    />,

    <Warn key="w7" t={t} f={f} text={isUK ? '❌ This is best option → ✅ This is the best option. У цій моделі потрібне the.' : '❌ This is best option → ✅ This is the best option. В этой модели нужен the.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. The + -est' : '9. The + -est'} />,

    <Body key="b9a" t={t} f={f} text={isUK ? 'Для коротких слів найвищий ступінь часто робиться через the + -est: cheapest, fastest, slowest, easiest, hardest, safest.' : 'Для коротких слов превосходная степень часто делается через the + -est: cheapest, fastest, slowest, easiest, hardest, safest.'} />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока', isUK ? 'Переклад' : 'Перевод'],
        ['the cheapest', 'This is the cheapest ticket', isUK ? 'найдешевший квиток' : 'самый дешёвый билет'],
        ['the fastest', 'This is the fastest way', isUK ? 'найшвидший спосіб' : 'самый быстрый способ'],
        ['the slowest', 'This is the slowest way', isUK ? 'найповільніший спосіб' : 'самый медленный способ'],
        ['the easiest', 'This is the easiest question', isUK ? 'найпростіше питання' : 'самый простой вопрос'],
        ['the hardest', 'This is the hardest question', isUK ? 'найскладніше питання' : 'самый сложный вопрос'],
        ['the safest', 'This is the safest place', isUK ? 'найбезпечніше місце' : 'самое безопасное место'],
      ]}
    />,

    <Warn key="w8" t={t} f={f} text={isUK ? '❌ the most cheapest → ✅ the cheapest. Не подвоюй найвищий ступінь.' : '❌ the most cheapest → ✅ the cheapest. Не удваивай превосходную степень.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. The most + слово' : '10. The most + слово'} />,

    <Body key="b10a" t={t} f={f} text={isUK ? 'Для довших слів найвищий ступінь часто робиться через the most + слово: the most expensive, the most dangerous.' : 'Для более длинных слов превосходная степень часто делается через the most + слово: the most expensive, the most dangerous.'} />,

    <Table key="t9" t={t} f={f} rows={[
      [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока', isUK ? 'Переклад' : 'Перевод'],
      ['the most expensive', 'This is the most expensive ticket', isUK ? 'найдорожчий квиток' : 'самый дорогой билет'],
      ['the most dangerous', 'This is the most dangerous place', isUK ? 'найнебезпечніше місце' : 'самое опасное место'],
    ]} />,

    <Warn key="w9" t={t} f={f} text={isUK ? '❌ the expensivest ticket → ✅ the most expensive ticket. Для expensive потрібна модель the most.' : '❌ the expensivest ticket → ✅ the most expensive ticket. Для expensive нужна модель the most.'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Faster і more slowly після дії' : '11. Faster и more slowly после действия'} />,

    <Body key="b11a" t={t} f={f} text={isUK ? 'Порівняння може описувати не тільки предмет, а й те, як хтось діє. У цьому уроці є works faster і work more slowly.' : 'Сравнение может описывать не только предмет, но и то, как кто-то действует. В этом уроке есть works faster и work more slowly.'} />,

    <Table key="t10" t={t} f={f} rows={[
      [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що описує' : 'Что описывает', isUK ? 'Переклад' : 'Перевод'],
      ['She works faster now', isUK ? 'як вона працює' : 'как она работает', isUK ? 'Вона зараз працює швидше' : 'Она сейчас работает быстрее'],
      ['They work more slowly now', isUK ? 'як вони працюють' : 'как они работают', isUK ? 'Вони зараз працюють повільніше' : 'Они сейчас работают медленнее'],
    ]} />,

    <Tip key="tip3" t={t} f={f} text={isUK ? 'Faster тут відповідає на питання "як працює?", а не "яка вона?".' : 'Faster здесь отвечает на вопрос "как работает?", а не "какая она?".'} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Better / easier / newer перед іменником' : '12. Better / easier / newer перед существительным'} />,

    <Body key="b12a" t={t} f={f} text={isUK ? 'Порівняльна форма може стояти перед іменником: a better plan, an easier question, a newer phone, a better job.' : 'Сравнительная форма может стоять перед существительным: a better plan, an easier question, a newer phone, a better job.'} />,

    <Table key="t11" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад з уроку' : 'Пример из урока', isUK ? 'Переклад' : 'Перевод'],
      ['a better plan', 'We need a better plan', isUK ? 'Нам потрібен кращий план' : 'Нам нужен план получше'],
      ['an easier question', 'You need an easier question', isUK ? 'Тобі потрібне простіше питання' : 'Тебе нужен вопрос проще'],
      ['a newer phone', 'She bought a newer phone', isUK ? 'Вона купила новіший телефон' : 'Она купила более новый телефон'],
      ['a better job', 'He got a better job', isUK ? 'Він отримав кращу роботу' : 'Он получил работу лучше'],
    ]} />,

    <Warn key="w10" t={t} f={f} text={isUK ? '❌ You need a easier question → ✅ You need an easier question. Перед easier потрібне an, бо слово починається з голосного звуку.' : '❌ You need a easier question → ✅ You need an easier question. Перед easier нужно an, потому что слово начинается с гласного звука.'} />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Порівняння в минулому: chose, found, bought, got' : '13. Сравнение в прошлом: chose, found, bought, got'} />,

    <Body key="b13a" t={t} f={f} text={isUK ? 'У кінці уроку порівняння з\'являється всередині Past Simple. Дія вже сталася: вибрали, знайшли, купила, отримав.' : 'В конце урока сравнение появляется внутри Past Simple. Действие уже произошло: выбрали, нашли, купила, получил.'} />,

    <Table key="t12" t={t} f={f} rows={[
      [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо' : 'Что важно'],
      ['They chose the best option', isUK ? 'chose = вибрали, the best option = найкращий варіант' : 'chose = выбрали, the best option = лучший вариант'],
      ['We found the cheapest tickets', isUK ? 'found = знайшли, the cheapest tickets = найдешевші квитки' : 'found = нашли, the cheapest tickets = самые дешёвые билеты'],
      ['She bought a newer phone', isUK ? 'bought = купила, a newer phone = новіший телефон' : 'bought = купила, a newer phone = более новый телефон'],
      ['He got a better job', isUK ? 'got = отримав, a better job = кращу роботу' : 'got = получил, a better job = работу лучше'],
    ]} />,

    <Warn key="w11" t={t} f={f} text={isUK ? '❌ They choosed the best option → ✅ They chose the best option. Choose у минулому стає chose.' : '❌ They choosed the best option → ✅ They chose the best option. Choose в прошлом становится chose.'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ We finded the cheapest tickets → ✅ We found the cheapest tickets. Find у минулому стає found.' : '❌ We finded the cheapest tickets → ✅ We found the cheapest tickets. Find в прошлом становится found.'} />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. This і that у порівнянні' : '14. This и that в сравнении'} />,

    <Body key="b14a" t={t} f={f} text={isUK ? 'У багатьох фразах уроку є this і that. This зазвичай вказує на "цей / це", that - на "той / та". Так зручно порівнювати два варіанти.' : 'Во многих фразах урока есть this и that. This обычно указывает на "этот / это", that - на "тот / та". Так удобно сравнивать два варианта.'} />,

    <Table key="t13" t={t} f={f} rows={[
      ['this', 'that'],
      ['This option is cheaper', 'That way is slower'],
      ['This question is easier', 'That question is harder'],
      ['This place is safer', 'That place is more dangerous'],
      ['This room is colder', 'That room is warmer'],
      ['This bag is lighter', 'That bag is heavier'],
      ['This phone is newer', 'That phone is older'],
      ['This answer is clearer', 'That answer is more confusing'],
    ]} />,

    <Tip key="tip4" t={t} f={f} text={isUK ? 'This і that не змінюють граматику порівняння. Вони просто показують, про який предмет ти говориш.' : 'This и that не меняют грамматику сравнения. Они просто показывают, о каком предмете ты говоришь.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Готові блоки з уроку' : '15. Готовые блоки из урока'} />,

    <Body key="b15a" t={t} f={f} text={isUK ? 'У цьому уроці краще впізнавати порівняння готовими блоками, а не окремими словами.' : 'В этом уроке лучше узнавать сравнение готовыми блоками, а не отдельными словами.'} />,

    <Table key="t14" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['cheaper', isUK ? 'дешевше' : 'дешевле', 'This is cheaper'],
      ['more expensive', isUK ? 'дорожче' : 'дороже', 'This is more expensive'],
      ['better now', isUK ? 'краще зараз' : 'лучше сейчас', 'It is better now'],
      ['worse now', isUK ? 'гірше зараз' : 'хуже сейчас', 'It is worse now'],
      ['looks happier', isUK ? 'виглядає щасливішою' : 'выглядит счастливее', 'She looks happier today'],
      ['looks more serious', isUK ? 'виглядає серйознішим' : 'выглядит серьёзнее', 'He looks more serious today'],
      ['more interesting', isUK ? 'цікавіша' : 'интереснее', 'This job is more interesting'],
      ['more important', isUK ? 'важливіша' : 'важнее', 'This work is more important'],
      ['more dangerous', isUK ? 'небезпечніше' : 'опаснее', 'That place is more dangerous'],
      ['more confusing', isUK ? 'більш заплутана' : 'более запутанный', 'That answer is more confusing'],
    ]} />,

    <Table key="t15" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['the best option', isUK ? 'найкращий варіант' : 'лучший вариант', 'This is the best option / They chose the best option'],
      ['the worst option', isUK ? 'найгірший варіант' : 'худший вариант', 'This is the worst option'],
      ['the cheapest ticket', isUK ? 'найдешевший квиток' : 'самый дешёвый билет', 'This is the cheapest ticket'],
      ['the most expensive ticket', isUK ? 'найдорожчий квиток' : 'самый дорогой билет', 'This is the most expensive ticket'],
      ['the fastest way', isUK ? 'найшвидший спосіб' : 'самый быстрый способ', 'This is the fastest way'],
      ['the slowest way', isUK ? 'найповільніший спосіб' : 'самый медленный способ', 'This is the slowest way'],
      ['the easiest question', isUK ? 'найпростіше питання' : 'самый простой вопрос', 'This is the easiest question'],
      ['the hardest question', isUK ? 'найскладніше питання' : 'самый сложный вопрос', 'This is the hardest question'],
      ['the safest place', isUK ? 'найбезпечніше місце' : 'самое безопасное место', 'This is the safest place'],
      ['the most dangerous place', isUK ? 'найнебезпечніше місце' : 'самое опасное место', 'This is the most dangerous place'],
    ]} />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Переклад не завжди дослівний' : '16. Перевод не всегда дословный'} />,

    <Body key="b16a" t={t} f={f} text={isUK ? 'Англійська форма може бути одна, а природний переклад українською або російською може звучати трохи інакше. Особливо це видно з better, worse, need і got.' : 'Английская форма может быть одна, а естественный перевод по-русски может звучать чуть иначе. Особенно это видно с better, worse, need и got.'} />,

    <Table key="t16" t={t} f={f} rows={[
      [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
      ['It is better now', isUK ? 'Зараз краще' : 'Сейчас лучше'],
      ['It is worse now', isUK ? 'Зараз гірше' : 'Сейчас хуже'],
      ['We need a better plan', isUK ? 'Нам потрібен кращий план' : 'Нам нужен план получше'],
      ['You need an easier question', isUK ? 'Тобі потрібне простіше питання' : 'Тебе нужен вопрос проще'],
      ['He got a better job', isUK ? 'Він отримав кращу роботу' : 'Он получил работу лучше'],
      ['They work more slowly now', isUK ? 'Вони зараз працюють повільніше' : 'Они сейчас работают медленнее'],
    ]} />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Найчастіші помилки' : '17. Самые частые ошибки'} />,

    <Warn key="w13" t={t} f={f} text={isUK ? '❌ more cheaper → ✅ cheaper. Не використовуй more разом з -er.' : '❌ more cheaper → ✅ cheaper. Не используй more вместе с -er.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ more better → ✅ better. Better уже означає "краще".' : '❌ more better → ✅ better. Better уже означает "лучше".'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ gooder → ✅ better. Good має неправильну форму better.' : '❌ gooder → ✅ better. Good имеет неправильную форму better.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ badder → ✅ worse. Bad має неправильну форму worse.' : '❌ badder → ✅ worse. Bad имеет неправильную форму worse.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ the most cheapest → ✅ the cheapest. Не подвоюй найвищий ступінь.' : '❌ the most cheapest → ✅ the cheapest. Не удваивай превосходную степень.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ This is best option → ✅ This is the best option. У найвищому ступені потрібне the.' : '❌ This is best option → ✅ This is the best option. В превосходной степени нужен the.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ This is the most dangerousest place → ✅ This is the most dangerous place. Не додавай -est до слова після most.' : '❌ This is the most dangerousest place → ✅ This is the most dangerous place. Не добавляй -est к слову после most.'} />,
    <Warn key="w20" t={t} f={f} text={isUK ? '❌ You need a easier question → ✅ You need an easier question. Перед easier потрібне an.' : '❌ You need a easier question → ✅ You need an easier question. Перед easier нужно an.'} />,
    <Warn key="w21" t={t} f={f} text={isUK ? '❌ They work slowlier now → ✅ They work more slowly now. Для slowly використовуй more slowly.' : '❌ They work slowlier now → ✅ They work more slowly now. Для slowly используй more slowly.'} />,
    <Warn key="w22" t={t} f={f} text={isUK ? '❌ She bought a more newer phone → ✅ She bought a newer phone. Newer уже означає "більш новий".' : '❌ She bought a more newer phone → ✅ She bought a newer phone. Newer уже означает "более новый".'} />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Що треба винести з уроку' : '18. Что нужно вынести из урока'} />,

    <Body key="b18a" t={t} f={f} text={isUK ? 'У цьому уроці ти вчишся порівнювати. Для коротких слів часто використовуй -er: cheaper, faster, easier. Для довших слів використовуй more: more expensive, more dangerous. Для найвищого ступеня використовуй the: the best, the cheapest, the most expensive. Better і worse - неправильні форми.' : 'В этом уроке ты учишься сравнивать. Для коротких слов часто используй -er: cheaper, faster, easier. Для более длинных слов используй more: more expensive, more dangerous. Для превосходной степени используй the: the best, the cheapest, the most expensive. Better и worse - неправильные формы.'} />,

    <Tip key="tip5" t={t} f={f} text={isUK ? 'Перед практикою тримай три моделі: This is cheaper. This is more expensive. This is the best option.' : 'Перед практикой держи три модели: This is cheaper. This is more expensive. This is the best option.'} />,
  ],
},
// ── УРОК 15 ──────────────────────────────────────────────────
15: {
  titleRU: 'Притяжательные формы: my и mine',
  titleUK: 'Присвійні форми: my і mine',
  titlePtBr: "Formas possessivas: my e mine",
  titleVi: "Dạng sở hữu: my và mine",
  titleId: "Bentuk kepemilikan: my dan mine",
  titleTr: "İyelik biçimleri: my ve mine",
  titlePl: "Formy dzierżawcze: my i mine",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити, кому належить річ: мій телефон, твоя сумка, його ключ, її квиток, наша кімната, їхня машина. В англійській для цього є дві групи форм: my phone і the phone is mine.'
        : 'В этом уроке ты учишься говорить, кому принадлежит вещь: мой телефон, твоя сумка, его ключ, её билет, наша комната, их машина. В английском для этого есть две группы форм: my phone и the phone is mine.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Перед річчю' : 'Перед вещью', isUK ? 'Самостійно' : 'Самостоятельно'],
        ['my phone', 'This phone is mine'],
        ['your bag', 'This bag is yours'],
        ['his key', 'This key is his'],
        ['her ticket', 'This ticket is hers'],
        ['our room', 'This room is ours'],
        ['their car', 'This car is theirs'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: my, your, his, her, our, their стоять перед іменником. Mine, yours, his, hers, ours, theirs стоять самостійно.'
        : 'Главная идея: my, your, his, her, our, their стоят перед существительным. Mine, yours, his, hers, ours, theirs стоят самостоятельно.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Дві форми: перед іменником і самостійно' : '2. Две формы: перед существительным и самостоятельно'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Якщо після присвійного слова одразу стоїть річ, використовуй коротку форму: my, your, his, her, our, their. Якщо річ уже названа раніше і повторювати її не треба, використовуй самостійну форму: mine, yours, his, hers, ours, theirs.'
        : 'Если после притяжательного слова сразу стоит вещь, используй короткую форму: my, your, his, her, our, their. Если вещь уже названа раньше и повторять её не нужно, используй самостоятельную форму: mine, yours, his, hers, ours, theirs.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Перед іменником' : 'Перед существительным', isUK ? 'Самостійно' : 'Самостоятельно'],
        ['my', 'mine'],
        ['your', 'yours'],
        ['his', 'his'],
        ['her', 'hers'],
        ['our', 'ours'],
        ['their', 'theirs'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is mine phone → ✅ This is my phone. Mine не ставиться перед іменником.'
        : '❌ This is mine phone → ✅ This is my phone. Mine не ставится перед существительным.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ This phone is my → ✅ This phone is mine. Якщо після слова немає іменника, потрібне mine.'
        : '❌ This phone is my → ✅ This phone is mine. Если после слова нет существительного, нужно mine.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Mine, yours, his, hers, ours, theirs' : '3. Mine, yours, his, hers, ours, theirs'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Ці форми стоять самостійно. Після них не треба повторювати phone, bag, key, ticket, room або car.'
        : 'Эти формы стоят самостоятельно. После них не нужно повторять phone, bag, key, ticket, room или car.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['This phone is mine', isUK ? 'Цей телефон мій' : 'Этот телефон мой'],
        ['This bag is yours', isUK ? 'Ця сумка твоя' : 'Эта сумка твоя'],
        ['This key is his', isUK ? 'Цей ключ його' : 'Этот ключ его'],
        ['This ticket is hers', isUK ? 'Цей квиток її' : 'Этот билет её'],
        ['This room is ours', isUK ? 'Ця кімната наша' : 'Эта комната наша'],
        ['This car is theirs', isUK ? 'Ця машина їхня' : 'Эта машина их'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'This phone is mine = цей телефон мій. Не треба казати mine phone, бо phone уже стоїть на початку фрази.'
        : 'This phone is mine = этот телефон мой. Не нужно говорить mine phone, потому что phone уже стоит в начале фразы.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. My, your, his, her, our, their перед річчю' : '4. My, your, his, her, our, their перед вещью'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Ці форми не можуть стояти самі. Після них має бути річ: my phone, your bag, his key, her ticket, our room, their car.'
        : 'Эти формы не могут стоять сами. После них должна быть вещь: my phone, your bag, his key, her ticket, our room, their car.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['This is my phone', isUK ? 'Це мій телефон' : 'Это мой телефон'],
        ['This is your bag', isUK ? 'Це твоя сумка' : 'Это твоя сумка'],
        ['This is his key', isUK ? 'Це його ключ' : 'Это его ключ'],
        ['This is her ticket', isUK ? 'Це її квиток' : 'Это её билет'],
        ['This is our room', isUK ? 'Це наша кімната' : 'Это наша комната'],
        ['This is their car', isUK ? 'Це їхня машина' : 'Это их машина'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is hers ticket → ✅ This is her ticket. Перед ticket потрібне her, не hers.'
        : '❌ This is hers ticket → ✅ This is her ticket. Перед ticket нужно her, не hers.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is theirs car → ✅ This is their car. Перед car потрібне their, не theirs.'
        : '❌ This is theirs car → ✅ This is their car. Перед car нужно their, не theirs.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. His — однакова форма' : '5. His - одинаковая форма'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'His — особлива форма. Вона однакова в обох типах: his key і This key is his.'
        : 'His - особая форма. Она одинаковая в обоих типах: his key и This key is his.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Перед річчю' : 'Перед вещью', isUK ? 'Самостійно' : 'Самостоятельно'],
        ['This is his key', 'This key is his'],
        ['His key is here', 'Is this key his?'],
        ['These documents are his', 'Are these books his?'],
      ]}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Не шукай форму "hiss". Її тут немає. His працює і перед іменником, і самостійно.'
        : 'Не ищи форму "hiss". Её тут нет. His работает и перед существительным, и самостоятельно.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Her і hers — не одне й те саме' : '6. Her и hers - не одно и то же'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Her стоїть перед іменником. Hers стоїть самостійно. Це одна з найчастіших помилок у цій темі.'
        : 'Her стоит перед существительным. Hers стоит самостоятельно. Это одна из самых частых ошибок в этой теме.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Перед річчю' : 'Перед вещью', isUK ? 'Самостійно' : 'Самостоятельно'],
        ['This is her ticket', 'This ticket is hers'],
        ['Her ticket is here', 'Is this ticket hers?'],
        ['', 'These messages are hers'],
        ['', 'Are these tickets hers?'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ This ticket is her → ✅ This ticket is hers. Якщо ticket уже названий, потрібне hers.'
        : '❌ This ticket is her → ✅ This ticket is hers. Если ticket уже назван, нужно hers.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. This і these' : '7. This и these'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці є this і these. This використовується для одного предмета. These використовується для кількох предметів.'
        : 'В этом уроке есть this и these. This используется для одного предмета. These используется для нескольких предметов.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один предмет' : 'Один предмет', isUK ? 'Кілька предметів' : 'Несколько предметов'],
        ['This phone is mine', 'These documents are his'],
        ['This bag is yours', 'These messages are hers'],
        ['This key is his', 'These books are ours'],
        ['This ticket is hers', 'These tickets are theirs'],
        ['This charger is mine', 'These keys are theirs'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ This documents are his → ✅ These documents are his. Documents - множина, тому these.'
        : '❌ This documents are his → ✅ These documents are his. Documents - множественное число, поэтому these.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ These phone is mine → ✅ This phone is mine. Phone тут один, тому this.'
        : '❌ These phone is mine → ✅ This phone is mine. Phone здесь один, поэтому this.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Is і are' : '8. Is и are'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'З одним предметом використовуй is. З кількома предметами використовуй are. Це працює і в твердженнях, і в питаннях.'
        : 'С одним предметом используй is. С несколькими предметами используй are. Это работает и в утверждениях, и в вопросах.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один предмет: is' : 'Один предмет: is', isUK ? 'Множина: are' : 'Множественное число: are'],
        ['This phone is mine', 'These documents are his'],
        ['This passport is yours', 'These messages are hers'],
        ['This answer is mine', 'These books are ours'],
        ['This question is yours', 'These tickets are theirs'],
        ['Is this phone mine?', 'Are these documents mine?'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ These books is ours → ✅ These books are ours. З множиною потрібне are.'
        : '❌ These books is ours → ✅ These books are ours. С множественным числом нужно are.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ This passport are yours → ✅ This passport is yours. Один passport бере is.'
        : '❌ This passport are yours → ✅ This passport is yours. Один passport берёт is.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Питання: Is this...? / Are these...?' : '9. Вопросы: Is this...? / Are these...?'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб зробити питання, перенеси is або are на початок. Для одного предмета: Is this...? Для кількох предметів: Are these...?'
        : 'Чтобы сделать вопрос, перенеси is или are в начало. Для одного предмета: Is this...? Для нескольких предметов: Are these...?'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Твердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['This phone is mine', 'Is this phone mine?'],
        ['This bag is yours', 'Is this bag yours?'],
        ['This key is his', 'Is this key his?'],
        ['This ticket is hers', 'Is this ticket hers?'],
        ['This room is ours', 'Is this room ours?'],
        ['This car is theirs', 'Is this car theirs?'],
      ]}
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Твердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['These documents are mine', 'Are these documents mine?'],
        ['These messages are yours', 'Are these messages yours?'],
        ['These books are his', 'Are these books his?'],
        ['These tickets are hers', 'Are these tickets hers?'],
        ['These bags are ours', 'Are these bags ours?'],
        ['These keys are theirs', 'Are these keys theirs?'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ This phone is mine? → ✅ Is this phone mine? Для нормального питання is виходить на початок.'
        : '❌ This phone is mine? → ✅ Is this phone mine? Для нормального вопроса is выходит в начало.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ Is these documents mine? → ✅ Are these documents mine? З these потрібне are.'
        : '❌ Is these documents mine? → ✅ Are these documents mine? С these нужно are.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Заперечення: not після is' : '10. Отрицание: not после is'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку заперечення робиться через not після is: This is not my phone, This phone is not mine.'
        : 'Во фразах урока отрицание делается через not после is: This is not my phone, This phone is not mine.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Перед іменником' : 'Перед существительным', isUK ? 'Самостійно' : 'Самостоятельно'],
        ['This is not my phone', 'This phone is not mine'],
        ['This is not your bag', 'This bag is not yours'],
        ['This is not his key', 'This key is not his'],
        ['This is not her ticket', 'This ticket is not hers'],
        ['This is not our room', 'This room is not ours'],
        ['This is not their car', 'This car is not theirs'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ This not my phone → ✅ This is not my phone. У запереченні все одно потрібне is.'
        : '❌ This not my phone → ✅ This is not my phone. В отрицании всё равно нужно is.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ This phone not mine → ✅ This phone is not mine. Not ставиться після is.'
        : '❌ This phone not mine → ✅ This phone is not mine. Not ставится после is.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. My phone is here / Our room is ready' : '11. My phone is here / Our room is ready'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Присвійна форма може стояти на початку фрази разом з річчю: My phone, Your bag, His key, Her ticket. Потім іде is або are та опис.'
        : 'Притяжательная форма может стоять в начале фразы вместе с вещью: My phone, Your bag, His key, Her ticket. Потом идёт is или are и описание.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['My phone is here', isUK ? 'Мій телефон тут' : 'Мой телефон здесь'],
        ['Your bag is here', isUK ? 'Твоя сумка тут' : 'Твоя сумка здесь'],
        ['His key is here', isUK ? 'Його ключ тут' : 'Его ключ здесь'],
        ['Her ticket is here', isUK ? 'Її квиток тут' : 'Её билет здесь'],
        ['Our room is ready', isUK ? 'Наша кімната готова' : 'Наша комната готова'],
        ['Their car is outside', isUK ? 'Їхня машина надворі' : 'Их машина снаружи'],
      ]}
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'My phone is here = мій телефон тут. This phone is mine = цей телефон мій. Схоже значення, але інша структура.'
        : 'My phone is here = мой телефон здесь. This phone is mine = этот телефон мой. Значение похоже, но структура другая.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Предмети з уроку' : '12. Предметы из урока'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок спеціально повторює одні й ті самі предмети, щоб ти тренував не словник, а саме присвійні форми.'
        : 'Урок специально повторяет одни и те же предметы, чтобы ты тренировал не словарь, а именно притяжательные формы.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один предмет' : 'Один предмет', isUK ? 'Кілька предметів' : 'Несколько предметов'],
        ['phone', 'documents'],
        ['bag', 'messages'],
        ['key', 'books'],
        ['ticket', 'tickets'],
        ['room', 'bags'],
        ['car', 'keys'],
        ['charger', ''],
        ['passport', ''],
        ['answer', ''],
        ['question', ''],
      ]}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Готові блоки з уроку' : '13. Готовые блоки из урока'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці краще впізнавати не окремі слова, а готові блоки: is mine, is yours, are his, are hers, is not mine.'
        : 'В этом уроке лучше узнавать не отдельные слова, а готовые блоки: is mine, is yours, are his, are hers, is not mine.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['is mine', isUK ? 'мій / моя / моє' : 'мой / моя / моё', 'This phone is mine / This charger is mine / This answer is mine'],
        ['is yours', isUK ? 'твій / твоя / твоє' : 'твой / твоя / твоё', 'This bag is yours / This passport is yours / This question is yours'],
        ['is his', isUK ? 'його' : 'его', 'This key is his'],
        ['is hers', isUK ? 'її' : 'её', 'This ticket is hers'],
        ['is ours', isUK ? 'наш / наша / наше' : 'наш / наша / наше', 'This room is ours'],
        ['is theirs', isUK ? 'їхній / їхня' : 'их', 'This car is theirs'],
        ['are his', isUK ? 'його' : 'его', 'These documents are his / These books are his'],
        ['are hers', isUK ? 'її' : 'её', 'These messages are hers / These tickets are hers'],
        ['are ours', isUK ? 'наші' : 'наши', 'These books are ours / These bags are ours'],
        ['are theirs', isUK ? 'їхні' : 'их', 'These tickets are theirs / These keys are theirs'],
      ]}
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Переклад не завжди дослівний' : '14. Перевод не всегда дословный'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'В англійській є різниця між my phone і mine, але українською або російською обидві конструкції часто звучать дуже схоже: "мій телефон" і "телефон мій".'
        : 'В английском есть разница между my phone и mine, но по-русски обе конструкции часто звучат очень похоже: "мой телефон" и "телефон мой".'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['This is my phone', isUK ? 'Це мій телефон' : 'Это мой телефон'],
        ['This phone is mine', isUK ? 'Цей телефон мій' : 'Этот телефон мой'],
        ['This is her ticket', isUK ? 'Це її квиток' : 'Это её билет'],
        ['This ticket is hers', isUK ? 'Цей квиток її' : 'Этот билет её'],
        ['This is their car', isUK ? 'Це їхня машина' : 'Это их машина'],
        ['This car is theirs', isUK ? 'Ця машина їхня' : 'Эта машина их'],
      ]}
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Не плутай this is my і this is mine' : '15. Не путай this is my и this is mine'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'This is my... завжди потребує річ після my. This is mine може стояти самостійно, але в цьому уроці частіше використовується модель This phone is mine.'
        : 'This is my... всегда требует вещь после my. This is mine может стоять самостоятельно, но в этом уроке чаще используется модель This phone is mine.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Неповно / помилка' : 'Неполно / ошибка', isUK ? 'Правильно' : 'Правильно'],
        ['This is my', 'This is my phone'],
        ['This is your', 'This is your bag'],
        ['This is her', 'This is her ticket'],
        ['This is their', 'This is their car'],
        ['This phone is my', 'This phone is mine'],
        ['This bag is your', 'This bag is yours'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Найчастіші помилки' : '16. Самые частые ошибки'} />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is mine phone → ✅ This is my phone. Перед phone потрібне my.'
        : '❌ This is mine phone → ✅ This is my phone. Перед phone нужно my.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ This phone is my → ✅ This phone is mine. Самостійна форма - mine.'
        : '❌ This phone is my → ✅ This phone is mine. Самостоятельная форма - mine.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is yours bag → ✅ This is your bag. Перед bag потрібне your.'
        : '❌ This is yours bag → ✅ This is your bag. Перед bag нужно your.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ This ticket is her → ✅ This ticket is hers. Самостійна форма - hers.'
        : '❌ This ticket is her → ✅ This ticket is hers. Самостоятельная форма - hers.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is theirs car → ✅ This is their car. Перед car потрібне their.'
        : '❌ This is theirs car → ✅ This is their car. Перед car нужно their.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ This car is their → ✅ This car is theirs. Самостійна форма - theirs.'
        : '❌ This car is their → ✅ This car is theirs. Самостоятельная форма - theirs.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ Is these bags ours? → ✅ Are these bags ours? З these потрібне are.'
        : '❌ Is these bags ours? → ✅ Are these bags ours? С these нужно are.'
      }
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ Are this room ours? → ✅ Is this room ours? Один room бере is.'
        : '❌ Are this room ours? → ✅ Is this room ours? Один room берёт is.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ This phone not mine → ✅ This phone is not mine. Потрібне is not.'
        : '❌ This phone not mine → ✅ This phone is not mine. Нужно is not.'
      }
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Що треба винести з уроку' : '17. Что нужно вынести из урока'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці головна різниця така: my, your, his, her, our, their стоять перед річчю. Mine, yours, his, hers, ours, theirs стоять самостійно. Для одного предмета використовуй this і is. Для кількох предметів використовуй these і are.'
        : 'В этом уроке главная разница такая: my, your, his, her, our, their стоят перед вещью. Mine, yours, his, hers, ours, theirs стоят самостоятельно. Для одного предмета используй this и is. Для нескольких предметов используй these и are.'
      }
    />,

    <Tip
      key="tip5"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: This is my phone. This phone is mine. Are these documents mine?'
        : 'Перед практикой держи три модели: This is my phone. This phone is mine. Are these documents mine?'
      }
    />,
  ],
},

// ── УРОК 16 ──────────────────────────────────────────────────
16: {
  titleRU: 'Фразовые глаголы',
  titleUK: 'Фразові дієслова',
  titlePtBr: "Phrasal verbs",
  titleVi: "Cụm động từ",
  titleId: "Phrasal verbs",
  titleTr: "Phrasal verbs",
  titlePl: "Czasowniki frazowe",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти тренуєш фразові дієслова. Це блоки з двох частин: wake up, get up, put on, take off, turn on, turn off, look for, clean up, throw away, give back, find out, go back. Часто значення такого блоку не можна нормально зрозуміти по одному слову.'
        : 'В этом уроке ты тренируешь фразовые глаголы. Это блоки из двух частей: wake up, get up, put on, take off, turn on, turn off, look for, clean up, throw away, give back, find out, go back. Часто значение такого блока нельзя нормально понять по одному слову.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Окремі слова' : 'Отдельные слова', isUK ? 'Готовий блок' : 'Готовый блок', isUK ? 'Значення' : 'Значение'],
        ['wake + up', 'wake up', isUK ? 'прокидатися' : 'просыпаться'],
        ['put + on', 'put on', isUK ? 'надягати' : 'надевать'],
        ['turn + off', 'turn off', isUK ? 'вимикати' : 'выключать'],
        ['find + out', 'find out', isUK ? 'дізнатися / з\'ясувати' : 'выяснить / узнать'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: не перекладай частинку up, on, off, back окремо. Вчи весь блок як одне значення.'
        : 'Главная идея: не переводи частицу up, on, off, back отдельно. Учи весь блок как одно значение.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Готові фразові дієслова уроку' : '2. Готовые фразовые глаголы урока'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Ось фразові дієслова, які реально є у фразах цього уроку. Саме їх треба впізнавати на слух і в практиці.'
        : 'Вот фразовые глаголы, которые реально есть во фразах этого урока. Именно их нужно узнавать на слух и в практике.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['wake up', isUK ? 'прокидатися' : 'просыпаться', 'I wake up early'],
        ['get up', isUK ? 'вставати з ліжка / підніматися' : 'вставать с кровати / подниматься', 'You get up late'],
        ['put on', isUK ? 'надягати' : 'надевать', 'He puts on glasses'],
        ['take off', isUK ? 'знімати' : 'снимать', 'She takes off glasses'],
        ['turn on', isUK ? 'вмикати' : 'включать', 'We turn on lights'],
        ['turn off', isUK ? 'вимикати' : 'выключать', 'They turn off lights'],
        ['look for', isUK ? 'шукати' : 'искать', 'I look for keys'],
        ['clean up', isUK ? 'прибирати' : 'убирать', 'You clean up rooms'],
        ['throw away', isUK ? 'викидати' : 'выбрасывать', 'He throws away papers'],
        ['give back', isUK ? 'повертати' : 'возвращать', 'She gives back tickets'],
        ['find out', isUK ? 'дізнатися / з\'ясувати' : 'выяснить / узнать', 'We find out facts'],
        ['go back', isUK ? 'повертатися назад' : 'возвращаться назад', 'They go back home'],
      ]}
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Up не завжди означає "вгору"' : '3. Up не всегда означает "вверх"'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'У wake up, get up і clean up частинка up не перекладається окремо як "вгору". Вона є частиною готового дієслова.'
        : 'В wake up, get up и clean up частица up не переводится отдельно как "вверх". Она является частью готового глагола.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I wake up early', isUK ? 'Я прокидаюся рано' : 'Я просыпаюсь рано'],
        ['You get up late', isUK ? 'Ти встаєш пізно' : 'Ты встаёшь поздно'],
        ['You clean up rooms', isUK ? 'Ти прибираєш кімнати' : 'Ты убираешь комнаты'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? 'Не перекладай wake up як "будити вгору". Wake up = прокидатися.'
        : 'Не переводи wake up как "будить вверх". Wake up = просыпаться.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. On і off: надягати, знімати, вмикати, вимикати' : '4. On и off: надевать, снимать, включать, выключать'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці on і off працюють у двох парах: put on / take off для речей на тілі, turn on / turn off для світла і телефонів.'
        : 'В этом уроке on и off работают в двух парах: put on / take off для вещей на теле, turn on / turn off для света и телефонов.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Пара' : 'Пара', isUK ? 'Що означає' : 'Что означает', isUK ? 'Приклади' : 'Примеры'],
        ['put on / take off', isUK ? 'надягати / знімати' : 'надевать / снимать', 'puts on glasses / takes off glasses / takes off shoes / put on a jacket'],
        ['turn on / turn off', isUK ? 'вмикати / вимикати' : 'включать / выключать', 'turn on lights / turn off lights / turn off phones'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ He puts glasses → ✅ He puts on glasses. У значенні "надягати" потрібен блок put on.'
        : '❌ He puts glasses → ✅ He puts on glasses. В значении "надевать" нужен блок put on.'
      }
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ We turn lights → ✅ We turn on lights. У значенні "включати" потрібен блок turn on.'
        : '❌ We turn lights → ✅ We turn on lights. В значении "включать" нужен блок turn on.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Back: назад / повернути' : '5. Back: назад / вернуть'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Back у цьому уроці пов\'язаний з поверненням: go back = повернутися, give back = повернути щось комусь.'
        : 'Back в этом уроке связан с возвращением: go back = вернуться, give back = вернуть что-то кому-то.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['go back', isUK ? 'повернутися назад' : 'вернуться назад', 'They go back home / You can go back later'],
        ['give back', isUK ? 'повернути річ' : 'вернуть вещь', 'She gives back tickets / He can give back a key'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Go back home = повернутися додому. Give back tickets = повернути квитки.'
        : 'Go back home = вернуться домой. Give back tickets = вернуть билеты.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Look for і find out — не одне й те саме' : '6. Look for и find out - не одно и то же'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Look for означає "шукати". Find out означає "дізнатися / з\'ясувати". Обидва пов\'язані з пошуком, але зміст різний.'
        : 'Look for означает "искать". Find out означает "выяснить / узнать". Оба связаны с поиском, но смысл разный.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Що шукаємо' : 'Что ищем', isUK ? 'Приклад' : 'Пример'],
        ['look for', isUK ? 'предмет / проблему' : 'предмет / проблему', 'I look for keys / I do not look for problems'],
        ['find out', isUK ? 'інформацію / факти' : 'информацию / факты', 'We find out facts / I can find out soon'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? 'Look for keys = шукати ключі. Find out facts = з\'ясувати факти. Не змішуй ці блоки.'
        : 'Look for keys = искать ключи. Find out facts = выяснить факты. Не смешивай эти блоки.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Present Simple: твердження з фразовими дієсловами' : '7. Present Simple: утверждения с фразовыми глаголами'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Перші фрази уроку — це звичайні твердження в Present Simple. З he і she основна частина дієслова отримує -s, а частинка залишається без змін.'
        : 'Первые фразы урока - это обычные утверждения в Present Simple. С he и she основная часть глагола получает -s, а частица остаётся без изменений.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо' : 'Что важно'],
        ['I', 'I wake up early', isUK ? 'wake без -s' : 'wake без -s'],
        ['You', 'You get up late', isUK ? 'get без -s' : 'get без -s'],
        ['He', 'He puts on glasses', isUK ? 'put → puts' : 'put → puts'],
        ['She', 'She takes off glasses', isUK ? 'take → takes' : 'take → takes'],
        ['We', 'We turn on lights', isUK ? 'turn без -s' : 'turn без -s'],
        ['They', 'They turn off lights', isUK ? 'turn без -s' : 'turn без -s'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ He put on glasses → ✅ He puts on glasses. З he у Present Simple потрібне -s.'
        : '❌ He put on glasses → ✅ He puts on glasses. С he в Present Simple нужно -s.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Питання: Do / Does + фразове дієслово' : '8. Вопросы: Do / Does + фразовый глагол'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У питаннях фразове дієслово залишається блоком, але допоміжне do або does виходить на початок. Після does основна дія без -s.'
        : 'В вопросах фразовый глагол остаётся блоком, но вспомогательное do или does выходит в начало. После does основное действие без -s.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Твердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['You wake up early', 'Do you wake up early?'],
        ['He gets up late', 'Does he get up late?'],
        ['She puts on glasses', 'Does she put on glasses?'],
        ['They take off shoes', 'Do they take off shoes?'],
        ['We turn on lights', 'Do we turn on lights?'],
        ['He looks for keys', 'Does he look for keys?'],
        ['They clean up rooms', 'Do they clean up rooms?'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ Does she puts on glasses? → ✅ Does she put on glasses? Після Does дія без -s.'
        : '❌ Does she puts on glasses? → ✅ Does she put on glasses? После Does действие без -s.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ Does he looks for keys? → ✅ Does he look for keys? Після Does використовуємо look, не looks.'
        : '❌ Does he looks for keys? → ✅ Does he look for keys? После Does используем look, не looks.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Заперечення: do not / does not + фразове дієслово' : '9. Отрицание: do not / does not + фразовый глагол'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'У запереченні do not або does not ставиться перед фразовим дієсловом. Після does not основна дія також іде без -s.'
        : 'В отрицании do not или does not ставится перед фразовым глаголом. После does not основное действие тоже идёт без -s.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Заперечення' : 'Отрицание', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['I', 'do not', 'I do not wake up late / I do not look for problems'],
        ['You', 'do not', 'You do not get up early / You do not throw away documents'],
        ['We', 'do not', 'We do not turn on lights'],
        ['They', 'do not', 'They do not turn off phones'],
        ['He', 'does not', 'He does not put on glasses / He does not give back money'],
        ['She', 'does not', 'She does not take off shoes / She does not find out facts'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ He does not puts on glasses → ✅ He does not put on glasses. Після does not дія без -s.'
        : '❌ He does not puts on glasses → ✅ He does not put on glasses. После does not действие без -s.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Should + фразове дієслово' : '10. Should + фразовый глагол'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Should означає "варто / слід". Після should фразове дієслово стоїть у базовій формі: should wake up, should get up, should put on.'
        : 'Should означает "стоит / следует". После should фразовый глагол стоит в базовой форме: should wake up, should get up, should put on.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['We should wake up early', isUK ? 'Нам слід прокидатися рано' : 'Нам стоит просыпаться рано'],
        ['You should get up now', isUK ? 'Тобі слід вставати зараз' : 'Тебе стоит встать сейчас'],
        ['He should put on a jacket', isUK ? 'Йому слід надягти куртку' : 'Ему стоит надеть куртку'],
        ['She should take off shoes', isUK ? 'Їй слід зняти взуття' : 'Ей стоит снять обувь'],
        ['We should turn off phones', isUK ? 'Нам слід вимкнути телефони' : 'Нам стоит выключить телефоны'],
        ['They should clean up rooms', isUK ? 'Їм слід прибрати кімнати' : 'Им стоит убрать комнаты'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ He should puts on a jacket → ✅ He should put on a jacket. Після should дія без -s.'
        : '❌ He should puts on a jacket → ✅ He should put on a jacket. После should действие без -s.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Can + фразове дієслово' : '11. Can + фразовый глагол'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Can означає "можу / можеш / може". Після can фразове дієслово теж стоїть у базовій формі.'
        : 'Can означает "могу / можешь / может". После can фразовый глагол тоже стоит в базовой форме.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I can find out soon', isUK ? 'Я можу скоро дізнатися' : 'Я могу скоро выяснить'],
        ['You can go back later', isUK ? 'Ти можеш повернутися пізніше' : 'Ты можешь вернуться позже'],
        ['He can give back a key', isUK ? 'Він може повернути ключ' : 'Он может вернуть ключ'],
        ['She can throw away papers', isUK ? 'Вона може викинути папери' : 'Она может выбросить бумаги'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ He can gives back a key → ✅ He can give back a key. Після can дія без -s.'
        : '❌ He can gives back a key → ✅ He can give back a key. После can действие без -s.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Past Simple: фразове дієслово в минулому' : '12. Past Simple: фразовый глагол в прошлом'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У кінці уроку фразові дієслова переходять у минулий час. Змінюється перша частина дієслова, а частинка up / on / off / for / back / out залишається на місці.'
        : 'В конце урока фразовые глаголы переходят в прошедшее время. Меняется первая часть глагола, а частица up / on / off / for / back / out остаётся на месте.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['wake up', 'woke up', 'I woke up early yesterday'],
        ['get up', 'got up', 'You got up late yesterday'],
        ['put on', 'put on', 'He put on glasses yesterday'],
        ['take off', 'took off', 'She took off shoes yesterday'],
        ['turn on', 'turned on', 'We turned on lights at night'],
        ['turn off', 'turned off', 'They turned off phones at noon'],
        ['look for', 'looked for', 'I looked for keys this morning'],
        ['clean up', 'cleaned up', 'We cleaned up rooms yesterday'],
        ['give back', 'gave back', 'She gave back tickets last week'],
        ['find out', 'found out', 'They found out yesterday'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ I waked up early → ✅ I woke up early. Wake у минулому стає woke.'
        : '❌ I waked up early → ✅ I woke up early. Wake в прошлом становится woke.'
      }
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ You getted up late → ✅ You got up late. Get у минулому стає got.'
        : '❌ You getted up late → ✅ You got up late. Get в прошлом становится got.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Об\'єкт після фразового дієслова' : '13. Объект после фразового глагола'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку після фразового дієслова часто стоїть предмет: glasses, shoes, lights, phones, keys, rooms, papers, tickets, facts, money, documents, a key.'
        : 'Во фразах урока после фразового глагола часто стоит предмет: glasses, shoes, lights, phones, keys, rooms, papers, tickets, facts, money, documents, a key.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фразове дієслово' : 'Фразовый глагол', isUK ? 'Об\'єкт' : 'Объект', isUK ? 'Приклад' : 'Пример'],
        ['put on', 'glasses / a jacket', 'He puts on glasses / He should put on a jacket'],
        ['take off', 'glasses / shoes', 'She takes off glasses / She should take off shoes'],
        ['turn on', 'lights', 'We turn on lights'],
        ['turn off', 'lights / phones', 'They turn off lights / We should turn off phones'],
        ['look for', 'keys / problems', 'I look for keys / I do not look for problems'],
        ['clean up', 'rooms', 'You clean up rooms'],
        ['throw away', 'papers / documents', 'He throws away papers / You do not throw away documents'],
        ['give back', 'tickets / money / a key', 'She gives back tickets / He does not give back money'],
        ['find out', 'facts', 'We find out facts / She does not find out facts'],
      ]}
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Early, late, now, soon, later' : '14. Early, late, now, soon, later'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці є короткі слова часу, які часто стоять після фразового дієслова або в кінці фрази.'
        : 'В этом уроке есть короткие слова времени, которые часто стоят после фразового глагола или в конце фразы.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['early', isUK ? 'рано' : 'рано', 'I wake up early / We should wake up early / I woke up early yesterday'],
        ['late', isUK ? 'пізно' : 'поздно', 'You get up late / Does he get up late? / You got up late yesterday'],
        ['now', isUK ? 'зараз' : 'сейчас', 'You should get up now'],
        ['soon', isUK ? 'скоро' : 'скоро', 'I can find out soon'],
        ['later', isUK ? 'пізніше' : 'позже', 'You can go back later'],
        ['yesterday', isUK ? 'вчора' : 'вчера', 'I woke up early yesterday'],
        ['this morning', isUK ? 'сьогодні вранці' : 'сегодня утром', 'I looked for keys this morning'],
        ['last week', isUK ? 'минулого тижня' : 'на прошлой неделе', 'She gave back tickets last week'],
        ['at night', isUK ? 'вночі' : 'ночью', 'We turned on lights at night'],
        ['at noon', isUK ? 'опівдні' : 'в полдень', 'They turned off phones at noon'],
      ]}
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Переклад не завжди дослівний' : '15. Перевод не всегда дословный'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'Фразові дієслова майже ніколи не треба перекладати по частинах. Їх треба перекладати як готові смислові блоки.'
        : 'Фразовые глаголы почти никогда не нужно переводить по частям. Их нужно переводить как готовые смысловые блоки.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I wake up early', isUK ? 'Я прокидаюся рано' : 'Я просыпаюсь рано'],
        ['You get up late', isUK ? 'Ти встаєш пізно' : 'Ты встаёшь поздно'],
        ['He puts on glasses', isUK ? 'Він надягає окуляри' : 'Он надевает очки'],
        ['She takes off glasses', isUK ? 'Вона знімає окуляри' : 'Она снимает очки'],
        ['We turn on lights', isUK ? 'Ми вмикаємо світло' : 'Мы включаем свет'],
        ['They turn off lights', isUK ? 'Вони вимикають світло' : 'Они выключают свет'],
        ['We find out facts', isUK ? 'Ми з\'ясовуємо факти' : 'Мы выясняем факты'],
        ['They go back home', isUK ? 'Вони повертаються додому' : 'Они возвращаются домой'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Найчастіші помилки' : '16. Самые частые ошибки'} />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ I wake early → ✅ I wake up early. У значенні "прокидатися" потрібен блок wake up.'
        : '❌ I wake early → ✅ I wake up early. В значении "просыпаться" нужен блок wake up.'
      }
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ You get late → ✅ You get up late. У значенні "вставати" потрібен блок get up.'
        : '❌ You get late → ✅ You get up late. В значении "вставать" нужен блок get up.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ She takes glasses off у цьому уроці не тренується → ✅ She takes off glasses. Тримай порядок з фраз уроку.'
        : '❌ She takes glasses off в этом уроке не тренируется → ✅ She takes off glasses. Держи порядок из фраз урока.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ Does he gets up late? → ✅ Does he get up late? Після Does дія без -s.'
        : '❌ Does he gets up late? → ✅ Does he get up late? После Does действие без -s.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ He does not puts on glasses → ✅ He does not put on glasses. Після does not дія без -s.'
        : '❌ He does not puts on glasses → ✅ He does not put on glasses. После does not действие без -s.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ He should puts on a jacket → ✅ He should put on a jacket. Після should дія без -s.'
        : '❌ He should puts on a jacket → ✅ He should put on a jacket. После should действие без -s.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ He can gives back a key → ✅ He can give back a key. Після can дія без -s.'
        : '❌ He can gives back a key → ✅ He can give back a key. После can действие без -s.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ I find facts out → ✅ We find out facts. У цьому уроці тримай порядок find out + object.'
        : '❌ I find facts out → ✅ We find out facts. В этом уроке держи порядок find out + object.'
      }
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ I waked up yesterday → ✅ I woke up yesterday. Wake у минулому стає woke.'
        : '❌ I waked up yesterday → ✅ I woke up yesterday. Wake в прошлом становится woke.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ They finded out yesterday → ✅ They found out yesterday. Find у минулому стає found.'
        : '❌ They finded out yesterday → ✅ They found out yesterday. Find в прошлом становится found.'
      }
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Що треба винести з уроку' : '17. Что нужно вынести из урока'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся бачити фразове дієслово як один смисловий блок. Wake up = прокидатися. Put on = надягати. Turn off = вимикати. Find out = дізнатися. У питаннях і запереченнях працюють do / does / do not / does not. Після should і can дія стоїть у базовій формі. У Past Simple змінюється перша частина: woke up, got up, took off, found out.'
        : 'В этом уроке ты учишься видеть фразовый глагол как один смысловой блок. Wake up = просыпаться. Put on = надевать. Turn off = выключать. Find out = выяснить. В вопросах и отрицаниях работают do / does / do not / does not. После should и can действие стоит в базовой форме. В Past Simple меняется первая часть: woke up, got up, took off, found out.'
      }
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: I wake up early. Does she put on glasses? I woke up early yesterday.'
        : 'Перед практикой держи три модели: I wake up early. Does she put on glasses? I woke up early yesterday.'
      }
    />,
  ],
},

// ── УРОК 17 ──────────────────────────────────────────────────
17: {
  titleRU: 'Present Continuous: действия сейчас',
  titleUK: 'Present Continuous: дії зараз',
  titlePtBr: "Present Continuous: ações agora",
  titleVi: "Present Continuous: hành động đang diễn ra",
  titleId: "Present Continuous: tindakan sekarang",
  titleTr: "Present Continuous: şu anda olan eylemler",
  titlePl: "Present Continuous: czynności teraz",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити про дію, яка відбувається зараз або в поточний момент: я працюю зараз, ти читаєш зараз, він готує вечерю, вони дивляться телевізор.'
        : 'В этом уроке ты учишься говорить о действии, которое происходит сейчас или в текущий момент: я работаю сейчас, ты читаешь сейчас, он готовит ужин, они смотрят телевизор.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайна дія' : 'Обычное действие', isUK ? 'Дія зараз' : 'Действие сейчас'],
        ['I work', 'I am working now'],
        ['You read', 'You are reading now'],
        ['He cooks dinner', 'He is cooking dinner'],
        ['They watch TV', 'They are watching TV'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: Present Continuous = am / is / are + дія з -ing.'
        : 'Главная идея: Present Continuous = am / is / are + действие с -ing.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Формула така: хто + am/is/are + дія-ing + продовження. Тут обов\'язково потрібні дві частини: форма To Be і дієслово з -ing.'
        : 'Формула такая: кто + am/is/are + действие-ing + продолжение. Здесь обязательно нужны две части: форма To Be и глагол с -ing.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', 'am/is/are', isUK ? 'Дія-ing' : 'Действие-ing', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'am', 'working', 'I am working now'],
        ['You', 'are', 'reading', 'You are reading now'],
        ['He', 'is', 'cooking', 'He is cooking dinner'],
        ['She', 'is', 'writing', 'She is writing messages'],
        ['We', 'are', 'waiting', 'We are waiting here'],
        ['They', 'are', 'watching', 'They are watching TV'],
        ['It', 'is', 'working', 'It is working well'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I working now → ✅ I am working now. У Present Continuous потрібне am.'
        : '❌ I working now → ✅ I am working now. В Present Continuous нужно am.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ He cooking dinner → ✅ He is cooking dinner. Потрібне is перед дією з -ing.'
        : '❌ He cooking dinner → ✅ He is cooking dinner. Нужно is перед действием с -ing.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Am, is, are — як у To Be' : '3. Am, is, are - как в To Be'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'У Present Continuous використовується знайомий To Be: I am, he/she/it is, you/we/they are. Без цієї частини фраза буде неповною.'
        : 'В Present Continuous используется знакомый To Be: I am, he/she/it is, you/we/they are. Без этой части фраза будет неполной.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        ['I am', 'I am working now / I am listening to music / I am looking for keys / I am calling you'],
        ['You are', 'You are reading now / You are drinking coffee / You are helping me'],
        ['He is', 'He is cooking dinner / He is driving now / He is fixing a problem'],
        ['She is', 'She is writing messages / She is speaking English / She is cleaning her room'],
        ['We are', 'We are waiting here / We are checking documents / We are ordering food'],
        ['They are', 'They are watching TV / They are sending messages / They are buying tickets'],
        ['It is', 'It is working well'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ They is watching TV → ✅ They are watching TV. З they потрібне are.'
        : '❌ They is watching TV → ✅ They are watching TV. С they нужно are.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ She are writing messages → ✅ She is writing messages. З she потрібне is.'
        : '❌ She are writing messages → ✅ She is writing messages. С she нужно is.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Як утворюється -ing' : '4. Как образуется -ing'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'У більшості фраз цього уроку ми просто додаємо -ing до дієслова: work → working, read → reading, wait → waiting.'
        : 'В большинстве фраз этого урока мы просто добавляем -ing к глаголу: work → working, read → reading, wait → waiting.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова дія' : 'Базовое действие', '-ing', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['work', 'working', 'I am working now'],
        ['read', 'reading', 'You are reading now'],
        ['cook', 'cooking', 'He is cooking dinner'],
        ['wait', 'waiting', 'We are waiting here'],
        ['watch', 'watching', 'They are watching TV'],
        ['listen', 'listening', 'I am listening to music'],
        ['drink', 'drinking', 'You are drinking coffee'],
        ['speak', 'speaking', 'She is speaking English'],
        ['check', 'checking', 'We are checking documents'],
        ['send', 'sending', 'They are sending messages'],
        ['look', 'looking', 'I am looking for keys'],
        ['clean', 'cleaning', 'She is cleaning her room'],
        ['fix', 'fixing', 'He is fixing a problem'],
        ['order', 'ordering', 'We are ordering food'],
        ['buy', 'buying', 'They are buying tickets'],
        ['call', 'calling', 'I am calling you'],
        ['help', 'helping', 'You are helping me'],
      ]}
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. E зникає: write → writing' : '5. E исчезает: write → writing'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Якщо дієслово закінчується на німе -e, перед -ing це -e часто зникає. У цьому уроці це видно у write → writing.'
        : 'Если глагол заканчивается на немое -e, перед -ing это -e часто исчезает. В этом уроке это видно в write → writing.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова дія' : 'Базовое действие', '-ing', isUK ? 'Приклад' : 'Пример'],
        ['write', 'writing', 'She is writing messages'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ She is writeing messages → ✅ She is writing messages. У write перед -ing прибираємо e.'
        : '❌ She is writeing messages → ✅ She is writing messages. В write перед -ing убираем e.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Now і today' : '6. Now и today'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Present Continuous часто використовується з now, але не кожна фраза повинна мати now. Якщо дія відбувається в поточний момент або сьогодні, ця конструкція теж природна.'
        : 'Present Continuous часто используется с now, но не каждая фраза обязана иметь now. Если действие происходит в текущий момент или сегодня, эта конструкция тоже естественна.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Маркер' : 'Маркер', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['now', 'I am working now / You are reading now / He is driving now / It is working now'],
        ['today', 'He is not driving today'],
        [isUK ? 'без маркера, але дія зараз' : 'без маркера, но действие сейчас', 'He is cooking dinner / She is writing messages / They are watching TV'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Now просто підсилює ідею "зараз". Але Present Continuous уже сам часто показує дію в процесі.'
        : 'Now просто усиливает идею "сейчас". Но Present Continuous уже сам часто показывает действие в процессе.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Заперечення: am/is/are + not + -ing' : '7. Отрицание: am/is/are + not + -ing'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб зробити заперечення, постав not після am, is або are. Дія з -ing залишається на місці.'
        : 'Чтобы сделать отрицание, поставь not после am, is или are. Действие с -ing остаётся на месте.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Заперечення' : 'Отрицание'],
        ['I am working now', 'I am not working now'],
        ['You are listening', 'You are not listening'],
        ['He is sleeping', 'He is not sleeping'],
        ['She is reading messages', 'She is not reading messages'],
        ['We are waiting outside', 'We are not waiting outside'],
        ['They are watching TV', 'They are not watching TV'],
        ['It is working now', 'It is not working now'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ I do not am working → ✅ I am not working. У Present Continuous заперечення робиться через not після am/is/are.'
        : '❌ I do not am working → ✅ I am not working. В Present Continuous отрицание делается через not после am/is/are.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ He not sleeping → ✅ He is not sleeping. Not не замінює is.'
        : '❌ He not sleeping → ✅ He is not sleeping. Not не заменяет is.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Питання: Am / Is / Are на початку' : '8. Вопрос: Am / Is / Are в начале'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб зробити питання, перенеси am, is або are на початок. Do або does не потрібні.'
        : 'Чтобы сделать вопрос, перенеси am, is или are в начало. Do или does не нужны.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['I am speaking too fast', 'Am I speaking too fast?'],
        ['You are working now', 'Are you working now?'],
        ['He is cooking dinner', 'Is he cooking dinner?'],
        ['She is writing messages', 'Is she writing messages?'],
        ['We are waiting here', 'Are we waiting here?'],
        ['They are watching TV', 'Are they watching TV?'],
        ['It is working now', 'Is it working now?'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ Do you working now? → ✅ Are you working now? Для питання потрібне are, не do.'
        : '❌ Do you working now? → ✅ Are you working now? Для вопроса нужно are, не do.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ Is they watching TV? → ✅ Are they watching TV? З they потрібне are.'
        : '❌ Is they watching TV? → ✅ Are they watching TV? С they нужно are.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Спеціальні питання з Present Continuous' : '9. Специальные вопросы с Present Continuous'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'У спеціальному питанні питальне слово ставиться перед am, is або are: What are you doing? Where are they going? Why is she crying?'
        : 'В специальном вопросе вопросительное слово ставится перед am, is или are: What are you doing? Where are they going? Why is she crying?'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питальне слово' : 'Вопросительное слово', 'am/is/are', isUK ? 'Хто?' : 'Кто?', isUK ? 'Дія-ing' : 'Действие-ing', isUK ? 'Фраза' : 'Фраза'],
        ['What', 'are', 'you', 'doing', 'What are you doing now?'],
        ['Where', 'are', 'they', 'going', 'Where are they going?'],
        ['Why', 'is', 'she', 'crying', 'Why is she crying?'],
        ['Who', 'are', 'you', 'calling', 'Who are you calling?'],
        ['What', 'is', 'he', 'reading', 'What is he reading?'],
        ['Why', 'are', 'we', 'waiting', 'Why are we waiting?'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ What you are doing now? → ✅ What are you doing now? У питанні are стоїть перед you.'
        : '❌ What you are doing now? → ✅ What are you doing now? В вопросе are стоит перед you.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ Why she is crying? → ✅ Why is she crying? Після why ставимо is.'
        : '❌ Why she is crying? → ✅ Why is she crying? После why ставим is.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Who are you calling? = кому ти телефонуєш?' : '10. Who are you calling? = кому ты звонишь?'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразі Who are you calling? слово who перекладається природно як "кому" або "кого", залежно від дії. Тут calling означає "телефонувати".'
        : 'Во фразе Who are you calling? слово who переводится естественно как "кому" или "кого", в зависимости от действия. Здесь calling означает "звонить".'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="Who are you calling?"
      rus={isUK ? 'Кому ти телефонуєш?' : 'Кому ты звонишь?'}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Не перекладай who лише як "хто". У питанні Who are you calling? природно: "кому ти телефонуєш?"'
        : 'Не переводи who только как "кто". В вопросе Who are you calling? естественно: "кому ты звонишь?"'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Listen to і look for' : '11. Listen to и look for'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці є два блоки, які не можна ламати: listen to і look for. Після listen потрібне to. Look for означає "шукати".'
        : 'В этом уроке есть два блока, которые нельзя ломать: listen to и look for. После listen нужно to. Look for означает "искать".'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['listening to music', isUK ? 'слухаю музику' : 'слушаю музыку', 'I am listening to music'],
        ['listening to me', isUK ? 'слухаєш мене' : 'слушаешь меня', 'Are you listening to me?'],
        ['looking for keys', isUK ? 'шукаю ключі' : 'ищу ключи', 'I am looking for keys / Is he looking for keys?'],
        ['looking for problems', isUK ? 'шукаю проблеми' : 'ищу проблемы', 'I am not looking for problems'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ I am listening music → ✅ I am listening to music. Після listen потрібне to.'
        : '❌ I am listening music → ✅ I am listening to music. После listen нужно to.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ I am looking keys → ✅ I am looking for keys. У значенні "шукати" потрібне look for.'
        : '❌ I am looking keys → ✅ I am looking for keys. В значении "искать" нужно look for.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Об\'єкти після дії: you, me, him' : '12. Объекты после действия: you, me, him'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Після дії може стояти людина, на яку спрямована дія: я телефоную тобі, ти допомагаєш мені, вона телефонує йому.'
        : 'После действия может стоять человек, на которого направлено действие: я звоню тебе, ты помогаешь мне, она звонит ему.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['you', isUK ? 'тобі / тебе' : 'тебе / тебя', 'I am calling you'],
        ['me', isUK ? 'мені / мене' : 'мне / меня', 'You are helping me / Are you listening to me?'],
        ['him', isUK ? 'йому / його' : 'ему / его', 'She is not calling him'],
      ]}
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ You are helping I → ✅ You are helping me. Після helping потрібна форма me.'
        : '❌ You are helping I → ✅ You are helping me. После helping нужна форма me.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ She is not calling he → ✅ She is not calling him. Після calling потрібна форма him.'
        : '❌ She is not calling he → ✅ She is not calling him. После calling нужна форма him.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Фразові дієслова в Present Continuous' : '13. Фразовые глаголы в Present Continuous'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У кінці уроку Present Continuous поєднується з фразовими дієсловами: turn off, put on, clean up, go back. У таких фразах -ing отримує перша частина дієслова.'
        : 'В конце урока Present Continuous соединяется с фразовыми глаголами: turn off, put on, clean up, go back. В таких фразах -ing получает первая часть глагола.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базовий блок' : 'Базовый блок', isUK ? 'Форма з -ing' : 'Форма с -ing', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['turn off', 'turning off', 'I am turning off my phone'],
        ['put on', 'putting on', 'She is putting on her jacket'],
        ['clean up', 'cleaning up', 'They are cleaning up their room'],
        ['go back', 'going back', 'We are going back now'],
      ]}
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ I am turn off my phone → ✅ I am turning off my phone. У Present Continuous потрібне turning.'
        : '❌ I am turn off my phone → ✅ I am turning off my phone. В Present Continuous нужно turning.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ She is put on her jacket → ✅ She is putting on her jacket. Put подвоює t: putting.'
        : '❌ She is put on her jacket → ✅ She is putting on her jacket. Put удваивает t: putting.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Putting: подвоєння приголосної' : '14. Putting: удвоение согласной'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'У слові put перед -ing подвоюється остання літера: put → putting. Це потрібно просто впізнати як правильну форму з уроку.'
        : 'В слове put перед -ing удваивается последняя буква: put → putting. Это нужно просто узнать как правильную форму из урока.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', '-ing', isUK ? 'Приклад' : 'Пример'],
        ['put on', 'putting on', 'She is putting on her jacket'],
      ]}
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ puting on → ✅ putting on. У putting дві t.'
        : '❌ puting on → ✅ putting on. В putting две t.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. My, her, their у фразах уроку' : '15. My, her, their в фразах урока'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах з фразовими дієсловами є присвійні слова my, her, their. Вони стоять перед предметом: my phone, her jacket, their room.'
        : 'Во фразах с фразовыми глаголами есть притяжательные слова my, her, their. Они стоят перед предметом: my phone, her jacket, their room.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Переклад' : 'Перевод'],
        ['my phone', isUK ? 'мій телефон' : 'мой телефон'],
        ['her jacket', isUK ? 'її куртка' : 'её куртка'],
        ['their room', isUK ? 'їхня кімната' : 'их комната'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Готові блоки з уроку' : '16. Готовые блоки из урока'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці краще впізнавати не тільки формулу am/is/are + -ing, а й готові смислові блоки.'
        : 'В этом уроке лучше узнавать не только формулу am/is/are + -ing, но и готовые смысловые блоки.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['working now', isUK ? 'працюю зараз' : 'работаю сейчас', 'I am working now'],
        ['reading now', isUK ? 'читаєш зараз' : 'читаешь сейчас', 'You are reading now'],
        ['cooking dinner', isUK ? 'готує вечерю' : 'готовит ужин', 'He is cooking dinner'],
        ['writing messages', isUK ? 'пише повідомлення' : 'пишет сообщения', 'She is writing messages'],
        ['waiting here', isUK ? 'чекаємо тут' : 'ждём здесь', 'We are waiting here'],
        ['watching TV', isUK ? 'дивляться телевізор' : 'смотрят телевизор', 'They are watching TV'],
        ['working well', isUK ? 'добре працює' : 'хорошо работает', 'It is working well'],
        ['driving now', isUK ? 'зараз їде за кермом' : 'сейчас ведёт машину', 'He is driving now'],
        ['checking documents', isUK ? 'перевіряємо документи' : 'проверяем документы', 'We are checking documents'],
        ['sending messages', isUK ? 'надсилають повідомлення' : 'отправляют сообщения', 'They are sending messages'],
      ]}
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['cleaning her room', isUK ? 'прибирає свою кімнату' : 'убирает свою комнату', 'She is cleaning her room'],
        ['fixing a problem', isUK ? 'вирішує проблему' : 'исправляет проблему', 'He is fixing a problem'],
        ['ordering food', isUK ? 'замовляємо їжу' : 'заказываем еду', 'We are ordering food'],
        ['buying tickets', isUK ? 'купують квитки' : 'покупают билеты', 'They are buying tickets'],
        ['calling you', isUK ? 'телефоную тобі' : 'звоню тебе', 'I am calling you'],
        ['helping me', isUK ? 'допомагаєш мені' : 'помогаешь мне', 'You are helping me'],
        ['speaking too fast', isUK ? 'говорю занадто швидко' : 'говорю слишком быстро', 'Am I speaking too fast?'],
        ['sending documents', isUK ? 'надсилають документи' : 'отправляют документы', 'Are they sending documents?'],
        ['going back now', isUK ? 'зараз повертаємося назад' : 'сейчас возвращаемся назад', 'We are going back now'],
      ]}
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Present Simple і Present Continuous' : '17. Present Simple и Present Continuous'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'Present Simple говорить про факт або звичку. Present Continuous говорить про дію в процесі зараз. У цьому уроці тренується саме дія в процесі.'
        : 'Present Simple говорит о факте или привычке. Present Continuous говорит о действии в процессе сейчас. В этом уроке тренируется именно действие в процессе.'
      }
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Факт / звичка' : 'Факт / привычка', isUK ? 'Дія зараз' : 'Действие сейчас'],
        ['I work here', 'I am working now'],
        ['You read books', 'You are reading now'],
        ['They watch TV', 'They are watching TV'],
        ['It works well', 'It is working well'],
      ]}
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ I work now → краще для цього уроку: ✅ I am working now. Якщо підкреслюєш процес зараз, використовуй Present Continuous.'
        : '❌ I work now → лучше для этого урока: ✅ I am working now. Если подчёркиваешь процесс сейчас, используй Present Continuous.'
      }
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Переклад не завжди дослівний' : '18. Перевод не всегда дословный'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'В українській або російській часто немає окремого слова для am/is/are у таких фразах. Англійська ж обов\'язково ставить am/is/are перед -ing.'
        : 'В русском часто нет отдельного слова для am/is/are в таких фразах. Английский же обязательно ставит am/is/are перед -ing.'
      }
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I am working now', isUK ? 'Я зараз працюю' : 'Я сейчас работаю'],
        ['He is cooking dinner', isUK ? 'Він готує вечерю' : 'Он готовит ужин'],
        ['It is working well', isUK ? 'Це добре працює' : 'Это хорошо работает'],
        ['He is driving now', isUK ? 'Він зараз їде за кермом' : 'Он сейчас ведёт машину'],
        ['What are you doing now?', isUK ? 'Що ти зараз робиш?' : 'Что ты сейчас делаешь?'],
        ['Where are they going?', isUK ? 'Куди вони йдуть?' : 'Куда они идут?'],
        ['They are cleaning up their room', isUK ? 'Вони прибирають свою кімнату' : 'Они убирают свою комнату'],
      ]}
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Найчастіші помилки' : '19. Самые частые ошибки'} />,

    <Warn key="w20" t={t} f={f} text={isUK ? '❌ I working now → ✅ I am working now. Потрібне am.' : '❌ I working now → ✅ I am working now. Нужно am.'} />,
    <Warn key="w21" t={t} f={f} text={isUK ? '❌ You are read now → ✅ You are reading now. Після are потрібна форма -ing.' : '❌ You are read now → ✅ You are reading now. После are нужна форма -ing.'} />,
    <Warn key="w22" t={t} f={f} text={isUK ? '❌ He is cook dinner → ✅ He is cooking dinner. Потрібне cooking.' : '❌ He is cook dinner → ✅ He is cooking dinner. Нужно cooking.'} />,
    <Warn key="w23" t={t} f={f} text={isUK ? '❌ She are writing messages → ✅ She is writing messages. З she потрібне is.' : '❌ She are writing messages → ✅ She is writing messages. С she нужно is.'} />,
    <Warn key="w24" t={t} f={f} text={isUK ? '❌ They is watching TV → ✅ They are watching TV. З they потрібне are.' : '❌ They is watching TV → ✅ They are watching TV. С they нужно are.'} />,
    <Warn key="w25" t={t} f={f} text={isUK ? '❌ I am not work now → ✅ I am not working now. У запереченні дія теж має -ing.' : '❌ I am not work now → ✅ I am not working now. В отрицании действие тоже имеет -ing.'} />,
    <Warn key="w26" t={t} f={f} text={isUK ? '❌ Do you working now? → ✅ Are you working now? У питанні потрібне are.' : '❌ Do you working now? → ✅ Are you working now? В вопросе нужно are.'} />,
    <Warn key="w27" t={t} f={f} text={isUK ? '❌ What you are doing now? → ✅ What are you doing now? У питанні are стоїть перед you.' : '❌ What you are doing now? → ✅ What are you doing now? В вопросе are стоит перед you.'} />,
    <Warn key="w28" t={t} f={f} text={isUK ? '❌ I am listening music → ✅ I am listening to music. Після listen потрібне to.' : '❌ I am listening music → ✅ I am listening to music. После listen нужно to.'} />,
    <Warn key="w29" t={t} f={f} text={isUK ? '❌ I am looking keys → ✅ I am looking for keys. Look for = шукати.' : '❌ I am looking keys → ✅ I am looking for keys. Look for = искать.'} />,
    <Warn key="w30" t={t} f={f} text={isUK ? '❌ She is puting on her jacket → ✅ She is putting on her jacket. У putting дві t.' : '❌ She is puting on her jacket → ✅ She is putting on her jacket. В putting две t.'} />,

    <Section key="s20" t={t} f={f} title={isUK ? '20. Що треба винести з уроку' : '20. Что нужно вынести из урока'} />,

    <Body
      key="b20a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити про дію в процесі. Формула: I am, he/she/it is, you/we/they are + дія з -ing. Для заперечення став not після am/is/are. Для питання перенось am/is/are на початок. У спеціальному питанні став question word перед am/is/are.'
        : 'В этом уроке ты учишься говорить о действии в процессе. Формула: I am, he/she/it is, you/we/they are + действие с -ing. Для отрицания ставь not после am/is/are. Для вопроса переноси am/is/are в начало. В специальном вопросе ставь question word перед am/is/are.'
      }
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: I am working now. I am not working now. Are you working now?'
        : 'Перед практикой держи три модели: I am working now. I am not working now. Are you working now?'
      }
    />,
  ],
},

// ── УРОК 18 ──────────────────────────────────────────────────
18: {
  titleRU: 'Просьбы, команды и предложения',
  titleUK: 'Прохання, команди та пропозиції',
  titlePtBr: "Pedidos, comandos e sugestões",
  titleVi: "Lời nhờ, mệnh lệnh và gợi ý",
  titleId: "Permintaan, perintah, dan saran",
  titleTr: "Ricalar, emirler ve öneriler",
  titlePl: "Prośby, polecenia i sugestie",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся просити, давати прості інструкції, забороняти дію, ставити ввічливе питання і пропонувати зробити щось разом.'
        : 'В этом уроке ты учишься просить, давать простые инструкции, запрещать действие, задавать вежливый вопрос и предлагать сделать что-то вместе.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип фрази' : 'Тип фразы', isUK ? 'Модель' : 'Модель', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        [isUK ? 'ввічливе прохання' : 'вежливая просьба', 'Please + verb', 'Please wait here'],
        [isUK ? 'пряма команда' : 'прямая команда', 'verb', 'Wait here'],
        [isUK ? 'заборона' : 'запрет', 'Do not + verb', 'Do not wait outside'],
        [isUK ? 'ввічливе питання' : 'вежливый вопрос', 'Can you + verb?', 'Can you help me?'],
        [isUK ? 'пропозиція разом' : 'предложение вместе', 'Let us + verb', 'Let us start now'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: у командах і проханнях дія стоїть у базовій формі: wait, help, call, check, send, open, close.'
        : 'Главная идея: в командах и просьбах действие стоит в базовой форме: wait, help, call, check, send, open, close.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Please + дія = ввічливе прохання' : '2. Please + действие = вежливая просьба'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Please робить команду м\'якшою і ввічливішою. Після please ставиться базова дія без you.'
        : 'Please делает команду мягче и вежливее. После please ставится базовое действие без you.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        ['Please + verb', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Please wait here', isUK ? 'Будь ласка, зачекай тут' : 'Пожалуйста, подожди здесь'],
        ['Please help me', isUK ? 'Будь ласка, допоможи мені' : 'Пожалуйста, помоги мне'],
        ['Please call me later', isUK ? 'Будь ласка, зателефонуй мені пізніше' : 'Пожалуйста, позвони мне позже'],
        ['Please check messages', isUK ? 'Будь ласка, перевір повідомлення' : 'Пожалуйста, проверь сообщения'],
        ['Please send documents', isUK ? 'Будь ласка, надішли документи' : 'Пожалуйста, отправь документы'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ Please you wait here → ✅ Please wait here. У цій моделі you не потрібне.'
        : '❌ Please you wait here → ✅ Please wait here. В этой модели you не нужно.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Команда без you' : '3. Команда без you'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'У прямій команді англійська зазвичай не каже you. Просто ставиться базова дія: Wait, Start, Listen, Look, Call, Help.'
        : 'В прямой команде английский обычно не говорит you. Просто ставится базовое действие: Wait, Start, Listen, Look, Call, Help.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Команда' : 'Команда', isUK ? 'Переклад' : 'Перевод'],
        ['Wait here', isUK ? 'Зачекай тут' : 'Жди здесь'],
        ['Start now', isUK ? 'Починай зараз' : 'Начни сейчас'],
        ['Listen to me', isUK ? 'Слухай мене' : 'Слушай меня'],
        ['Look at me', isUK ? 'Подивись на мене' : 'Посмотри на меня'],
        ['Call her now', isUK ? 'Зателефонуй їй зараз' : 'Позвони ей сейчас'],
        ['Help us today', isUK ? 'Допоможи нам сьогодні' : 'Помоги нам сегодня'],
        ['Bring documents', isUK ? 'Принеси документи' : 'Принеси документы'],
        ['Take cash', isUK ? 'Візьми готівку' : 'Возьми наличные'],
        ['Check your phone', isUK ? 'Перевір свій телефон' : 'Проверь свой телефон'],
        ['Clean your room', isUK ? 'Прибери свою кімнату' : 'Убери свою комнату'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ You wait here → ✅ Wait here. У команді "ти/ви" зазвичай не вимовляється.'
        : '❌ You wait here → ✅ Wait here. В команде "ты/вы" обычно не произносится.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Do not + дія = не роби' : '4. Do not + действие = не делай'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб сказати "не роби", став Do not перед базовою дією. Це не звичайне заперечення Present Simple, а заборона або інструкція.'
        : 'Чтобы сказать "не делай", ставь Do not перед базовым действием. Это не обычное отрицание Present Simple, а запрет или инструкция.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        ['Do not + verb', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Do not wait outside', isUK ? 'Не чекай надворі' : 'Не жди снаружи'],
        ['Do not call him', isUK ? 'Не телефонуй йому' : 'Не звони ему'],
        ['Do not send messages', isUK ? 'Не надсилай повідомлення' : 'Не отправляй сообщения'],
        ['Do not open it', isUK ? 'Не відкривай це' : 'Не открывай это'],
        ['Do not close it', isUK ? 'Не закривай це' : 'Не закрывай это'],
        ['Do not forget your key', isUK ? 'Не забудь свій ключ' : 'Не забудь свой ключ'],
        ['Do not lose your ticket', isUK ? 'Не загуби свій квиток' : 'Не потеряй свой билет'],
        ['Do not use my phone', isUK ? 'Не використовуй мій телефон' : 'Не используй мой телефон'],
        ['Do not share passwords', isUK ? 'Не ділися паролями' : 'Не делись паролями'],
        ['Do not waste time', isUK ? 'Не витрачай час даремно' : 'Не трать время зря'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ Not wait outside → ✅ Do not wait outside. Для заборони потрібне Do not.'
        : '❌ Not wait outside → ✅ Do not wait outside. Для запрета нужно Do not.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ Do not waits outside → ✅ Do not wait outside. Після Do not дія без -s.'
        : '❌ Do not waits outside → ✅ Do not wait outside. После Do not действие без -s.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Can you...? = ввічливе прохання' : '5. Can you...? = вежливая просьба'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Can you...? буквально питає "ти можеш?", але в живій мові часто працює як ввічливе прохання: можеш допомогти, можеш зателефонувати, можеш відкрити двері.'
        : 'Can you...? буквально спрашивает "ты можешь?", но в живой речи часто работает как вежливая просьба: можешь помочь, можешь позвонить, можешь открыть дверь.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        ['Can you + verb?', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Can you help me?', isUK ? 'Ти можеш допомогти мені?' : 'Ты можешь помочь мне?'],
        ['Can you call me later?', isUK ? 'Ти можеш зателефонувати мені пізніше?' : 'Ты можешь позвонить мне позже?'],
        ['Can you send documents?', isUK ? 'Ти можеш надіслати документи?' : 'Ты можешь отправить документы?'],
        ['Can you check my phone?', isUK ? 'Ти можеш перевірити мій телефон?' : 'Ты можешь проверить мой телефон?'],
        ['Can you bring a charger?', isUK ? 'Ти можеш принести зарядку?' : 'Ты можешь принести зарядку?'],
        ['Can you give it back?', isUK ? 'Ти можеш повернути це?' : 'Ты можешь вернуть это?'],
        ['Can you turn off the lights?', isUK ? 'Ти можеш вимкнути світло?' : 'Ты можешь выключить свет?'],
        ['Can you open the door?', isUK ? 'Ти можеш відчинити двері?' : 'Ты можешь открыть дверь?'],
        ['Can you close the door?', isUK ? 'Ти можеш зачинити двері?' : 'Ты можешь закрыть дверь?'],
        ['Can you wait here?', isUK ? 'Ти можеш почекати тут?' : 'Ты можешь подождать здесь?'],
      ]}
    />,

    <Warn key="w5" t={t} f={f} text={isUK ? '❌ Do you can help me? → ✅ Can you help me? У питанні з can не потрібен do.' : '❌ Do you can help me? → ✅ Can you help me? В вопросе с can не нужен do.'} />,
    <Warn key="w6" t={t} f={f} text={isUK ? '❌ Can you to help me? → ✅ Can you help me? Після can дія без to.' : '❌ Can you to help me? → ✅ Can you help me? После can действие без to.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Please і Can you — різна сила прохання' : '6. Please и Can you - разная сила просьбы'} />,
    <Body key="b6a" t={t} f={f} text={isUK ? 'Please + дія звучить як ввічлива інструкція. Can you...? звучить м\'якше, як питання-прохання. Обидві моделі є в уроці.' : 'Please + действие звучит как вежливая инструкция. Can you...? звучит мягче, как вопрос-просьба. Обе модели есть в уроке.'} />,
    <Table key="t6" t={t} f={f} rows={[
      [isUK ? 'Ввічлива інструкція' : 'Вежливая инструкция', isUK ? 'Ввічливе питання' : 'Вежливый вопрос'],
      ['Please help me', 'Can you help me?'],
      ['Please call me later', 'Can you call me later?'],
      ['Please send documents', 'Can you send documents?'],
      ['Please give it back', 'Can you give it back?'],
    ]} />,
    <Tip key="tip2" t={t} f={f} text={isUK ? 'У роботі, сервісі або спілкуванні з незнайомими людьми Can you...? часто звучить м\'якше, ніж пряма команда.' : 'На работе, в сервисе или в общении с незнакомыми людьми Can you...? часто звучит мягче, чем прямая команда.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Let us = давайте' : '7. Let us = давайте'} />,
    <Body key="b7a" t={t} f={f} text={isUK ? 'Let us означає "давайте". Це пропозиція зробити щось разом: давайте почнемо, давайте перевіримо, давайте замовимо, давайте повернемося.' : 'Let us означает "давайте". Это предложение сделать что-то вместе: давайте начнём, давайте проверим, давайте закажем, давайте вернёмся.'} />,
    <Tip key="tip7" t={t} f={f} text={isUK ? 'У живій мові Let us часто скорочується до Let\'s. У вправах приймаються обидва варіанти: Let us start і Let\'s start.' : 'В живой речи Let us часто сокращается до Let\'s. В упражнениях принимаются оба варианта: Let us start и Let\'s start.'} />,
    <Table key="t7" t={t} f={f} rows={[
      ['Let us + verb', isUK ? 'Природний переклад' : 'Естественный перевод'],
      ['Let us start now', isUK ? 'Давайте почнемо зараз' : 'Давайте начнём сейчас'],
      ['Let us work together', isUK ? 'Давайте працювати разом' : 'Давайте работать вместе'],
      ['Let us check documents', isUK ? 'Давайте перевіримо документи' : 'Давайте проверим документы'],
      ['Let us order food', isUK ? 'Давайте замовимо їжу' : 'Давайте закажем еду'],
      ['Let us call them', isUK ? 'Давайте зателефонуємо їм' : 'Давайте позвоним им'],
      ['Let us find a better option', isUK ? 'Давайте знайдемо кращий варіант' : 'Давайте найдём лучший вариант'],
      ['Let us go back', isUK ? 'Давайте повернемося назад' : 'Давайте вернёмся назад'],
      ['Let us clean up the room', isUK ? 'Давайте приберемо кімнату' : 'Давайте уберём комнату'],
      ['Let us talk later', isUK ? 'Давайте поговоримо пізніше' : 'Давайте поговорим позже'],
      ['Let us finish today', isUK ? 'Давайте закінчимо сьогодні' : 'Давайте закончим сегодня'],
    ]} />,
    <Warn key="w7" t={t} f={f} text={isUK ? '❌ Let us to start now → ✅ Let us start now. Після Let us дія без to.' : '❌ Let us to start now → ✅ Let us start now. После Let us действие без to.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Фразові дієслова в командах' : '8. Фразовые глаголы в командах'} />,
    <Body key="b8a" t={t} f={f} text={isUK ? 'У цьому уроці багато команд з фразовими дієсловами: turn on, turn off, give back, go back, clean up. Їх треба впізнавати як готові блоки.' : 'В этом уроке много команд с фразовыми глаголами: turn on, turn off, give back, go back, clean up. Их нужно узнавать как готовые блоки.'} />,
    <Table key="t8" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['turn on', isUK ? 'увімкнути' : 'включить', 'Please turn on your phone'],
      ['turn off', isUK ? 'вимкнути' : 'выключить', 'Please turn off your phone / Can you turn off the lights?'],
      ['give back', isUK ? 'повернути' : 'вернуть', 'Please give it back / Can you give it back?'],
      ['go back', isUK ? 'повернутися назад' : 'вернуться назад', 'Let us go back'],
      ['clean up', isUK ? 'прибрати' : 'убрать', 'Let us clean up the room'],
    ]} />,
    <Warn key="w8" t={t} f={f} text={isUK ? '❌ Please turn your phone on теж можливе, але в цьому уроці тренується порядок: ✅ Please turn on your phone.' : '❌ Please turn your phone on тоже возможно, но в этом уроке тренируется порядок: ✅ Please turn on your phone.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Me, him, her, us, them, it після дії' : '9. Me, him, her, us, them, it после действия'} />,
    <Body key="b9a" t={t} f={f} text={isUK ? 'У командах після дії може стояти людина або предмет: help me, call her, help us, call him, call them, give it back.' : 'В командах после действия может стоять человек или предмет: help me, call her, help us, call him, call them, give it back.'} />,
    <Table key="t9" t={t} f={f} rows={[
      [isUK ? 'Форма' : 'Форма', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['me', isUK ? 'мені / мене' : 'мне / меня', 'Please help me / Please call me later / Can you help me?'],
      ['him', isUK ? 'йому / його' : 'ему / его', 'Do not call him'],
      ['her', isUK ? 'їй / її' : 'ей / её', 'Call her now'],
      ['us', isUK ? 'нам / нас' : 'нам / нас', 'Help us today'],
      ['them', isUK ? 'їм / їх' : 'им / их', 'Let us call them'],
      ['it', isUK ? 'це / його' : 'это / его', 'Please give it back / Do not open it / Do not close it'],
    ]} />,
    <Warn key="w9" t={t} f={f} text={isUK ? '❌ Please help I → ✅ Please help me. Після help потрібна форма me.' : '❌ Please help I → ✅ Please help me. После help нужна форма me.'} />,
    <Warn key="w10" t={t} f={f} text={isUK ? '❌ Call she now → ✅ Call her now. Після call потрібна форма her.' : '❌ Call she now → ✅ Call her now. После call нужна форма her.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Your і my у командах' : '10. Your и my в командах'} />,
    <Body key="b10a" t={t} f={f} text={isUK ? 'У командах цього уроку є your і my. Вони стоять перед предметом: your phone, your room, your key, your ticket, my phone.' : 'В командах этого урока есть your и my. Они стоят перед предметом: your phone, your room, your key, your ticket, my phone.'} />,
    <Table key="t10" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Переклад' : 'Перевод'],
      ['your phone', isUK ? 'свій / твій телефон' : 'свой / твой телефон'],
      ['your room', isUK ? 'свою / твою кімнату' : 'свою / твою комнату'],
      ['your key', isUK ? 'свій / твій ключ' : 'свой / твой ключ'],
      ['your ticket', isUK ? 'свій / твій квиток' : 'свой / твой билет'],
      ['my phone', isUK ? 'мій телефон' : 'мой телефон'],
    ]} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. The app, the lights, the door, the room' : '11. The app, the lights, the door, the room'} />,
    <Body key="b11a" t={t} f={f} text={isUK ? 'У частині фраз є the. Це означає, що мова про конкретний застосунок, конкретні двері, конкретне світло або конкретну кімнату.' : 'В части фраз есть the. Это означает, что речь про конкретное приложение, конкретную дверь, конкретный свет или конкретную комнату.'} />,
    <Table key="t11" t={t} f={f} rows={[
      ['the app', 'Please open the app / Please close the app'],
      ['the lights', 'Can you turn off the lights?'],
      ['the door', 'Can you open the door? / Can you close the door?'],
      ['the room', 'Let us clean up the room'],
    ]} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Час і місце в командах' : '12. Время и место в командах'} />,
    <Body key="b12a" t={t} f={f} text={isUK ? 'Команда може мати коротке уточнення: де, коли або як. У цьому уроці це here, outside, now, later, today, together.' : 'Команда может иметь короткое уточнение: где, когда или как. В этом уроке это here, outside, now, later, today, together.'} />,
    <Table key="t12" t={t} f={f} rows={[
      [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['here', isUK ? 'тут / здесь' : 'здесь', 'Please wait here / Wait here / Can you wait here?'],
      ['outside', isUK ? 'надворі / снаружи' : 'снаружи', 'Do not wait outside'],
      ['now', isUK ? 'зараз' : 'сейчас', 'Start now / Call her now / Let us start now'],
      ['later', isUK ? 'пізніше' : 'позже', 'Please call me later / Can you call me later? / Let us talk later'],
      ['today', isUK ? 'сьогодні' : 'сегодня', 'Help us today / Let us finish today'],
      ['together', isUK ? 'разом' : 'вместе', 'Let us work together'],
    ]} />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Готові блоки з уроку' : '13. Готовые блоки из урока'} />,
    <Body key="b13a" t={t} f={f} text={isUK ? 'У цьому уроці краще впізнавати не окремі слова, а готові блоки команд і прохань.' : 'В этом уроке лучше узнавать не отдельные слова, а готовые блоки команд и просьб.'} />,
    <Table key="t13" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
      ['wait here', isUK ? 'чекати тут' : 'ждать здесь'],
      ['help me', isUK ? 'допомогти мені' : 'помочь мне'],
      ['call me later', isUK ? 'зателефонувати мені пізніше' : 'позвонить мне позже'],
      ['check messages', isUK ? 'перевірити повідомлення' : 'проверить сообщения'],
      ['send documents', isUK ? 'надіслати документи' : 'отправить документы'],
      ['open the app', isUK ? 'відкрити застосунок' : 'открыть приложение'],
      ['close the app', isUK ? 'закрити застосунок' : 'закрыть приложение'],
      ['turn on your phone', isUK ? 'увімкнути свій телефон' : 'включить свой телефон'],
      ['turn off your phone', isUK ? 'вимкнути свій телефон' : 'выключить свой телефон'],
      ['give it back', isUK ? 'повернути це' : 'вернуть это'],
    ]} />,

    <Table key="t14" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
      ['listen to me', isUK ? 'слухати мене' : 'слушать меня'],
      ['look at me', isUK ? 'подивитися на мене' : 'посмотреть на меня'],
      ['call her now', isUK ? 'зателефонувати їй зараз' : 'позвонить ей сейчас'],
      ['help us today', isUK ? 'допомогти нам сьогодні' : 'помочь нам сегодня'],
      ['bring documents', isUK ? 'принести документи' : 'принести документы'],
      ['take cash', isUK ? 'взяти готівку' : 'взять наличные'],
      ['check your phone', isUK ? 'перевірити свій телефон' : 'проверить свой телефон'],
      ['clean your room', isUK ? 'прибрати свою кімнату' : 'убрать свою комнату'],
      ['share passwords', isUK ? 'ділитися паролями' : 'делиться паролями'],
      ['waste time', isUK ? 'витрачати час даремно' : 'тратить время зря'],
    ]} />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Переклад не завжди дослівний' : '14. Перевод не всегда дословный'} />,
    <Body key="b14a" t={t} f={f} text={isUK ? 'Команди й прохання часто перекладаються природно, а не слово в слово. Особливо це видно з Can you, Let us і фразовими дієсловами.' : 'Команды и просьбы часто переводятся естественно, а не слово в слово. Особенно это видно с Can you, Let us и фразовыми глаголами.'} />,
    <Table key="t15" t={t} f={f} rows={[
      [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
      ['Can you help me?', isUK ? 'Ти можеш допомогти мені?' : 'Ты можешь помочь мне?'],
      ['Can you give it back?', isUK ? 'Ти можеш повернути це?' : 'Ты можешь вернуть это?'],
      ['Let us work together', isUK ? 'Давайте працювати разом' : 'Давайте работать вместе'],
      ['Let us find a better option', isUK ? 'Давайте знайдемо кращий варіант' : 'Давайте найдём лучший вариант'],
      ['Let us go back', isUK ? 'Давайте повернемося назад' : 'Давайте вернёмся назад'],
      ['Do not waste time', isUK ? 'Не витрачай час даремно' : 'Не трать время зря'],
    ]} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Найчастіші помилки' : '15. Самые частые ошибки'} />,
    <Warn key="w11" t={t} f={f} text={isUK ? '❌ Please you help me → ✅ Please help me. Після please не ставимо you.' : '❌ Please you help me → ✅ Please help me. После please не ставим you.'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ To wait here → ✅ Wait here. Команда починається з базової дії без to.' : '❌ To wait here → ✅ Wait here. Команда начинается с базового действия без to.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ Not call him → ✅ Do not call him. Для заборони потрібне Do not.' : '❌ Not call him → ✅ Do not call him. Для запрета нужно Do not.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ Do not to open it → ✅ Do not open it. Після Do not дія без to.' : '❌ Do not to open it → ✅ Do not open it. После Do not действие без to.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ Can you to send documents? → ✅ Can you send documents? Після can дія без to.' : '❌ Can you to send documents? → ✅ Can you send documents? После can действие без to.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ Do you can wait here? → ✅ Can you wait here? Can сам виходить на початок питання.' : '❌ Do you can wait here? → ✅ Can you wait here? Can сам выходит в начало вопроса.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ Let us to check documents → ✅ Let us check documents. Після Let us дія без to.' : '❌ Let us to check documents → ✅ Let us check documents. После Let us действие без to.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ Listen me → ✅ Listen to me. Після listen потрібне to.' : '❌ Listen me → ✅ Listen to me. После listen нужно to.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ Look me → ✅ Look at me. У цій фразі потрібне at.' : '❌ Look me → ✅ Look at me. В этой фразе нужно at.'} />,
    <Warn key="w20" t={t} f={f} text={isUK ? '❌ Call she now → ✅ Call her now. Після call потрібна форма her.' : '❌ Call she now → ✅ Call her now. После call нужна форма her.'} />,
    <Warn key="w21" t={t} f={f} text={isUK ? '❌ Help we today → ✅ Help us today. Після help потрібна форма us.' : '❌ Help we today → ✅ Help us today. После help нужна форма us.'} />,
    <Warn key="w22" t={t} f={f} text={isUK ? '❌ Do not use mine phone → ✅ Do not use my phone. Перед phone потрібне my.' : '❌ Do not use mine phone → ✅ Do not use my phone. Перед phone нужно my.'} />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Що треба винести з уроку' : '16. Что нужно вынести из урока'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся керувати дією напряму. Please робить прохання ввічливішим. Пряма команда починається з базової дії. Do not забороняє дію. Can you...? робить прохання м\'якшим. Let us означає "давайте".'
        : 'В этом уроке ты учишься управлять действием напрямую. Please делает просьбу вежливее. Прямая команда начинается с базового действия. Do not запрещает действие. Can you...? делает просьбу мягче. Let us означает "давайте".'
      }
    />,

    <Tip
      key="tip5"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай п\'ять моделей: Please wait here. Wait here. Do not wait outside. Can you help me? Let us start now.'
        : 'Перед практикой держи пять моделей: Please wait here. Wait here. Do not wait outside. Can you help me? Let us start now.'
      }
    />,
  ],
},

// ── УРОК 19 ──────────────────────────────────────────────────
19: {
  titleRU: 'Предлоги места',
  titleUK: 'Прийменники місця',
  titlePtBr: "Preposições de lugar",
  titleVi: "Giới từ chỉ nơi chốn",
  titleId: "Preposisi tempat",
  titleTr: "Yer edatları",
  titlePl: "Przyimki miejsca",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити, де знаходиться предмет: на столі, під столом, у сумці, поруч з телефоном, всередині сумки, за дверима, навпроти магазину.'
        : 'В этом уроке ты учишься говорить, где находится предмет: на столе, под столом, в сумке, рядом с телефоном, внутри сумки, за дверью, напротив магазина.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Прийменник / блок' : 'Предлог / блок', isUK ? 'Головна ідея' : 'Главная идея', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['on', isUK ? 'на поверхні' : 'на поверхности', 'The phone is on the table'],
        ['under', isUK ? 'під' : 'под', 'The bag is under the table'],
        ['in', isUK ? 'у / всередині' : 'в / внутри', 'The keys are in the bag'],
        ['near', isUK ? 'поруч / біля' : 'рядом / около', 'The charger is near the phone'],
        ['inside', isUK ? 'всередині, з акцентом на "внутрь"' : 'внутри, с акцентом на "внутрь"', 'The documents are inside the bag'],
        ['next to', isUK ? 'поруч з / рядом с' : 'рядом с', 'The chair is next to the table'],
        ['behind', isUK ? 'позаду / за' : 'позади / за', 'The door is behind me'],
        ['outside', isUK ? 'зовні / снаружи' : 'снаружи', 'The car is outside the house'],
        ['opposite', isUK ? 'навпроти' : 'напротив', 'The bank is opposite the shop'],
        ['above', isUK ? 'над, без дотику' : 'над, без касания', 'The light is above the table'],
        ['between', isUK ? 'між' : 'между', 'The phone is between the books'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: прийменник місця показує позицію одного предмета відносно іншого.'
        : 'Главная идея: предлог места показывает позицию одного предмета относительно другого.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула: предмет + is/are + місце' : '2. Главная формула: предмет + is/are + место'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли ми говоримо, де щось знаходиться, у фразі потрібні три частини: предмет, is або are, і місце.'
        : 'Когда мы говорим, где что-то находится, во фразе нужны три части: предмет, is или are, и место.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Предмет' : 'Предмет', 'is/are', isUK ? 'Місце' : 'Место', isUK ? 'Фраза' : 'Фраза'],
        ['The phone', 'is', 'on the table', 'The phone is on the table'],
        ['The bag', 'is', 'under the table', 'The bag is under the table'],
        ['The keys', 'are', 'in the bag', 'The keys are in the bag'],
        ['The documents', 'are', 'inside the bag', 'The documents are inside the bag'],
        ['The shoes', 'are', 'under the bed', 'The shoes are under the bed'],
      ]}
    />,

    <Warn key="w1" t={t} f={f} text={isUK ? '❌ The phone on the table → ✅ The phone is on the table. У фразі про місце потрібне is або are.' : '❌ The phone on the table → ✅ The phone is on the table. Во фразе про место нужно is или are.'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Is для одного, are для кількох' : '3. Is для одного, are для нескольких'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Якщо предмет один, використовуй is. Якщо предметів кілька, використовуй are.' : 'Если предмет один, используй is. Если предметов несколько, используй are.'} />,
    <Table key="t3" t={t} f={f} rows={[
      [isUK ? 'Один предмет: is' : 'Один предмет: is', isUK ? 'Кілька предметів: are' : 'Несколько предметов: are'],
      ['The phone is on the table', 'The keys are in the bag'],
      ['The bag is under the table', 'The documents are inside the bag'],
      ['The charger is near the phone', 'The tickets are on the desk'],
      ['The jacket is on the chair', 'The shoes are under the bed'],
      ['The car is outside the house', 'His keys are in the car'],
    ]} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ The keys is in the bag → ✅ The keys are in the bag. Keys - множина, тому are.' : '❌ The keys is in the bag → ✅ The keys are in the bag. Keys - множественное число, поэтому are.'} />,
    <Warn key="w3" t={t} f={f} text={isUK ? '❌ The bag are under the table → ✅ The bag is under the table. Bag - один предмет, тому is.' : '❌ The bag are under the table → ✅ The bag is under the table. Bag - один предмет, поэтому is.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. On, under, in, inside' : '4. On, under, in, inside'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'On показує поверхню, under - положення нижче, in та inside - положення всередині.' : 'On показывает поверхность, under - положение ниже, in и inside - положение внутри.'} />,
    <Table key="t4" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад з уроку' : 'Пример из урока', isUK ? 'Переклад' : 'Перевод'],
      ['on the table', 'The phone is on the table', isUK ? 'на столі' : 'на столе'],
      ['on the desk', 'The tickets are on the desk', isUK ? 'на робочому столі' : 'на рабочем столе'],
      ['on the chair', 'The jacket is on the chair', isUK ? 'на стільці' : 'на стуле'],
      ['under the table', 'The bag is under the table', isUK ? 'під столом' : 'под столом'],
      ['under the bed', 'The shoes are under the bed', isUK ? 'під ліжком' : 'под кроватью'],
      ['in the bag', 'The keys are in the bag', isUK ? 'у сумці' : 'в сумке'],
      ['inside the bag', 'The documents are inside the bag', isUK ? 'всередині сумки' : 'внутри сумки'],
    ]} />,
    <Warn key="w4" t={t} f={f} text={isUK ? '❌ The phone is in the table → ✅ The phone is on the table. Якщо предмет лежить на поверхні столу, використовуй on.' : '❌ The phone is in the table → ✅ The phone is on the table. Если предмет лежит на поверхности стола, используй on.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Near, next to, behind, outside, opposite, above, between' : '5. Near, next to, behind, outside, opposite, above, between'} />,
    <Body key="b5a" t={t} f={f} text={isUK ? 'Ці блоки описують точніше положення: поруч, прямо поруч, позаду, зовні, навпроти, над або між.' : 'Эти блоки описывают положение точнее: рядом, прямо рядом, позади, снаружи, напротив, над или между.'} />,
    <Table key="t5" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['near', isUK ? 'поруч / недалеко' : 'рядом / недалеко', 'The charger is near the phone / The shop is near the hotel'],
      ['next to', isUK ? 'прямо поруч з' : 'прямо рядом с', 'The chair is next to the table'],
      ['behind', isUK ? 'позаду / за' : 'позади / за', 'The door is behind me / Their car is behind the house'],
      ['outside', isUK ? 'зовні / снаружи' : 'снаружи', 'The car is outside the house'],
      ['opposite', isUK ? 'навпроти' : 'напротив', 'The bank is opposite the shop'],
      ['above', isUK ? 'над, без дотику' : 'над, без касания', 'The light is above the table'],
      ['between', isUK ? 'між' : 'между', 'The phone is between the books'],
    ]} />,
    <Warn key="w5" t={t} f={f} text={isUK ? 'Above не те саме, що on. On = на поверхні з контактом. Above = над, без контакту.' : 'Above не то же самое, что on. On = на поверхности с контактом. Above = над, без контакта.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Питання: Is / Are + предмет + місце?' : '6. Вопросы: Is / Are + предмет + место?'} />,
    <Body key="b6a" t={t} f={f} text={isUK ? 'Щоб зробити питання про місце, перенеси is або are на початок. Для одного предмета - is. Для кількох - are.' : 'Чтобы сделать вопрос про место, перенеси is или are в начало. Для одного предмета - is. Для нескольких - are.'} />,
    <Table key="t6" t={t} f={f} rows={[
      [isUK ? 'Твердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
      ['The phone is on the table', 'Is the phone on the table?'],
      ['The keys are in the bag', 'Are the keys in the bag?'],
      ['The charger is near the phone', 'Is the charger near the phone?'],
      ['The car is outside the house', 'Is the car outside the house?'],
      ['The bank is opposite the shop', 'Is the bank opposite the shop?'],
      ['The passport is in the bag', 'Is the passport in the bag?'],
    ]} />,
    <Warn key="w6" t={t} f={f} text={isUK ? '❌ The phone is on the table? → ✅ Is the phone on the table? Для нормального питання is виходить на початок.' : '❌ The phone is on the table? → ✅ Is the phone on the table? Для нормального вопроса is выходит в начало.'} />,
    <Warn key="w7" t={t} f={f} text={isUK ? '❌ Is the keys in the bag? → ✅ Are the keys in the bag? Keys - множина, тому are.' : '❌ Is the keys in the bag? → ✅ Are the keys in the bag? Keys - множественное число, поэтому are.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Команди Put + предмет + місце' : '7. Команды Put + предмет + место'} />,
    <Body key="b7a" t={t} f={f} text={isUK ? 'У середині уроку предлоги місця тренуються через команди: поклади телефон на стіл, поклади ключі в сумку, постав сумку біля дверей.' : 'В середине урока предлоги места тренируются через команды: положи телефон на стол, положи ключи в сумку, поставь сумку рядом с дверью.'} />,
    <Table key="t7" t={t} f={f} rows={[
      [isUK ? 'Команда' : 'Команда', isUK ? 'Переклад' : 'Перевод'],
      ['Put the phone on the table', isUK ? 'Поклади телефон на стіл' : 'Положи телефон на стол'],
      ['Put the keys in the bag', isUK ? 'Поклади ключі в сумку' : 'Положи ключи в сумку'],
      ['Put the charger near the phone', isUK ? 'Поклади зарядник поруч з телефоном' : 'Положи зарядку рядом с телефоном'],
      ['Put the documents inside the bag', isUK ? 'Поклади документи всередину сумки' : 'Положи документы внутрь сумки'],
      ['Put the jacket on the chair', isUK ? 'Поклади куртку на стілець' : 'Положи куртку на стул'],
      ['Put the passport in the bag', isUK ? 'Поклади паспорт у сумку' : 'Положи паспорт в сумку'],
      ['Put the wallet on the desk', isUK ? 'Поклади гаманець на робочий стіл' : 'Положи кошелёк на рабочий стол'],
      ['Put the books on the chair', isUK ? 'Поклади книги на стілець' : 'Положи книги на стул'],
      ['Put the shoes under the bed', isUK ? 'Поклади взуття під ліжко' : 'Положи обувь под кровать'],
      ['Put the bag next to the door', isUK ? 'Постав сумку поруч з дверима' : 'Поставь сумку рядом с дверью'],
    ]} />,
    <Warn key="w8" t={t} f={f} text={isUK ? '❌ Put the phone in the table → ✅ Put the phone on the table. Якщо кладеш на поверхню, потрібне on.' : '❌ Put the phone in the table → ✅ Put the phone on the table. Если кладёшь на поверхность, нужно on.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Заборони: Do not + дія + місце' : '8. Запреты: Do not + действие + место'} />,
    <Body key="b8a" t={t} f={f} text={isUK ? 'Урок також тренує заборони з місцем: не клади, не стій, не чекай, не сиди, не залишай.' : 'Урок также тренирует запреты с местом: не клади, не стой, не жди, не сиди, не оставляй.'} />,
    <Table key="t8" t={t} f={f} rows={[
      [isUK ? 'Фраза' : 'Фраза', isUK ? 'Переклад' : 'Перевод'],
      ['Do not put the bag under the table', isUK ? 'Не клади сумку під стіл' : 'Не клади сумку под стол'],
      ['Do not stand behind the door', isUK ? 'Не стій за дверима' : 'Не стой за дверью'],
      ['Do not wait near the car', isUK ? 'Не чекай поруч з машиною' : 'Не жди рядом с машиной'],
      ['Do not sit on the bed', isUK ? 'Не сідай на ліжко' : 'Не сиди на кровати'],
      ['Do not leave documents on the desk', isUK ? 'Не залишай документи на робочому столі' : 'Не оставляй документы на рабочем столе'],
    ]} />,
    <Warn key="w9" t={t} f={f} text={isUK ? '❌ Not put the bag under the table → ✅ Do not put the bag under the table. Для заборони потрібне Do not.' : '❌ Not put the bag under the table → ✅ Do not put the bag under the table. Для запрета нужно Do not.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. There is / There are + місце' : '9. There is / There are + место'} />,
    <Body key="b9a" t={t} f={f} text={isUK ? 'У кінці уроку предлоги місця поєднуються з There is / There are: під стільцем є ключ, на столі є телефон, у сумці є квитки.' : 'В конце урока предлоги места соединяются с There is / There are: под стулом есть ключ, на столе есть телефон, в сумке есть билеты.'} />,
    <Table key="t9" t={t} f={f} rows={[
      [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо' : 'Что важно'],
      ['There is a key under the chair', isUK ? 'a key - один ключ, тому There is' : 'a key - один ключ, поэтому There is'],
      ['There is a phone on the table', isUK ? 'a phone - один телефон, тому There is' : 'a phone - один телефон, поэтому There is'],
      ['There are tickets in the bag', isUK ? 'tickets - множина, тому There are' : 'tickets - множественное число, поэтому There are'],
      ['There are shoes under the bed', isUK ? 'shoes - множина, тому There are' : 'shoes - множественное число, поэтому There are'],
      ['There is a shop near the hotel', isUK ? 'a shop - один магазин, тому There is' : 'a shop - один магазин, поэтому There is'],
    ]} />,
    <Warn key="w10" t={t} f={f} text={isUK ? '❌ There are a key under the chair → ✅ There is a key under the chair. Один key бере There is.' : '❌ There are a key under the chair → ✅ There is a key under the chair. Один key берёт There is.'} />,
    <Warn key="w11" t={t} f={f} text={isUK ? '❌ There is tickets in the bag → ✅ There are tickets in the bag. Tickets - множина.' : '❌ There is tickets in the bag → ✅ There are tickets in the bag. Tickets - множественное число.'} />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. My / your / his / her / their + предмет + місце' : '10. My / your / his / her / their + предмет + место'} />,
    <Body key="b10a" t={t} f={f} text={isUK ? 'У фінальних фразах уроку предлоги місця поєднуються з присвійними формами: my phone, your bag, his keys, her jacket, their car.' : 'В финальных фразах урока предлоги места соединяются с притяжательными формами: my phone, your bag, his keys, her jacket, their car.'} />,
    <Table key="t10" t={t} f={f} rows={[
      [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
      ['My phone is on the desk', isUK ? 'Мій телефон на робочому столі' : 'Мой телефон на рабочем столе'],
      ['Your bag is under the chair', isUK ? 'Твоя сумка під стільцем' : 'Твоя сумка под стулом'],
      ['His keys are in the car', isUK ? 'Його ключі в машині' : 'Его ключи в машине'],
      ['Her jacket is on the bed', isUK ? 'Її куртка на ліжку' : 'Её куртка на кровати'],
      ['Their car is behind the house', isUK ? 'Їхня машина за будинком' : 'Их машина за домом'],
      ['My passport is in the bag', isUK ? 'Мій паспорт у сумці' : 'Мой паспорт в сумке'],
      ['Your keys are on the desk', isUK ? 'Твої ключі на робочому столі' : 'Твои ключи на рабочем столе'],
      ['His wallet is in the car', isUK ? 'Його гаманець у машині' : 'Его кошелёк в машине'],
      ['Her phone is on the bed', isUK ? 'Її телефон на ліжку' : 'Её телефон на кровати'],
    ]} />,
    <Tip key="tip2" t={t} f={f} text={isUK ? 'Присвійне слово стоїть перед предметом: my phone, your bag, his keys, her phone, their car.' : 'Притяжательное слово стоит перед предметом: my phone, your bag, his keys, her phone, their car.'} />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. The, table і desk' : '11. The, table и desk'} />,
    <Body key="b11a" t={t} f={f} text={isUK ? 'У більшості фраз уроку стоїть the: це сигнал конкретного предмета. Table - звичайний стіл. Desk - робочий або письмовий стіл.' : 'В большинстве фраз урока стоит the: это сигнал конкретного предмета. Table - обычный стол. Desk - рабочий или письменный стол.'} />,
    <Table key="t11" t={t} f={f} rows={[
      ['table', 'The phone is on the table / The bag is under the table / The chair is next to the table'],
      ['desk', 'The tickets are on the desk / Put the wallet on the desk / My phone is on the desk'],
      ['the', 'the phone / the table / the bag / the chair / the shop / the hotel / the house / the car'],
    ]} />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Переклад не завжди дослівний' : '12. Перевод не всегда дословный'} />,
    <Body key="b12a" t={t} f={f} text={isUK ? 'В англійській часто використовується is або are, але українською або російською ми просто кажемо "телефон на столі", "ключі в сумці". Це нормально.' : 'В английском часто используется is или are, но по-русски мы просто говорим "телефон на столе", "ключи в сумке". Это нормально.'} />,
    <Table key="t12" t={t} f={f} rows={[
      [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
      ['The phone is on the table', isUK ? 'Телефон на столі' : 'Телефон на столе'],
      ['The keys are in the bag', isUK ? 'Ключі в сумці' : 'Ключи в сумке'],
      ['The door is behind me', isUK ? 'Двері позаду мене' : 'Дверь позади меня'],
      ['There is a key under the chair', isUK ? 'Під стільцем є ключ' : 'Под стулом есть ключ'],
      ['Put the bag next to the door', isUK ? 'Постав сумку поруч з дверима' : 'Поставь сумку рядом с дверью'],
    ]} />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Готові блоки з уроку' : '13. Готовые блоки из урока'} />,
    <Body key="b13a" t={t} f={f} text={isUK ? 'Предлоги місця краще вчити готовими блоками, тому що саме так вони швидше впізнаються в мовленні.' : 'Предлоги места лучше учить готовыми блоками, потому что именно так они быстрее узнаются в речи.'} />,
    <Table key="t13" t={t} f={f} rows={[
      [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
      ['on the table', isUK ? 'на столі' : 'на столе'],
      ['under the table', isUK ? 'під столом' : 'под столом'],
      ['in the bag', isUK ? 'у сумці' : 'в сумке'],
      ['near the phone', isUK ? 'поруч з телефоном' : 'рядом с телефоном'],
      ['inside the bag', isUK ? 'всередині сумки' : 'внутри сумки'],
      ['on the desk', isUK ? 'на робочому столі' : 'на рабочем столе'],
      ['next to the table', isUK ? 'поруч зі столом' : 'рядом со столом'],
      ['behind me', isUK ? 'позаду мене' : 'позади меня'],
      ['outside the house', isUK ? 'зовні будинку' : 'снаружи дома'],
      ['opposite the shop', isUK ? 'навпроти магазину' : 'напротив магазина'],
      ['above the table', isUK ? 'над столом' : 'над столом'],
      ['between the books', isUK ? 'між книгами' : 'между книгами'],
    ]} />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Найчастіші помилки' : '14. Самые частые ошибки'} />,
    <Warn key="w12" t={t} f={f} text={isUK ? '❌ The phone on the table → ✅ The phone is on the table. Потрібне is.' : '❌ The phone on the table → ✅ The phone is on the table. Нужно is.'} />,
    <Warn key="w13" t={t} f={f} text={isUK ? '❌ The keys is in the bag → ✅ The keys are in the bag. Keys - множина.' : '❌ The keys is in the bag → ✅ The keys are in the bag. Keys - множественное число.'} />,
    <Warn key="w14" t={t} f={f} text={isUK ? '❌ Is the keys in the bag? → ✅ Are the keys in the bag? У питанні з множиною потрібне are.' : '❌ Is the keys in the bag? → ✅ Are the keys in the bag? В вопросе с множественным числом нужно are.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ Put the keys on the bag, якщо ключі треба всередину → ✅ Put the keys in the bag. Всередину = in.' : '❌ Put the keys on the bag, если ключи нужно внутрь → ✅ Put the keys in the bag. Внутрь = in.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ Not sit on the bed → ✅ Do not sit on the bed. Для заборони потрібна форма Do not.' : '❌ Not sit on the bed → ✅ Do not sit on the bed. Для запрета нужна форма Do not.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ There are a key under the chair → ✅ There is a key under the chair. A key - один ключ.' : '❌ There are a key under the chair → ✅ There is a key under the chair. A key - один ключ.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ There is tickets in the bag → ✅ There are tickets in the bag. Tickets - множина.' : '❌ There is tickets in the bag → ✅ There are tickets in the bag. Tickets - множественное число.'} />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Що треба винести з уроку' : '15. Что нужно вынести из урока'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся описувати місце предмета. Для одного предмета використовуй is, для кількох - are. On = на поверхні, under = під, in = всередині, near = поруч, next to = прямо поруч, behind = позаду, opposite = навпроти, above = над, between = між.'
        : 'В этом уроке ты учишься описывать место предмета. Для одного предмета используй is, для нескольких - are. On = на поверхности, under = под, in = внутри, near = рядом, next to = прямо рядом, behind = позади, opposite = напротив, above = над, between = между.'
      }
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: The phone is on the table. Put the keys in the bag. There is a key under the chair.'
        : 'Перед практикой держи три модели: The phone is on the table. Put the keys in the bag. There is a key under the chair.'
      }
    />,
  ],
},

// ── УРОК 20 ──────────────────────────────────────────────────
20: {
  titleRU: 'Артикли: a, an, the',
  titleUK: 'Артиклі: a, an, the',
  titlePtBr: "Artigos: a, an, the",
  titleVi: "Mạo từ: a, an, the",
  titleId: "Artikel: a, an, the",
  titleTr: "Artikeller: a, an, the",
  titlePl: "Przedimki: a, an, the",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти тренуєш одну з найважливіших речей в англійській: як говорити про предмет уперше і як говорити про нього вдруге. Спочатку: a phone, a bag, a key. Потім, коли предмет уже відомий: the phone, the bag, the key.'
        : 'В этом уроке ты тренируешь одну из самых важных вещей в английском: как говорить о предмете впервые и как говорить о нём второй раз. Сначала: a phone, a bag, a key. Потом, когда предмет уже известен: the phone, the bag, the key.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Перше згадування' : 'Первое упоминание', isUK ? 'Потім цей самий предмет' : 'Потом этот же предмет'],
        ['I have a phone', 'The phone is on the table'],
        ['She has a bag', 'The bag is under the chair'],
        ['He has a key', 'The key is in the bag'],
        ['We bought a ticket', 'The ticket is in my wallet'],
        ['They found a charger', 'The charger is near the phone'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: a/an = один новий предмет. The = цей предмет уже відомий або конкретний.'
        : 'Главная идея: a/an = один новый предмет. The = этот предмет уже известен или конкретный.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. A = один новий предмет' : '2. A = один новый предмет'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'A ставиться перед одним звичайним предметом, коли ти вперше вводиш його в розмову: a phone, a bag, a key, a ticket.'
        : 'A ставится перед одним обычным предметом, когда ты впервые вводишь его в разговор: a phone, a bag, a key, a ticket.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        ['a + noun', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['a phone', 'I have a phone'],
        ['a bag', 'She has a bag'],
        ['a key', 'He has a key / There is a key on the desk'],
        ['a ticket', 'We bought a ticket'],
        ['a charger', 'They found a charger'],
        ['a passport', 'I need a passport'],
        ['a wallet', 'She found a wallet outside the shop'],
        ['a man', 'I saw a man near the hotel'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have phone → ✅ I have a phone. Якщо це один звичайний предмет і ти вводиш його вперше, потрібне a або an.'
        : '❌ I have phone → ✅ I have a phone. Если это один обычный предмет и ты вводишь его впервые, нужно a или an.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. An = один новий предмет перед голосним звуком' : '3. An = один новый предмет перед гласным звуком'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'An працює як a, але використовується перед голосним звуком. У цьому уроці є an idea, an app, an umbrella, an option.'
        : 'An работает как a, но используется перед гласным звуком. В этом уроке есть an idea, an app, an umbrella, an option.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        ['an + noun', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['an idea', 'He has an idea'],
        ['an app', 'We use an app'],
        ['an umbrella', 'I brought an umbrella'],
        ['an option', 'We chose an option'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ He has a idea → ✅ He has an idea. Перед idea потрібне an.'
        : '❌ He has a idea → ✅ He has an idea. Перед idea нужно an.'
      }
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ I brought a umbrella → ✅ I brought an umbrella. Перед umbrella потрібне an.'
        : '❌ I brought a umbrella → ✅ I brought an umbrella. Перед umbrella нужно an.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. The = цей конкретний предмет' : '4. The = этот конкретный предмет'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'The використовується, коли предмет уже відомий. Спочатку ти вводиш предмет через a/an, а потім говориш про нього як про конкретний предмет через the.'
        : 'The используется, когда предмет уже известен. Сначала ты вводишь предмет через a/an, а потом говоришь о нём как о конкретном предмете через the.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Спочатку новий предмет' : 'Сначала новый предмет', isUK ? 'Потім конкретний предмет' : 'Потом конкретный предмет'],
        ['I have a phone', 'The phone is on the table'],
        ['She has a bag', 'The bag is under the chair'],
        ['He has a key', 'The key is in the bag'],
        ['We bought a ticket', 'The ticket is in my wallet'],
        ['They found a charger', 'The charger is near the phone'],
        ['She wrote a letter', 'The letter is important'],
        ['He has an idea', 'The idea is good'],
        ['We use an app', 'The app works well'],
        ['I brought an umbrella', 'The umbrella is near the door'],
        ['We chose an option', 'The option was better'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have the phone, якщо телефон ще не відомий → ✅ I have a phone. Для першого згадування потрібне a.'
        : '❌ I have the phone, если телефон ещё не известен → ✅ I have a phone. Для первого упоминания нужно a.'
      }
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ A phone is on the table, якщо ми вже говоримо про той самий телефон → ✅ The phone is on the table.'
        : '❌ A phone is on the table, если мы уже говорим о том же телефоне → ✅ The phone is on the table.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. The + місце' : '5. The + место'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'У багатьох фразах уроку після the йде предмет, а потім місце: телефон на столі, сумка під стільцем, ключ у сумці.'
        : 'Во многих фразах урока после the идёт предмет, а потом место: телефон на столе, сумка под стулом, ключ в сумке.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['The phone is on the table', isUK ? 'phone уже конкретний' : 'phone уже конкретный'],
        ['The bag is under the chair', isUK ? 'bag уже конкретна' : 'bag уже конкретная'],
        ['The key is in the bag', isUK ? 'key уже конкретний' : 'key уже конкретный'],
        ['The ticket is in my wallet', isUK ? 'ticket уже конкретний' : 'ticket уже конкретный'],
        ['The charger is near the phone', isUK ? 'charger і phone уже конкретні' : 'charger и phone уже конкретные'],
        ['The passport is in the bag', isUK ? 'passport і bag уже зрозумілі' : 'passport и bag уже понятны'],
        ['The umbrella is near the door', isUK ? 'парасолька вже конкретна' : 'зонт уже конкретный'],
        ['The cup is on the desk', isUK ? 'cup уже конкретна' : 'cup уже конкретная'],
      ]}
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Без артикля: coffee, water, money, food' : '6. Без артикля: coffee, water, money, food'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Не всі слова отримують a або an. Якщо ми говоримо про речовину або загальне поняття, артикль часто не потрібен. У цьому уроці це coffee, water, money, food.'
        : 'Не все слова получают a или an. Если мы говорим о веществе или общем понятии, артикль часто не нужен. В этом уроке это coffee, water, money, food.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Без артикля' : 'Без артикля', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['coffee', 'I drink coffee / I do not drink coffee / There is coffee in the cup'],
        ['water', 'She drinks water'],
        ['money', 'We need money / We do not have money'],
        ['food', 'They buy food'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ I drink a coffee → ✅ I drink coffee. У фразі уроку coffee йде без a.'
        : '❌ I drink a coffee → ✅ I drink coffee. Во фразе урока coffee идёт без a.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ We need a money → ✅ We need money. Money не отримує a.'
        : '❌ We need a money → ✅ We need money. Money не получает a.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Множина без a/an' : '7. Множественное число без a/an'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'A або an означає один предмет. Якщо слово у множині, a/an не ставиться: books, documents, tickets, messages.'
        : 'A или an означает один предмет. Если слово во множественном числе, a/an не ставится: books, documents, tickets, messages.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Множина' : 'Множественное число', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['books', 'He reads books / There are books on the table'],
        ['messages', 'She sends messages'],
        ['documents', 'We check documents'],
        ['tickets', 'They sell tickets / Do they have tickets? / Are the tickets in the bag?'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ He reads a books → ✅ He reads books. Books - множина, тому a не потрібне.'
        : '❌ He reads a books → ✅ He reads books. Books - множественное число, поэтому a не нужен.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ We check a documents → ✅ We check documents. Documents - множина.'
        : '❌ We check a documents → ✅ We check documents. Documents - множественное число.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. A/an у Past Simple' : '8. A/an в Past Simple'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Артиклі працюють не тільки в теперішньому часі. У фразах уроку вони також з\'являються після дій у минулому: bought, found, wrote, brought, saw, chose.'
        : 'Артикли работают не только в настоящем времени. Во фразах урока они также появляются после действий в прошлом: bought, found, wrote, brought, saw, chose.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['We bought a ticket', isUK ? 'один новий ticket' : 'один новый ticket'],
        ['They found a charger', isUK ? 'один новий charger' : 'один новый charger'],
        ['She wrote a letter', isUK ? 'один новий лист' : 'одно новое письмо'],
        ['I brought an umbrella', isUK ? 'одна нова парасолька' : 'один новый зонт'],
        ['I saw a man near the hotel', isUK ? 'один новий man' : 'один новый man'],
        ['She found a wallet outside the shop', isUK ? 'один новий wallet' : 'один новый wallet'],
        ['We chose an option', isUK ? 'один новий option' : 'один новый option'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ He has a idea → ✅ He has an idea. Перед idea потрібне an.'
        : '❌ He has a idea → ✅ He has an idea. Перед idea нужно an.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Питання з артиклями' : '9. Вопросы с артиклями'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці артиклі з\'являються і в питаннях. Граматика питання лишається знайомою: Do you have...? Is the...? Does she have...? Are the...?'
        : 'В этом уроке артикли появляются и в вопросах. Грамматика вопроса остаётся знакомой: Do you have...? Is the...? Does she have...? Are the...?'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання' : 'Вопрос', isUK ? 'Що важливо' : 'Что важно'],
        ['Do you have a phone?', isUK ? 'a phone = один телефон' : 'a phone = один телефон'],
        ['Is the phone on the table?', isUK ? 'the phone = конкретний телефон' : 'the phone = конкретный телефон'],
        ['Does she have a bag?', isUK ? 'a bag = одна сумка' : 'a bag = одна сумка'],
        ['Is the bag under the chair?', isUK ? 'the bag = конкретна сумка' : 'the bag = конкретная сумка'],
        ['Do they have tickets?', isUK ? 'tickets = множина без a' : 'tickets = множественное число без a'],
        ['Are the tickets in the bag?', isUK ? 'the tickets = конкретні квитки' : 'the tickets = конкретные билеты'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ Do you have phone? → ✅ Do you have a phone? Один новий phone потребує a.'
        : '❌ Do you have phone? → ✅ Do you have a phone? Один новый phone требует a.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. There is / There are з артиклями' : '10. There is / There are с артиклями'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах There is / There are артиклі теж важливі. Один предмет часто йде з a/an. Множина або речовина йде без a/an.'
        : 'В фразах There is / There are артикли тоже важны. Один предмет часто идёт с a/an. Множественное число или вещество идёт без a/an.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один предмет' : 'Один предмет', isUK ? 'Множина / речовина' : 'Множественное число / вещество'],
        ['There is a key on the desk', 'There are books on the table'],
        ['There is a letter in my inbox', 'There is coffee in the cup'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ There is key on the desk → ✅ There is a key on the desk. Один key потребує a.'
        : '❌ There is key on the desk → ✅ There is a key on the desk. Один key требует a.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ There are a books on the table → ✅ There are books on the table. Books - множина.'
        : '❌ There are a books on the table → ✅ There are books on the table. Books - множественное число.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. The після There is / There are' : '11. The после There is / There are'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Після того як предмет з\'явився через There is або There are, наступна фраза може говорити про нього через the.'
        : 'После того как предмет появился через There is или There are, следующая фраза может говорить о нём через the.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Вводимо предмет' : 'Вводим предмет', isUK ? 'Говоримо про нього' : 'Говорим о нём'],
        ['There is a key on the desk', 'The key is small'],
        ['There is a letter in my inbox', 'The letter is from her'],
        ['There are books on the table', 'The books are old'],
        ['There is coffee in the cup', 'The cup is on the desk'],
        ['I saw a man near the hotel', 'The man was tired'],
        ['She found a wallet outside the shop', 'The wallet was empty'],
        ['We chose an option', 'The option was better'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Це головна механіка уроку: a/an вводить предмет, the повертає нас до цього предмета.'
        : 'Это главная механика урока: a/an вводит предмет, the возвращает нас к этому предмету.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. The з людиною: a man → the man' : '12. The с человеком: a man → the man'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Та сама логіка працює з людиною. Спочатку "я бачив чоловіка" - a man. Потім "цей чоловік був утомлений" - the man.'
        : 'Та же логика работает с человеком. Сначала "я видел мужчину" - a man. Потом "этот мужчина был уставшим" - the man.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        ['I saw a man near the hotel', 'The man was tired'],
        [isUK ? 'Я бачив чоловіка біля готелю' : 'Я видел мужчину около отеля', isUK ? 'Чоловік був втомлений' : 'Мужчина был уставшим'],
      ]}
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ I saw the man, якщо ми ще не знаємо, про якого чоловіка йдеться → ✅ I saw a man.'
        : '❌ I saw the man, если мы ещё не знаем, о каком мужчине речь → ✅ I saw a man.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. My wallet, my inbox' : '13. My wallet, my inbox'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку є my wallet і my inbox. My стоїть перед предметом і показує, що він мій.'
        : 'В фразах урока есть my wallet и my inbox. My стоит перед предметом и показывает, что он мой.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Переклад' : 'Перевод'],
        ['my wallet', isUK ? 'мій гаманець' : 'мой кошелёк'],
        ['my inbox', isUK ? 'моя поштова скринька / вхідні' : 'мой почтовый ящик / входящие'],
      ]}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'The ticket is in my wallet = квиток у моєму гаманці. Тут the ticket вже конкретний, а my wallet показує, чий гаманець.'
        : 'The ticket is in my wallet = билет в моём кошельке. Тут the ticket уже конкретный, а my wallet показывает, чей кошелёк.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. From her' : '14. From her'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразі The letter is from her блок from her означає "від неї". Her тут стоїть після прийменника from.'
        : 'Во фразе The letter is from her блок from her означает "от неё". Her здесь стоит после предлога from.'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="The letter is from her"
      rus={isUK ? 'Лист від неї' : 'Письмо от неё'}
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ The letter is from she → ✅ The letter is from her. Після from потрібна форма her.'
        : '❌ The letter is from she → ✅ The letter is from her. После from нужна форма her.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Місце в уроці: on, under, in, near, outside' : '15. Место в уроке: on, under, in, near, outside'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок про артиклі, але багато фраз одночасно повторюють місце. Тому важливо бачити готові блоки з on, under, in, near, outside.'
        : 'Урок про артикли, но много фраз одновременно повторяют место. Поэтому важно видеть готовые блоки с on, under, in, near, outside.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок місця' : 'Блок места', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['on the table', 'The phone is on the table / There are books on the table'],
        ['under the chair', 'The bag is under the chair'],
        ['in the bag', 'The key is in the bag / The passport is in the bag'],
        ['near the phone', 'The charger is near the phone'],
        ['near the door', 'The umbrella is near the door'],
        ['outside the shop', 'She found a wallet outside the shop'],
        ['near the hotel', 'I saw a man near the hotel'],
        ['in the cup', 'There is coffee in the cup'],
        ['on the desk', 'The cup is on the desk'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Готові блоки з уроку' : '16. Готовые блоки из урока'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'Артиклі краще тренувати через готові пари: a phone → the phone, a bag → the bag, a letter → the letter.'
        : 'Артикли лучше тренировать через готовые пары: a phone → the phone, a bag → the bag, a letter → the letter.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Пара' : 'Пара', isUK ? 'Логіка' : 'Логика'],
        ['a phone → the phone', isUK ? 'спочатку телефон, потім цей телефон' : 'сначала телефон, потом этот телефон'],
        ['a bag → the bag', isUK ? 'спочатку сумка, потім ця сумка' : 'сначала сумка, потом эта сумка'],
        ['a key → the key', isUK ? 'спочатку ключ, потім цей ключ' : 'сначала ключ, потом этот ключ'],
        ['a ticket → the ticket', isUK ? 'спочатку квиток, потім цей квиток' : 'сначала билет, потом этот билет'],
        ['a charger → the charger', isUK ? 'спочатку зарядка, потім ця зарядка' : 'сначала зарядка, потом эта зарядка'],
        ['a letter → the letter', isUK ? 'спочатку лист, потім цей лист' : 'сначала письмо, потом это письмо'],
        ['an idea → the idea', isUK ? 'спочатку ідея, потім ця ідея' : 'сначала идея, потом эта идея'],
        ['an app → the app', isUK ? 'спочатку застосунок, потім цей застосунок' : 'сначала приложение, потом это приложение'],
        ['an umbrella → the umbrella', isUK ? 'спочатку парасолька, потім ця парасолька' : 'сначала зонт, потом этот зонт'],
      ]}
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Переклад не завжди дослівний' : '17. Перевод не всегда дословный'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'Українською або російською ми часто не маємо окремого слова для a або the. Тому переклад може звучати однаково, але англійська все одно розрізняє новий предмет і вже відомий предмет.'
        : 'По-русски часто нет отдельного слова для a или the. Поэтому перевод может звучать одинаково, но английский всё равно различает новый предмет и уже известный предмет.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод', isUK ? 'Логіка' : 'Логика'],
        ['I have a phone', isUK ? 'У мене є телефон' : 'У меня есть телефон', isUK ? 'новий предмет у розмові' : 'новый предмет в разговоре'],
        ['The phone is on the table', isUK ? 'Телефон на столі' : 'Телефон на столе', isUK ? 'той самий телефон' : 'тот самый телефон'],
        ['She wrote a letter', isUK ? 'Вона написала листа' : 'Она написала письмо', isUK ? 'новий лист' : 'новое письмо'],
        ['The letter is important', isUK ? 'Лист важливий' : 'Письмо важное', isUK ? 'той самий лист' : 'то самое письмо'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Найчастіші помилки' : '18. Самые частые ошибки'} />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have phone → ✅ I have a phone. Один новий phone потребує a.'
        : '❌ I have phone → ✅ I have a phone. Один новый phone требует a.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ He has a idea → ✅ He has an idea. Перед idea потрібне an.'
        : '❌ He has a idea → ✅ He has an idea. Перед idea нужно an.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ We use a app → ✅ We use an app. Перед app потрібне an.'
        : '❌ We use a app → ✅ We use an app. Перед app нужно an.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ The charger is near phone → ✅ The charger is near the phone. Тут phone конкретний, тому the phone.'
        : '❌ The charger is near phone → ✅ The charger is near the phone. Тут phone конкретный, поэтому the phone.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ We need a money → ✅ We need money. Money без a.'
        : '❌ We need a money → ✅ We need money. Money без a.'
      }
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ There is letter in my inbox → ✅ There is a letter in my inbox. Один лист потребує a.'
        : '❌ There is letter in my inbox → ✅ There is a letter in my inbox. Одно письмо требует a.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ The letter is from she → ✅ The letter is from her. Після from потрібна форма her.'
        : '❌ The letter is from she → ✅ The letter is from her. После from нужна форма her.'
      }
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Що треба винести з уроку' : '19. Что нужно вынести из урока'} />,

    <Body
      key="b19a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці головна логіка така: a або an вводить один новий предмет. The повертає нас до вже відомого або конкретного предмета. Перед речовинами і загальними словами типу coffee, water, money, food a/an зазвичай не ставиться. Перед множиною типу books, documents, tickets a/an теж не ставиться.'
        : 'В этом уроке главная логика такая: a или an вводит один новый предмет. The возвращает нас к уже известному или конкретному предмету. Перед веществами и общими словами типа coffee, water, money, food a/an обычно не ставится. Перед множественным числом типа books, documents, tickets a/an тоже не ставится.'
      }
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: I have a phone. The phone is on the table. I drink coffee.'
        : 'Перед практикой держи три модели: I have a phone. The phone is on the table. I drink coffee.'
      }
    />,
  ],
},

// ── УРОК 21 ──────────────────────────────────────────────────
21: {
  titleRU: 'Неопределённые местоимения',
  titleUK: 'Неозначені займенники',
  titlePtBr: "Pronomes indefinidos",
  titleVi: "Đại từ bất định",
  titleId: "Kata ganti tak tentu",
  titleTr: "Belirsiz zamirler",
  titlePl: "Zaimki nieokreślone",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити про невідомих людей, відсутність людей, усіх людей, невідомі речі, нічого і все: хтось, ніхто, всі, щось, нічого, все.'
        : 'В этом уроке ты учишься говорить о неизвестных людях, отсутствии людей, всех людях, неизвестных вещах, ничего и всём: кто-то, никто, все, что-то, ничего, всё.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Група' : 'Группа', isUK ? 'Люди' : 'Люди', isUK ? 'Речі / ситуації' : 'Вещи / ситуации'],
        [isUK ? 'хтось / щось' : 'кто-то / что-то', 'someone / somebody', 'something'],
        [isUK ? 'хто-небудь / що-небудь' : 'кто-нибудь / что-нибудь', 'anyone / anybody', 'anything'],
        [isUK ? 'ніхто / нічого' : 'никто / ничего', 'no one / nobody', 'nothing'],
        [isUK ? 'всі / все' : 'все / всё', 'everyone / everybody', 'everything'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: some- частіше дає "хтось / щось", any- часто з\'являється в питаннях і запереченнях, no- вже несе заперечення, every- означає "усі / все".'
        : 'Главная идея: some- чаще даёт "кто-то / что-то", any- часто появляется в вопросах и отрицаниях, no- уже несёт отрицание, every- означает "все / всё".'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Someone / somebody = хтось' : '2. Someone / somebody = кто-то'} />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Someone і somebody — це не різні граматичні правила, а майже взаємозамінні слова. У вправах можна ставити і someone, і somebody: значення однакове. Someone звучить нейтральніше і трохи звичніше в письмі; somebody трохи розмовніше і живіше. Якщо немає особливої підказки, обирай someone, але somebody теж правильний варіант у цьому уроці.'
        : 'Someone и somebody — это не разные грамматические правила, а почти взаимозаменяемые слова. В упражнениях можно ставить и someone, и somebody: значение одно и то же. Someone звучит нейтральнее и чуть привычнее в письменной речи; somebody чуть разговорнее и живее. Если нет особой подсказки, выбирай someone, но somebody тоже правильный вариант в этом уроке.'
      }
    />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Someone і somebody означають "хтось". У цьому уроці вони використовуються, коли дія сталася, але ми не називаємо конкретну людину.'
        : 'Someone и somebody означают "кто-то". В этом уроке они используются, когда действие произошло, но мы не называем конкретного человека.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Someone called me', isUK ? 'Хтось подзвонив мені' : 'Кто-то позвонил мне'],
        ['Somebody knocked on the door', isUK ? 'Хтось постукав у двері' : 'Кто-то постучал в дверь'],
        ['We saw someone outside', isUK ? 'Ми побачили когось надворі' : 'Мы увидели кого-то снаружи'],
        ['Someone left a message', isUK ? 'Хтось залишив повідомлення' : 'Кто-то оставил сообщение'],
        ['Did someone take my phone?', isUK ? 'Хтось взяв мій телефон?' : 'Кто-то взял мой телефон?'],
        ['Someone found your keys', isUK ? 'Хтось знайшов твої ключі' : 'Кто-то нашёл твои ключи'],
        ['Somebody told me a story', isUK ? 'Хтось розповів мені історію' : 'Кто-то рассказал мне историю'],
        ['Somebody brought documents', isUK ? 'Хтось приніс документи' : 'Кто-то принёс документы'],
        ['Someone forgot a ticket', isUK ? 'Хтось забув квиток' : 'Кто-то забыл билет'],
        ['Someone saw your bag', isUK ? 'Хтось бачив твою сумку' : 'Кто-то видел твою сумку'],
      ]}
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. No one / nobody = ніхто' : '3. No one / nobody = никто'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'No one і nobody означають "ніхто". Важливо: вони вже містять заперечення. Тому після них не треба додавати did not або does not.'
        : 'No one и nobody означают "никто". Важно: они уже содержат отрицание. Поэтому после них не нужно добавлять did not или does not.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['No one knows it', isUK ? 'Ніхто цього не знає' : 'Никто этого не знает'],
        ['Nobody came yesterday', isUK ? 'Ніхто не прийшов учора' : 'Никто не пришёл вчера'],
        ['We saw nobody outside', isUK ? 'Ми нікого не побачили надворі' : 'Мы никого не увидели снаружи'],
        ['Nobody left a message', isUK ? 'Ніхто не залишив повідомлення' : 'Никто не оставил сообщение'],
        ['No one needs help', isUK ? 'Нікому не потрібна допомога' : 'Никому не нужна помощь'],
        ['Nobody is here', isUK ? 'Тут нікого немає' : 'Здесь никого нет'],
        ['No one is outside', isUK ? 'Надворі нікого немає' : 'Снаружи никого нет'],
        ['Nobody took your phone', isUK ? 'Ніхто не взяв твій телефон' : 'Никто не взял твой телефон'],
        ['Nobody helped them', isUK ? 'Ніхто не допоміг їм' : 'Никто не помог им'],
        ['No one told me anything', isUK ? 'Ніхто мені нічого не сказав' : 'Никто мне ничего не сказал'],
        ['Nobody saw my bag', isUK ? 'Ніхто не бачив мою сумку' : 'Никто не видел мою сумку'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ Nobody did not come yesterday → ✅ Nobody came yesterday. Nobody уже означає "ніхто", тому did not не потрібне.'
        : '❌ Nobody did not come yesterday → ✅ Nobody came yesterday. Nobody уже означает "никто", поэтому did not не нужно.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ No one does not know it → ✅ No one knows it. No one уже дає заперечення.'
        : '❌ No one does not know it → ✅ No one knows it. No one уже даёт отрицание.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Everyone / everybody = всі' : '4. Everyone / everybody = все'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Everyone і everybody означають "усі". Але граматично в англійській вони поводяться як однина: Everyone is ready, Everyone needs help.'
        : 'Everyone и everybody означают "все". Но грамматически в английском они ведут себя как единственное число: Everyone is ready, Everyone needs help.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['Everyone is ready', isUK ? 'потрібне is' : 'нужно is'],
        ['Everybody understands me', isUK ? 'understands з -s' : 'understands с -s'],
        ['Everyone needs help', isUK ? 'needs з -s' : 'needs с -s'],
        ['Everyone helped us', isUK ? 'Past Simple, форма helped однакова' : 'Past Simple, форма helped одинаковая'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ Everyone are ready → ✅ Everyone is ready. Everyone граматично поводиться як однина.'
        : '❌ Everyone are ready → ✅ Everyone is ready. Everyone грамматически ведёт себя как единственное число.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ Everybody understand me → ✅ Everybody understands me. З everybody у Present Simple потрібне -s.'
        : '❌ Everybody understand me → ✅ Everybody understands me. С everybody в Present Simple нужно -s.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Something / nothing / everything' : '5. Something / nothing / everything'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Слова з -thing говорять не про людей, а про речі, ситуації або ідеї: щось, нічого, все.'
        : 'Слова с -thing говорят не о людях, а о вещах, ситуациях или идеях: что-то, ничего, всё.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Фрази з уроку' : 'Фразы из урока'],
        ['something', 'Something happened / I found something / Something is wrong / I need something simple / She wants something better'],
        ['nothing', 'Nothing happened / I found nothing / Nothing is wrong / Nothing changed yesterday'],
        ['everything', 'Everything is okay / Everything is clear / Is everything clear? / Everything changed yesterday'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ Nothing did not happen → ✅ Nothing happened. Nothing уже несе заперечення.'
        : '❌ Nothing did not happen → ✅ Nothing happened. Nothing уже несёт отрицание.'
      }
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ Everything are okay → ✅ Everything is okay. Everything граматично однина.'
        : '❌ Everything are okay → ✅ Everything is okay. Everything грамматически единственное число.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Anyone / anybody у питаннях' : '6. Anyone / anybody в вопросах'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Anyone і anybody часто використовуються в питаннях, коли ми не знаємо, чи є така людина: хтось дзвонив? хтось бачив? хтось приніс?'
        : 'Anyone и anybody часто используются в вопросах, когда мы не знаем, есть ли такой человек: кто-нибудь звонил? кто-нибудь видел? кто-нибудь принёс?'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання з уроку' : 'Вопрос из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Did anyone call you?', isUK ? 'Хтось дзвонив тобі?' : 'Кто-нибудь звонил тебе?'],
        ['Did anybody see him?', isUK ? 'Хтось бачив його?' : 'Кто-нибудь видел его?'],
        ['Is anyone here?', isUK ? 'Тут хтось є?' : 'Здесь кто-нибудь есть?'],
        ['Did anyone find my keys?', isUK ? 'Хтось знайшов мої ключі?' : 'Кто-нибудь нашёл мои ключи?'],
        ['Did anybody bring documents?', isUK ? 'Хтось приніс документи?' : 'Кто-нибудь принёс документы?'],
        ['Did anyone see my bag?', isUK ? 'Хтось бачив мою сумку?' : 'Кто-нибудь видел мою сумку?'],
      ]}
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Anything у питаннях і запереченнях' : '7. Anything в вопросах и отрицаниях'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Anything означає "щось / що-небудь" у питаннях і "нічого" у запереченнях. Значення залежить від конструкції.'
        : 'Anything означает "что-нибудь" в вопросах и "ничего" в отрицаниях. Значение зависит от конструкции.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        [isUK ? 'питання' : 'вопрос', 'Did you hear anything?', isUK ? 'Ти щось чув?' : 'Ты что-нибудь слышал?'],
        [isUK ? 'заперечення' : 'отрицание', 'I do not need anything', isUK ? 'Мені нічого не потрібно' : 'Мне ничего не нужно'],
        [isUK ? 'заперечення' : 'отрицание', 'He does not want anything', isUK ? 'Він нічого не хоче' : 'Он ничего не хочет'],
        [isUK ? 'після no one' : 'после no one', 'No one told me anything', isUK ? 'Ніхто мені нічого не сказав' : 'Никто мне ничего не сказал'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ I do not need nothing → ✅ I do not need anything. Після do not у цій моделі використовуй anything.'
        : '❌ I do not need nothing → ✅ I do not need anything. После do not в этой модели используй anything.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Did + anyone/anybody/someone' : '8. Did + anyone/anybody/someone'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У Past Simple питаннях з anyone, anybody або someone використовується Did. Після Did основна дія стоїть у базовій формі: call, see, take, find, bring.'
        : 'В Past Simple вопросах с anyone, anybody или someone используется Did. После Did основное действие стоит в базовой форме: call, see, take, find, bring.'
      }
    />,

    <Tip
      key="tip8"
      t={t}
      f={f}
      text={isUK
        ? 'Anyone/anybody частіше звучить як нейтральне питання: хто-небудь взагалі? Someone/somebody можна використовувати, коли ситуація підказує, що хтось, імовірно, зробив дію. Did someone take my phone? = мовець бачить ситуацію і підозрює, що телефон хтось узяв.'
        : 'Anyone/anybody чаще звучит как нейтральный вопрос: кто-нибудь вообще? Someone/somebody можно использовать, когда ситуация подсказывает, что кто-то, вероятно, сделал действие. Did someone take my phone? = говорящий видит ситуацию и подозревает, что телефон кто-то взял.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання' : 'Вопрос', isUK ? 'Що важливо' : 'Что важно'],
        ['Did anyone call you?', 'call, не called'],
        ['Did anybody see him?', 'see, не saw'],
        ['Did someone take my phone?', 'take, не took'],
        ['Did anyone find my keys?', 'find, не found'],
        ['Did anybody bring documents?', 'bring, не brought'],
        ['Did anyone see my bag?', 'see, не saw'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did anyone called you? → ✅ Did anyone call you? Після Did дія в базовій формі.'
        : '❌ Did anyone called you? → ✅ Did anyone call you? После Did действие в базовой форме.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did anybody saw him? → ✅ Did anybody see him? Після Did не використовуємо Past Simple форму.'
        : '❌ Did anybody saw him? → ✅ Did anybody see him? После Did не используем Past Simple форму.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. No one / nobody з Past Simple без did not' : '9. No one / nobody с Past Simple без did not'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли no one або nobody є підметом, воно вже означає "ніхто". Дієслово після нього може стояти у Past Simple без did not: came, left, took, helped, brought.'
        : 'Когда no one или nobody является подлежащим, оно уже означает "никто". Глагол после него может стоять в Past Simple без did not: came, left, took, helped, brought.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['Nobody came yesterday', isUK ? 'came, без did not' : 'came, без did not'],
        ['Nobody left a message', isUK ? 'left, без did not' : 'left, без did not'],
        ['Nobody took your phone', isUK ? 'took, без did not' : 'took, без did not'],
        ['Nobody helped them', isUK ? 'helped, без did not' : 'helped, без did not'],
        ['Nobody brought documents', isUK ? 'brought, без did not' : 'brought, без did not'],
        ['Nobody forgot tickets', isUK ? 'forgot, без did not' : 'forgot, без did not'],
        ['Nobody saw my bag', isUK ? 'saw, без did not' : 'saw, без did not'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ Nobody did not take your phone → ✅ Nobody took your phone. Nobody уже означає "ніхто".'
        : '❌ Nobody did not take your phone → ✅ Nobody took your phone. Nobody уже означает "никто".'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. To Be з everything, anyone, nobody, someone' : '10. To Be с everything, anyone, nobody, someone'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Частина фраз уроку працює не з дією, а з To Be: is ready, is okay, is wrong, is clear, is here, is outside.'
        : 'Часть фраз урока работает не с действием, а с To Be: is ready, is okay, is wrong, is clear, is here, is outside.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Переклад' : 'Перевод'],
        ['Everyone is ready', isUK ? 'Всі готові' : 'Все готовы'],
        ['Everything is okay', isUK ? 'Все добре' : 'Всё в порядке'],
        ['Something is wrong', isUK ? 'Щось не так' : 'Что-то не так'],
        ['Nothing is wrong', isUK ? 'Нічого не так' : 'Ничего не так'],
        ['Everything is clear', isUK ? 'Все зрозуміло' : 'Всё понятно'],
        ['Is everything clear?', isUK ? 'Все зрозуміло?' : 'Всё понятно?'],
        ['Is anyone here?', isUK ? 'Тут хтось є?' : 'Здесь кто-нибудь есть?'],
        ['Nobody is here', isUK ? 'Тут нікого немає' : 'Здесь никого нет'],
        ['Someone is outside', isUK ? 'Хтось надворі' : 'Кто-то снаружи'],
        ['No one is outside', isUK ? 'Надворі нікого немає' : 'Снаружи никого нет'],
      ]}
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Something simple / something better' : '11. Something simple / something better'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'В англійській після something часто ставиться опис: something simple, something better. Українською або російською це звучить як "щось просте", "щось краще".'
        : 'В английском после something часто ставится описание: something simple, something better. По-русски это звучит как "что-то простое", "что-то лучше".'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        ['I need something simple', isUK ? 'Мені потрібно щось просте' : 'Мне нужно что-то простое'],
        ['She wants something better', isUK ? 'Вона хоче щось краще' : 'Она хочет что-то лучше'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ Simple something → ✅ something simple. Опис після something.'
        : '❌ Simple something → ✅ something simple. Описание после something.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. My / your у фразах уроку' : '12. My / your в фразах урока'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У кількох фразах уроку є my і your. Вони стоять перед предметом: my phone, your phone, my keys, your keys, my bag, your bag.'
        : 'В нескольких фразах урока есть my и your. Они стоят перед предметом: my phone, your phone, my keys, your keys, my bag, your bag.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        ['my phone', 'Did someone take my phone?'],
        ['your phone', 'Nobody took your phone'],
        ['my keys', 'Did anyone find my keys?'],
        ['your keys', 'Someone found your keys'],
        ['my bag', 'Did anyone see my bag?'],
        ['your bag', 'Someone saw your bag'],
      ]}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Me, you, him, us, them після дії' : '13. Me, you, him, us, them после действия'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Після дії може стояти людина, на яку спрямована дія: called me, understands me, call you, see him, helped us, helped them.'
        : 'После действия может стоять человек, на которого направлено действие: called me, understands me, call you, see him, helped us, helped them.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        ['me', 'Someone called me / Everybody understands me / Somebody told me a story'],
        ['you', 'Did anyone call you?'],
        ['him', 'Did anybody see him?'],
        ['us', 'Everyone helped us'],
        ['them', 'Nobody helped them'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ Everybody understands I → ✅ Everybody understands me. Після understands потрібна форма me.'
        : '❌ Everybody understands I → ✅ Everybody understands me. После understands нужна форма me.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Told me a story / told me anything' : '14. Told me a story / told me anything'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Tell у минулому стає told. У фразах уроку після told стоїть людина, кому сказали, а потім інформація: told me a story, told me anything.'
        : 'Tell в прошлом становится told. В фразах урока после told стоит человек, кому сказали, а потом информация: told me a story, told me anything.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        ['Somebody told me a story', isUK ? 'хтось розповів мені історію' : 'кто-то рассказал мне историю'],
        ['No one told me anything', isUK ? 'ніхто мені нічого не сказав' : 'никто мне ничего не сказал'],
      ]}
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ No one told I anything → ✅ No one told me anything. Після told потрібна форма me.'
        : '❌ No one told I anything → ✅ No one told me anything. После told нужна форма me.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Переклад не завжди дослівний' : '15. Перевод не всегда дословный'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'Українська і російська часто використовують подвійне заперечення: "ніхто не прийшов", "нічого не сталося". Англійська в цьому уроці часто має одне заперечне слово: nobody, no one, nothing.'
        : 'Русский часто использует двойное отрицание: "никто не пришёл", "ничего не случилось". Английский в этом уроке часто имеет одно отрицательное слово: nobody, no one, nothing.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод', isUK ? 'Що важливо' : 'Что важно'],
        ['Nobody came yesterday', isUK ? 'Ніхто не прийшов учора' : 'Никто не пришёл вчера', isUK ? 'в англійській без did not' : 'в английском без did not'],
        ['Nothing happened', isUK ? 'Нічого не сталося' : 'Ничего не случилось', isUK ? 'nothing уже заперечне' : 'nothing уже отрицательное'],
        ['No one knows it', isUK ? 'Ніхто цього не знає' : 'Никто этого не знает', isUK ? 'no one уже заперечне' : 'no one уже отрицательное'],
        ['I do not need anything', isUK ? 'Мені нічого не потрібно' : 'Мне ничего не нужно', 'do not + anything'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Найчастіші помилки' : '16. Самые частые ошибки'} />,

    <Warn key="w14" t={t} f={f} text={isUK ? '❌ Someone call me → ✅ Someone called me. У фразі уроку дія в минулому: called.' : '❌ Someone call me → ✅ Someone called me. Во фразе урока действие в прошлом: called.'} />,
    <Warn key="w15" t={t} f={f} text={isUK ? '❌ No one know it → ✅ No one knows it. З no one у Present Simple потрібне -s.' : '❌ No one know it → ✅ No one knows it. С no one в Present Simple нужно -s.'} />,
    <Warn key="w16" t={t} f={f} text={isUK ? '❌ Nobody did not come yesterday → ✅ Nobody came yesterday. Nobody уже несе заперечення.' : '❌ Nobody did not come yesterday → ✅ Nobody came yesterday. Nobody уже несёт отрицание.'} />,
    <Warn key="w17" t={t} f={f} text={isUK ? '❌ Everyone are ready → ✅ Everyone is ready. Everyone бере is.' : '❌ Everyone are ready → ✅ Everyone is ready. Everyone берёт is.'} />,
    <Warn key="w18" t={t} f={f} text={isUK ? '❌ Did anyone called you? → ✅ Did anyone call you? Після Did дія без минулої форми.' : '❌ Did anyone called you? → ✅ Did anyone call you? После Did действие без прошедшей формы.'} />,
    <Warn key="w19" t={t} f={f} text={isUK ? '❌ I found anything, якщо це звичайне ствердження → ✅ I found something. У ствердженні зазвичай something.' : '❌ I found anything, если это обычное утверждение → ✅ I found something. В утверждении обычно something.'} />,
    <Warn key="w20" t={t} f={f} text={isUK ? '❌ I do not need nothing → ✅ I do not need anything. Після do not використовуй anything.' : '❌ I do not need nothing → ✅ I do not need anything. После do not используй anything.'} />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Що треба винести з уроку' : '17. Что нужно вынести из урока'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся працювати з невизначеними словами. Someone/somebody = хтось. Anyone/anybody = хтось у питаннях або хто-небудь. No one/nobody = ніхто. Everyone/everybody = всі, але граматично як однина. Something = щось. Anything = щось у питаннях або нічого в запереченнях. Nothing = нічого. Everything = все.'
        : 'В этом уроке ты учишься работать с неопределёнными словами. Someone/somebody = кто-то. Anyone/anybody = кто-нибудь в вопросах. No one/nobody = никто. Everyone/everybody = все, но грамматически как единственное число. Something = что-то. Anything = что-нибудь в вопросах или ничего в отрицаниях. Nothing = ничего. Everything = всё.'
      }
    />,

    <Tip
      key="tipFinal"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай чотири моделі: Someone called me. Did anyone call you? Nobody came yesterday. Everything is okay.'
        : 'Перед практикой держи четыре модели: Someone called me. Did anyone call you? Nobody came yesterday. Everything is okay.'
      }
    />,
  ],
},

// ── УРОК 22 ──────────────────────────────────────────────────
22: {
  titleRU: 'Герундий: -ing как действие-идея',
  titleUK: 'Герундій: -ing як дія-ідея',
  titlePtBr: "Gerúndio: -ing como ideia de ação",
  titleVi: "Danh động từ: -ing như một ý hành động",
  titleId: "Gerund: -ing sebagai ide tindakan",
  titleTr: "Gerund: eylem fikri olarak -ing",
  titlePl: "Gerund: -ing jako idea czynności",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся використовувати дію як ідею або заняття: читання допомагає, готування займає час, чекати складно, мені подобається читати, я ненавиджу чекати.'
        : 'В этом уроке ты учишься использовать действие как идею или занятие: чтение помогает, готовка занимает время, ждать сложно, мне нравится читать, я ненавижу ждать.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайна дія' : 'Обычное действие', isUK ? 'Дія як ідея' : 'Действие как идея'],
        ['I read', 'Reading helps'],
        ['I cook', 'Cooking takes time'],
        ['I wait', 'Waiting is hard'],
        ['I learn English', 'Learning English is useful'],
        ['I drive', 'Driving can be dangerous'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: -ing тут не означає “зараз роблю”. Тут -ing перетворює дію на ідею: reading = читання / читати.'
        : 'Главная идея: -ing здесь не означает “сейчас делаю”. Здесь -ing превращает действие в идею: reading = чтение / читать.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Не плутай з Present Continuous' : '2. Не путай с Present Continuous'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок 17 був про дію зараз: I am reading now. Урок 22 про дію як поняття: Reading helps. Якщо перед -ing немає am/is/are, це не Present Continuous.'
        : 'Урок 17 был про действие сейчас: I am reading now. Урок 22 про действие как понятие: Reading helps. Если перед -ing нет am/is/are, это не Present Continuous.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Дія зараз' : 'Действие сейчас', isUK ? 'Дія як ідея' : 'Действие как идея'],
        ['I am reading now', 'Reading helps'],
        ['He is cooking dinner', 'Cooking takes time'],
        ['We are waiting here', 'Waiting is hard'],
        ['They are watching TV', 'They enjoy watching TV'],
      ]}
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. -ing як підмет речення' : '3. -ing как подлежащее предложения'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли -ing стоїть на початку фрази, воно часто працює як підмет: читання, готування, чекання, навчання, водіння.'
        : 'Когда -ing стоит в начале фразы, оно часто работает как подлежащее: чтение, готовка, ожидание, обучение, вождение.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Reading helps', isUK ? 'Читання допомагає' : 'Чтение помогает'],
        ['Cooking takes time', isUK ? 'Готування займає час' : 'Готовка занимает время'],
        ['Waiting is hard', isUK ? 'Чекати складно' : 'Ждать сложно'],
        ['Learning English is useful', isUK ? 'Вчити англійську корисно' : 'Учить английский полезно'],
        ['Driving can be dangerous', isUK ? 'Водити машину може бути небезпечно' : 'Водить машину может быть опасно'],
        ['Walking is good for you', isUK ? 'Ходьба корисна для тебе' : 'Ходьба полезна для тебя'],
        ['Running is not easy', isUK ? 'Бігати непросто' : 'Бегать непросто'],
        ['Sleeping helps your body', isUK ? 'Сон допомагає твоєму тілу' : 'Сон помогает твоему телу'],
        ['Listening helps me learn', isUK ? 'Слухання допомагає мені вчитися' : 'Слушание помогает мне учиться'],
        ['Speaking takes practice', isUK ? 'Говоріння вимагає практики' : 'Говорение требует практики'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ Read helps → ✅ Reading helps. Якщо дія стала підметом, потрібна форма -ing.'
        : '❌ Read helps → ✅ Reading helps. Если действие стало подлежащим, нужна форма -ing.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Коли -ing стоїть на початку, дієслово часто має -s' : '4. Когда -ing стоит в начале, глагол часто имеет -s'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Reading, cooking, sleeping, listening, speaking працюють як одна ідея. Тому після них у Present Simple часто стоїть дієслово з -s: helps, takes, feels.'
        : 'Reading, cooking, sleeping, listening, speaking работают как одна идея. Поэтому после них в Present Simple часто стоит глагол с -s: helps, takes, feels.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Дія після нього' : 'Действие после него', isUK ? 'Фраза' : 'Фраза'],
        ['Reading', 'helps', 'Reading helps'],
        ['Cooking', 'takes', 'Cooking takes time'],
        ['Sleeping', 'helps', 'Sleeping helps your body'],
        ['Listening', 'helps', 'Listening helps me learn'],
        ['Speaking', 'takes', 'Speaking takes practice'],
        ['Cleaning', 'takes', 'Cleaning takes time'],
        ['Helping people', 'feels', 'Helping people feels good'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ Reading help → ✅ Reading helps. Reading як підмет поводиться як одна річ, тому helps.'
        : '❌ Reading help → ✅ Reading helps. Reading как подлежащее ведёт себя как одна вещь, поэтому helps.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Довші -ing блоки' : '5. Более длинные -ing блоки'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? '-ing може мати продовження: Learning English, Working at night, Studying every day, Waiting outside, Helping people. Уся ця частина працює як один великий підмет.'
        : '-ing может иметь продолжение: Learning English, Working at night, Studying every day, Waiting outside, Helping people. Вся эта часть работает как одно большое подлежащее.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Довгий -ing блок' : 'Длинный -ing блок', isUK ? 'Що означає' : 'Что означает', isUK ? 'Приклад' : 'Пример'],
        ['Learning English', isUK ? 'вивчення англійської / вчити англійську' : 'изучение английского / учить английский', 'Learning English is useful'],
        ['Working at night', isUK ? 'робота вночі / працювати вночі' : 'работа ночью / работать ночью', 'Working at night is hard'],
        ['Studying every day', isUK ? 'навчання щодня / вчитися щодня' : 'учёба каждый день / учиться каждый день', 'Studying every day helps'],
        ['Waiting outside', isUK ? 'чекати надворі' : 'ждать снаружи', 'Waiting outside is cold'],
        ['Helping people', isUK ? 'допомагати людям' : 'помогать людям', 'Helping people feels good'],
      ]}
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Enjoy + -ing' : '6. Enjoy + -ing'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Після enjoy у фразах уроку стоїть -ing. Не enjoy to read, а enjoy reading.'
        : 'После enjoy во фразах урока стоит -ing. Не enjoy to read, а enjoy reading.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I enjoy reading', isUK ? 'Мені подобається читати' : 'Мне нравится читать'],
        ['She enjoys cooking', isUK ? 'Їй подобається готувати' : 'Ей нравится готовить'],
        ['We enjoy learning English', isUK ? 'Нам подобається вчити англійську' : 'Нам нравится учить английский'],
        ['They enjoy watching TV', isUK ? 'Їм подобається дивитися телевізор' : 'Им нравится смотреть телевизор'],
        ['Do you enjoy working here?', isUK ? 'Тобі подобається працювати тут?' : 'Тебе нравится работать здесь?'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ I enjoy to read → ✅ I enjoy reading. Після enjoy у цьому уроці використовуй -ing.'
        : '❌ I enjoy to read → ✅ I enjoy reading. После enjoy в этом уроке используй -ing.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ She enjoy cooking → ✅ She enjoys cooking. З she потрібне enjoys.'
        : '❌ She enjoy cooking → ✅ She enjoys cooking. С she нужно enjoys.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Like + -ing' : '7. Like + -ing'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Після like у цьому уроці теж стоїть -ing. Це означає, що тобі подобається саме заняття.'
        : 'После like в этом уроке тоже стоит -ing. Это означает, что тебе нравится именно занятие.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I like driving', isUK ? 'Мені подобається водити машину' : 'Мне нравится водить машину'],
        ['He likes helping people', isUK ? 'Йому подобається допомагати людям' : 'Ему нравится помогать людям'],
        ['She likes writing messages', isUK ? 'Їй подобається писати повідомлення' : 'Ей нравится писать сообщения'],
        ['We like listening to music', isUK ? 'Нам подобається слухати музику' : 'Нам нравится слушать музыку'],
        ['They like travelling', isUK ? 'Їм подобається подорожувати' : 'Им нравится путешествовать'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ We like listen to music → ✅ We like listening to music. Після like потрібна -ing форма.'
        : '❌ We like listen to music → ✅ We like listening to music. После like нужна -ing форма.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Hate + -ing' : '8. Hate + -ing'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Після hate у фразах уроку також стоїть -ing. Це означає, що людина ненавидить заняття або ситуацію.'
        : 'После hate во фразах урока тоже стоит -ing. Это означает, что человек ненавидит занятие или ситуацию.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I hate waiting', isUK ? 'Я ненавиджу чекати' : 'Я ненавижу ждать'],
        ['She hates losing money', isUK ? 'Вона ненавидить втрачати гроші' : 'Она ненавидит терять деньги'],
        ['We hate wasting time', isUK ? 'Ми ненавидимо витрачати час даремно' : 'Мы ненавидим тратить время зря'],
        ['Do you hate cleaning?', isUK ? 'Ти ненавидиш прибирати?' : 'Ты ненавидишь убирать?'],
        ['He hates being late', isUK ? 'Він ненавидить запізнюватися' : 'Он ненавидит опаздывать'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ He hates be late → ✅ He hates being late. Після hates потрібна -ing форма.'
        : '❌ He hates be late → ✅ He hates being late. После hates нужна -ing форма.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Finish + -ing' : '9. Finish + -ing'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Після finish у цьому уроці стоїть -ing. Значення: закінчити робити щось.'
        : 'После finish в этом уроке стоит -ing. Значение: закончить делать что-то.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I finished working', isUK ? 'Я закінчив працювати' : 'Я закончил работать'],
        ['She finished writing', isUK ? 'Вона закінчила писати' : 'Она закончила писать'],
        ['We finished cleaning', isUK ? 'Ми закінчили прибирати' : 'Мы закончили убирать'],
        ['They finished checking documents', isUK ? 'Вони закінчили перевіряти документи' : 'Они закончили проверять документы'],
        ['Did you finish reading?', isUK ? 'Ти закінчив читати?' : 'Ты закончил читать?'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ I finished to work → ✅ I finished working. Після finish у цьому уроці потрібне -ing.'
        : '❌ I finished to work → ✅ I finished working. После finish в этом уроке нужно -ing.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Stop + -ing' : '10. Stop + -ing'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Stop + -ing означає перестати робити дію. У цьому уроці це: stop talking, stop waiting, stopped calling, stopped using, stopped watching.'
        : 'Stop + -ing означает перестать делать действие. В этом уроке это: stop talking, stop waiting, stopped calling, stopped using, stopped watching.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['Stop talking', isUK ? 'Перестань говорити' : 'Перестань говорить'],
        ['Stop waiting here', isUK ? 'Перестань чекати тут' : 'Перестань ждать здесь'],
        ['He stopped calling her', isUK ? 'Він перестав їй дзвонити' : 'Он перестал звонить ей'],
        ['We stopped using cash', isUK ? 'Ми перестали використовувати готівку' : 'Мы перестали использовать наличные'],
        ['They stopped watching TV', isUK ? 'Вони перестали дивитися телевізор' : 'Они перестали смотреть телевизор'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ Stop to talk → ✅ Stop talking. У цьому значенні stop + -ing = перестати робити дію.'
        : '❌ Stop to talk → ✅ Stop talking. В этом значении stop + -ing = перестать делать действие.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Avoid + -ing' : '11. Avoid + -ing'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Avoid означає “уникати”. Після avoid у фразах уроку стоїть -ing: avoid spending, avoids driving, avoid wasting.'
        : 'Avoid означает “избегать”. После avoid во фразах урока стоит -ing: avoid spending, avoids driving, avoid wasting.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I avoid spending money', isUK ? 'Я уникаю витрачати гроші' : 'Я избегаю тратить деньги'],
        ['She avoids driving at night', isUK ? 'Вона уникає водити вночі' : 'Она избегает водить ночью'],
        ['We avoid wasting time', isUK ? 'Ми уникаємо витрачати час даремно' : 'Мы избегаем тратить время зря'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ I avoid to spend money → ✅ I avoid spending money. Після avoid потрібна -ing форма.'
        : '❌ I avoid to spend money → ✅ I avoid spending money. После avoid нужна -ing форма.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Keep + -ing' : '12. Keep + -ing'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Keep + -ing означає продовжувати робити дію знову і знову або не зупинятися.'
        : 'Keep + -ing означает продолжать делать действие снова и снова или не останавливаться.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['He keeps calling me', isUK ? 'Він продовжує дзвонити мені' : 'Он продолжает звонить мне'],
        ['They keep asking questions', isUK ? 'Вони продовжують ставити запитання' : 'Они продолжают задавать вопросы'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ He keeps call me → ✅ He keeps calling me. Після keeps потрібна -ing форма.'
        : '❌ He keeps call me → ✅ He keeps calling me. После keeps нужна -ing форма.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Suggest + -ing' : '13. Suggest + -ing'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Suggest означає “запропонувати”. У фразах уроку після suggested стоїть -ing: meeting later, ordering food.'
        : 'Suggest означает “предложить”. Во фразах урока после suggested стоит -ing: meeting later, ordering food.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['She suggested meeting later', isUK ? 'Вона запропонувала зустрітися пізніше' : 'Она предложила встретиться позже'],
        ['We suggested ordering food', isUK ? 'Ми запропонували замовити їжу' : 'Мы предложили заказать еду'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ She suggested to meet later → ✅ She suggested meeting later. Після suggest у цьому уроці потрібне -ing.'
        : '❌ She suggested to meet later → ✅ She suggested meeting later. После suggest в этом уроке нужно -ing.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Thank you for + -ing' : '14. Thank you for + -ing'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Після for часто стоїть -ing. У цьому уроці це формула подяки: Thank you for helping me, Thank you for waiting.'
        : 'После for часто стоит -ing. В этом уроке это формула благодарности: Thank you for helping me, Thank you for waiting.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['Thank you for helping me', isUK ? 'Дякую, що допоміг мені' : 'Спасибо, что помог мне'],
        ['Thank you for waiting', isUK ? 'Дякую, що почекав' : 'Спасибо, что подождал'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ Thank you for help me → ✅ Thank you for helping me. Після for потрібне helping.'
        : '❌ Thank you for help me → ✅ Thank you for helping me. После for нужно helping.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Being late' : '15. Being late'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'Being late означає “запізнюватися / бути тим, хто запізнюється”. Це -ing форма від be, і в уроці вона стоїть після hates.'
        : 'Being late означает “опаздывать / быть тем, кто опаздывает”. Это -ing форма от be, и в уроке она стоит после hates.'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="He hates being late"
      rus={isUK ? 'Він ненавидить запізнюватися' : 'Он ненавидит опаздывать'}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Listening to music: to залишається' : '16. Listening to music: to остаётся'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'Якщо базовий блок має прийменник, він залишається і з -ing. Listen to music стає listening to music.'
        : 'Если базовый блок имеет предлог, он остаётся и с -ing. Listen to music становится listening to music.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базовий блок' : 'Базовый блок', '-ing', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['listen to music', 'listening to music', 'We like listening to music'],
        ['wait here', 'waiting here', 'Stop waiting here'],
        ['work here', 'working here', 'Do you enjoy working here?'],
        ['work at night', 'working at night', 'Working at night is hard'],
        ['drive at night', 'driving at night', 'She avoids driving at night'],
      ]}
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ We like listening music → ✅ We like listening to music. To залишається після listening.'
        : '❌ We like listening music → ✅ We like listening to music. To остаётся после listening.'
      }
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Як -ing утворюється в словах уроку' : '17. Как -ing образуется в словах урока'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'У більшості слів просто додаємо -ing. Але є слова, де змінюється написання: write → writing, travel → travelling, be → being.'
        : 'В большинстве слов просто добавляем -ing. Но есть слова, где меняется написание: write → writing, travel → travelling, be → being.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова дія' : 'Базовое действие', '-ing', isUK ? 'Приклад' : 'Пример'],
        ['read', 'reading', 'I enjoy reading'],
        ['cook', 'cooking', 'She enjoys cooking'],
        ['learn', 'learning', 'We enjoy learning English'],
        ['watch', 'watching', 'They enjoy watching TV'],
        ['drive', 'driving', 'I like driving'],
        ['help', 'helping', 'He likes helping people'],
        ['write', 'writing', 'She likes writing messages / She finished writing'],
        ['listen', 'listening', 'We like listening to music'],
        ['travel', 'travelling', 'They like travelling'],
        ['wait', 'waiting', 'I hate waiting'],
        ['lose', 'losing', 'She hates losing money'],
        ['waste', 'wasting', 'We hate wasting time'],
        ['be', 'being', 'He hates being late'],
        ['spend', 'spending', 'I avoid spending money'],
        ['use', 'using', 'We stopped using cash'],
        ['meet', 'meeting', 'She suggested meeting later'],
        ['order', 'ordering', 'We suggested ordering food'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Обʼєкти після -ing' : '18. Объекты после -ing'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'Після -ing дії може стояти предмет або людина: English, TV, people, messages, music, money, documents, her, me.'
        : 'После -ing действия может стоять предмет или человек: English, TV, people, messages, music, money, documents, her, me.'
      }
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Що після -ing' : 'Что после -ing'],
        ['learning English', 'English'],
        ['watching TV', 'TV'],
        ['helping people', 'people'],
        ['writing messages', 'messages'],
        ['listening to music', 'music'],
        ['losing money', 'money'],
        ['wasting time', 'time'],
        ['checking documents', 'documents'],
        ['calling her', 'her'],
        ['helping me', 'me'],
      ]}
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ He stopped calling she → ✅ He stopped calling her. Після calling потрібна форма her.'
        : '❌ He stopped calling she → ✅ He stopped calling her. После calling нужна форма her.'
      }
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Готові блоки з уроку' : '19. Готовые блоки из урока'} />,

    <Body
      key="b19a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці краще впізнавати готові -ing блоки, а не окремі слова.'
        : 'В этом уроке лучше узнавать готовые -ing блоки, а не отдельные слова.'
      }
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['reading helps', isUK ? 'читання допомагає' : 'чтение помогает'],
        ['cooking takes time', isUK ? 'готування займає час' : 'готовка занимает время'],
        ['waiting is hard', isUK ? 'чекати складно' : 'ждать сложно'],
        ['learning English is useful', isUK ? 'вчити англійську корисно' : 'учить английский полезно'],
        ['driving can be dangerous', isUK ? 'водити може бути небезпечно' : 'водить может быть опасно'],
        ['walking is good for you', isUK ? 'ходьба корисна для тебе' : 'ходьба полезна для тебя'],
        ['sleeping helps your body', isUK ? 'сон допомагає тілу' : 'сон помогает телу'],
        ['speaking takes practice', isUK ? 'говоріння вимагає практики' : 'говорение требует практики'],
        ['working at night is hard', isUK ? 'працювати вночі складно' : 'работать ночью сложно'],
        ['studying every day helps', isUK ? 'навчання щодня допомагає' : 'учёба каждый день помогает'],
      ]}
    />,

    <Table
      key="t19"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['enjoy reading', isUK ? 'подобається читати' : 'нравится читать'],
        ['enjoys cooking', isUK ? 'подобається готувати' : 'нравится готовить'],
        ['enjoy learning English', isUK ? 'подобається вчити англійську' : 'нравится учить английский'],
        ['like driving', isUK ? 'подобається водити' : 'нравится водить'],
        ['likes helping people', isUK ? 'подобається допомагати людям' : 'нравится помогать людям'],
        ['hate waiting', isUK ? 'ненавиджу чекати' : 'ненавижу ждать'],
        ['hates being late', isUK ? 'ненавидить запізнюватися' : 'ненавидит опаздывать'],
        ['finished checking documents', isUK ? 'закінчили перевіряти документи' : 'закончили проверять документы'],
        ['stopped using cash', isUK ? 'перестали використовувати готівку' : 'перестали использовать наличные'],
        ['avoid spending money', isUK ? 'уникаю витрачати гроші' : 'избегаю тратить деньги'],
      ]}
    />,

    <Section key="s20" t={t} f={f} title={isUK ? '20. Переклад не завжди дослівний' : '20. Перевод не всегда дословный'} />,

    <Body
      key="b20a"
      t={t}
      f={f}
      text={isUK
        ? 'Англійська часто використовує -ing там, де українською або російською природніше звучить інфінітив: читати, чекати, працювати, готувати.'
        : 'Английский часто использует -ing там, где по-русски естественнее звучит инфинитив: читать, ждать, работать, готовить.'
      }
    />,

    <Table
      key="t20"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I enjoy reading', isUK ? 'Мені подобається читати' : 'Мне нравится читать'],
        ['Do you enjoy working here?', isUK ? 'Тобі подобається працювати тут?' : 'Тебе нравится работать здесь?'],
        ['I hate waiting', isUK ? 'Я ненавиджу чекати' : 'Я ненавижу ждать'],
        ['I finished working', isUK ? 'Я закінчив працювати' : 'Я закончил работать'],
        ['Stop talking', isUK ? 'Перестань говорити' : 'Перестань говорить'],
        ['She suggested meeting later', isUK ? 'Вона запропонувала зустрітися пізніше' : 'Она предложила встретиться позже'],
        ['Thank you for helping me', isUK ? 'Дякую, що допоміг мені' : 'Спасибо, что помог мне'],
      ]}
    />,

    <Section key="s21" t={t} f={f} title={isUK ? '21. Найчастіші помилки' : '21. Самые частые ошибки'} />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ Read helps → ✅ Reading helps. Коли дія стала ідеєю, потрібне -ing.'
        : '❌ Read helps → ✅ Reading helps. Когда действие стало идеей, нужно -ing.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ Cooking take time → ✅ Cooking takes time. Cooking як підмет поводиться як одна річ.'
        : '❌ Cooking take time → ✅ Cooking takes time. Cooking как подлежащее ведёт себя как одна вещь.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ She enjoys cook → ✅ She enjoys cooking. Після enjoys потрібне -ing.'
        : '❌ She enjoys cook → ✅ She enjoys cooking. После enjoys нужно -ing.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ I enjoy to read → ✅ I enjoy reading. У цьому уроці після enjoy потрібне -ing.'
        : '❌ I enjoy to read → ✅ I enjoy reading. В этом уроке после enjoy нужно -ing.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ She suggested to meet later → ✅ She suggested meeting later. Після suggest потрібне -ing.'
        : '❌ She suggested to meet later → ✅ She suggested meeting later. После suggest нужно -ing.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ Thank you for help me → ✅ Thank you for helping me. Після for потрібне -ing.'
        : '❌ Thank you for help me → ✅ Thank you for helping me. После for нужно -ing.'
      }
    />,

    <Section key="s22" t={t} f={f} title={isUK ? '22. Що треба винести з уроку' : '22. Что нужно вынести из урока'} />,

    <Body
      key="b22a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці -ing працює не як “дія зараз”, а як дія-ідея або дія після певного дієслова. Reading helps. I enjoy reading. I hate waiting. I finished working. Stop talking. I avoid spending money. Thank you for helping me.'
        : 'В этом уроке -ing работает не как “действие сейчас”, а как действие-идея или действие после определённого глагола. Reading helps. I enjoy reading. I hate waiting. I finished working. Stop talking. I avoid spending money. Thank you for helping me.'
      }
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай чотири моделі: Reading helps. I enjoy reading. I finished working. Thank you for helping me.'
        : 'Перед практикой держи четыре модели: Reading helps. I enjoy reading. I finished working. Thank you for helping me.'
      }
    />,
  ],
},

// ── УРОК 23 ──────────────────────────────────────────────────
23: {
  titleRU: 'Пассивный залог: Present Simple',
  titleUK: 'Пасивний стан: Present Simple',
  titlePtBr: "Voz passiva: Present Simple",
  titleVi: "Câu bị động: Present Simple",
  titleId: "Kalimat pasif: Present Simple",
  titleTr: "Edilgen çatı: Present Simple",
  titlePl: "Strona bierna: Present Simple",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити не про того, хто робить дію, а про предмет, з яким щось робиться: кімната прибирається, документи перевіряються, квитки продаються, їжа готується.'
        : 'В этом уроке ты учишься говорить не о том, кто делает действие, а о предмете, с которым что-то делают: комната убирается, документы проверяются, билеты продаются, еда готовится.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Активна логіка' : 'Активная логика', isUK ? 'Пасивна логіка' : 'Пассивная логика'],
        [isUK ? 'Хтось прибирає кімнату' : 'Кто-то убирает комнату', 'The room is cleaned'],
        [isUK ? 'Хтось перевіряє документи' : 'Кто-то проверяет документы', 'The documents are checked'],
        [isUK ? 'Хтось продає квитки' : 'Кто-то продаёт билеты', 'The tickets are sold'],
        [isUK ? 'Хтось готує їжу' : 'Кто-то готовит еду', 'The food is cooked'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: passive voice переносить увагу на предмет. Не “хтось робить”, а “з предметом щось робиться”.'
        : 'Главная идея: passive voice переносит внимание на предмет. Не “кто-то делает”, а “с предметом что-то делается”.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'У Present Simple пасивний стан будується так: предмет + is/are + третя форма дієслова. Для одного предмета використовуй is. Для множини використовуй are.'
        : 'В Present Simple пассивный залог строится так: предмет + is/are + третья форма глагола. Для одного предмета используй is. Для множественного числа используй are.'
      }
    />,

    <Formula
      key="f2"
      t={t}
      f={f}
      slots={[
        { text: isUK ? 'предмет' : 'предмет', sub: 'The room', role: 'subject' },
        { text: 'is / are', sub: isUK ? 'звʼязка' : 'связка', role: 'link' },
        { text: 'V3', sub: 'cleaned', role: 'verb' },
      ]}
      example="The room is cleaned every day"
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ The room cleaned every day → ✅ The room is cleaned every day. У пасиві потрібне is або are.'
        : '❌ The room cleaned every day → ✅ The room is cleaned every day. В пассиве нужно is или are.'
      }
    />,

    <Section key="s34" t={t} f={f} title={isUK ? '3-4. Is для одного, are для множини' : '3-4. Is для одного, are для множественного'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Якщо предмет один або слово сприймається як одне ціле, використовуй is. Якщо предметів кілька, використовуй are.'
        : 'Если предмет один или слово воспринимается как одно целое, используй is. Если предметов несколько, используй are.'
      }
    />,

    <DuoCards
      key="duo34"
      t={t}
      f={f}
      left={{
        tag: 'is',
        tagRole: 'link',
        desc: isUK ? 'один предмет / одне ціле' : 'один предмет / одно целое',
        highlight: 'is',
        items: [
          'The room is cleaned',
          'The food is cooked',
          'The coffee is made',
          'The door is closed',
          'The app is used',
          'The password is changed',
          'The plan is discussed',
          'The problem is solved',
          'The work is finished',
        ],
      }}
      right={{
        tag: 'are',
        tagRole: 'link',
        desc: isUK ? 'кілька предметів' : 'несколько предметов',
        highlight: 'are',
        items: [
          'The documents are checked',
          'The tickets are sold',
          'The windows are opened',
          'The messages are sent',
          'The phones are charged',
          'The bags are checked',
          'The keys are kept',
          'The questions are answered',
          'The rules are explained',
          'The answers are checked',
          'The ideas are supported',
        ],
      }}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ The door are closed at night → ✅ The door is closed at night. Door тут один предмет, тому is.'
        : '❌ The door are closed at night → ✅ The door is closed at night. Door здесь один предмет, поэтому is.'
      }
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ The documents is checked → ✅ The documents are checked. Documents - множина, тому are.'
        : '❌ The documents is checked → ✅ The documents are checked. Documents - множественное число, поэтому are.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Повні приклади з is' : '3. Полные примеры с is'} />,

    <Accordion key="acc-is" t={t} f={f} defaultOpen icon="list" title={isUK ? 'Фрази з is' : 'Фразы с is'} count={isUK ? '9 фраз' : '9 фраз'}>
      {([
        ['The room is cleaned every day', isUK ? 'Кімната прибирається щодня' : 'Комната убирается каждый день'],
        ['The food is cooked here', isUK ? 'Їжа готується тут' : 'Еда готовится здесь'],
        ['The coffee is made in the morning', isUK ? 'Кава готується вранці' : 'Кофе готовится утром'],
        ['The door is closed at night', isUK ? 'Двері зачиняються вночі' : 'Дверь закрывается ночью'],
        ['The app is used by many people', isUK ? 'Додаток використовується багатьма людьми' : 'Приложение используется многими людьми'],
        ['The password is changed often', isUK ? 'Пароль часто змінюється' : 'Пароль часто меняется'],
        ['The plan is discussed every week', isUK ? 'План обговорюється щотижня' : 'План обсуждается каждую неделю'],
        ['The problem is solved quickly', isUK ? 'Проблема швидко вирішується' : 'Проблема быстро решается'],
        ['The work is finished on time', isUK ? 'Робота закінчується вчасно' : 'Работа заканчивается вовремя'],
      ] as Array<[string, string]>).map(([eng, rus], i) => (
        <ExampleCard key={i} t={t} f={f} eng={eng} rus={rus} link={['is']} />
      ))}
    </Accordion>,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Повні приклади з are' : '4. Полные примеры с are'} />,

    <Accordion key="acc-are" t={t} f={f} defaultOpen icon="list" title={isUK ? 'Фрази з are' : 'Фразы с are'} count={isUK ? '11 фраз' : '11 фраз'}>
      {([
        ['The documents are checked every morning', isUK ? 'Документи перевіряються кожного ранку' : 'Документы проверяются каждое утро'],
        ['The tickets are sold online', isUK ? 'Квитки продаються онлайн' : 'Билеты продаются онлайн'],
        ['The windows are opened in the morning', isUK ? 'Вікна відкриваються вранці' : 'Окна открываются утром'],
        ['The messages are sent every day', isUK ? 'Повідомлення надсилаються щодня' : 'Сообщения отправляются каждый день'],
        ['The phones are charged here', isUK ? 'Телефони заряджаються тут' : 'Телефоны заряжаются здесь'],
        ['The bags are checked here', isUK ? 'Сумки перевіряються тут' : 'Сумки проверяются здесь'],
        ['The keys are kept inside', isUK ? 'Ключі зберігаються всередині' : 'Ключи хранятся внутри'],
        ['The questions are answered quickly', isUK ? 'На запитання швидко відповідають' : 'На вопросы быстро отвечают'],
        ['The answers are checked carefully', isUK ? 'Відповіді уважно перевіряються' : 'Ответы внимательно проверяются'],
        ['The rules are explained clearly', isUK ? 'Правила пояснюються зрозуміло' : 'Правила объясняются понятно'],
        ['The ideas are supported here', isUK ? 'Ідеї тут підтримуються' : 'Идеи здесь поддерживаются'],
      ] as Array<[string, string]>).map(([eng, rus], i) => (
        <ExampleCard key={i} t={t} f={f} eng={eng} rus={rus} link={['are']} />
      ))}
    </Accordion>,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Третя форма дієслова: cleaned, checked, sold' : '5. Третья форма глагола: cleaned, checked, sold'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Після is або are у пасиві стоїть третя форма дієслова. У правильних дієслів вона часто виглядає як -ed. У неправильних форм треба впізнавати окремо.'
        : 'После is или are в пассиве стоит третья форма глагола. У правильных глаголов она часто выглядит как -ed. Неправильные формы нужно узнавать отдельно.'
      }
    />,

    <Accordion key="acc-v3reg" t={t} f={f} icon="text-outline" title={isUK ? 'Правильні: + ed' : 'Правильные: + ed'} count={isUK ? '12 — натисни' : '12 — нажми'}>
      <FormChips
        t={t}
        f={f}
        pairs={[
          ['clean', 'cleaned'], ['check', 'checked'], ['cook', 'cooked'], ['close', 'closed'],
          ['open', 'opened'], ['charge', 'charged'], ['change', 'changed'], ['answer', 'answered'],
          ['explain', 'explained'], ['discuss', 'discussed'], ['solve', 'solved'], ['finish', 'finished'],
        ]}
      />
    </Accordion>,

    <Accordion key="acc-v3irr" t={t} f={f} icon="star" title={isUK ? 'Особливі форми (запамʼятати)' : 'Особые формы (запомнить)'} count={isUK ? '5 — натисни' : '5 — нажми'}>
      <FormChips
        t={t}
        f={f}
        pairs={[
          ['sell', 'sold'], ['make', 'made'], ['send', 'sent'], ['use', 'used'], ['keep', 'kept'],
        ]}
      />
    </Accordion>,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ The tickets are selled online → ✅ The tickets are sold online. Sell має форму sold.'
        : '❌ The tickets are selled online → ✅ The tickets are sold online. Sell имеет форму sold.'
      }
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ The coffee is maked → ✅ The coffee is made. Make має форму made.'
        : '❌ The coffee is maked → ✅ The coffee is made. Make имеет форму made.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Питання: Is / Are + предмет + V3?' : '6. Вопросы: Is / Are + предмет + V3?'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб зробити питання в пасиві, перенеси is або are на початок. Третя форма дієслова залишається після предмета.'
        : 'Чтобы сделать вопрос в пассиве, перенеси is или are в начало. Третья форма глагола остаётся после предмета.'
      }
    />,

    <Transform
      key="tr-q"
      t={t}
      label={isUK ? 'З твердження The room is cleaned виходить питання Is the room cleaned?' : 'Из утверждения The room is cleaned получается вопрос Is the room cleaned?'}
      from={<ColoredPhrase text="The room is cleaned" t={t} f={f} subject={['the', 'room']} link={['is']} verb={['cleaned']} />}
      to={<ColoredPhrase text="Is the room cleaned?" t={t} f={f} subject={['the', 'room']} link={['is']} verb={['cleaned']} />}
    />,

    <Accordion key="acc-q" t={t} f={f} defaultOpen icon="help-circle" title={isUK ? 'Усі питання уроку' : 'Все вопросы урока'} count={isUK ? '10 фраз' : '10 фраз'}>
      {([
        ['Is the room cleaned every day?', isUK ? 'Кімнату прибирають щодня?' : 'Комнату убирают каждый день?'],
        ['Are the documents checked every morning?', isUK ? 'Документи перевіряють кожного ранку?' : 'Документы проверяют каждое утро?'],
        ['Are the tickets sold online?', isUK ? 'Квитки продають онлайн?' : 'Билеты продают онлайн?'],
        ['Is the food cooked here?', isUK ? 'Їжу готують тут?' : 'Еду готовят здесь?'],
        ['Is the door closed at night?', isUK ? 'Двері зачиняють вночі?' : 'Дверь закрывают ночью?'],
        ['Are the messages sent every day?', isUK ? 'Повідомлення надсилають щодня?' : 'Сообщения отправляют каждый день?'],
        ['Is the app used by many people?', isUK ? 'Додатком користується багато людей?' : 'Приложением пользуется много людей?'],
        ['Are the bags checked here?', isUK ? 'Сумки перевіряють тут?' : 'Сумки проверяют здесь?'],
        ['Is the password changed often?', isUK ? 'Пароль часто міняють?' : 'Пароль часто меняют?'],
        ['Are the rules explained clearly?', isUK ? 'Правила пояснюють зрозуміло?' : 'Правила объясняют понятно?'],
      ] as Array<[string, string]>).map(([q, rus], i) => (
        <ExampleCard key={i} t={t} f={f} eng={q} rus={rus} link={ROLE_LINK_IS_ARE} />
      ))}
    </Accordion>,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ The room is cleaned every day? → ✅ Is the room cleaned every day? У питанні is виходить на початок.'
        : '❌ The room is cleaned every day? → ✅ Is the room cleaned every day? В вопросе is выходит в начало.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ Is the documents checked? → ✅ Are the documents checked? Documents - множина, тому are.'
        : '❌ Is the documents checked? → ✅ Are the documents checked? Documents - множественное число, поэтому are.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Заперечення: is not / are not + V3' : '7. Отрицание: is not / are not + V3'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб сказати, що дія не виконується, постав not після is або are. Формула: предмет + is/are + not + V3.'
        : 'Чтобы сказать, что действие не выполняется, поставь not после is или are. Формула: предмет + is/are + not + V3.'
      }
    />,

    <Formula
      key="f7"
      t={t}
      f={f}
      slots={[
        { text: isUK ? 'предмет' : 'предмет', sub: 'The room', role: 'subject' },
        { text: 'is / are', role: 'link' },
        { text: 'not', sub: isUK ? 'заперечення' : 'отрицание', role: 'neutral' },
        { text: 'V3', sub: 'cleaned', role: 'verb' },
      ]}
      example="The room is not cleaned every day"
    />,

    <Accordion key="acc-neg" t={t} f={f} icon="remove-circle-outline" title={isUK ? 'Усі заперечення уроку' : 'Все отрицания урока'} count={isUK ? '10 — натисни' : '10 — нажми'}>
      {([
        ['The room is not cleaned every day', isUK ? 'Кімнату не прибирають щодня' : 'Комнату не убирают каждый день'],
        ['The documents are not checked here', isUK ? 'Документи тут не перевіряють' : 'Документы здесь не проверяют'],
        ['The tickets are not sold online', isUK ? 'Квитки не продають онлайн' : 'Билеты не продают онлайн'],
        ['The food is not cooked here', isUK ? 'Їжу тут не готують' : 'Еду здесь не готовят'],
        ['The door is not closed at night', isUK ? 'Двері вночі не зачиняють' : 'Дверь ночью не закрывают'],
        ['The messages are not sent on weekends', isUK ? 'Повідомлення не надсилають у вихідні' : 'Сообщения не отправляют по выходным'],
        ['The app is not used often', isUK ? 'Додаток використовують нечасто' : 'Приложение используют нечасто'],
        ['The bags are not checked inside', isUK ? 'Сумки всередині не перевіряють' : 'Сумки внутри не проверяют'],
        ['The password is not changed often', isUK ? 'Пароль міняють нечасто' : 'Пароль меняют нечасто'],
        ['The rules are not explained clearly', isUK ? 'Правила пояснюють незрозуміло' : 'Правила объясняют непонятно'],
      ] as Array<[string, string]>).map(([eng, rus], i) => (
        <ExampleCard key={i} t={t} f={f} eng={eng} rus={rus} link={ROLE_LINK_IS_ARE_NOT} />
      ))}
    </Accordion>,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ The documents do not checked → ✅ The documents are not checked. У пасиві заперечення робиться через are not.'
        : '❌ The documents do not checked → ✅ The documents are not checked. В пассиве отрицание делается через are not.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Час, місце і спосіб' : '8. Время, место и способ'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок багато разів показує, коли, де або як виконується дія: every day, every morning, online, here, inside, often, quickly, carefully, clearly.'
        : 'Урок много раз показывает, когда, где или как выполняется действие: every day, every morning, online, here, inside, often, quickly, carefully, clearly.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['every day', 'The room is cleaned every day / The messages are sent every day'],
        ['every morning', 'The documents are checked every morning'],
        ['online', 'The tickets are sold online'],
        ['here', 'The food is cooked here / The phones are charged here / The ideas are supported here'],
        ['inside', 'The keys are kept inside'],
        ['often', 'The password is changed often / I am invited often'],
        ['quickly', 'The questions are answered quickly / The problem is solved quickly'],
        ['carefully', 'The answers are checked carefully'],
        ['clearly', 'The rules are explained clearly'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? 'Не плутай carefully і clearly. Carefully = уважно. Clearly = зрозуміло / чітко.'
        : 'Не путай carefully и clearly. Carefully = внимательно. Clearly = понятно / ясно.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. By many people' : '9. By many people'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'У пасиві можна додати by, якщо важливо сказати, ким виконується дія. У цьому уроці є фраза by many people.'
        : 'В пассиве можно добавить by, если важно сказать, кем выполняется действие. В этом уроке есть фраза by many people.'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="The app is used by many people"
      rus={isUK ? 'Додаток використовується багатьма людьми' : 'Приложение используется многими людьми'}
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Люди як обʼєкт пасиву' : '10. Люди как объект пассива'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У пасиві головним може бути не тільки предмет, а й людина. I am invited often природно перекладається як “мене часто запрошують”.'
        : 'В пассиве главным может быть не только предмет, но и человек. I am invited often естественно переводится как “меня часто приглашают”.'
      }
    />,

    <Accordion key="acc-people" t={t} f={f} defaultOpen icon="people-outline" title={isUK ? 'Люди в пасиві' : 'Люди в пассиве'} count={isUK ? '6 фраз' : '6 фраз'}>
      {([
        ['I am invited often', isUK ? 'Мене часто запрошують' : 'Меня часто приглашают'],
        ['You are invited too', isUK ? 'Тебе теж запрошують' : 'Тебя тоже приглашают'],
        ['He is called every day', isUK ? 'Йому телефонують щодня' : 'Ему звонят каждый день'],
        ['She is helped here', isUK ? 'Їй тут допомагають' : 'Ей здесь помогают'],
        ['We are asked many questions', isUK ? 'Нам ставлять багато запитань' : 'Нам задают много вопросов'],
        ['They are invited every week', isUK ? 'Їх запрошують щотижня' : 'Их приглашают каждую неделю'],
      ] as Array<[string, string]>).map(([eng, rus], i) => (
        <ExampleCard key={i} t={t} f={f} eng={eng} rus={rus} link={ROLE_LINK_BE} />
      ))}
    </Accordion>,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? 'Не перекладай I am invited often як “я часто запрошую”. Це пасив: мене часто запрошують.'
        : 'Не переводи I am invited often как “я часто приглашаю”. Это пассив: меня часто приглашают.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Must be signed / can be solved' : '11. Must be signed / can be solved'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У кінці уроку пасив зʼявляється після must і can. Після модального слова ставимо be, а потім третю форму дієслова.'
        : 'В конце урока пассив появляется после must и can. После модального слова ставим be, а потом третью форму глагола.'
      }
    />,

    <Formula
      key="f11"
      t={t}
      f={f}
      slots={[
        { text: 'must / can', sub: isUK ? 'модальне' : 'модальное', role: 'subject' },
        { text: 'be', role: 'link' },
        { text: 'V3', sub: 'signed', role: 'verb' },
      ]}
      example="This document must be signed today"
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Модель' : 'Модель', isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['must be + V3', 'This document must be signed today', isUK ? 'Цей документ має бути підписаний сьогодні' : 'Этот документ должен быть подписан сегодня'],
        ['can be + V3', 'This problem can be solved', isUK ? 'Цю проблему можна вирішити' : 'Эту проблему можно решить'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ This document must signed today → ✅ This document must be signed today. У пасиві після must потрібне be.'
        : '❌ This document must signed today → ✅ This document must be signed today. В пассиве после must нужно be.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Is being cleaned і were checked' : '12. Is being cleaned и were checked'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Останні дві фрази показують, що пасив може працювати не тільки в Present Simple. Це містки до інших часів, але база уроку все одно is/are + V3.'
        : 'Последние две фразы показывают, что пассив может работать не только в Present Simple. Это мостики к другим временам, но база урока всё равно is/are + V3.'
      }
    />,

    <ExampleCard
      key="ec12a"
      t={t}
      f={f}
      eng="The room is being cleaned now"
      rus={isUK ? 'кімнату прибирають зараз, дія в процесі' : 'комнату убирают сейчас, действие в процессе'}
      link={['is', 'being']}
    />,
    <ExampleCard
      key="ec12b"
      t={t}
      f={f}
      eng="The documents were checked yesterday"
      rus={isUK ? 'документи були перевірені вчора, минулий час' : 'документы были проверены вчера, прошедшее время'}
      link={['were']}
      verb={['checked']}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Готові блоки з уроку' : '13. Готовые блоки из урока'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Пасив краще впізнавати готовими блоками: is cleaned, are checked, are sold, is cooked, is made.'
        : 'Пассив лучше узнавать готовыми блоками: is cleaned, are checked, are sold, is cooked, is made.'
      }
    />,

    <Accordion key="acc-blocks" t={t} f={f} icon="grid-outline" title={isUK ? 'Готові блоки' : 'Готовые блоки'} count={isUK ? '18 — натисни' : '18 — нажми'}>
      <Table
        t={t}
        f={f}
        rows={[
          [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
          ['is cleaned', isUK ? 'прибирається' : 'убирается'],
          ['are checked', isUK ? 'перевіряються' : 'проверяются'],
          ['are sold', isUK ? 'продаються' : 'продаются'],
          ['is cooked', isUK ? 'готується' : 'готовится'],
          ['is made', isUK ? 'готується / робиться' : 'готовится / делается'],
          ['is closed', isUK ? 'зачиняється / закрита' : 'закрывается / закрыта'],
          ['are opened', isUK ? 'відкриваються' : 'открываются'],
          ['are sent', isUK ? 'надсилаються' : 'отправляются'],
          ['is used', isUK ? 'використовується' : 'используется'],
          ['are charged', isUK ? 'заряджаються' : 'заряжаются'],
          ['are kept inside', isUK ? 'зберігаються всередині' : 'хранятся внутри'],
          ['is changed often', isUK ? 'часто змінюється' : 'часто меняется'],
          ['are answered quickly', isUK ? 'на них швидко відповідають' : 'на них быстро отвечают'],
          ['are checked carefully', isUK ? 'уважно перевіряються' : 'внимательно проверяются'],
          ['are explained clearly', isUK ? 'зрозуміло пояснюються' : 'понятно объясняются'],
          ['is discussed every week', isUK ? 'обговорюється щотижня' : 'обсуждается каждую неделю'],
          ['is solved quickly', isUK ? 'швидко вирішується' : 'быстро решается'],
          ['is finished on time', isUK ? 'закінчується вчасно' : 'заканчивается вовремя'],
        ]}
      />
    </Accordion>,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Найчастіші помилки' : '14. Самые частые ошибки'} />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ The tickets are sell online → ✅ The tickets are sold online. У пасиві потрібна третя форма sold.'
        : '❌ The tickets are sell online → ✅ The tickets are sold online. В пассиве нужна третья форма sold.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ The coffee is make in the morning → ✅ The coffee is made in the morning. Make → made.'
        : '❌ The coffee is make in the morning → ✅ The coffee is made in the morning. Make → made.'
      }
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ The food does not cooked here → ✅ The food is not cooked here. У пасиві заперечення через is not.'
        : '❌ The food does not cooked here → ✅ The food is not cooked here. В пассиве отрицание через is not.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ This problem can solved → ✅ This problem can be solved. Після can у пасиві потрібне be.'
        : '❌ This problem can solved → ✅ This problem can be solved. После can в пассиве нужно be.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Що треба винести з уроку' : '15. Что нужно вынести из урока'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати пасив у Present Simple. Для одного предмета використовуй is + V3. Для множини використовуй are + V3. Для питання перенось is/are на початок. Для заперечення став not після is/are. Якщо після can або must потрібен пасив, став be + V3.'
        : 'В этом уроке ты учишься строить пассив в Present Simple. Для одного предмета используй is + V3. Для множественного числа используй are + V3. Для вопроса переноси is/are в начало. Для отрицания ставь not после is/are. Если после can или must нужен пассив, ставь be + V3.'
      }
    />,

    <Tip
      key="tipFinal"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: The room is cleaned every day. Are the documents checked? The room is not cleaned every day.'
        : 'Перед практикой держи три модели: The room is cleaned every day. Are the documents checked? The room is not cleaned every day.'
      }
    />,
  ],
},

// ── УРОК 24 ──────────────────────────────────────────────────
24: {
  titleRU: 'Present Perfect: have / has + V3',
  titleUK: 'Present Perfect (have/has + V3)',
  titlePtBr: "Present Perfect: have / has + V3",
  titleVi: "Present Perfect: have / has + V3",
  titleId: "Present Perfect: have / has + V3",
  titleTr: "Present Perfect: have / has + V3",
  titlePl: "Present Perfect: have / has + V3",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти тренуєш Present Perfect. Це конструкція для дії, яка вже сталася, але важливий її результат зараз: я щойно закінчив, вона вже подзвонила, ми ще не знайшли ключі, ти коли-небудь бачив це?'
        : 'В этом уроке ты тренируешь Present Perfect. Это конструкция для действия, которое уже произошло, но важен его результат сейчас: я только что закончил, она уже позвонила, мы ещё не нашли ключи, ты когда-нибудь видел это?'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ідея' : 'Идея', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        [isUK ? 'щойно сталося' : 'только что произошло', 'I have just finished work'],
        [isUK ? 'вже зроблено' : 'уже сделано', 'I have already paid'],
        [isUK ? 'ще не зроблено' : 'ещё не сделано', 'I have not finished yet'],
        [isUK ? 'досвід у житті' : 'опыт в жизни', 'Have you ever seen this?'],
        [isUK ? 'ніколи не було такого досвіду' : 'никогда не было такого опыта', 'I have never seen this'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна формула: have / has + третя форма дієслова. I have finished. She has called. We have found.'
        : 'Главная формула: have / has + третья форма глагола. I have finished. She has called. We have found.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Present Perfect складається з двох частин: have або has + третя форма дієслова. Have використовується з I, you, we, they. Has використовується з he, she, it.'
        : 'Present Perfect состоит из двух частей: have или has + третья форма глагола. Have используется с I, you, we, they. Has используется с he, she, it.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', 'have / has', 'V3', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'have', 'finished', 'I have just finished work'],
        ['You', 'have', 'helped', 'You have just helped me'],
        ['We', 'have', 'found', 'We have just found the keys'],
        ['They', 'have', 'sent', 'They have just sent documents'],
        ['He', 'has', 'opened', 'He has just opened the door'],
        ['She', 'has', 'called', 'She has just called me'],
        ['It', 'has', 'changed', 'It has changed'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ She have just called me → ✅ She has just called me. З she потрібне has.'
        : '❌ She have just called me → ✅ She has just called me. С she нужно has.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ I has just finished work → ✅ I have just finished work. З I потрібне have.'
        : '❌ I has just finished work → ✅ I have just finished work. С I нужно have.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Третя форма дієслова' : '3. Третья форма глагола'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Після have або has потрібна третя форма дієслова. У правильних дієсловах вона часто така сама, як Past Simple з -ed. У неправильних дієслів форму треба впізнавати окремо.'
        : 'После have или has нужна третья форма глагола. У правильных глаголов она часто такая же, как Past Simple с -ed. У неправильных глаголов форму нужно узнавать отдельно.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'V3', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['finish', 'finished', 'I have just finished work / We have already finished'],
        ['call', 'called', 'She has just called me / She has not called yet'],
        ['check', 'checked', 'I have just checked messages / You have already checked it'],
        ['help', 'helped', 'You have just helped me / They have never helped us'],
        ['cook', 'cooked', 'She has just cooked dinner'],
        ['clean', 'cleaned', 'We have just cleaned the room'],
        ['open', 'opened', 'He has just opened the door'],
        ['discuss', 'discussed', 'We have already discussed the problem'],
        ['change', 'changed', 'He has already changed the password / It has changed'],
        ['visit', 'visited', 'Have they ever visited us?'],
        ['use', 'used', 'He has never used this app'],
      ]}
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова форма' : 'Базовая форма', 'V3', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['find', 'found', 'We have just found the keys / We have not found the keys yet'],
        ['send', 'sent', 'They have just sent documents / He has already sent the letter'],
        ['pay', 'paid', 'I have already paid'],
        ['buy', 'bought', 'She has already bought tickets'],
        ['see', 'seen', 'They have already seen it / Have you ever seen this?'],
        ['choose', 'chosen', 'I have already chosen an option'],
        ['read', 'read', 'She has already read the message'],
        ['lose', 'lost', 'Have you ever lost your phone?'],
        ['be', 'been', 'I have been there / She has been here before'],
        ['do', 'done', 'We have done it'],
        ['make', 'made', 'They have made mistakes'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have saw this → ✅ I have seen this. Після have потрібна третя форма seen, не Past Simple saw.'
        : '❌ I have saw this → ✅ I have seen this. После have нужна третья форма seen, не Past Simple saw.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have chose an option → ✅ I have chosen an option. Choose → chosen.'
        : '❌ I have chose an option → ✅ I have chosen an option. Choose → chosen.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Just = щойно / тільки що' : '4. Just = только что'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Just показує, що дія сталася зовсім недавно. У фразах уроку just стоїть після have або has.'
        : 'Just показывает, что действие произошло совсем недавно. Во фразах урока just стоит после have или has.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I have just finished work', isUK ? 'Я щойно закінчив роботу' : 'Я только что закончил работу'],
        ['She has just called me', isUK ? 'Вона щойно зателефонувала мені' : 'Она только что позвонила мне'],
        ['We have just found the keys', isUK ? 'Ми щойно знайшли ключі' : 'Мы только что нашли ключи'],
        ['They have just sent documents', isUK ? 'Вони щойно надіслали документи' : 'Они только что отправили документы'],
        ['He has just opened the door', isUK ? 'Він щойно відчинив двері' : 'Он только что открыл дверь'],
        ['I have just checked messages', isUK ? 'Я щойно перевірив повідомлення' : 'Я только что проверил сообщения'],
        ['You have just helped me', isUK ? 'Ти щойно допоміг мені' : 'Ты только что помог мне'],
        ['She has just cooked dinner', isUK ? 'Вона щойно приготувала вечерю' : 'Она только что приготовила ужин'],
        ['We have just cleaned the room', isUK ? 'Ми щойно прибрали кімнату' : 'Мы только что убрали комнату'],
        ['They have just arrived', isUK ? 'Вони щойно прибули' : 'Они только что прибыли'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ I just have finished → ✅ I have just finished. У фразах уроку just стоїть після have/has.'
        : '❌ I just have finished → ✅ I have just finished. Во фразах урока just стоит после have/has.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Already = вже' : '5. Already = уже'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Already показує, що дія вже виконана. У фразах уроку already стоїть після have або has.'
        : 'Already показывает, что действие уже выполнено. Во фразах урока already стоит после have или has.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I have already paid', isUK ? 'Я вже заплатив' : 'Я уже заплатил'],
        ['You have already checked it', isUK ? 'Ти вже перевірив це' : 'Ты уже проверил это'],
        ['He has already sent the letter', isUK ? 'Він вже надіслав листа' : 'Он уже отправил письмо'],
        ['She has already bought tickets', isUK ? 'Вона вже купила квитки' : 'Она уже купила билеты'],
        ['We have already finished', isUK ? 'Ми вже закінчили' : 'Мы уже закончили'],
        ['They have already seen it', isUK ? 'Вони вже бачили це' : 'Они уже видели это'],
        ['I have already chosen an option', isUK ? 'Я вже обрав варіант' : 'Я уже выбрал вариант'],
        ['She has already read the message', isUK ? 'Вона вже прочитала повідомлення' : 'Она уже прочитала сообщение'],
        ['We have already discussed the problem', isUK ? 'Ми вже обговорили проблему' : 'Мы уже обсудили проблему'],
        ['He has already changed the password', isUK ? 'Він вже змінив пароль' : 'Он уже изменил пароль'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ He already has sent the letter → ✅ He has already sent the letter. У цій моделі already стоїть після has.'
        : '❌ He already has sent the letter → ✅ He has already sent the letter. В этой модели already стоит после has.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Yet у запереченнях = ще не' : '6. Yet в отрицаниях = ещё не'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'У запереченнях yet зазвичай стоїть у кінці фрази і дає значення “ще не”. Формула: have/has + not + V3 + yet.'
        : 'В отрицаниях yet обычно стоит в конце фразы и даёт значение “ещё не”. Формула: have/has + not + V3 + yet.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I have not finished yet', isUK ? 'Я ще не закінчив' : 'Я ещё не закончил'],
        ['She has not called yet', isUK ? 'Вона ще не зателефонувала' : 'Она ещё не позвонила'],
        ['We have not found the keys yet', isUK ? 'Ми ще не знайшли ключі' : 'Мы ещё не нашли ключи'],
        ['They have not sent documents yet', isUK ? 'Вони ще не надіслали документи' : 'Они ещё не отправили документы'],
        ['He has not opened the door yet', isUK ? 'Він ще не відчинив двері' : 'Он ещё не открыл дверь'],
        ['I have not checked messages yet', isUK ? 'Я ще не перевірив повідомлення' : 'Я ещё не проверил сообщения'],
        ['You have not answered yet', isUK ? 'Ти ще не відповів' : 'Ты ещё не ответил'],
        ['She has not cooked dinner yet', isUK ? 'Вона ще не приготувала вечерю' : 'Она ещё не приготовила ужин'],
        ['We have not cleaned the room yet', isUK ? 'Ми ще не прибрали кімнату' : 'Мы ещё не убрали комнату'],
        ['They have not arrived yet', isUK ? 'Вони ще не прибули' : 'Они ещё не прибыли'],
      ]}
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Yet у питаннях = вже?' : '7. Yet в вопросах = уже?'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'У питаннях yet теж стоїть у кінці, але природний переклад часто “вже?”. Формула: Have/Has + хто + V3 + yet?'
        : 'В вопросах yet тоже стоит в конце, но естественный перевод часто “уже?”. Формула: Have/Has + кто + V3 + yet?'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання з уроку' : 'Вопрос из урока', isUK ? 'Переклад' : 'Перевод'],
        ['Have you finished yet?', isUK ? 'Ти вже закінчив?' : 'Ты уже закончил?'],
        ['Has she called yet?', isUK ? 'Вона вже зателефонувала?' : 'Она уже позвонила?'],
        ['Have they sent documents yet?', isUK ? 'Вони вже надіслали документи?' : 'Они уже отправили документы?'],
        ['Has he opened the door yet?', isUK ? 'Він вже відчинив двері?' : 'Он уже открыл дверь?'],
        ['Have you checked messages yet?', isUK ? 'Ти вже перевірив повідомлення?' : 'Ты уже проверил сообщения?'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ You have finished yet? → ✅ Have you finished yet? У питанні have виходить на початок.'
        : '❌ You have finished yet? → ✅ Have you finished yet? В вопросе have выходит в начало.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Питання: Have / Has на початку' : '8. Вопрос: Have / Has в начале'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У питаннях Present Perfect have або has ставиться на початок. Після людини або предмета залишається третя форма дієслова.'
        : 'В вопросах Present Perfect have или has ставится в начало. После человека или предмета остаётся третья форма глагола.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        ['Have / Has', isUK ? 'Хто?' : 'Кто?', 'V3', isUK ? 'Фраза' : 'Фраза'],
        ['Have', 'you', 'finished', 'Have you finished yet?'],
        ['Has', 'she', 'called', 'Has she called yet?'],
        ['Have', 'they', 'sent', 'Have they sent documents yet?'],
        ['Has', 'he', 'opened', 'Has he opened the door yet?'],
        ['Have', 'you', 'checked', 'Have you checked messages yet?'],
        ['Have', 'we', 'met', 'Have we ever met before?'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ Does she has called yet? → ✅ Has she called yet? У Present Perfect питання робиться через has/have, не через do/does.'
        : '❌ Does she has called yet? → ✅ Has she called yet? В Present Perfect вопрос делается через has/have, не через do/does.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Ever у питаннях = коли-небудь' : '9. Ever в вопросах = когда-нибудь'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Ever часто використовується в питаннях про життєвий досвід: ти коли-небудь бачив це? вона коли-небудь допомагала тобі? ми коли-небудь зустрічалися раніше?'
        : 'Ever часто используется в вопросах про жизненный опыт: ты когда-нибудь видел это? она когда-нибудь помогала тебе? мы когда-нибудь встречались раньше?'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання з уроку' : 'Вопрос из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Have you ever seen this?', isUK ? 'Ти коли-небудь бачив це?' : 'Ты когда-нибудь видел это?'],
        ['Has she ever helped you?', isUK ? 'Вона коли-небудь допомагала тобі?' : 'Она когда-нибудь помогала тебе?'],
        ['Have we ever met before?', isUK ? 'Ми коли-небудь зустрічалися раніше?' : 'Мы когда-нибудь встречались раньше?'],
        ['Have they ever visited us?', isUK ? 'Вони коли-небудь відвідували нас?' : 'Они когда-нибудь навещали нас?'],
        ['Have you ever lost your phone?', isUK ? 'Ти коли-небудь губив свій телефон?' : 'Ты когда-нибудь терял свой телефон?'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did you ever seen this? → ✅ Have you ever seen this? У цій моделі уроку потрібне Have + ever + V3.'
        : '❌ Did you ever seen this? → ✅ Have you ever seen this? В этой модели урока нужно Have + ever + V3.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Never = ніколи не' : '10. Never = никогда не'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Never вже містить заперечення. У Present Perfect воно стоїть після have або has: have never, has never. Не додавай not.'
        : 'Never уже содержит отрицание. В Present Perfect оно стоит после have или has: have never, has never. Не добавляй not.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I have never seen this', isUK ? 'Я ніколи цього не бачив' : 'Я никогда этого не видел'],
        ['She has never called me', isUK ? 'Вона ніколи мені не телефонувала' : 'Она никогда мне не звонила'],
        ['We have never met them', isUK ? 'Ми ніколи не зустрічали їх' : 'Мы никогда не встречали их'],
        ['They have never helped us', isUK ? 'Вони ніколи не допомагали нам' : 'Они никогда не помогали нам'],
        ['He has never used this app', isUK ? 'Він ніколи не використовував цей застосунок' : 'Он никогда не использовал это приложение'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have not never seen this → ✅ I have never seen this. Never уже означає “ніколи не”.'
        : '❌ I have not never seen this → ✅ I have never seen this. Never уже означает “никогда не”.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Been = був / була / були' : '11. Been = был / была / были'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Been - третя форма від be. У фразах уроку вона означає досвід перебування десь: я там був, вона була тут раніше.'
        : 'Been - третья форма от be. В фразах урока она означает опыт пребывания где-то: я там был, она была здесь раньше.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I have been there', isUK ? 'Я там був' : 'Я там был'],
        ['She has been here before', isUK ? 'Вона вже була тут раніше' : 'Она уже была здесь раньше'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have was there → ✅ I have been there. Після have потрібна третя форма been.'
        : '❌ I have was there → ✅ I have been there. После have нужна третья форма been.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Done, made, changed' : '12. Done, made, changed'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У кінці уроку є три дуже важливі форми: done, made, changed. Вони показують результат зараз.'
        : 'В конце урока есть три очень важные формы: done, made, changed. Они показывают результат сейчас.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова дія' : 'Базовое действие', 'V3', isUK ? 'Фраза з уроку' : 'Фраза из урока'],
        ['do', 'done', 'We have done it'],
        ['make', 'made', 'They have made mistakes'],
        ['change', 'changed', 'It has changed'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ We have did it → ✅ We have done it. Після have потрібна форма done.'
        : '❌ We have did it → ✅ We have done it. После have нужна форма done.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ They have maked mistakes → ✅ They have made mistakes. Make → made.'
        : '❌ They have maked mistakes → ✅ They have made mistakes. Make → made.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Обʼєкти після дії: me, it, you, us, them' : '13. Объекты после действия: me, it, you, us, them'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Після третьої форми дієслова може стояти людина або предмет, на який спрямована дія: called me, checked it, helped you, visited us, met them.'
        : 'После третьей формы глагола может стоять человек или предмет, на который направлено действие: called me, checked it, helped you, visited us, met them.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', 'She has just called me / She has never called me'],
        ['it', 'You have already checked it / They have already seen it / We have done it'],
        ['you', 'Has she ever helped you?'],
        ['us', 'Have they ever visited us? / They have never helped us'],
        ['them', 'We have never met them'],
      ]}
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ She has never called I → ✅ She has never called me. Після called потрібна форма me.'
        : '❌ She has never called I → ✅ She has never called me. После called нужна форма me.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. The, this, your у фразах уроку' : '14. The, this, your в фразах урока'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку є знайомі слова the, this і your. Вони не головна тема, але важливо бачити, чому вони стоять у конкретних місцях.'
        : 'В фразах урока есть знакомые слова the, this и your. Они не главная тема, но важно видеть, почему они стоят в конкретных местах.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['the keys', 'We have just found the keys / We have not found the keys yet'],
        ['the door', 'He has just opened the door / Has he opened the door yet?'],
        ['the letter', 'He has already sent the letter'],
        ['the message', 'She has already read the message'],
        ['the problem', 'We have already discussed the problem'],
        ['the password', 'He has already changed the password'],
        ['the room', 'We have just cleaned the room / We have not cleaned the room yet'],
        ['this app', 'He has never used this app'],
        ['this', 'Have you ever seen this? / I have never seen this'],
        ['your phone', 'Have you ever lost your phone?'],
      ]}
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Present Perfect і Past Simple' : '15. Present Perfect и Past Simple'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці Present Perfect не називає точний момент у минулому. Він показує результат, досвід або стан до зараз. Якщо говориш yesterday, last week, at eight, це вже зона Past Simple, а не цього уроку.'
        : 'В этом уроке Present Perfect не называет точный момент в прошлом. Он показывает результат, опыт или состояние до сейчас. Если говоришь yesterday, last week, at eight, это уже зона Past Simple, а не этого урока.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Present Perfect з уроку' : 'Present Perfect из урока', isUK ? 'Past Simple не тут' : 'Past Simple не здесь'],
        ['I have just finished work', 'I finished work yesterday'],
        ['Have you ever seen this?', 'Did you see this yesterday?'],
        ['I have never seen this', 'I did not see this yesterday'],
        ['She has been here before', 'She was here yesterday'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Готові блоки з уроку' : '16. Готовые блоки из урока'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'Present Perfect краще впізнавати готовими блоками: have just finished, has just called, have already paid, have not finished yet, have never seen.'
        : 'Present Perfect лучше узнавать готовыми блоками: have just finished, has just called, have already paid, have not finished yet, have never seen.'
      }
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['have just finished', isUK ? 'щойно закінчив' : 'только что закончил'],
        ['has just called', isUK ? 'щойно подзвонила' : 'только что позвонила'],
        ['have just found', isUK ? 'щойно знайшли' : 'только что нашли'],
        ['have just sent', isUK ? 'щойно надіслали' : 'только что отправили'],
        ['has just opened', isUK ? 'щойно відкрив' : 'только что открыл'],
        ['have just checked', isUK ? 'щойно перевірив' : 'только что проверил'],
        ['have just helped', isUK ? 'щойно допоміг' : 'только что помог'],
        ['has just cooked', isUK ? 'щойно приготувала' : 'только что приготовила'],
        ['have just cleaned', isUK ? 'щойно прибрали' : 'только что убрали'],
        ['have just arrived', isUK ? 'щойно прибули' : 'только что прибыли'],
      ]}
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['have already paid', isUK ? 'вже заплатив' : 'уже заплатил'],
        ['have already checked it', isUK ? 'вже перевірив це' : 'уже проверил это'],
        ['has already sent the letter', isUK ? 'вже надіслав листа' : 'уже отправил письмо'],
        ['has already bought tickets', isUK ? 'вже купила квитки' : 'уже купила билеты'],
        ['have already finished', isUK ? 'вже закінчили' : 'уже закончили'],
        ['have already seen it', isUK ? 'вже бачили це' : 'уже видели это'],
        ['have already chosen an option', isUK ? 'вже обрав варіант' : 'уже выбрал вариант'],
        ['has already read the message', isUK ? 'вже прочитала повідомлення' : 'уже прочитала сообщение'],
        ['have already discussed the problem', isUK ? 'вже обговорили проблему' : 'уже обсудили проблему'],
        ['has already changed the password', isUK ? 'вже змінив пароль' : 'уже изменил пароль'],
      ]}
    />,

    <Table
      key="t19"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['have not finished yet', isUK ? 'ще не закінчив' : 'ещё не закончил'],
        ['has not called yet', isUK ? 'ще не зателефонувала' : 'ещё не позвонила'],
        ['have not found the keys yet', isUK ? 'ще не знайшли ключі' : 'ещё не нашли ключи'],
        ['have not sent documents yet', isUK ? 'ще не надіслали документи' : 'ещё не отправили документы'],
        ['has not opened the door yet', isUK ? 'ще не відкрив двері' : 'ещё не открыл дверь'],
        ['have not checked messages yet', isUK ? 'ще не перевірив повідомлення' : 'ещё не проверил сообщения'],
        ['have not answered yet', isUK ? 'ще не відповів' : 'ещё не ответил'],
        ['has not cooked dinner yet', isUK ? 'ще не приготувала вечерю' : 'ещё не приготовила ужин'],
        ['have not cleaned the room yet', isUK ? 'ще не прибрали кімнату' : 'ещё не убрали комнату'],
        ['have not arrived yet', isUK ? 'ще не прибули' : 'ещё не прибыли'],
      ]}
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Переклад не завжди дослівний' : '17. Перевод не всегда дословный'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'Present Perfect часто перекладається українською або російською минулим часом, але англійська логіка інша: важливий звʼязок із зараз. Тому не шукай окремий переклад для have у кожній фразі.'
        : 'Present Perfect часто переводится по-русски прошедшим временем, но английская логика другая: важна связь с сейчас. Поэтому не ищи отдельный перевод для have в каждой фразе.'
      }
    />,

    <Table
      key="t20"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I have just finished work', isUK ? 'Я щойно закінчив роботу' : 'Я только что закончил работу'],
        ['She has just called me', isUK ? 'Вона щойно зателефонувала мені' : 'Она только что позвонила мне'],
        ['I have not finished yet', isUK ? 'Я ще не закінчив' : 'Я ещё не закончил'],
        ['Have you finished yet?', isUK ? 'Ти вже закінчив?' : 'Ты уже закончил?'],
        ['Have you ever seen this?', isUK ? 'Ти коли-небудь бачив це?' : 'Ты когда-нибудь видел это?'],
        ['I have never seen this', isUK ? 'Я ніколи цього не бачив' : 'Я никогда этого не видел'],
        ['I have been there', isUK ? 'Я там був' : 'Я там был'],
        ['It has changed', isUK ? 'Це змінилося' : 'Это изменилось'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Найчастіші помилки' : '18. Самые частые ошибки'} />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ I just finished work, якщо тренуємо Present Perfect → ✅ I have just finished work. У фразі уроку потрібне have.'
        : '❌ I just finished work, если тренируем Present Perfect → ✅ I have just finished work. Во фразе урока нужно have.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ We have just find the keys → ✅ We have just found the keys. Після have потрібна V3.'
        : '❌ We have just find the keys → ✅ We have just found the keys. После have нужна V3.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ He has already send the letter → ✅ He has already sent the letter. Send → sent.'
        : '❌ He has already send the letter → ✅ He has already sent the letter. Send → sent.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have not finished already → ✅ I have not finished yet. У запереченнях використовуй yet.'
        : '❌ I have not finished already → ✅ I have not finished yet. В отрицаниях используй yet.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did you ever seen this? → ✅ Have you ever seen this? Ever у цій моделі йде з Present Perfect.'
        : '❌ Did you ever seen this? → ✅ Have you ever seen this? Ever в этой модели идёт с Present Perfect.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have was there → ✅ I have been there. Be → been у Present Perfect.'
        : '❌ I have was there → ✅ I have been there. Be → been в Present Perfect.'
      }
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ We have did it → ✅ We have done it. Do → done.'
        : '❌ We have did it → ✅ We have done it. Do → done.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ It have changed → ✅ It has changed. З it потрібне has.'
        : '❌ It have changed → ✅ It has changed. С it нужно has.'
      }
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Що треба винести з уроку' : '19. Что нужно вынести из урока'} />,

    <Body
      key="b19a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати Present Perfect: have / has + V3. Just означає “щойно”. Already означає “вже”. Yet у запереченнях означає “ще не”, а в питаннях часто перекладається як “вже?”. Ever питає про досвід. Never означає “ніколи не”.'
        : 'В этом уроке ты учишься строить Present Perfect: have / has + V3. Just означает “только что”. Already означает “уже”. Yet в отрицаниях означает “ещё не”, а в вопросах часто переводится как “уже?”. Ever спрашивает про опыт. Never означает “никогда не”.'
      }
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай чотири моделі: I have just finished work. I have already paid. I have not finished yet. Have you ever seen this?'
        : 'Перед практикой держи четыре модели: I have just finished work. I have already paid. I have not finished yet. Have you ever seen this?'
      }
    />,
  ],
},

// ── УРОК 25 ──────────────────────────────────────────────────
25: {
  titleRU: 'Past Continuous: действие было в процессе',
  titleUK: 'Past Continuous: дія була в процесі',
  titlePtBr: "Past Continuous: ação em progresso",
  titleVi: "Past Continuous: hành động đang diễn ra trong quá khứ",
  titleId: "Past Continuous: tindakan sedang berlangsung",
  titleTr: "Past Continuous: devam eden geçmiş eylem",
  titlePl: "Past Continuous: czynność w trakcie",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити про дію, яка була в процесі в минулому: я працював о восьмій, вона писала повідомлення, ми чекали біля дверей, вони дивилися телевізор минулої ночі.'
        : 'В этом уроке ты учишься говорить о действии, которое было в процессе в прошлом: я работал в восемь, она писала сообщение, мы ждали у двери, они смотрели телевизор прошлой ночью.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайне минуле' : 'Обычное прошлое', isUK ? 'Процес у минулому' : 'Процесс в прошлом'],
        ['I worked at eight', 'I was working at eight o\'clock'],
        ['She wrote a message', 'She was writing a message at noon'],
        ['They watched TV', 'They were watching TV last night'],
        ['We waited near the door', 'We were waiting near the door'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: Past Continuous = was / were + дія з -ing. Він показує не просто факт у минулому, а процес у той момент.'
        : 'Главная идея: Past Continuous = was / were + действие с -ing. Он показывает не просто факт в прошлом, а процесс в тот момент.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Формула така: хто + was/were + дія-ing + продовження. Was використовується з I, he, she, it. Were використовується з you, we, they.'
        : 'Формула такая: кто + was/were + действие-ing + продолжение. Was используется с I, he, she, it. Were используется с you, we, they.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', 'was/were', isUK ? 'Дія-ing' : 'Действие-ing', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'was', 'working', 'I was working at eight o\'clock'],
        ['You', 'were', 'reading', 'You were reading at that time'],
        ['He', 'was', 'cooking', 'He was cooking dinner at six'],
        ['She', 'was', 'writing', 'She was writing a message at noon'],
        ['We', 'were', 'waiting', 'We were waiting near the door'],
        ['They', 'were', 'watching', 'They were watching TV last night'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I working at eight → ✅ I was working at eight o\'clock. У Past Continuous потрібне was або were.'
        : '❌ I working at eight → ✅ I was working at eight o\'clock. В Past Continuous нужно was или were.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ She was write a message → ✅ She was writing a message. Після was потрібна форма -ing.'
        : '❌ She was write a message → ✅ She was writing a message. После was нужна форма -ing.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Was для I, he, she, it' : '3. Was для I, he, she, it'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Was використовується з I, he, she, it. У цьому уроці це: I was working, he was cooking, she was writing, it was raining.'
        : 'Was используется с I, he, she, it. В этом уроке это: I was working, he was cooking, she was writing, it was raining.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        ['I was', 'I was working at eight o\'clock / I was looking for my keys / I was not sleeping at midnight / I was cooking'],
        ['He was', 'He was cooking dinner at six / He was driving home / He was not checking messages / He was sleeping'],
        ['She was', 'She was writing a message at noon / She was cleaning her room / She was not talking to him / She was cooking'],
        ['It was', 'It was raining / It started raining'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ He were cooking dinner → ✅ He was cooking dinner. З he потрібне was.'
        : '❌ He were cooking dinner → ✅ He was cooking dinner. С he нужно was.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Were для you, we, they' : '4. Were для you, we, they'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Were використовується з you, we, they. Це та сама логіка, яку ти вже бачив у To Be: you were, we were, they were.'
        : 'Were используется с you, we, they. Это та же логика, которую ты уже видел в To Be: you were, we were, they were.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        ['You were', 'You were reading at that time / You were talking to her / You were not listening to me'],
        ['We were', 'We were waiting near the door / We were checking documents / We were not discussing the problem'],
        ['They were', 'They were watching TV last night / They were walking outside / They were not working yesterday evening'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ You was reading → ✅ You were reading. З you потрібне were.'
        : '❌ You was reading → ✅ You were reading. С you нужно were.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Як утворюється -ing' : '5. Как образуется -ing'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'У Past Continuous дія має форму -ing. У більшості дієслів просто додаємо -ing, але є форми, які треба впізнати: write → writing, make → making, come → coming, eat → eating.'
        : 'В Past Continuous действие имеет форму -ing. У большинства глаголов просто добавляем -ing, но есть формы, которые нужно узнать: write → writing, make → making, come → coming, eat → eating.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Базова дія' : 'Базовое действие', '-ing', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['work', 'working', 'I was working at eight o\'clock'],
        ['read', 'reading', 'You were reading at that time'],
        ['cook', 'cooking', 'He was cooking dinner at six'],
        ['write', 'writing', 'She was writing a message at noon'],
        ['wait', 'waiting', 'We were waiting near the door'],
        ['watch', 'watching', 'They were watching TV last night'],
        ['look', 'looking', 'I was looking for my keys'],
        ['talk', 'talking', 'You were talking to her'],
        ['drive', 'driving', 'He was driving home'],
        ['clean', 'cleaning', 'She was cleaning her room'],
        ['check', 'checking', 'We were checking documents'],
        ['walk', 'walking', 'They were walking outside'],
        ['sleep', 'sleeping', 'I was not sleeping at midnight'],
        ['use', 'using', 'She was not using my phone'],
        ['discuss', 'discussing', 'We were not discussing the problem'],
        ['make', 'making', 'She was making coffee'],
        ['rain', 'raining', 'It was raining'],
        ['study', 'studying', 'She was studying'],
        ['eat', 'eating', 'We were eating'],
        ['come', 'coming', 'She was coming home'],
      ]}
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Часові маркери' : '6. Временные маркеры'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Past Continuous часто привʼязаний до моменту в минулому. У цьому уроці є at eight o\'clock, at that time, at six, at noon, last night, at midnight, then, yesterday evening.'
        : 'Past Continuous часто привязан к моменту в прошлом. В этом уроке есть at eight o\'clock, at that time, at six, at noon, last night, at midnight, then, yesterday evening.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Маркер' : 'Маркер', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['at eight o\'clock', 'I was working at eight o\'clock / Were you working at eight o\'clock?'],
        ['at that time', 'You were reading at that time / What were you doing at that time?'],
        ['at six', 'He was cooking dinner at six / Was he cooking dinner at six?'],
        ['at noon', 'She was writing a message at noon / Was she writing a message at noon?'],
        ['last night', 'They were watching TV last night / Were they watching TV last night?'],
        ['at midnight', 'I was not sleeping at midnight'],
        ['then', 'He was not watching TV then'],
        ['yesterday evening', 'They were not working yesterday evening'],
      ]}
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Питання: Was / Were на початку' : '7. Вопрос: Was / Were в начале'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб зробити питання, перенеси was або were на початок. Дія з -ing залишається після людини.'
        : 'Чтобы сделать вопрос, перенеси was или were в начало. Действие с -ing остаётся после человека.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Твердження' : 'Утверждение', isUK ? 'Питання' : 'Вопрос'],
        ['You were working at eight o\'clock', 'Were you working at eight o\'clock?'],
        ['He was cooking dinner at six', 'Was he cooking dinner at six?'],
        ['She was writing a message at noon', 'Was she writing a message at noon?'],
        ['They were watching TV last night', 'Were they watching TV last night?'],
        ['You were looking for your keys', 'Were you looking for your keys?'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did you were working? → ✅ Were you working? У Past Continuous питання робиться через was/were, не через did.'
        : '❌ Did you were working? → ✅ Were you working? В Past Continuous вопрос делается через was/were, не через did.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Спеціальні питання' : '8. Специальные вопросы'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У спеціальному питанні питальне слово ставиться перед was або were: What were you doing? Where were they waiting? Why was she crying?'
        : 'В специальном вопросе вопросительное слово ставится перед was или were: What were you doing? Where were they waiting? Why was she crying?'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питальне слово' : 'Вопросительное слово', 'was/were', isUK ? 'Хто?' : 'Кто?', isUK ? 'Дія-ing' : 'Действие-ing', isUK ? 'Фраза' : 'Фраза'],
        ['What', 'were', 'you', 'doing', 'What were you doing at that time?'],
        ['Where', 'were', 'they', 'waiting', 'Where were they waiting?'],
        ['Who', 'was', '', 'calling you', 'Who was calling you?'],
        ['Why', 'was', 'she', 'crying', 'Why was she crying?'],
        ['What', 'was', 'he', 'reading', 'What was he reading?'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ What you were doing? → ✅ What were you doing? У питанні were стоїть перед you.'
        : '❌ What you were doing? → ✅ What were you doing? В вопросе were стоит перед you.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Заперечення: was not / were not' : '9. Отрицание: was not / were not'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб сказати, що дія не була в процесі, постав not після was або were. Дія з -ing залишається.'
        : 'Чтобы сказать, что действие не было в процессе, поставь not после was или were. Действие с -ing остаётся.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Заперечення' : 'Отрицание'],
        ['I was sleeping at midnight', 'I was not sleeping at midnight'],
        ['You were listening to me', 'You were not listening to me'],
        ['He was watching TV then', 'He was not watching TV then'],
        ['She was using my phone', 'She was not using my phone'],
        ['We were waiting outside', 'We were not waiting outside'],
        ['They were working yesterday evening', 'They were not working yesterday evening'],
        ['I was driving fast', 'I was not driving fast'],
        ['He was checking messages', 'He was not checking messages'],
        ['She was talking to him', 'She was not talking to him'],
        ['We were discussing the problem', 'We were not discussing the problem'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ I did not was sleeping → ✅ I was not sleeping. У Past Continuous заперечення робиться через was not / were not.'
        : '❌ I did not was sleeping → ✅ I was not sleeping. В Past Continuous отрицание делается через was not / were not.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. While = поки / у той час як' : '10. While = пока / в то время как'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'While зʼєднує дві дії, які були в процесі одночасно. У цьому уроці обидві частини часто стоять у Past Continuous.'
        : 'While соединяет два действия, которые были в процессе одновременно. В этом уроке обе части часто стоят в Past Continuous.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['I was cooking while she was making coffee', isUK ? 'дві дії йшли паралельно' : 'два действия шли параллельно'],
        ['He was cleaning while we were talking', isUK ? 'cleaning і talking одночасно' : 'cleaning и talking одновременно'],
        ['She was writing while I was reading', isUK ? 'writing і reading одночасно' : 'writing и reading одновременно'],
        ['We were walking while it was raining', isUK ? 'walking і raining одночасно' : 'walking и raining одновременно'],
        ['They were waiting while we were buying tickets', isUK ? 'waiting і buying одночасно' : 'waiting и buying одновременно'],
        ['I was listening while he was speaking', isUK ? 'listening і speaking одночасно' : 'listening и speaking одновременно'],
        ['She was studying while they were watching TV', isUK ? 'studying і watching одночасно' : 'studying и watching одновременно'],
        ['We were working while you were sleeping', isUK ? 'working і sleeping одночасно' : 'working и sleeping одновременно'],
      ]}
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. When = коли коротка дія перервала процес' : '11. When = когда короткое действие прервало процесс'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'When часто показує момент, коли під час процесу сталася інша коротка дія. Процес стоїть у Past Continuous, коротка дія - у Past Simple.'
        : 'When часто показывает момент, когда во время процесса произошло другое короткое действие. Процесс стоит в Past Continuous, короткое действие - в Past Simple.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Процес' : 'Процесс', isUK ? 'Коротка дія' : 'Короткое действие', isUK ? 'Фраза' : 'Фраза'],
        ['I was working', 'you called', 'I was working when you called'],
        ['She was cooking', 'he arrived', 'She was cooking when he arrived'],
        ['We were eating', 'the phone rang', 'We were eating when the phone rang'],
        ['They were driving', 'it started raining', 'They were driving when it started raining'],
        ['He was sleeping', 'I opened the door', 'He was sleeping when I opened the door'],
        ['I was looking for my bag', 'you found it', 'I was looking for my bag when you found it'],
        ['She was talking to him', 'I came in', 'She was talking to him when I came in'],
        ['We were checking the tickets', 'the bus arrived', 'We were checking the tickets when the bus arrived'],
        ['They were watching a movie', 'I called', 'They were watching a movie when I called'],
        ['I was writing a message', 'you knocked on the door', 'I was writing a message when you knocked on the door'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ I was working when you were calling, якщо дзвінок був короткою подією → ✅ I was working when you called.'
        : '❌ I was working when you were calling, если звонок был коротким событием → ✅ I was working when you called.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Past Simple дії після when' : '12. Past Simple действия после when'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Після when у цих фразах часто стоїть коротка завершена дія в Past Simple: called, arrived, rang, started, opened, found, came, knocked.'
        : 'После when в этих фразах часто стоит короткое завершённое действие в Past Simple: called, arrived, rang, started, opened, found, came, knocked.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Past Simple дія' : 'Past Simple действие', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['called', 'I was working when you called / They were watching a movie when I called'],
        ['arrived', 'She was cooking when he arrived / We were checking the tickets when the bus arrived'],
        ['rang', 'We were eating when the phone rang'],
        ['started', 'They were driving when it started raining'],
        ['opened', 'He was sleeping when I opened the door'],
        ['found', 'I was looking for my bag when you found it'],
        ['came in', 'She was talking to him when I came in'],
        ['knocked on the door', 'I was writing a message when you knocked on the door'],
      ]}
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Look for, talk to, listen to' : '13. Look for, talk to, listen to'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У Past Continuous зберігаються знайомі блоки з прийменниками: look for, talk to, listen to. Прийменник не зникає.'
        : 'В Past Continuous сохраняются знакомые блоки с предлогами: look for, talk to, listen to. Предлог не исчезает.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['look for', 'I was looking for my keys / Were you looking for your keys? / I was looking for my bag'],
        ['talk to', 'You were talking to her / She was talking to him'],
        ['listen to', 'You were not listening to me / I was listening while he was speaking'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ I was looking my keys → ✅ I was looking for my keys. Look for = шукати.'
        : '❌ I was looking my keys → ✅ I was looking for my keys. Look for = искать.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Me, her, him, it, you після дії' : '14. Me, her, him, it, you после действия'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Після дії може стояти людина або предмет, на який спрямована дія: listening to me, talking to her, talking to him, calling you, found it.'
        : 'После действия может стоять человек или предмет, на который направлено действие: listening to me, talking to her, talking to him, calling you, found it.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', 'You were not listening to me'],
        ['her', 'You were talking to her'],
        ['him', 'She was not talking to him / She was talking to him'],
        ['you', 'Who was calling you? / I was working when you called'],
        ['it', 'I was looking for my bag when you found it'],
      ]}
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. My, your, her, the у фразах уроку' : '15. My, your, her, the в фразах урока'} />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['my keys', 'I was looking for my keys'],
        ['your keys', 'Were you looking for your keys?'],
        ['my phone', 'She was not using my phone'],
        ['her room', 'She was cleaning her room'],
        ['my bag', 'I was looking for my bag'],
        ['the problem', 'We were not discussing the problem'],
        ['the phone', 'We were eating when the phone rang'],
        ['the door', 'He was sleeping when I opened the door / you knocked on the door'],
        ['the tickets', 'We were checking the tickets when the bus arrived'],
        ['a movie', 'They were watching a movie when I called'],
        ['a message', 'She was writing a message / I was writing a message'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Готові блоки з уроку' : '16. Готовые блоки из урока'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'Past Continuous краще впізнавати готовими блоками: was working, were reading, was cooking, were waiting, was looking for.'
        : 'Past Continuous лучше узнавать готовыми блоками: was working, were reading, was cooking, were waiting, was looking for.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['was working at eight o\'clock', isUK ? 'працював о восьмій' : 'работал в восемь'],
        ['were reading at that time', isUK ? 'читав у той момент' : 'читал в тот момент'],
        ['was cooking dinner at six', isUK ? 'готував вечерю о шостій' : 'готовил ужин в шесть'],
        ['was writing a message at noon', isUK ? 'писала повідомлення опівдні' : 'писала сообщение в полдень'],
        ['were waiting near the door', isUK ? 'чекали біля дверей' : 'ждали у двери'],
        ['were watching TV last night', isUK ? 'дивилися телевізор минулої ночі' : 'смотрели телевизор прошлой ночью'],
        ['was looking for my keys', isUK ? 'шукав свої ключі' : 'искал свои ключи'],
        ['were talking to her', isUK ? 'розмовляв з нею' : 'разговаривал с ней'],
        ['was driving home', isUK ? 'їхав додому' : 'ехал домой'],
        ['was cleaning her room', isUK ? 'прибирала свою кімнату' : 'убирала свою комнату'],
      ]}
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['was not sleeping', isUK ? 'не спав' : 'не спал'],
        ['were not listening to me', isUK ? 'не слухав мене' : 'не слушал меня'],
        ['was not using my phone', isUK ? 'не користувалася моїм телефоном' : 'не пользовалась моим телефоном'],
        ['were not waiting outside', isUK ? 'не чекали ззовні' : 'не ждали снаружи'],
        ['was not driving fast', isUK ? 'не їхав швидко' : 'не ехал быстро'],
        ['were not discussing the problem', isUK ? 'не обговорювали проблему' : 'не обсуждали проблему'],
        ['was cooking while she was making coffee', isUK ? 'готував, поки вона робила каву' : 'готовил, пока она делала кофе'],
        ['was working when you called', isUK ? 'працював, коли ти подзвонив' : 'работал, когда ты позвонил'],
      ]}
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Найчастіші помилки' : '17. Самые частые ошибки'} />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ You was reading → ✅ You were reading. З you потрібне were.'
        : '❌ You was reading → ✅ You were reading. С you нужно were.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ Were he cooking dinner? → ✅ Was he cooking dinner? З he потрібне was.'
        : '❌ Were he cooking dinner? → ✅ Was he cooking dinner? С he нужно was.'
      }
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ They were not work → ✅ They were not working. У запереченні дія теж має -ing.'
        : '❌ They were not work → ✅ They were not working. В отрицании действие тоже имеет -ing.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ I was working when you were called → ✅ I was working when you called. Коротка дія після when стоїть у Past Simple.'
        : '❌ I was working when you were called → ✅ I was working when you called. Короткое действие после when стоит в Past Simple.'
      }
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Що треба винести з уроку' : '18. Что нужно вынести из урока'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати Past Continuous: was або were + дія з -ing. Was використовується з I, he, she, it. Were використовується з you, we, they. У питаннях was/were виходить на початок. У запереченнях став not після was/were. While часто зʼєднує два процеси, а when часто вводить коротку дію, яка сталася під час процесу.'
        : 'В этом уроке ты учишься строить Past Continuous: was или were + действие с -ing. Was используется с I, he, she, it. Were используется с you, we, they. В вопросах was/were выходит в начало. В отрицаниях ставь not после was/were. While часто соединяет два процесса, а when часто вводит короткое действие, которое произошло во время процесса.'
      }
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай чотири моделі: I was working at eight. Were you working? I was not sleeping. I was working when you called.'
        : 'Перед практикой держи четыре модели: I was working at eight. Were you working? I was not sleeping. I was working when you called.'
      }
    />,
  ],
},

// ── УРОК 26 ──────────────────────────────────────────────────
26: {
  titleRU: 'Условные предложения: if',
  titleUK: 'Умовні речення: if',
  titlePtBr: "Orações condicionais: if",
  titleVi: "Câu điều kiện: if",
  titleId: "Kalimat pengandaian: if",
  titleTr: "Koşul cümleleri: if",
  titlePl: "Zdania warunkowe: if",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся будувати речення з умовою: якщо щось станеться, буде результат. Наприклад: якщо ти допоможеш мені, я закінчу швидше. Якщо вона подзвонить, я відповім.'
        : 'В этом уроке ты учишься строить предложения с условием: если что-то произойдёт, будет результат. Например: если ты поможешь мне, я закончу быстрее. Если она позвонит, я отвечу.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Умова' : 'Условие', isUK ? 'Результат' : 'Результат'],
        ['If you help me', 'I will finish faster'],
        ['If she calls me', 'I will answer'],
        ['If we start now', 'we will finish today'],
        ['If it rains', 'we will stay home'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: if = якщо. Умова стоїть після if, результат часто стоїть з will.'
        : 'Главная идея: if = если. Условие стоит после if, результат часто стоит с will.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула першого типу' : '2. Главная формула первого типа'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'У більшості фраз уроку працює перший тип умовного речення: If + Present Simple, will + базова дія. Це реальна умова і реальний майбутній результат.'
        : 'В большинстве фраз урока работает первый тип условного предложения: If + Present Simple, will + базовое действие. Это реальное условие и реальный будущий результат.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        ['If + Present Simple', 'will + verb', isUK ? 'Фраза' : 'Фраза'],
        ['If you help me', 'I will finish faster', 'If you help me, I will finish faster'],
        ['If she calls me', 'I will answer', 'If she calls me, I will answer'],
        ['If we start now', 'we will finish today', 'If we start now, we will finish today'],
        ['If they come today', 'we will talk', 'If they come today, we will talk'],
        ['If he finds the keys', 'he will call us', 'If he finds the keys, he will call us'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ If you will help me, I will finish faster → ✅ If you help me, I will finish faster. Після if у цій моделі не ставимо will.'
        : '❌ If you will help me, I will finish faster → ✅ If you help me, I will finish faster. После if в этой модели не ставим will.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Чому після if немає will' : '3. Почему после if нет will'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Це головна пастка уроку. Українською або російською ми часто перекладаємо if-частину майбутнім: “якщо допоможеш”, “якщо подзвонить”, “якщо прийдуть”. Але в англійській після if використовується Present Simple.'
        : 'Это главная ловушка урока. По-русски мы часто переводим if-часть будущим: “если поможешь”, “если позвонит”, “если придут”. Но в английском после if используется Present Simple.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Українська / російська логіка' : 'Русская логика', isUK ? 'Англійська логіка' : 'Английская логика'],
        [isUK ? 'якщо ти допоможеш' : 'если ты поможешь', 'if you help'],
        [isUK ? 'якщо вона подзвонить' : 'если она позвонит', 'if she calls'],
        [isUK ? 'якщо вони прийдуть' : 'если они придут', 'if they come'],
        [isUK ? 'якщо він знайде ключі' : 'если он найдёт ключи', 'if he finds the keys'],
        [isUK ? 'якщо піде дощ' : 'если пойдёт дождь', 'if it rains'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ If she will calls me → ✅ If she calls me. Після if: Present Simple, а з she потрібне calls.'
        : '❌ If she will calls me → ✅ If she calls me. После if: Present Simple, а с she нужно calls.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. He / she / it після if: -s' : '4. He / she / it после if: -s'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Після if стоїть Present Simple. Тому з he, she, it дієслово отримує -s або -es: calls, finds, has, rains, sends, opens, studies, does not.'
        : 'После if стоит Present Simple. Поэтому с he, she, it глагол получает -s или -es: calls, finds, has, rains, sends, opens, studies, does not.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['If she calls me, I will answer', 'calls'],
        ['If he finds the keys, he will call us', 'finds'],
        ['If she has time, she will help us', 'has'],
        ['If it rains, we will stay home', 'rains'],
        ['If he sends the message, I will read it', 'sends'],
        ['If you open the app, it will work', 'will work у результаті'],
        ['If she studies every day, her English will improve', 'studies'],
        ['If it does not work, I will check it', 'does not work'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ If he find the keys → ✅ If he finds the keys. Після if все одно Present Simple, тому з he потрібне -s.'
        : '❌ If he find the keys → ✅ If he finds the keys. После if всё равно Present Simple, поэтому с he нужно -s.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Will у результаті' : '5. Will в результате'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'У другій частині речення часто стоїть will + базова дія. Will показує майбутній результат: I will finish, she will help, we will talk.'
        : 'Во второй части предложения часто стоит will + базовое действие. Will показывает будущий результат: I will finish, she will help, we will talk.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        ['will + verb', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['will finish', 'I will finish faster / we will finish today'],
        ['will answer', 'I will answer'],
        ['will talk', 'we will talk'],
        ['will call', 'he will call us'],
        ['will check', 'I will check them / I will check it'],
        ['will help', 'she will help us / we will help them'],
        ['will work', 'it will work'],
        ['will improve', 'her English will improve'],
        ['will read', 'I will read it'],
        ['will save', 'we will save money'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ She will helps us → ✅ She will help us. Після will дія завжди в базовій формі.'
        : '❌ She will helps us → ✅ She will help us. После will действие всегда в базовой форме.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Коли if-частина стоїть першою, ставиться кома' : '6. Когда if-часть стоит первой, ставится запятая'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах 1-25 if-частина стоїть першою. Після неї ставиться кома, а потім результат.'
        : 'В фразах 1-25 if-часть стоит первой. После неё ставится запятая, а потом результат.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'If-частина' : 'If-часть', isUK ? 'Кома' : 'Запятая', isUK ? 'Результат' : 'Результат'],
        ['If you help me', ',', 'I will finish faster'],
        ['If she calls me', ',', 'I will answer'],
        ['If it rains', ',', 'we will stay home'],
        ['If you do not call me', ',', 'I will wait'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Кома потрібна, коли речення починається з if: If it rains, we will stay home.'
        : 'Запятая нужна, когда предложение начинается с if: If it rains, we will stay home.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Якщо if стоїть другою частиною' : '7. Если if стоит второй частью'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах 26-35 результат стоїть першим, а if-частина другою. У такому порядку кома зазвичай не потрібна.'
        : 'В фразах 26-35 результат стоит первым, а if-часть второй. В таком порядке запятая обычно не нужна.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Результат / питання' : 'Результат / вопрос', 'if + condition'],
        ['Will you help me', 'if I ask?'],
        ['Will she call me', 'if she has time?'],
        ['Will they come', 'if we invite them?'],
        ['Will it work', 'if I restart the app?'],
        ['Will you wait', 'if I am late?'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? 'Не став кому механічно перед кожним if. Якщо if-частина друга, кома зазвичай не потрібна: Will you help me if I ask?'
        : 'Не ставь запятую механически перед каждым if. Если if-часть вторая, запятая обычно не нужна: Will you help me if I ask?'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Негативна умова: if + do not / does not' : '8. Отрицательное условие: if + do not / does not'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Умова може бути негативною: якщо ти не подзвониш, якщо вона не прийде, якщо вони не допоможуть. В англійській для цього використовуються do not або does not.'
        : 'Условие может быть отрицательным: если ты не позвонишь, если она не придёт, если они не помогут. В английском для этого используются do not или does not.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Негативна умова' : 'Отрицательное условие', isUK ? 'Результат' : 'Результат'],
        ['If you do not call me', 'I will wait'],
        ['If she does not come', 'we will start without her'],
        ['If they do not help us', 'we will do it ourselves'],
        ['If he does not find the keys', 'he will stay here'],
        ['If you do not check messages', 'you will miss the news'],
        ['If we do not leave now', 'we will be late'],
        ['If you do not save it', 'you will lose it'],
        ['If she does not sleep', 'she will feel tired'],
        ['If they do not pay today', 'they will have problems'],
        ['If it does not work', 'I will check it'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ If she do not come → ✅ If she does not come. З she потрібне does not.'
        : '❌ If she do not come → ✅ If she does not come. С she нужно does not.'
      }
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ If they does not help us → ✅ If they do not help us. З they потрібне do not.'
        : '❌ If they does not help us → ✅ If they do not help us. С they нужно do not.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Після does not дія без -s' : '9. После does not действие без -s'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Після does not основна дія повертається до базової форми: come, find, sleep, work. Не comes, не finds, не sleeps.'
        : 'После does not основное действие возвращается к базовой форме: come, find, sleep, work. Не comes, не finds, не sleeps.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Помилка' : 'Ошибка', isUK ? 'Правильно' : 'Правильно'],
        ['If she does not comes', 'If she does not come'],
        ['If he does not finds the keys', 'If he does not find the keys'],
        ['If she does not sleeps', 'If she does not sleep'],
        ['If it does not works', 'If it does not work'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ If it does not works, I will check it → ✅ If it does not work, I will check it. Після does not дія без -s.'
        : '❌ If it does not works, I will check it → ✅ If it does not work, I will check it. После does not действие без -s.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Питання з will + if' : '10. Вопросы с will + if'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли результат стоїть у питанні, will виходить на початок. If-частина залишається в Present Simple.'
        : 'Когда результат стоит в вопросе, will выходит в начало. If-часть остаётся в Present Simple.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        ['Will + subject + verb', 'if + Present Simple'],
        ['Will you help me', 'if I ask?'],
        ['Will she call me', 'if she has time?'],
        ['Will they come', 'if we invite them?'],
        ['Will it work', 'if I restart the app?'],
        ['Will you wait', 'if I am late?'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ Do you will help me if I ask? → ✅ Will you help me if I ask? У питанні will сам виходить на початок.'
        : '❌ Do you will help me if I ask? → ✅ Will you help me if I ask? В вопросе will сам выходит в начало.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Спеціальні питання з will + if' : '11. Специальные вопросы с will + if'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У спеціальних питаннях спочатку стоїть питальне слово, потім will, потім підмет і дія. If-частина все одно залишається в Present Simple.'
        : 'В специальных вопросах сначала стоит вопросительное слово, потом will, потом подлежащее и действие. If-часть всё равно остаётся в Present Simple.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питальне слово' : 'Вопросительное слово', 'will', isUK ? 'Хто?' : 'Кто?', isUK ? 'Дія' : 'Действие', 'if + condition'],
        ['What', 'will', 'you', 'do', 'if it rains?'],
        ['Where', 'will', 'we', 'go', 'if they come?'],
        ['Who', 'will', '', 'help us', 'if he leaves?'],
        ['What', 'will', '', 'happen', 'if we start now?'],
        ['How', 'will', 'you', 'feel', 'if you lose your phone?'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ What you will do if it rains? → ✅ What will you do if it rains? У спеціальному питанні will стоїть перед you.'
        : '❌ What you will do if it rains? → ✅ What will you do if it rains? В специальном вопросе will стоит перед you.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ How you will feel if you lose your phone? → ✅ How will you feel if you lose your phone? Після how ставимо will.'
        : '❌ How you will feel if you lose your phone? → ✅ How will you feel if you lose your phone? После how ставим will.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Zero Conditional: факти і закономірності' : '12. Zero Conditional: факты и закономерности'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах 36-42 зʼявляється інший тип: If + Present Simple, Present Simple. Це не конкретне майбутнє, а загальний факт або закономірність.'
        : 'В фразах 36-42 появляется другой тип: If + Present Simple, Present Simple. Это не конкретное будущее, а общий факт или закономерность.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        ['If + Present Simple', 'Present Simple', isUK ? 'Фраза' : 'Фраза'],
        ['If you heat water', 'it gets hot', 'If you heat water, it gets hot'],
        ['If people do not sleep', 'they feel tired', 'If people do not sleep, they feel tired'],
        ['If you study every day', 'you learn faster', 'If you study every day, you learn faster'],
        ['If you spend money', 'you have less money', 'If you spend money, you have less money'],
        ['If you help people', 'they remember it', 'If you help people, they remember it'],
        ['If you open the door', 'light comes in', 'If you open the door, light comes in'],
        ['If you press this button', 'the app starts', 'If you press this button, the app starts'],
      ]}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Порівняй: If it rains, we will stay home = конкретна майбутня ситуація. If you heat water, it gets hot = загальна закономірність.'
        : 'Сравни: If it rains, we will stay home = конкретная будущая ситуация. If you heat water, it gets hot = общая закономерность.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Команди після if' : '13. Команды после if'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах 43-50 результатом є не will, а команда або інструкція: подзвони, відпочинь, скажи, виправ, спитай, зачекай, надішли.'
        : 'В фразах 43-50 результатом является не will, а команда или инструкция: позвони, отдохни, скажи, исправь, спроси, подожди, отправь.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        ['if + condition', isUK ? 'команда / інструкція' : 'команда / инструкция'],
        ['If you need help', 'call me'],
        ['If you are tired', 'rest'],
        ['If you find my bag', 'tell me'],
        ['If you see a mistake', 'fix it'],
        ['If you have questions', 'ask me'],
        ['If you finish early', 'call her'],
        ['If they arrive late', 'wait for them'],
        ['If it is important', 'send it today'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ If you need help, you call me → ✅ If you need help, call me. У команді підмет you зазвичай не ставиться.'
        : '❌ If you need help, you call me → ✅ If you need help, call me. В команде подлежащее you обычно не ставится.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. If + To Be: if I am late / if you are tired' : '14. If + To Be: if I am late / if you are tired'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Після if може стояти не тільки звичайна дія, а й To Be: if I am late, if you are tired, if it is important.'
        : 'После if может стоять не только обычное действие, но и To Be: if I am late, if you are tired, if it is important.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        ['if + To Be', isUK ? 'Результат' : 'Результат'],
        ['if I am late', 'Will you wait if I am late?'],
        ['if you are tired', 'If you are tired, rest'],
        ['if it is important', 'If it is important, send it today'],
      ]}
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ if I will be late → ✅ if I am late. Після if у цій моделі використовуємо am, не will be.'
        : '❌ if I will be late → ✅ if I am late. После if в этой модели используем am, не will be.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Object forms: me, us, them, him, her, it' : '15. Object forms: me, us, them, him, her, it'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку багато коротких форм після дії: help me, call us, check them, help them, tell him, tell me, call her, fix it, send it.'
        : 'В фразах урока много коротких форм после действия: help me, call us, check them, help them, tell him, tell me, call her, fix it, send it.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', 'If you help me / If she calls me / If you do not call me / Will you help me if I ask? / call me'],
        ['us', 'he will call us / she will help us / they do not help us / Who will help us if he leaves?'],
        ['them', 'I will check them / we will help them / Will they come if we invite them? / wait for them'],
        ['him', 'If I see him, I will tell him'],
        ['her', 'If she does not come, we will start without her / call her'],
        ['it', 'I will read it / save it / lose it / check it / fix it / send it today'],
      ]}
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ I will check they → ✅ I will check them. Після check потрібна форма them.'
        : '❌ I will check they → ✅ I will check them. После check нужна форма them.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ I will tell he → ✅ I will tell him. Після tell потрібна форма him.'
        : '❌ I will tell he → ✅ I will tell him. После tell нужна форма him.'
      }
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Without her / ourselves' : '16. Without her / ourselves'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У двох фразах є важливі додаткові блоки: without her і ourselves. Вони не головна тема, але у фразах вони є, тому їх треба розуміти.'
        : 'В двух фразах есть важные дополнительные блоки: without her и ourselves. Они не главная тема, но во фразах они есть, поэтому их нужно понимать.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['without her', 'If she does not come, we will start without her', isUK ? 'без неї' : 'без неё'],
        ['ourselves', 'If they do not help us, we will do it ourselves', isUK ? 'самі / самостійно' : 'сами / самостоятельно'],
      ]}
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'We will do it ourselves = ми зробимо це самі. Ourselves підкреслює, що без чужої допомоги.'
        : 'We will do it ourselves = мы сделаем это сами. Ourselves подчёркивает, что без чужой помощи.'
      }
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Time markers у фразах уроку' : '17. Time markers в фразах урока'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'Умовні речення часто мають уточнення часу: now, today, every day, early, late. Вони допомагають зрозуміти ситуацію.'
        : 'Условные предложения часто имеют уточнения времени: now, today, every day, early, late. Они помогают понять ситуацию.'
      }
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Маркер' : 'Маркер', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['now', 'If we start now / If we do not leave now / What will happen if we start now?'],
        ['today', 'If they come today / If we buy tickets today / If they do not pay today / send it today'],
        ['every day', 'If she studies every day / If you study every day'],
        ['early', 'If you finish early, call her'],
        ['late', 'Will you wait if I am late? / If they arrive late, wait for them'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Готові блоки з уроку' : '18. Готовые блоки из урока'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'Умовні речення краще впізнавати готовими блоками: if you help me, if she calls me, if it rains, if you do not call me.'
        : 'Условные предложения лучше узнавать готовыми блоками: if you help me, if she calls me, if it rains, if you do not call me.'
      }
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['if you help me', isUK ? 'якщо ти допоможеш мені' : 'если ты поможешь мне'],
        ['if she calls me', isUK ? 'якщо вона зателефонує мені' : 'если она позвонит мне'],
        ['if we start now', isUK ? 'якщо ми почнемо зараз' : 'если мы начнём сейчас'],
        ['if they come today', isUK ? 'якщо вони прийдуть сьогодні' : 'если они придут сегодня'],
        ['if he finds the keys', isUK ? 'якщо він знайде ключі' : 'если он найдёт ключи'],
        ['if you bring documents', isUK ? 'якщо ти принесеш документи' : 'если ты принесёшь документы'],
        ['if she has time', isUK ? 'якщо в неї буде час' : 'если у неё будет время'],
        ['if it rains', isUK ? 'якщо піде дощ' : 'если пойдёт дождь'],
        ['if you wait here', isUK ? 'якщо ти почекаєш тут' : 'если ты подождёшь здесь'],
        ['if we buy tickets today', isUK ? 'якщо ми купимо квитки сьогодні' : 'если мы купим билеты сегодня'],
      ]}
    />,

    <Table
      key="t19"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['if you do not call me', isUK ? 'якщо ти не подзвониш мені' : 'если ты не позвонишь мне'],
        ['if she does not come', isUK ? 'якщо вона не прийде' : 'если она не придёт'],
        ['if they do not help us', isUK ? 'якщо вони не допоможуть нам' : 'если они не помогут нам'],
        ['if he does not find the keys', isUK ? 'якщо він не знайде ключі' : 'если он не найдёт ключи'],
        ['if you do not check messages', isUK ? 'якщо ти не перевіриш повідомлення' : 'если ты не проверишь сообщения'],
        ['if we do not leave now', isUK ? 'якщо ми не підемо зараз' : 'если мы не уйдём сейчас'],
        ['if it does not work', isUK ? 'якщо це не працюватиме' : 'если это не будет работать'],
        ['if you need help', isUK ? 'якщо тобі потрібна допомога' : 'если тебе нужна помощь'],
        ['if you are tired', isUK ? 'якщо ти втомився' : 'если ты устал'],
        ['if it is important', isUK ? 'якщо це важливо' : 'если это важно'],
      ]}
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Переклад не завжди дослівний' : '19. Перевод не всегда дословный'} />,

    <Body
      key="b19a"
      t={t}
      f={f}
      text={isUK
        ? 'Українською або російською if-частина часто звучить як майбутнє: “якщо допоможеш”, “якщо прийде”, “якщо піде дощ”. Але англійською після if стоїть Present Simple.'
        : 'По-русски if-часть часто звучит как будущее: “если поможешь”, “если придёт”, “если пойдёт дождь”. Но по-английски после if стоит Present Simple.'
      }
    />,

    <Table
      key="t20"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['If you help me, I will finish faster', isUK ? 'Якщо ти допоможеш мені, я закінчу швидше' : 'Если ты поможешь мне, я закончу быстрее'],
        ['If she calls me, I will answer', isUK ? 'Якщо вона зателефонує мені, я відповім' : 'Если она позвонит мне, я отвечу'],
        ['If it rains, we will stay home', isUK ? 'Якщо піде дощ, ми залишимося вдома' : 'Если пойдёт дождь, мы останемся дома'],
        ['If she has time, she will help us', isUK ? 'Якщо в неї буде час, вона допоможе нам' : 'Если у неё будет время, она поможет нам'],
        ['If people do not sleep, they feel tired', isUK ? 'Якщо люди не сплять, вони відчувають втому' : 'Если люди не спят, они чувствуют усталость'],
        ['If you need help, call me', isUK ? 'Якщо тобі потрібна допомога, зателефонуй мені' : 'Если тебе нужна помощь, позвони мне'],
      ]}
    />,

    <Section key="s20" t={t} f={f} title={isUK ? '20. Найчастіші помилки' : '20. Самые частые ошибки'} />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ If you will help me, I will finish faster → ✅ If you help me, I will finish faster. Після if не ставимо will.'
        : '❌ If you will help me, I will finish faster → ✅ If you help me, I will finish faster. После if не ставим will.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ If she call me, I will answer → ✅ If she calls me, I will answer. З she потрібне -s.'
        : '❌ If she call me, I will answer → ✅ If she calls me, I will answer. С she нужно -s.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ If he will find the keys, he will call us → ✅ If he finds the keys, he will call us.'
        : '❌ If he will find the keys, he will call us → ✅ If he finds the keys, he will call us.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ If she does not comes → ✅ If she does not come. Після does not дія без -s.'
        : '❌ If she does not comes → ✅ If she does not come. После does not действие без -s.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ If they does not help us → ✅ If they do not help us. З they потрібне do not.'
        : '❌ If they does not help us → ✅ If they do not help us. С they нужно do not.'
      }
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ Will she calls me if she has time? → ✅ Will she call me if she has time? Після will дія без -s.'
        : '❌ Will she calls me if she has time? → ✅ Will she call me if she has time? После will действие без -s.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ What you will do if it rains? → ✅ What will you do if it rains? У питанні will стоїть перед you.'
        : '❌ What you will do if it rains? → ✅ What will you do if it rains? В вопросе will стоит перед you.'
      }
    />,

    <Warn
      key="w23"
      t={t}
      f={f}
      text={isUK
        ? '❌ If you heat water, it will gets hot → ✅ If you heat water, it gets hot. Це загальний факт, тут без will.'
        : '❌ If you heat water, it will gets hot → ✅ If you heat water, it gets hot. Это общий факт, тут без will.'
      }
    />,

    <Warn
      key="w24"
      t={t}
      f={f}
      text={isUK
        ? '❌ If you need help, you call me → ✅ If you need help, call me. У команді you зазвичай не ставиться.'
        : '❌ If you need help, you call me → ✅ If you need help, call me. В команде you обычно не ставится.'
      }
    />,

    <Warn
      key="w25"
      t={t}
      f={f}
      text={isUK
        ? '❌ If they arrive late, wait them → ✅ If they arrive late, wait for them. Після wait потрібне for.'
        : '❌ If they arrive late, wait them → ✅ If they arrive late, wait for them. После wait нужно for.'
      }
    />,

    <Section key="s21" t={t} f={f} title={isUK ? '21. Що треба винести з уроку' : '21. Что нужно вынести из урока'} />,

    <Body
      key="b21a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти тренуєш три моделі з if. Перша: реальна майбутня умова - If + Present Simple, will + verb. Друга: загальний факт - If + Present Simple, Present Simple. Третя: умова + команда - If + Present Simple, command.'
        : 'В этом уроке ты тренируешь три модели с if. Первая: реальное будущее условие - If + Present Simple, will + verb. Вторая: общий факт - If + Present Simple, Present Simple. Третья: условие + команда - If + Present Simple, command.'
      }
    />,

    <Tip
      key="tip5"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай три моделі: If you help me, I will finish faster. If you heat water, it gets hot. If you need help, call me.'
        : 'Перед практикой держи три модели: If you help me, I will finish faster. If you heat water, it gets hot. If you need help, call me.'
      }
    />,
  ],
},

// ── УРОК 27 ──────────────────────────────────────────────────
27: {
  titleRU: 'Косвенная речь: said that / told me that',
  titleUK: 'Непряма мова: said that / told me that',
  titlePtBr: "Discurso indireto: said that / told me that",
  titleVi: "Câu tường thuật: said that / told me that",
  titleId: "Kalimat tidak langsung: said that / told me that",
  titleTr: "Dolaylı anlatım: said that / told me that",
  titlePl: "Mowa zależna: said that / told me that",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся переказувати чужі слова. Не цитувати дослівно, а говорити: він сказав, що втомився; вона сказала, що зайнята; вони сказали, що готові; він сказав мені, що все гаразд.'
        : 'В этом уроке ты учишься пересказывать чужие слова. Не цитировать дословно, а говорить: он сказал, что устал; она сказала, что занята; они сказали, что готовы; он сказал мне, что всё в порядке.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Пряма ідея' : 'Прямая идея', isUK ? 'Косвенная речь' : 'Косвенная речь'],
        ['I am tired', 'He said that he was tired'],
        ['I am busy', 'She said that she was busy'],
        ['We are ready', 'They said that they were ready'],
        ['I need help', 'I said that I needed help'],
        ['I will call you', 'He said that he would call me'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: reported speech переказує чужі слова через that. Часто час у другій частині зсувається назад.'
        : 'Главная идея: reported speech пересказывает чужие слова через that. Часто время во второй части сдвигается назад.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Базова формула уроку: хто + said/told/explained/promised/warned/admitted/replied + that + переказана думка.'
        : 'Базовая формула урока: кто + said/told/explained/promised/warned/admitted/replied + that + пересказанная мысль.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто переказує?' : 'Кто пересказывает?', isUK ? 'Дієслово введення' : 'Глагол введения', 'that', isUK ? 'Переказана думка' : 'Пересказанная мысль'],
        ['He', 'said', 'that', 'he was tired'],
        ['She', 'said', 'that', 'she was busy'],
        ['They', 'said', 'that', 'they were ready'],
        ['He', 'told me', 'that', 'he was okay'],
        ['She', 'told us', 'that', 'she was ready'],
        ['He', 'explained', 'that', 'everything was okay'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he is tired → ✅ He said that he was tired. У фразах уроку після said часто йде зсув назад.'
        : '❌ He said that he is tired → ✅ He said that he was tired. Во фразах урока после said часто идёт сдвиг назад.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Said that = сказав, що' : '3. Said that = сказал, что'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Said that використовується, коли ми просто переказуємо, що хтось сказав. Після said не ставимо людину, кому сказали.'
        : 'Said that используется, когда мы просто пересказываем, что кто-то сказал. После said не ставим человека, кому сказали.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['He said that he was tired', isUK ? 'Він сказав, що втомився' : 'Он сказал, что устал'],
        ['She said that she was busy', isUK ? 'Вона сказала, що зайнята' : 'Она сказала, что занята'],
        ['They said that they were ready', isUK ? 'Вони сказали, що готові' : 'Они сказали, что готовы'],
        ['We said that we were at home', isUK ? 'Ми сказали, що були вдома' : 'Мы сказали, что были дома'],
        ['I said that I needed help', isUK ? 'Я сказав, що мені потрібна допомога' : 'Я сказал, что мне нужна помощь'],
        ['You said that you wanted coffee', isUK ? 'Ти сказав, що хотів каву' : 'Ты сказал, что хотел кофе'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said me that he was tired → ✅ He told me that he was tired або He said that he was tired. Said не бере me одразу після себе в цій моделі.'
        : '❌ He said me that he was tired → ✅ He told me that he was tired или He said that he was tired. Said не берёт me сразу после себя в этой модели.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Told me / told us = сказав мені / нам' : '4. Told me / told us = сказал мне / нам'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Told використовується, коли ми кажемо, кому саме щось сказали: told me, told us. Після told потрібна людина.'
        : 'Told используется, когда мы говорим, кому именно что-то сказали: told me, told us. После told нужен человек.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['He told me that he was okay', isUK ? 'told + me' : 'told + me'],
        ['She told us that she was ready', isUK ? 'told + us' : 'told + us'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ He told that he was okay → ✅ He told me that he was okay. Якщо використовуєш told, треба сказати кому.'
        : '❌ He told that he was okay → ✅ He told me that he was okay. Если используешь told, нужно сказать кому.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Was / were після said that' : '5. Was / were после said that'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'У багатьох фразах уроку am/is/are з прямої мови перетворюється на was/were в переказі.'
        : 'Во многих фразах урока am/is/are из прямой речи превращается в was/were в пересказе.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Логіка прямої мови' : 'Логика прямой речи', isUK ? 'Косвенная речь з уроку' : 'Косвенная речь из урока'],
        ['he is tired', 'He said that he was tired'],
        ['she is busy', 'She said that she was busy'],
        ['they are ready', 'They said that they were ready'],
        ['we are at home', 'We said that we were at home'],
        ['he is okay', 'He told me that he was okay'],
        ['she is ready', 'She told us that she was ready'],
        ['everything is okay', 'He explained that everything was okay'],
        ['it is dangerous', 'They warned us that it was dangerous'],
        ['everything is okay', 'He replied that everything was okay'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ They said that they are ready → ✅ They said that they were ready. Are зсувається в were.'
        : '❌ They said that they are ready → ✅ They said that they were ready. Are сдвигается в were.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Present Simple → Past Simple' : '6. Present Simple → Past Simple'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли ми переказуємо звичайні дії або стани після said that, Present Simple часто стає Past Simple: need → needed, want → wanted, know → knew, remember → remembered.'
        : 'Когда мы пересказываем обычные действия или состояния после said that, Present Simple часто становится Past Simple: need → needed, want → wanted, know → knew, remember → remembered.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайна форма' : 'Обычная форма', isUK ? 'Переказ у минулому' : 'Пересказ в прошлом', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['need', 'needed', 'I said that I needed help'],
        ['want', 'wanted', 'You said that you wanted coffee'],
        ['know', 'knew', 'He said that he knew the answer'],
        ['remember', 'remembered', 'She said that she remembered me'],
        ['have', 'had', 'They said that they had time / We said that we had questions'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ I said that I need help → ✅ I said that I needed help. У фразі уроку need зсувається в needed.'
        : '❌ I said that I need help → ✅ I said that I needed help. Во фразе урока need сдвигается в needed.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Had = мав / було у когось' : '7. Had = имел / было у кого-то'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Had у фразах 9-10 означає “мали / було у нас”. Це не Past Perfect. Це просто минула форма have.'
        : 'Had во фразах 9-10 означает “имели / было у нас”. Это не Past Perfect. Это просто прошедшая форма have.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['They said that they had time', isUK ? 'Вони сказали, що мали час' : 'Они сказали, что у них было время'],
        ['We said that we had questions', isUK ? 'Ми сказали, що мали питання' : 'Мы сказали, что у нас были вопросы'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Had time = був час. Had questions = були питання.'
        : 'Had time = было время. Had questions = были вопросы.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Will → would' : '8. Will → would'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли ми переказуємо майбутню дію після said that, will часто стає would. Українською або російською це все одно перекладається майбутнім: подзвонить, допоможе, прийдуть, закінчимо.'
        : 'Когда мы пересказываем будущее действие после said that, will часто становится would. По-русски это всё равно переводится будущим: позвонит, поможет, придут, закончим.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Косвенная речь з уроку' : 'Косвенная речь из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['He said that he would call me', isUK ? 'Він сказав, що подзвонить мені' : 'Он сказал, что позвонит мне'],
        ['She said that she would help us', isUK ? 'Вона сказала, що допоможе нам' : 'Она сказала, что поможет нам'],
        ['They said that they would come later', isUK ? 'Вони сказали, що прийдуть пізніше' : 'Они сказали, что придут позже'],
        ['We said that we would finish today', isUK ? 'Ми сказали, що закінчимо сьогодні' : 'Мы сказали, что закончим сегодня'],
        ['I said that I would send the message', isUK ? 'Я сказав, що надішлю повідомлення' : 'Я сказал, что отправлю сообщение'],
        ['You said that you would check the documents', isUK ? 'Ти сказав, що перевіриш документи' : 'Ты сказал, что проверишь документы'],
        ['He said that he would bring the keys', isUK ? 'Він сказав, що принесе ключі' : 'Он сказал, что принесёт ключи'],
        ['She said that she would open the door', isUK ? 'Вона сказала, що відчинить двері' : 'Она сказала, что откроет дверь'],
        ['They said that they would wait outside', isUK ? 'Вони сказали, що зачекають надворі' : 'Они сказали, что подождут снаружи'],
        ['We said that we would start soon', isUK ? 'Ми сказали, що скоро почнемо' : 'Мы сказали, что скоро начнём'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he will call me → ✅ He said that he would call me. У фразах уроку will зсувається в would.'
        : '❌ He said that he will call me → ✅ He said that he would call me. Во фразах урока will сдвигается в would.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Після would дія без -s і без минулої форми' : '9. После would действие без -s и без прошедшей формы'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Після would основна дія стоїть у базовій формі: call, help, come, finish, send, check, bring, open, wait, start.'
        : 'После would основное действие стоит в базовой форме: call, help, come, finish, send, check, bring, open, wait, start.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        ['would + verb', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['would call', 'He said that he would call me'],
        ['would help', 'She said that she would help us'],
        ['would come', 'They said that they would come later'],
        ['would finish', 'We said that we would finish today'],
        ['would send', 'I said that I would send the message'],
        ['would check', 'You said that you would check the documents'],
        ['would bring', 'He said that he would bring the keys'],
        ['would open', 'She said that she would open the door'],
        ['would wait', 'They said that they would wait outside'],
        ['would start', 'We said that we would start soon'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ She said that she would helps us → ✅ She said that she would help us. Після would дія без -s.'
        : '❌ She said that she would helps us → ✅ She said that she would help us. После would действие без -s.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Can → could' : '10. Can → could'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Can у косвенній мові часто стає could. У цьому уроці could означає “міг / могла / могли”.'
        : 'Can в косвенной речи часто становится could. В этом уроке could означает “мог / могла / могли”.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['He said that he could help', isUK ? 'Він сказав, що міг допомогти' : 'Он сказал, что мог помочь'],
        ['She said that she could call him', isUK ? 'Вона сказала, що могла подзвонити йому' : 'Она сказала, что могла позвонить ему'],
        ['They said that they could find it', isUK ? 'Вони сказали, що могли знайти це' : 'Они сказали, что могли найти это'],
        ['We said that we could work today', isUK ? 'Ми сказали, що могли працювати сьогодні' : 'Мы сказали, что могли работать сегодня'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he can help → ✅ He said that he could help. У фразі уроку can зсувається в could.'
        : '❌ He said that he can help → ✅ He said that he could help. Во фразе урока can сдвигается в could.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Could not = не міг / не могла' : '11. Could not = не мог / не могла'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Could not означає “не міг / не могла / не могли”. Після could not дія стоїть у базовій формі.'
        : 'Could not означает “не мог / не могла / не могли”. После could not действие стоит в базовой форме.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I said that I could not wait', isUK ? 'Я сказав, що не міг чекати' : 'Я сказал, что не мог ждать'],
        ['You said that you could not hear me', isUK ? 'Ти сказав, що не міг чути мене' : 'Ты сказал, что не мог слышать меня'],
        ['He said that he could not find the phone', isUK ? 'Він сказав, що не міг знайти телефон' : 'Он сказал, что не мог найти телефон'],
        ['She said that she could not open the app', isUK ? 'Вона сказала, що не могла відкрити застосунок' : 'Она сказала, что не могла открыть приложение'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he could not found the phone → ✅ He said that he could not find the phone. Після could not дія без минулої форми.'
        : '❌ He said that he could not found the phone → ✅ He said that he could not find the phone. После could not действие без прошедшей формы.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Did not у переказі' : '12. Did not в пересказе'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах 31-38 є заперечення через did not. Воно переказує, що людина чогось не знала, не памʼятала, не мала, не розуміла, не бачила або не хотіла.'
        : 'В фразах 31-38 есть отрицание через did not. Оно пересказывает, что человек чего-то не знал, не помнил, не имел, не понимал, не видел или не хотел.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['He said that he did not know', isUK ? 'Він сказав, що не знав' : 'Он сказал, что не знал'],
        ['She said that she did not remember', isUK ? 'Вона сказала, що не памʼятала' : 'Она сказала, что не помнила'],
        ['They said that they did not have money', isUK ? 'Вони сказали, що не мали грошей' : 'Они сказали, что у них не было денег'],
        ['We said that we did not need help', isUK ? 'Ми сказали, що нам не потрібна була допомога' : 'Мы сказали, что нам не нужна была помощь'],
        ['I said that I did not understand', isUK ? 'Я сказав, що не розумів' : 'Я сказал, что не понимал'],
        ['You said that you did not see it', isUK ? 'Ти сказав, що не бачив це' : 'Ты сказал, что не видел это'],
        ['He said that he did not want coffee', isUK ? 'Він сказав, що не хотів каву' : 'Он сказал, что не хотел кофе'],
        ['She said that she did not like waiting', isUK ? 'Вона сказала, що їй не подобалося чекати' : 'Она сказала, что ей не нравилось ждать'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he did not knew → ✅ He said that he did not know. Після did not дія в базовій формі.'
        : '❌ He said that he did not knew → ✅ He said that he did not know. После did not действие в базовой форме.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Past Perfect: had + V3' : '13. Past Perfect: had + V3'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах 39-45 є had + третя форма. Це переказ завершеної дії: він вже закінчив, вона подзвонила, вони надіслали документи, ми знайшли ключі.'
        : 'В фразах 39-45 есть had + третья форма. Это пересказ завершённого действия: он уже закончил, она позвонила, они отправили документы, мы нашли ключи.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['He said that he had finished', 'had + finished'],
        ['She said that she had called me', 'had + called'],
        ['They said that they had sent documents', 'had + sent'],
        ['We said that we had found the keys', 'had + found'],
        ['I said that I had lost my phone', 'had + lost'],
        ['You said that you had checked it', 'had + checked'],
        ['She said that she had already paid', 'had + already + paid'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ She said that she had call me → ✅ She said that she had called me. Після had потрібна третя форма.'
        : '❌ She said that she had call me → ✅ She said that she had called me. После had нужна третья форма.'
      }
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ We said that we had find the keys → ✅ We said that we had found the keys. Find → found.'
        : '❌ We said that we had find the keys → ✅ We said that we had found the keys. Find → found.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Was told / were told = сказали кому-то' : '14. Was told / were told = сказали кому-то'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах 20-23 є пасивна форма was told / were told. Вона означає “мені сказали”, “нам сказали”, “їй сказали”, “їм сказали”.'
        : 'В фразах 20-23 есть пассивная форма was told / were told. Она означает “мне сказали”, “нам сказали”, “ей сказали”, “им сказали”.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['We were told that the room was cleaned', isUK ? 'Нам сказали, що кімнату прибрали' : 'Нам сказали, что комнату убрали'],
        ['I was told that the app was fixed', isUK ? 'Мені сказали, що додаток полагодили' : 'Мне сказали, что приложение починили'],
        ['She was told that the tickets were sold', isUK ? 'Їй сказали, що квитки продані' : 'Ей сказали, что билеты проданы'],
        ['They were told that the problem was solved', isUK ? 'Їм сказали, що проблему вирішили' : 'Им сказали, что проблема решена'],
      ]}
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ We told that the room was cleaned → ✅ We were told that the room was cleaned. Якщо значення “нам сказали”, потрібне were told.'
        : '❌ We told that the room was cleaned → ✅ We were told that the room was cleaned. Если значение “нам сказали”, нужно were told.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Other reporting verbs: explained, promised, warned, admitted, replied' : '15. Other reporting verbs: explained, promised, warned, admitted, replied'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У кінці уроку зʼявляються не тільки said і told, а й інші дієслова введення: explained, promised, warned, admitted, replied.'
        : 'В конце урока появляются не только said и told, но и другие глаголы введения: explained, promised, warned, admitted, replied.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Дієслово' : 'Глагол', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['explained', isUK ? 'пояснив' : 'объяснил', 'He explained that everything was okay'],
        ['explained', isUK ? 'пояснив' : 'объяснил', 'He explained that he was late'],
        ['promised', isUK ? 'пообіцяла' : 'пообещала', 'She promised that she would call later'],
        ['warned us', isUK ? 'попередили нас' : 'предупредили нас', 'They warned us that it was dangerous'],
        ['admitted', isUK ? 'визнали' : 'признали', 'We admitted that we had made a mistake'],
        ['replied', isUK ? 'відповів' : 'ответил', 'He replied that everything was okay'],
      ]}
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? 'Warned us = попередили нас. Після warned у цій фразі потрібне us, бо сказано, кого попередили.'
        : 'Warned us = предупредили нас. После warned в этой фразе нужно us, потому что сказано, кого предупредили.'
      }
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. That можна чути як “що”' : '16. That можно слышать как “что”'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці that зʼєднує дієслово введення і переказану думку. Українською або російською це зазвичай “що / что”.'
        : 'В этом уроке that соединяет глагол введения и пересказанную мысль. По-русски это обычно “что”.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        ['said that', isUK ? 'сказав, що' : 'сказал, что'],
        ['told me that', isUK ? 'сказав мені, що' : 'сказал мне, что'],
        ['explained that', isUK ? 'пояснив, що' : 'объяснил, что'],
        ['promised that', isUK ? 'пообіцяла, що' : 'пообещала, что'],
        ['warned us that', isUK ? 'попередили нас, що' : 'предупредили нас, что'],
        ['admitted that', isUK ? 'визнали, що' : 'признали, что'],
        ['replied that', isUK ? 'відповів, що' : 'ответил, что'],
      ]}
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Займенники і обʼєктні форми' : '17. Местоимения и объектные формы'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку багато коротких форм після дії: me, us, him, it. Вони показують, на кого або на що спрямована дія.'
        : 'В фразах урока много коротких форм после действия: me, us, him, it. Они показывают, на кого или на что направлено действие.'
      }
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', 'She said that she remembered me / He said that he would call me / She said that she had called me'],
        ['us', 'She told us that she was ready / She said that she would help us / They warned us that it was dangerous'],
        ['him', 'She said that she could call him'],
        ['it', 'They said that they could find it / You said that you did not see it / You said that you had checked it'],
      ]}
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ She remembered I → ✅ She remembered me. Після remembered потрібна форма me.'
        : '❌ She remembered I → ✅ She remembered me. После remembered нужна форма me.'
      }
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. The, my, a у фразах уроку' : '18. The, my, a в фразах урока'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці не головна тема артиклі, але у фразах є the, my і a. Їх треба бачити, щоб фраза не виглядала незнайомою.'
        : 'В этом уроке не главная тема артикли, но во фразах есть the, my и a. Их нужно видеть, чтобы фраза не выглядела незнакомой.'
      }
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['the answer', 'He said that he knew the answer'],
        ['the message', 'I said that I would send the message'],
        ['the documents', 'You said that you would check the documents'],
        ['the keys', 'He said that he would bring the keys / We said that we had found the keys'],
        ['the door', 'She said that she would open the door'],
        ['the phone', 'He said that he could not find the phone'],
        ['the app', 'She said that she could not open the app'],
        ['my phone', 'I said that I had lost my phone'],
        ['a mistake', 'We admitted that we had made a mistake'],
      ]}
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Часові слова: later, today, soon, already' : '19. Временные слова: later, today, soon, already'} />,

    <Body
      key="b19a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку є кілька часових слів. Вони не змінюються в цих готових фразах, але допомагають зрозуміти час події.'
        : 'В фразах урока есть несколько временных слов. Они не меняются в этих готовых фразах, но помогают понять время события.'
      }
    />,

    <Table
      key="t19"
      t={t}
      f={f}
      rows={[
        ['later', 'They said that they would come later / She promised that she would call later'],
        ['today', 'We said that we would finish today / We said that we could work today'],
        ['soon', 'We said that we would start soon'],
        ['outside', 'They said that they would wait outside'],
        ['already', 'She said that she had already paid'],
      ]}
    />,

    <Section key="s20" t={t} f={f} title={isUK ? '20. Готові блоки з уроку' : '20. Готовые блоки из урока'} />,

    <Body
      key="b20a"
      t={t}
      f={f}
      text={isUK
        ? 'Косвенну мову краще впізнавати готовими блоками: said that he was, said that she would, said that he could, said that he had.'
        : 'Косвенную речь лучше узнавать готовыми блоками: said that he was, said that she would, said that he could, said that he had.'
      }
    />,

    <Table
      key="t20"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['said that he was tired', isUK ? 'сказав, що втомився' : 'сказал, что устал'],
        ['said that she was busy', isUK ? 'сказала, що зайнята' : 'сказала, что занята'],
        ['said that they were ready', isUK ? 'сказали, що готові' : 'сказали, что готовы'],
        ['said that I needed help', isUK ? 'сказав, що мені потрібна допомога' : 'сказал, что мне нужна помощь'],
        ['said that you wanted coffee', isUK ? 'сказав, що хотів каву' : 'сказал, что хотел кофе'],
        ['said that he knew the answer', isUK ? 'сказав, що знав відповідь' : 'сказал, что знал ответ'],
        ['said that she remembered me', isUK ? 'сказала, що памʼятала мене' : 'сказала, что помнила меня'],
        ['said that they had time', isUK ? 'сказали, що мали час' : 'сказали, что у них было время'],
        ['told me that he was okay', isUK ? 'сказав мені, що все гаразд' : 'сказал мне, что всё в порядке'],
        ['told us that she was ready', isUK ? 'сказала нам, що готова' : 'сказала нам, что готова'],
      ]}
    />,

    <Table
      key="t21"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['said that he would call me', isUK ? 'сказав, що подзвонить мені' : 'сказал, что позвонит мне'],
        ['said that she would help us', isUK ? 'сказала, що допоможе нам' : 'сказала, что поможет нам'],
        ['said that they would come later', isUK ? 'сказали, що прийдуть пізніше' : 'сказали, что придут позже'],
        ['said that we would finish today', isUK ? 'сказали, що закінчимо сьогодні' : 'сказали, что закончим сегодня'],
        ['said that he could help', isUK ? 'сказав, що міг допомогти' : 'сказал, что мог помочь'],
        ['said that she could call him', isUK ? 'сказала, що могла подзвонити йому' : 'сказала, что могла позвонить ему'],
        ['said that I could not wait', isUK ? 'сказав, що не міг чекати' : 'сказал, что не мог ждать'],
        ['said that he did not know', isUK ? 'сказав, що не знав' : 'сказал, что не знал'],
        ['said that he had finished', isUK ? 'сказав, що закінчив' : 'сказал, что закончил'],
        ['admitted that we had made a mistake', isUK ? 'визнали, що зробили помилку' : 'признали, что сделали ошибку'],
      ]}
    />,

    <Section key="s21" t={t} f={f} title={isUK ? '21. Переклад не завжди дослівний' : '21. Перевод не всегда дословный'} />,

    <Body
      key="b21a"
      t={t}
      f={f}
      text={isUK
        ? 'Українською або російською переклад часто звучить природніше, ніж дослівна англійська логіка. Would часто перекладається майбутнім, could - як “міг / могла”, had + V3 - як звичайне минуле.'
        : 'По-русски перевод часто звучит естественнее, чем дословная английская логика. Would часто переводится будущим, could - как “мог / могла”, had + V3 - как обычное прошлое.'
      }
    />,

    <Table
      key="t22"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['He said that he would call me', isUK ? 'Він сказав, що подзвонить мені' : 'Он сказал, что позвонит мне'],
        ['She said that she could call him', isUK ? 'Вона сказала, що могла подзвонити йому' : 'Она сказала, что могла позвонить ему'],
        ['They said that they could find it', isUK ? 'Вони сказали, що могли знайти це' : 'Они сказали, что могли найти это'],
        ['He said that he had finished', isUK ? 'Він сказав, що закінчив' : 'Он сказал, что закончил'],
        ['She said that she had already paid', isUK ? 'Вона сказала, що вже заплатила' : 'Она сказала, что уже заплатила'],
        ['He explained that he was late', isUK ? 'Він пояснив, що запізнився' : 'Он объяснил, что опоздал'],
      ]}
    />,

    <Section key="s22" t={t} f={f} title={isUK ? '22. Найчастіші помилки' : '22. Самые частые ошибки'} />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said me that he was okay → ✅ He told me that he was okay. Або: He said that he was okay.'
        : '❌ He said me that he was okay → ✅ He told me that he was okay. Или: He said that he was okay.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ He told that he was okay → ✅ He told me that he was okay. Told потребує обʼєкт.'
        : '❌ He told that he was okay → ✅ He told me that he was okay. Told требует объект.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ She said that she is busy → ✅ She said that she was busy. Is зсувається в was.'
        : '❌ She said that she is busy → ✅ She said that she was busy. Is сдвигается в was.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ They said that they are ready → ✅ They said that they were ready. Are зсувається в were.'
        : '❌ They said that they are ready → ✅ They said that they were ready. Are сдвигается в were.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ I said that I need help → ✅ I said that I needed help. Need зсувається в needed.'
        : '❌ I said that I need help → ✅ I said that I needed help. Need сдвигается в needed.'
      }
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he will call me → ✅ He said that he would call me. Will зсувається в would.'
        : '❌ He said that he will call me → ✅ He said that he would call me. Will сдвигается в would.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ She said that she would helps us → ✅ She said that she would help us. Після would дія без -s.'
        : '❌ She said that she would helps us → ✅ She said that she would help us. После would действие без -s.'
      }
    />,

    <Warn
      key="w23"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he can help → ✅ He said that he could help. Can зсувається в could.'
        : '❌ He said that he can help → ✅ He said that he could help. Can сдвигается в could.'
      }
    />,

    <Warn
      key="w24"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he could not found the phone → ✅ He said that he could not find the phone. Після could not базова форма.'
        : '❌ He said that he could not found the phone → ✅ He said that he could not find the phone. После could not базовая форма.'
      }
    />,

    <Warn
      key="w25"
      t={t}
      f={f}
      text={isUK
        ? '❌ He said that he did not knew → ✅ He said that he did not know. Після did not базова форма.'
        : '❌ He said that he did not knew → ✅ He said that he did not know. После did not базовая форма.'
      }
    />,

    <Warn
      key="w26"
      t={t}
      f={f}
      text={isUK
        ? '❌ She said that she had call me → ✅ She said that she had called me. Після had потрібна третя форма.'
        : '❌ She said that she had call me → ✅ She said that she had called me. После had нужна третья форма.'
      }
    />,

    <Warn
      key="w27"
      t={t}
      f={f}
      text={isUK
        ? '❌ We said that we had make a mistake → ✅ We admitted that we had made a mistake. Make → made.'
        : '❌ We said that we had make a mistake → ✅ We admitted that we had made a mistake. Make → made.'
      }
    />,

    <Section key="s23" t={t} f={f} title={isUK ? '23. Що треба винести з уроку' : '23. Что нужно вынести из урока'} />,

    <Body
      key="b23a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся переказувати чужі слова через that. Said that використовується без людини після said. Told me/us that використовується з людиною. Am/is/are часто зсуваються у was/were. Will стає would. Can стає could. Для заперечень є did not + базова дія. Для завершених дій є had + V3.'
        : 'В этом уроке ты учишься пересказывать чужие слова через that. Said that используется без человека после said. Told me/us that используется с человеком. Am/is/are часто сдвигаются в was/were. Will становится would. Can становится could. Для отрицаний есть did not + базовое действие. Для завершённых действий есть had + V3.'
      }
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай чотири моделі: He said that he was tired. He told me that he was okay. She said that she would help us. He said that he had finished.'
        : 'Перед практикой держи четыре модели: He said that he was tired. He told me that he was okay. She said that she would help us. He said that he had finished.'
      }
    />,
  ],
},

// ── УРОК 28 ──────────────────────────────────────────────────
28: {
  titleRU: 'Возвратные местоимения: myself, yourself',
  titleUK: 'Зворотні займенники: myself, yourself',
  titlePtBr: "Pronomes reflexivos: myself, yourself",
  titleVi: "Đại từ phản thân: myself, yourself",
  titleId: "Kata ganti refleksif: myself, yourself",
  titleTr: "Dönüşlü zamirler: myself, yourself",
  titlePl: "Zaimki zwrotne: myself, yourself",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити “себе”, “сам”, “сама”, “самі”: я забився, він ушибся сам, вона сказала собі правду, ми підготувалися, вони захистили себе.'
        : 'В этом уроке ты учишься говорить “себя”, “сам”, “сама”, “сами”: я ушибся, он сам исправил это, она сказала себе правду, мы подготовились, они защитили себя.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['I', 'myself', 'I hurt myself / I did it myself'],
        ['you', 'yourself', 'You hurt yourself / You did it yourself'],
        ['he', 'himself', 'He hurt himself / He did it himself'],
        ['she', 'herself', 'She hurt herself / She did it herself'],
        ['it', 'itself', 'The app closed itself'],
        ['we', 'ourselves', 'We prepared ourselves / We did it ourselves'],
        ['you', 'yourselves', 'You prepared yourselves / You did it yourselves'],
        ['they', 'themselves', 'They protected themselves / They did it themselves'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: якщо дія повертається на того самого виконавця, потрібна форма типу myself, yourself, himself.'
        : 'Главная идея: если действие возвращается на того же самого исполнителя, нужна форма типа myself, yourself, himself.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Два головні значення' : '2. Два главных значения'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці зворотні займенники працюють у двох головних значеннях: “себе / собі” і “сам / сама / самі”.'
        : 'В этом уроке возвратные местоимения работают в двух главных значениях: “себя / себе” и “сам / сама / сами”.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример', isUK ? 'Переклад' : 'Перевод'],
        [isUK ? 'дія на себе' : 'действие на себя', 'I hurt myself', isUK ? 'Я забився' : 'Я ушибся'],
        [isUK ? 'дія собі' : 'действие себе', 'I asked myself a question', isUK ? 'Я задав собі питання' : 'Я задал себе вопрос'],
        [isUK ? 'сам / сама' : 'сам / сама', 'I did it myself', isUK ? 'Я зробив це сам' : 'Я сделал это сам'],
        [isUK ? 'самі' : 'сами', 'They did it themselves', isUK ? 'Вони зробили це самі' : 'Они сделали это сами'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? 'Не перекладай myself завжди одним словом. У I hurt myself це “забився / себе”, а в I did it myself це “сам”.'
        : 'Не переводи myself всегда одним словом. В I hurt myself это “ушибся / себя”, а в I did it myself это “сам”.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Myself, yourself, himself, herself' : '3. Myself, yourself, himself, herself'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Ці форми використовуються для однієї людини: я сам / себе, ти сам / себе, він сам / себе, вона сама / себе.'
        : 'Эти формы используются для одного человека: я сам / себя, ты сам / себя, он сам / себя, она сама / себя.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Фрази з уроку' : 'Фразы из урока'],
        ['myself', 'I hurt myself / I asked myself a question / I did it myself / I fixed it myself'],
        ['yourself', 'You hurt yourself / You did it yourself / Can you control yourself?'],
        ['himself', 'He hurt himself / He did it himself / Did he fix it himself?'],
        ['herself', 'She hurt herself / She told herself the truth / She did it herself / She cooked dinner herself'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ I hurt me → ✅ I hurt myself. Якщо я сам постраждав від своєї дії, потрібне myself.'
        : '❌ I hurt me → ✅ I hurt myself. Если я сам пострадал от своего действия, нужно myself.'
      }
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ She told her the truth, якщо вона сказала правду собі → ✅ She told herself the truth.'
        : '❌ She told her the truth, если она сказала правду себе → ✅ She told herself the truth.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Itself, ourselves, yourselves, themselves' : '4. Itself, ourselves, yourselves, themselves'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Ці форми використовуються для предмета, групи людей або множини: саме закрилося, ми самі, ви самі, вони самі / себе.'
        : 'Эти формы используются для предмета, группы людей или множественного числа: само закрылось, мы сами, вы сами, они сами / себя.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Фрази з уроку' : 'Фразы из урока'],
        ['itself', 'The app closed itself'],
        ['ourselves', 'We prepared ourselves / We did it ourselves / Should we prepare ourselves?'],
        ['yourselves', 'You prepared yourselves / You did it yourselves'],
        ['themselves', 'They protected themselves / They did it themselves / They cleaned the room themselves'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ We prepared ourself → ✅ We prepared ourselves. З we потрібне ourselves.'
        : '❌ We prepared ourself → ✅ We prepared ourselves. С we нужно ourselves.'
      }
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ They protected themself → ✅ They protected themselves. З they потрібне themselves.'
        : '❌ They protected themself → ✅ They protected themselves. С they нужно themselves.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Hurt myself = ушибся / забився' : '5. Hurt myself = ушибся'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'Hurt myself / yourself / himself / herself означає, що людина сама постраждала або травмувалася. Українською або російською це часто перекладається одним дієсловом: забився, ушибся.'
        : 'Hurt myself / yourself / himself / herself означает, что человек сам пострадал или травмировался. По-русски это часто переводится одним глаголом: ушибся, ушиблась.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I hurt myself', isUK ? 'Я забився' : 'Я ушибся'],
        ['You hurt yourself', isUK ? 'Ти забився' : 'Ты ушибся'],
        ['He hurt himself', isUK ? 'Він забився' : 'Он ушибся'],
        ['She hurt herself', isUK ? 'Вона забилася' : 'Она ушиблась'],
        ['Did you hurt yourself?', isUK ? 'Ти забився?' : 'Ты ушибся?'],
        ['Did he hurt himself?', isUK ? 'Він забився?' : 'Он ушибся?'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'У hurt myself слово myself не завжди треба окремо перекладати як “себе”. Природний переклад: “я забився”.'
        : 'В hurt myself слово myself не всегда нужно отдельно переводить как “себя”. Естественный перевод: “я ушибся”.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Himself / herself після дії = себе' : '6. Himself / herself после действия = себя'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Коли людина робить дію щодо себе, після дії ставиться відповідна форма: himself, herself, ourselves, themselves.'
        : 'Когда человек делает действие по отношению к себе, после действия ставится нужная форма: himself, herself, ourselves, themselves.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що відбувається' : 'Что происходит'],
        ['We prepared ourselves', isUK ? 'ми підготували себе / підготувалися' : 'мы подготовили себя / подготовились'],
        ['They protected themselves', isUK ? 'вони захистили себе' : 'они защитили себя'],
        ['I asked myself a question', isUK ? 'я задав питання собі' : 'я задал вопрос себе'],
        ['She told herself the truth', isUK ? 'вона сказала правду собі' : 'она сказала правду себе'],
        ['Can you control yourself?', isUK ? 'ти можеш контролювати себе?' : 'ты можешь контролировать себя?'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ Can you control you? → ✅ Can you control yourself? Якщо контролюєш себе, потрібне yourself.'
        : '❌ Can you control you? → ✅ Can you control yourself? Если контролируешь себя, нужно yourself.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Myself / himself як підсилення: сам' : '7. Myself / himself как усиление: сам'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Іноді myself, yourself, himself, herself не означають “себе”, а підкреслюють, що людина зробила дію сама, без чужої допомоги.'
        : 'Иногда myself, yourself, himself, herself не означают “себя”, а подчёркивают, что человек сделал действие сам, без чужой помощи.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I did it myself', isUK ? 'Я зробив це сам' : 'Я сделал это сам'],
        ['You did it yourself', isUK ? 'Ти зробив це сам' : 'Ты сделал это сам'],
        ['He did it himself', isUK ? 'Він зробив це сам' : 'Он сделал это сам'],
        ['She did it herself', isUK ? 'Вона зробила це сама' : 'Она сделала это сама'],
        ['We did it ourselves', isUK ? 'Ми зробили це самі' : 'Мы сделали это сами'],
        ['You did it yourselves', isUK ? 'Ви зробили це самі' : 'Вы сделали это сами'],
        ['They did it themselves', isUK ? 'Вони зробили це самі' : 'Они сделали это сами'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? 'I did it myself не означає “я сделал это себя”. Тут myself = сам.'
        : 'I did it myself не означает “я сделал это себя”. Тут myself = сам.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Yourself і yourselves' : '8. Yourself и yourselves'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Yourself використовується, коли “ти” один. Yourselves використовується, коли “ви” кілька людей.'
        : 'Yourself используется, когда “ты” один. Yourselves используется, когда “вы” несколько людей.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один you' : 'Один you', isUK ? 'Кілька you' : 'Несколько you'],
        ['You hurt yourself', 'You prepared yourselves'],
        ['You did it yourself', 'You did it yourselves'],
        ['Did you hurt yourself?', 'You prepared yourselves'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ You prepared yourself, якщо йдеться про кількох людей → ✅ You prepared yourselves.'
        : '❌ You prepared yourself, если речь о нескольких людях → ✅ You prepared yourselves.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Itself з предметом або застосунком' : '9. Itself с предметом или приложением'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Itself використовується, коли дія ніби сталася сама з предметом або системою. У фразі уроку застосунок закрився сам.'
        : 'Itself используется, когда действие как будто произошло само с предметом или системой. Во фразе урока приложение закрылось само.'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="The app closed itself"
      rus={isUK ? 'Застосунок закрився сам' : 'Приложение закрылось само'}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ The app closed himself → ✅ The app closed itself. Для app потрібне itself, не himself.'
        : '❌ The app closed himself → ✅ The app closed itself. Для app нужно itself, не himself.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Питання з Did + base verb + reflexive' : '10. Вопросы с Did + base verb + reflexive'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У питаннях Past Simple використовується Did. Після Did основна дія йде в базовій формі: hurt, teach, prepare, do, fix, write, clean.'
        : 'В вопросах Past Simple используется Did. После Did основное действие идёт в базовой форме: hurt, teach, prepare, do, fix, write, clean.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання з уроку' : 'Вопрос из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['Did you hurt yourself?', 'hurt, не hurted'],
        ['Did he hurt himself?', 'hurt, не hurted'],
        ['Did she teach herself?', 'teach, не taught'],
        ['Did they prepare themselves?', 'prepare, не prepared'],
        ['Did you do it yourself?', 'do, не did'],
        ['Did he fix it himself?', 'fix, не fixed'],
        ['Did she write it herself?', 'write, не wrote'],
        ['Did they clean the room themselves?', 'clean, не cleaned'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did you hurted yourself? → ✅ Did you hurt yourself? Після Did дія в базовій формі.'
        : '❌ Did you hurted yourself? → ✅ Did you hurt yourself? После Did действие в базовой форме.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did she wrote it herself? → ✅ Did she write it herself? Після Did не використовуємо Past Simple форму.'
        : '❌ Did she wrote it herself? → ✅ Did she write it herself? После Did не используем Past Simple форму.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Заперечення: did not + base verb + reflexive' : '11. Отрицание: did not + base verb + reflexive'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У запереченні Past Simple використовується did not. Після did not основна дія також стоїть у базовій формі.'
        : 'В отрицании Past Simple используется did not. После did not основное действие тоже стоит в базовой форме.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що важливо' : 'Что важно'],
        ['I did not hurt myself', 'hurt, не hurted'],
        ['You did not prepare yourself', 'prepare, не prepared'],
        ['He did not teach himself', 'teach, не taught'],
        ['She did not blame herself', 'blame, не blamed'],
        ['We did not protect ourselves', 'protect, не protected'],
        ['They did not do it themselves', 'do, не did'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ He did not taught himself → ✅ He did not teach himself. Після did not потрібна базова форма teach.'
        : '❌ He did not taught himself → ✅ He did not teach himself. После did not нужна базовая форма teach.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ They did not did it themselves → ✅ They did not do it themselves. Після did not ставимо do.'
        : '❌ They did not did it themselves → ✅ They did not do it themselves. После did not ставим do.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Cannot + reflexive' : '12. Cannot + reflexive'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Cannot означає “не можу / не може”. Після cannot дія йде в базовій формі: force, control, forgive, stop.'
        : 'Cannot означает “не могу / не может”. После cannot действие идёт в базовой форме: force, control, forgive, stop.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I cannot force myself', isUK ? 'Я не можу змусити себе' : 'Я не могу заставить себя'],
        ['He cannot control himself', isUK ? 'Він не може контролювати себе' : 'Он не может контролировать себя'],
        ['She cannot forgive herself', isUK ? 'Вона не може пробачити себе' : 'Она не может простить себя'],
        ['They cannot stop themselves', isUK ? 'Вони не можуть зупинити себе' : 'Они не могут остановить себя'],
      ]}
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ He cannot controls himself → ✅ He cannot control himself. Після cannot дія без -s.'
        : '❌ He cannot controls himself → ✅ He cannot control himself. После cannot действие без -s.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Команди з yourself' : '13. Команды с yourself'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У кінці уроку є короткі команди та поради з yourself. Вони часто звучать як готові життєві фрази.'
        : 'В конце урока есть короткие команды и советы с yourself. Они часто звучат как готовые жизненные фразы.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Help yourself', isUK ? 'Пригощайся' : 'Угощайся'],
        ['Be yourself', isUK ? 'Будь собою' : 'Будь собой'],
        ['Take care of yourself', isUK ? 'Бережи себе' : 'Береги себя'],
        ['Believe in yourself', isUK ? 'Вір у себе' : 'Верь в себя'],
        ['Trust yourself', isUK ? 'Довіряй собі' : 'Доверяй себе'],
        ['Teach yourself every day', isUK ? 'Вчися самостійно кожен день' : 'Учись самостоятельно каждый день'],
        ['Ask yourself why', isUK ? 'Запитай себе чому' : 'Спроси себя почему'],
        ['Remind yourself to rest', isUK ? 'Нагадай собі відпочити' : 'Напомни себе отдохнуть'],
        ['Give yourself time', isUK ? 'Дай собі час' : 'Дай себе время'],
        ['Do not blame yourself', isUK ? 'Не звинувачуй себе' : 'Не вини себя'],
      ]}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Help yourself не перекладається дослівно як “допоможи собі”. У живій мові це часто “пригощайся”.'
        : 'Help yourself не переводится дословно как “помоги себе”. В живой речи это часто “угощайся”.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Прийменники з yourself: care of, believe in' : '14. Предлоги с yourself: care of, believe in'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Деякі фрази з yourself мають прийменник. Його не можна викидати: take care of yourself, believe in yourself.'
        : 'Некоторые фразы с yourself имеют предлог. Его нельзя выбрасывать: take care of yourself, believe in yourself.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['take care of yourself', isUK ? 'бережи себе' : 'береги себя'],
        ['believe in yourself', isUK ? 'вір у себе' : 'верь в себя'],
        ['trust yourself', isUK ? 'довіряй собі' : 'доверяй себе'],
      ]}
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ Take care yourself → ✅ Take care of yourself. У цьому блоці потрібне of.'
        : '❌ Take care yourself → ✅ Take care of yourself. В этом блоке нужно of.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ Believe yourself, якщо сенс “вір у себе” → ✅ Believe in yourself. У цьому значенні потрібне in.'
        : '❌ Believe yourself, если смысл “верь в себя” → ✅ Believe in yourself. В этом значении нужно in.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Ask yourself why / Remind yourself to rest' : '15. Ask yourself why / Remind yourself to rest'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У цих фразах yourself означає “себе / собі”. Ask yourself why = запитай себе чому. Remind yourself to rest = нагадай собі відпочити.'
        : 'В этих фразах yourself означает “себя / себе”. Ask yourself why = спроси себя почему. Remind yourself to rest = напомни себе отдохнуть.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Логіка' : 'Логика'],
        ['Ask yourself why', isUK ? 'постав питання самому собі' : 'задай вопрос самому себе'],
        ['Remind yourself to rest', isUK ? 'нагадай самому собі відпочити' : 'напомни самому себе отдохнуть'],
        ['Give yourself time', isUK ? 'дай час самому собі' : 'дай время самому себе'],
        ['Do not blame yourself', isUK ? 'не звинувачуй самого себе' : 'не вини самого себя'],
      ]}
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ Remind yourself rest → ✅ Remind yourself to rest. Після remind yourself тут потрібне to rest.'
        : '❌ Remind yourself rest → ✅ Remind yourself to rest. После remind yourself здесь нужно to rest.'
      }
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Обʼєкт it у фразах із himself / herself' : '16. Объект it во фразах с himself / herself'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах I did it myself, I fixed it myself, Did she write it herself? слово it означає “це”. А myself / himself / herself підкреслює, хто зробив дію сам.'
        : 'В фразах I did it myself, I fixed it myself, Did she write it herself? слово it означает “это”. А myself / himself / herself подчёркивает, кто сделал действие сам.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що означає it' : 'Что означает it', isUK ? 'Що означає myself/himself/herself' : 'Что означает myself/himself/herself'],
        ['I did it myself', isUK ? 'це' : 'это', isUK ? 'сам' : 'сам'],
        ['I fixed it myself', isUK ? 'це' : 'это', isUK ? 'сам' : 'сам'],
        ['Did he fix it himself?', isUK ? 'це' : 'это', isUK ? 'сам' : 'сам'],
        ['Did she write it herself?', isUK ? 'це' : 'это', isUK ? 'сама' : 'сама'],
      ]}
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Room, dinner, truth, question, key' : '17. Room, dinner, truth, question, key'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок поєднує зворотні займенники з уже знайомими обʼєктами: question, truth, dinner, room, key, tickets, phone, time.'
        : 'Урок соединяет возвратные местоимения с уже знакомыми объектами: question, truth, dinner, room, key, tickets, phone, time.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад' : 'Пример'],
        ['a question', 'I asked myself a question'],
        ['the truth', 'She told herself the truth'],
        ['dinner', 'She cooked dinner herself'],
        ['the room', 'They cleaned the room themselves'],
        ['a key', 'He can give back a key'],
        ['time', 'Give yourself time'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Готові блоки з уроку' : '18. Готовые блоки из урока'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці важливо впізнавати готові блоки, бо переклад не завжди дослівний.'
        : 'В этом уроке важно узнавать готовые блоки, потому что перевод не всегда дословный.'
      }
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['hurt myself', isUK ? 'забитися / травмуватися' : 'ушибиться / травмироваться'],
        ['prepared ourselves', isUK ? 'підготувалися' : 'подготовились'],
        ['protected themselves', isUK ? 'захистили себе' : 'защитили себя'],
        ['asked myself a question', isUK ? 'задав собі питання' : 'задал себе вопрос'],
        ['told herself the truth', isUK ? 'сказала собі правду' : 'сказала себе правду'],
        ['did it myself', isUK ? 'зробив це сам' : 'сделал это сам'],
        ['fixed it myself', isUK ? 'сам це виправив' : 'сам это исправил'],
        ['cooked dinner herself', isUK ? 'сама приготувала вечерю' : 'сама приготовила ужин'],
        ['cleaned the room themselves', isUK ? 'самі прибрали кімнату' : 'сами убрали комнату'],
      ]}
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['control yourself', isUK ? 'контролювати себе' : 'контролировать себя'],
        ['prepare ourselves', isUK ? 'підготуватися' : 'подготовиться'],
        ['force myself', isUK ? 'змусити себе' : 'заставить себя'],
        ['forgive herself', isUK ? 'пробачити себе' : 'простить себя'],
        ['stop themselves', isUK ? 'зупинити себе' : 'остановить себя'],
        ['help yourself', isUK ? 'пригощайся' : 'угощайся'],
        ['be yourself', isUK ? 'будь собою' : 'будь собой'],
        ['take care of yourself', isUK ? 'бережи себе' : 'береги себя'],
        ['believe in yourself', isUK ? 'вір у себе' : 'верь в себя'],
        ['give yourself time', isUK ? 'дай собі час' : 'дай себе время'],
      ]}
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Переклад не завжди дослівний' : '19. Перевод не всегда дословный'} />,

    <Body
      key="b19a"
      t={t}
      f={f}
      text={isUK
        ? 'Українською або російською зворотність часто передається закінченням дієслова або природним виразом. Англійська часто ставить окреме слово: myself, yourself, himself.'
        : 'По-русски возвратность часто передаётся окончанием глагола или естественным выражением. Английский часто ставит отдельное слово: myself, yourself, himself.'
      }
    />,

    <Table
      key="t19"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I hurt myself', isUK ? 'Я забився' : 'Я ушибся'],
        ['We prepared ourselves', isUK ? 'Ми підготувалися' : 'Мы подготовились'],
        ['Did she teach herself?', isUK ? 'Вона сама навчилася?' : 'Она сама научилась?'],
        ['Help yourself', isUK ? 'Пригощайся' : 'Угощайся'],
        ['Take care of yourself', isUK ? 'Бережи себе' : 'Береги себя'],
        ['Teach yourself every day', isUK ? 'Вчися самостійно кожен день' : 'Учись самостоятельно каждый день'],
      ]}
    />,

    <Section key="s20" t={t} f={f} title={isUK ? '20. Найчастіші помилки' : '20. Самые частые ошибки'} />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ I hurt me → ✅ I hurt myself. Коли дія повертається на мене, потрібне myself.'
        : '❌ I hurt me → ✅ I hurt myself. Когда действие возвращается на меня, нужно myself.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ He hurt hisself → ✅ He hurt himself. Правильна форма - himself.'
        : '❌ He hurt hisself → ✅ He hurt himself. Правильная форма - himself.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ She hurt sheself → ✅ She hurt herself. Правильна форма - herself.'
        : '❌ She hurt sheself → ✅ She hurt herself. Правильная форма - herself.'
      }
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ The app closed himself → ✅ The app closed itself. Для app потрібне itself.'
        : '❌ The app closed himself → ✅ The app closed itself. Для app нужно itself.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ We prepared ourself → ✅ We prepared ourselves. З we потрібне ourselves.'
        : '❌ We prepared ourself → ✅ We prepared ourselves. С we нужно ourselves.'
      }
    />,

    <Warn
      key="w23"
      t={t}
      f={f}
      text={isUK
        ? '❌ They did it themself → ✅ They did it themselves. З they потрібне themselves.'
        : '❌ They did it themself → ✅ They did it themselves. С they нужно themselves.'
      }
    />,

    <Warn
      key="w24"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did she wrote it herself? → ✅ Did she write it herself? Після Did дія в базовій формі.'
        : '❌ Did she wrote it herself? → ✅ Did she write it herself? После Did действие в базовой форме.'
      }
    />,

    <Warn
      key="w25"
      t={t}
      f={f}
      text={isUK
        ? '❌ He did not taught himself → ✅ He did not teach himself. Після did not потрібна базова форма.'
        : '❌ He did not taught himself → ✅ He did not teach himself. После did not нужна базовая форма.'
      }
    />,

    <Warn
      key="w26"
      t={t}
      f={f}
      text={isUK
        ? '❌ He cannot controls himself → ✅ He cannot control himself. Після cannot дія без -s.'
        : '❌ He cannot controls himself → ✅ He cannot control himself. После cannot действие без -s.'
      }
    />,

    <Warn
      key="w27"
      t={t}
      f={f}
      text={isUK
        ? '❌ Take care yourself → ✅ Take care of yourself. У цьому виразі потрібне of.'
        : '❌ Take care yourself → ✅ Take care of yourself. В этом выражении нужно of.'
      }
    />,

    <Warn
      key="w28"
      t={t}
      f={f}
      text={isUK
        ? '❌ Believe yourself, якщо зміст “вір у себе” → ✅ Believe in yourself.'
        : '❌ Believe yourself, если смысл “верь в себя” → ✅ Believe in yourself.'
      }
    />,

    <Warn
      key="w29"
      t={t}
      f={f}
      text={isUK
        ? '❌ Remind yourself rest → ✅ Remind yourself to rest. Після remind yourself тут потрібне to rest.'
        : '❌ Remind yourself rest → ✅ Remind yourself to rest. После remind yourself здесь нужно to rest.'
      }
    />,

    <Section key="s21" t={t} f={f} title={isUK ? '21. Що треба винести з уроку' : '21. Что нужно вынести из урока'} />,

    <Body
      key="b21a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся використовувати зворотні займенники. Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves можуть означати “себе / собі” або підсилювати “сам / сама / самі”. У питаннях з Did і запереченнях з did not основна дія стоїть у базовій формі.'
        : 'В этом уроке ты учишься использовать возвратные местоимения. Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves могут означать “себя / себе” или усиливать “сам / сама / сами”. В вопросах с Did и отрицаниях с did not основное действие стоит в базовой форме.'
      }
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай чотири моделі: I hurt myself. I did it myself. Did you hurt yourself? Take care of yourself.'
        : 'Перед практикой держи четыре модели: I hurt myself. I did it myself. Did you hurt yourself? Take care of yourself.'
      }
    />,
  ],
},

// ── УРОК 29 ──────────────────────────────────────────────────
29: {
  titleRU: 'Used to: раньше было, а сейчас нет',
  titleUK: 'Used to: раніше було, а зараз ні',
  titlePtBr: "Used to: antes era assim, agora não",
  titleVi: "Used to: trước đây có, bây giờ không",
  titleId: "Used to: dulu begitu, sekarang tidak",
  titleTr: "Used to: eskiden vardı, şimdi yok",
  titlePl: "Used to: kiedyś tak było, teraz nie",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся говорити про те, що було звичкою або станом у минулому, але зараз уже не так: раніше я жив тут, раніше вона вчила англійську, раніше ми працювали разом.'
        : 'В этом уроке ты учишься говорить о том, что было привычкой или состоянием в прошлом, но сейчас уже не так: раньше я жил здесь, раньше она учила английский, раньше мы работали вместе.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Звичайний Past Simple' : 'Обычный Past Simple', 'used to'],
        ['I lived here before', 'I used to live here'],
        ['She studied English before', 'She used to study English'],
        ['We worked together before', 'We used to work together'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: used to = раніше так було регулярно або довго, але зараз ситуація змінилася.'
        : 'Главная идея: used to = раньше так было регулярно или долго, но сейчас ситуация изменилась.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна формула' : '2. Главная формула'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Формула проста: хто + used to + базова дія. Після used to дія завжди стоїть у базовій формі: live, work, call, study, read.'
        : 'Формула простая: кто + used to + базовое действие. После used to действие всегда стоит в базовой форме: live, work, call, study, read.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Хто?' : 'Кто?', 'used to', isUK ? 'Дія' : 'Действие', isUK ? 'Фраза' : 'Фраза'],
        ['I', 'used to', 'live', 'I used to live here'],
        ['You', 'used to', 'work', 'You used to work here'],
        ['He', 'used to', 'call', 'He used to call me every day'],
        ['She', 'used to', 'study', 'She used to study English'],
        ['We', 'used to', 'work', 'We used to work together'],
        ['They', 'used to', 'live', 'They used to live near us'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ He used to called me → ✅ He used to call me. Після used to дія в базовій формі.'
        : '❌ He used to called me → ✅ He used to call me. После used to действие в базовой форме.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ She used to studied English → ✅ She used to study English. Після used to не ставимо Past Simple.'
        : '❌ She used to studied English → ✅ She used to study English. После used to не ставим Past Simple.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Used to однаковий для всіх' : '3. Used to одинаковый для всех'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Used to не змінюється після I, you, he, she, we, they. Немає форми uses to для he або she.'
        : 'Used to не меняется после I, you, he, she, we, they. Нет формы uses to для he или she.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['I', 'I used to live here / I used to read books at night / I used to drink coffee'],
        ['You', 'You used to work here / You used to watch TV every evening'],
        ['He', 'He used to call me every day / He used to play music / He used to drive every day'],
        ['She', 'She used to study English / She used to write messages / She used to cook dinner'],
        ['We', 'We used to work together / We used to walk outside'],
        ['They', 'They used to live near us / They used to travel in summer'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ He uses to drive every day → ✅ He used to drive every day. У цій конструкції used to не змінюється.'
        : '❌ He uses to drive every day → ✅ He used to drive every day. В этой конструкции used to не меняется.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Старі звички і регулярні дії' : '4. Старые привычки и регулярные действия'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Used to часто описує те, що повторювалося в минулому: кожен день, кожен вечір, вночі, влітку.'
        : 'Used to часто описывает то, что повторялось в прошлом: каждый день, каждый вечер, ночью, летом.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що показує' : 'Что показывает'],
        ['He used to call me every day', isUK ? 'стара регулярна дія' : 'старое регулярное действие'],
        ['I used to read books at night', isUK ? 'стара звичка' : 'старая привычка'],
        ['You used to watch TV every evening', isUK ? 'стара вечірня звичка' : 'старая вечерняя привычка'],
        ['They used to travel in summer', isUK ? 'те, що повторювалося влітку' : 'то, что повторялось летом'],
        ['He used to drive every day', isUK ? 'стара щоденна дія' : 'старое ежедневное действие'],
      ]}
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Used to... but now...' : '5. Used to... but now...'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'У середині уроку used to часто протиставляється теперішньому часу через but now: раніше було так, але зараз інакше.'
        : 'В середине урока used to часто противопоставляется настоящему времени через but now: раньше было так, но сейчас иначе.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Раніше' : 'Раньше', isUK ? 'Зараз' : 'Сейчас'],
        ['I used to wake up early', 'but now I wake up late'],
        ['She used to work at night', 'but now she works in the morning'],
        ['We used to live there', 'but now we live here'],
        ['They used to call us', 'but now they send messages'],
        ['He used to spend money', 'but now he saves money'],
        ['I used to forget keys', 'but now I check my bag'],
        ['She used to hate waiting', 'but now she is patient'],
        ['We used to order food', 'but now we cook at home'],
        ['They used to be late', 'but now they come on time'],
        ['You used to need help', 'but now you do it yourself'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'But now показує головний контраст уроку: минула звичка більше не головна реальність.'
        : 'But now показывает главный контраст урока: прошлая привычка больше не главная реальность.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Після but now часто Present Simple' : '6. После but now часто Present Simple'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Після but now у фразах уроку часто стоїть Present Simple, бо ми говоримо про теперішню звичку або теперішній факт.'
        : 'После but now во фразах урока часто стоит Present Simple, потому что мы говорим о текущей привычке или текущем факте.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо' : 'Что важно'],
        ['but now she works in the morning', isUK ? 'she works з -s' : 'she works с -s'],
        ['but now they send messages', isUK ? 'they send без -s' : 'they send без -s'],
        ['but now he saves money', isUK ? 'he saves з -s' : 'he saves с -s'],
        ['but now I check my bag', isUK ? 'I check без -s' : 'I check без -s'],
        ['but now we cook at home', isUK ? 'we cook без -s' : 'we cook без -s'],
        ['but now they come on time', isUK ? 'they come без -s' : 'they come без -s'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ but now she work in the morning → ✅ but now she works in the morning. Після she у Present Simple потрібне -s.'
        : '❌ but now she work in the morning → ✅ but now she works in the morning. После she в Present Simple нужно -s.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Заперечення: did not use to' : '7. Отрицание: did not use to'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Щоб сказати, що раніше чогось не було як звички, використовуй did not use to. Після did not форма used повертається в use.'
        : 'Чтобы сказать, что раньше чего-то не было как привычки, используй did not use to. После did not форма used возвращается в use.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Твердження' : 'Утверждение', isUK ? 'Заперечення' : 'Отрицание'],
        ['I used to drink coffee', 'I did not use to drink coffee'],
        ['You used to work here', 'You did not use to work here'],
        ['He used to call me', 'He did not use to call me'],
        ['She used to study every day', 'She did not use to study every day'],
        ['We used to travel often', 'We did not use to travel often'],
        ['They used to help us', 'They did not use to help us'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ I did not used to drink coffee → ✅ I did not use to drink coffee. Після did not використовуй use to без -d.'
        : '❌ I did not used to drink coffee → ✅ I did not use to drink coffee. После did not используй use to без -d.'
      }
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ He did not used to call me → ✅ He did not use to call me. Did уже показує минуле.'
        : '❌ He did not used to call me → ✅ He did not use to call me. Did уже показывает прошлое.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Заперечення з важливими блоками' : '8. Отрицание с важными блоками'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'У запереченнях уроку є кілька готових блоків, які треба впізнавати цілими: understand English, wake up early, drive at night, spend much money.'
        : 'В отрицаниях урока есть несколько готовых блоков, которые нужно узнавать целиком: understand English, wake up early, drive at night, spend much money.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Переклад' : 'Перевод'],
        ['I did not use to understand English', isUK ? 'Раніше я не розумів англійську' : 'Раньше я не понимал английский'],
        ['He did not use to wake up early', isUK ? 'Раніше він не прокидався рано' : 'Раньше он не просыпался рано'],
        ['She did not use to drive at night', isUK ? 'Раніше вона не водила вночі' : 'Раньше она не водила ночью'],
        ['We did not use to spend much money', isUK ? 'Раніше ми не витрачали багато грошей' : 'Раньше мы не тратили много денег'],
      ]}
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Питання: Did ... use to ...?' : '9. Вопрос: Did ... use to ...?'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'У питаннях used to теж повертається в use to, тому що Did уже показує минуле. Формула: Did + хто + use to + дія?'
        : 'В вопросах used to тоже возвращается в use to, потому что Did уже показывает прошлое. Формула: Did + кто + use to + действие?'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        ['Did + subject + use to + verb?', isUK ? 'Переклад' : 'Перевод'],
        ['Did you use to live here?', isUK ? 'Ти раніше жив тут?' : 'Ты раньше жил здесь?'],
        ['Did she use to call you?', isUK ? 'Вона раніше телефонувала тобі?' : 'Она раньше звонила тебе?'],
        ['Did they use to work together?', isUK ? 'Вони раніше працювали разом?' : 'Они раньше работали вместе?'],
        ['Did he use to study English?', isUK ? 'Він раніше вчив англійську?' : 'Он раньше учил английский?'],
        ['Did you use to wake up early?', isUK ? 'Ти раніше прокидався рано?' : 'Ты раньше просыпался рано?'],
        ['Did we use to meet on Fridays?', isUK ? 'Ми раніше зустрічалися по пʼятницях?' : 'Мы раньше встречались по пятницам?'],
        ['Did they use to travel in summer?', isUK ? 'Вони раніше подорожували влітку?' : 'Они раньше путешествовали летом?'],
        ['Did she use to read books at night?', isUK ? 'Вона раніше читала книги вночі?' : 'Она раньше читала книги ночью?'],
        ['Did he use to forget his phone?', isUK ? 'Він раніше забував свій телефон?' : 'Он раньше забывал свой телефон?'],
        ['Did you use to spend money fast?', isUK ? 'Ти раніше швидко витрачав гроші?' : 'Ты раньше быстро тратил деньги?'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did you used to live here? → ✅ Did you use to live here? Після Did використовуй use to.'
        : '❌ Did you used to live here? → ✅ Did you use to live here? После Did используй use to.'
      }
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did he use to studied English? → ✅ Did he use to study English? Після use to дія базова.'
        : '❌ Did he use to studied English? → ✅ Did he use to study English? После use to действие базовое.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Used to be = раніше був / була / були' : '10. Used to be = раньше был / была / были'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Used to може стояти перед be. Тоді фраза говорить про старий стан або стару якість: раніше був соромʼязливим, раніше боялася помилок, раніше запізнювалися.'
        : 'Used to может стоять перед be. Тогда фраза говорит о старом состоянии или старом качестве: раньше был стеснительным, раньше боялась ошибок, раньше опаздывали.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        ['used to be', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I used to be shy', isUK ? 'Раніше я був соромʼязливим' : 'Раньше я был стеснительным'],
        ['She used to be afraid of mistakes', isUK ? 'Раніше вона боялася помилок' : 'Раньше она боялась ошибок'],
        ['They used to be late, but now they come on time', isUK ? 'Раніше вони запізнювалися, але зараз приходять вчасно' : 'Раньше они опаздывали, но сейчас приходят вовремя'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ I used to was shy → ✅ I used to be shy. Після used to потрібна базова форма be.'
        : '❌ I used to was shy → ✅ I used to be shy. После used to нужна базовая форма be.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Now без used to' : '11. Now без used to'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Now показує теперішню ситуацію. Якщо фраза говорить про те, що відбувається зараз, used to вже не потрібен.'
        : 'Now показывает текущую ситуацию. Если фраза говорит о том, что происходит сейчас, used to уже не нужен.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Раніше' : 'Раньше', isUK ? 'Зараз' : 'Сейчас'],
        ['I used to be shy', 'Now I speak more confidently'],
        ['She used to be afraid of mistakes', 'She now learns from mistakes'],
        ['We used to learn slowly', 'but now we learn faster'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ Now I used to speak more confidently → ✅ Now I speak more confidently. Used to не використовується для теперішнього часу.'
        : '❌ Now I used to speak more confidently → ✅ Now I speak more confidently. Used to не используется для настоящего времени.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Used to і now в одній фразі' : '12. Used to и now в одной фразе'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Остання фраза уроку показує контраст максимально чітко: раніше ми вчилися повільно, а зараз швидше.'
        : 'Последняя фраза урока показывает контраст максимально чётко: раньше мы учились медленно, а сейчас быстрее.'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="We used to learn slowly, but now we learn faster"
      rus={isUK ? 'Раніше ми вчилися повільно, але зараз вчимося швидше' : 'Раньше мы учились медленно, но сейчас учимся быстрее'}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Used to learn slowly = стара ситуація. Now we learn faster = нова ситуація.'
        : 'Used to learn slowly = старая ситуация. Now we learn faster = новая ситуация.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Часові блоки з уроку' : '13. Временные блоки из урока'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці used to поєднується з часовими блоками: every day, every evening, at night, in summer, on Fridays, in the morning, at home.'
        : 'В этом уроке used to соединяется с временными блоками: every day, every evening, at night, in summer, on Fridays, in the morning, at home.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Приклад' : 'Пример'],
        ['every day', 'He used to call me every day / He used to drive every day'],
        ['every evening', 'You used to watch TV every evening'],
        ['at night', 'I used to read books at night / She used to work at night'],
        ['in summer', 'They used to travel in summer'],
        ['on Fridays', 'Did we use to meet on Fridays?'],
        ['in the morning', 'but now she works in the morning'],
        ['at home', 'but now we cook at home'],
        ['on time', 'but now they come on time'],
      ]}
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Готові блоки з уроку' : '14. Готовые блоки из урока'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Used to краще вчити не окремо, а готовими блоками з діями, які є у фразах уроку.'
        : 'Used to лучше учить не отдельно, а готовыми блоками с действиями, которые есть во фразах урока.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['used to live here', isUK ? 'раніше жив тут' : 'раньше жил здесь'],
        ['used to work here', isUK ? 'раніше працював тут' : 'раньше работал здесь'],
        ['used to call me every day', isUK ? 'раніше дзвонив мені щодня' : 'раньше звонил мне каждый день'],
        ['used to study English', isUK ? 'раніше вчила англійську' : 'раньше учила английский'],
        ['used to work together', isUK ? 'раніше працювали разом' : 'раньше работали вместе'],
        ['used to live near us', isUK ? 'раніше жили поруч з нами' : 'раньше жили рядом с нами'],
        ['used to read books at night', isUK ? 'раніше читав книги вночі' : 'раньше читал книги ночью'],
        ['used to watch TV every evening', isUK ? 'раніше дивився телевізор щовечора' : 'раньше смотрел телевизор каждый вечер'],
        ['used to play music', isUK ? 'раніше грав музику' : 'раньше играл музыку'],
        ['used to write messages', isUK ? 'раніше писала повідомлення' : 'раньше писала сообщения'],
      ]}
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['used to walk outside', isUK ? 'раніше гуляли на вулиці' : 'раньше гуляли на улице'],
        ['used to travel in summer', isUK ? 'раніше подорожували влітку' : 'раньше путешествовали летом'],
        ['used to drink coffee', isUK ? 'раніше пив каву' : 'раньше пил кофе'],
        ['used to cook dinner', isUK ? 'раніше готувала вечерю' : 'раньше готовила ужин'],
        ['used to drive every day', isUK ? 'раніше водив щодня' : 'раньше водил каждый день'],
        ['used to wake up early', isUK ? 'раніше прокидався рано' : 'раньше просыпался рано'],
        ['used to hate waiting', isUK ? 'раніше ненавиділа чекати' : 'раньше ненавидела ждать'],
        ['used to order food', isUK ? 'раніше замовляли їжу' : 'раньше заказывали еду'],
        ['used to need help', isUK ? 'раніше потрібна була допомога' : 'раньше нужна была помощь'],
        ['used to be shy', isUK ? 'раніше був соромʼязливим' : 'раньше был стеснительным'],
      ]}
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Обʼєкти після дії: me, us, you' : '15. Объекты после действия: me, us, you'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку після дії можуть стояти люди: call me, live near us, call us, help us, call you.'
        : 'В фразах урока после действия могут стоять люди: call me, live near us, call us, help us, call you.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Переклад' : 'Перевод'],
        ['call me', isUK ? 'дзвонити мені' : 'звонить мне'],
        ['live near us', isUK ? 'жити поруч з нами' : 'жить рядом с нами'],
        ['call us', isUK ? 'дзвонити нам' : 'звонить нам'],
        ['help us', isUK ? 'допомагати нам' : 'помогать нам'],
        ['call you', isUK ? 'дзвонити тобі' : 'звонить тебе'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ They used to live near we → ✅ They used to live near us. Після near потрібна форма us.'
        : '❌ They used to live near we → ✅ They used to live near us. После near нужна форма us.'
      }
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Yourself у контрасті з now' : '16. Yourself в контрасте с now'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразі You used to need help, but now you do it yourself слово yourself підкреслює: тепер ти робиш це сам.'
        : 'Во фразе You used to need help, but now you do it yourself слово yourself подчёркивает: теперь ты делаешь это сам.'
      }
    />,

    <Example
      key="e2"
      t={t}
      f={f}
      eng="You used to need help, but now you do it yourself"
      rus={isUK ? 'Раніше тобі потрібна була допомога, але зараз ти робиш це сам' : 'Раньше тебе нужна была помощь, но сейчас ты делаешь это сам'}
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Faster / more confidently' : '17. Faster / more confidently'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'У фінальних фразах уроку є порівняння: more confidently і faster. Вони показують, що тепер стало краще або швидше.'
        : 'В финальных фразах урока есть сравнение: more confidently и faster. Они показывают, что теперь стало лучше или быстрее.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['Now I speak more confidently', isUK ? 'Зараз я говорю впевненіше' : 'Сейчас я говорю увереннее'],
        ['We used to learn slowly, but now we learn faster', isUK ? 'Раніше ми вчилися повільно, але зараз вчимося швидше' : 'Раньше мы учились медленно, но сейчас учимся быстрее'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Не плутай used to і be used to' : '18. Не путай used to и be used to'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці used to означає стару звичку або старий стан. Це не те саме, що be used to + -ing, де значення “звик до чогось зараз”.'
        : 'В этом уроке used to означает старую привычку или старое состояние. Это не то же самое, что be used to + -ing, где значение “привык к чему-то сейчас”.'
      }
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        ['used to + verb', 'be used to + -ing'],
        [isUK ? 'раніше робив, але зараз інакше' : 'раньше делал, но сейчас иначе', isUK ? 'звик робити зараз' : 'привык делать сейчас'],
        ['I used to wake up early', 'I am used to waking up early'],
      ]}
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Be used to + -ing буде окремо в фінальних темах. Тут тримай тільки used to + базова дія.'
        : 'Be used to + -ing будет отдельно в финальных темах. Здесь держи только used to + базовое действие.'
      }
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Переклад не завжди дослівний' : '19. Перевод не всегда дословный'} />,

    <Body
      key="b19a"
      t={t}
      f={f}
      text={isUK
        ? 'Used to не перекладається одним окремим словом. Найчастіше природний переклад — “раніше”, а сама дія звучить минулим часом.'
        : 'Used to не переводится одним отдельным словом. Чаще всего естественный перевод - “раньше”, а само действие звучит прошедшим временем.'
      }
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I used to live here', isUK ? 'Раніше я жив тут' : 'Раньше я жил здесь'],
        ['He used to call me every day', isUK ? 'Раніше він дзвонив мені щодня' : 'Раньше он звонил мне каждый день'],
        ['She used to be afraid of mistakes', isUK ? 'Раніше вона боялася помилок' : 'Раньше она боялась ошибок'],
        ['Did you use to live here?', isUK ? 'Ти раніше жив тут?' : 'Ты раньше жил здесь?'],
        ['I did not use to understand English', isUK ? 'Раніше я не розумів англійську' : 'Раньше я не понимал английский'],
      ]}
    />,

    <Section key="s20" t={t} f={f} title={isUK ? '20. Найчастіші помилки' : '20. Самые частые ошибки'} />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ I used to lived here → ✅ I used to live here. Після used to потрібна базова дія.'
        : '❌ I used to lived here → ✅ I used to live here. После used to нужно базовое действие.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ He used to calls me → ✅ He used to call me. Після used to дія без -s.'
        : '❌ He used to calls me → ✅ He used to call me. После used to действие без -s.'
      }
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ She used to studied English → ✅ She used to study English. Не став Past Simple після used to.'
        : '❌ She used to studied English → ✅ She used to study English. Не ставь Past Simple после used to.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ I did not used to drink coffee → ✅ I did not use to drink coffee. Після did not форма use to без -d.'
        : '❌ I did not used to drink coffee → ✅ I did not use to drink coffee. После did not форма use to без -d.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ Did you used to live here? → ✅ Did you use to live here? Після Did використовуй use to.'
        : '❌ Did you used to live here? → ✅ Did you use to live here? После Did используй use to.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ I used to was shy → ✅ I used to be shy. Після used to потрібне be.'
        : '❌ I used to was shy → ✅ I used to be shy. После used to нужно be.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ Now I used to speak more confidently → ✅ Now I speak more confidently. Used to не використовується для теперішнього часу.'
        : '❌ Now I used to speak more confidently → ✅ Now I speak more confidently. Used to не используется для настоящего времени.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ They used to live near we → ✅ They used to live near us. Після near потрібна форма us.'
        : '❌ They used to live near we → ✅ They used to live near us. После near нужна форма us.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ She used to afraid of mistakes → ✅ She used to be afraid of mistakes. Потрібне be afraid of.'
        : '❌ She used to afraid of mistakes → ✅ She used to be afraid of mistakes. Нужно be afraid of.'
      }
    />,

    <Section key="s21" t={t} f={f} title={isUK ? '21. Що треба винести з уроку' : '21. Что нужно вынести из урока'} />,

    <Body
      key="b21a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці used to показує стару звичку або старий стан, який уже не є поточною реальністю. У твердженні використовуй used to + базову дію. У запереченні і питанні після did використовуй use to без -d. Для старого стану використовуй used to be.'
        : 'В этом уроке used to показывает старую привычку или старое состояние, которое уже не является текущей реальностью. В утверждении используй used to + базовое действие. В отрицании и вопросе после did используй use to без -d. Для старого состояния используй used to be.'
      }
    />,

    <Tip
      key="tip5"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай чотири моделі: I used to live here. I did not use to drink coffee. Did you use to live here? I used to be shy.'
        : 'Перед практикой держи четыре модели: I used to live here. I did not use to drink coffee. Did you use to live here? I used to be shy.'
      }
    />,
  ],
},

// ── УРОК 30 ──────────────────────────────────────────────────
30: {
  titleRU: 'Относительные предложения: who, that, where, whose',
  titleUK: 'Відносні речення: who, that, where, whose',
  titlePtBr: "Orações relativas: who, that, where, whose",
  titleVi: "Mệnh đề quan hệ: who, that, where, whose",
  titleId: "Klausa relatif: who, that, where, whose",
  titleTr: "İlgi cümleleri: who, that, where, whose",
  titlePl: "Zdania względne: who, that, where, whose",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся додавати пояснення прямо всередину фрази: чоловік, який тут працює; додаток, який допомагає мені вчитися; місце, де ми зустрілися; жінка, чия сумка тут.'
        : 'В этом уроке ты учишься добавлять пояснение прямо внутрь фразы: мужчина, который здесь работает; приложение, которое помогает мне учиться; место, где мы встретились; женщина, чья сумка здесь.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Для чого' : 'Для чего', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['who', isUK ? 'для людей' : 'для людей', 'I know a man who works here'],
        ['that', isUK ? 'для речей / людей у простих фразах' : 'для вещей / людей в простых фразах', 'This is the app that helps me learn'],
        ['which', isUK ? 'для речей' : 'для вещей', 'This is the food which we ordered'],
        ['where', isUK ? 'для місць' : 'для мест', 'This is the place where we met'],
        ['whose', isUK ? 'чий / чия / чиє / чиї' : 'чей / чья / чьё / чьи', 'I know a man whose phone is lost'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: who / that / which / where / whose відкривають маленьке пояснення про людину, річ або місце.'
        : 'Главная идея: who / that / which / where / whose открывают маленькое пояснение про человека, вещь или место.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Навіщо це потрібно' : '2. Зачем это нужно'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Замість двох коротких фраз англійська може зробити одну точнішу фразу. Не просто “я знаю чоловіка”, а “я знаю чоловіка, який тут працює”.'
        : 'Вместо двух коротких фраз английский может сделать одну более точную фразу. Не просто “я знаю мужчину”, а “я знаю мужчину, который здесь работает”.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Дві прості ідеї' : 'Две простые идеи', isUK ? 'Одна фраза' : 'Одна фраза'],
        ['I know a man. He works here.', 'I know a man who works here'],
        ['This is the app. It helps me learn.', 'This is the app that helps me learn'],
        ['This is the place. We met there.', 'This is the place where we met'],
        ['I know a man. His phone is lost.', 'I know a man whose phone is lost'],
      ]}
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Who для людей' : '3. Who для людей'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Who використовується, коли ми додаємо інформацію про людину або людей: чоловік, жінка, людина, лікар, друг, студент, люди.'
        : 'Who используется, когда мы добавляем информацию про человека или людей: мужчина, женщина, человек, врач, друг, студент, люди.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I know a man who works here', isUK ? 'Я знаю чоловіка, який працює тут' : 'Я знаю мужчину, который работает здесь'],
        ['She knows a woman who speaks English', isUK ? 'Вона знає жінку, яка говорить англійською' : 'Она знает женщину, которая говорит по-английски'],
        ['We met a person who can help us', isUK ? 'Ми зустріли людину, яка може допомогти нам' : 'Мы встретили человека, который может помочь нам'],
        ['They called a doctor who lives nearby', isUK ? 'Вони зателефонували лікарю, який живе поруч' : 'Они позвонили врачу, который живёт рядом'],
        ['I have a friend who studies every day', isUK ? 'У мене є друг, який вчиться щодня' : 'У меня есть друг, который учится каждый день'],
        ['She has a sister who works at night', isUK ? 'У неї є сестра, яка працює вночі' : 'У неё есть сестра, которая работает ночью'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I know a man which works here → ✅ I know a man who works here. Для людини використовуй who.'
        : '❌ I know a man which works here → ✅ I know a man who works here. Для человека используй who.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Who з Past Simple' : '4. Who с Past Simple'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Після who може стояти дія в минулому: helped, answered, lost, forgot, called. Це просто пояснення про людину.'
        : 'После who может стоять действие в прошлом: helped, answered, lost, forgot, called. Это просто пояснение про человека.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що пояснює who' : 'Что объясняет who'],
        ['He is the teacher who helped me', isUK ? 'який допоміг мені' : 'который помог мне'],
        ['This is the student who answered correctly', isUK ? 'який відповів правильно' : 'который ответил правильно'],
        ['I saw the man who lost his phone', isUK ? 'який загубив свій телефон' : 'который потерял свой телефон'],
        ['We helped the woman who forgot her keys', isUK ? 'яка забула свої ключі' : 'которая забыла свои ключи'],
        ['Do you know the man who called me?', isUK ? 'який зателефонував мені' : 'который позвонил мне'],
        ['Are they the people who helped us?', isUK ? 'які допомогли нам' : 'которые помогли нам'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ the man who did called me → ✅ the man who called me. У частині після who тут уже стоїть Past Simple.'
        : '❌ the man who did called me → ✅ the man who called me. В части после who здесь уже стоит Past Simple.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. That для речей' : '5. That для вещей'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'That у цьому уроці часто використовується для речей: додаток, телефон, книга, квитки, повідомлення, проблема, питання, відповідь.'
        : 'That в этом уроке часто используется для вещей: приложение, телефон, книга, билеты, сообщение, проблема, вопрос, ответ.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['This is the app that helps me learn', isUK ? 'Це додаток, який допомагає мені вчитися' : 'Это приложение, которое помогает мне учиться'],
        ['This is the phone that I bought yesterday', isUK ? 'Це телефон, який я купив учора' : 'Это телефон, который я купил вчера'],
        ['This is the book that she read', isUK ? 'Це книга, яку вона прочитала' : 'Это книга, которую она прочитала'],
        ['These are the tickets that we found', isUK ? 'Це квитки, які ми знайшли' : 'Это билеты, которые мы нашли'],
        ['This is the message that he sent me', isUK ? 'Це повідомлення, яке він надіслав мені' : 'Это сообщение, которое он отправил мне'],
        ['This is the problem that we solved', isUK ? 'Це проблема, яку ми вирішили' : 'Это проблема, которую мы решили'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'That часто перекладається як “який / яку / яке / які” залежно від слова перед ним.'
        : 'That часто переводится как “который / которую / которое / которые” в зависимости от слова перед ним.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. That може бути не підметом, а обʼєктом' : '6. That может быть не подлежащим, а объектом'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'У деяких фразах that означає не “який зробив дію”, а “який хтось зробив / купив / прочитав / знайшов”.'
        : 'В некоторых фразах that означает не “который сделал действие”, а “который кто-то сделал / купил / прочитал / нашёл”.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Логіка' : 'Логика'],
        ['This is the phone that I bought yesterday', isUK ? 'I bought the phone' : 'I bought the phone'],
        ['This is the book that she read', isUK ? 'she read the book' : 'she read the book'],
        ['These are the tickets that we found', isUK ? 'we found the tickets' : 'we found the tickets'],
        ['This is the message that he sent me', isUK ? 'he sent me the message' : 'he sent me the message'],
        ['This is the question that I asked', isUK ? 'I asked the question' : 'I asked the question'],
        ['This is the answer that she gave me', isUK ? 'she gave me the answer' : 'she gave me the answer'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? 'Не шукай другий обʼєкт після bought/read/found, якщо він уже стоїть перед that: the phone that I bought.'
        : 'Не ищи второй объект после bought/read/found, если он уже стоит перед that: the phone that I bought.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Which для речей' : '7. Which для вещей'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Which у цьому уроці теж використовується для речей. У реальних фразах уроку воно зʼявляється з food і plan.'
        : 'Which в этом уроке тоже используется для вещей. В реальных фразах урока оно появляется с food и plan.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['This is the food which we ordered', isUK ? 'Це їжа, яку ми замовили' : 'Это еда, которую мы заказали'],
        ['This is the plan which we chose', isUK ? 'Це план, який ми обрали' : 'Это план, который мы выбрали'],
      ]}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці that і which для речей дуже близькі. Головне - не використовувати which для людей у цих фразах.'
        : 'В этом уроке that и which для вещей очень близки. Главное - не использовать which для людей в этих фразах.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Where для місць' : '8. Where для мест'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Where додає пояснення про місце: місце, кімната, будинок, магазин, готель, банк, стіл.'
        : 'Where добавляет пояснение про место: место, комната, дом, магазин, отель, банк, стол.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['This is the place where we met', isUK ? 'Це місце, де ми зустрілися' : 'Это место, где мы встретились'],
        ['This is the room where I work', isUK ? 'Це кімната, де я працюю' : 'Это комната, где я работаю'],
        ['This is the house where she lives', isUK ? 'Це будинок, де вона живе' : 'Это дом, где она живёт'],
        ['This is the shop where I bought the phone', isUK ? 'Це магазин, де я купив телефон' : 'Это магазин, где я купил телефон'],
        ['This is the hotel where they stayed', isUK ? 'Це готель, де вони зупинилися' : 'Это отель, где они остановились'],
        ['This is the bank where he works', isUK ? 'Це банк, де він працює' : 'Это банк, где он работает'],
        ['This is the table where I left the keys', isUK ? 'Це стіл, де я залишив ключі' : 'Это стол, где я оставил ключи'],
        ['This is the place where we waited', isUK ? 'Це місце, де ми чекали' : 'Это место, где мы ждали'],
      ]}
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is the place which we met → ✅ This is the place where we met. Якщо значення “де”, використовуй where.'
        : '❌ This is the place which we met → ✅ This is the place where we met. Если значение “где”, используй where.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Whose = чий / чия / чиє / чиї' : '9. Whose = чей / чья / чьё / чьи'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Whose показує належність. Після whose завжди стоїть річ, яка комусь належить: phone, bag, answer, car, name, lesson, message, keys.'
        : 'Whose показывает принадлежность. После whose всегда стоит вещь, которая кому-то принадлежит: phone, bag, answer, car, name, lesson, message, keys.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I know a man whose phone is lost', isUK ? 'Я знаю чоловіка, чий телефон загублено' : 'Я знаю мужчину, чей телефон потерян'],
        ['She knows a woman whose bag is here', isUK ? 'Вона знає жінку, чия сумка тут' : 'Она знает женщину, чья сумка здесь'],
        ['We helped a student whose answer was wrong', isUK ? 'Ми допомогли студенту, чия відповідь була неправильною' : 'Мы помогли студенту, чей ответ был неправильным'],
        ['They called a driver whose car was outside', isUK ? 'Вони зателефонували водієві, чия машина була зовні' : 'Они позвонили водителю, чья машина была снаружи'],
        ['I met a person whose name I remember', isUK ? 'Я зустрів людину, чиє імʼя я памʼятаю' : 'Я встретил человека, чьё имя я помню'],
        ['This is the teacher whose lesson helped me', isUK ? 'Це вчитель, чий урок допоміг мені' : 'Это учитель, чей урок помог мне'],
        ['This is the friend whose message I read', isUK ? 'Це друг, чиє повідомлення я прочитав' : 'Это друг, чьё сообщение я прочитал'],
        ['This is the woman whose keys we found', isUK ? 'Це жінка, чиї ключі ми знайшли' : 'Это женщина, чьи ключи мы нашли'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ a man who phone is lost → ✅ a man whose phone is lost. Якщо значення “чий”, потрібне whose.'
        : '❌ a man who phone is lost → ✅ a man whose phone is lost. Если значение “чей”, нужно whose.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Питання з відносними реченнями' : '10. Вопросы с относительными предложениями'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'У кінці уроку відносне речення зʼявляється всередині питання. Головне питання будується звичайно, а who / that / where / whose додає уточнення.'
        : 'В конце урока относительное предложение появляется внутри вопроса. Главный вопрос строится обычным образом, а who / that / where / whose добавляет уточнение.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Питання з уроку' : 'Вопрос из урока', isUK ? 'Що уточнює друга частина' : 'Что уточняет вторая часть'],
        ['Do you know the man who called me?', isUK ? 'який чоловік?' : 'какой мужчина?'],
        ['Do you remember the place where we met?', isUK ? 'яке місце?' : 'какое место?'],
        ['Is this the app that helps you learn?', isUK ? 'який додаток?' : 'какое приложение?'],
        ['Is this the phone that you lost?', isUK ? 'який телефон?' : 'какой телефон?'],
        ['Is she the woman whose bag is here?', isUK ? 'яка жінка?' : 'какая женщина?'],
        ['Are these the documents that you checked?', isUK ? 'які документи?' : 'какие документы?'],
        ['Are they the people who helped us?', isUK ? 'які люди?' : 'какие люди?'],
      ]}
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ Do you know the man who did called me? → ✅ Do you know the man who called me? Після who тут уже нормальний Past Simple.'
        : '❌ Do you know the man who did called me? → ✅ Do you know the man who called me? После who здесь уже нормальный Past Simple.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. This is / These are / Is this / Are these' : '11. This is / These are / Is this / Are these'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок часто використовує this is для одного предмета і these are для кількох предметів. У питанні порядок змінюється: Is this...? Are these...?'
        : 'Урок часто использует this is для одного предмета и these are для нескольких предметов. В вопросе порядок меняется: Is this...? Are these...?'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один предмет / людина' : 'Один предмет / человек', isUK ? 'Кілька предметів / людей' : 'Несколько предметов / людей'],
        ['This is the app that helps me learn', 'These are the tickets that we found'],
        ['This is the phone that I bought yesterday', 'Are these the documents that you checked?'],
        ['Is this the phone that you lost?', 'Are they the people who helped us?'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ This are the tickets that we found → ✅ These are the tickets that we found. Tickets - множина.'
        : '❌ This are the tickets that we found → ✅ These are the tickets that we found. Tickets - множественное число.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Can всередині relative clause' : '12. Can внутри relative clause'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку can може стояти всередині пояснення: людина, яка може допомогти; людина, яка може пояснити; місце, де можна займатися.'
        : 'В фразах урока can может стоять внутри пояснения: человек, который может помочь; человек, который может объяснить; место, где можно заниматься.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Що важливо' : 'Что важно'],
        ['We met a person who can help us', isUK ? 'can help без to' : 'can help без to'],
        ['I need a person who can explain this', isUK ? 'can explain без to' : 'can explain без to'],
        ['Find a place where you can study', isUK ? 'can study без to' : 'can study без to'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ a person who can to help us → ✅ a person who can help us. Після can дія без to.'
        : '❌ a person who can to help us → ✅ a person who can help us. После can действие без to.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Need + noun + relative clause' : '13. Need + noun + relative clause'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах I need a person... і We need an app... після need стоїть предмет, а потім пояснення, який саме предмет потрібен.'
        : 'В фразах I need a person... и We need an app... после need стоит предмет, а потом пояснение, какой именно предмет нужен.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Логіка' : 'Логика'],
        ['I need a person who can explain this', isUK ? 'потрібна людина - яка саме? - яка може пояснити це' : 'нужен человек - какой именно? - который может объяснить это'],
        ['We need an app that works well', isUK ? 'потрібен додаток - який саме? - який добре працює' : 'нужно приложение - какое именно? - которое хорошо работает'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ We need a app that works well → ✅ We need an app that works well. Перед app потрібне an.'
        : '❌ We need a app that works well → ✅ We need an app that works well. Перед app нужно an.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Команда Find a place where...' : '14. Команда Find a place where...'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Фраза Find a place where you can study поєднує команду Find... і relative clause where you can study.'
        : 'Фраза Find a place where you can study соединяет команду Find... и relative clause where you can study.'
      }
    />,

    <Example
      key="e1"
      t={t}
      f={f}
      eng="Find a place where you can study"
      rus={isUK ? 'Знайди місце, де ти можеш займатися' : 'Найди место, где ты можешь заниматься'}
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Find a place = знайди місце. Where you can study = де ти можеш займатися.'
        : 'Find a place = найди место. Where you can study = где ты можешь заниматься.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. The і a в цьому уроці' : '15. The и a в этом уроке'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок часто використовує a/an, коли ми вводимо нову людину або річ, і the, коли говоримо про конкретну людину або річ.'
        : 'Урок часто использует a/an, когда мы вводим нового человека или вещь, и the, когда говорим о конкретном человеке или вещи.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Новий / один із багатьох' : 'Новый / один из многих', isUK ? 'Конкретний' : 'Конкретный'],
        ['a man who works here', 'the man who called me'],
        ['a woman who speaks English', 'the woman who forgot her keys'],
        ['a person who can help us', 'the student who answered correctly'],
        ['a friend who studies every day', 'the teacher who helped me'],
        ['an app that works well', 'the app that helps you learn'],
        ['a place where you can study', 'the place where we met'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? 'Не міняй a/an і the випадково: a person = якась/одна людина, the person = конкретна людина.'
        : 'Не меняй a/an и the случайно: a person = какой-то/один человек, the person = конкретный человек.'
      }
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Обʼєктні форми: me, us, them' : '16. Объектные формы: me, us, them'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У частинах після who/that часто є короткі обʼєктні форми: me, us, them. Вони стоять після дії.'
        : 'В частях после who/that часто есть короткие объектные формы: me, us, them. Они стоят после действия.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['me', 'the teacher who helped me / the message that he sent me / the answer that she gave me / the man who called me'],
        ['us', 'a person who can help us / people who live near us / people who helped us'],
        ['them', 'people who helped them / Who will help them?'],
      ]}
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ a person who can help we → ✅ a person who can help us. Після help потрібна форма us.'
        : '❌ a person who can help we → ✅ a person who can help us. После help нужна форма us.'
      }
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Готові блоки з уроку' : '17. Готовые блоки из урока'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'Relative clauses краще впізнавати готовими блоками, бо вони швидко стають довгими.'
        : 'Relative clauses лучше узнавать готовыми блоками, потому что они быстро становятся длинными.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['a man who works here', isUK ? 'чоловік, який тут працює' : 'мужчина, который здесь работает'],
        ['a woman who speaks English', isUK ? 'жінка, яка говорить англійською' : 'женщина, которая говорит по-английски'],
        ['a person who can help us', isUK ? 'людина, яка може допомогти нам' : 'человек, который может помочь нам'],
        ['a doctor who lives nearby', isUK ? 'лікар, який живе поруч' : 'врач, который живёт рядом'],
        ['a friend who studies every day', isUK ? 'друг, який вчиться щодня' : 'друг, который учится каждый день'],
        ['people who live near us', isUK ? 'люди, які живуть поруч з нами' : 'люди, которые живут рядом с нами'],
        ['people who listen carefully', isUK ? 'люди, які уважно слухають' : 'люди, которые внимательно слушают'],
      ]}
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['the app that helps me learn', isUK ? 'додаток, який допомагає мені вчитися' : 'приложение, которое помогает мне учиться'],
        ['the phone that I bought yesterday', isUK ? 'телефон, який я купив учора' : 'телефон, который я купил вчера'],
        ['the book that she read', isUK ? 'книга, яку вона прочитала' : 'книга, которую она прочитала'],
        ['the tickets that we found', isUK ? 'квитки, які ми знайшли' : 'билеты, которые мы нашли'],
        ['the message that he sent me', isUK ? 'повідомлення, яке він надіслав мені' : 'сообщение, которое он отправил мне'],
        ['the food which we ordered', isUK ? 'їжа, яку ми замовили' : 'еда, которую мы заказали'],
        ['the plan which we chose', isUK ? 'план, який ми обрали' : 'план, который мы выбрали'],
      ]}
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['the place where we met', isUK ? 'місце, де ми зустрілися' : 'место, где мы встретились'],
        ['the room where I work', isUK ? 'кімната, де я працюю' : 'комната, где я работаю'],
        ['the house where she lives', isUK ? 'будинок, де вона живе' : 'дом, где она живёт'],
        ['the shop where I bought the phone', isUK ? 'магазин, де я купив телефон' : 'магазин, где я купил телефон'],
        ['the hotel where they stayed', isUK ? 'готель, де вони зупинилися' : 'отель, где они остановились'],
        ['the table where I left the keys', isUK ? 'стіл, де я залишив ключі' : 'стол, где я оставил ключи'],
      ]}
    />,

    <Table
      key="t19"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['whose phone is lost', isUK ? 'чий телефон загублено' : 'чей телефон потерян'],
        ['whose bag is here', isUK ? 'чия сумка тут' : 'чья сумка здесь'],
        ['whose answer was wrong', isUK ? 'чия відповідь була неправильною' : 'чей ответ был неправильным'],
        ['whose car was outside', isUK ? 'чия машина була зовні' : 'чья машина была снаружи'],
        ['whose name I remember', isUK ? 'чиє імʼя я памʼятаю' : 'чьё имя я помню'],
        ['whose lesson helped me', isUK ? 'чий урок допоміг мені' : 'чей урок помог мне'],
        ['whose message I read', isUK ? 'чиє повідомлення я прочитав' : 'чьё сообщение я прочитал'],
        ['whose keys we found', isUK ? 'чиї ключі ми знайшли' : 'чьи ключи мы нашли'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Переклад не завжди дослівний' : '18. Перевод не всегда дословный'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'В українській або російській who, that, which можуть звучати як “який / яка / яке / які”, але в англійській вибір залежить від типу слова: людина, річ, місце або належність.'
        : 'По-русски who, that, which могут звучать как “который / которая / которое / которые”, но в английском выбор зависит от типа слова: человек, вещь, место или принадлежность.'
      }
    />,

    <Table
      key="t20"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I know a man who works here', isUK ? 'Я знаю чоловіка, який працює тут' : 'Я знаю мужчину, который работает здесь'],
        ['This is the phone that I bought yesterday', isUK ? 'Це телефон, який я купив учора' : 'Это телефон, который я купил вчера'],
        ['This is the food which we ordered', isUK ? 'Це їжа, яку ми замовили' : 'Это еда, которую мы заказали'],
        ['This is the place where we met', isUK ? 'Це місце, де ми зустрілися' : 'Это место, где мы встретились'],
        ['I know a man whose phone is lost', isUK ? 'Я знаю чоловіка, чий телефон загублено' : 'Я знаю мужчину, чей телефон потерян'],
      ]}
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Найчастіші помилки' : '19. Самые частые ошибки'} />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ I know a man which works here → ✅ I know a man who works here. Для людини потрібне who.'
        : '❌ I know a man which works here → ✅ I know a man who works here. Для человека нужно who.'
      }
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is the place that we met, якщо сенс “де” → ✅ This is the place where we met.'
        : '❌ This is the place that we met, если смысл “где” → ✅ This is the place where we met.'
      }
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ I know a man who phone is lost → ✅ I know a man whose phone is lost. Для “чий телефон” потрібне whose.'
        : '❌ I know a man who phone is lost → ✅ I know a man whose phone is lost. Для “чей телефон” нужно whose.'
      }
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is the phone who I bought yesterday → ✅ This is the phone that I bought yesterday. Phone - річ, не людина.'
        : '❌ This is the phone who I bought yesterday → ✅ This is the phone that I bought yesterday. Phone - вещь, не человек.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is the table where I left keys → ✅ This is the table where I left the keys. У фразі уроку keys конкретні: the keys.'
        : '❌ This is the table where I left keys → ✅ This is the table where I left the keys. Во фразе урока keys конкретные: the keys.'
      }
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ We need a app that works well → ✅ We need an app that works well. Перед app потрібне an.'
        : '❌ We need a app that works well → ✅ We need an app that works well. Перед app нужно an.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ A person who can to explain this → ✅ A person who can explain this. Після can дія без to.'
        : '❌ A person who can to explain this → ✅ A person who can explain this. После can действие без to.'
      }
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ Are this the documents that you checked? → ✅ Are these the documents that you checked? Documents - множина.'
        : '❌ Are this the documents that you checked? → ✅ Are these the documents that you checked? Documents - множественное число.'
      }
    />,

    <Section key="s20" t={t} f={f} title={isUK ? '20. Що треба винести з уроку' : '20. Что нужно вынести из урока'} />,

    <Body
      key="b20a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти вчишся додавати уточнення до людини, речі або місця. Who - для людей. That і which - для речей. Where - для місць. Whose - для належності. Уся частина після who / that / where / whose пояснює слово перед ним.'
        : 'В этом уроке ты учишься добавлять уточнение к человеку, вещи или месту. Who - для людей. That и which - для вещей. Where - для мест. Whose - для принадлежности. Вся часть после who / that / where / whose объясняет слово перед ним.'
      }
    />,

    <Tip
      key="tip5"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай чотири моделі: a man who works here. the app that helps me learn. the place where we met. a man whose phone is lost.'
        : 'Перед практикой держи четыре модели: a man who works here. the app that helps me learn. the place where we met. a man whose phone is lost.'
      }
    />,
  ],
},

// ── УРОК 31 ──────────────────────────────────────────────────
31: {
  titleRU: 'Сложные конструкции: make, let, feel, hear, would rather',
  titleUK: 'Складні конструкції: make, let, feel, hear, would rather',
  titlePtBr: "Construções complexas: make, let, feel, hear, would rather",
  titleVi: "Cấu trúc phức tạp: make, let, feel, hear, would rather",
  titleId: "Konstruksi kompleks: make, let, feel, hear, would rather",
  titleTr: "Karmaşık yapılar: make, let, feel, hear, would rather",
  titlePl: "Złożone konstrukcje: make, let, feel, hear, would rather",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'У цьому уроці ти збираєш кілька складних конструкцій, які часто звучать дуже природно в англійській, але по-русски або українською перекладаються цілим реченням: змусили водія заплатити, чув як пілот пояснював, відчула як крапля впала, я чекаю вже годину, я б волів, щоб ти залишився тут.'
        : 'В этом уроке ты собираешь несколько сложных конструкций, которые часто звучат естественно в английском, но по-русски переводятся целым предложением: заставили водителя заплатить, слышал как пилот объяснял, почувствовала как капля упала, я жду уже час, я бы предпочёл, чтобы ты остался здесь.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Конструкція' : 'Конструкция', isUK ? 'Що означає' : 'Что означает', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['make + object + verb', isUK ? 'змусити когось щось зробити' : 'заставить кого-то что-то сделать', 'They made that inexperienced driver pay that huge fine'],
        ['let + object + verb', isUK ? 'дозволити комусь щось зробити' : 'позволить кому-то что-то сделать', 'They let that little child eat that huge chocolate cake'],
        ['hear / see / feel + object + verb', isUK ? 'чути / бачити / відчувати, як щось відбувається' : 'слышать / видеть / чувствовать, как что-то происходит', 'I heard that experienced pilot explain that complex flight procedure'],
        ['If + had V3, would have V3', isUK ? 'нереальна умова в минулому' : 'нереальное условие в прошлом', 'If we had started earlier, we would have finished'],
        ['have/has been + -ing', isUK ? 'дія триває вже якийсь час' : 'действие длится уже какое-то время', 'I have been waiting for an hour'],
        ['is/are being + V3', isUK ? 'пасивний процес зараз' : 'пассивный процесс сейчас', 'The room is being cleaned now'],
        ['would rather + past form', isUK ? 'я б волів, щоб...' : 'я бы предпочёл, чтобы...', 'I would rather you stayed here'],
        ['need/want + object + V3', isUK ? 'потрібно, щоб щось зробили' : 'нужно, чтобы что-то сделали', 'I need the documents checked today'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея уроку: ти не вчиш одну маленьку тему. Ти тренуєш кілька готових складних механізмів, які треба впізнавати блоками.'
        : 'Главная идея урока: ты не учишь одну маленькую тему. Ты тренируешь несколько готовых сложных механизмов, которые нужно узнавать блоками.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Make + object + verb: змусити зробити' : '2. Make + object + verb: заставить сделать'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Make у цих фразах означає “змусити”. Після made стоїть людина або предмет, а потім дія без to: made him pay, made visitor show, made system work.'
        : 'Make в этих фразах означает “заставить”. После made стоит человек или предмет, а потом действие без to: made him pay, made visitor show, made system work.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Формула' : 'Формула', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['made + object + pay', 'They made that inexperienced driver pay that huge fine'],
        ['made + object + show', 'That strict guard made that suspicious visitor show the contents of that leather briefcase'],
        ['made + object + work', 'That experienced farmer made that old irrigation system work efficiently'],
        ['made + object + pay', 'That strict landlord made that noisy tenant pay that huge electricity bill'],
        ['made + object + finish', 'That firm manager made that late employee finish that boring report'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ made that driver to pay → ✅ made that driver pay. Після make/made у цій конструкції не ставимо to.'
        : '❌ made that driver to pay → ✅ made that driver pay. После make/made в этой конструкции не ставим to.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Let + object + verb: дозволити зробити' : '3. Let + object + verb: позволить сделать'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Let означає “дозволити”. Як і після make, після let дія йде без to: let child eat, let engineer test, let me use.'
        : 'Let означает “позволить”. Как и после make, после let действие идёт без to: let child eat, let engineer test, let me use.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Формула' : 'Формула', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['let + object + eat', 'They let that little child eat that huge chocolate cake'],
        ['let + object + inspect', 'They let that foreign delegation inspect that modern chemical laboratory'],
        ['let + object + use', 'They let that young genius use that secret government base'],
        ['let + object + interview', 'They let that local reporter interview that nervous city mayor'],
        ['let + object + test', 'They let that experienced engineer test that new solar engine'],
        ['let + object + show', 'She let that helpful guide show that ancient map to that tourist group'],
        ['let + object + use', 'He let me use his phone'],
      ]}
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ let me to use his phone → ✅ let me use his phone. Після let не ставимо to.'
        : '❌ let me to use his phone → ✅ let me use his phone. После let не ставим to.'
      }
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. See / hear / feel + object + verb' : '4. See / hear / feel + object + verb'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Після see, hear і feel у фразах уроку стоїть обʼєкт, а потім дія без to. Українською або російською це часто перекладається як “бачив, як...”, “чув, як...”, “відчув, як...”.'
        : 'После see, hear и feel во фразах урока стоит объект, а потом действие без to. По-русски это часто переводится как “видел, как...”, “слышал, как...”, “почувствовал, как...”.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Дієслово сприйняття' : 'Глагол восприятия', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['heard', 'I heard that experienced pilot explain that complex flight procedure'],
        ['felt', 'She felt that cold raindrop fall on her shoulder'],
        ['heard', 'She heard that famous singer sing that old jazz composition'],
        ['saw', 'I saw that stray dog cross that busy street'],
        ['noticed', 'She noticed that old man drop that metal key into that storm drain'],
        ['saw', 'They saw that wild horse jump that high wooden fence'],
        ['heard', 'I heard that local judge announce that surprising verdict'],
        ['felt', 'We felt the whole building shake during that short earthquake'],
        ['heard', 'They heard that skilled mechanic explain that serious engine problem'],
        ['saw', 'I saw that heavy branch fall onto that parked car'],
        ['felt', 'She felt that cold hand touch her bare arm'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ I heard that pilot to explain → ✅ I heard that pilot explain. Після hear у цій конструкції не ставимо to.'
        : '❌ I heard that pilot to explain → ✅ I heard that pilot explain. После hear в этой конструкции не ставим to.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ She felt the raindrop to fall → ✅ She felt the raindrop fall. Після feel у цій моделі дія без to.'
        : '❌ She felt the raindrop to fall → ✅ She felt the raindrop fall. После feel в этой модели действие без to.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. That перед детальним описом предмета або людини' : '5. That перед детальным описанием предмета или человека'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'У першій частині уроку that часто означає “той / та / те”. Воно не relative clause, а вказівне слово перед детальним описом: that inexperienced driver, that huge fine, that strict guard.'
        : 'В первой части урока that часто означает “тот / та / то”. Это не relative clause, а указательное слово перед детальным описанием: that inexperienced driver, that huge fine, that strict guard.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок з that' : 'Блок с that', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['that inexperienced driver', isUK ? 'той недосвідчений водій' : 'тот неопытный водитель'],
        ['that huge fine', isUK ? 'той величезний штраф' : 'тот огромный штраф'],
        ['that strict guard', isUK ? 'той суворий охоронець' : 'тот строгий охранник'],
        ['that suspicious visitor', isUK ? 'той підозрілий відвідувач' : 'тот подозрительный посетитель'],
        ['that famous singer', isUK ? 'той знаменитий співак' : 'тот знаменитый певец'],
        ['that old jazz composition', isUK ? 'та стара джазова композиція' : 'та старая джазовая композиция'],
        ['that heavy object', isUK ? 'той важкий предмет' : 'тот тяжёлый предмет'],
        ['that local reporter', isUK ? 'той місцевий репортер' : 'тот местный репортёр'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'Не плутай that у that driver з that у the app that helps me learn. Тут that = “той”, а не “который”.'
        : 'Не путай that в that driver с that в the app that helps me learn. Здесь that = “тот”, а не “который”.'
      }
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Довгі іменникові блоки' : '6. Длинные именные блоки'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок спеціально дає довгі блоки з прикметниками. Їх треба читати не по одному слову, а групами: той суворий охоронець, той підозрілий відвідувач, той шкіряний портфель.'
        : 'Урок специально даёт длинные блоки с прилагательными. Их нужно читать не по одному слову, а группами: тот строгий охранник, тот подозрительный посетитель, тот кожаный портфель.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Довгий блок' : 'Длинный блок', isUK ? 'Переклад' : 'Перевод'],
        ['that strict guard', isUK ? 'той суворий охоронець' : 'тот строгий охранник'],
        ['that suspicious visitor', isUK ? 'той підозрілий відвідувач' : 'тот подозрительный посетитель'],
        ['that leather briefcase', isUK ? 'той шкіряний портфель' : 'тот кожаный портфель'],
        ['that complex flight procedure', isUK ? 'та складна процедура польоту' : 'та сложная процедура полёта'],
        ['that huge chocolate cake', isUK ? 'той величезний шоколадний торт' : 'тот огромный шоколадный торт'],
        ['that modern chemical laboratory', isUK ? 'та сучасна хімічна лабораторія' : 'та современная химическая лаборатория'],
        ['that new solar engine', isUK ? 'той новий сонячний двигун' : 'тот новый солнечный двигатель'],
        ['that serious engine problem', isUK ? 'та серйозна проблема з двигуном' : 'та серьёзная проблема двигателя'],
      ]}
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. If + had V3, would have V3' : '7. If + had V3, would have V3'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах 31-32 зʼявляється третій тип умовних речень: якби щось сталося раніше в минулому, результат теж був би іншим у минулому.'
        : 'В фразах 31-32 появляется третий тип условных предложений: если бы что-то произошло раньше в прошлом, результат тоже был бы другим в прошлом.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Умова в минулому' : 'Условие в прошлом', isUK ? 'Результат у минулому' : 'Результат в прошлом'],
        ['If we had started earlier', 'we would have finished'],
        ['If they had checked the room', 'they would have found the keys'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ If we started earlier, we would have finished → для цієї моделі уроку: ✅ If we had started earlier, we would have finished.'
        : '❌ If we started earlier, we would have finished → для этой модели урока: ✅ If we had started earlier, we would have finished.'
      }
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ would finished → ✅ would have finished. У третій умовній моделі потрібне would have + V3.'
        : '❌ would finished → ✅ would have finished. В третьей условной модели нужно would have + V3.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Короткі Complex Object фрази' : '8. Короткие Complex Object фразы'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Після дуже довгих фраз урок дає коротші моделі, де краще видно сам механізм: saw him leave, heard me call her, made us wait, let me use.'
        : 'После очень длинных фраз урок даёт более короткие модели, где лучше видно сам механизм: saw him leave, heard me call her, made us wait, let me use.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза' : 'Фраза', isUK ? 'Конструкція' : 'Конструкция', isUK ? 'Переклад' : 'Перевод'],
        ['I saw him leave', 'saw + him + leave', isUK ? 'Я бачив, як він пішов' : 'Я видел, как он ушёл'],
        ['She heard me call her', 'heard + me + call', isUK ? 'Вона чула, як я її кликав' : 'Она слышала, как я её звал'],
        ['We felt the phone vibrate', 'felt + object + vibrate', isUK ? 'Ми відчули, як телефон завібрував' : 'Мы почувствовали, как телефон завибрировал'],
        ['They made us wait outside', 'made + us + wait', isUK ? 'Вони змусили нас чекати на вулиці' : 'Они заставили нас ждать снаружи'],
        ['He let me use his phone', 'let + me + use', isUK ? 'Він дозволив мені скористатися його телефоном' : 'Он позволил мне воспользоваться его телефоном'],
        ['This lesson helped me understand English better', 'helped + me + understand', isUK ? 'Цей урок допоміг мені краще зрозуміти англійську' : 'Этот урок помог мне лучше понять английский'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ I saw him to leave → ✅ I saw him leave. Після saw у цій моделі дія без to.'
        : '❌ I saw him to leave → ✅ I saw him leave. После saw в этой модели действие без to.'
      }
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ They made us to wait → ✅ They made us wait. Після made дія без to.'
        : '❌ They made us to wait → ✅ They made us wait. После made действие без to.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Обʼєктні форми: him, me, us, her' : '9. Объектные формы: him, me, us, her'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'У коротких Complex Object фразах після першого дієслова стоїть не he / I / we / she, а обʼєктна форма: him, me, us, her.'
        : 'В коротких Complex Object фразах после первого глагола стоит не he / I / we / she, а объектная форма: him, me, us, her.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклад' : 'Пример'],
        ['him', 'I saw him leave'],
        ['me', 'She heard me call her / He let me use his phone / This lesson helped me understand English better'],
        ['us', 'They made us wait outside'],
        ['her', 'She heard me call her'],
      ]}
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ I saw he leave → ✅ I saw him leave. Після saw потрібна форма him.'
        : '❌ I saw he leave → ✅ I saw him leave. После saw нужна форма him.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Present Perfect Continuous: have/has been + -ing' : '10. Present Perfect Continuous: have/has been + -ing'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 39-42 показують дію, яка почалася раніше і триває досі або важлива зараз: я чекаю вже годину, вона вчиться весь ранок, ми працюємо з восьмої.'
        : 'Фразы 39-42 показывают действие, которое началось раньше и длится до сих пор или важно сейчас: я жду уже час, она учится всё утро, мы работаем с восьми.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Формула' : 'Формула', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['I have been + -ing', 'I have been waiting for an hour'],
        ['She has been + -ing', 'She has been studying all morning'],
        ['We have been + -ing', 'We have been working since eight'],
        ['They have been + -ing', 'They have been looking for the keys'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have waiting for an hour → ✅ I have been waiting for an hour. У цій конструкції потрібне been.'
        : '❌ I have waiting for an hour → ✅ I have been waiting for an hour. В этой конструкции нужно been.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ She have been studying → ✅ She has been studying. З she потрібне has.'
        : '❌ She have been studying → ✅ She has been studying. С she нужно has.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. For, all morning, since' : '11. For, all morning, since'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'У Present Perfect Continuous важливі часові блоки: for an hour, all morning, since eight. Вони показують, як довго триває дія або з якого моменту.'
        : 'В Present Perfect Continuous важны временные блоки: for an hour, all morning, since eight. Они показывают, как долго длится действие или с какого момента.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['for an hour', isUK ? 'протягом години / уже годину' : 'в течение часа / уже час', 'I have been waiting for an hour'],
        ['all morning', isUK ? 'весь ранок' : 'всё утро', 'She has been studying all morning'],
        ['since eight', isUK ? 'з восьмої / с восьми' : 'с восьми', 'We have been working since eight'],
      ]}
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? 'For an hour = тривалість. Since eight = початкова точка.'
        : 'For an hour = длительность. Since eight = начальная точка.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. Present Continuous Passive: is/are being + V3' : '12. Present Continuous Passive: is/are being + V3'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 43-44 показують пасивний процес зараз: кімнату прибирають зараз, документи зараз перевіряють. Ми не кажемо, хто це робить, фокус на процесі.'
        : 'Фразы 43-44 показывают пассивный процесс сейчас: комнату убирают сейчас, документы сейчас проверяют. Мы не говорим, кто это делает, фокус на процессе.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один предмет' : 'Один предмет', isUK ? 'Кілька предметів' : 'Несколько предметов'],
        ['The room is being cleaned now', 'The documents are being checked now'],
        [isUK ? 'room один → is being' : 'room один → is being', isUK ? 'documents множина → are being' : 'documents множественное число → are being'],
      ]}
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ The room is cleaned now, якщо процес прямо зараз → ✅ The room is being cleaned now.'
        : '❌ The room is cleaned now, если процесс прямо сейчас → ✅ The room is being cleaned now.'
      }
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ The documents is being checked → ✅ The documents are being checked. Documents - множина.'
        : '❌ The documents is being checked → ✅ The documents are being checked. Documents - множественное число.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Would rather + Past Simple' : '13. Would rather + Past Simple'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Would rather означає “я б краще / я б волів”. Коли після would rather йде інша людина, дія часто стоїть у формі Past Simple: stayed, did not call, started.'
        : 'Would rather означает “я бы лучше / я бы предпочёл”. Когда после would rather идёт другой человек, действие часто стоит в форме Past Simple: stayed, did not call, started.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I would rather you stayed here', isUK ? 'Я б волів, щоб ти залишився тут' : 'Я бы предпочёл, чтобы ты остался здесь'],
        ['I would rather you did not call him', isUK ? 'Я б волів, щоб ти йому не телефонував' : 'Я бы предпочёл, чтобы ты ему не звонил'],
        ['She would rather we started later', isUK ? 'Вона б воліла, щоб ми почали пізніше' : 'Она бы предпочла, чтобы мы начали позже'],
      ]}
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ I would rather you stay here → у моделі уроку: ✅ I would rather you stayed here.'
        : '❌ I would rather you stay here → в модели урока: ✅ I would rather you stayed here.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ I would rather you not call him → у моделі уроку: ✅ I would rather you did not call him.'
        : '❌ I would rather you not call him → в модели урока: ✅ I would rather you did not call him.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Need / want + object + V3' : '14. Need / want + object + V3'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Фінальні фрази уроку показують конструкцію “мені потрібно, щоб щось зробили” або “вони хочуть, щоб щось вирішили”. Після object стоїть V3: checked, cleaned, solved.'
        : 'Финальные фразы урока показывают конструкцию “мне нужно, чтобы что-то сделали” или “они хотят, чтобы что-то решили”. После object стоит V3: checked, cleaned, solved.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Формула' : 'Формула', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['need + object + V3', 'I need the documents checked today'],
        ['need + object + V3', 'We need the room cleaned before evening'],
        ['want + object + V3', 'They want the problem solved quickly'],
      ]}
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ I need the documents check today → ✅ I need the documents checked today. Тут потрібна форма checked.'
        : '❌ I need the documents check today → ✅ I need the documents checked today. Здесь нужна форма checked.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ They want the problem solve quickly → ✅ They want the problem solved quickly. Problem має бути solved.'
        : '❌ They want the problem solve quickly → ✅ They want the problem solved quickly. Problem должен быть solved.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Готові блоки з уроку' : '15. Готовые блоки из урока'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок 31 важкий, тому тут особливо важливо впізнавати готові блоки, а не перекладати слово за словом.'
        : 'Урок 31 тяжёлый, поэтому здесь особенно важно узнавать готовые блоки, а не переводить слово за словом.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['made that driver pay', isUK ? 'змусили того водія заплатити' : 'заставили того водителя заплатить'],
        ['heard that pilot explain', isUK ? 'чув, як той пілот пояснював' : 'слышал, как тот пилот объяснял'],
        ['felt that raindrop fall', isUK ? 'відчула, як крапля впала' : 'почувствовала, как капля упала'],
        ['let that child eat', isUK ? 'дозволили дитині зʼїсти' : 'позволили ребёнку съесть'],
        ['saw him leave', isUK ? 'бачив, як він пішов' : 'видел, как он ушёл'],
        ['heard me call her', isUK ? 'чула, як я її кликав' : 'слышала, как я её звал'],
        ['made us wait outside', isUK ? 'змусили нас чекати надворі' : 'заставили нас ждать снаружи'],
        ['let me use his phone', isUK ? 'дозволив мені скористатися його телефоном' : 'позволил мне воспользоваться его телефоном'],
      ]}
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['have been waiting for an hour', isUK ? 'чекаю вже годину' : 'жду уже час'],
        ['has been studying all morning', isUK ? 'вчиться весь ранок' : 'учится всё утро'],
        ['have been working since eight', isUK ? 'працюємо з восьмої' : 'работаем с восьми'],
        ['have been looking for the keys', isUK ? 'шукають ключі' : 'ищут ключи'],
        ['is being cleaned now', isUK ? 'зараз прибирають' : 'сейчас убирают'],
        ['are being checked now', isUK ? 'зараз перевіряють' : 'сейчас проверяют'],
        ['would rather you stayed here', isUK ? 'волів би, щоб ти залишився тут' : 'предпочёл бы, чтобы ты остался здесь'],
        ['documents checked today', isUK ? 'щоб документи перевірили сьогодні' : 'чтобы документы проверили сегодня'],
        ['room cleaned before evening', isUK ? 'щоб кімнату прибрали до вечора' : 'чтобы комнату убрали до вечера'],
        ['problem solved quickly', isUK ? 'щоб проблему швидко вирішили' : 'чтобы проблему решили быстро'],
      ]}
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Найчастіші помилки' : '16. Самые частые ошибки'} />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ made him to pay → ✅ made him pay. Після made не ставимо to.'
        : '❌ made him to pay → ✅ made him pay. После made не ставим to.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ let me to use → ✅ let me use. Після let не ставимо to.'
        : '❌ let me to use → ✅ let me use. После let не ставим to.'
      }
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ I saw he leave → ✅ I saw him leave. Після saw потрібна обʼєктна форма him.'
        : '❌ I saw he leave → ✅ I saw him leave. После saw нужна объектная форма him.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ She heard I call her → ✅ She heard me call her. Після heard потрібна форма me.'
        : '❌ She heard I call her → ✅ She heard me call her. После heard нужна форма me.'
      }
    />,

    <Warn
      key="w23"
      t={t}
      f={f}
      text={isUK
        ? '❌ If we started earlier, we would have finished → ✅ If we had started earlier, we would have finished.'
        : '❌ If we started earlier, we would have finished → ✅ If we had started earlier, we would have finished.'
      }
    />,

    <Warn
      key="w24"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have been wait for an hour → ✅ I have been waiting for an hour. Потрібна -ing форма.'
        : '❌ I have been wait for an hour → ✅ I have been waiting for an hour. Нужна -ing форма.'
      }
    />,

    <Warn
      key="w25"
      t={t}
      f={f}
      text={isUK
        ? '❌ The room is being clean now → ✅ The room is being cleaned now. У пасиві потрібна V3 форма.'
        : '❌ The room is being clean now → ✅ The room is being cleaned now. В пассиве нужна V3 форма.'
      }
    />,

    <Warn
      key="w26"
      t={t}
      f={f}
      text={isUK
        ? '❌ I would rather you stay here → у моделі уроку ✅ I would rather you stayed here.'
        : '❌ I would rather you stay here → в модели урока ✅ I would rather you stayed here.'
      }
    />,

    <Warn
      key="w27"
      t={t}
      f={f}
      text={isUK
        ? '❌ I need the documents check today → ✅ I need the documents checked today.'
        : '❌ I need the documents check today → ✅ I need the documents checked today.'
      }
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Що треба винести з уроку' : '17. Что нужно вынести из урока'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок 31 — це просунутий змішаний урок. Make і let вимагають object + базову дію без to. See, hear, feel теж можуть брати object + базову дію. Third conditional говорить про нереальне минуле. Have been + -ing показує дію, яка триває. Is/are being + V3 показує пасивний процес зараз. Would rather + Past Simple передає “я б волів, щоб”. Need/want + object + V3 означає “потрібно/хочу, щоб щось зробили”.'
        : 'Урок 31 - это продвинутый смешанный урок. Make и let требуют object + базовое действие без to. See, hear, feel тоже могут брать object + базовое действие. Third conditional говорит о нереальном прошлом. Have been + -ing показывает действие, которое длится. Is/are being + V3 показывает пассивный процесс сейчас. Would rather + Past Simple передаёт “я бы предпочёл, чтобы”. Need/want + object + V3 означает “нужно/хочу, чтобы что-то сделали”.'
      }
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай пʼять моделей: made him pay. heard him explain. If we had started, we would have finished. I have been waiting. I need the documents checked.'
        : 'Перед практикой держи пять моделей: made him pay. heard him explain. If we had started, we would have finished. I have been waiting. I need the documents checked.'
      }
    />,
  ],
},

// ── УРОК 32 ──────────────────────────────────────────────────
32: {
  titleRU: 'Финальный смешанный урок',
  titleUK: 'Фінальний змішаний урок',
  titlePtBr: "Aula final mista",
  titleVi: "Bài học tổng hợp cuối cùng",
  titleId: "Pelajaran campuran terakhir",
  titleTr: "Son karma ders",
  titlePl: "Ostatnia lekcja mieszana",
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що ти тренуєш у цьому уроці' : '1. Что ты тренируешь в этом уроке'} />,

    <Body
      key="b1a"
      t={t}
      f={f}
      text={isUK
        ? 'Це фінальний змішаний урок. Тут немає однієї маленької теми. Ти збираєш разом кілька сильних конструкцій: звик до дії, людина яка щось зробила, місце де щось сталося, сказали що..., якби..., бачив як..., чекаю вже годину, кімнату зараз прибирають, я б волів щоб..., мені потрібно щоб документи перевірили.'
        : 'Это финальный смешанный урок. Здесь нет одной маленькой темы. Ты собираешь вместе несколько сильных конструкций: привык к действию, человек который что-то сделал, место где что-то произошло, сказали что..., если бы..., видел как..., жду уже час, комнату сейчас убирают, я бы предпочёл чтобы..., мне нужно чтобы документы проверили.'
      }
    />,

    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок уроку' : 'Блок урока', isUK ? 'Модель' : 'Модель', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        [isUK ? 'звик до дії' : 'привык к действию', 'be used to + -ing', 'I am used to working at night'],
        [isUK ? 'уточнення' : 'уточнение', 'who / that / where / whose', 'This is the person who helped me'],
        [isUK ? 'непряма мова' : 'косвенная речь', 'said that...', 'He said that he was tired'],
        [isUK ? 'пасивне повідомлення' : 'пассивное сообщение', 'was/were told that...', 'We were told that the room was cleaned'],
        [isUK ? 'реальна умова' : 'реальное условие', 'If + Present, will', 'If you call me, I will answer'],
        [isUK ? 'нереальне минуле' : 'нереальное прошлое', 'If + had V3, would have V3', 'If I had known, I would have helped'],
        [isUK ? 'бачив / чув / відчув як' : 'видел / слышал / почувствовал как', 'saw/heard/felt + object + verb', 'I saw him leave'],
        [isUK ? 'дія триває' : 'действие длится', 'have/has been + -ing', 'I have been waiting for an hour'],
        [isUK ? 'пасивний процес зараз' : 'пассивный процесс сейчас', 'is/are being + V3', 'The room is being cleaned now'],
        [isUK ? 'я б волів щоб' : 'я бы предпочёл чтобы', 'would rather + past form', 'I would rather you stayed here'],
        [isUK ? 'потрібно щоб зробили' : 'нужно чтобы сделали', 'need/want + object + V3', 'I need the documents checked today'],
      ]}
    />,

    <Tip
      key="tip1"
      t={t}
      f={f}
      text={isUK
        ? 'Головна ідея: цей урок перевіряє, чи ти впізнаєш знайомі механізми в змішаному потоці, а не тільки в окремій темі.'
        : 'Главная идея: этот урок проверяет, узнаёшь ли ты знакомые механизмы в смешанном потоке, а не только в отдельной теме.'
      }
    />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Be used to + -ing = звик до дії' : '2. Be used to + -ing = привык к действию'} />,

    <Body
      key="b2a"
      t={t}
      f={f}
      text={isUK
        ? 'Be used to + -ing означає, що дія для людини вже нормальна або звична зараз. Це не used to з уроку 29. Used to live = раніше жив. Am used to living = звик жити.'
        : 'Be used to + -ing означает, что действие для человека уже нормальное или привычное сейчас. Это не used to из урока 29. Used to live = раньше жил. Am used to living = привык жить.'
      }
    />,

    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I am used to working at night', isUK ? 'Я звик працювати вночі' : 'Я привык работать ночью'],
        ['She is used to waking up early', isUK ? 'Вона звикла рано вставати' : 'Она привыкла рано вставать'],
        ['We are used to speaking English every day', isUK ? 'Ми звикли говорити англійською щодня' : 'Мы привыкли говорить по-английски каждый день'],
        ['They are used to waiting here', isUK ? 'Вони звикли чекати тут' : 'Они привыкли ждать здесь'],
        ['He is not used to driving in the city', isUK ? 'Він не звик їздити в місті' : 'Он не привык водить в городе'],
        ['I am not used to working so late', isUK ? 'Я не звик працювати так пізно' : 'Я не привык работать так поздно'],
        ['Are you used to studying every day?', isUK ? 'Ти звик вчитися щодня?' : 'Ты привык учиться каждый день?'],
        ['Are they used to living here?', isUK ? 'Вони звикли жити тут?' : 'Они привыкли жить здесь?'],
      ]}
    />,

    <Warn
      key="w1"
      t={t}
      f={f}
      text={isUK
        ? '❌ I am used to work at night → ✅ I am used to working at night. Після be used to потрібна -ing форма.'
        : '❌ I am used to work at night → ✅ I am used to working at night. После be used to нужна -ing форма.'
      }
    />,

    <Warn
      key="w2"
      t={t}
      f={f}
      text={isUK
        ? '❌ She used to waking up early → ✅ She is used to waking up early, якщо сенс “вона звикла зараз”.'
        : '❌ She used to waking up early → ✅ She is used to waking up early, если смысл “она привыкла сейчас”.'
      }
    />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Used to і be used to - не одне й те саме' : '3. Used to и be used to - не одно и то же'} />,

    <Body
      key="b3a"
      t={t}
      f={f}
      text={isUK
        ? 'Це одна з головних пасток фінального уроку. Used to + verb говорить про стару звичку в минулому. Be used to + -ing говорить про звичність зараз.'
        : 'Это одна из главных ловушек финального урока. Used to + verb говорит о старой привычке в прошлом. Be used to + -ing говорит о привычности сейчас.'
      }
    />,

    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        ['used to + verb', 'be used to + -ing'],
        [isUK ? 'раніше робив, зараз уже не факт' : 'раньше делал, сейчас уже не факт', isUK ? 'звик робити зараз' : 'привык делать сейчас'],
        ['I used to work at night', 'I am used to working at night'],
        ['She used to wake up early', 'She is used to waking up early'],
        ['They used to live here', 'They are used to living here'],
      ]}
    />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Relative clauses: who, that, where, whose' : '4. Relative clauses: who, that, where, whose'} />,

    <Body
      key="b4a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 9-16 повторюють relative clauses. Вони додають уточнення до людини, речі або місця: людина, яка допомогла; додаток, який допомагає; місце, де ми зустрілися; жінка, чию сумку ми знайшли.'
        : 'Фразы 9-16 повторяют relative clauses. Они добавляют уточнение к человеку, вещи или месту: человек, который помог; приложение, которое помогает; место, где мы встретились; женщина, чью сумку мы нашли.'
      }
    />,

    <Table
      key="t4"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Для чого' : 'Для чего', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['who', isUK ? 'для людини' : 'для человека', 'This is the person who helped me'],
        ['whose', isUK ? 'чий / чия / чиє / чиї' : 'чей / чья / чьё / чьи', 'She is the woman whose bag we found'],
        ['that', isUK ? 'для речі або обʼєкта' : 'для вещи или объекта', 'This is the app that helps me learn'],
        ['where', isUK ? 'для місця' : 'для места', 'This is the place where we met'],
      ]}
    />,

    <Warn
      key="w3"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is the person which helped me → ✅ This is the person who helped me. Для людини використовуй who.'
        : '❌ This is the person which helped me → ✅ This is the person who helped me. Для человека используй who.'
      }
    />,

    <Warn
      key="w4"
      t={t}
      f={f}
      text={isUK
        ? '❌ She is the woman who bag we found → ✅ She is the woman whose bag we found. Для “чью сумку” потрібне whose.'
        : '❌ She is the woman who bag we found → ✅ She is the woman whose bag we found. Для “чью сумку” нужно whose.'
      }
    />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Relative clauses у минулому' : '5. Relative clauses в прошлом'} />,

    <Body
      key="b5a"
      t={t}
      f={f}
      text={isUK
        ? 'У фразах уроку уточнення часто стоїть у Past Simple: helped, sent, lost, waited. Це просто додаткова інформація про людину, ключі або кімнату.'
        : 'В фразах урока уточнение часто стоит в Past Simple: helped, sent, lost, waited. Это просто дополнительная информация про человека, ключи или комнату.'
      }
    />,

    <Table
      key="t5"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що уточнює друга частина' : 'Что уточняет вторая часть'],
        ['This is the person who helped me', isUK ? 'яка людина?' : 'какой человек?'],
        ['I called the man who sent the message', isUK ? 'який чоловік?' : 'какой мужчина?'],
        ['We found the keys that she lost', isUK ? 'які ключі?' : 'какие ключи?'],
        ['They opened the room where we waited', isUK ? 'яку кімнату?' : 'какую комнату?'],
        ['I remember the teacher whose lesson helped me', isUK ? 'якого вчителя?' : 'какого учителя?'],
      ]}
    />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Reported speech: said that...' : '6. Косвенная речь: said that...'} />,

    <Body
      key="b6a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 17-20 повторюють непряму мову. Ми не цитуємо людину прямо, а передаємо зміст її слів через said that або explained that.'
        : 'Фразы 17-20 повторяют косвенную речь. Мы не цитируем человека прямо, а передаём смысл его слов через said that или explained that.'
      }
    />,

    <Table
      key="t6"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Що передаємо' : 'Что передаём'],
        ['He said that he was tired', isUK ? 'він сказав, що втомився' : 'он сказал, что устал'],
        ['She said that she would call later', isUK ? 'вона сказала, що зателефонує пізніше' : 'она сказала, что позвонит позже'],
        ['They said that they had sent the documents', isUK ? 'вони сказали, що надіслали документи' : 'они сказали, что отправили документы'],
        ['He explained that everything was okay', isUK ? 'він пояснив, що все гаразд' : 'он объяснил, что всё в порядке'],
      ]}
    />,

    <Tip
      key="tip2"
      t={t}
      f={f}
      text={isUK
        ? 'У непрямій мові після said that часто час зсувається назад: is → was, will → would, have sent → had sent.'
        : 'В косвенной речи после said that часто время сдвигается назад: is → was, will → would, have sent → had sent.'
      }
    />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Passive reported speech: was/were told that...' : '7. Пассивная косвенная речь: was/were told that...'} />,

    <Body
      key="b7a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази We were told, I was told, She was told, They were told означають “нам сказали”, “мне сказали”, “ей сказали”, “им сказали”. Фокус не на тому, хто сказав, а на тому, кому повідомили.'
        : 'Фразы We were told, I was told, She was told, They were told означают “нам сказали”, “мне сказали”, “ей сказали”, “им сказали”. Фокус не на том, кто сказал, а на том, кому сообщили.'
      }
    />,

    <Table
      key="t7"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['We were told that the room was cleaned', isUK ? 'Нам сказали, що кімнату прибрали' : 'Нам сказали, что комнату убрали'],
        ['I was told that the app was fixed', isUK ? 'Мені сказали, що додаток полагодили' : 'Мне сказали, что приложение починили'],
        ['She was told that the tickets were sold', isUK ? 'Їй сказали, що квитки продані' : 'Ей сказали, что билеты проданы'],
        ['They were told that the problem was solved', isUK ? 'Їм сказали, що проблему вирішили' : 'Им сказали, что проблема решена'],
      ]}
    />,

    <Warn
      key="w5"
      t={t}
      f={f}
      text={isUK
        ? '❌ We was told → ✅ We were told. З we потрібне were.'
        : '❌ We was told → ✅ We were told. С we нужно were.'
      }
    />,

    <Warn
      key="w6"
      t={t}
      f={f}
      text={isUK
        ? '❌ I were told → ✅ I was told. З I у минулому тут was.'
        : '❌ I were told → ✅ I was told. С I в прошлом здесь was.'
      }
    />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Conditional type 1: If + Present, will' : '8. Условное 1 типа: If + Present, will'} />,

    <Body
      key="b8a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 25-28 показують реальну умову в майбутньому. Після if ставимо Present Simple, а в результаті використовуємо will.'
        : 'Фразы 25-28 показывают реальное условие в будущем. После if ставим Present Simple, а в результате используем will.'
      }
    />,

    <Table
      key="t8"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Умова' : 'Условие', isUK ? 'Результат' : 'Результат'],
        ['If you call me', 'I will answer'],
        ['If she has time', 'she will help us'],
        ['If we start now', 'we will finish today'],
        ['If they do not come', 'we will start without them'],
      ]}
    />,

    <Warn
      key="w7"
      t={t}
      f={f}
      text={isUK
        ? '❌ If you will call me, I will answer → ✅ If you call me, I will answer. Після if не ставимо will у цій моделі.'
        : '❌ If you will call me, I will answer → ✅ If you call me, I will answer. После if не ставим will в этой модели.'
      }
    />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Conditional type 3: If + had V3, would have V3' : '9. Условное 3 типа: If + had V3, would have V3'} />,

    <Body
      key="b9a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 29-32 говорять про нереальне минуле: щось не сталося, але ми уявляємо інший результат.'
        : 'Фразы 29-32 говорят о нереальном прошлом: что-то не произошло, но мы представляем другой результат.'
      }
    />,

    <Table
      key="t9"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Умова в минулому' : 'Условие в прошлом', isUK ? 'Уявний результат у минулому' : 'Воображаемый результат в прошлом'],
        ['If I had known', 'I would have helped'],
        ['If she had called me', 'I would have answered'],
        ['If we had started earlier', 'we would have finished'],
        ['If they had checked the room', 'they would have found the keys'],
      ]}
    />,

    <Warn
      key="w8"
      t={t}
      f={f}
      text={isUK
        ? '❌ If I knew, I would have helped → для цієї моделі уроку ✅ If I had known, I would have helped.'
        : '❌ If I knew, I would have helped → для этой модели урока ✅ If I had known, I would have helped.'
      }
    />,

    <Warn
      key="w9"
      t={t}
      f={f}
      text={isUK
        ? '❌ I would helped → ✅ I would have helped. У третій умовній моделі потрібне would have + V3.'
        : '❌ I would helped → ✅ I would have helped. В третьей условной модели нужно would have + V3.'
      }
    />,

    <Section key="s10" t={t} f={f} title={isUK ? '10. Complex Object: saw/heard/felt/made/let/helped + object + verb' : '10. Complex Object: saw/heard/felt/made/let/helped + object + verb'} />,

    <Body
      key="b10a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 33-38 повторюють complex object. Після saw, heard, felt, made, let, helped стоїть людина або предмет, а потім дія.'
        : 'Фразы 33-38 повторяют complex object. После saw, heard, felt, made, let, helped стоит человек или предмет, а потом действие.'
      }
    />,

    <Table
      key="t10"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Логіка' : 'Логика'],
        ['I saw him leave', 'saw + him + leave'],
        ['She heard me call her', 'heard + me + call'],
        ['We felt the phone vibrate', 'felt + the phone + vibrate'],
        ['They made us wait outside', 'made + us + wait'],
        ['He let me use his phone', 'let + me + use'],
        ['This lesson helped me understand English better', 'helped + me + understand'],
      ]}
    />,

    <Warn
      key="w10"
      t={t}
      f={f}
      text={isUK
        ? '❌ I saw he leave → ✅ I saw him leave. Після saw потрібна форма him.'
        : '❌ I saw he leave → ✅ I saw him leave. После saw нужна форма him.'
      }
    />,

    <Warn
      key="w11"
      t={t}
      f={f}
      text={isUK
        ? '❌ He let me to use his phone → ✅ He let me use his phone. Після let не ставимо to.'
        : '❌ He let me to use his phone → ✅ He let me use his phone. После let не ставим to.'
      }
    />,

    <Warn
      key="w12"
      t={t}
      f={f}
      text={isUK
        ? '❌ They made us to wait → ✅ They made us wait. Після made не ставимо to.'
        : '❌ They made us to wait → ✅ They made us wait. После made не ставим to.'
      }
    />,

    <Section key="s11" t={t} f={f} title={isUK ? '11. Present Perfect Continuous: have/has been + -ing' : '11. Present Perfect Continuous: have/has been + -ing'} />,

    <Body
      key="b11a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 39-42 показують дію, яка почалася раніше і триває до тепер або важлива зараз: чекаю вже годину, вчиться весь ранок, працюємо з восьмої, шукають ключі.'
        : 'Фразы 39-42 показывают действие, которое началось раньше и длится до настоящего момента или важно сейчас: жду уже час, учится всё утро, работаем с восьми, ищут ключи.'
      }
    />,

    <Table
      key="t11"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Формула' : 'Формула', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['I have been + -ing', 'I have been waiting for an hour'],
        ['She has been + -ing', 'She has been studying all morning'],
        ['We have been + -ing', 'We have been working since eight'],
        ['They have been + -ing', 'They have been looking for the keys'],
      ]}
    />,

    <Warn
      key="w13"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have waiting for an hour → ✅ I have been waiting for an hour. У цій конструкції потрібне been.'
        : '❌ I have waiting for an hour → ✅ I have been waiting for an hour. В этой конструкции нужно been.'
      }
    />,

    <Warn
      key="w14"
      t={t}
      f={f}
      text={isUK
        ? '❌ She have been studying → ✅ She has been studying. З she потрібне has.'
        : '❌ She have been studying → ✅ She has been studying. С she нужно has.'
      }
    />,

    <Section key="s12" t={t} f={f} title={isUK ? '12. For, all morning, since' : '12. For, all morning, since'} />,

    <Body
      key="b12a"
      t={t}
      f={f}
      text={isUK
        ? 'У Present Perfect Continuous часові блоки показують, як довго триває дія або з якого моменту вона триває.'
        : 'В Present Perfect Continuous временные блоки показывают, как долго длится действие или с какого момента оно длится.'
      }
    />,

    <Table
      key="t12"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['for an hour', isUK ? 'вже годину / протягом години' : 'уже час / в течение часа', 'I have been waiting for an hour'],
        ['all morning', isUK ? 'весь ранок' : 'всё утро', 'She has been studying all morning'],
        ['since eight', isUK ? 'з восьмої' : 'с восьми', 'We have been working since eight'],
      ]}
    />,

    <Tip
      key="tip3"
      t={t}
      f={f}
      text={isUK
        ? 'For an hour = тривалість. Since eight = точка старту.'
        : 'For an hour = длительность. Since eight = точка старта.'
      }
    />,

    <Section key="s13" t={t} f={f} title={isUK ? '13. Present Continuous Passive: is/are being + V3' : '13. Present Continuous Passive: is/are being + V3'} />,

    <Body
      key="b13a"
      t={t}
      f={f}
      text={isUK
        ? 'Фрази 43-44 показують пасивний процес зараз. Не важливо, хто саме прибирає або перевіряє. Важливо, що дія зараз відбувається над кімнатою або документами.'
        : 'Фразы 43-44 показывают пассивный процесс сейчас. Не важно, кто именно убирает или проверяет. Важно, что действие сейчас происходит над комнатой или документами.'
      }
    />,

    <Table
      key="t13"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Один предмет' : 'Один предмет', isUK ? 'Кілька предметів' : 'Несколько предметов'],
        ['The room is being cleaned now', 'The documents are being checked now'],
        [isUK ? 'room один → is being cleaned' : 'room один → is being cleaned', isUK ? 'documents множина → are being checked' : 'documents множественное число → are being checked'],
      ]}
    />,

    <Warn
      key="w15"
      t={t}
      f={f}
      text={isUK
        ? '❌ The room is being clean now → ✅ The room is being cleaned now. У пасиві потрібна V3 форма.'
        : '❌ The room is being clean now → ✅ The room is being cleaned now. В пассиве нужна V3 форма.'
      }
    />,

    <Warn
      key="w16"
      t={t}
      f={f}
      text={isUK
        ? '❌ The documents is being checked → ✅ The documents are being checked. Documents - множина.'
        : '❌ The documents is being checked → ✅ The documents are being checked. Documents - множественное число.'
      }
    />,

    <Section key="s14" t={t} f={f} title={isUK ? '14. Would rather + Past Simple' : '14. Would rather + Past Simple'} />,

    <Body
      key="b14a"
      t={t}
      f={f}
      text={isUK
        ? 'Would rather означає “я б волів / я б краще”. Коли після would rather іде інша людина, дія часто стоїть у формі Past Simple: stayed, did not call, started.'
        : 'Would rather означает “я бы предпочёл / я бы лучше”. Когда после would rather идёт другой человек, действие часто стоит в форме Past Simple: stayed, did not call, started.'
      }
    />,

    <Table
      key="t14"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Фраза з уроку' : 'Фраза из урока', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I would rather you stayed here', isUK ? 'Я б волів, щоб ти залишився тут' : 'Я бы предпочёл, чтобы ты остался здесь'],
        ['I would rather you did not call him', isUK ? 'Я б волів, щоб ти йому не телефонував' : 'Я бы предпочёл, чтобы ты ему не звонил'],
        ['She would rather we started later', isUK ? 'Вона б воліла, щоб ми почали пізніше' : 'Она бы предпочла, чтобы мы начали позже'],
      ]}
    />,

    <Warn
      key="w17"
      t={t}
      f={f}
      text={isUK
        ? '❌ I would rather you stay here → у моделі уроку ✅ I would rather you stayed here.'
        : '❌ I would rather you stay here → в модели урока ✅ I would rather you stayed here.'
      }
    />,

    <Warn
      key="w18"
      t={t}
      f={f}
      text={isUK
        ? '❌ I would rather you not call him → у моделі уроку ✅ I would rather you did not call him.'
        : '❌ I would rather you not call him → в модели урока ✅ I would rather you did not call him.'
      }
    />,

    <Section key="s15" t={t} f={f} title={isUK ? '15. Need / want + object + V3' : '15. Need / want + object + V3'} />,

    <Body
      key="b15a"
      t={t}
      f={f}
      text={isUK
        ? 'Останні фрази уроку показують конструкцію “мені потрібно / ми хочемо, щоб щось зробили”. Після object стоїть V3: checked, cleaned, solved.'
        : 'Последние фразы урока показывают конструкцию “мне нужно / мы хотим, чтобы что-то сделали”. После object стоит V3: checked, cleaned, solved.'
      }
    />,

    <Table
      key="t15"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Формула' : 'Формула', isUK ? 'Приклад з уроку' : 'Пример из урока'],
        ['need + object + V3', 'I need the documents checked today'],
        ['need + object + V3', 'We need the room cleaned before evening'],
        ['want + object + V3', 'They want the problem solved quickly'],
      ]}
    />,

    <Warn
      key="w19"
      t={t}
      f={f}
      text={isUK
        ? '❌ I need the documents check today → ✅ I need the documents checked today. Тут потрібна форма checked.'
        : '❌ I need the documents check today → ✅ I need the documents checked today. Здесь нужна форма checked.'
      }
    />,

    <Warn
      key="w20"
      t={t}
      f={f}
      text={isUK
        ? '❌ They want the problem solve quickly → ✅ They want the problem solved quickly. Problem має бути solved.'
        : '❌ They want the problem solve quickly → ✅ They want the problem solved quickly. Problem должен быть solved.'
      }
    />,

    <Section key="s16" t={t} f={f} title={isUK ? '16. Object forms: me, us, them, him, her' : '16. Object forms: me, us, them, him, her'} />,

    <Body
      key="b16a"
      t={t}
      f={f}
      text={isUK
        ? 'У фінальному уроці багато обʼєктних форм після дії: helped me, help us, call me, helped us, saw him, heard me, made us, let me, call her, call him.'
        : 'В финальном уроке много объектных форм после действия: helped me, help us, call me, helped us, saw him, heard me, made us, let me, call her, call him.'
      }
    />,

    <Table
      key="t16"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Форма' : 'Форма', isUK ? 'Приклади з уроку' : 'Примеры из урока'],
        ['me', 'who helped me / call me / She heard me call her / helped me understand'],
        ['us', 'help us / They made us wait outside / Are they the people who helped us?'],
        ['them', 'start without them / would have found them? / looking for the keys'],
        ['him', 'I saw him leave / did not call him'],
        ['her', 'She heard me call her'],
      ]}
    />,

    <Warn
      key="w21"
      t={t}
      f={f}
      text={isUK
        ? '❌ She heard I call her → ✅ She heard me call her. Після heard потрібна форма me.'
        : '❌ She heard I call her → ✅ She heard me call her. После heard нужна форма me.'
      }
    />,

    <Warn
      key="w22"
      t={t}
      f={f}
      text={isUK
        ? '❌ They made we wait outside → ✅ They made us wait outside. Після made потрібна форма us.'
        : '❌ They made we wait outside → ✅ They made us wait outside. После made нужна форма us.'
      }
    />,

    <Section key="s17" t={t} f={f} title={isUK ? '17. Готові блоки з уроку' : '17. Готовые блоки из урока'} />,

    <Body
      key="b17a"
      t={t}
      f={f}
      text={isUK
        ? 'Фінальний урок краще вчити готовими блоками. Тут важливо не розсипатися на окремі слова.'
        : 'Финальный урок лучше учить готовыми блоками. Здесь важно не рассыпаться на отдельные слова.'
      }
    />,

    <Table
      key="t17"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['used to working at night', isUK ? 'звик працювати вночі' : 'привык работать ночью'],
        ['used to waking up early', isUK ? 'звикла рано вставати' : 'привыкла рано вставать'],
        ['used to speaking English every day', isUK ? 'звикли говорити англійською щодня' : 'привыкли говорить по-английски каждый день'],
        ['person who helped me', isUK ? 'людина, яка допомогла мені' : 'человек, который помог мне'],
        ['woman whose bag we found', isUK ? 'жінка, чию сумку ми знайшли' : 'женщина, чью сумку мы нашли'],
        ['app that helps me learn', isUK ? 'додаток, який допомагає мені вчитися' : 'приложение, которое помогает мне учиться'],
        ['place where we met', isUK ? 'місце, де ми зустрілися' : 'место, где мы встретились'],
        ['keys that she lost', isUK ? 'ключі, які вона загубила' : 'ключи, которые она потеряла'],
        ['teacher whose lesson helped me', isUK ? 'вчитель, чий урок допоміг мені' : 'учитель, чей урок помог мне'],
      ]}
    />,

    <Table
      key="t18"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['said that he was tired', isUK ? 'сказав, що втомився' : 'сказал, что устал'],
        ['said that she would call later', isUK ? 'сказала, що зателефонує пізніше' : 'сказала, что позвонит позже'],
        ['said that they had sent the documents', isUK ? 'сказали, що відправили документи' : 'сказали, что отправили документы'],
        ['were told that the room was cleaned', isUK ? 'нам сказали, що кімнату прибрали' : 'нам сказали, что комнату убрали'],
        ['was told that the app was fixed', isUK ? 'мені сказали, що додаток полагодили' : 'мне сказали, что приложение починили'],
        ['were told that the problem was solved', isUK ? 'їм сказали, що проблему вирішили' : 'им сказали, что проблема решена'],
      ]}
    />,

    <Table
      key="t19"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['If you call me, I will answer', isUK ? 'якщо ти подзвониш, я відповім' : 'если ты позвонишь, я отвечу'],
        ['If I had known, I would have helped', isUK ? 'якби я знав, я б допоміг' : 'если бы я знал, я бы помог'],
        ['I saw him leave', isUK ? 'я бачив, як він пішов' : 'я видел, как он ушёл'],
        ['She heard me call her', isUK ? 'вона чула, як я її кликав' : 'она слышала, как я её звал'],
        ['They made us wait outside', isUK ? 'вони змусили нас чекати надворі' : 'они заставили нас ждать снаружи'],
        ['He let me use his phone', isUK ? 'він дозволив мені скористатися його телефоном' : 'он позволил мне воспользоваться его телефоном'],
      ]}
    />,

    <Table
      key="t20"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Блок' : 'Блок', isUK ? 'Значення' : 'Значение'],
        ['have been waiting for an hour', isUK ? 'чекаю вже годину' : 'жду уже час'],
        ['has been studying all morning', isUK ? 'вчиться весь ранок' : 'учится всё утро'],
        ['have been working since eight', isUK ? 'працюємо з восьмої' : 'работаем с восьми'],
        ['is being cleaned now', isUK ? 'зараз прибирають' : 'сейчас убирают'],
        ['are being checked now', isUK ? 'зараз перевіряють' : 'сейчас проверяют'],
        ['would rather you stayed here', isUK ? 'волів би, щоб ти залишився тут' : 'предпочёл бы, чтобы ты остался здесь'],
        ['documents checked today', isUK ? 'щоб документи перевірили сьогодні' : 'чтобы документы проверили сегодня'],
        ['room cleaned before evening', isUK ? 'щоб кімнату прибрали до вечора' : 'чтобы комнату убрали до вечера'],
        ['problem solved quickly', isUK ? 'щоб проблему швидко вирішили' : 'чтобы проблему решили быстро'],
      ]}
    />,

    <Section key="s18" t={t} f={f} title={isUK ? '18. Переклад не завжди дослівний' : '18. Перевод не всегда дословный'} />,

    <Body
      key="b18a"
      t={t}
      f={f}
      text={isUK
        ? 'У фінальному уроці багато фраз, які не перекладаються слово в слово. Англійська може сказати коротко: I saw him leave, I was told, I need the documents checked. Українською або російською це часто звучить як повне речення.'
        : 'В финальном уроке много фраз, которые не переводятся слово в слово. Английский может сказать коротко: I saw him leave, I was told, I need the documents checked. По-русски это часто звучит как целое предложение.'
      }
    />,

    <Table
      key="t21"
      t={t}
      f={f}
      rows={[
        [isUK ? 'Англійська' : 'Английский', isUK ? 'Природний переклад' : 'Естественный перевод'],
        ['I am used to working at night', isUK ? 'Я звик працювати вночі' : 'Я привык работать ночью'],
        ['We were told that the room was cleaned', isUK ? 'Нам сказали, що кімнату прибрали' : 'Нам сказали, что комнату убрали'],
        ['If I had known, I would have helped', isUK ? 'Якби я знав, я б допоміг' : 'Если бы я знал, я бы помог'],
        ['I saw him leave', isUK ? 'Я бачив, як він пішов' : 'Я видел, как он ушёл'],
        ['The room is being cleaned now', isUK ? 'Кімнату прибирають зараз' : 'Комнату убирают сейчас'],
        ['I need the documents checked today', isUK ? 'Мені потрібно, щоб документи перевірили сьогодні' : 'Мне нужно, чтобы документы проверили сегодня'],
      ]}
    />,

    <Section key="s19" t={t} f={f} title={isUK ? '19. Найчастіші помилки' : '19. Самые частые ошибки'} />,

    <Warn
      key="w23"
      t={t}
      f={f}
      text={isUK
        ? '❌ I am used to work at night → ✅ I am used to working at night. Після be used to потрібне -ing.'
        : '❌ I am used to work at night → ✅ I am used to working at night. После be used to нужно -ing.'
      }
    />,

    <Warn
      key="w24"
      t={t}
      f={f}
      text={isUK
        ? '❌ This is the person which helped me → ✅ This is the person who helped me. Для людини потрібне who.'
        : '❌ This is the person which helped me → ✅ This is the person who helped me. Для человека нужно who.'
      }
    />,

    <Warn
      key="w25"
      t={t}
      f={f}
      text={isUK
        ? '❌ She is the woman who bag we found → ✅ She is the woman whose bag we found. Для “чью сумку” потрібне whose.'
        : '❌ She is the woman who bag we found → ✅ She is the woman whose bag we found. Для “чью сумку” нужно whose.'
      }
    />,

    <Warn
      key="w26"
      t={t}
      f={f}
      text={isUK
        ? '❌ She said that she will call later → у моделі непрямої мови уроку: ✅ She said that she would call later.'
        : '❌ She said that she will call later → в модели косвенной речи урока: ✅ She said that she would call later.'
      }
    />,

    <Warn
      key="w27"
      t={t}
      f={f}
      text={isUK
        ? '❌ If you will call me, I will answer → ✅ If you call me, I will answer. Після if у 1 типі не ставимо will.'
        : '❌ If you will call me, I will answer → ✅ If you call me, I will answer. После if в 1 типе не ставим will.'
      }
    />,

    <Warn
      key="w28"
      t={t}
      f={f}
      text={isUK
        ? '❌ If I knew, I would have helped → для 3 типу: ✅ If I had known, I would have helped.'
        : '❌ If I knew, I would have helped → для 3 типа: ✅ If I had known, I would have helped.'
      }
    />,

    <Warn
      key="w29"
      t={t}
      f={f}
      text={isUK
        ? '❌ I saw he leave → ✅ I saw him leave. Після saw потрібна форма him.'
        : '❌ I saw he leave → ✅ I saw him leave. После saw нужна форма him.'
      }
    />,

    <Warn
      key="w30"
      t={t}
      f={f}
      text={isUK
        ? '❌ He let me to use his phone → ✅ He let me use his phone. Після let не ставимо to.'
        : '❌ He let me to use his phone → ✅ He let me use his phone. После let не ставим to.'
      }
    />,

    <Warn
      key="w31"
      t={t}
      f={f}
      text={isUK
        ? '❌ I have waiting for an hour → ✅ I have been waiting for an hour. Потрібне have been + -ing.'
        : '❌ I have waiting for an hour → ✅ I have been waiting for an hour. Нужно have been + -ing.'
      }
    />,

    <Warn
      key="w32"
      t={t}
      f={f}
      text={isUK
        ? '❌ The room is being clean now → ✅ The room is being cleaned now. У пасиві потрібна V3 форма.'
        : '❌ The room is being clean now → ✅ The room is being cleaned now. В пассиве нужна V3 форма.'
      }
    />,

    <Warn
      key="w33"
      t={t}
      f={f}
      text={isUK
        ? '❌ I would rather you stay here → у моделі уроку: ✅ I would rather you stayed here.'
        : '❌ I would rather you stay here → в модели урока: ✅ I would rather you stayed here.'
      }
    />,

    <Warn
      key="w34"
      t={t}
      f={f}
      text={isUK
        ? '❌ I need the documents check today → ✅ I need the documents checked today. Тут потрібна V3 форма checked.'
        : '❌ I need the documents check today → ✅ I need the documents checked today. Здесь нужна V3 форма checked.'
      }
    />,

    <Section key="s20" t={t} f={f} title={isUK ? '20. Що треба винести з уроку' : '20. Что нужно вынести из урока'} />,

    <Body
      key="b20a"
      t={t}
      f={f}
      text={isUK
        ? 'Урок 32 завершує курс як змішана перевірка. Тут треба впізнавати не окремі слова, а конструкції: be used to + -ing, relative clauses, reported speech, passive reports, conditionals, complex object, have been + -ing, is being + V3, would rather і need/want + object + V3.'
        : 'Урок 32 завершает курс как смешанная проверка. Здесь нужно узнавать не отдельные слова, а конструкции: be used to + -ing, relative clauses, reported speech, passive reports, conditionals, complex object, have been + -ing, is being + V3, would rather и need/want + object + V3.'
      }
    />,

    <Tip
      key="tip4"
      t={t}
      f={f}
      text={isUK
        ? 'Перед практикою тримай шість моделей: I am used to working. This is the person who helped me. If I had known, I would have helped. I saw him leave. I have been waiting. I need the documents checked.'
        : 'Перед практикой держи шесть моделей: I am used to working. This is the person who helped me. If I had known, I would have helped. I saw him leave. I have been waiting. I need the documents checked.'
      }
    />,
  ],
},
};

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function LessonHelp() {
  const router = useRouter();
  const { id, lessonId: lessonIdParam } = useLocalSearchParams<{ id: string | string[]; lessonId: string | string[] }>();
  const rawId = Array.isArray(id) ? id[0] : id;
  const rawLessonId = Array.isArray(lessonIdParam) ? lessonIdParam[0] : lessonIdParam;
  const lessonId = Number(rawId || rawLessonId) || 1;
  const { studyTarget } = useStudyTarget();
  useEffect(() => {
    let cancelled = false;
    void shouldBlockLessonAccess(lessonId, studyTarget).then(blocked => {
      if (!cancelled && blocked) void openLessonGateByRuntime(router, lessonId, studyTarget);
    });
    return () => { cancelled = true; };
  }, [lessonId, router, studyTarget]);
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const isFrenchTarget = frenchStudyActive(studyTarget);
  const frenchTheoryAllowed = !isFrenchTarget || lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId);
  const frenchTheoryScreens = isFrenchTarget && frenchTheoryAllowed ? getFrenchLessonIntroScreens(lessonId) : undefined;
  const theory = THEORY[lessonId];
  const theoryTitleEs = theoryTitleEsFor(lessonId, theory);
  const plannedLocale = plannedTheoryLocale(lang);
  const plannedTheoryScreens = plannedLocale && !isFrenchTarget ? getLessonIntroScreens(lessonId, studyTarget) : undefined;
  const legacyLang = legacyUiLang(lang);
  const renderLegacyAsUk = legacyLang === 'uk';
  const renderSpanishTheory = legacyLang === 'es' && theory ? hasSpanishTheoryContent(theory) : false;
  const showSpanishTheoryNotice = legacyLang === 'es' && !isFrenchTarget && theory ? !hasSpanishTheoryContent(theory) : false;
  const frenchTheoryTitle = frenchTheoryScreens?.[0]
    ? introTitleForUi(frenchTheoryScreens[0], lang)
    : undefined;
  const frenchTheoryGateCopy = isFrenchTarget && !frenchTheoryAllowed
    ? frenchLessonSupportGateCopy('lesson_theory', lang, lessonId)
    : null;
  const canClaimTheoryXp = !isFrenchTarget || Boolean(frenchTheoryScreens?.length);
  const [xpClaimed, setXpClaimed] = useState(false);
  const [xpShown, setXpShown] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [previewXP, setPreviewXP] = useState(25);
  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (canClaimTheoryXp) {
      updateTaskProgress('open_theory', 1, studyTarget).catch(() => {});
    }
    const key = lessonTheoryXpClaimedKey(lessonId, studyTarget);
    setXpClaimed(false);
    if (!canClaimTheoryXp) return;
    AsyncStorage.getItem(key).then(v => { if (v === '1') setXpClaimed(true); }).catch(() => {});
    getCurrentMultiplier().then(m => {
      setPreviewXP(Math.round(25 * m));
    }).catch(() => {});
  }, [canClaimTheoryXp, lessonId, studyTarget]);

  const handleClaimXP = async () => {
    if (xpClaimed || !canClaimTheoryXp) return;
    const key = lessonTheoryXpClaimedKey(lessonId, studyTarget);
    setXpClaimed(true);
    // Показываем previewXP сразу, потом обновим на реальный finalDelta
    setEarnedXP(previewXP);
    const userName = await AsyncStorage.getItem('user_name') ?? '';
    registerXP(25, 'vocabulary_learned', userName, lang, lessonId, {
      eventId: [
        'vocabulary',
        String(studyTarget ?? 'na').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 40) || 'na',
        String(lessonId),
        'theory',
        'claim',
      ].join(':'),
      payload: {
        lessonId,
        studyTarget,
        surface: 'lesson_theory',
      },
    })
      .then(result => {
        if (Math.max(0, Math.round(result.finalDelta || 0)) <= 0) {
          setXpClaimed(false);
          return;
        }
        AsyncStorage.setItem(key, '1').catch(() => {});
        setEarnedXP(result.finalDelta);
        setXpShown(true);
        xpAnim.setValue(0);
        Animated.sequence([
          Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setXpShown(false));
      })
      .catch(() => {
        setXpClaimed(false);
        // Показать с previewXP если registerXP упал
        setXpShown(true);
        xpAnim.setValue(0);
        Animated.sequence([
          Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setXpShown(false));
      });
  };

  const unavailableTheoryTitle = triLang(lang, {
    uk: `Урок ${lessonId}`,
    ru: `Урок ${lessonId}`,
    es: `Lección ${lessonId}`,
    'pt-BR': `Lição ${lessonId}`,
    vi: `Bài ${lessonId}`,
    id: `Pelajaran ${lessonId}`,
    tr: `Ders ${lessonId}`,
    pl: `Lekcja ${lessonId}`,
  });
  const unavailableTheoryText = triLang(lang, {
    uk: `Теорія для уроку ${lessonId} незабаром з'явиться. Продовжуй практикуватись!`,
    ru: `Теория для этого урока скоро появится. Пока практикуйся — это важнее!`,
    es: `La teoría de la lección ${lessonId} estará disponible pronto. ¡Sigue practicando!`,
    'pt-BR': `A teoria da lição ${lessonId} estará disponível em breve. Continue praticando!`,
    vi: `Lý thuyết của bài ${lessonId} sẽ sớm có. Hãy tiếp tục luyện tập!`,
    id: `Teori untuk pelajaran ${lessonId} akan segera tersedia. Tetap berlatih!`,
    tr: `${lessonId}. dersin teorisi yakında hazır olacak. Pratik yapmaya devam et!`,
    pl: `Teoria do lekcji ${lessonId} pojawi się wkrótce. Ćwicz dalej!`,
  });

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: t.border,
      }}>
        <TapScale onPress={() => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any)} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={sx.primary} />
        </TapScale>
        <View style={{ flex: 1 }}>
          <Text style={{ color: sx.muted, fontSize: f.caption }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {triLang(lang, {
              uk: `Урок ${lessonId} — Теорія`,
              ru: `Урок ${lessonId} — Теория`,
              es: `Lección ${lessonId} — Teoría`,
              'pt-BR': `Lição ${lessonId} — Teoria`,
              vi: `Bài ${lessonId} — Lý thuyết`,
              id: `Pelajaran ${lessonId} — Teori`,
              tr: `Ders ${lessonId} — Teori`,
              pl: `Lekcja ${lessonId} — Teoria`,
            })}
          </Text>
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '700' }} numberOfLines={1}>
            {isFrenchTarget
              ? (frenchTheoryGateCopy?.title ?? frenchTheoryTitle ?? unavailableTheoryTitle)
              : theory
              ? theoryTitleForLang(lessonId, theory, lang, theoryTitleEs)
              : unavailableTheoryTitle}
          </Text>
          <Text style={{ color: sx.muted, fontSize: f.caption, marginTop: 2 }} numberOfLines={1}>
            {triLang(lang, {
              uk: 'Коротко: правило + приклади + 25 XP',
              ru: 'Правило, примеры и +25 XP в конце',
              es: 'Resumen: regla + ejemplos + 25 XP',
              'pt-BR': 'Resumo: regra + exemplos + 25 XP',
              vi: 'Tóm tắt: quy tắc + ví dụ + 25 XP',
              id: 'Ringkas: aturan + contoh + 25 XP',
              tr: 'Kısa özet: kural + örnekler + 25 XP',
              pl: 'Krótko: zasada + przykłady + 25 XP',
            })}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        decelerationRate="normal"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={true}
      >
        {showSpanishTheoryNotice ? (
          <Warn
            t={t}
            f={f}
            text="La teoría detallada está, por ahora, solo en ruso o en ucraniano; los ejemplos en inglés no cambian. Poco a poco añadiremos estas explicaciones también en español."
          />
        ) : null}
        {isFrenchTarget && frenchTheoryGateCopy ? (
          <Body
            key="french-theory-source-gate"
            t={t}
            f={f}
            text={frenchTheoryGateCopy.body}
          />
        ) : isFrenchTarget && frenchTheoryScreens?.length ? (
          renderFrenchTheoryFromIntroScreens(frenchTheoryScreens, t, lang, f)
        ) : isFrenchTarget ? (
          <Body
            key="unavailable"
            t={t}
            f={f}
            text={unavailableTheoryText}
          />
        ) : plannedTheoryScreens?.length ? (
          renderFrenchTheoryFromIntroScreens(plannedTheoryScreens, t, lang, f)
        ) : plannedLocale ? (
          <Body
            key="planned-locale-theory-unavailable"
            t={t}
            f={f}
            text={unavailableTheoryText}
          />
        ) : theory ? (
          renderSpanishTheory ? theory.renderES!(t, f) : theory.render(t, renderLegacyAsUk, f)
        ) : (
          <Body
            key="unavailable"
            t={t}
            f={f}
            text={unavailableTheoryText}
          />
        )}

        <ReportErrorButton
          screen="theory"
          dataId={`theory_lesson_${lessonId}`}
          dataText={`Теория урока ${lessonId}`}
          style={{ alignSelf: 'flex-end', marginTop: 16 }}
        />

        {/* XP reward button at the bottom of theory */}
        {canClaimTheoryXp ? (
        <View style={{ marginTop: 32, marginBottom: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleClaimXP}
            disabled={xpClaimed}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: xpClaimed ? t.border : '#F5A623',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 28,
              gap: 8,
              opacity: xpClaimed ? 0.6 : 1,
            }}
          >
            <Ionicons name={xpClaimed ? 'checkmark-circle' : 'star'} size={22} color="#fff" />
            <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>
              {xpClaimed
                ? triLang(lang, {
                    uk: `XP отримано (+${earnedXP})`,
                    ru: `Готово — +${earnedXP} XP`,
                    es: `Has obtenido +${earnedXP} XP`,
                    'pt-BR': `Você ganhou +${earnedXP} XP`,
                    vi: `Đã nhận +${earnedXP} XP`,
                    id: `Mendapat +${earnedXP} XP`,
                    tr: `+${earnedXP} XP alındı`,
                    pl: `Otrzymano +${earnedXP} XP`,
                  })
                : triLang(lang, {
                    uk: `Отримати ${previewXP} XP`,
                    ru: `Забрать ${previewXP} XP`,
                    es: `Reclamar ${previewXP} XP`,
                    'pt-BR': `Resgatar ${previewXP} XP`,
                    vi: `Nhận ${previewXP} XP`,
                    id: `Klaim ${previewXP} XP`,
                    tr: `${previewXP} XP al`,
                    pl: `Odbierz ${previewXP} XP`,
                  })}
            </Text>
          </TouchableOpacity>
          {xpShown && (
            <Animated.View style={{
              marginTop: 10,
              opacity: xpAnim,
              transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}>
            <XpGainBadge amount={earnedXP} visible={xpShown} style={{ color: '#F5A623', fontSize: f.h2, fontWeight: '700' }} />
          </Animated.View>
          )}
        </View>
        ) : null}
      </ScrollView>
    </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
