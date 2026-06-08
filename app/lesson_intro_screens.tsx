import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  ScrollView,
  Easing,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from '../components/SafeLinearGradient';
import { Ionicons } from '@expo/vector-icons';
import TapScale from '../components/TapScale';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, getVolumetricShadow } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import ScreenGradient from '../components/ScreenGradient';
import TopFadeMask from '../components/TopFadeMask';
import LessonArtBackdrop from '../components/LessonArtBackdrop';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SCALE } from '../constants/motion';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../constants/compassTheme';
import type { IntroLine, IntroTextPart, IntroTextTone, LessonIntroExample, LessonIntroScreen, LessonIntroBlockKind } from './lesson_data_types';
import type { StudyTargetLang } from './study_target_lang_dev';
import { spanishLessonUiStringsActive, spanishStudyActive } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';

type PlannedIntroLang = Extract<Lang, 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl'>;

const PLANNED_INTRO_LANGS = new Set<Lang>(['pt-BR', 'vi', 'id', 'tr', 'pl']);

function isPlannedIntroLang(lang: Lang): lang is PlannedIntroLang {
  return PLANNED_INTRO_LANGS.has(lang);
}

function firstDefined<T>(...values: (T | undefined)[]): T | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

function legacyIntroValue<T>(
  lang: Lang,
  studyTarget: StudyTargetLang,
  ruValue?: T,
  ukValue?: T,
  esValue?: T,
): T | undefined {
  switch (lang) {
    case 'uk':
      return firstDefined(ukValue, ruValue);
  }
  if (spanishLessonUiStringsActive(lang, studyTarget)) return firstDefined(esValue, ruValue);
  return ruValue;
}

/**
 * Разбивает текст на сегменты: обычный текст и английские вставки.
 * Английская вставка — последовательность ASCII-символов (латиница, цифры,
 * пробел, дефис, слэш, апостроф, точка, запятая) длиной ≥2, окружённая
 * не-ASCII символами или границами строки. Односимвольные ASCII (I, a)
 * внутри кириллического текста тоже выделяются если стоят отдельным словом.
 */
function splitEnglish(text: string): { value: string; isEn: boolean }[] {
  // Паттерн: блок ASCII-слов (мин 1 ASCII-буква) отделённый от кириллицы
  const segments: { value: string; isEn: boolean }[] = [];
  // Разбиваем по границам ASCII/не-ASCII
  const re = /([A-Za-z][A-Za-z0-9 '\-\/.,→↔]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ value: text.slice(last, m.index), isEn: false });
    }
    segments.push({ value: m[0], isEn: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ value: text.slice(last), isEn: false });
  }
  return segments;
}

function HighlightedText({
  text,
  style,
  accentColor,
}: {
  text: string;
  style: any;
  accentColor: string;
}) {
  const segments = splitEnglish(text);
  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.isEn ? (
          <Text key={i} style={{ color: accentColor, fontWeight: '600' }}>
            {seg.value}
          </Text>
        ) : (
          <Text key={i}>{seg.value}</Text>
        )
      )}
    </Text>
  );
}

/** В режиме «учим ES» первая строка — испанская цель (trES), не английский мост (en). */
function lessonIntroExampleLines(
  ex: LessonIntroExample,
  lang: Lang,
  studyTarget: StudyTargetLang,
): { primary: string; secondary: string } {
  const primary = spanishStudyActive(studyTarget) && ex.trES ? ex.trES : ex.en;
  const plannedSecondary: Record<PlannedIntroLang, string | undefined> = {
    'pt-BR': ex.trPtBr,
    vi: ex.trVi,
    id: ex.trId,
    tr: ex.trTr,
    pl: ex.trPl,
  };
  let secondary = isPlannedIntroLang(lang)
    ? plannedSecondary[lang]
    : legacyIntroValue(lang, studyTarget, ex.trRU, ex.trUK, ex.trES);
  secondary = secondary ?? primary;
  if (primary === secondary && ex.en !== primary) {
    secondary = ex.en;
  }
  return { primary, secondary };
}

function hasRichIntroLines(screen: LessonIntroScreen): boolean {
  const legacyLineSets = [screen.linesRU, screen.linesUK, screen.linesES];
  return legacyLineSets.some((lines) => !!lines?.length);
}

function richIntroLines(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): IntroLine[] {
  const plannedLines: Record<PlannedIntroLang, IntroLine[] | undefined> = {
    'pt-BR': screen.linesPtBr,
    vi: screen.linesVi,
    id: screen.linesId,
    tr: screen.linesTr,
    pl: screen.linesPl,
  };
  const selected = isPlannedIntroLang(lang)
    ? plannedLines[lang]
    : legacyIntroValue(lang, studyTarget, screen.linesRU, screen.linesUK, screen.linesES);
  return selected ?? [];
}

function richSubtitle(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): string | undefined {
  const plannedSubtitles: Record<PlannedIntroLang, string | undefined> = {
    'pt-BR': screen.subtitlePtBr,
    vi: screen.subtitleVi,
    id: screen.subtitleId,
    tr: screen.subtitleTr,
    pl: screen.subtitlePl,
  };
  return isPlannedIntroLang(lang)
    ? plannedSubtitles[lang]
    : legacyIntroValue(lang, studyTarget, screen.subtitleRU, screen.subtitleUK, screen.subtitleES);
}

