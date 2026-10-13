import { ruUkPlus } from '../constants/i18n_ru_uk_plus';
import { triLang, type Lang } from '../constants/i18n';
import {
  FRENCH_CONTENT_SOURCE_GATE,
  isFrenchLessonIntroApproved,
} from './french_content_source_gate';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type LessonSupportGateSurface = 'lesson_theory' | 'lesson_hint';

export type LessonSupportContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  surface: LessonSupportGateSurface;
  lessonId?: number;
  reason?: 'french_lesson_theory_source_gate' | 'french_lesson_hint_source_gate';
  blockedRoutes: string[];
  requiredEvidence: string[];
};

const FRENCH_LESSON_THEORY_EVIDENCE = Object.freeze([
  'french_lesson_theory_bank',
  'french_rich_intro_theory_review',
  'ru_uk_theory_prompt_review',
]);

const FRENCH_LESSON_HINT_EVIDENCE = Object.freeze([
  'french_lesson_hint_bank',
  'french_hint_contrast_review',
  'ru_uk_hint_prompt_review',
]);

function evidenceForSurface(surface: LessonSupportGateSurface): string[] {
  return surface === 'lesson_hint'
    ? [...FRENCH_LESSON_HINT_EVIDENCE]
    : [...FRENCH_LESSON_THEORY_EVIDENCE];
}

export function lessonSupportContentAvailableForTarget(
  studyTarget: RuntimeStudyTarget | undefined,
  surface: LessonSupportGateSurface,
  lessonId?: number,
): boolean {
  if (storageStudyTarget(studyTarget) !== 'fr') return true;
  if (surface === 'lesson_theory' && lessonId != null) {
    return isFrenchLessonIntroApproved(lessonId);
  }
  return false;
}

