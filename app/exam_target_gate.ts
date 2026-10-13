import { ruUkPlus } from '../constants/i18n_ru_uk_plus';
import { triLang, type Lang as UiLang } from '../constants/i18n';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type ExamContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_exam_bank_available' | 'french_quiz_pack_exam_available';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

export type FrenchExamGateKind = 'level' | 'final';

const FRENCH_EXAM_REQUIRED_EVIDENCE = Object.freeze([
  'french_quiz_remote_server_pack',
  'french_exam_from_remote_quiz_runtime',
  'target_scoped_exam_progress',
  'no_english_exam_bank_fallback',
]);

export function examContentGateForTarget(studyTarget?: RuntimeStudyTarget): ExamContentGate {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    return {
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_quiz_pack_exam_available',
      blockedRoutes: [],
      requiredEvidence: FRENCH_EXAM_REQUIRED_EVIDENCE,
    };
  }

  return {
    enabled: true,
    studyTarget: 'en',
    reason: 'english_exam_bank_available',
    blockedRoutes: [],
    requiredEvidence: [],
  };
}

export function examContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return examContentGateForTarget(studyTarget).enabled;
}

function frenchExamGateCopyRuUk(kind: FrenchExamGateKind, sourceLocale?: string) {
  const uk = sourceLocale === 'uk';
  if (kind === 'level') {
    return {
      title: uk ? 'Французький залік ще готується' : 'Французский зачёт ещё готовится',
      body: uk
        ? 'Англійський банк запитань не використовується для French. Заліки відкриються тільки після окремого французького банку, перевіреного за джерелами й рівнями.'
        : 'Английский банк вопросов не используется для French. Зачёты откроются только после отдельного французского банка, проверенного по источникам и уровням.',
      cta: uk ? 'До уроків' : 'К урокам',
    };
  }

  return {
    title: uk ? 'Французький фінальний тест ще готується' : 'Французский итоговый тест ещё готовится',
    body: uk
      ? 'Фінальний англійський тест приховано в режимі French. Його не можна запускати, доки не буде створено й перевірено окремий французький екзаменаційний банк.'
      : 'Финальный английский тест скрыт в режиме French. Его нельзя запускать, пока не будет создан и проверен отдельный французский экзаменационный банк.',
    cta: uk ? 'До уроків' : 'К урокам',
  };
}

// зачем (координатор 13.10, проход зоны Ядра по текстам без перевода): окно было только ru/uk — при другом языке интерфейса человек видел русский.
// ru/uk — прежняя функция без изменений (тексты закрепляют тесты gustav_*), остальные 7 языков — здесь.

const FRENCH_EXAM_GATE_OTHER: Readonly<Record<FrenchExamGateKind, Readonly<{ title: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>; body: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }> }>>> = {
  level: {
    title: { en: 'The French test is on its way', es: 'El examen de francés está en preparación', 'pt-BR': 'A prova de francês está sendo preparada', vi: 'Bài kiểm tra tiếng Pháp đang được chuẩn bị', id: 'Ujian bahasa Prancis sedang disiapkan', tr: 'Fransızca sınav hazırlanıyor', pl: 'Egzamin z francuskiego jest w przygotowaniu' },
    body: {
      en: 'Level tests use English questions, so they’re hidden while you study French. They’ll open once a French question bank is ready.',
      es: 'Los exámenes de nivel usan preguntas en inglés, así que están ocultos mientras estudias francés. Se abrirán cuando haya un banco de preguntas en francés.',
      'pt-BR': 'As provas de nível usam perguntas em inglês, então ficam ocultas enquanto você estuda francês. Elas abrirão quando houver um banco de perguntas em francês.',
      vi: 'Bài kiểm tra cấp độ dùng câu hỏi tiếng Anh nên được ẩn khi bạn học tiếng Pháp. Chúng sẽ mở khi có kho câu hỏi tiếng Pháp.',
      id: 'Ujian level memakai soal bahasa Inggris, jadi disembunyikan saat kamu belajar bahasa Prancis. Ujian akan terbuka setelah bank soal bahasa Prancis siap.',
      tr: 'Seviye sınavları İngilizce sorular kullanır, bu yüzden Fransızca çalışırken gizlenir. Fransızca soru bankası hazır olunca açılacak.',
      pl: 'Egzaminy poziomu mają pytania po angielsku, więc są ukryte, gdy uczysz się francuskiego. Otworzą się, gdy baza pytań po francusku będzie gotowa.',
    },
  },
  final: {
    title: { en: 'The French final test is on its way', es: 'El examen final de francés está en preparación', 'pt-BR': 'A prova final de francês está sendo preparada', vi: 'Bài kiểm tra cuối tiếng Pháp đang được chuẩn bị', id: 'Ujian akhir bahasa Prancis sedang disiapkan', tr: 'Fransızca final sınavı hazırlanıyor', pl: 'Egzamin końcowy z francuskiego jest w przygotowaniu' },
    body: {
      en: 'The final test is in English, so it’s hidden while you study French. It’ll open once a French version is created and checked.',
      es: 'El examen final está en inglés, así que está oculto mientras estudias francés. Se abrirá cuando haya una versión en francés revisada.',
      'pt-BR': 'A prova final está em inglês, então fica oculta enquanto você estuda francês. Ela abrirá quando houver uma versão em francês revisada.',
      vi: 'Bài kiểm tra cuối bằng tiếng Anh nên được ẩn khi bạn học tiếng Pháp. Bài sẽ mở khi có phiên bản tiếng Pháp đã được kiểm tra.',
      id: 'Ujian akhir berbahasa Inggris, jadi disembunyikan saat kamu belajar bahasa Prancis. Ujian akan terbuka setelah versi bahasa Prancis dibuat dan diperiksa.',
      tr: 'Final sınavı İngilizce olduğu için Fransızca çalışırken gizlenir. Fransızca sürümü hazırlanıp kontrol edilince açılacak.',
      pl: 'Egzamin końcowy jest po angielsku, więc jest ukryty, gdy uczysz się francuskiego. Otworzy się, gdy powstanie sprawdzona wersja po francusku.',
    },
  },
};
const TO_LESSONS_OTHER: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }> = { en: 'To lessons', es: 'A las lecciones', 'pt-BR': 'Para as lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere', pl: 'Do lekcji' };

export function frenchExamGateCopy(kind: FrenchExamGateKind, sourceLocale?: string) {
  const ru = frenchExamGateCopyRuUk(kind, 'ru');
  const uk = frenchExamGateCopyRuUk(kind, 'uk');
  const other = FRENCH_EXAM_GATE_OTHER[kind];
  const lang = (sourceLocale ?? 'ru') as UiLang;
  return {
    title: triLang(lang, ruUkPlus(ru.title, uk.title, other.title)),
    body: triLang(lang, ruUkPlus(ru.body, uk.body, other.body)),
    cta: triLang(lang, ruUkPlus(ru.cta, uk.cta, TO_LESSONS_OTHER)),
  };
}

export default function __ExamTargetGateRouteShim() {
  return null;
}
