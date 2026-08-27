import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { IntroLine, IntroTextPart, IntroTextTone, LessonIntroExample, LessonIntroScreen, LessonIntroBlockKind } from '../app/lesson_data_types';
import type { Lang } from '../constants/i18n';
import type { StudyTargetLang } from '../app/study_target_lang_dev';
import { spanishLessonUiStringsActive, spanishStudyActive } from '../app/spanish_content_gate';

export type PlannedIntroLang = Extract<Lang, 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl'>;

export const PLANNED_INTRO_LANGS = new Set<Lang>(['pt-BR', 'vi', 'id', 'tr', 'pl']);

export function isPlannedIntroLang(lang: Lang): lang is PlannedIntroLang {
  return PLANNED_INTRO_LANGS.has(lang);
}

export function firstDefined<T>(...values: (T | undefined)[]): T | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

export function legacyIntroValue<T>(
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
export function splitEnglish(text: string): { value: string; isEn: boolean }[] {
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

export function HighlightedText({
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
export function lessonIntroExampleLines(
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

export function hasRichIntroLines(screen: LessonIntroScreen): boolean {
  const legacyLineSets = [screen.linesRU, screen.linesUK, screen.linesES];
  return legacyLineSets.some((lines) => !!lines?.length);
}

export function richIntroLines(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): IntroLine[] {
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

export function richSubtitle(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): string | undefined {
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

export function richTitle(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): string | undefined {
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

export function plainIntroText(screen: LessonIntroScreen, lang: Lang, studyTarget: StudyTargetLang): string | undefined {
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

export function richKindToLegacyKind(kind: LessonIntroScreen['kind']): LessonIntroBlockKind {
  if (kind === 'concept') return 'core_idea';
  if (kind === 'formula') return 'main_formula';
  if (kind === 'practice') return 'memory_tip';
  return (kind as LessonIntroBlockKind) ?? 'tip';
}

export function isRichExample(ex: LessonIntroExample | any): ex is {
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

export function richExampleText(ex: unknown, lang: Lang, studyTarget: StudyTargetLang): string {
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

export function plannedExampleMeta(ex: any, base: 'label' | 'note', lang: Lang): string | undefined {
  const plannedMeta: Record<PlannedIntroLang, string | undefined> = {
    'pt-BR': ex[`${base}PtBr`],
    vi: ex[`${base}Vi`],
    id: ex[`${base}Id`],
    tr: ex[`${base}Tr`],
    pl: ex[`${base}Pl`],
  };
  return isPlannedIntroLang(lang) ? plannedMeta[lang] : undefined;
}

export function legacyExampleMeta(
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

export function toneStyle(tone: IntroTextTone | undefined, t: any, accent: string, isLight: boolean) {
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

export function RichTextParts({
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

export function RichIntroLineView({
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
          borderWidth: 0,
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

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface KindStyle {
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

export const KIND_MAP: Record<LessonIntroBlockKind, KindStyle> = {
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

export function defaultKindTitle(km: KindStyle, lang: Lang, studyTarget: StudyTargetLang): string {
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

export const KIND_BY_INDEX: LessonIntroBlockKind[] = ['why', 'how', 'tip'];

export function lessonLevelLabel(lessonId: number): 'A1' | 'A2' | 'B1' | 'B2' {
  if (lessonId <= 8) return 'A1';
  if (lessonId <= 18) return 'A2';
  if (lessonId <= 28) return 'B1';
  return 'B2';
}

export function levelColor(lessonId: number, isLight: boolean): string {
  if (lessonId <= 8) return isLight ? '#15803D' : '#4CAF72';
  if (lessonId <= 18) return isLight ? '#0369A1' : '#40B4E8';
  if (lessonId <= 28) return isLight ? '#92400E' : '#D4A017';
  return isLight ? '#9A3412' : '#DC6428';
}

const styles = StyleSheet.create({
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
});
