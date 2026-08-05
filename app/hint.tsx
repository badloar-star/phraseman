import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import TapScale from '../components/TapScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { T, type Lang, triLang } from '../constants/i18n';
import { useStudyTarget } from '../components/StudyTargetContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import TonalSurface from '../components/TonalSurface';
import {
  frenchLessonSupportGateCopy,
  lessonSupportContentAvailableForTarget,
} from './lesson_support_target_gate';
import { safeRouterBack } from './navigation_back';
import BouncyScrollView from '../components/BouncyScrollView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TheoryLessonView, {
  type TheorySection,
  type TheoryBlock,
} from '../components/theory/TheoryLessonView';
import { LESSON1_THEORY } from './theory_content_lesson1';
import { getTheoryContent, hasTheoryContent, type LessonTheoryContent } from './theory_content_registry';
import { legacyRuUk } from '../constants/i18n';
import { registerXP } from './xp_manager';
import { updateTaskProgress } from './daily_tasks';
import { lessonTheorySectionsSeenKey, lessonTheoryXpClaimedKey } from './target_storage_keys';

function L(
  lang: Lang,
  ru: string,
  uk: string,
  es: string,
  ptBr: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): string {
  return triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

// ─── Новая теория (дорогой минимализм) — экран для урока 1 ──────────────────

/** Добавочные интерактивные тренировки по номеру раздела (грамматика выверена по Cambridge). */
function drillsForSection(num: string): TheoryBlock[] {
  switch (num) {
    case '02':
      return [{ kind: 'drill', drill: { type: 'choice', before: 'She', after: 'ready', options: ['am', 'is', 'are'], answer: 'is', why: { ru: 'She — это he/she/it, поэтому идёт is.', es: 'She es del grupo he/she/it, por eso va is.' } } }];
    case '05':
      return [{ kind: 'drill', drill: { type: 'word_bank', prompt: { ru: 'Она готова', es: 'Ella está lista' }, answer: ['She', 'is', 'ready'], slotLabels: [{ ru: 'кто', es: 'quién' }, { ru: 'связка', es: 'verbo' }, { ru: 'описание', es: 'descripción' }], distractors: ['He', 'busy'] } }];
    case '14':
      return [{ kind: 'drill', drill: { type: 'spot_slip', chips: ['I', 'are', 'ready'], answerIndex: 1, hint: { ru: 'Тут не та форма. Тапни лишнее слово.', es: 'Aquí hay una forma incorrecta. Toca la palabra que sobra.' }, fix: { ru: 'С I всегда am: I am ready.', es: 'Con I siempre va am: I am ready.' } } }];
    case '15':
      return [{ kind: 'drill', drill: { type: 'binary', question: { ru: 'Где верно?', es: '¿Cuál es correcta?' }, optionA: 'He are busy', optionB: 'He is busy', correct: 'B', explain: { ru: 'С he / she / it нужно is.', es: 'Con he / she / it se usa is.' } } }];
    default:
      return [];
  }
}

/** Язык контента теории: es явный, остальные через legacyRuUk (ru fallback). */
type TheoryContentLang = 'ru' | 'uk' | 'es';

function theoryContentLang(lang: Lang): TheoryContentLang {
  if (lang === 'es') return 'es';
  return legacyRuUk(lang) === 'uk' ? 'uk' : 'ru';
}

/** Преобразует контент любого урока в формат движка теории по текущему языку. */
function buildTheorySections(content: LessonTheoryContent, lang: Lang): TheorySection[] {
  const key = theoryContentLang(lang);
  const pickText = (b: { ru?: string; uk?: string; es?: string }): string | undefined => {
    if (key === 'es') return b.es ?? b.ru;
    if (key === 'uk') return b.uk ?? b.ru;
    return b.ru;
  };
  return content.sections.map((s) => {
    const blocks: TheoryBlock[] = s.blocks.map((b): TheoryBlock => {
      if (b.kind === 'examples') {
        return {
          kind: 'examples',
          examples: (b.examples ?? []).map((e) => ({
            en: key === 'es' ? (e.labelEs ?? e.en) : key === 'uk' ? (e.labelUk ?? e.en) : e.en,
            translation: key === 'es' ? (e.es || e.ru) : key === 'uk' ? e.uk : e.ru,
            hi: e.hi,
          })),
        };
      }
      if (b.kind === 'formula') {
        return { kind: 'formula', formula: key === 'es' ? (b.formulaEs ?? b.formula) : b.formula };
      }
      if (b.kind === 'fix') return { kind: 'fix', fixes: b.fixes };
      // drill: тренировка прямо из данных урока (уроки 2-32)
      if (b.kind === 'drill') return { kind: 'drill', drill: b.drill as TheoryBlock['drill'] };
      // body / tip
      return { kind: b.kind, text: pickText(b) };
    });
    // Для урока 1 тренировки добавляются из drillsForSection (исторически);
    // для остальных drill уже лежат в данных, дубль не добавляем.
    const legacyDrills = content === LESSON1_THEORY ? drillsForSection(s.num) : [];
    return {
      num: s.num,
      title: key === 'es' ? s.titleEs : key === 'uk' ? s.titleUk : s.titleRu,
      exampleCount: s.exampleCount,
      defaultOpen: s.defaultOpen,
      blocks: [...blocks, ...legacyDrills],
    };
  });
}

function LessonTheoryNew({ lessonId }: { lessonId: number }) {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const key = theoryContentLang(lang);
  const content = getTheoryContent(lessonId) ?? LESSON1_THEORY;
  const sections = React.useMemo(() => buildTheorySections(content, lang), [content, lang]);
  const title = key === 'es' ? content.titleEs : key === 'uk' ? content.titleUk : content.titleRu;
  const subtitle = undefined;
  const claimStorageKey = React.useMemo(
    () => lessonTheoryXpClaimedKey(lessonId, studyTarget),
    [lessonId, studyTarget],
  );
  const progressStorageKey = React.useMemo(
    () => lessonTheorySectionsSeenKey(lessonId, studyTarget),
    [lessonId, studyTarget],
  );
  const [initialClaimed, setInitialClaimed] = React.useState(false);
  const [claimHydrated, setClaimHydrated] = React.useState(false);
  const claimInFlightRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    setClaimHydrated(false);
    setInitialClaimed(false);
    AsyncStorage.getItem(claimStorageKey)
      .then((value) => {
        if (!cancelled) setInitialClaimed(value === '1');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setClaimHydrated(true);
      });
    updateTaskProgress('open_theory', 1, studyTarget).catch(() => {});
    return () => { cancelled = true; };
  }, [claimStorageKey, studyTarget]);

  const goBack = React.useCallback(() => safeRouterBack(router, '/(tabs)/home' as any), [router]);

  const handleClaimXP = React.useCallback(async (): Promise<boolean> => {
    if (claimInFlightRef.current) return false;
    claimInFlightRef.current = true;
    try {
      if ((await AsyncStorage.getItem(claimStorageKey)) === '1') {
        setInitialClaimed(true);
        return true;
      }
      await AsyncStorage.setItem(claimStorageKey, '1');
      const userName = (await AsyncStorage.getItem('user_name')) ?? '';
      await registerXP(25, 'vocabulary_learned', userName, lang, lessonId, {
        eventId: [
          'vocabulary',
          String(studyTarget ?? 'na').replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 40) || 'na',
          String(lessonId),
          'theory',
          'claim',
        ].join(':'),
        payload: { lessonId, studyTarget, surface: 'lesson_theory' },
      });
      return true;
    } catch {
      await AsyncStorage.removeItem(claimStorageKey).catch(() => {});
      return false;
    } finally {
      claimInFlightRef.current = false;
    }
  }, [claimStorageKey, lessonId, studyTarget, lang]);

  if (!claimHydrated) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.textMuted }}>...</Text>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <TheoryLessonView
      lessonId={lessonId}
      title={title}
      subtitle={subtitle}
      sections={sections}
      xpAmount={25}
      initialClaimed={initialClaimed}
      progressStorageKey={progressStorageKey}
      onClaimXP={handleClaimXP}
      onBack={goBack}
    />
  );
}

