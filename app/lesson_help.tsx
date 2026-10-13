import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { THEORY_FALLBACK, triLang, type Lang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PracticeBackButton, PracticeHeaderTitle } from '../components/practice/PracticeChrome';
import ScreenGradient from '../components/ScreenGradient';
import ReportErrorButton from '../components/ReportErrorButton';
import type { Theme } from '../constants/theme';
import { withLessonRuntimeAccessBoundary } from './lesson_runtime_access_boundary';
import { getLessonIntroScreens } from './lesson_data_all';
import { getFrenchLessonIntroScreens } from './lesson_intro_screens_fr';
import type { IntroLine, LessonIntroScreen } from './lesson_data_types';
import { frenchStudyActive } from './spanish_content_gate';
import {
  frenchLessonSupportGateCopy,
  lessonSupportContentAvailableForTarget,
} from './lesson_support_target_gate';
import { safeRouterBack } from './navigation_back';
import fk from './feedback/feedback_kit';
import VictoryBurst from '../components/feedback/VictoryBurst';
import { theoryChapterDoneTitle, theoryChapterDoneSubtitle } from './feedback/feedback_i18n';
import {
  Body,
  Example,
  Section,
  type TheoryContent,
  Tip,
  Warn,
} from '../components/lesson_help_theory_ui';
import { getTheoryContent } from './lesson_help_theory_registry';

// ─── Экран теории урока ───────────────────────────────────────────────────────
//
// PERF (D4): презентационные компоненты вынесены в components/lesson_help_theory_ui.tsx,
// а тяжёлый литерал контента THEORY (~19k строк) — в components/lesson_help_theory_data.tsx
// за ленивым require()-сеймом app/lesson_help_theory_registry.ts. Правила заполнения
// THEORY и сами компоненты см. в этих модулях. Здесь остаётся только экран.

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
    // зачем (координатор 12.10): своей теории для английского нет; режим 'es' — испанская, режим 'hide' — экран «недоступно» (ниже), не кириллица.
    en: THEORY_FALLBACK === 'es' ? 'es' : 'ru',
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



// ─── Главный компонент ────────────────────────────────────────────────────────

