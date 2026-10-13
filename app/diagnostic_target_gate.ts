import { ruUkPlus } from '../constants/i18n_ru_uk_plus';
import { triLang, type Lang as UiLang } from '../constants/i18n';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type DiagnosticContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason: 'english_diagnostic_bank_available' | 'french_quiz_pack_diagnostic_available' | 'french_diagnostic_source_gate';
  blockedRoutes: readonly string[];
  requiredEvidence: readonly string[];
};

const FRENCH_DIAGNOSTIC_REQUIRED_EVIDENCE = Object.freeze([
  'french_diagnostic_question_bank',
  'french_cefr_placement_review',
  'ru_uk_diagnostic_prompt_review',
  'diagnostic_mistake_mapping_review',
]);

export function diagnosticContentGateForTarget(studyTarget?: RuntimeStudyTarget): DiagnosticContentGate {
  const target = storageStudyTarget(studyTarget);
  if (target === 'fr') {
    return {
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_quiz_pack_diagnostic_available',
      blockedRoutes: [],
      requiredEvidence: [
        'french_quiz_remote_server_pack',
        'french_diagnostic_from_remote_quiz_runtime',
        'target_scoped_diagnostic_progress',
        'no_english_diagnostic_bank_fallback',
      ],
    };
  }

  return {
    enabled: true,
    studyTarget: 'en',
    reason: 'english_diagnostic_bank_available',
    blockedRoutes: [],
    requiredEvidence: [],
  };
}

export function diagnosticContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return diagnosticContentGateForTarget(studyTarget).enabled;
}

function frenchDiagnosticGateCopyRuUk(sourceLocale?: string) {
  const uk = sourceLocale === 'uk';
  return {
    title: uk ? 'Французька діагностика ще готується' : 'Французская диагностика ещё готовится',
    body: uk
      ? 'Англійський діагностичний тест приховано в режимі French. Діагностика відкриється тільки після окремого французького банку, перевіреного за джерелами й рівнями.'
      : 'Английский диагностический тест скрыт в режиме French. Диагностика откроется только после отдельного французского банка, проверенного по источникам и уровням.',
    cta: uk ? 'До уроків' : 'К урокам',
  };
}

// зачем (координатор 13.10, проход зоны Ядра по текстам без перевода): окно было только ru/uk — при другом языке интерфейса человек видел русский.
// ru/uk — прежняя функция без изменений (тексты закрепляют тесты gustav_*), остальные 7 языков — здесь.

const FRENCH_DIAGNOSTIC_GATE_OTHER: Readonly<{ title: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>; body: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>; cta: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }> }> = {
  title: { en: 'The French placement test is on its way', es: 'La prueba de nivel de francés está en preparación', 'pt-BR': 'O teste de nível de francês está sendo preparado', vi: 'Bài kiểm tra trình độ tiếng Pháp đang được chuẩn bị', id: 'Tes penempatan bahasa Prancis sedang disiapkan', tr: 'Fransızca seviye testi hazırlanıyor', pl: 'Test poziomujący z francuskiego jest w przygotowaniu' },
  body: {
    en: 'The placement test is in English, so it’s hidden while you study French. It’ll open once a French version is ready.',
    es: 'La prueba de nivel está en inglés, así que está oculta mientras estudias francés. Se abrirá cuando haya una versión en francés.',
    'pt-BR': 'O teste de nível está em inglês, então fica oculto enquanto você estuda francês. Ele abrirá quando houver uma versão em francês.',
    vi: 'Bài kiểm tra trình độ bằng tiếng Anh nên được ẩn khi bạn học tiếng Pháp. Bài sẽ mở khi có phiên bản tiếng Pháp.',
    id: 'Tes penempatan berbahasa Inggris, jadi disembunyikan saat kamu belajar bahasa Prancis. Tes akan terbuka setelah versi bahasa Prancis siap.',
    tr: 'Seviye testi İngilizce olduğu için Fransızca çalışırken gizlenir. Fransızca sürümü hazır olunca açılacak.',
    pl: 'Test poziomujący jest po angielsku, więc jest ukryty, gdy uczysz się francuskiego. Otworzy się, gdy będzie gotowa wersja po francusku.',
  },
  cta: { en: 'To lessons', es: 'A las lecciones', 'pt-BR': 'Para as lições', vi: 'Đến bài học', id: 'Ke pelajaran', tr: 'Derslere', pl: 'Do lekcji' },
};

export function frenchDiagnosticGateCopy(sourceLocale?: string) {
  const ru = frenchDiagnosticGateCopyRuUk('ru');
  const uk = frenchDiagnosticGateCopyRuUk('uk');
  const o = FRENCH_DIAGNOSTIC_GATE_OTHER;
  const lang = (sourceLocale ?? 'ru') as UiLang;
  return {
    title: triLang(lang, ruUkPlus(ru.title, uk.title, o.title)),
    body: triLang(lang, ruUkPlus(ru.body, uk.body, o.body)),
    cta: triLang(lang, ruUkPlus(ru.cta, uk.cta, o.cta)),
  };
}

export default function __DiagnosticTargetGateRouteShim() {
  return null;
}
