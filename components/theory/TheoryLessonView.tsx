import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, getVolumetricShadow } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';

import TapScale from '../TapScale';
import ScreenGradient from '../ScreenGradient';
import ReportErrorButton from '../ReportErrorButton';
import BouncyScrollView from '../BouncyScrollView';

import WordBankBuilder from './WordBankBuilder';
import ThreeTileChoice from './ThreeTileChoice';
import SpotTheSlip from './SpotTheSlip';
import BinaryRecognition from './BinaryRecognition';

/**
 * TheoryLessonView — рендер-движок раздела «Теория» в стиле «дорогой минимализм».
 *
 * Принципы стиля (утверждены владельцем):
 * - Минимализм: без жирных рамок/коробок. Открытый раздел = лёгкая ПОДЛОЖКА, не рамка.
 * - Цвет только для языков: английский = textPrimary, перевод = textMuted.
 * - АКЦЕНТ берётся из активной темы (t.accent), уникален на каждую тему.
 * - Семантика верно/промах = t.correct / t.wrong. Никаких ролевых цветов.
 * - XP-кнопка снизу — золотая (t.gold), с объёмной тенью.
 * - Текст НИКОГДА не обрезается (без numberOfLines/ellipsis).
 */

// ─── Модель данных ───────────────────────────────────────────────────────────

export interface TheoryFormulaPart {
  /** Текст части формулы. */
  text: string;
  /** Подсветить акцентом (am / is / are). */
  accent?: boolean;
}

export interface TheoryExample {
  /** Английская строка. */
  en: string;
  /** Перевод (приглушённый). */
  ru: string;
  /** Подстрока en для подсветки акцентом (напр. 'is'). */
  hi?: string;
}

export interface TheoryFix {
  /** Неверный вариант (зачёркнутый). */
  wrong: string;
  /** Верный вариант. */
  right: string;
}

export type TheoryDrillType = 'choice' | 'word_bank' | 'spot_slip' | 'binary';

export interface TheoryDrill {
  type: TheoryDrillType;
  // Данные интерактива (структура соответствует Intro*Interaction). Слабая
  // типизация намеренна: рендер защищён, нестыковка данных не роняет экран.
  [key: string]: unknown;
}

export interface TheoryBlock {
  kind: 'body' | 'formula' | 'examples' | 'fix' | 'tip' | 'note' | 'drill';
  /** body / tip / note. */
  text?: string;
  /** formula: массив частей; среднее (am/is/are) красится accent. */
  formula?: Array<string | TheoryFormulaPart>;
  /** examples. */
  examples?: TheoryExample[];
  /** fix. */
  fixes?: TheoryFix[];
  /** drill: готовый интерактив. */
  drill?: TheoryDrill;
}

export interface TheorySection {
  /** '01', '02'… */
  num: string;
  title: string;
  /** Для меты «N примеров». */
  exampleCount?: number;
  defaultOpen?: boolean;
  blocks: TheoryBlock[];
}

export interface TheoryMetrics {
  sections: number;
  examples: number;
  drills: number;
}

