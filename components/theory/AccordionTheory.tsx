import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { useStudyTarget } from '../StudyTargetContext';
import { triLang } from '../../constants/i18n';
import TapScale from '../TapScale';
import DuoPressable from '../DuoPressable';
import ScreenGradient from '../ScreenGradient';
import ReportErrorButton from '../ReportErrorButton';
import BouncyScrollView from '../BouncyScrollView';

import {
  RichIntroLineView,
  KIND_MAP,
  KIND_BY_INDEX,
  defaultKindTitle,
  richKindToLegacyKind,
  richTitle,
  richSubtitle,
  richIntroLines,
  lessonLevelLabel,
  levelColor,
} from '../../app/lesson_intro_rich';
import { getTopicAccent } from '../../app/theory_topic_accents';
import type {
  LessonIntroScreen,
  LessonIntroBlockKind,
  IntroInteraction,
} from '../../app/lesson_data_types';

import WordBankBuilder from './WordBankBuilder';
import ThreeTileChoice from './ThreeTileChoice';
import SpotTheSlip from './SpotTheSlip';
import BinaryRecognition from './BinaryRecognition';

interface Props {
  introScreens: LessonIntroScreen[];
  lessonId: number;
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * AccordionTheory — новый рендер-путь раздела «Теория» в виде аккордеонов.
 *
 * Тёплый тон на «ты», аудитория 40+/50+:
 * - первый блок открыт сразу, остальные раскрываются по тапу на заголовок;
 * - оглавление-чипы сверху прыгают к нужному блоку;
 * - CTA «Начать урок» всегда видна (не нужно раскрывать все блоки);
 * - tap-зоны ≥48dp, без drag, без модалок, без «коврика» по всему экрану.
 */
export default function AccordionTheory({
  introScreens,
  lessonId,
  onComplete,
  onBack,
}: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useSafeAreaInsets();

  const total = introScreens.length;

  // Какие аккордеоны раскрыты. Первый (index 0) открыт по умолчанию.
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set<number>(total > 0 ? [0] : []));

  const scrollRef = useRef<ScrollView | null>(null);
  const blockYRef = useRef<Record<number, number>>({});

  const handleBlockLayout = useCallback((index: number, y: number) => {
    blockYRef.current[index] = y;
  }, []);

  const scrollToBlock = useCallback((index: number) => {
    const y = blockYRef.current[index];
    if (y === undefined || !scrollRef.current) return;
    scrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }, []);