function richTitle(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): string | undefined {
  const plannedTitles: Record<PlannedIntroLang, string | undefined> = {
    'pt-BR': screen.titlePtBr,
    vi: screen.titleVi,
    id: screen.titleId,
    tr: screen.titleTr,
    pl: screen.titlePl,
  };
  return isPlannedIntroLang(lang)
    ? plannedTitles[lang]
    : legacyIntroValue(lang, studyTarget, screen.titleRU, screen.titleUK, screen.titleES);
}

function plainIntroText(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): string | undefined {
  const plannedText: Record<PlannedIntroLang, string | undefined> = {
    'pt-BR': screen.textPtBr,
    vi: screen.textVi,
    id: screen.textId,
    tr: screen.textTr,
    pl: screen.textPl,
  };
  return isPlannedIntroLang(lang)
    ? plannedText[lang]
    : legacyIntroValue(lang, studyTarget, screen.textRU, screen.textUK, screen.textES);
}

function richKindToLegacyKind(kind: LessonIntroScreen['kind']): LessonIntroBlockKind {
  if (kind === 'concept') return 'core_idea';
  if (kind === 'formula') return 'main_formula';
  if (kind === 'practice') return 'memory_tip';
  return (kind as LessonIntroBlockKind) ?? 'tip';
}

function isRichExample(ex: LessonIntroExample | any): ex is {
  en: IntroTextPart[];
  ru: string;
  uk: string;
  es: string;
  labelRU?: string;
  labelUK?: string;
  labelES?: string;
  labelPtBr?: string;
  labelVi?: string;
  labelId?: string;
  labelTr?: string;
  labelPl?: string;
  noteRU?: string;
  noteUK?: string;
  noteES?: string;
  notePtBr?: string;
  noteVi?: string;
  noteId?: string;
  noteTr?: string;
  notePl?: string;
} {
  return Array.isArray(ex?.en);
}

function richExampleText(ex: unknown, lang: Lang, studyTarget: StudyTargetLang): string {
  const value = ex as any;
  const plannedText: Record<PlannedIntroLang, string | undefined> = {
    'pt-BR': value['pt-BR'],
    vi: value.vi,
    id: value.id,
    tr: value.tr,
    pl: value.pl,
  };
  return isPlannedIntroLang(lang)
    ? plannedText[lang] ?? ''
    : legacyIntroValue(lang, studyTarget, value.ru, value.uk, value.es) ?? '';
}

function plannedExampleMeta(ex: any, base: 'label' | 'note', lang: Lang): string | undefined {
  const plannedMeta: Record<PlannedIntroLang, string | undefined> = {
    'pt-BR': ex[`${base}PtBr`],
    vi: ex[`${base}Vi`],
    id: ex[`${base}Id`],
    tr: ex[`${base}Tr`],
    pl: ex[`${base}Pl`],
  };
  return isPlannedIntroLang(lang) ? plannedMeta[lang] : undefined;
}

function legacyExampleMeta(
  ex: any,
  base: 'label' | 'note',
  lang: Lang,
  studyTarget: StudyTargetLang,
): string | undefined {
  return legacyIntroValue(
    lang,
    studyTarget,
    ex[`${base}RU`],
    ex[`${base}UK`],
    ex[`${base}ES`],
  );
}

function toneStyle(tone: IntroTextTone | undefined, t: any, accent: string, isLight: boolean) {
  const resolved = tone ?? 'normal';
  const colorByTone: Record<IntroTextTone, string> = {
    normal: t.textPrimary,
    muted: t.textMuted,
    strong: t.textPrimary,
    accent,
    success: t.correct,
    danger: t.wrong,
    warning: t.gold,
    formula: isLight ? '#6D28D9' : '#C4B5FD',
    code: isLight ? '#0369A1' : '#7DD3FC',
  };
  const weightByTone: Record<IntroTextTone, '400' | '600' | '700' | '800'> = {
    normal: '400',
    muted: '400',
    strong: '800',
    accent: '800',
    success: '800',
    danger: '800',
    warning: '700',
    formula: '800',
    code: '700',
  };
  return { color: colorByTone[resolved], fontWeight: weightByTone[resolved] };
}