function TableHeader({ cols, t, f }: { cols: string[]; t: any; f: any }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.bgSurface, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
      {cols.map((col, i) => (
        <View key={i} style={[
          { flex: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
          i < cols.length - 1 && { borderRightWidth: 0.5, borderRightColor: t.border },
        ]}>
          <Text style={{ color: t.textSecond, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' }} maxFontSizeMultiplier={1}>
            {col}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TableRow({ cells, isEven, t, f, firstBold }: { cells: string[]; isEven: boolean; t: any; f: any; firstBold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: isEven ? t.bgCard : t.bgSurface, borderTopWidth: 0.5, borderTopColor: t.border }}>
      {cells.map((cell, i) => (
        <View key={i} style={[
          { flex: 1, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center' },
          i < cells.length - 1 && { borderRightWidth: 0.5, borderRightColor: t.border },
        ]}>
          <Text style={{ color: t.textPrimary, fontSize: 11, fontWeight: (i === 0 && firstBold) ? '700' : '400', lineHeight: 17 }} maxFontSizeMultiplier={1}>
            {cell}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Table({ label, headers, rows, t, f, firstBold }: {
  label?: string; headers: string[]; rows: string[][]; t: any; f: any; firstBold?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ color: t.textSecond, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }} maxFontSizeMultiplier={1}>
          {label}
        </Text>
      )}
      <View style={{ borderWidth: 0, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
        <TableHeader cols={headers} t={t} f={f} />
        {rows.map((row, i) => (
          <TableRow key={i} cells={row} isEven={i % 2 === 0} t={t} f={f} firstBold={firstBold} />
        ))}
      </View>
    </View>
  );
}

type HintContent = {
  titleRU: string;
  titleUK: string;
  titleES: string;
  titlePtBr: string;
  titleVi: string;
  titleId: string;
  titleTr: string;
  titlePl: string;
  render: (t: any, lang: Lang, f: any) => React.ReactNode;
};

const HINTS: Record<number, HintContent> = {
  1: {
    titleRU: 'To Be — am / is / are',
    titleUK: 'To Be — am / is / are',
    titleES: 'To be — am / is / are',
    titlePtBr: 'To be — am / is / are',
    titleVi: 'To be — am / is / are',
    titleId: 'To be — am / is / are',
    titleTr: 'To be — am / is / are',
    titlePl: 'To be — am / is / are',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Подлежащее", "Підмет", "Sujeto", "Sujeito", "Chủ ngữ", "Subjek", "Özne", "Podmiot"), L(lang, "Утверждение", "Ствердження", "Afirmación", "Afirmação", "Khẳng định", "Pernyataan", "Olumlu cümle", "Twierdzenie"), L(lang, "Отрицание", "Заперечення", "Negación", "Negação", "Phủ định", "Negasi", "Olumsuz", "Przeczenie"), L(lang, "Вопрос", "Питання", "Pregunta", "Pergunta", "Câu hỏi", "Pertanyaan", "Soru", "Pytanie")]}
        rows={[
          ['I',    "I am / I\'m",       "I\'m not",      'Am I?'    ],
          ['You',  "You are / You\'re", "You aren\'t",   'Are you?' ],
          ['He',   "He is / He\'s",     "He isn\'t",     'Is he?'   ],
          ['She',  "She is / She\'s",   "She isn\'t",    'Is she?'  ],
          ['It',   "It is / It\'s",     "It isn\'t",     'Is it?'   ],
          ['We',   "We are / We\'re",   "We aren\'t",    'Are we?'  ],
          ['They', 'They are',         "They aren\'t",  'Are they?'],
        ]}
      />,
    ],
  },
  2: {
    titleRU: 'To Be — отрицание и вопросы',
    titleUK: 'To Be — заперечення і питання',
    titleES: 'To be — negación y preguntas',
    titlePtBr: 'To be — negação e perguntas',
    titleVi: 'To be — phủ định và câu hỏi',
    titleId: 'To be — negasi dan pertanyaan',
    titleTr: 'To be — olumsuz ve sorular',
    titlePl: 'To be — przeczenie i pytania',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={L(lang, "Отрицание (нет «являться» у глагола)", "Заперечення (не є)", "Negación", "Negação", "Phủ định", "Negasi", "Olumsuz", "Przeczenie")}
        headers={[L(lang, "Подлежащее", "Підмет", "Sujeto", "Sujeito", "Chủ ngữ", "Subjek", "Özne", "Podmiot"), L(lang, "Полная форма", "Повна форма", "Forma completa", "Forma completa", "Dạng đầy đủ", "Bentuk lengkap", "Tam biçim", "Pełna forma"), L(lang, "Сокращение", "Скорочення", "Forma corta", "Forma curta", "Dạng rút gọn", "Bentuk pendek", "Kısa biçim", "Krótka forma")]}
        rows={[
          ['I',         'I am not',     "I\'m not"    ],
          ['He/She/It', 'He is not',    "He isn\'t"   ],
          ['You/We/They','You are not', "You aren\'t" ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Вопросы и краткие ответы", "Питання та короткі відповіді", "Preguntas y respuestas breves", "Perguntas e respostas curtas", "Câu hỏi và trả lời ngắn", "Pertanyaan dan jawaban pendek", "Sorular ve kısa cevaplar", "Pytania i krótkie odpowiedzi")}
        headers={[L(lang, "Вопрос", "Питання", "Pregunta", "Pergunta", "Câu hỏi", "Pertanyaan", "Soru", "Pytanie"), L(lang, "Да", "Так", "Sí", "Sim", "Có", "Ya", "Evet", "Tak"), L(lang, "Нет", "Ні", "No", "Não", "Không", "Tidak", "Hayır", "Nie")]}
        rows={[
          ['Am I right?',      'Yes, you are.',  "No, you aren\'t."  ],
          ['Is he a doctor?',  'Yes, he is.',    "No, he isn\'t."    ],
          ['Are they at home?','Yes, they are.', "No, they aren\'t." ],
        ]}
      />,
    ],
  },
  3: {
    titleRU: 'Present Simple — утверждение',
    titleUK: 'Present Simple — ствердження',
    titleES: 'Present Simple — afirmación',
    titlePtBr: 'Present Simple — afirmação',
    titleVi: 'Present Simple — câu khẳng định',
    titleId: 'Present Simple — kalimat afirmatif',
    titleTr: 'Present Simple — olumlu cümle',
    titlePl: 'Present Simple — zdanie twierdzące',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label="I / You / We / They"
        headers={[L(lang, "Глагол", "Дієслово", "Verbo", "Verbo", "Động từ", "Verba", "Fiil", "Czasownik"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[['work','I work every day.'],['go','We go to school.'],['study','They study English.'],['like','You like coffee.']]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label="He / She / It → +s / +es"
        headers={[L(lang, "Правило", "Правило", "Regla", "Regra", "Quy tắc", "Aturan", "Kural", "Reguła"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['Більшість + s',        'work → works, read → reads'    ],
          ['-o/-sh/-ch/-x + es',   'go → goes, watch → watches'    ],
          ['Приголосна + y → ies', 'study → studies, fly → flies'  ],
          ['have → has',           'She has a car.'                ],
        ] : lang === 'es' ? [
          ['Mayoría + -s',         'work → works, read → reads'    ],
          ['Termin. en -o/-sh/-ch/-x + -es','go → goes, watch → watches'],
          ['Consonante + y → -ies','study → studies, fly → flies'  ],
          ['have → has',           'She has a car.'                ],
        ] : [
          ['Большинство + s',      'work → works, read → reads'    ],
          ['-o/-sh/-ch/-x + es',   'go → goes, watch → watches'    ],
          ['Согл. + y → ies',      'study → studies, fly → flies'  ],
          ['have → has',           'She has a car.'                ],
        ]}
      />,
    ],
  },
  4: {
    titleRU: 'Present Simple — отрицание и вопрос',
    titleUK: 'Present Simple — заперечення і питання',
    titleES: 'Present Simple — negación e interrogación',
    titlePtBr: 'Present Simple — negação e pergunta',
    titleVi: 'Present Simple — phủ định và câu hỏi',
    titleId: 'Present Simple — negasi dan pertanyaan',
    titleTr: 'Present Simple — olumsuzluk ve soru',
    titlePl: 'Present Simple — przeczenie i pytanie',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Подлежащее", "Підмет", "Sujeto", "Sujeito", "Chủ ngữ", "Subjek", "Özne", "Podmiot"), L(lang, "Отрицание", "Заперечення", "Negación", "Negação", "Phủ định", "Negasi", "Olumsuz", "Przeczenie"), L(lang, "Вопрос", "Питання", "Pregunta", "Pergunta", "Câu hỏi", "Pertanyaan", "Soru", "Pytanie")]}
        rows={[
          ['I / You / We / They', "don\'t + V",   'Do + ... + V?'  ],
          ['He / She / It',       "doesn\'t + V", 'Does + ... + V?'],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Примеры", "Приклади", "Ejemplos", "Exemplos", "Ví dụ", "Contoh", "Örnekler", "Przykłady")}
        headers={[L(lang, "Утверждение", "Ствердження", "Afirmación", "Afirmação", "Khẳng định", "Pernyataan", "Olumlu cümle", "Twierdzenie"), L(lang, "Отрицание", "Заперечення", "Negación", "Negação", "Phủ định", "Negasi", "Olumsuz", "Przeczenie")]}
        rows={[
          ['I work here.',       "I don\'t work here."    ],
          ['She reads books.',   "She doesn\'t read."     ],
          ['They play tennis.',  "They don\'t play."      ],
        ]}
      />,
    ],
  },
  5: {
    titleRU: 'Present Simple — вопросы',
    titleUK: 'Present Simple — питання',
    titleES: 'Present Simple — preguntas',
    titlePtBr: 'Present Simple — perguntas',
    titleVi: 'Present Simple — câu hỏi',
    titleId: 'Present Simple — pertanyaan',
    titleTr: 'Present Simple — sorular',
    titlePl: 'Present Simple — pytania',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={L(lang, "Общие вопросы", "Загальні питання", "Preguntas generales", "Perguntas gerais", "Câu hỏi yes/no", "Pertanyaan umum", "Genel sorular", "Pytania ogólne")}
        headers={[L(lang, "Подлежащее", "Підмет", "Sujeto", "Sujeito", "Chủ ngữ", "Subjek", "Özne", "Podmiot"), L(lang, "Вопрос", "Питання", "Pregunta", "Pergunta", "Câu hỏi", "Pertanyaan", "Soru", "Pytanie"), L(lang, "Ответ", "Відповідь", "Respuesta", "Resposta", "Câu trả lời", "Jawaban", "Cevap", "Odpowiedź")]}
        rows={[
          ['I / You / We / They', 'Do you work?',   "Yes, I do. / No, I don\'t."        ],
          ['He / She / It',       'Does she work?', "Yes, she does. / No, she doesn\'t."],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Специальные вопросы (Wh-)", "Спеціальні питання (Wh-)", "Preguntas Wh-", "Perguntas Wh-", "Câu hỏi Wh-", "Pertanyaan Wh-", "Wh soruları", "Pytania Wh-")}
        headers={['Wh-', L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['What',  'What do you do?'     ],
          ['Where', 'Where does she live?'],
          ['When',  'When do they eat?'   ],
          ['Why',   'Why does he work?'   ],
          ['How',   'How do you feel?'    ],
        ]}
      />,
    ],
  },
  6: {
    titleRU: 'Специальные вопросы',
    titleUK: 'Спеціальні питання',
    titleES: 'Preguntas Wh-',
    titlePtBr: 'Perguntas Wh-',
    titleVi: 'Câu hỏi Wh-',
    titleId: 'Pertanyaan Wh-',
    titleTr: 'Wh soruları',
    titlePl: 'Pytania Wh-',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={['Wh-', L(lang, "Значение", "Значення", "Significado", "Significado", "Nghĩa", "Arti", "Anlam", "Znaczenie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['What',  'Що / Який',    'What do you want?'       ],
          ['Who',   'Хто',          'Who lives here?'         ],
          ['Where', 'Де / Куди',    'Where are you going?'    ],
          ['When',  'Коли',         'When does it start?'     ],
          ['Why',   'Чому',         'Why are you late?'       ],
          ['How',   'Як',           'How do you feel?'        ],
          ['Which', 'Який (вибір)', 'Which book do you like?' ],
          ['Whose', 'Чий',          'Whose bag is this?'      ],
        ] : lang === 'es' ? [
          ['What',  'qué / cuál',   'What do you want?'       ],
          ['Who',   'quién',        'Who lives here?'         ],
          ['Where', 'dónde / adónde','Where are you going?'    ],
          ['When',  'cuándo',       'When does it start?'     ],
          ['Why',   'por qué',      'Why are you late?'       ],
          ['How',   'cómo',         'How do you feel?'        ],
          ['Which', 'cuál (opción)','Which book do you like?' ],
          ['Whose', 'de quién',     'Whose bag is this?'      ],
        ] : [
          ['What',  'Что / Какой',  'What do you want?'       ],
          ['Who',   'Кто',          'Who lives here?'         ],
          ['Where', 'Где / Куда',   'Where are you going?'    ],
          ['When',  'Когда',        'When does it start?'     ],
          ['Why',   'Почему',       'Why are you late?'       ],
          ['How',   'Как',          'How do you feel?'        ],
          ['Which', 'Который',      'Which book do you like?' ],
          ['Whose', 'Чей',          'Whose bag is this?'      ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Формула специального вопроса", "Формула спеціального питання", "Estructura de la pregunta Wh-", "Estrutura da pergunta Wh-", "Cấu trúc câu hỏi Wh-", "Struktur pertanyaan Wh-", "Wh soru yapısı", "Struktura pytania Wh-")}
        headers={[L(lang, "Подлежащее", "Підмет", "Sujeto", "Sujeito", "Chủ ngữ", "Subjek", "Özne", "Podmiot"), L(lang, "Формула", "Формула", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['I / You / We / They',
            lang === 'uk' ? 'Wh- + do + підмет + дієслово?' : lang === 'es' ? 'Wh- + do + sujeto + verbo?' : 'Wh- + do + подлежащее + глагол?',
            'Where do you live?'  ],
          ['He / She / It',
            lang === 'uk' ? 'Wh- + does + підмет + дієслово?' : lang === 'es' ? 'Wh- + does + sujeto + verbo?' : 'Wh- + does + подлежащее + глагол?',
            'Where does he work?' ],
        ]}
      />,
    ],
  },
  7: {
    titleRU: 'To Have — иметь',
    titleUK: 'To Have — мати',
    titleES: 'To have — tener',
    titlePtBr: 'To have — ter',
    titleVi: 'To have — có',
    titleId: 'To have — memiliki',
    titleTr: 'To have — sahip olmak',
    titlePl: 'To have — mieć',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Подлежащее", "Підмет", "Sujeto", "Sujeito", "Chủ ngữ", "Subjek", "Özne", "Podmiot"), L(lang, "Утверждение", "Ствердження", "Afirmación", "Afirmação", "Khẳng định", "Pernyataan", "Olumlu cümle", "Twierdzenie"), L(lang, "Отрицание", "Заперечення", "Negación", "Negação", "Phủ định", "Negasi", "Olumsuz", "Przeczenie"), L(lang, "Вопрос", "Питання", "Pregunta", "Pergunta", "Câu hỏi", "Pertanyaan", "Soru", "Pytanie")]}
        rows={[
          ['I / You / We / They', 'have', "don\'t have",   'Do ... have?'  ],
          ['He / She / It',       'has',  "doesn\'t have", 'Does ... have?'],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Примеры", "Приклади", "Ejemplos", "Exemplos", "Ví dụ", "Contoh", "Örnekler", "Przykłady")}
        headers={[L(lang, "Предложение", "Речення", "Oración", "Frase", "Câu", "Kalimat", "Cümle", "Zdanie")]}
        rows={[
          ['I have a car.'],['She has two cats.'],["He doesn\'t have a phone."],
          ['Do you have a pen?'],['Does she have time?'],
        ]}
      />,
    ],
  },
  8: {
    titleRU: 'Предлоги времени: at / in / on',
    titleUK: 'Прийменники часу: at / in / on',
    titleES: 'Preposiciones de tiempo: at / in / on',
    titlePtBr: 'Preposições de tempo: at / in / on',
    titleVi: 'Giới từ thời gian: at / in / on',
    titleId: 'Preposisi waktu: at / in / on',
    titleTr: 'Zaman edatları: at / in / on',
    titlePl: 'Przyimki czasu: at / in / on',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Предлог", "Прийменник", "Preposición", "Preposição", "Giới từ", "Preposisi", "Edat", "Przyimek"), L(lang, "Употребляется с", "Вживається з", "Va con", "Combina com", "Đi với", "Dipakai dengan", "Şununla kullanılır", "Łączy się z"), L(lang, "Примеры", "Приклади", "Ejemplos", "Exemplos", "Ví dụ", "Contoh", "Örnekler", "Przykłady")]}
        rows={lang === 'uk' ? [
          ['AT', 'Точний час, полудень, ніч',    'at 7:00, at noon, at night'       ],
          ['IN', 'Місяць, рік, сезон, час доби', 'in May, in 2024, in the morning'  ],
          ['ON', 'День тижня, дата, вихідні',     'on Monday, on weekends, on 5 March' ],
        ] : lang === 'es' ? [
          ['AT', 'Hora puntual, mediodía, noche','at 7:00, at noon, at night'       ],
          ['IN', 'Mes, año, estación, momento del día','in May, in 2024, in the morning'],
          ['ON', 'Día de la semana, fecha, fines de semana','on Monday, on weekends, on 5 March'],
        ] : [
          ['AT', 'Точное время, полдень, ночь',  'at 7:00, at noon, at night'       ],
          ['IN', 'Месяц, год, сезон, часть дня', 'in May, in 2024, in the morning'  ],
          ['ON', 'День недели, дата, выходные',   'on Monday, on weekends, on 5 March' ],
        ]}
      />,
    ],
  },
  9: {
    titleRU: 'There is / There are',
    titleUK: 'There is / There are',
    titleES: 'There is / There are',
    titlePtBr: 'There is / There are',
    titleVi: 'There is / There are',
    titleId: 'There is / There are',
    titleTr: 'There is / There are',
    titlePl: 'There is / There are',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Число", "Число", "Número", "Número", "Số", "Jumlah", "Sayı", "Liczba"), L(lang, "Утверждение", "Ствердження", "Afirmación", "Afirmação", "Khẳng định", "Pernyataan", "Olumlu cümle", "Twierdzenie"), L(lang, "Отрицание", "Заперечення", "Negación", "Negação", "Phủ định", "Negasi", "Olumsuz", "Przeczenie"), L(lang, "Вопрос", "Питання", "Pregunta", "Pergunta", "Câu hỏi", "Pertanyaan", "Soru", "Pytanie")]}
        rows={[
          [L(lang, "Ед.ч.", "Одн.", "Sing.", "Sing.", "Số ít", "Tunggal", "Tekil", "L.poj."), 'There is a book.',  "There isn\'t a book.",   'Is there a book?'  ],
          [L(lang, "Мн.ч.", "Мн.", "Plur.", "Plur.", "Số nhiều", "Jamak", "Çoğ.", "L.mn."),  'There are chairs.', "There aren\'t chairs.",  'Are there chairs?' ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Предлоги места", "Прийменники місця", "Preposiciones de lugar", "Preposições de lugar", "Giới từ nơi chốn", "Preposisi tempat", "Yer edatları", "Przyimki miejsca")}
        headers={[L(lang, "Предлог", "Прийменник", "Prep.", "Prep.", "Giới từ", "Prep.", "Edat", "Przyim."), L(lang, "Значение", "Значення", "Significado", "Significado", "Nghĩa", "Arti", "Anlam", "Znaczenie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['in',          'всередині',  'The cat is in the box.'          ],
          ['on',          'на',         'The book is on the table.'       ],
          ['under',       'під',        'The bag is under the desk.'      ],
          ['next to',     'поряд з',    'She sits next to me.'            ],
          ['between',     'між',        'He stands between us.'           ],
          ['behind',      'позаду',     'The park is behind us.'          ],
          ['in front of', 'перед',      'The car is in front of the house.'],
          ['opposite',    'навпроти',   'The bank is opposite the school.'],
        ] : lang === 'es' ? [
          ['in',          'dentro de',  'The cat is in the box.'          ],
          ['on',          'encima de',  'The book is on the table.'       ],
          ['under',       'debajo de',  'The bag is under the desk.'      ],
          ['next to',     'junto a',    'She sits next to me.'            ],
          ['between',     'entre',      'He stands between us.'           ],
          ['behind',      'detrás de',  'The park is behind us.'          ],
          ['in front of', 'delante de', 'The car is in front of the house.'],
          ['opposite',    'frente a',   'The bank is opposite the school.'],
        ] : [
          ['in',          'внутри',     'The cat is in the box.'          ],
          ['on',          'на',         'The book is on the table.'       ],
          ['under',       'под',        'The bag is under the desk.'      ],
          ['next to',     'рядом с',    'She sits next to me.'            ],
          ['between',     'между',      'He stands between us.'           ],
          ['behind',      'позади',     'The park is behind us.'          ],
          ['in front of', 'перед',      'The car is in front of the house.'],
          ['opposite',    'напротив',   'The bank is opposite the school.'],
        ]}
      />,
    ],
  },
  10: {
    titleRU: 'Модальные глаголы',
    titleUK: 'Модальні дієслова',
    titleES: 'Verbos modales',
    titlePtBr: 'Verbos modais',
    titleVi: 'Động từ khuyết thiếu',
    titleId: 'Verba modal',
    titleTr: 'Kip fiilleri',
    titlePl: 'Czasowniki modalne',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Глагол", "Дієслово", "Verbo", "Verbo", "Động từ", "Verba", "Fiil", "Czasownik"), L(lang, "Значение", "Значення", "Significado", "Significado", "Nghĩa", "Arti", "Anlam", "Znaczenie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['can',     'вміти / мати змогу',   'I can swim.'             ],
          ["can\'t",   'не вміти / не можна',  "You can\'t park here."    ],
          ['must',    'мусити (внутрішня потреба)',   'I must finish this.'     ],
          ["mustn\'t", 'заборона',                    "You mustn\'t smoke here." ],
          ['should',  'слід / варто',                'You should sleep more.'  ],
          ['may',     'можна (дозвіл)',               'May I come in?'          ],
          ['might',   'можливо (невпевненість)',      'It might rain today.'    ],
          ['have to', 'мусити (зовнішня необхідність)', 'I have to work tomorrow.'],
        ] : lang === 'es' ? [
          ['can',     'poder / saber',          'I can swim.'             ],
          ["can\'t",   'no poder / prohibición', "You can\'t park here."    ],
          ['must',    'obligación (fuerte)',    'I must finish this.'     ],
          ["mustn\'t", 'prohibición terminante', "You mustn\'t smoke here." ],
          ['should',  'aconsejar / conviene',   'You should sleep more.'  ],
          ['may',     'permiso',                'May I come in?'          ],
          ['might',   'quizá / posibilidad débil','It might rain today.' ],
          ['have to', 'tener que',              'I have to work tomorrow.'],
        ] : [
          ['can',     'уметь / мочь',         'I can swim.'             ],
          ["can\'t",   'не уметь / нельзя',    "You can\'t park here."    ],
          ['must',    'должен (внутреннее)',  'I must finish this.'     ],
          ["mustn\'t", 'запрет',               "You mustn\'t smoke here." ],
          ['should',  'следует / стоит',       'You should sleep more.'  ],
          ['may',     'можно (разрешение)',   'May I come in?'          ],
          ['might',   'возможно (неуверенность)', 'It might rain today.'    ],
          ['have to', 'должен (внешнее)',     'I have to work tomorrow.'],
        ]}
      />,
    ],
  },
  11: {
    titleRU: 'Past Simple — правильные глаголы',
    titleUK: 'Past Simple — правильні дієслова',
    titleES: 'Past Simple — verbos regulares',
    titlePtBr: 'Past Simple — verbos regulares',
    titleVi: 'Past Simple — động từ có quy tắc',
    titleId: 'Past Simple — verba beraturan',
    titleTr: 'Past Simple — düzenli fiiller',
    titlePl: 'Past Simple — czasowniki regularne',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Форма", "Форма", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['+', 'Subject + V-ed',       'She worked yesterday.' ],
          ['−', "Subject + didn\'t + V", "She didn\'t work."      ],
          ['?', 'Did + subject + V?',   'Did she work?'         ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Правила написания", "Правила написання", "Reglas ortográficas", "Regras de escrita", "Quy tắc chính tả", "Aturan ejaan", "Yazım kuralları", "Zasady pisowni")}
        headers={[L(lang, "Правило", "Правило", "Regla", "Regra", "Quy tắc", "Aturan", "Kural", "Reguła"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['Більшість + ed',         'work → worked, play → played'   ],
          ['Закінч. на -e',          'like → liked, live → lived'     ],
          ['Приголосна + y → ied',   'study → studied, cry → cried'   ],
          ['CVC → подвоїти',         'stop → stopped, plan → planned' ],
        ] : lang === 'es' ? [
          ['Mayoría + -ed',          'work → worked, play → played'   ],
          ['Termin. en -e',          'like → liked, live → lived'     ],
          ['Consonante + y → -ied', 'study → studied, cry → cried'    ],
          ['CVC → doble consonante','stop → stopped, plan → planned'],
        ] : [
          ['Большинство + ed',       'work → worked, play → played'   ],
          ['Оканч. на -e',           'like → liked, live → lived'     ],
          ['Согл. + y → ied',        'study → studied, cry → cried'   ],
          ['CVC → удвоить',          'stop → stopped, plan → planned' ],
        ]}
      />,
    ],
  },
  12: {
    titleRU: 'Past Simple — неправильные глаголы',
    titleUK: 'Past Simple — неправильні дієслова',
    titleES: 'Past Simple — verbos irregulares',
    titlePtBr: 'Past Simple — verbos irregulares',
    titleVi: 'Past Simple — động từ bất quy tắc',
    titleId: 'Past Simple — verba tidak beraturan',
    titleTr: 'Past Simple — düzensiz fiiller',
    titlePl: 'Past Simple — czasowniki nieregularne',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Форма", "Форма", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['+', 'Subject + V2',          'He went home.'   ],
          ['−', "Subject + didn\'t + V1", "He didn\'t go."   ],
          ['?', 'Did + subject + V1?',   'Did he go?'      ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Частые глаголы", "Часті дієслова", "Verbos frecuentes", "Verbos frequentes", "Động từ thường gặp", "Verba umum", "Sık fiiller", "Częste czasowniki")}
        headers={['V1', 'V2', L(lang, "Значение", "Значення", "Significado", "Significado", "Nghĩa", "Arti", "Anlam", "Znaczenie")]}
        rows={lang === 'uk' ? [
          ['go',    'went',   'іти / їхати'],
          ['come',  'came',   'приходити'  ],
          ['see',   'saw',    'бачити'     ],
          ['get',   'got',    'отримувати' ],
          ['have',  'had',    'мати'       ],
          ['say',   'said',   'говорити'   ],
          ['take',  'took',   'брати'      ],
          ['know',  'knew',   'знати'      ],
          ['think', 'thought','думати'     ],
          ['buy',   'bought', 'купувати'   ],
        ] : lang === 'es' ? [
          ['go',    'went',   'ir'         ],
          ['come',  'came',   'venir'      ],
          ['see',   'saw',    'ver'        ],
          ['get',   'got',    'conseguir'  ],
          ['have',  'had',    'tener'      ],
          ['say',   'said',   'decir'      ],
          ['take',  'took',   'tomar'      ],
          ['know',  'knew',   'saber'      ],
          ['think', 'thought','pensar'     ],
          ['buy',   'bought', 'comprar'    ],
        ] : [
          ['go',    'went',   'идти / ехать'],
          ['come',  'came',   'приходить'   ],
          ['see',   'saw',    'видеть'      ],
          ['get',   'got',    'получать'    ],
          ['have',  'had',    'иметь'       ],
          ['say',   'said',   'говорить'    ],
          ['take',  'took',   'брать'       ],
          ['know',  'knew',   'знать'       ],
          ['think', 'thought','думать'      ],
          ['buy',   'bought', 'покупать'    ],
        ]}
      />,
    ],
  },
  13: {
    titleRU: 'Future Simple — will',
    titleUK: 'Future Simple — will',
    titleES: 'Future Simple — will',
    titlePtBr: 'Future Simple — will',
    titleVi: 'Future Simple — will',
    titleId: 'Future Simple — will',
    titleTr: 'Future Simple — will',
    titlePl: 'Future Simple — will',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Форма", "Форма", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['+',                  'Subject + will + V',  'I will call you.'      ],
          ['−',                  "Subject + won\'t + V", "She won\'t be late."    ],
          ['?',                  'Will + subj + V?',    'Will you help me?'     ],
          [L(lang, "Сокр.", "Скор.", "Contr.", "Contr.", "Viết tắt", "Kontraksi", "Kısaltma", "Skrót"), "I\'ll / You\'ll",       "I\'ll do it tomorrow."  ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Когда использовать", "Коли вживать", "Cuándo usarlo", "Quando usar", "Khi dùng", "Kapan dipakai", "Ne zaman kullanılır", "Kiedy używać")}
        headers={[L(lang, "Ситуация", "Ситуація", "Uso", "Uso", "Cách dùng", "Penggunaan", "Kullanım", "Użycie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['Рішення зараз',          "It\'s cold — I\'ll close the window."],
          ['Обіцянка',               "I\'ll help you tomorrow."           ],
          ['Передбачення (думаю)',    'I think it will rain.'             ],
          ['Прохання / пропозиція',  'Will you open the door?'           ],
        ] : lang === 'es' ? [
          ['Decisión al momento',    "It\'s cold — I\'ll close the window."],
          ['Promesa',               "I\'ll help you tomorrow."           ],
          ['Predicción (suposición)','I think it will rain.'             ],
          ['Petición / oferta',     'Will you open the door?'           ],
        ] : [
          ['Решение прямо сейчас',   "It\'s cold — I\'ll close the window."],
          ['Обещание',               "I\'ll help you tomorrow."           ],
          ['Предсказание (думаю)',    'I think it will rain.'             ],
          ['Просьба / предложение',  'Will you open the door?'           ],
        ]}
      />,
    ],
  },
  14: {
    titleRU: 'Степени сравнения',
    titleUK: 'Ступені порівняння',
    titleES: 'Grados de comparación',
    titlePtBr: 'Graus de comparação',
    titleVi: 'Các cấp so sánh',
    titleId: 'Tingkat perbandingan',
    titleTr: 'Karşılaştırma dereceleri',
    titlePl: 'Stopniowanie',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={L(lang, "Короткие прилагательные", "Короткі прикметники", "Adjetivos cortos", "Adjetivos curtos", "Tính từ ngắn", "Kata sifat pendek", "Kısa sıfatlar", "Krótkie przymiotniki")}
        headers={[L(lang, "Обычное", "Звичайне", "Positivo", "Positivo", "Nguyên thể", "Positif", "Temel", "Stopień równy"), L(lang, "Сравнит.", "Порівняльне", "Comparativo", "Comparativo", "So sánh hơn", "Komparatif", "Karşılaştırma", "Stopień wyższy"), L(lang, "Превосх.", "Найвищий", "Superlativo", "Superlativo", "So sánh nhất", "Superlatif", "Üstünlük", "Stopień najwyższy")]}
        rows={[
          ['old',  'older',   'the oldest'  ],
          ['tall', 'taller',  'the tallest' ],
          ['big',  'bigger',  'the biggest' ],
          ['easy', 'easier',  'the easiest' ],
          ['hot',  'hotter',  'the hottest' ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Длинные прилагательные", "Довгі прикметники", "Adjetivos largos", "Adjetivos longos", "Tính từ dài", "Kata sifat panjang", "Uzun sıfatlar", "Długie przymiotniki")}
        headers={[L(lang, "Обычное", "Звичайне", "Positivo", "Positivo", "Nguyên thể", "Positif", "Temel", "Stopień równy"), L(lang, "Сравнит.", "Порівняльне", "Comparativo", "Comparativo", "So sánh hơn", "Komparatif", "Karşılaştırma", "Stopień wyższy"), L(lang, "Превосх.", "Найвищий", "Superlativo", "Superlativo", "So sánh nhất", "Superlatif", "Üstünlük", "Stopień najwyższy")]}
        rows={[
          ['beautiful',   'more beautiful',   'the most beautiful'  ],
          ['expensive',   'more expensive',   'the most expensive'  ],
          ['interesting', 'more interesting', 'the most interesting'],
        ]}
      />,
      <Table key="t3" t={t} f={f} firstBold
        label={L(lang, "Исключения", "Винятки", "Irregulares", "Irregulares", "Bất quy tắc", "Tidak beraturan", "Düzensizler", "Nieregularne")}
        headers={[L(lang, "Обычное", "Звичайне", "Positivo", "Positivo", "Nguyên thể", "Positif", "Temel", "Stopień równy"), L(lang, "Сравнит.", "Порівняльне", "Comparativo", "Comparativo", "So sánh hơn", "Komparatif", "Karşılaştırma", "Stopień wyższy"), L(lang, "Превосх.", "Найвищий", "Superlativo", "Superlativo", "So sánh nhất", "Superlatif", "Üstünlük", "Stopień najwyższy")]}
        rows={[
          ['good', 'better',  'the best'    ],
          ['bad',  'worse',   'the worst'   ],
          ['far',  'farther', 'the farthest'],
          ['much', 'more',    'the most'    ],
        ]}
      />,
    ],
  },
  15: {
    titleRU: 'Притяжательные местоимения',
    titleUK: 'Присвійні займенники',
    titleES: 'Pronombres y adjetivos posesivos',
    titlePtBr: 'Pronomes possessivos',
    titleVi: 'Đại từ sở hữu',
    titleId: 'Pronomina posesif',
    titleTr: 'İyelik zamirleri',
    titlePl: 'Zaimki dzierżawcze',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Лицо", "Особа", "Persona", "Pessoa", "Ngôi", "Orang", "Kişi", "Osoba"), L(lang, "Перед сущ.", "Перед іменником", "Antes del sust.", "Antes do subst.", "Trước danh từ", "Sebelum nomina", "İsimden önce", "Przed rzecz."), L(lang, "Самостоятельно", "Самостійно", "Apartados", "Separados", "Đứng độc lập", "Berdiri sendiri", "Tek başına", "Samodzielnie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['I',    'my',    'mine',   "This is my bag. — It\'s mine."    ],
          ['You',  'your',  'yours',  "It\'s yours."                     ],
          ['He',   'his',   'his',    "His name is Alex."               ],
          ['She',  'her',   'hers',   "That\'s hers."                    ],
          ['It',   'its',   '—',      "The dog ate its food."           ],
          ['We',   'our',   'ours',   "Our house is big."               ],
          ['They', 'their', 'theirs', "The keys are theirs."            ],
        ]}
      />,
    ],
  },
  16: {
    titleRU: 'Фразовые глаголы',
    titleUK: 'Фразові дієслова',
    titleES: 'Verbos frasales (phrasal verbs)',
    titlePtBr: 'Phrasal verbs',
    titleVi: 'Phrasal verbs',
    titleId: 'Phrasal verbs',
    titleTr: 'Phrasal verbs',
    titlePl: 'Phrasal verbs',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Глагол", "Дієслово", "Verbo", "Verbo", "Động từ", "Verba", "Fiil", "Czasownik"), L(lang, "Значение", "Значення", "Significado", "Significado", "Nghĩa", "Arti", "Anlam", "Znaczenie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['get up',    'вставати',          'I get up at 7.'              ],
          ['turn on',   'вмикати',           'Turn on the light.'          ],
          ['turn off',  'вимикати',          'Turn off the TV.'            ],
          ['look for',  'шукати',            "I\'m looking for my keys."    ],
          ['give up',   'кидати / здаватись',"Don\'t give up!"              ],
          ['find out',  'дізнатися',         'I found out the truth.'      ],
          ['come back', 'повертатися',       'Come back soon.'             ],
          ['put on',    'одягати',           'Put on your coat.'           ],
          ['take off',  'знімати / злітати', 'Take off your shoes.'        ],
          ['go on',     'продовжувати',      'Go on, please.'              ],
        ] : lang === 'es' ? [
          ['get up',    'levantarse',        'I get up at 7.'              ],
          ['turn on',   'encender',          'Turn on the light.'          ],
          ['turn off',  'apagar',            'Turn off the TV.'            ],
          ['look for',  'buscar',            "I\'m looking for my keys."    ],
          ['give up',   'rendirse / dejar',  "Don\'t give up!"              ],
          ['find out',  'averiguar',         'I found out the truth.'      ],
          ['come back', 'volver',             'Come back soon.'             ],
          ['put on',    'ponerse (ropa)',    'Put on your coat.'           ],
          ['take off',  'quitarse / despegar','Take off your shoes.'       ],
          ['go on',     'continuar',         'Go on, please.'              ],
        ] : [
          ['get up',    'вставать',          'I get up at 7.'              ],
          ['turn on',   'включать',          'Turn on the light.'          ],
          ['turn off',  'выключать',         'Turn off the TV.'            ],
          ['look for',  'искать',            "I\'m looking for my keys."    ],
          ['give up',   'бросать / сдаться', "Don\'t give up!"              ],
          ['find out',  'узнать',            'I found out the truth.'      ],
          ['come back', 'возвращаться',      'Come back soon.'             ],
          ['put on',    'надевать',          'Put on your coat.'           ],
          ['take off',  'снимать / взлетать','Take off your shoes.'        ],
          ['go on',     'продолжать',        'Go on, please.'              ],
        ]}
      />,
    ],
  },
  17: {
    titleRU: 'Present Continuous',
    titleUK: 'Present Continuous',
    titleES: 'Present Continuous',
    titlePtBr: 'Present Continuous',
    titleVi: 'Present Continuous',
    titleId: 'Present Continuous',
    titleTr: 'Present Continuous',
    titlePl: 'Present Continuous',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Форма", "Форма", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['+', 'am/is/are + V-ing',         "She\'s working now."    ],
          ['−', "am/is/are + not + V-ing",   "He isn\'t sleeping."    ],
          ['?', 'Am/Is/Are + subj + V-ing?', 'Are they coming?'      ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Правила написания -ing", "Правила написання -ing", "Reglas de -ing", "Regras de -ing", "Quy tắc -ing", "Aturan -ing", "-ing kuralları", "Zasady -ing")}
        headers={[L(lang, "Правило", "Правило", "Regla", "Regra", "Quy tắc", "Aturan", "Kural", "Reguła"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['Більшість + ing',          'work → working, read → reading' ],
          ['На -e → прибрати e',       'come → coming, write → writing' ],
          ['CVC (коротка) → подвоїти', 'run → running, sit → sitting'   ],
          ['На -ie → ying',            'lie → lying, die → dying'       ],
        ] : lang === 'es' ? [
          ['Mayoría + -ing',           'work → working, read → reading' ],
          ['En -e → quitar -e',        'come → coming, write → writing' ],
          ['CVC corta → consonante doble','run → running, sit → sitting'],
          ['En -ie → -ying',           'lie → lying, die → dying'       ],
        ] : [
          ['Большинство + ing',        'work → working, read → reading' ],
          ['На -e → убрать e',         'come → coming, write → writing' ],
          ['CVC (короткое) → удвоить', 'run → running, sit → sitting'   ],
          ['На -ie → ying',            'lie → lying, die → dying'       ],
        ]}
      />,
    ],
  },
  18: {
    titleRU: 'Повелительное наклонение',
    titleUK: 'Наказовий спосіб',
    titleES: 'Modo imperativo',
    titlePtBr: 'Modo imperativo',
    titleVi: 'Câu mệnh lệnh',
    titleId: 'Modus imperatif',
    titleTr: 'Emir kipi',
    titlePl: 'Tryb rozkazujący',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Форма", "Форма", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Примеры", "Приклади", "Ejemplos", "Exemplos", "Ví dụ", "Contoh", "Örnekler", "Przykłady")]}
        rows={lang === 'uk' ? [
          ['Наказ +',   'V (основна форма)', 'Come here! Open the door!'     ],
          ['Наказ −',   "Don\'t + V",         "Don\'t run! Don\'t be late!"     ],
          ["Let\'s",     "Let\'s + V",         "Let\'s go! Let\'s start."        ],
          ['Ввічливо',  'Please + V',        'Please sit down.'              ],
        ] : lang === 'es' ? [
          ['Afirmativo','forma base (you)', 'Come here! Open the door!'     ],
          ['Negativo',  "Don\'t + V",       "Don\'t run! Don\'t be late!"     ],
          ["Let\'s",     "Let\'s + V",       "Let\'s go! Let\'s start."        ],
          ['Cortesía',  'Please + V',      'Please sit down.'              ],
        ] : [
          ['Команда +', 'V (основная форма)','Come here! Open the door!'     ],
          ['Команда −', "Don\'t + V",         "Don\'t run! Don\'t be late!"     ],
          ["Let\'s",     "Let\'s + V",         "Let\'s go! Let\'s start."        ],
          ['Вежливо',   'Please + V',        'Please sit down.'              ],
        ]}
      />,
    ],
  },
  19: {
    titleRU: 'Предлоги места',
    titleUK: 'Прийменники місця',
    titleES: 'Preposiciones de lugar',
    titlePtBr: 'Preposições de lugar',
    titleVi: 'Giới từ nơi chốn',
    titleId: 'Preposisi tempat',
    titleTr: 'Yer edatları',
    titlePl: 'Przyimki miejsca',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Предлог", "Прийменник", "Prep.", "Prep.", "Giới từ", "Prep.", "Edat", "Przyim."), L(lang, "Значение", "Значення", "Significado", "Significado", "Nghĩa", "Arti", "Anlam", "Znaczenie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['in',          'всередині',    'The keys are in the bag.'          ],
          ['on',          'на поверхні',  'The phone is on the table.'        ],
          ['under',       'під',          'The cat is under the chair.'       ],
          ['above',       'над',          'The lamp is above the desk.'       ],
          ['next to',     'поряд з',      'She sits next to the window.'      ],
          ['between',     'між',          'The shop is between the two cafes.'],
          ['behind',      'позаду',       'He is standing behind the door.'   ],
          ['in front of', 'перед',        'The car is in front of the house.' ],
          ['opposite',    'навпроти',     'The school is opposite the park.'  ],
          ['at',          'біля / на',    "I\'m at the station."               ],
        ] : lang === 'es' ? [
          ['in',          'dentro de',    'The keys are in the bag.'          ],
          ['on',          'sobre',        'The phone is on the table.'        ],
          ['under',       'debajo de',    'The cat is under the chair.'       ],
          ['above',       'por encima de','The lamp is above the desk.'       ],
          ['next to',     'junto a',      'She sits next to the window.'      ],
          ['between',     'entre',        'The shop is between the two cafes.'],
          ['behind',      'detrás de',    'He is standing behind the door.'   ],
          ['in front of', 'delante de',   'The car is in front of the house.' ],
          ['opposite',    'enfrente de',  'The school is opposite the park.'  ],
          ['at',          'en',           "I\'m at the station."               ],
        ] : [
          ['in',          'внутри',       'The keys are in the bag.'          ],
          ['on',          'на',           'The phone is on the table.'        ],
          ['under',       'под',          'The cat is under the chair.'       ],
          ['above',       'над',          'The lamp is above the desk.'       ],
          ['next to',     'рядом с',      'She sits next to the window.'      ],
          ['between',     'между',        'The shop is between the two cafes.'],
          ['behind',      'позади',       'He is standing behind the door.'   ],
          ['in front of', 'перед',        'The car is in front of the house.' ],
          ['opposite',    'напротив',     'The school is opposite the park.'  ],
          ['at',          'у / на',       "I\'m at the station."               ],
        ]}
      />,
    ],
  },
  20: {
    titleRU: 'Артикли: a / an / the / —',
    titleUK: 'Артиклі: a / an / the / —',
    titleES: 'Artículos: a / an / the / —',
    titlePtBr: 'Artigos: a / an / the / —',
    titleVi: 'Mạo từ: a / an / the / —',
    titleId: 'Artikel: a / an / the / —',
    titleTr: 'Artikeller: a / an / the / —',
    titlePl: 'Przedimki: a / an / the / —',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Артикль", "Артикль", "Art.", "Art.", "Mạo từ", "Artikel", "Artikel", "Przed."), L(lang, "Когда использовать", "Коли вживати", "Cuándo", "Quando", "Khi nào", "Kapan", "Ne zaman", "Kiedy"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['a',   'Перед приголосним звуком, вперше',    'I saw a dog.'         ],
          ['an',  'Перед голосним звуком, вперше',       'She has an umbrella.' ],
          ['the', 'Конкретний / вже відомий предмет',    'The dog was big.'     ],
          ['—',   'Власні назви, мови, спорт, їжа',      'I play tennis.'       ],
        ] : lang === 'es' ? [
          ['a',   'Sonido consonántico (primera vez)',   'I saw a dog.'         ],
          ['an',  'Sonido vocálico (primera vez)',        'She has an umbrella.' ],
          ['the', 'Ya conocido o único posible',         'The dog was big.'     ],
          ['—',   'Nombres propios, deportes (genéricos)','I play tennis.'      ],
        ] : [
          ['a',   'Перед согл. звуком, впервые',         'I saw a dog.'         ],
          ['an',  'Перед гласным звуком, впервые',       'She has an umbrella.' ],
          ['the', 'Конкретный / уже известный предмет',  'The dog was big.'     ],
          ['—',   'Имена, языки, спорт, еда',            'I play tennis.'       ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Без артикля", "Без артикля", "Sin artículo", "Sem artigo", "Không có mạo từ", "Tanpa artikel", "Artikelsiz", "Bez przedimka")}
        headers={[L(lang, "Правило", "Правило", "Regla", "Regra", "Quy tắc", "Aturan", "Kural", "Reguła"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['Власні назви',           'London, Ukraine, Mary'        ],
          ['Мови та національності',  'English, French, Ukrainian'   ],
          ['Спорт та ігри',          'football, chess, tennis'      ],
          ['Їжа в загальному',       'I like coffee.'               ],
          ['Транспорт після by',     'by car, by bus, by train'     ],
        ] : lang === 'es' ? [
          ['Nombres propios y países','London, Ukraine, Mary'       ],
          ['Idiomas y gentilicios',    'English, French, Ukrainian' ],
          ['Deportes y juegos',      'football, chess, tennis'      ],
          ['Comidas en genérico',    'I like coffee.'               ],
          ['Transporte con by',       'by car, by bus, by train'     ],
        ] : [
          ['Имена и география',      'London, Ukraine, Mary'        ],
          ['Языки и национальности',  'English, French, Ukrainian'   ],
          ['Спорт и игры',           'football, chess, tennis'      ],
          ['Еда в общем смысле',     'I like coffee.'               ],
          ['Транспорт после by',     'by car, by bus, by train'     ],
        ]}
      />,
    ],
  },
  21: {
    titleRU: 'Неопределённые местоимения',
    titleUK: 'Неозначені займенники',
    titleES: 'Pronombres indefinidos',
    titlePtBr: 'Pronomes indefinidos',
    titleVi: 'Đại từ bất định',
    titleId: 'Pronomina tak tentu',
    titleTr: 'Belirsiz zamirler',
    titlePl: 'Zaimki nieokreślone',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Корень", "Корінь", "Raíz", "Raiz", "Gốc", "Akar", "Kök", "Rdzeń"), L(lang, "Лицо", "Особа", "Personas", "Pessoas", "Ngôi", "Orang", "Kişiler", "Osoby"), L(lang, "Предмет", "Предмет", "Cosas", "Coisas", "Vật", "Benda", "Şeyler", "Rzeczy"), L(lang, "Место", "Місце", "Lugar", "Lugar", "Nơi chốn", "Tempat", "Yer", "Miejsce")]}
        rows={[
          ['some-',  'somebody / someone',  'something',  'somewhere' ],
          ['any-',   'anybody / anyone',    'anything',   'anywhere'  ],
          ['no-',    'nobody / no one',     'nothing',    'nowhere'   ],
          ['every-', 'everybody / everyone','everything', 'everywhere'],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Когда использовать", "Коли вживати", "Cuándo usar", "Quando usar", "Khi dùng", "Kapan dipakai", "Ne zaman kullanılır", "Kiedy używać")}
        headers={[L(lang, "Местоимение", "Займенник", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Употребление", "Вживання", "Uso", "Uso", "Cách dùng", "Penggunaan", "Kullanım", "Użycie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['some-', 'Ствердні речення, прохання', 'Someone called you.'    ],
          ['any-',  'Питання і заперечення',      "Is anyone there?"       ],
          ['no-',   'Заперечний зміст',           'Nobody came.'           ],
          ['every-','Всі без винятку',             'Everyone was happy.'    ],
        ] : lang === 'es' ? [
          ['some-', 'Afirmativas / ofertas',      'Someone called you.'    ],
          ['any-',  'Interrogativas / negativas', "Is anyone there?"       ],
          ['no-',   'Sentido negativo',           'Nobody came.'           ],
          ['every-','Todos sin excepción',       'Everyone was happy.'    ],
        ] : [
          ['some-', 'Утверждения, просьбы',   'Someone called you.'         ],
          ['any-',  'Вопросы и отрицания',    "Is anyone there?"            ],
          ['no-',   'Отрицательный смысл',    'Nobody came.'                ],
          ['every-','Все без исключения',      'Everyone was happy.'         ],
        ]}
      />,
    ],
  },
  22: {
    titleRU: 'Герундий (-ing)',
    titleUK: 'Герундій (-ing)',
    titleES: 'Gerundio (-ing)',
    titlePtBr: 'Gerúndio (-ing)',
    titleVi: 'Danh động từ (-ing)',
    titleId: 'Gerund (-ing)',
    titleTr: 'Gerund (-ing)',
    titlePl: 'Gerundium (-ing)',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={L(lang, "После этих слов — Герундий (-ing)", "Після цих слів — Герундій (-ing)", "Tras estos verbos — gerundio (-ing)", "Depois destes verbos — gerúndio (-ing)", "Sau các động từ này — gerund (-ing)", "Setelah verba ini — gerund (-ing)", "Bu fiillerden sonra — gerund (-ing)", "Po tych czasownikach — gerundium (-ing)")}
        headers={[L(lang, "Глагол", "Дієслово", "Verbo", "Verbo", "Động từ", "Verba", "Fiil", "Czasownik"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['enjoy',   'She enjoys reading.'           ],
          ['like',    'I like swimming.'              ],
          ['love',    'He loves cooking.'             ],
          ['hate',    "She hates waiting."            ],
          ['stop',    'Stop talking!'                 ],
          ['finish',  'I finished working.'           ],
          ['mind',    "Do you mind opening the door?" ],
          ['suggest', 'He suggested going there.'     ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "После этих слов — Инфинитив (to + V)", "Після цих слів — Інфінітив (to + V)", "Tras estos verbos — infinitivo (to + V)", "Depois destes verbos — infinitivo (to + V)", "Sau các động từ này — nguyên mẫu (to + V)", "Setelah verba ini — infinitive (to + V)", "Bu fiillerden sonra — infinitive (to + V)", "Po tych czasownikach — bezokolicznik (to + V)")}
        headers={[L(lang, "Глагол", "Дієслово", "Verbo", "Verbo", "Động từ", "Verba", "Fiil", "Czasownik"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['want',   'I want to go.'      ],
          ['need',   'She needs to rest.' ],
          ['hope',   'I hope to see you.' ],
          ['plan',   'We plan to travel.' ],
          ['decide', 'He decided to stay.'],
          ['agree',  'She agreed to help.'],
        ]}
      />,
    ],
  },
  23: {
    titleRU: 'Passive Voice',
    titleUK: 'Passive Voice',
    titleES: 'Voz pasiva (Passive Voice)',
    titlePtBr: 'Voz passiva',
    titleVi: 'Câu bị động',
    titleId: 'Kalimat pasif',
    titleTr: 'Edilgen çatı',
    titlePl: 'Strona bierna',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Время", "Час", "Tiempo", "Tempo", "Thời gian", "Waktu", "Zaman", "Czas"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['Present Simple',   'am/is/are + V3',        'English is spoken here.'    ],
          ['Past Simple',      'was/were + V3',          'The letter was written.'    ],
          ['Future Simple',    'will be + V3',           'It will be done tomorrow.'  ],
          ['Present Perfect',  'has/have + been + V3',   'It has been finished.'      ],
          ['Present Cont.',    'am/is/are + being + V3', 'It is being fixed.'         ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Активный → Пассивный", "Активний → Пасивний", "Activa → pasiva", "Ativa → passiva", "Chủ động → bị động", "Aktif → pasif", "Etken → edilgen", "Strona czynna → bierna")}
        headers={[L(lang, "Активный", "Активний", "Activa", "Ativa", "Chủ động", "Aktif", "Etken", "Strona czynna"), L(lang, "Пассивный", "Пасивний", "Pasiva", "Passiva", "Bị động", "Pasif", "Edilgen", "Strona bierna")]}
        rows={[
          ['She wrote the letter.',  'The letter was written by her.' ],
          ['They built this house.', 'This house was built by them.'  ],
          ['Someone stole my phone.','My phone was stolen.'           ],
        ]}
      />,
    ],
  },
  24: {
    titleRU: 'Present Perfect',
    titleUK: 'Present Perfect',
    titleES: 'Present Perfect',
    titlePtBr: 'Present Perfect',
    titleVi: 'Present Perfect',
    titleId: 'Present Perfect',
    titleTr: 'Present Perfect',
    titlePl: 'Present Perfect',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Форма", "Форма", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['+', 'have/has + V3',        'I have seen this film.'       ],
          ['−', "haven\'t/hasn\'t + V3",  "She hasn\'t called yet."       ],
          ['?', 'Have/Has + subj + V3?','Have you ever been to Paris?'],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Ключевые слова", "Ключові слова", "Marcadores", "Marcadores", "Dấu hiệu", "Penanda", "İşaretçiler", "Wskaźniki")}
        headers={[L(lang, "Слово", "Слово", "Palabra", "Palavra", "Từ", "Kata", "Kelime", "Słowo"), L(lang, "Значение", "Значення", "Sentido", "Sentido", "Nghĩa", "Makna", "Anlam", "Sens"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['ever',   'коли-небудь',   'Have you ever tried sushi?'    ],
          ['never',  'ніколи',        "I\'ve never been to Japan."     ],
          ['already','вже',           "She\'s already finished."       ],
          ['yet',    'ще / вже (?)',  "Have you eaten yet?"           ],
          ['just',   'щойно',         "He\'s just arrived."            ],
          ['for',    'протягом',      "I\'ve lived here for 5 years."  ],
          ['since',  'з (часу)',      "She\'s worked here since 2020." ],
        ] : lang === 'es' ? [
          ['ever',   'alguna vez',    'Have you ever tried sushi?'    ],
          ['never',  'nunca',         "I\'ve never been to Japan."     ],
          ['already','ya',            "She\'s already finished."       ],
          ['yet',    'ya / ¿aún?',    "Have you eaten yet?"           ],
          ['just',   'recién',        "He\'s just arrived."            ],
          ['for',    'durante',       "I\'ve lived here for 5 years."  ],
          ['since',  'desde',         "She\'s worked here since 2020." ],
        ] : [
          ['ever',   'когда-нибудь',  'Have you ever tried sushi?'    ],
          ['never',  'никогда',       "I\'ve never been to Japan."     ],
          ['already','уже',           "She\'s already finished."       ],
          ['yet',    'ещё / уже (?)', "Have you eaten yet?"           ],
          ['just',   'только что',    "He\'s just arrived."            ],
          ['for',    'в течение',     "I\'ve lived here for 5 years."  ],
          ['since',  'с (времени)',   "She\'s worked here since 2020." ],
        ]}
      />,
    ],
  },
  25: {
    titleRU: 'Past Continuous',
    titleUK: 'Past Continuous',
    titleES: 'Past Continuous',
    titlePtBr: 'Past Continuous',
    titleVi: 'Past Continuous',
    titleId: 'Past Continuous',
    titleTr: 'Past Continuous',
    titlePl: 'Past Continuous',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Форма", "Форма", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['+', 'was/were + V-ing',         'She was working at 8pm.'       ],
          ['−', "wasn\'t/weren\'t + V-ing",   "He wasn\'t sleeping."           ],
          ['?', 'Was/Were + subj + V-ing?', 'Were they watching TV?'        ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Когда использовать", "Коли вживати", "Cuándo usar", "Quando usar", "Khi dùng", "Kapan dipakai", "Ne zaman kullanılır", "Kiedy używać")}
        headers={[L(lang, "Ситуация", "Ситуація", "Uso", "Uso", "Cách dùng", "Penggunaan", "Kullanım", "Użycie"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['Дія тривала в певний момент',    'At 9pm I was reading.'              ],
          ['Дія перервалась (when)',          'I was reading when she called.'     ],
          ['Дві паралельні дії (while)',      'While he cooked, she was cleaning.' ],
        ] : lang === 'es' ? [
          ['Acción en curso en un momento', 'At 9pm I was reading.'              ],
          ['Interrupción (when)',           'I was reading when she called.'     ],
          ['Dos paralelas (while)',         'While he cooked, she was cleaning.' ],
        ] : [
          ['Действие длилось в момент',      'At 9pm I was reading.'              ],
          ['Действие прервалось (when)',      'I was reading when she called.'     ],
          ['Два параллельных действия',       'While he cooked, she was cleaning.' ],
        ]}
      />,
    ],
  },
  26: {
    titleRU: 'Условные предложения',
    titleUK: 'Умовні речення',
    titleES: 'Oraciones condicionales',
    titlePtBr: 'Orações condicionais',
    titleVi: 'Câu điều kiện',
    titleId: 'Kalimat pengandaian',
    titleTr: 'Koşul cümleleri',
    titlePl: 'Zdania warunkowe',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Тип", "Тип", "Tipo", "Tipo", "Loại", "Jenis", "Tür", "Typ"), L(lang, "If-часть", "If-частина", "Parte en if", "Parte com if", "Mệnh đề if", "Bagian if", "If bölümü", "Część z if"), L(lang, "Результат", "Результат", "Resultado", "Resultado", "Kết quả", "Hasil", "Sonuç", "Wynik"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['0 (факт)',       'Present Simple', 'Present Simple', 'If you heat water, it boils.'            ],
          ['1 (реальне)',    'Present Simple', 'will + V',       'If it rains, I will stay home.'          ],
          ['2 (нереальне)',  'Past Simple',    'would + V',      "If I had money, I\'d travel."             ],
          ['3 (минуле)',     'Past Perfect',   'would have + V3','If she had studied, she would have passed.'],
        ] : lang === 'es' ? [
          ['0 (hecho)',      'Present Simple', 'Present Simple', 'If you heat water, it boils.'            ],
          ['1 (real)',       'Present Simple', 'will + V',       'If it rains, I will stay home.'          ],
          ['2 (irreal)',     'Past Simple',    'would + V',      "If I had money, I\'d travel."             ],
          ['3 (pasado)',     'Past Perfect',   'would have + V3','If she had studied, she would have passed.'],
        ] : [
          ['0 (факт)',       'Present Simple', 'Present Simple', 'If you heat water, it boils.'            ],
          ['1 (реальное)',   'Present Simple', 'will + V',       'If it rains, I will stay home.'          ],
          ['2 (нереальное)', 'Past Simple',    'would + V',      "If I had money, I\'d travel."             ],
          ['3 (прошлое)',    'Past Perfect',   'would have + V3','If she had studied, she would have passed.'],
        ]}
      />,
    ],
  },
  27: {
    titleRU: 'Косвенная речь',
    titleUK: 'Непряма мова',
    titleES: 'Estilo indirecto',
    titlePtBr: 'Discurso indireto',
    titleVi: 'Câu tường thuật',
    titleId: 'Kalimat tidak langsung',
    titleTr: 'Dolaylı anlatım',
    titlePl: 'Mowa zależna',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={L(lang, "Сдвиг времён", "Зміщення часів", "Retroceso de tiempos", "Mudança de tempos", "Lùi thì", "Pergeseran tense", "Zaman kayması", "Następstwo czasów")}
        headers={[L(lang, "Прямая речь", "Пряма мова", "Directo", "Discurso direto", "Trực tiếp", "Langsung", "Doğrudan", "Mowa bezpośrednia"), L(lang, "Косвенная речь", "Непряма мова", "Indirecto", "Discurso indireto", "Gián tiếp", "Tidak langsung", "Dolaylı anlatım", "Mowa zależna")]}
        rows={[
          ['Present Simple',     '→  Past Simple'    ],
          ['Present Continuous', '→  Past Continuous'],
          ['Past Simple',        '→  Past Perfect'   ],
          ['will',               '→  would'          ],
          ['can',                '→  could'          ],
          ['am / is / are',      '→  was / were'     ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Примеры", "Приклади", "Ejemplos", "Exemplos", "Ví dụ", "Contoh", "Örnekler", "Przykłady")}
        headers={[L(lang, "Прямая", "Пряма", "Directo", "Direto", "Trực tiếp", "Langsung", "Doğrudan", "Bezpośrednio"), L(lang, "Косвенная", "Непряма", "Indirecto", "Indireto", "Gián tiếp", "Tidak langsung", "Dolaylı", "Pośrednio")]}
        rows={[
          ['"I am tired."',       'He said he was tired.'         ],
          ['"I will call you."',  'She said she would call me.'   ],
          ['"I can swim."',       'He said he could swim.'        ],
          ['"Do you work here?"', 'She asked if I worked there.'  ],
        ]}
      />,
    ],
  },
  28: {
    titleRU: 'Возвратные местоимения',
    titleUK: 'Зворотні займенники',
    titleES: 'Pronombres reflexivos',
    titlePtBr: 'Pronomes reflexivos',
    titleVi: 'Đại từ phản thân',
    titleId: 'Pronomina refleksif',
    titleTr: 'Dönüşlülük zamirleri',
    titlePl: 'Zaimki zwrotne',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Подлежащее", "Підмет", "Sujeto", "Sujeito", "Chủ ngữ", "Subjek", "Özne", "Podmiot"), L(lang, "Возвратное", "Зворотне", "Reflexivo", "Reflexivo", "Phản thân", "Refleksif", "Dönüşlü", "Zwrotny"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['I',    'myself',     'I hurt myself.'            ],
          ['You',  'yourself',   'Did you enjoy yourself?'   ],
          ['He',   'himself',    'He introduced himself.'    ],
          ['She',  'herself',    'She did it herself.'       ],
          ['It',   'itself',     'The door opened by itself.'],
          ['We',   'ourselves',  'We cooked it ourselves.'   ],
          ['You',  'yourselves', 'Help yourselves!'          ],
          ['They', 'themselves', 'They built it themselves.' ],
        ]}
      />,
    ],
  },
  29: {
    titleRU: 'Used to',
    titleUK: 'Used to',
    titleES: 'Used to',
    titlePtBr: 'Used to',
    titleVi: 'Used to',
    titleId: 'Used to',
    titleTr: 'Used to',
    titlePl: 'Used to',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Форма", "Форма", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Структура", "Структура", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['+', 'used to + V',        'I used to play football.'          ],
          ['−', "didn\'t use to + V",  "She didn\'t use to drink coffee."   ],
          ['?', 'Did ... use to + V?','Did you use to live here?'         ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Сравнение конструкций", "Порівняння конструкцій", "Otras construcciones", "Outras construções", "Cấu trúc khác", "Konstruksi lain", "Diğer yapılar", "Inne konstrukcje")}
        headers={[L(lang, "Конструкция", "Конструкція", "Forma", "Forma", "Dạng", "Bentuk", "Biçim", "Forma"), L(lang, "Значение", "Значення", "Sentido", "Sentido", "Nghĩa", "Makna", "Anlam", "Sens"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['used to + V',      'Звичка в минулому',    'I used to smoke.'            ],
          ['be used to + -ing','Звичний до чогось',    "I\'m used to waking up early."],
          ['get used to + -ing','Звикати до чогось',   "I\'m getting used to the cold."],
        ] : lang === 'es' ? [
          ['used to + V',      'hábito en el pasado',  'I used to smoke.'            ],
          ['be used to + -ing','estar acostumbrado a', "I\'m used to waking up early."],
          ['get used to + -ing','acostumbrarse a',      "I\'m getting used to the cold."],
        ] : [
          ['used to + V',      'Привычка в прошлом',   'I used to smoke.'            ],
          ['be used to + -ing','Привыкший к чему-то',  "I\'m used to waking up early."],
          ['get used to + -ing','Привыкать к чему-то', "I\'m getting used to the cold."],
        ]}
      />,
    ],
  },
  30: {
    titleRU: 'Relative Clauses',
    titleUK: 'Relative Clauses',
    titleES: 'Oraciones de relativo',
    titlePtBr: 'Orações relativas',
    titleVi: 'Mệnh đề quan hệ',
    titleId: 'Klausa relatif',
    titleTr: 'İlgi cümlecikleri',
    titlePl: 'Zdania względne',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[L(lang, "Слово", "Слово", "Palabra", "Palavra", "Từ", "Kata", "Kelime", "Słowo"), L(lang, "Для чего", "Для чого", "Sirve para", "Serve para", "Dùng để", "Digunakan untuk", "Ne işe yarar", "Do czego służy"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={lang === 'uk' ? [
          ['who',   'людей',                 'The man who called is my friend.'  ],
          ['which', 'предметів і тварин',    'The book which I read was great.'  ],
          ['that',  'людей або предметів',   'The car that she drives is red.'   ],
          ['whose', 'присвійне',             'The girl whose bag was stolen...'  ],
          ['where', 'місця',                 'The city where I was born.'        ],
          ['when',  'часу',                  'The day when we met.'              ],
        ] : lang === 'es' ? [
          ['who',   'personas',              'The man who called is my friend.'  ],
          ['which', 'cosas / animales',      'The book which I read was great.'  ],
          ['that',  'personas o cosas',      'The car that she drives is red.'   ],
          ['whose', 'posesivo',               'The girl whose bag was stolen...' ],
          ['where', 'lugares',                'The city where I was born.'       ],
          ['when',  'momentos',              'The day when we met.'             ],
        ] : [
          ['who',   'людей',                 'The man who called is my friend.'  ],
          ['which', 'предметов и животных',  'The book which I read was great.'  ],
          ['that',  'людей или предметов',   'The car that she drives is red.'   ],
          ['whose', 'притяжательное',        'The girl whose bag was stolen...'  ],
          ['where', 'места',                 'The city where I was born.'        ],
          ['when',  'времени',               'The day when we met.'              ],
        ]}
      />,
    ],
  },
  31: {
    titleRU: 'Complex Object',
    titleUK: 'Complex Object',
    titleES: 'Objeto directo + infinitivo',
    titlePtBr: 'Objeto complexo + infinitivo',
    titleVi: 'Tân ngữ phức + nguyên mẫu',
    titleId: 'Objek kompleks + infinitif',
    titleTr: 'Complex Object + mastar',
    titlePl: 'Complex Object + bezokolicznik',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={L(lang, "Глагол + объект + to + V", "Дієслово + об'єкт + to + V", "Verbo + complemento + to + V", "Verbo + objeto + to + V", "Động từ + tân ngữ + to + V", "Verba + objek + to + V", "Fiil + nesne + to + V", "Czasownik + dopełnienie + to + V")}
        headers={[L(lang, "Глагол", "Дієслово", "Verbo", "Verbo", "Động từ", "Verba", "Fiil", "Czasownik"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['want',   'I want you to stay.'         ],
          ['expect', 'She expects him to call.'    ],
          ['ask',    'I asked her to help me.'     ],
          ['tell',   'He told me to stop.'         ],
          ['allow',  'She allowed me to go.'       ],
          ['need',   'I need you to understand.'   ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Глагол + объект + V (без to)", "Дієслово + об'єкт + V (без to)", "Verbo + complemento + V (sin to)", "Verbo + objeto + V (sem to)", "Động từ + tân ngữ + V (không có to)", "Verba + objek + V (tanpa to)", "Fiil + nesne + V (to olmadan)", "Czasownik + dopełnienie + V (bez to)")}
        headers={[L(lang, "Глагол", "Дієслово", "Verbo", "Verbo", "Động từ", "Verba", "Fiil", "Czasownik"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['make',  'She made me laugh.'           ],
          ['let',   'Let him speak.'               ],
          ['hear',  'I heard him sing.'            ],
          ['see',   'I saw him running.'           ],
          ['watch', 'She watched them play.'       ],
        ]}
      />,
    ],
  },
  32: {
    titleRU: 'Повторение всех тем',
    titleUK: 'Повторення всіх тем',
    titleES: 'Repaso de todos los temas',
    titlePtBr: 'Revisão de todos os temas',
    titleVi: 'Ôn lại tất cả chủ đề',
    titleId: 'Ulasan semua topik',
    titleTr: 'Tüm konuların tekrarı',
    titlePl: 'Powtórka wszystkich tematów',
    render: (t, lang, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={L(lang, "Времена — обзор", "Часи — огляд", "Tiempo verbal — panorama", "Tempos verbais — visão geral", "Tổng quan thì", "Ringkasan tense", "Zamanlar — genel bakış", "Czasy — przegląd")}
        headers={[L(lang, "Время", "Час", "Tiempo", "Tempo", "Thời gian", "Waktu", "Zaman", "Czas"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład"), L(lang, "Ключевые слова", "Ключові слова", "Marcadores", "Marcadores", "Dấu hiệu", "Penanda", "İşaretçiler", "Wskaźniki")]}
        rows={[
          ['Present Simple',     'She works.',       'always, every day'      ],
          ['Present Continuous', "She\'s working.",   'now, at the moment'     ],
          ['Past Simple',        'She worked.',      'yesterday, ago, last'   ],
          ['Past Continuous',    'She was working.', 'at 8pm, when, while'    ],
          ['Present Perfect',    "She\'s worked.",    'ever, never, already'   ],
          ['Future Simple',      'She will work.',   'tomorrow, next week'    ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={L(lang, "Важные конструкции", "Важливі конструкції", "Estructuras clave", "Estruturas-chave", "Cấu trúc chính", "Struktur kunci", "Temel yapılar", "Kluczowe struktury")}
        headers={[L(lang, "Конструкция", "Конструкція", "Estructura", "Estrutura", "Cấu trúc", "Struktur", "Yapı", "Struktura"), L(lang, "Пример", "Приклад", "Ejemplo", "Exemplo", "Ví dụ", "Contoh", "Örnek", "Przykład")]}
        rows={[
          ['can / could',          'I can swim. She could drive.'   ],
          ['must / have to',       'I must go. You have to work.'   ],
          ['should',               'You should rest.'               ],
          ['was/were + V3',        'It was built in 1990.'          ],
          ['If + PS → will',       'If it rains, I will stay.'      ],
          ['used to + V',          'I used to play tennis.'         ],
          ['have/has + V3',        "She\'s already finished."        ],
          ['want you to + V',      'I want you to stay.'            ],
        ]}
      />,
    ],
  },
};

export default function HintScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: t , f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const lessonId = parseInt(id || '1', 10);

  // Новая теория «дорогой минимализм» — для всех уроков с готовым контентом
  // (реестр theory_content_registry, уроки 1-32). Остальные — прежняя шпаргалка.
  if (hasTheoryContent(lessonId)) {
    return <LessonTheoryNew lessonId={lessonId} />;
  }

  const hint = HINTS[lessonId] || HINTS[1];
  const frenchHintBlocked = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_hint', lessonId);
  const frenchHintCopy = frenchHintBlocked ? frenchLessonSupportGateCopy('lesson_hint', lang, lessonId) : null;

  const hintSubtitle = triLang(lang, {
    ru: `${T.ru.lessonN(lessonId)} · Шпаргалка`,
    uk: `${T.uk.lessonN(lessonId)} · Швидка довідка`,
    es: `${T.es.lessonN(lessonId)} · Guía rápida`,
    'pt-BR': `Lição ${lessonId} · Guia rápido`,
    vi: `Bài ${lessonId} · Ghi chú nhanh`,
    id: `Pelajaran ${lessonId} · Panduan cepat`,
    tr: `Ders ${lessonId} · Hızlı rehber`,
    pl: `Lekcja ${lessonId} · Szybka ściąga`,
  });
  const hintTitle = triLang(lang, {
    ru: hint.titleRU,
    uk: hint.titleUK,
    es: hint.titleES,
    'pt-BR': hint.titlePtBr,
    vi: hint.titleVi,
    id: hint.titleId,
    tr: hint.titleTr,
    pl: hint.titlePl,
  });
  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TapScale onPress={() => safeRouterBack(router, '/(tabs)/home' as any)} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TapScale>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textMuted, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 0.7 }}>
            {hintSubtitle}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
            {frenchHintCopy?.title ?? hintTitle}
          </Text>
        </View>
      </View>
      <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {frenchHintCopy ? (
          <TonalSurface radius={16} style={{ borderWidth: 0, borderColor: t.border, padding: 18, gap: 12 }}>
            <View style={{ alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: t.bgSurface, borderWidth: 0, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={30} color={t.textSecond} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
              {frenchHintCopy.title}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.bodyLg, lineHeight: 24, textAlign: 'center' }}>
              {frenchHintCopy.body}
            </Text>
          </TonalSurface>
        ) : hint.render(t, lang, f)}
        <TouchableOpacity
          style={{ backgroundColor: t.bgSurface, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }}
          onPress={() => safeRouterBack(router, '/(tabs)/home' as any)}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
            {frenchHintCopy?.action ?? triLang(lang, {
              ru: 'Закрыть',
              uk: 'Закрити',
              es: 'Cerrar',
              'pt-BR': 'Fechar',
              vi: 'Đóng',
              id: 'Tutup',
              tr: 'Kapat',
              pl: 'Zamknij',
            })}
          </Text>
        </TouchableOpacity>
      </BouncyScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
