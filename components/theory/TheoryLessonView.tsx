import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, type ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme, getVolumetricShadow } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import ScreenBackButton, { SCREEN_BACK_RESERVED, SCREEN_BACK_SIZE, screenBackTop } from '../v2/ScreenBackButton';

import TapScale from '../TapScale';
import ScreenGradient from '../ScreenGradient';
import ReportErrorButton from '../ReportErrorButton';
import BouncyScrollView from '../BouncyScrollView';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';

import WordBankBuilder from './WordBankBuilder';
import ThreeTileChoice from './ThreeTileChoice';
import SpotTheSlip from './SpotTheSlip';
import BinaryRecognition from './BinaryRecognition';
import { splitTheoryHighlight } from './highlight';
import {
  countCompletedTheoryDrills,
  parseTheorySeenProgress,
  serializeTheorySeenProgress,
  theoryOverallProgressPct,
  type TheoryDrillProgressState,
} from '../../app/theory_progress';
import { noteSwallowedHandler } from '../../app/swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { pluralWithCount } from '../../constants/plural';

/**
 * TheoryLessonView — рендер-движок раздела «Теория» в стиле «дорогой минимализм».
 *
 * Принципы стиля (утверждены владельцем):
 * - Минимализм: без жирных рамок/коробок. Открытый раздел = лёгкая ПОДЛОЖКА, не рамка.
 * - Цвет только для языков: английский = textPrimary, перевод = textMuted.
 * - АКЦЕНТ берётся из активной темы (t.accent), уникален на каждую тему.
 * - Семантика верно/промах = t.correct / t.wrong. Никаких ролевых цветов.
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
  /** Перевод на текущем языке интерфейса (приглушённый), уже разрешённый адаптером. */
  translation: string;
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
  progressStorageKey?: string;
  onBack?: () => void;
  /** Раздел, к которому прокрутить при открытии (теория Learning V2 из эпизода). Основной курс не передаёт. */
  scrollToSection?: string;
  /** id для «Сообщить об ошибке»; по умолчанию `lesson_theory_<урок>` основного курса. */
  reportDataId?: string;
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

// ─── Аккордеон-раздел ────────────────────────────────────────────────────────

interface SectionProps {
  section: TheorySection;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  renderBlock: (block: TheoryBlock, key: string) => React.ReactNode;
}