function RichTextParts({
  parts,
  text,
  t,
  accent,
  isLight,
  style,
}: {
  parts?: IntroTextPart[];
  text?: string;
  t: any;
  accent: string;
  isLight: boolean;
  style: any;
}) {
  const source = parts?.length ? parts : [{ text: text ?? '', tone: 'normal' as IntroTextTone }];
  return (
    <Text style={style}>
      {source.map((part, i) => (
        <Text key={`${part.text}-${i}`} style={toneStyle(part.tone, t, accent, isLight)}>
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function RichIntroLineView({
  line,
  t,
  accent,
  isLight,
  f,
}: {
  line: IntroLine;
  t: any;
  accent: string;
  isLight: boolean;
  f: any;
}) {
  if (line.type === 'spacer') return <View style={{ height: 8 }} />;

  const semanticColor =
    line.type === 'wrong'
      ? t.wrong
      : line.type === 'correct'
        ? t.correct
        : line.type === 'formula'
          ? accent
          : line.type === 'step'
            ? accent
            : line.type === 'tip'
              ? t.gold
              : 'transparent';
  const isFramed = line.type === 'wrong' || line.type === 'correct' || line.type === 'formula' || line.type === 'step' || line.type === 'tip';
  const semanticLineBg = isLight ? '#FFFFFFD9' : 'rgba(0,0,0,0.20)';

  return (
    <View
      style={[
        styles.richLine,
        isFramed && {
          backgroundColor: semanticLineBg,
          borderColor: `${semanticColor}40`,
          borderWidth: 1,
          paddingLeft: 16,
          paddingRight: 12,
          paddingVertical: line.type === 'formula' ? 12 : 10,
        },
      ]}
    >
      {isFramed && (
        <View
          pointerEvents="none"
          style={[styles.richLineStripe, { backgroundColor: semanticColor }]}
        />
      )}
      <RichTextParts
        parts={line.parts}
        text={line.text}
        t={t}
        accent={accent}
        isLight={isLight}
        style={[
          styles.richLineText,
          {
            color: t.textPrimary,
            fontSize: line.type === 'formula' ? f.bodyLg : f.body,
            lineHeight: Math.round((line.type === 'formula' ? f.bodyLg : f.body) * 1.42),
            textAlign: line.type === 'formula' ? 'center' : 'left',
          },
        ]}
      />
    </View>
  );
}

interface LessonIntroScreensProps {
  introScreens: LessonIntroScreen[];
  lessonId: number;
  onComplete: () => void;
  onBack?: () => void;
}

const FADE_DURATION_MS = 1400; // длинный плавный фейд
const SLIDE_DURATION_MS = 1500; // длинный «дрейф» снизу
const SLIDE_DISTANCE_PX = 44; // путь slide-up — больше воздуха
const AUTO_SCROLL_DELAY_MS = 520; // даём блоку доехать до конца, потом скроллим
const INTRO_HEADER_TOP_GAP = 8;
// Фолбэк, пока хедер не измерил свою реальную высоту через onLayout.
// Честная высота = paddingTop(8) + высота pill/кнопки(~36) + paddingBottom(12) ≈ 56;
// + воздух до первой карточки.
const INTRO_HEADER_FALLBACK_HEIGHT = 56;
const INTRO_FIRST_CARD_GAP = 16;
const KIND_BY_INDEX: LessonIntroBlockKind[] = ['why', 'how', 'tip'];

/**
 * Очень мягкая «expo-out» кривая (a-la Material expressive / iOS spring без bounce).
 * Сильно тормозит к концу — глаз видит долгое, дорогое появление.
 */
const EASE_EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Чуть менее агрессивная: для opacity, чтобы фейд начинался не «мгновенно от 0». */
const EASE_SOFT_OUT = Easing.bezier(0.22, 0.61, 0.36, 1);

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface KindStyle {
  icon: IconName;
  defaultTitleRU: string;
  defaultTitleUK: string;
  defaultTitleES: string;
  defaultTitlePtBr: string;
  defaultTitleVi: string;
  defaultTitleId: string;
  defaultTitleTr: string;
  defaultTitlePl: string;
  /** Возвращает основной акцентный цвет блока из темы */
  color: (t: any) => string;
}

const KIND_MAP: Record<LessonIntroBlockKind, KindStyle> = {
  why: {
    icon: 'sparkles',
    defaultTitleRU: 'Зачем эта тема',
    defaultTitleUK: 'Навіщо ця тема',
    defaultTitleES: '¿Para qué sirve este tema?',
    defaultTitlePtBr: 'Para que serve este tema?',
    defaultTitleVi: 'Chủ đề này dùng để làm gì?',
    defaultTitleId: 'Untuk apa topik ini?',
    defaultTitleTr: 'Bu konu ne işe yarar?',
    defaultTitlePl: 'Po co ten temat?',
    color: (t) => t.accent,
  },
  how: {
    icon: 'construct',
    defaultTitleRU: 'Как строится фраза',
    defaultTitleUK: 'Як будується фраза',
    defaultTitleES: '¿Cómo se forma la frase?',
    defaultTitlePtBr: 'Como a frase é formada?',
    defaultTitleVi: 'Câu được tạo như thế nào?',
    defaultTitleId: 'Bagaimana frasa dibentuk?',
    defaultTitleTr: 'Cümle nasıl kurulur?',
    defaultTitlePl: 'Jak zbudować zdanie?',
    color: (t) => t.correct,
  },
  tip: {
    icon: 'bulb',
    defaultTitleRU: 'Полезно знать',
    defaultTitleUK: 'Корисно знати',
    defaultTitleES: 'Dato útil',
    defaultTitlePtBr: 'Bom saber',
    defaultTitleVi: 'Điều hữu ích cần biết',
    defaultTitleId: 'Perlu diketahui',
    defaultTitleTr: 'Bilmekte fayda var',
    defaultTitlePl: 'Warto wiedzieć',
    color: (t) => t.gold,
  },
  trap: {
    icon: 'warning',
    defaultTitleRU: 'Главная ловушка',
    defaultTitleUK: 'Головна пастка',
    defaultTitleES: 'Trampa principal',
    defaultTitlePtBr: 'Armadilha principal',
    defaultTitleVi: 'Bẫy chính',
    defaultTitleId: 'Jebakan utama',
    defaultTitleTr: 'Ana tuzak',
    defaultTitlePl: 'Główna pułapka',
    color: (t) => t.wrong,
  },
  mechanic: {
    icon: 'hand-left',
    defaultTitleRU: 'Как это работает',
    defaultTitleUK: 'Як це працює',
    defaultTitleES: '¿Cómo funciona esto?',
    defaultTitlePtBr: 'Como isso funciona?',
    defaultTitleVi: 'Cách hoạt động',
    defaultTitleId: 'Cara kerjanya',
    defaultTitleTr: 'Nasıl çalışır?',
    defaultTitlePl: 'Jak to działa?',
    color: (t) => t.accent,
  },
  core_idea: {
    icon: 'flash',
    defaultTitleRU: 'Ключевая идея',
    defaultTitleUK: 'Ключова ідея',
    defaultTitleES: 'Idea clave',
    defaultTitlePtBr: 'Ideia principal',
    defaultTitleVi: 'Ý chính',
    defaultTitleId: 'Ide utama',
    defaultTitleTr: 'Ana fikir',
    defaultTitlePl: 'Główna myśl',
    color: (t) => t.accent,
  },
  main_formula: {
    icon: 'calculator',
    defaultTitleRU: 'Формула урока',
    defaultTitleUK: 'Формула уроку',
    defaultTitleES: 'Fórmula de la lección',
    defaultTitlePtBr: 'Fórmula da lição',
    defaultTitleVi: 'Công thức của bài học',
    defaultTitleId: 'Rumus pelajaran',
    defaultTitleTr: 'Ders formülü',
    defaultTitlePl: 'Wzór lekcji',
    color: (t) => t.gold,
  },
  be_choice: {
    icon: 'git-branch',
    defaultTitleRU: 'Как выбрать форму',
    defaultTitleUK: 'Як обрати форму',
    defaultTitleES: 'Cómo elegir la forma',
    defaultTitlePtBr: 'Como escolher a forma',
    defaultTitleVi: 'Cách chọn dạng đúng',
    defaultTitleId: 'Cara memilih bentuk',
    defaultTitleTr: 'Biçim nasıl seçilir?',
    defaultTitlePl: 'Jak wybrać formę',
    color: (t) => t.correct,
  },
  description_logic: {
    icon: 'list',
    defaultTitleRU: 'Что идёт после глагола',
    defaultTitleUK: 'Що йде після дієслова',
    defaultTitleES: 'Qué va después del verbo',
    defaultTitlePtBr: 'O que vem depois do verbo',
    defaultTitleVi: 'Đi sau động từ là gì',
    defaultTitleId: 'Apa yang datang setelah kata kerja',
    defaultTitleTr: 'Fiilden sonra ne gelir?',
    defaultTitlePl: 'Co idzie po czasowniku',
    color: (t) => t.gold,
  },
  memory_tip: {
    icon: 'bulb',
    defaultTitleRU: 'Приём сборки',
    defaultTitleUK: 'Прийом складання',
    defaultTitleES: 'Truco de construcción',
    defaultTitlePtBr: 'Truque de montagem',
    defaultTitleVi: 'Mẹo ghép câu',
    defaultTitleId: 'Trik menyusun',
    defaultTitleTr: 'Kurma ipucu',
    defaultTitlePl: 'Sposób składania',
    color: (t) => t.gold,
  },
  negative_formula: {
    icon: 'close-circle',
    defaultTitleRU: 'Отрицание',
    defaultTitleUK: 'Заперечення',
    defaultTitleES: 'Negación',
    defaultTitlePtBr: 'Negação',
    defaultTitleVi: 'Phủ định',
    defaultTitleId: 'Negasi',
    defaultTitleTr: 'Olumsuz',
    defaultTitlePl: 'Przeczenie',
    color: (t) => t.wrong,
  },
  question_formula: {
    icon: 'help-circle',
    defaultTitleRU: 'Вопрос',
    defaultTitleUK: 'Питання',
    defaultTitleES: 'Pregunta',
    defaultTitlePtBr: 'Pergunta',
    defaultTitleVi: 'Câu hỏi',
    defaultTitleId: 'Pertanyaan',
    defaultTitleTr: 'Soru',
    defaultTitlePl: 'Pytanie',
    color: (t) => t.accent,
  },
  after_be: {
    icon: 'list',
    defaultTitleRU: 'Что идёт после To Be',
    defaultTitleUK: 'Що йде після To Be',
    defaultTitleES: 'Qué va después de To Be',
    defaultTitlePtBr: 'O que vem depois de To Be',
    defaultTitleVi: 'Đi sau To Be là gì',
    defaultTitleId: 'Apa yang datang setelah To Be',
    defaultTitleTr: 'To Be sonrasında ne gelir?',
    defaultTitlePl: 'Co idzie po To Be',
    color: (t) => t.gold,
  },
  negative_questions: {
    icon: 'alert-circle',
    defaultTitleRU: 'Вопросы с not',
    defaultTitleUK: 'Питання з not',
    defaultTitleES: 'Preguntas con not',
    defaultTitlePtBr: 'Perguntas com not',
    defaultTitleVi: 'Câu hỏi với not',
    defaultTitleId: 'Pertanyaan dengan not',
    defaultTitleTr: 'not ile sorular',
    defaultTitlePl: 'Pytania z not',
    color: (t) => t.accent,
  },
  mistakes: {
    icon: 'warning',
    defaultTitleRU: 'Главные ошибки',
    defaultTitleUK: 'Головні помилки',
    defaultTitleES: 'Errores principales',
    defaultTitlePtBr: 'Erros principais',
    defaultTitleVi: 'Lỗi chính',
    defaultTitleId: 'Kesalahan utama',
    defaultTitleTr: 'Başlıca hatalar',
    defaultTitlePl: 'Główne błędy',
    color: (t) => t.wrong,
  },
};

function defaultKindTitle(km: KindStyle, lang: Lang, studyTarget: StudyTargetLang): string {
  const plannedTitles: Record<PlannedIntroLang, string> = {
    'pt-BR': km.defaultTitlePtBr,
    vi: km.defaultTitleVi,
    id: km.defaultTitleId,
    tr: km.defaultTitleTr,
    pl: km.defaultTitlePl,
  };
  return isPlannedIntroLang(lang)
    ? plannedTitles[lang]
    : legacyIntroValue(
      lang,
      studyTarget,
      km.defaultTitleRU,
      km.defaultTitleUK,
      km.defaultTitleES,
    ) ?? km.defaultTitleRU;
}

function lessonLevelLabel(lessonId: number): 'A1' | 'A2' | 'B1' | 'B2' {
  if (lessonId <= 8) return 'A1';
  if (lessonId <= 18) return 'A2';
  if (lessonId <= 28) return 'B1';
  return 'B2';
}

function levelColor(lessonId: number, isLight: boolean): string {
  if (lessonId <= 8) return isLight ? '#15803D' : '#4CAF72';
  if (lessonId <= 18) return isLight ? '#0369A1' : '#40B4E8';
  if (lessonId <= 28) return isLight ? '#92400E' : '#D4A017';
  return isLight ? '#9A3412' : '#DC6428';
}

interface IntroBlockCardProps {
  index: number;
  total: number;
  data: LessonIntroScreen;
  visible: boolean;
  lang: Lang;
  studyTarget: StudyTargetLang;
  t: any;
  themeMode: any;
  f: any;
  onLayout: (index: number, y: number) => void;
  onRevealComplete?: (index: number) => void;
  footer?: React.ReactNode;
}

function IntroBlockCard({
  index,
  total: _total,
  data,
  visible,
  lang,
  studyTarget,
  t,
  themeMode,
  f,
  onLayout,
  onRevealComplete,
  footer,
}: IntroBlockCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE_PX)).current;
  const scale = useRef(new Animated.Value(0.965)).current;
  const iconPulse = useRef(new Animated.Value(0)).current;

  const kind: LessonIntroBlockKind = richKindToLegacyKind(data.kind) ?? KIND_BY_INDEX[index] ?? 'tip';
  const km = KIND_MAP[kind];
  const accent = km.color(t);
  const isLight = themeMode === 'minimalLight';
  const isCompassTheme = themeMode === 'compass';

  const defaultTitle = defaultKindTitle(km, lang, studyTarget);
  const localizedTitle = richTitle(data, lang, studyTarget);
  const title = localizedTitle ?? defaultTitle;
  const text = plainIntroText(data, lang, studyTarget);
  const rich = hasRichIntroLines(data);
  const lines = richIntroLines(data, lang, studyTarget);
  const subtitle = richSubtitle(data, lang, studyTarget);

  useEffect(() => {
    if (!visible) return;
    // «Киношный» фейд: длинный opacity + долгий translate с expo-out;
    // никаких пружин — иначе блок «прыгает» и кажется резким.
    // Лёгкий каскад: opacity стартует мгновенно, slide/scale — с микро-задержкой,
    // чтобы появление воспринималось не как «один взмах», а как мягкое всплытие.
    const reveal = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_DURATION_MS,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.timing(translateY, {
          toValue: 0,
          duration: SLIDE_DURATION_MS,
          easing: EASE_EXPO_OUT,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(80),
        Animated.timing(scale, {
          toValue: 1,
          duration: SLIDE_DURATION_MS,
          easing: EASE_EXPO_OUT,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(560),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);
    reveal.start(({ finished }) => {
      if (finished) onRevealComplete?.(index);
    });
    return () => reveal.stop();
  }, [visible, index, opacity, translateY, scale, iconPulse, onRevealComplete]);

  const iconScale = iconPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, MOTION_SCALE.energyRefill],
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    onLayout(index, e.nativeEvent.layout.y);
  };

  if (!visible) {
    // Зарезервированное место не нужно — блок ещё не отрендерен,
    // следующие блоки увидят свою новую y когда появятся.
    return null;
  }

  // Цветовая полупрозрачная подложка под иконкой
  const iconBg = `${accent}28`;
  const iconBorder = `${accent}55`;
  const titleColor = isCompassTheme ? COMPASS_RICH.champagne : accent;
  const cardBg = isCompassTheme ? COMPASS_RICH.charcoalRaised : themeMode === 'minimalLight' ? '#FFFFFF' : t.bgCard;
  const stripeBg = isCompassTheme ? COMPASS_RICH.champagne : `${accent}99`;
  const cardRadius = isCompassTheme ? 10 : 18;

  return (
    <Animated.View
      onLayout={handleLayout}
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
        marginBottom: 14,
      }}
    >
      <View
        testID={`lesson-intro-card-${index + 1}`}
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderRadius: cardRadius,
            borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.borderHighlight,
            ...(isCompassTheme ? compassShadow(2) : getVolumetricShadow(themeMode, t, 2)),
          },
        ]}
      >
        {isCompassTheme && <CompassDepthSurface radius={cardRadius} />}
        {/* Цветная вертикальная полоса слева */}
        <View style={[styles.stripe, { backgroundColor: stripeBg }]} />

        <View style={styles.cardInner}>
          {/* Заголовок: иконка + caps-метка */}
          <View style={styles.cardHeader}>
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalWarm : iconBg,
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : iconBorder,
                  borderRadius: isCompassTheme ? 9 : 18,
                  transform: [{ scale: iconScale }],
                  shadowColor: isCompassTheme ? '#000000' : accent,
                  ...(isCompassTheme ? compassShadow(1) : null),
                },
              ]}
            >
              {isCompassTheme && <CompassDepthSurface radius={9} selected />}
              <Ionicons name={km.icon} size={20} color={isCompassTheme ? COMPASS_RICH.cream : accent} />
            </Animated.View>
            <Text
              style={[
                styles.cardTitle,
                {
                  color: titleColor,
                  fontSize: f.caption,
                },
              ]}
            >
              {title}
            </Text>
          </View>

          {/* Тело блока */}
          {rich ? (
            <View style={styles.richBody}>
              {!!subtitle && (
                <Text style={[styles.richSubtitle, { color: t.textMuted, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.45) }]}>
                  {subtitle}
                </Text>
              )}
              {lines.map((line, i) => (
                <RichIntroLineView
                  key={`${data.screenId ?? index}-line-${i}`}
                  line={line}
                  t={t}
                  accent={accent}
                  isLight={isLight}
                  f={f}
                />
              ))}
            </View>
          ) : (
            <HighlightedText
              text={text ?? ''}
              accentColor={accent}
              style={[
                styles.cardBody,
                {
                  color: t.textPrimary,
                  fontSize: f.bodyLg,
                  lineHeight: Math.round(f.bodyLg * 1.5),
                },
              ]}
            />
          )}

          {/* Опциональные примеры */}
          {!!data.examples?.length && (
            <View
              style={[
                styles.exampleBox,
                {
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : `${accent}33`,
                  backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : isLight ? '#FFFFFF80' : '#00000022',
                  borderRadius: isCompassTheme ? 9 : 12,
                },
              ]}
            >
              {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
              {data.examples.map((ex, i) => {
                const richExample = isRichExample(ex);
                const { primary, secondary } = richExample
                  ? {
                      primary: '',
                      secondary: richExampleText(ex, lang, studyTarget),
                    }
                  : lessonIntroExampleLines(ex as LessonIntroExample, lang, studyTarget);
                const label = richExample
                  ? isPlannedIntroLang(lang)
                    ? plannedExampleMeta(ex, 'label', lang)
                    : legacyExampleMeta(ex, 'label', lang, studyTarget)
                  : undefined;
                const note = richExample
                  ? isPlannedIntroLang(lang)
                    ? plannedExampleMeta(ex, 'note', lang)
                    : legacyExampleMeta(ex, 'note', lang, studyTarget)
                  : undefined;
                return (
                <View key={i} style={[styles.exampleRow, i > 0 && { marginTop: 6 }]}>
                  {!!label && (
                    <Text style={[styles.exampleTR, { color: t.textMuted, fontSize: f.caption, marginBottom: 2 }]}>
                      {label}
                    </Text>
                  )}
                  {richExample ? (
                    <RichTextParts
                      parts={ex.en}
                      t={t}
                      accent={accent}
                      isLight={isLight}
                      style={[styles.exampleEN, { color: t.correct, fontSize: f.body }]}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.exampleEN,
                        { color: t.correct, fontSize: f.body },
                      ]}
                    >
                      {primary}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.exampleTR,
                      { color: t.textMuted, fontSize: f.sub },
                    ]}
                  >
                    {secondary}
                  </Text>
                  {!!note && (
                    <Text style={[styles.exampleNote, { color: t.textMuted, fontSize: f.caption, lineHeight: Math.round(f.caption * 1.35), marginTop: 3 }]}>
                      {note}
                    </Text>
                  )}
                </View>
                );
              })}
            </View>
          )}

          {footer}
        </View>
      </View>
    </Animated.View>
  );
}