export function lessonSupportContentGateForTarget(
  studyTarget: RuntimeStudyTarget | undefined,
  surface: LessonSupportGateSurface,
  lessonId?: number,
): LessonSupportContentGate {
  const enabled = lessonSupportContentAvailableForTarget(studyTarget, surface, lessonId);
  if (storageStudyTarget(studyTarget) !== 'fr') {
    return {
      enabled,
      studyTarget: 'en',
      surface,
      lessonId,
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  return {
    enabled,
    studyTarget: 'fr',
    surface,
    lessonId,
    reason: surface === 'lesson_hint'
      ? 'french_lesson_hint_source_gate'
      : 'french_lesson_theory_source_gate',
    blockedRoutes: surface === 'lesson_hint' ? ['/hint'] : ['/lesson_help'],
    requiredEvidence: evidenceForSurface(surface),
  };
}

function frenchLessonSupportGateCopyRuUk(
  surface: LessonSupportGateSurface,
  lang: Lang,
  lessonId?: number,
): { title: string; body: string; action: string } {
  const uk = lang === 'uk';
  const lessonPart = lessonId ? (uk ? ` уроку ${lessonId}` : ` урока ${lessonId}`) : '';

  if (surface === 'lesson_hint') {
    return uk
      ? {
          title: 'Французька шпаргалка недоступна без French hint pack',
          body: `Англійську шпаргалку${lessonPart} приховано в режимі French. Вона відкриється тільки після окремого French hint pack для французьких підказок, граматичних контрастів і пояснень українською/російською.`,
          action: 'До уроку',
        }
      : {
          title: 'Французская шпаргалка недоступна без French hint pack',
          body: `Английская шпаргалка${lessonPart} скрыта в режиме French. Она откроется только после отдельного French hint pack для французских подсказок, грамматических контрастов и объяснений на русском/украинском.`,
          action: 'К уроку',
        };
  }

  return uk
    ? {
        title: 'Французька теорія',
        body: `Англійську теорію${lessonPart} приховано в режимі French. Теорія відкриється тільки після перевіреного French theory packet з rich intro, прикладами, CEFR-ціллю і поясненнями українською/російською.`,
        action: 'До уроку',
      }
    : {
        title: 'Французская теория',
        body: `Английская теория${lessonPart} скрыта в режиме French. Теория откроется только после проверенного French theory packet с rich intro, примерами, CEFR-целью и объяснениями на русском/украинском.`,
        action: 'К уроку',
      };
}

// зачем (координатор 13.10, проход зоны Ядра по текстам без перевода): окно было только ru/uk — при другом языке интерфейса человек видел русский.
// ru/uk — прежняя функция без изменений (тексты закрепляют тесты gustav_*), остальные 7 языков — здесь.

type OtherLang = 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type LessonPartText = (lessonPart: string) => string;
const FRENCH_SUPPORT_LESSON_PART: Readonly<Record<OtherLang, (lessonId: number) => string>> = {
  en: (n) => ` for lesson ${n}`, es: (n) => ` de la lección ${n}`, 'pt-BR': (n) => ` da lição ${n}`, vi: (n) => ` của bài ${n}`,
  id: (n) => ` untuk pelajaran ${n}`, tr: (n) => ` (${n}. ders)`, pl: (n) => ` do lekcji ${n}`,
};
const FRENCH_SUPPORT_GATE_OTHER: Readonly<Record<LessonSupportGateSurface, Readonly<{ title: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>; body: Readonly<Record<OtherLang, LessonPartText>> }>>> = {
  lesson_hint: {
    title: { en: 'The French cheat sheet isn’t ready yet', es: 'La chuleta de francés aún no está lista', 'pt-BR': 'O resumo de francês ainda não está pronto', vi: 'Bản tóm tắt tiếng Pháp chưa sẵn sàng', id: 'Ringkasan bahasa Prancis belum siap', tr: 'Fransızca özet henüz hazır değil', pl: 'Ściągawka z francuskiego nie jest jeszcze gotowa' },
    body: {
      en: (p) => `The English cheat sheet${p} is hidden while you study French. It’ll open once a French one is ready.`,
      es: (p) => `La chuleta en inglés${p} está oculta mientras estudias francés. Se abrirá cuando haya una en francés.`,
      'pt-BR': (p) => `O resumo em inglês${p} fica oculto enquanto você estuda francês. Ele abrirá quando houver um em francês.`,
      vi: (p) => `Bản tóm tắt tiếng Anh${p} được ẩn khi bạn học tiếng Pháp. Bản này sẽ mở khi có bản tiếng Pháp.`,
      id: (p) => `Ringkasan bahasa Inggris${p} disembunyikan saat kamu belajar bahasa Prancis. Ringkasan akan terbuka setelah versi bahasa Prancis siap.`,
      tr: (p) => `İngilizce özet${p} Fransızca çalışırken gizlenir. Fransızcası hazır olunca açılacak.`,
      pl: (p) => `Angielska ściągawka${p} jest ukryta, gdy uczysz się francuskiego. Otworzy się, gdy będzie gotowa francuska.`,
    },
  },
  lesson_theory: {
    title: { en: 'French theory', es: 'Teoría de francés', 'pt-BR': 'Teoria de francês', vi: 'Lý thuyết tiếng Pháp', id: 'Teori bahasa Prancis', tr: 'Fransızca konu anlatımı', pl: 'Teoria francuskiego' },
    body: {
      en: (p) => `The English theory${p} is hidden while you study French. It’ll open once checked French theory is ready.`,
      es: (p) => `La teoría en inglés${p} está oculta mientras estudias francés. Se abrirá cuando la teoría en francés esté revisada.`,
      'pt-BR': (p) => `A teoria em inglês${p} fica oculta enquanto você estuda francês. Ela abrirá quando a teoria em francês for revisada.`,
      vi: (p) => `Lý thuyết tiếng Anh${p} được ẩn khi bạn học tiếng Pháp. Phần này sẽ mở khi lý thuyết tiếng Pháp được kiểm tra xong.`,
      id: (p) => `Teori bahasa Inggris${p} disembunyikan saat kamu belajar bahasa Prancis. Teori akan terbuka setelah teori bahasa Prancis selesai diperiksa.`,
      tr: (p) => `İngilizce konu anlatımı${p} Fransızca çalışırken gizlenir. Fransızca konu anlatımı kontrol edilince açılacak.`,
      pl: (p) => `Angielska teoria${p} jest ukryta, gdy uczysz się francuskiego. Otworzy się, gdy francuska teoria zostanie sprawdzona.`,
    },
  },
};

export function frenchLessonSupportGateCopy(
  surface: LessonSupportGateSurface,
  lang: Lang,
  lessonId?: number,
): { title: string; body: string; action: string } {
  const ru = frenchLessonSupportGateCopyRuUk(surface, 'ru', lessonId);
  const uk = frenchLessonSupportGateCopyRuUk(surface, 'uk', lessonId);
  const other = FRENCH_SUPPORT_GATE_OTHER[surface];
  const body = (l: OtherLang) => other.body[l](lessonId ? FRENCH_SUPPORT_LESSON_PART[l](lessonId) : '');
  return {
    title: triLang(lang, ruUkPlus(ru.title, uk.title, other.title)),
    body: triLang(lang, { ru: ru.body, uk: uk.body, en: body('en'), es: body('es'), 'pt-BR': body('pt-BR'), vi: body('vi'), id: body('id'), tr: body('tr'), pl: body('pl') }),
    action: triLang(lang, ruUkPlus(ru.action, uk.action, { en: 'To the lesson', es: 'A la lección', 'pt-BR': 'Para a lição', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derse', pl: 'Do lekcji' })),
  };
}

export const FRENCH_LESSON_SUPPORT_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_LESSON_THEORY_EVIDENCE,
  ...FRENCH_LESSON_HINT_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __LessonSupportTargetGateRouteShim() {
  return null;
}