function AccordionSection({ section, index, total, open, onToggle, renderBlock }: SectionProps) {
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  // зачем: Liquid Glass по learn.html (theory) — разделы это строки внутри одной карточки.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const isLast = index === total - 1;

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
      // зачем (R1 diff learn-059, Макеты: «в приложении «4 примеров», склонение: «4 примера»): число подставлялось в фиксированную форму множественного числа — «1 примеров», «4 примеров», en «1 examples».
      // Теперь форма по числу (constants/plural.ts): ru 1 пример / 4 примера / 5 примеров, uk приклад/приклади/прикладів, pl przykład/przykłady/przykładów, en/es/pt-BR — единственное при 1; vi/id/tr без склонения.
      ? pluralWithCount(lang, section.exampleCount, triLang(lang, {
          ru: { one: 'пример', few: 'примера', many: 'примеров' },
          uk: { one: 'приклад', few: 'приклади', many: 'прикладів' },
          en: { one: 'example', few: 'examples', many: 'examples' },
          es: { one: 'ejemplo', few: 'ejemplos', many: 'ejemplos' },
          'pt-BR': { one: 'exemplo', few: 'exemplos', many: 'exemplos' },
          vi: { one: 'ví dụ', few: 'ví dụ', many: 'ví dụ' },
          id: { one: 'contoh', few: 'contoh', many: 'contoh' },
          tr: { one: 'örnek', few: 'örnek', many: 'örnek' },
          pl: { one: 'przykład', few: 'przykłady', many: 'przykładów' },
        }))
      : '';

  return (
    <View
      style={[
        styles.section,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth /* shadow-ok: разделитель-линия между разделами внутри групповой плашки */, borderBottomColor: glass.dividerTone },
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
        {/* зачем (ловушка TapScale 10.10): стиль идёт на внешний Pressable, а дети лежат в обёртке анимации, поэтому row/gap здесь
            не действовали — номер, заголовок и шеврон вставали столбиком. Строка раскладки — во внутреннем View. */}
        <View style={styles.sectionHeaderRow}>
          <Text
            style={[
              styles.sectionNum,
              { color: open ? glass.text : glass.mutedText },
            ]}
          >
            {section.num}
          </Text>
          <View style={styles.sectionHeadText}>
            <Text style={[styles.sectionTitle, { color: glass.text }]}>
              {section.title}
            </Text>
            {!!metaText && (
              <Text style={[styles.sectionMeta, { color: glass.secondary }]}>{metaText}</Text>
            )}
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={20} color={glass.secondary} />
          </Animated.View>
        </View>
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
  title,
  subtitle,
  sections,
  progressStorageKey,
  onBack,
  scrollToSection,
  reportDataId,
}: Props) {
  const { theme: t, themeMode, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  // зачем: акцент = светлая кнопка макета (glass.cta), а не цвет темы приложения.
  const accent = glass.cta;
  const seenHydratedRef = useRef(false);
  // зачем (владелец 22.10: теория Learning V2 = 1:1 этот экран): из эпизода экран открывается на разделе текущей главы —
  // прокручиваем к нему один раз, когда известны координаты карточки разделов и строки раздела.
  const scrollRef = useRef<ScrollView>(null);
  const wrapYRef = useRef<number | null>(null);
  const sectionYRef = useRef<number | null>(null);
  const scrolledRef = useRef(false);
  const tryScrollToSection = useCallback(() => {
    if (!scrollToSection || scrolledRef.current || wrapYRef.current === null || sectionYRef.current === null) return;
    scrolledRef.current = true;
    const y = Math.max(0, wrapYRef.current + sectionYRef.current - 8);
    scrollRef.current?.scrollTo({ y, animated: false });
    console.log('[V2-THEORY] scroll_to_section', JSON.stringify({ lesson: lessonId, section: scrollToSection, y })); // guard-ok: одна строка на открытие
  }, [lessonId, scrollToSection]);

  const sectionNums = useMemo(() => sections.map((section) => section.num), [sections]);
  const sectionNumsKey = sectionNums.join('|');
  const initialOpenNums = useMemo(
    () => sections.filter((section, index) => section.defaultOpen ?? index < 2).map((section) => section.num),
    [sections],
  );
  const initialOpenKey = initialOpenNums.join('|');
  const drillIds = useMemo(() => {
    const ids: string[] = [];
    sections.forEach((section) => {
      section.blocks.forEach((block, index) => {
        if (block.kind === 'drill' && block.drill) ids.push(`${section.num}-${index}`);
      });
    });
    return ids;
  }, [sections]);
  const drillIdsKey = drillIds.join('|');

  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set(initialOpenNums));
  const [seenSet, setSeenSet] = useState<Set<string>>(() => new Set(initialOpenNums));
  const [drillProgress, setDrillProgress] = useState<Record<string, TheoryDrillProgressState>>({});

  const toggleSection = useCallback((num: string) => {
    const willOpen = !openSet.has(num);
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
    if (willOpen) {
      setSeenSet((prev) => {
        if (prev.has(num)) return prev;
        const next = new Set(prev);
        next.add(num);
        return next;
      });
    }
  }, [openSet]);

  useEffect(() => {
    const defaultOpenSet = new Set(initialOpenKey ? initialOpenKey.split('|') : []);
    setOpenSet(defaultOpenSet);
    setSeenSet(defaultOpenSet);
    setDrillProgress({});
    seenHydratedRef.current = false;

    let cancelled = false;
    if (!progressStorageKey) {
      seenHydratedRef.current = true;
      return () => { cancelled = true; };
    }

    AsyncStorage.getItem(progressStorageKey)
      .then((raw) => {
        if (cancelled) return;
        const saved = parseTheorySeenProgress(
          raw,
          sectionNumsKey ? sectionNumsKey.split('|') : [],
          drillIdsKey ? drillIdsKey.split('|') : [],
        );
        if (saved.open.length > 0) {
          setOpenSet(new Set(saved.open));
        }
        setSeenSet(new Set([...defaultOpenSet, ...saved.seen]));
        setDrillProgress(saved.drills);
      })
      .catch(() => {
        if (!cancelled) setSeenSet(new Set(defaultOpenSet));
      })
      .finally(() => {
        if (!cancelled) seenHydratedRef.current = true;
      });

    return () => { cancelled = true; };
  }, [lessonId, progressStorageKey, sectionNumsKey, initialOpenKey, drillIdsKey]);

  const seenKey = useMemo(() => Array.from(seenSet).sort().join('|'), [seenSet]);
  const openKey = useMemo(() => Array.from(openSet).sort().join('|'), [openSet]);
  const drillProgressKey = useMemo(
    () => JSON.stringify(Object.keys(drillProgress).sort().map((id) => [id, drillProgress[id]])),
    [drillProgress],
  );
  useEffect(() => {
    if (!progressStorageKey || !seenHydratedRef.current) return;
    AsyncStorage.setItem(
      progressStorageKey,
      serializeTheorySeenProgress(seenSet, sections.length, openSet, drillProgress, drillIds.length),
    ).catch(noteSwallowedHandler('TheoryLessonView:useEffect.setItem'));
  }, [
    progressStorageKey,
    seenKey,
    openKey,
    drillProgressKey,
    seenSet,
    openSet,
    sections.length,
    drillProgress,
    drillIds.length,
  ]);

  const updateDrillProgress = useCallback((drillId: string, state: TheoryDrillProgressState) => {
    setDrillProgress((prev) => ({
      ...prev,
      [drillId]: {
        ...(prev[drillId] ?? {}),
        ...state,
      },
    }));
  }, []);

  const seenCount = sections.reduce((acc, section) => acc + (seenSet.has(section.num) ? 1 : 0), 0);
  const completedDrillCount = useMemo(
    () => countCompletedTheoryDrills(drillProgress, drillIds),
    [drillProgress, drillIds],
  );
  const progress = theoryOverallProgressPct(seenCount, sections.length, completedDrillCount, drillIds.length) / 100;
  // Тема для интерактивов (общая форма для всех четырёх).
  // зачем: чипы/слоты дриллов были захардкожены белыми альфами, а текст на
  // заливках correct/accent — тёмным #0F1115 «под тёмные темы». На sagePorcelain
  // чипы пропадали на светлом t.bgSurface, а на тёмно-зелёных заливках текст
  // становился тёмным-по-тёмному. Токены считаются здесь один раз на все дриллы.
  const drillTheme = useMemo(
    () => ({
      textPrimary: glass.text,
      textMuted: glass.secondary,
      correct: t.correct,
      wrong: t.wrong,
      bgCard: glass.opaqueCard,
      // зачем: чипы дриллов = непрозрачные плашки макета (.opt), а не белые альфы.
      chipBg: glass.opaqueControl,
      chipBgStrong: glass.selected,
      chipBgFaint: glass.line,
      onAccentText: glass.ctaInk,
    }),
    [glass, t.correct, t.wrong],
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
                initialProgress={drillProgress[key]}
                onProgressChange={(state) => updateDrillProgress(key, { type: drill.type, ...state })}
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
                initialProgress={drillProgress[key]}
                onProgressChange={(state) => updateDrillProgress(key, { type: drill.type, ...state })}
              />
            );
          case 'spot_slip':
            return (
              <SpotTheSlip
                key={key}
                data={data}
                lang={lang}
                theme={drillTheme}
                initialProgress={drillProgress[key]}
                onProgressChange={(state) => updateDrillProgress(key, { type: drill.type, ...state })}
              />
            );
          case 'binary':
            return (
              <BinaryRecognition
                key={key}
                data={data}
                lang={lang}
                theme={drillTheme}
                initialProgress={drillProgress[key]}
                onProgressChange={(state) => updateDrillProgress(key, { type: drill.type, ...state })}
              />
            );
          default:
            return null;
        }
      } catch (error) {
        // Нестыковка данных интерактива не должна ронять экран теории — но причина пишется в журнал.
        console.warn('[THEORY] drill_render_failed', JSON.stringify({ lesson: lessonId, drill: key, type: drill.type, error: String(error) })); // guard-ok: ранний выход рендера
        return null;
      }
    },
    [lang, accent, drillTheme, themeMode, drillProgress, updateDrillProgress, lessonId],
  );

  // ─── Рендер блока ─────────────────────────────────────────────────────────
  const renderBlock = useCallback(
    (block: TheoryBlock, key: string): React.ReactNode => {
      switch (block.kind) {
        case 'body':
        case 'note':
          if (!block.text) return null;
          return (
            <Text key={key} style={[styles.bodyText, { color: glass.secondary }]}>
              {block.text}
            </Text>
          );

        case 'tip':
          if (!block.text) return null;
          return (
            <View
              key={key}
              style={[styles.tipBox, { backgroundColor: glass.selected }]}
            >
              <Text style={[styles.bodyText, { color: glass.text }]}>{block.text}</Text>
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
                    <View
                      style={[
                        styles.formulaChip,
                        { backgroundColor: isAccent ? glass.cta : glass.opaqueControl },
                      ]}
                    >
                      <Text
                        style={[
                          styles.formulaPart,
                          { color: isAccent ? glass.ctaInk : glass.text },
                        ]}
                      >
                        {text}
                      </Text>
                    </View>
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
                const [before, match, after] = splitTheoryHighlight(ex.en, ex.hi);
                return (
                  <View
                    key={`${key}-e${i}`}
                    style={[
                      styles.exampleRow,
                      i > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth, // shadow-ok: разделитель-линия между примерами
                        borderTopColor: glass.dividerTone,
                      },
                    ]}
                  >
                    <Text style={[styles.exampleEn, { color: glass.text }]}>
                      {before}
                      {!!match && (
                        <Text style={{ color: glass.text, fontWeight: '800' }}>{match}</Text>
                      )}
                      {after}
                    </Text>
                    <Text style={[styles.exampleTranslation, { color: glass.secondary }]}>{ex.translation}</Text>
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
                      { color: t.wrong, textDecorationLine: 'line-through' },
                    ]}
                  >
                    {fx.wrong}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={glass.secondary}
                    style={styles.fixArrow}
                  />
                  <Text style={[styles.fixRight, { color: t.correct }]}>{fx.right}</Text>
                </View>
              ))}
            </View>
          );
        }

        case 'drill': {
          if (!block.drill) return null;
          const drillId = key;
          return (
            <View
              key={key}
              style={[styles.drillWrap, { backgroundColor: glass.dividerTone, boxShadow: nestedBoxShadow(glass) }]}
            >
              {renderDrill(block.drill, drillId)}
            </View>
          );
        }

        default:
          return null;
      }
    },
    [t, glass, renderDrill],
  );

  const progressLabel = triLang(lang, {
    ru: `Просмотрено ${seenCount} из ${sections.length}`,
    uk: `Переглянуто ${seenCount} з ${sections.length}`,
    en: `Viewed ${seenCount} of ${sections.length}`,
    es: `Visto ${seenCount} de ${sections.length}`,
    'pt-BR': `Visto ${seenCount} de ${sections.length}`,
    vi: `Đã xem ${seenCount} trên ${sections.length}`,
    id: `Dilihat ${seenCount} dari ${sections.length}`,
    tr: `${seenCount}/${sections.length} görüntülendi`,
    pl: `Obejrzano ${seenCount} z ${sections.length}`,
  });

  const theoryProgressLabel = drillIds.length > 0
    ? triLang(lang, {
        ru: `Разделы ${seenCount}/${sections.length} · задания ${completedDrillCount}/${drillIds.length}`,
        uk: `Розділи ${seenCount}/${sections.length} · завдання ${completedDrillCount}/${drillIds.length}`,
        en: `Sections ${seenCount}/${sections.length} · drills ${completedDrillCount}/${drillIds.length}`,
        es: `Secciones ${seenCount}/${sections.length} · prácticas ${completedDrillCount}/${drillIds.length}`,
        'pt-BR': `Seções ${seenCount}/${sections.length} · práticas ${completedDrillCount}/${drillIds.length}`,
        vi: `Phần ${seenCount}/${sections.length} · bài luyện ${completedDrillCount}/${drillIds.length}`,
        id: `Bagian ${seenCount}/${sections.length} · latihan ${completedDrillCount}/${drillIds.length}`,
        tr: `Bölümler ${seenCount}/${sections.length} · alıştırmalar ${completedDrillCount}/${drillIds.length}`,
        pl: `Sekcje ${seenCount}/${sections.length} · ćwiczenia ${completedDrillCount}/${drillIds.length}`,
      })
    : progressLabel;

  const levelTag = triLang(lang, {
    ru: `Урок ${lessonId} · A1`,
    uk: `Урок ${lessonId} · A1`,
    en: `Lesson ${lessonId} · A1`,
    es: `Lección ${lessonId} · A1`,
    'pt-BR': `Lição ${lessonId} · A1`,
    vi: `Bài ${lessonId} · A1`,
    id: `Pelajaran ${lessonId} · A1`,
    tr: `Ders ${lessonId} · A1`,
    pl: `Lekcja ${lessonId} · A1`,
  });

  const progressPct = Math.round(progress * 100);

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: экран теории edge-to-edge, общий «назад», разделы без колонки номера — ослабить только по слову владельца
  // (сторож tests/theory_sheet_1to1_2026_10_22.test.ts, реестр docs/work/OWNER_LOCKS.md).
  // зачем (владелец 22.10, на снимок теории: «В ТЕОРИИ РАМКИ НА ВСЮ ШИРИНУ ЭКРАНА!!! ВОТ ТАКОГО РАЗДЕЛЕНИЯ НЕ ДОЛЖНО БЫТЬ,
  // ЧТО ВВЕРХУ ЦВЕТ ДРУГОЙ И ТАК ОБРЕЗАНО! И ТЕОРИЯ ОТЦЕНТРИРОВАНА»): экран edge-to-edge на одном фоне до часов — без SafeAreaView
  // со своим фоном и без шапки-полосы, о которую резался контент. Строка «Урок N · A1» и флажок — первая строка прокрутки,
  // «назад» — общий ScreenBackButton (одно место на всех экранах). Один вид для основного курса и Learning V2.
  const headerTop = screenBackTop(insets.top);

  return (
    <ScreenGradient>
      <View style={styles.root}>
        <BouncyScrollView ref={scrollRef} decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: headerTop, paddingBottom: 24 + bottomInset },
          ]}
        >
          {/* Шапка: «Урок N · A1» по центру между «назад» и флажком (поля равные — SCREEN_BACK_RESERVED с обеих сторон) */}
          <View style={styles.topBar}>
            <Text style={[styles.topTitle, { color: glass.text }]} numberOfLines={1}>{levelTag}</Text>
            <View style={styles.flagBtn}>
              <ReportErrorButton
                variant="icon-flag"
                screen="lesson_theory"
                dataId={reportDataId ?? `lesson_theory_${lessonId}`}
                dataText={title}
              />
            </View>
          </View>

          {/* Hero: 30/36 700 + подзаголовок 16 */}
          <Text style={[styles.heroTitle, { color: glass.text }]}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.heroSub, { color: glass.secondary }]}>{subtitle}</Text>
          )}

          {/* Прогресс: подпись слева, процент справа, дорожка 6 */}
          <View style={styles.progressWrap}>
            <View style={styles.progressHead}>
              <Text style={[styles.progressLabel, { color: glass.secondary }]}>{theoryProgressLabel}</Text>
              <Text style={[styles.progressLabel, { color: glass.secondary }]}>{`${progressPct}%`}</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: glass.line }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: glass.accentGraphic, width: `${progressPct}%` },
                ]}
              />
            </View>
          </View>

          {/* Разделы: строки внутри одной карточки на всю ширину (поля экрана 20) */}
          <View
            style={[
              styles.sectionsWrap,
              { backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) },
            ]}
            onLayout={scrollToSection ? (e) => { wrapYRef.current = e.nativeEvent.layout.y; tryScrollToSection(); } : undefined}
          >
            {sections.map((section, i) => (
              <View
                key={section.num}
                onLayout={scrollToSection === section.num ? (e) => { sectionYRef.current = e.nativeEvent.layout.y; tryScrollToSection(); } : undefined}
              >
                <AccordionSection
                  section={section}
                  index={i}
                  total={sections.length}
                  open={openSet.has(section.num)}
                  onToggle={() => toggleSection(section.num)}
                  renderBlock={renderBlock}
                />
              </View>
            ))}
          </View>

        </BouncyScrollView>
        <ScreenBackButton
          screen={`lesson_theory_${lessonId}`}
          onPress={onBack}
          accessibilityLabel={triLang(lang, {
            ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás',
            'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
          })}
        />
      </View>
    </ScreenGradient>
  );
}