export default function LessonIntroScreens({
  introScreens,
  lessonId,
  onComplete,
  onBack,
}: LessonIntroScreensProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const isLight = themeMode === 'minimalLight';
  const isCompassTheme = themeMode === 'compass';

  const totalBlocks = introScreens.length;
  const [revealedCount, setRevealedCount] = useState(1); // первый блок виден сразу
  const allRevealed = revealedCount >= totalBlocks;
  const ctaReady = allRevealed;

  const fadeBtn = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.85)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(0.985)).current;

  // Подсказка-плашка «Коснитесь, чтобы увидеть дальше»: плавно появляется/исчезает
  const hintFade = useRef(new Animated.Value(0)).current;
  const hintBob = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef<ScrollView | null>(null);
  const blockYRef = useRef<Record<number, number>>({});
  const visibleHeightRef = useRef<number>(screenH);
  // Реальная высота хедера (Back + pill), измеренная на лету — вместо магического числа.
  const [headerHeight, setHeaderHeight] = useState(INTRO_HEADER_FALLBACK_HEIGHT);
  // Зеркало низа хедера для auto-scroll — чтобы не тащить headerBottom в deps эффекта.
  const headerBottomRef = useRef<number>(0);

  const handleBlockLayout = useCallback((index: number, y: number) => {
    blockYRef.current[index] = y;
  }, []);

  // Появление header + лёгкое «оживление» контейнера на mount — медленный, дорогой фейд
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 900,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(containerScale, {
        toValue: 1,
        duration: 900,
        easing: EASE_EXPO_OUT,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerFade, containerScale]);

  // Авто-показ намеренно убран: пользователь сам контролирует темп чтения.
  // Следующий блок появляется только по тапу на кнопку «Дальше».

  // Auto-scroll к новому блоку: ждём, пока он отрендерится и узнает свою y, и плавно центрируем
  useEffect(() => {
    if (revealedCount <= 1) return;
    const idx = revealedCount - 1;
    const timer = setTimeout(() => {
      const y = blockYRef.current[idx];
      if (y === undefined || !scrollRef.current) return;
      // Ставим новый блок сразу ПОД хедером (а не под него): вычитаем низ хедера + воздух,
      // иначе верх карточки прячется за fade-маской/шапкой.
      const targetY = Math.max(0, y - (headerBottomRef.current + INTRO_FIRST_CARD_GAP));
      scrollRef.current.scrollTo({ y: targetY, animated: true });
    }, AUTO_SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [revealedCount]);

  // Подсказка «Коснитесь, чтобы увидеть дальше» — плавно появляется ПОСЛЕ того,
  // как блок успел осесть, и держит лёгкий «бобинг» иконки, чтобы привлечь внимание.
  useEffect(() => {
    if (allRevealed) {
      Animated.timing(hintFade, {
        toValue: 0,
        duration: 280,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }).start();
      return;
    }
    hintFade.setValue(0);
    const appear = Animated.sequence([
      Animated.delay(FADE_DURATION_MS + 500),
      Animated.timing(hintFade, {
        toValue: 1,
        duration: 800,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }),
    ]);
    appear.start();
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(hintBob, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hintBob, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    bob.start();
    return () => {
      bob.stop();
      appear.stop();
    };
  }, [revealedCount, allRevealed, hintFade, hintBob]);

  // CTA «Начать урок» — длинный плавный fade-in + долгий expo-out scale + breathing pulse
  useEffect(() => {
    if (!ctaReady) {
      fadeBtn.setValue(0);
      btnScale.setValue(0.85);
      btnPulse.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeBtn, {
        toValue: 1,
        duration: 1100,
        easing: EASE_SOFT_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(btnScale, {
        toValue: 1,
        duration: 1100,
        easing: EASE_EXPO_OUT,
        useNativeDriver: true,
      }),
    ]).start();
    // Breathing pulse — мягкий, ненавязчивый
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: MOTION_SCALE.hint,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [ctaReady, fadeBtn, btnScale, btnPulse]);

  const handleTapAnywhere = () => {
    if (revealedCount < totalBlocks) {
      hapticTap();
      setRevealedCount((n) => Math.min(n + 1, totalBlocks));
    }
  };

  const handleStart = () => {
    hapticTap();
    onComplete();
  };

  const handleBack = () => {
    hapticTap();
    (onBack ?? onComplete)();
  };

  // Защитный кейс: контента нет — мгновенно проваливаем в урок
  useEffect(() => {
    if (introScreens.length === 0) onComplete();
  }, [introScreens.length, onComplete]);

  if (introScreens.length === 0) return null;

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
  const headerLabel = `${lessonWord} ${lessonId}`;
  const lvlLabel = lessonLevelLabel(lessonId);
  const lvlColor = levelColor(lessonId, isLight);
  const introHeaderTop = insets.top + INTRO_HEADER_TOP_GAP;
  // Низ хедера = safe-area + зазор + измеренная высота. Контент скролла начинается ниже,
  // плюс воздух до первой карточки.
  const headerBottom = introHeaderTop + headerHeight;
  headerBottomRef.current = headerBottom;
  const scrollTopPadding = headerBottom + INTRO_FIRST_CARD_GAP;
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
  const tapHintLabel = triLang(lang, {
    ru: 'Коснитесь, чтобы увидеть дальше',
    uk: 'Торкніться, щоб побачити далі',
    es: 'Toca para continuar',
    'pt-BR': 'Toque para continuar',
    vi: 'Chạm để xem tiếp',
    id: 'Ketuk untuk melanjutkan',
    tr: 'Devam etmek için dokun',
    pl: 'Dotknij, aby kontynuować',
  });

  const startCta = (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.ctaInlineWrap,
        {
          opacity: fadeBtn,
          transform: [{ scale: btnScale }],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
        <TouchableOpacity testID="lesson-intro-start" accessibilityRole="button" accessibilityLabel={startLabel} activeOpacity={0.88} onPress={handleStart}>
          <LinearGradient
            colors={isCompassTheme ? COMPASS_GRADIENTS.primaryButton : [`${t.accent}`, `${t.correct}`]}
            locations={isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.ctaBtn,
              {
                borderRadius: isCompassTheme ? 9 : 18,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : t.borderHighlight,
                shadowColor: isCompassTheme ? '#000000' : t.accent,
                ...(isCompassTheme ? compassShadow(2) : null),
              },
            ]}
          >
            {isCompassTheme && <CompassDepthSurface radius={9} cream />}
            <Text style={[styles.ctaText, { color: isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontSize: f.bodyLg }]}>
              {startLabel}
            </Text>
            <View style={[styles.ctaIconWrap, isCompassTheme && { backgroundColor: 'rgba(21,16,8,0.12)', borderRadius: 8 }]}>
              <Ionicons name="arrow-forward" size={18} color={isCompassTheme ? COMPASS_RICH.textDark : t.correctText} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );

  return (
    <ScreenGradient>
      <LessonArtBackdrop variant="intro" />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {/* Затемняющий верхний край (общий компонент, Telegram-стиль): карточки
            при скролле уходят в тень у статус-бара, а не обрезаются резко.
            Высота = safe-area + хедер. */}
        <TopFadeMask headerHeight={headerHeight + INTRO_HEADER_TOP_GAP} />

        {/* Шапка: Back + pill «Урок N · A1» */}
        <Animated.View
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 0 && h !== headerHeight) setHeaderHeight(h);
          }}
          style={[
            styles.header,
            {
              top: introHeaderTop,
              opacity: headerFade,
              transform: [{ translateY: headerFade.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            },
          ]}
        >
          <TapScale
            testID="lesson-intro-back"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад',
              uk: 'Назад',
              es: 'Volver',
              'pt-BR': 'Voltar',
              vi: 'Quay lại',
              id: 'Kembali',
              tr: 'Geri',
              pl: 'Wstecz',
            })}
            onPress={handleBack}
            hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
            style={[
              styles.skipBtn,
              {
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.borderHighlight,
                borderRadius: isCompassTheme ? 9 : 18,
                overflow: isCompassTheme ? 'hidden' : 'visible',
                ...(isCompassTheme ? compassShadow(1) : null),
              },
            ]}
          >
            {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
            <Ionicons name="chevron-back" size={20} color={isCompassTheme ? COMPASS_RICH.champagne : t.textMuted} />
          </TapScale>

          <View
            style={[
              styles.headerPill,
              {
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderColor: isCompassTheme ? COMPASS_RICH.hairline : t.borderHighlight,
                borderRadius: isCompassTheme ? 10 : 20,
                overflow: isCompassTheme ? 'hidden' : 'visible',
                ...(isCompassTheme ? compassShadow(1) : getVolumetricShadow(themeMode, t, 1)),
              },
            ]}
          >
            {isCompassTheme && <CompassDepthSurface radius={10} quiet />}
            <Text style={[styles.headerText, { color: t.textPrimary, fontSize: f.caption }]} numberOfLines={1}>
              {headerLabel}
            </Text>
            <View style={[styles.headerDot, { backgroundColor: t.textMuted }]} />
            <Text style={[styles.headerText, { color: lvlColor, fontSize: f.caption }]} numberOfLines={1}>
              {lvlLabel}
            </Text>
          </View>
        </Animated.View>

        {/* Скроллируемый список карточек.
            Pressable-обёртку специально НЕ ставим: на Android она перехватывает touch responder
            раньше, чем ScrollView успеет начать pan-жест, и скролл «не работает». */}
        <Animated.View
          style={{ flex: 1, transform: [{ scale: containerScale }] }}
          onLayout={(e) => {
            visibleHeightRef.current = e.nativeEvent.layout.height;
          }}
        >
          <ScrollView
            ref={scrollRef}
            decelerationRate="normal"
            contentContainerStyle={[styles.scrollContent, { paddingTop: scrollTopPadding }]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            scrollEventThrottle={16}
            bounces
            overScrollMode="always"
          >
            {/* Pressable-«коврик» ВНУТРИ ScrollView: тап в любом месте = следующий блок.
                Скролл не ломается: Pressable — ребёнок ScrollView, поэтому при pan-жесте
                ScrollView перехватывает responder, а Pressable отменяет press. */}
            <Pressable
              onPress={!allRevealed ? handleTapAnywhere : undefined}
              android_disableSound
              style={styles.tapMat}
            >
              {introScreens.slice(0, totalBlocks).map((block, i) => {
                const isLastBlock = i === totalBlocks - 1;
                return (
                  <IntroBlockCard
                    key={`${lessonId}-${i}`}
                    index={i}
                    total={totalBlocks}
                    data={block}
                    visible={i < revealedCount}
                    lang={lang}
                    studyTarget={studyTarget}
                    t={t}
                    themeMode={themeMode}
                    f={f}
                    onLayout={handleBlockLayout}
                    footer={isLastBlock && ctaReady ? startCta : null}
                  />
                );
              })}

              {/* Подсказка-плашка: визуальная только. Тап обрабатывает родительский Pressable. */}
              {!allRevealed && (
                <Animated.View
                  testID="lesson-intro-hint"
                  pointerEvents="none"
                  style={[
                    styles.tapHintRow,
                    {
                      opacity: hintFade,
                      alignSelf: 'center',
                      backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : undefined,
                      borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : undefined,
                      borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0,
                      borderRadius: isCompassTheme ? 9 : 0,
                      overflow: isCompassTheme ? 'hidden' : 'visible',
                      ...(isCompassTheme ? compassShadow(1) : null),
                    },
                  ]}
                >
                  {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
                  <Animated.View
                    style={{
                      marginRight: 8,
                      transform: [
                        {
                          translateY: hintBob.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 3],
                          }),
                        },
                      ],
                    }}
                  >
                    <Ionicons name="finger-print-outline" size={16} color={isCompassTheme ? COMPASS_RICH.champagne : t.textGhost} />
                  </Animated.View>
                  <Text style={[styles.tapHint, { color: isCompassTheme ? COMPASS_RICH.textMuted : t.textGhost, fontSize: f.caption }]}>
                    {tapHintLabel}
                  </Text>
                </Animated.View>
              )}

              <View style={{ height: 28 + insets.bottom }} />
            </Pressable>
          </ScrollView>
        </Animated.View>

      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerPill: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '78%',
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
  skipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    flexGrow: 1,
  },
  tapMat: {
    flexGrow: 1,
    width: '100%',
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    flexDirection: 'row',
  },
  stripe: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  iconCircle: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontWeight: '800',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    flex: 1,
  },
  cardBody: {
    fontWeight: '500',
  },
  richBody: {
    gap: 8,
  },
  richSubtitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  richLine: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  richLineStripe: {
    bottom: 0,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  richLineText: {
    fontWeight: '500',
  },
  exampleBox: {
    position: 'relative',
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
    overflow: 'hidden',
  },
  exampleRow: {
    flexDirection: 'column',
  },
  exampleEN: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  exampleTR: {
    marginTop: 1,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  exampleNote: {
    fontStyle: 'normal',
    fontWeight: '600',
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tapHint: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  ctaInlineWrap: {
    marginTop: 18,
    width: '100%',
  },
  ctaBtn: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 0.5,
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