function LessonHelp() {
  const router = useRouter();
  const { id, lessonId: lessonIdParam } = useLocalSearchParams<{ id: string | string[]; lessonId: string | string[] }>();
  const rawId = Array.isArray(id) ? id[0] : id;
  const rawLessonId = Array.isArray(lessonIdParam) ? lessonIdParam[0] : lessonIdParam;
  const lessonId = Number(rawId || rawLessonId) || 1;
  const { studyTarget } = useStudyTarget();
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  // зачем (владелец 2026-09-30): теория — 1:1 по learn.html G (Liquid Glass): шапка с круглой «‹»,
  // крупный заголовок 30/700, блоки правил на стекле. Общие блоки теории берут цвета из темы,
  // поэтому им отдаём копию темы с поверхностями стекла (зелёный/красный отклик не трогаем).
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const tg = useMemo(() => ({ ...t, bgCard: glass.card, bgSurface: glass.opaqueControl, border: glass.line }), [t, glass.card, glass.opaqueControl, glass.line]);
  const { lang } = useLang();
  const isFrenchTarget = frenchStudyActive(studyTarget);
  const frenchTheoryAllowed = !isFrenchTarget || lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId);
  const frenchTheoryScreens = isFrenchTarget && frenchTheoryAllowed ? getFrenchLessonIntroScreens(lessonId) : undefined;
  const theory = getTheoryContent(lessonId);
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
  const unavailableTheoryTitle = triLang(lang, {
    uk: `Урок ${lessonId}`,
    ru: `Урок ${lessonId}`,
    en: `Lesson ${lessonId}`,
    es: `Lección ${lessonId}`,
    'pt-BR': `Lição ${lessonId}`,
    vi: `Bài ${lessonId}`,
    id: `Pelajaran ${lessonId}`,
    tr: `Ders ${lessonId}`,
    pl: `Lekcja ${lessonId}`,
  });
  const unavailableTheoryText = triLang(lang, {
    uk: `Теорія для уроку ${lessonId} незабаром з'явиться. Продовжуй практикуватись!`,
    ru: `Теория для урока ${lessonId} скоро появится. Пока практикуйся — это важнее!`,
    en: `Theory for lesson ${lessonId} is coming soon. Keep practicing — it matters more!`,
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
          gap: 10,
        }}>
          <PracticeBackButton
            glass={glass}
            color={glass.text}
            onPress={() => { fk.tap(); safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any); }}
            testID="lesson-help-back"
            accessibilityLabel={triLang(lang, {
              uk: 'Назад', ru: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
          />
          <PracticeHeaderTitle
            glass={glass}
            title={triLang(lang, {
              uk: `Урок ${lessonId} — Теорія`,
              ru: `Урок ${lessonId} — Теория`,
              en: `Lesson ${lessonId} — Theory`,
              es: `Lección ${lessonId} — Teoría`,
              'pt-BR': `Lição ${lessonId} — Teoria`,
              vi: `Bài ${lessonId} — Lý thuyết`,
              id: `Pelajaran ${lessonId} — Teori`,
              tr: `Ders ${lessonId} — Teori`,
              pl: `Lekcja ${lessonId} — Teoria`,
            })}
            subtitle={triLang(lang, {
              uk: 'Коротко: правило + приклади',
              ru: 'Правило и примеры',
              en: 'Rule and examples',
              es: 'Resumen: regla y ejemplos',
              'pt-BR': 'Resumo: regra e exemplos',
              vi: 'Tóm tắt: quy tắc + ví dụ',
              id: 'Ringkas: aturan + contoh',
              tr: 'Kısa özet: kural ve örnekler',
              pl: 'Krótko: zasada i przykłady',
            })}
          />
        </View>

        {/* Content */}
        <ScrollView
          decelerationRate="fast"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={true}
        >
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
            style={{ color: glass.text, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4, marginBottom: 16 }}
          >
            {isFrenchTarget
              ? (frenchTheoryGateCopy?.title ?? frenchTheoryTitle ?? unavailableTheoryTitle)
              : theory
              ? theoryTitleForLang(lessonId, theory, lang, theoryTitleEs)
              : unavailableTheoryTitle}
          </Text>
          {showSpanishTheoryNotice ? (
            <Warn
              t={tg}
              f={f}
              text="La teoría detallada está, por ahora, solo en ruso o en ucraniano; los ejemplos en inglés no cambian. Poco a poco añadiremos estas explicaciones también en español." /* i18n-ok: подсказка показывается только при испанском интерфейсе (showSpanishTheoryNotice) */
            />
          ) : null}
          {isFrenchTarget && frenchTheoryGateCopy ? (
            <Body
              key="french-theory-source-gate"
              t={tg}
              f={f}
              text={frenchTheoryGateCopy.body}
            />
          ) : isFrenchTarget && frenchTheoryScreens?.length ? (
            renderFrenchTheoryFromIntroScreens(frenchTheoryScreens, tg, lang, f)
          ) : isFrenchTarget ? (
            <Body
              key="unavailable"
              t={tg}
              f={f}
              text={unavailableTheoryText}
            />
          ) : plannedTheoryScreens?.length ? (
            renderFrenchTheoryFromIntroScreens(plannedTheoryScreens, tg, lang, f)
          ) : plannedLocale ? (
            <Body
              key="planned-locale-theory-unavailable"
              t={tg}
              f={f}
              text={unavailableTheoryText}
            />
          ) : lang === 'en' && THEORY_FALLBACK === 'hide' ? (
            // зачем (координатор 12.10): английской теории нет — честное «скоро», а не русский текст (прямой заход по ссылке).
            <Body
              key="en-theory-hidden"
              t={tg}
              f={f}
              text={unavailableTheoryText}
            />
          ) : theory ? (
            renderSpanishTheory ? theory.renderES!(tg, f) : theory.render(tg, renderLegacyAsUk, f)
          ) : (
            <Body
              key="unavailable"
              t={tg}
              f={f}
              text={unavailableTheoryText}
            />
          )}

          <ReportErrorButton
            screen="theory"
            dataId={`theory_lesson_${lessonId}`}
            dataText={`theory_lesson_${lessonId}`} // зачем: служебная метка для репорта, не UI
            style={{ alignSelf: 'flex-end', marginTop: 16 }}
          />

        </ScrollView>
      </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

export default withLessonRuntimeAccessBoundary(LessonHelp);