// ─── Стили ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Шапка
  // строка шапки высотой с круг «назад» (48) на его уровне; заголовок по центру, слева и справа равные поля под кнопки
  topBar: {
    height: SCREEN_BACK_SIZE,
    justifyContent: 'center',
    paddingHorizontal: SCREEN_BACK_RESERVED - 20,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: SCREEN_BACK_SIZE,
    height: SCREEN_BACK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // кегль общего заголовка шапки (PracticeHeaderTitle 20/26 700), но по центру
  topTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Скролл
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Hero (learn.html: 30/36 700, подзаголовок 16)
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.4,
    marginTop: 14,
  },
  heroSub: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 6,
  },

  // Прогресс (.thprog)
  progressWrap: {
    marginTop: 18,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  // Разделы: одна карточка, строки с разделителем 1 px (.card.acc)
  sectionsWrap: {
    marginTop: 22,
    borderRadius: 20,
    paddingHorizontal: 16,
    // зачем («Тень» 12.10): без overflow hidden — он режет тень групповой плашки; строки внутри клипа не требуют
  },
  section: {},
  sectionHeader: {
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 60,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // без колонки фиксированной ширины (владелец 22.10): номер стоит перед заголовком, тело раздела не сдвигается вправо
  sectionNum: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionHeadText: {
    flex: 1,
    paddingRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
  sectionMeta: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionBody: {
    paddingLeft: 4,
    paddingRight: 4,
    paddingBottom: 18,
    paddingTop: 2,
    gap: 14,
  },

  // body / note / tip
  bodyText: {
    fontSize: 16,
    lineHeight: 23,
  },
  tipBox: {
    padding: 14,
    borderRadius: 14,
  },

  // formula
  formulaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  formulaChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  formulaPart: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
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
    paddingVertical: 8,
  },
  exampleEn: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 26,
    flexShrink: 1,
    paddingRight: 10,
  },
  exampleTranslation: {
    fontSize: 16,
    lineHeight: 26,
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
    fontSize: 16,
    lineHeight: 23,
  },
  fixArrow: {
    marginHorizontal: 8,
  },
  fixRight: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    flexShrink: 1,
  },

  // drill
  drillWrap: {
    borderRadius: 16,
    padding: 10,
    marginTop: 2,
  },

});
