import React from 'react';
import { themeRoleColors } from './theme_role_colors';
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
  const roles = themeRoleColors(accent, typeof t?.bgCard === 'string' ? t.bgCard : '', isLight);
  const colorByTone: Record<IntroTextTone, string> = {
    normal: t.textPrimary,
    muted: t.textMuted,
    strong: t.textPrimary,
    accent,
    success: t.correct,
    danger: t.wrong,
    warning: t.gold,
    formula: roles.formula, // зачем (владелец 28.10, «везде по цвету темы»): формула и код — оттенки акцента текущей темы (themeRoleColors), не фиксированные фиолетовый и голубой
    code: roles.verb,
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
  const semanticLineBg = isLight ? '#FFFFFFD9' : 'rgba(0,0,0,0.20)'; // theme-exempt: интро урока: пары светлая/тёмная заданы по режиму темы, цвет блока по группе уроков (токены — у «Тем»)

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
  /** Заголовок блока по языкам интерфейса (одной строкой — сканер непереведённого видит парные переводы; en добавлен 12.10, EN_READINESS_R1). */
  defaultTitle: Readonly<Record<Lang, string>>;
  /** Возвращает основной акцентный цвет блока из темы */
  color: (t: any) => string;
}

export const KIND_MAP: Record<LessonIntroBlockKind, KindStyle> = {
  why: {
    icon: 'sparkles',
    defaultTitle: { ru: 'Зачем эта тема', uk: 'Навіщо ця тема', en: 'Why this topic', es: '¿Para qué sirve este tema?', 'pt-BR': 'Para que serve este tema?', vi: 'Chủ đề này dùng để làm gì?', id: 'Untuk apa topik ini?', tr: 'Bu konu ne işe yarar?', pl: 'Po co ten temat?' },
    color: (t) => t.accentText,
  },
  how: {
    icon: 'construct',
    defaultTitle: { ru: 'Как строится фраза', uk: 'Як будується вислів', en: 'How the phrase is built', es: '¿Cómo se forma la frase?', 'pt-BR': 'Como a frase é formada?', vi: 'Câu được tạo như thế nào?', id: 'Bagaimana frasa dibentuk?', tr: 'Cümle nasıl kurulur?', pl: 'Jak zbudować zdanie?' },
    color: (t) => t.correct,
  },
  tip: {
    icon: 'bulb',
    defaultTitle: { ru: 'Полезно знать', uk: 'Корисно знати', en: 'Good to know', es: 'Dato útil', 'pt-BR': 'Bom saber', vi: 'Điều hữu ích cần biết', id: 'Perlu diketahui', tr: 'Bilmekte fayda var', pl: 'Warto wiedzieć' },
    color: (t) => t.accentText,
  },
  trap: {
    icon: 'warning',
    defaultTitle: { ru: 'Главная ловушка', uk: 'Головна пастка', en: 'The main trap', es: 'Trampa principal', 'pt-BR': 'Armadilha principal', vi: 'Bẫy chính', id: 'Jebakan utama', tr: 'Ana tuzak', pl: 'Główna pułapka' },
    color: (t) => t.wrong,
  },
  mechanic: {
    icon: 'hand-left',
    defaultTitle: { ru: 'Как это работает', uk: 'Як це працює', en: 'How it works', es: '¿Cómo funciona esto?', 'pt-BR': 'Como isso funciona?', vi: 'Cách hoạt động', id: 'Cara kerjanya', tr: 'Nasıl çalışır?', pl: 'Jak to działa?' },
    color: (t) => t.accentText,
  },
  core_idea: {
    icon: 'flash',
    defaultTitle: { ru: 'Ключевая идея', uk: 'Ключова ідея', en: 'Key idea', es: 'Idea clave', 'pt-BR': 'Ideia principal', vi: 'Ý chính', id: 'Ide utama', tr: 'Ana fikir', pl: 'Główna myśl' },
    color: (t) => t.accentText,
  },
  main_formula: {
    icon: 'calculator',
    defaultTitle: { ru: 'Формула урока', uk: 'Формула уроку', en: 'Lesson formula', es: 'Fórmula de la lección', 'pt-BR': 'Fórmula da lição', vi: 'Công thức của bài học', id: 'Rumus pelajaran', tr: 'Ders formülü', pl: 'Wzór lekcji' },
    color: (t) => t.accentText,
  },
  be_choice: {
    icon: 'git-branch',
    defaultTitle: { ru: 'Как выбрать форму', uk: 'Як обрати форму', en: 'How to choose the form', es: 'Cómo elegir la forma', 'pt-BR': 'Como escolher a forma', vi: 'Cách chọn dạng đúng', id: 'Cara memilih bentuk', tr: 'Biçim nasıl seçilir?', pl: 'Jak wybrać formę' },
    color: (t) => t.correct,
  },
  description_logic: {
    icon: 'list',
    defaultTitle: { ru: 'Что идёт после глагола', uk: 'Що йде після дієслова', en: 'What comes after the verb', es: 'Qué va después del verbo', 'pt-BR': 'O que vem depois do verbo', vi: 'Đi sau động từ là gì', id: 'Apa yang datang setelah kata kerja', tr: 'Fiilden sonra ne gelir?', pl: 'Co idzie po czasowniku' },
    color: (t) => t.accentText,
  },
  memory_tip: {
    icon: 'bulb',
    defaultTitle: { ru: 'Приём сборки', uk: 'Прийом складання', en: 'Building trick', es: 'Truco de construcción', 'pt-BR': 'Truque de montagem', vi: 'Mẹo ghép câu', id: 'Trik menyusun', tr: 'Kurma ipucu', pl: 'Sposób składania' },
    color: (t) => t.accentText,
  },
  negative_formula: {
    icon: 'close-circle',
    defaultTitle: { ru: 'Отрицание', uk: 'Заперечення', en: 'Negation', es: 'Negación', 'pt-BR': 'Negação', vi: 'Phủ định', id: 'Negasi', tr: 'Olumsuz', pl: 'Przeczenie' },
    color: (t) => t.wrong,
  },
  question_formula: {
    icon: 'help-circle',
    defaultTitle: { ru: 'Вопрос', uk: 'Питання', en: 'Question', es: 'Pregunta', 'pt-BR': 'Pergunta', vi: 'Câu hỏi', id: 'Pertanyaan', tr: 'Soru', pl: 'Pytanie' },
    color: (t) => t.accentText,
  },
  after_be: {
    icon: 'list',
    defaultTitle: { ru: 'Что идёт после To Be', uk: 'Що йде після To Be', en: 'What comes after To Be', es: 'Qué va después de To Be', 'pt-BR': 'O que vem depois de To Be', vi: 'Đi sau To Be là gì', id: 'Apa yang datang setelah To Be', tr: 'To Be sonrasında ne gelir?', pl: 'Co idzie po To Be' },
    color: (t) => t.accentText,
  },
  negative_questions: {
    icon: 'alert-circle',
    defaultTitle: { ru: 'Вопросы с not', uk: 'Питання з not', en: 'Questions with not', es: 'Preguntas con not', 'pt-BR': 'Perguntas com not', vi: 'Câu hỏi với not', id: 'Pertanyaan dengan not', tr: 'not ile sorular', pl: 'Pytania z not' },
    color: (t) => t.accentText,
  },
  mistakes: {
    icon: 'warning',
    defaultTitle: { ru: 'Главные ошибки', uk: 'Головні помилки', en: 'Main mistakes', es: 'Errores principales', 'pt-BR': 'Erros principais', vi: 'Lỗi chính', id: 'Kesalahan utama', tr: 'Başlıca hatalar', pl: 'Główne błędy' },
    color: (t) => t.wrong,
  },
};