  const toggleAccordion = useCallback(
    (index: number) => {
      setOpenSet((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    },
    [],
  );

  const openAndScroll = useCallback(
    (index: number) => {
      setOpenSet((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      // Ждём раскрытия/перерасчёта layout, затем скроллим к блоку.
      setTimeout(() => scrollToBlock(index), 80);
    },
    [scrollToBlock],
  );

  // --- Локализованные подписи ---
  const lessonWord = triLang(lang, {
    ru: 'Урок',
    uk: 'Урок',
    es: 'Lección',
    'pt-BR': 'Lição',
    vi: 'Bài',
    id: 'Pelajaran',
    tr: 'Ders',
    pl: 'Lekcja',
  });
  const startLabel = triLang(lang, {
    ru: 'Начать урок',
    uk: 'Почати урок',
    es: 'Empezar la lección',
    'pt-BR': 'Começar a lição',
    vi: 'Bắt đầu bài học',
    id: 'Mulai pelajaran',
    tr: 'Derse başla',
    pl: 'Rozpocznij lekcję',
  });
  const backLabel = triLang(lang, {
    ru: 'Назад',
    uk: 'Назад',
    es: 'Volver',
    'pt-BR': 'Voltar',
    vi: 'Quay lại',
    id: 'Kembali',
    tr: 'Geri',
    pl: 'Wstecz',
  });
  const stepLabel = (current: number): string =>
    triLang(lang, {
      ru: `Шаг ${current} из ${total}`,
      uk: `Крок ${current} з ${total}`,
      es: `Paso ${current} de ${total}`,
      'pt-BR': `Passo ${current} de ${total}`,
      vi: `Bước ${current} / ${total}`,
      id: `Langkah ${current} dari ${total}`,
      tr: `Adım ${current} / ${total}`,
      pl: `Krok ${current} z ${total}`,
    });

  // Тема (topic-accent) урока: явный из первого экрана → реестр по lessonId → дефолт.
  const topic = useMemo(
    () => getTopicAccent(lessonId, introScreens[0]?.topicAccent),
    [lessonId, introScreens],
  );

  // Заголовок/подзаголовок темы — из первого экрана.
  const firstScreen = introScreens[0];
  const topicTitle = firstScreen ? richTitle(firstScreen, lang, studyTarget) : undefined;
  const topicSubtitle = firstScreen ? richSubtitle(firstScreen, lang, studyTarget) : undefined;

  const lvlLabel = lessonLevelLabel(lessonId);
  const lvlColor = levelColor(lessonId, false);
  const headerLabel = `${lessonWord} ${lessonId}`;

  const openedCount = openSet.size;
  const progressFraction = total > 0 ? Math.min(openedCount, total) / total : 0;

  const handleStart = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const handleBack = useCallback(() => {
    (onBack ?? onComplete)();
  }, [onBack, onComplete]);

  if (total === 0) return null;

  // theme-объект для интерактивных компонентов.
  const interactionTheme = {
    textPrimary: t.textPrimary,
    textMuted: t.textMuted,
    correct: t.correct,
    wrong: t.wrong,
    bgCard: t.bgCard,
  };

  const renderInteraction = (interaction: IntroInteraction, accent: string) => {
    switch (interaction.kind) {
      case 'word_bank':
        return (
          <WordBankBuilder data={interaction} lang={lang} accent={accent} theme={interactionTheme} />
        );
      case 'choice':
        return (
          <ThreeTileChoice data={interaction} lang={lang} accent={accent} theme={interactionTheme} />
        );
      case 'spot_slip':
        return <SpotTheSlip data={interaction} lang={lang} theme={interactionTheme} />;
      case 'binary':
        return <BinaryRecognition data={interaction} lang={lang} theme={interactionTheme} />;
      default:
        return null;
    }
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {/* Sticky-шапка: назад + pill + флажок «сообщить об ошибке» */}
        <View style={styles.header}>
          <TapScale
            testID="accordion-theory-back"
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={handleBack}
            hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
            style={[
              styles.iconBtn,
              { backgroundColor: t.bgCard, borderColor: t.borderHighlight },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={t.textMuted} />
          </TapScale>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.headerPill,
                { backgroundColor: t.bgCard, borderColor: t.borderHighlight },
              ]}
            >
              <Text
                style={[styles.headerText, { color: t.textPrimary, fontSize: f.caption }]}
              >
                {headerLabel}
              </Text>
              <View style={[styles.headerDot, { backgroundColor: t.textMuted }]} />
              <Text
                style={[styles.headerText, { color: lvlColor, fontSize: f.caption }]}
              >
                {lvlLabel}
              </Text>
            </View>

            <ReportErrorButton
              variant="icon-flag"
              screen="lesson_intro"
              dataId={`lesson_intro_${lessonId}_accordion`}
              dataText={topicTitle}
              accessibilityLabel="Сообщить об ошибке в объяснении"
              testID="accordion-theory-report"
              style={[
                styles.reportFlag,
                { backgroundColor: t.bgCard, borderColor: t.borderHighlight },
              ]}
            />
          </View>
        </View>

        <BouncyScrollView
          ref={scrollRef}
          decelerationRate="normal"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 28 + insets.bottom },
          ]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Заголовок темы */}
          {!!topicTitle && (
            <Text style={[styles.topicTitle, { color: t.textPrimary }]}>{topicTitle}</Text>
          )}
          {!!topicSubtitle && (
            <Text style={[styles.topicSubtitle, { color: t.textMuted }]}>{topicSubtitle}</Text>
          )}

          {/* Прогресс: «Шаг X из N» + полоса */}
          <View style={styles.progressBlock}>
            <Text style={[styles.progressText, { color: t.textMuted }]}>
              {stepLabel(Math.min(openedCount, total))}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: `${t.textMuted}22` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: topic.accent,
                    width: `${Math.round(progressFraction * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Чипы-оглавление */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {introScreens.map((screen, i) => {
              const chipTitle =
                richTitle(screen, lang, studyTarget) ?? `${i + 1}`;
              const isActive = openSet.has(i);
              return (
                <TapScale
                  key={`chip-${i}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={chipTitle}
                  onPress={() => openAndScroll(i)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? topic.accent : t.bgCard,
                      borderColor: isActive ? topic.accent : t.borderHighlight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? '#0F1115' : t.textPrimary, fontSize: f.caption },
                    ]}
                  >
                    {chipTitle}
                  </Text>
                </TapScale>
              );
            })}
          </ScrollView>

          {/* Аккордеоны */}
          {introScreens.map((screen, i) => {
            const expanded = openSet.has(i);
            const kind: LessonIntroBlockKind =
              richKindToLegacyKind(screen.kind) ?? KIND_BY_INDEX[i] ?? 'tip';
            const km = KIND_MAP[kind];
            const accent = topic.accent;
            const kindLabel = defaultKindTitle(km, lang, studyTarget);
            const accTitle = richTitle(screen, lang, studyTarget) ?? kindLabel;
            const subtitle = richSubtitle(screen, lang, studyTarget);
            const lines = richIntroLines(screen, lang, studyTarget);

            return (
              <View
                key={`acc-${i}`}
                onLayout={(e: LayoutChangeEvent) =>
                  handleBlockLayout(i, e.nativeEvent.layout.y)
                }
                style={[
                  styles.accordion,
                  {
                    backgroundColor: t.bgCard,
                    borderColor: expanded ? `${accent}66` : t.borderHighlight,
                  },
                ]}
              >
                {/* Заголовок аккордеона — единственная зона раскрытия */}
                <TapScale
                  testID={`accordion-theory-head-${i}`}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={accTitle}
                  onPress={() => toggleAccordion(i)}
                  scaleTo={0.98}
                  style={styles.accHead}
                >
                  <View
                    style={[
                      styles.accIcon,
                      { backgroundColor: `${accent}28`, borderColor: `${accent}55` },
                    ]}
                  >
                    <Ionicons name={km.icon} size={18} color={accent} />
                  </View>
                  <View style={styles.accHeadTextWrap}>
                    <Text
                      style={[styles.accKindLabel, { color: accent, fontSize: f.caption }]}
                    >
                      {kindLabel}
                    </Text>
                    <Text
                      style={[styles.accTitle, { color: t.textPrimary, fontSize: f.body }]}
                    >
                      {accTitle}
                    </Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={t.textMuted}
                  />
                </TapScale>

                {/* Тело аккордеона */}
                {expanded && (
                  <View style={styles.accBody}>
                    {!!subtitle && (
                      <Text
                        style={[
                          styles.accSubtitle,
                          {
                            color: t.textMuted,
                            fontSize: f.sub,
                            lineHeight: Math.round(f.sub * 1.45),
                          },
                        ]}
                      >
                        {subtitle}
                      </Text>
                    )}
                    <View style={styles.accLines}>
                      {lines.map((line, li) => (
                        <RichIntroLineView
                          key={`${screen.screenId ?? i}-line-${li}`}
                          line={line}
                          t={t}
                          accent={accent}
                          isLight={false}
                          f={f}
                        />
                      ))}
                    </View>

                    {!!screen.interaction && renderInteraction(screen.interaction, accent)}
                  </View>
                )}
              </View>
            );
          })}

          {/* CTA «Начать урок» — штатная кнопка приложения (DuoPressable), всегда видна */}
          <DuoPressable
            testID="accordion-theory-start"
            accessibilityLabel={startLabel}
            onPress={handleStart}
            gradientColors={[`${t.accent}`, `${t.correct}`]}
            gradientStart={{ x: 0, y: 0 }}
            gradientEnd={{ x: 1, y: 1 }}
            edgeColor={t.correct}
            style={[
              styles.ctaBtn,
              { borderRadius: 18, borderWidth: 1, borderColor: t.borderHighlight },
            ]}
          >
            <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.bodyLg }]}>
              {startLabel}
            </Text>
            <View style={styles.ctaIconWrap}>
              <Ionicons name="arrow-forward" size={18} color={t.correctText} />
            </View>
          </DuoPressable>
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '74%',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  headerText: {
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    opacity: 0.7,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  reportFlag: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    flexGrow: 1,
  },
  topicTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  topicSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 20,
  },
  progressBlock: {
    marginTop: 16,
  },
  progressText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 14,
    paddingRight: 6,
  },
  chip: {
    maxWidth: 200,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 0.5,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  accordion: {
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  accHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
  },
  accIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  accHeadTextWrap: {
    flex: 1,
  },
  accKindLabel: {
    fontWeight: '800',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  accTitle: {
    fontWeight: '700',
  },
  accBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 2,
  },
  accSubtitle: {
    fontWeight: '500',
    marginBottom: 10,
  },
  accLines: {
    gap: 8,
  },
  ctaBtn: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 0.5,
    minHeight: 56,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  ctaIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