interface Props {
  lessonId: number;
  /** «Грамматика». */
  kicker?: string;
  /** «To Be: am, is, are». */
  title: string;
  subtitle?: string;
  sections: TheorySection[];
  metrics?: TheoryMetrics;
  /** Награда за прохождение, по умолчанию 25. */
  xpAmount?: number;
  onClaimXP?: () => void;
  onBack?: () => void;
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/** Цвет с альфой: '#RRGGBB' + 2 hex (или rgba(...) → как есть). */
function withAlpha(color: string, alphaHex: string): string {
  if (typeof color === 'string' && color.startsWith('#') && color.length === 7) {
    return `${color}${alphaHex}`;
  }
  // rgba / именованные — возвращаем без изменений (подложка получит свой fallback).
  return color;
}

/**
 * Разбивает en по подстроке hi (первое вхождение, без регистрозависимости),
 * возвращает [до, совпадение, после]. Если hi не найдена — вся строка в [0].
 */
function splitHighlight(en: string, hi?: string): [string, string, string] {
  if (!hi) return [en, '', ''];
  const idx = en.toLowerCase().indexOf(hi.toLowerCase());
  if (idx < 0) return [en, '', ''];
  return [en.slice(0, idx), en.slice(idx, idx + hi.length), en.slice(idx + hi.length)];
}

// ─── Аккордеон-раздел ────────────────────────────────────────────────────────

interface SectionProps {
  section: TheorySection;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  renderBlock: (block: TheoryBlock, key: string) => React.ReactNode;
}

function AccordionSection({ section, open, onToggle, renderBlock }: SectionProps) {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const accent = t.accent;

  const rotate = useMemo(() => new Animated.Value(open ? 1 : 0), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(() => {
    Animated.timing(rotate, {
      toValue: open ? 0 : 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    onToggle();
  }, [open, onToggle, rotate]);

  const chevronRotate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const metaText =
    typeof section.exampleCount === 'number' && section.exampleCount > 0
      ? triLang(lang, {
          ru: `${section.exampleCount} примеров`,
          uk: `${section.exampleCount} прикладів`,
          es: `${section.exampleCount} ejemplos`,
        })
      : '';

  return (
    <View
      style={[
        styles.section,
        open && { backgroundColor: t.bgCard },
      ]}
    >
      <TapScale
        onPress={handleToggle}
        withHaptic
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={section.title}
        style={styles.sectionHeader}
      >
        <Text
          style={[
            styles.sectionNum,
            { color: open ? accent : t.textMuted },
          ]}
        >
          {section.num}
        </Text>
        <View style={styles.sectionHeadText}>
          <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>
            {section.title}
          </Text>
          {!!metaText && (
            <Text style={[styles.sectionMeta, { color: t.textMuted }]}>{metaText}</Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons name="chevron-down" size={20} color={t.textMuted} />
        </Animated.View>
      </TapScale>

      {open && (
        <View style={styles.sectionBody}>
          {section.blocks.map((block, i) => renderBlock(block, `${section.num}-${i}`))}
        </View>
      )}
    </View>
  );
}

// ─── Главный компонент ───────────────────────────────────────────────────────

export default function TheoryLessonView({
  lessonId,
  kicker,
  title,
  subtitle,
  sections,
  metrics,
  xpAmount = 25,
  onClaimXP,
  onBack,
}: Props) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const accent = t.accent;
  const textOnGold = t.textOnGold ?? '#241A02';

  // Какие разделы открыты. По умолчанию первые два + те, у кого defaultOpen.
  const [openSet, setOpenSet] = useState<Set<string>>(() => {
    const init = new Set<string>();
    sections.forEach((s, i) => {
      if (s.defaultOpen ?? i < 2) init.add(s.num);
    });
    return init;
  });

  const toggleSection = useCallback((num: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }, []);

  // Прогресс: «открытых из всех». Полоса заполняется по доле открытых разделов.
  const openCount = sections.reduce((acc, s) => acc + (openSet.has(s.num) ? 1 : 0), 0);
  const total = sections.length || 1;
  const progress = Math.min(1, openCount / total);

  // Метрики (число разделов / примеров / тренировок).
  const computedMetrics: TheoryMetrics = useMemo(() => {
    if (metrics) return metrics;
    let examples = 0;
    let drills = 0;
    sections.forEach((s) =>
      s.blocks.forEach((b) => {
        if (b.kind === 'examples') examples += b.examples?.length ?? 0;
        if (b.kind === 'drill') drills += 1;
      }),
    );
    return { sections: sections.length, examples, drills };
  }, [metrics, sections]);

  // Тема для интерактивов (общая форма для всех четырёх).
  const drillTheme = useMemo(
    () => ({
      textPrimary: t.textPrimary,
      textMuted: t.textMuted,
      correct: t.correct,
      wrong: t.wrong,
      bgCard: t.bgCard,
    }),
    [t.textPrimary, t.textMuted, t.correct, t.wrong, t.bgCard],
  );

  // ─── Рендер интерактива ───────────────────────────────────────────────────
  const renderDrill = useCallback(
    (drill: TheoryDrill, key: string): React.ReactNode => {
      try {
        const data = drill as unknown as any;
        switch (drill.type) {
          case 'choice':
            return (
              <ThreeTileChoice
                key={key}
                data={data}
                lang={lang}
                accent={accent}
                theme={drillTheme}
                themeMode={themeMode}
              />
            );
          case 'word_bank':
            return (
              <WordBankBuilder
                key={key}
                data={data}
                lang={lang}
                accent={accent}
                theme={drillTheme}
              />
            );
          case 'spot_slip':
            return (
              <SpotTheSlip key={key} data={data} lang={lang} theme={drillTheme} />
            );
          case 'binary':
            return (
              <BinaryRecognition key={key} data={data} lang={lang} theme={drillTheme} />
            );
          default:
            return null;
        }
      } catch {
        // Нестыковка данных интерактива не должна ронять экран теории.
        return null;
      }
    },
    [lang, accent, drillTheme, themeMode],
  );

  // ─── Рендер блока ─────────────────────────────────────────────────────────
  const renderBlock = useCallback(
    (block: TheoryBlock, key: string): React.ReactNode => {
      switch (block.kind) {
        case 'body':
        case 'note':
          if (!block.text) return null;
          return (
            <Text key={key} style={[styles.bodyText, { color: t.textMuted }]}>
              {block.text}
            </Text>
          );

        case 'tip':
          if (!block.text) return null;
          return (
            <View
              key={key}
              style={[styles.tipBox, { backgroundColor: withAlpha(accent, '0F') }]}
            >
              <Text style={[styles.bodyText, { color: t.textPrimary }]}>{block.text}</Text>
            </View>
          );

        case 'formula': {
          const parts = block.formula ?? [];
          if (parts.length === 0) return null;
          return (
            <View key={key} style={styles.formulaRow}>
              {parts.map((part, i) => {
                const text = typeof part === 'string' ? part : part.text;
                // Среднее по умолчанию акцентим (am/is/are), либо явный флаг accent.
                const isAccent =
                  typeof part === 'string'
                    ? i === Math.floor(parts.length / 2) && parts.length > 1
                    : !!part.accent;
                return (
                  <React.Fragment key={`${key}-f${i}`}>
                    {i > 0 && (
                      <Text style={[styles.formulaPlus, { color: t.textMuted }]}>+</Text>
                    )}
                    <Text
                      style={[
                        styles.formulaPart,
                        { color: isAccent ? accent : t.textPrimary },
                        isAccent && styles.formulaPartAccent,
                      ]}
                    >
                      {text}
                    </Text>
                  </React.Fragment>
                );
              })}
            </View>
          );
        }

        case 'examples': {
          const examples = block.examples ?? [];
          if (examples.length === 0) return null;
          return (
            <View key={key} style={styles.examplesWrap}>
              {examples.map((ex, i) => {
                const [before, match, after] = splitHighlight(ex.en, ex.hi);
                return (
                  <View
                    key={`${key}-e${i}`}
                    style={[
                      styles.exampleRow,
                      i < examples.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: withAlpha(t.border, '88'),
                      },
                    ]}
                  >
                    <Text style={[styles.exampleEn, { color: t.textPrimary }]}>
                      {before}
                      {!!match && (
                        <Text style={{ color: accent, fontWeight: '700' }}>{match}</Text>
                      )}
                      {after}
                    </Text>
                    <Text style={[styles.exampleRu, { color: t.textMuted }]}>{ex.ru}</Text>
                  </View>
                );
              })}
            </View>
          );
        }

        case 'fix': {
          const fixes = block.fixes ?? [];
          if (fixes.length === 0) return null;
          return (
            <View key={key} style={styles.fixWrap}>
              {fixes.map((fx, i) => (
                <View key={`${key}-x${i}`} style={styles.fixRow}>
                  <Text
                    style={[
                      styles.fixWrong,
                      { color: t.textMuted, textDecorationLine: 'line-through' },
                    ]}
                  >
                    {fx.wrong}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={t.textMuted}
                    style={styles.fixArrow}
                  />
                  <Text style={[styles.fixRight, { color: t.textPrimary }]}>{fx.right}</Text>
                </View>
              ))}
            </View>
          );
        }

        case 'drill': {
          if (!block.drill) return null;
          return (
            <View key={key} style={[styles.drillWrap, { backgroundColor: t.bgSurface }]}>
              {renderDrill(block.drill, `${key}-drill`)}
            </View>
          );
        }

        default:
          return null;
      }
    },
    [t, accent, renderDrill],
  );

  const kickerText = kicker ?? triLang(lang, { ru: 'Грамматика', uk: 'Граматика', es: 'Gramática' });
  const claimLabel = triLang(lang, {
    ru: `Забрать +${xpAmount} XP`,
    uk: `Забрати +${xpAmount} XP`,
    es: `Recibir +${xpAmount} XP`,
  });

  const metricLabels = {
    sections: triLang(lang, { ru: 'разделов', uk: 'розділів', es: 'secciones' }),
    examples: triLang(lang, { ru: 'примеров', uk: 'прикладів', es: 'ejemplos' }),
    drills: triLang(lang, { ru: 'тренировок', uk: 'тренувань', es: 'prácticas' }),
  };

  const progressLabel = triLang(lang, {
    ru: `Раздел ${openCount} из ${sections.length}`,
    uk: `Розділ ${openCount} з ${sections.length}`,
    es: `Sección ${openCount} de ${sections.length}`,
  });

  const levelTag = triLang(lang, {
    ru: `Урок ${lessonId} · A1`,
    uk: `Урок ${lessonId} · A1`,
    es: `Lección ${lessonId} · A1`,
  });

  return (
    <View style={styles.root}>
      <ScreenGradient />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Шапка */}
        <View style={styles.topBar}>
          <TapScale
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás' })}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
          </TapScale>

          <Text style={[styles.levelTag, { color: t.textMuted }]}>{levelTag}</Text>

          <View style={styles.flagBtn}>
            <ReportErrorButton
              variant="icon-flag"
              screen="lesson_theory"
              dataId={`lesson_theory_${lessonId}`}
              dataText={title}
            />
          </View>
        </View>

        <BouncyScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 120 + insets.bottom },
          ]}
        >
          {/* Hero */}
          <Text style={[styles.kicker, { color: accent }]}>{kickerText.toUpperCase()}</Text>
          <Text style={[styles.heroTitle, { color: t.textPrimary }]}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.heroSub, { color: t.textMuted }]}>{subtitle}</Text>
          )}

          {/* Метрики */}
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={[styles.metricNum, { color: t.textPrimary }]}>
                {computedMetrics.sections}
              </Text>
              <Text style={[styles.metricLabel, { color: t.textMuted }]}>
                {metricLabels.sections}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricNum, { color: t.textPrimary }]}>
                {computedMetrics.examples}
              </Text>
              <Text style={[styles.metricLabel, { color: t.textMuted }]}>
                {metricLabels.examples}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricNum, { color: t.textPrimary }]}>
                {computedMetrics.drills}
              </Text>
              <Text style={[styles.metricLabel, { color: t.textMuted }]}>
                {metricLabels.drills}
              </Text>
            </View>
          </View>

          {/* Прогресс */}
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: withAlpha(t.border, 'AA') }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: accent, width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: t.textMuted }]}>{progressLabel}</Text>
          </View>

          {/* Разделы */}
          <View style={styles.sectionsWrap}>
            {sections.map((section, i) => (
              <AccordionSection
                key={section.num}
                section={section}
                index={i}
                total={sections.length}
                open={openSet.has(section.num)}
                onToggle={() => toggleSection(section.num)}
                renderBlock={renderBlock}
              />
            ))}
          </View>
        </BouncyScrollView>

        {/* XP-кнопка — всегда видна */}
        <View
          style={[
            styles.ctaBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
          pointerEvents="box-none"
        >
          <TapScale
            onPress={onClaimXP}
            accessibilityRole="button"
            accessibilityLabel={claimLabel}
            style={[
              styles.ctaBtn,
              { backgroundColor: t.gold },
              getVolumetricShadow(themeMode, t, 2),
            ]}
          >
            <Ionicons name="star" size={18} color={textOnGold} style={styles.ctaIcon} />
            <Text style={[styles.ctaText, { color: textOnGold }]}>{claimLabel}</Text>
          </TapScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Стили ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  // Шапка
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelTag: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
    flex: 1,
  },

  // Скролл
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Hero
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
  },

  // Метрики
  metricsRow: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 20,
  },
  metric: {
    flex: 1,
  },
  metricNum: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Прогресс
  progressWrap: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 8,
  },

  // Разделы
  sectionsWrap: {
    gap: 4,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  sectionNum: {
    fontSize: 15,
    fontWeight: '700',
    width: 30,
    letterSpacing: 0.5,
  },
  sectionHeadText: {
    flex: 1,
    paddingRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  sectionMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 2,
    gap: 12,
  },

  // body / note / tip
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
  },
  tipBox: {
    padding: 12,
    borderRadius: 12,
  },

  // formula
  formulaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  formulaPart: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  formulaPartAccent: {
    fontWeight: '800',
  },
  formulaPlus: {
    fontSize: 15,
    marginHorizontal: 2,
  },

  // examples
  examplesWrap: {
    marginTop: 2,
  },
  exampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  exampleEn: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    flexShrink: 1,
    paddingRight: 10,
  },
  exampleRu: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    flexShrink: 1,
  },

  // fix
  fixWrap: {
    gap: 8,
  },
  fixRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  fixWrong: {
    fontSize: 15,
    lineHeight: 22,
  },
  fixArrow: {
    marginHorizontal: 8,
  },
  fixRight: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    flexShrink: 1,
  },

  // drill
  drillWrap: {
    borderRadius: 14,
    padding: 6,
    marginTop: 2,
  },

  // XP CTA
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
  },
  ctaIcon: {
    marginRight: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