export function defaultKindTitle(km: KindStyle, lang: Lang, studyTarget: StudyTargetLang): string {
  const titles = km.defaultTitle;
  // зачем (EN_READINESS_R1, 12.10): английский интерфейс получает свой заголовок (раньше legacyIntroValue отдавал русский), остальные плановые языки — как было
  if (isPlannedIntroLang(lang)) return titles[lang];
  if (lang === 'en') return titles.en;
  return legacyIntroValue(lang, studyTarget, titles.ru, titles.uk, titles.es) ?? titles.ru;
}

export const KIND_BY_INDEX: LessonIntroBlockKind[] = ['why', 'how', 'tip'];

export function lessonLevelLabel(lessonId: number): 'A1' | 'A2' | 'B1' | 'B2' {
  if (lessonId <= 8) return 'A1';
  if (lessonId <= 18) return 'A2';
  if (lessonId <= 28) return 'B1';
  return 'B2';
}

export function levelColor(lessonId: number, isLight: boolean): string {
  if (lessonId <= 8) return isLight ? '#15803D' : '#4CAF72'; // theme-exempt: интро урока: пары светлая/тёмная заданы по режиму темы, цвет блока по группе уроков (токены — у «Тем»)
  if (lessonId <= 18) return isLight ? '#0369A1' : '#40B4E8'; // theme-exempt: интро урока: пары светлая/тёмная заданы по режиму темы, цвет блока по группе уроков (токены — у «Тем»)
  if (lessonId <= 28) return isLight ? '#92400E' : '#D4A017'; // theme-exempt: интро урока: пары светлая/тёмная заданы по режиму темы, цвет блока по группе уроков (токены — у «Тем»)
  return isLight ? '#9A3412' : '#DC6428'; // theme-exempt: интро урока: пары светлая/тёмная заданы по режиму темы, цвет блока по группе уроков (токены — у «Тем»)
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
