import { ruUkPlus } from '../constants/i18n_ru_uk_plus';
import { triLang, type Lang } from '../constants/i18n';
import { FRENCH_CONTENT_SOURCE_GATE } from './french_content_source_gate';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type VocabularyGateSurface = 'lesson_words' | 'irregular_verbs' | 'preposition_drill';

export type VocabularyContentGate = {
  enabled: boolean;
  studyTarget: 'en' | 'fr';
  reason?: 'french_lesson_vocabulary_server_pack_available' | 'french_vocabulary_source_gate' | 'french_irregular_verbs_source_gate' | 'french_preposition_drill_source_gate';
  blockedRoutes: string[];
  requiredEvidence: string[];
};

const FRENCH_VOCABULARY_EVIDENCE = Object.freeze([
  'french_lesson_vocabulary_bank',
  'french_word_form_review',
  'ru_uk_vocabulary_prompt_review',
  'french_audio_pronunciation_review',
]);

const FRENCH_IRREGULAR_VERB_EVIDENCE = Object.freeze([
  'french_verb_conjugation_bank',
  'french_irregular_verb_model_review',
  'ru_uk_verb_prompt_review',
]);

const FRENCH_PREPOSITION_DRILL_EVIDENCE = Object.freeze([
  'french_preposition_drill_bank',
  'french_preposition_contrast_review',
  'ru_uk_preposition_prompt_review',
]);

export function vocabularyContentAvailableForTarget(
  studyTarget?: RuntimeStudyTarget,
  surface: VocabularyGateSurface = 'lesson_words',
): boolean {
  if (storageStudyTarget(studyTarget) !== 'fr') return true;
  return surface === 'lesson_words';
}

export function vocabularyContentGateForTarget(
  studyTarget?: RuntimeStudyTarget,
  surface: VocabularyGateSurface = 'lesson_words',
): VocabularyContentGate {
  if (storageStudyTarget(studyTarget) !== 'fr') {
    return {
      enabled: true,
      studyTarget: 'en',
      blockedRoutes: [],
      requiredEvidence: [],
    };
  }

  if (surface === 'lesson_words') {
    return {
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_lesson_vocabulary_server_pack_available',
      blockedRoutes: [],
      requiredEvidence: [
        'french_lesson_remote_server_pack',
        'french_lesson_words_remote_runtime',
        'target_scoped_lesson_words_progress',
        'no_english_vocabulary_bank_fallback',
      ],
    };
  }

  return {
    enabled: false,
    studyTarget: 'fr',
    reason: surface === 'irregular_verbs'
      ? 'french_irregular_verbs_source_gate'
      : surface === 'preposition_drill'
        ? 'french_preposition_drill_source_gate'
        : 'french_vocabulary_source_gate',
    blockedRoutes: surface === 'irregular_verbs'
      ? ['/lesson_irregular_verbs']
      : surface === 'preposition_drill'
        ? ['/preposition_drill']
        : ['/lesson_words'],
    requiredEvidence: surface === 'irregular_verbs'
      ? [...FRENCH_IRREGULAR_VERB_EVIDENCE]
      : surface === 'preposition_drill'
        ? [...FRENCH_PREPOSITION_DRILL_EVIDENCE]
        : [...FRENCH_VOCABULARY_EVIDENCE],
  };
}

function frenchVocabularyGateCopyRuUk(
  surface: VocabularyGateSurface,
  lang: Lang,
): { title: string; body: string; action: string } {
  const uk = lang === 'uk';

  if (surface === 'irregular_verbs') {
    return uk
      ? {
          title: 'Французькі дієслова ще на перевірці',
          body: 'Англійський розділ неправильних дієслів приховано в режимі French. Відкриємо цей екран тільки після окремого source gate для французьких дієслів і підказок українською/російською.',
          action: 'До уроку',
        }
      : {
          title: 'Французские глаголы ещё на проверке',
          body: 'Английский раздел неправильных глаголов скрыт в режиме French. Откроем этот экран только после отдельного source gate для французских глаголов и подсказок на русском/украинском.',
          action: 'К уроку',
        };
  }

  if (surface === 'preposition_drill') {
    return uk
      ? {
          title: 'Французькі прийменники ще на перевірці',
          body: 'Англійський тренажер прийменників приховано в режимі French. Відкриємо його тільки після окремого source gate для французьких прийменників, ключових контрастів і підказок українською/російською.',
          action: 'До уроку',
        }
      : {
          title: 'Французские предлоги ещё на проверке',
          body: 'Английский тренажер предлогов скрыт в режиме French. Откроем его только после отдельного source gate для французских предлогов, ключевых контрастов и подсказок на русском/украинском.',
          action: 'К уроку',
        };
  }

  return uk
    ? {
        title: 'Французький словник ще на перевірці',
        body: 'Англійський словник уроку приховано в режимі French, щоб слова, прогрес і помилки не змішувалися. Словник з’явиться після перевіреного French vocabulary source gate.',
        action: 'До уроку',
      }
    : {
        title: 'Французский словарь ещё на проверке',
        body: 'Английский словарь урока скрыт в режиме French, чтобы слова, прогресс и ошибки не смешивались. Словарь появится после проверенного French vocabulary source gate.',
        action: 'К уроку',
      };
}

// зачем (координатор 13.10, проход зоны Ядра по текстам без перевода): окно было только ru/uk — при другом языке интерфейса человек видел русский.
// ru/uk — прежняя функция без изменений (тексты закрепляют тесты gustav_*), остальные 7 языков — здесь.

const FRENCH_VOCAB_GATE_OTHER: Readonly<Record<VocabularyGateSurface, Readonly<{ title: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>; body: Readonly<{ en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }> }>>> = {
  irregular_verbs: {
    title: { en: 'French verbs are still being checked', es: 'Los verbos en francés aún se están revisando', 'pt-BR': 'Os verbos em francês ainda estão em revisão', vi: 'Động từ tiếng Pháp vẫn đang được kiểm tra', id: 'Kata kerja bahasa Prancis masih diperiksa', tr: 'Fransızca fiiller hâlâ kontrol ediliyor', pl: 'Czasowniki francuskie są jeszcze sprawdzane' },
    body: {
      en: 'The English irregular verbs section is hidden while you study French. We’ll open it once the French verbs are checked.',
      es: 'La sección de verbos irregulares en inglés está oculta mientras estudias francés. La abriremos cuando los verbos en francés estén revisados.',
      'pt-BR': 'A seção de verbos irregulares em inglês fica oculta enquanto você estuda francês. Vamos abri-la quando os verbos em francês forem revisados.',
      vi: 'Phần động từ bất quy tắc tiếng Anh được ẩn khi bạn học tiếng Pháp. Chúng tôi sẽ mở khi động từ tiếng Pháp được kiểm tra xong.',
      id: 'Bagian kata kerja tak beraturan bahasa Inggris disembunyikan saat kamu belajar bahasa Prancis. Kami akan membukanya setelah kata kerja bahasa Prancis selesai diperiksa.',
      tr: 'Fransızca çalışırken İngilizce düzensiz fiiller bölümü gizlenir. Fransızca fiiller kontrol edilince açacağız.',
      pl: 'Gdy uczysz się francuskiego, angielski dział czasowników nieregularnych jest ukryty. Otworzymy go, gdy czasowniki francuskie zostaną sprawdzone.',
    },
  },
  preposition_drill: {
    title: { en: 'French prepositions are still being checked', es: 'Las preposiciones en francés aún se están revisando', 'pt-BR': 'As preposições em francês ainda estão em revisão', vi: 'Giới từ tiếng Pháp vẫn đang được kiểm tra', id: 'Preposisi bahasa Prancis masih diperiksa', tr: 'Fransızca edatlar hâlâ kontrol ediliyor', pl: 'Przyimki francuskie są jeszcze sprawdzane' },
    body: {
      en: 'The English prepositions trainer is hidden while you study French. We’ll open it once the French prepositions are checked.',
      es: 'El entrenador de preposiciones en inglés está oculto mientras estudias francés. Lo abriremos cuando las preposiciones en francés estén revisadas.',
      'pt-BR': 'O treino de preposições em inglês fica oculto enquanto você estuda francês. Vamos abri-lo quando as preposições em francês forem revisadas.',
      vi: 'Phần luyện giới từ tiếng Anh được ẩn khi bạn học tiếng Pháp. Chúng tôi sẽ mở khi giới từ tiếng Pháp được kiểm tra xong.',
      id: 'Latihan preposisi bahasa Inggris disembunyikan saat kamu belajar bahasa Prancis. Kami akan membukanya setelah preposisi bahasa Prancis selesai diperiksa.',
      tr: 'Fransızca çalışırken İngilizce edat alıştırması gizlenir. Fransızca edatlar kontrol edilince açacağız.',
      pl: 'Gdy uczysz się francuskiego, angielski trening przyimków jest ukryty. Otworzymy go, gdy przyimki francuskie zostaną sprawdzone.',
    },
  },
  lesson_words: {
    title: { en: 'The French vocabulary is still being checked', es: 'El vocabulario en francés aún se está revisando', 'pt-BR': 'O vocabulário em francês ainda está em revisão', vi: 'Từ vựng tiếng Pháp vẫn đang được kiểm tra', id: 'Kosakata bahasa Prancis masih diperiksa', tr: 'Fransızca kelime listesi hâlâ kontrol ediliyor', pl: 'Słownictwo francuskie jest jeszcze sprawdzane' },
    body: {
      en: 'The lesson’s English vocabulary is hidden while you study French, so words, progress and mistakes don’t mix between languages.',
      es: 'El vocabulario en inglés de la lección está oculto mientras estudias francés, para que las palabras, el progreso y los errores no se mezclen entre idiomas.',
      'pt-BR': 'O vocabulário em inglês da lição fica oculto enquanto você estuda francês, para que palavras, progresso e erros não se misturem entre idiomas.',
      vi: 'Từ vựng tiếng Anh của bài học được ẩn khi bạn học tiếng Pháp, để từ, tiến độ và lỗi không bị lẫn giữa các ngôn ngữ.',
      id: 'Kosakata bahasa Inggris pelajaran ini disembunyikan saat kamu belajar bahasa Prancis, agar kata, kemajuan, dan kesalahan tidak tercampur antarbahasa.',
      tr: 'Fransızca çalışırken dersin İngilizce kelimeleri gizlenir; böylece kelimeler, ilerleme ve hatalar diller arasında karışmaz.',
      pl: 'Gdy uczysz się francuskiego, angielskie słownictwo lekcji jest ukryte, żeby słowa, postęp i błędy nie mieszały się między językami.',
    },
  },
};

export function frenchVocabularyGateCopy(
  surface: VocabularyGateSurface,
  lang: Lang,
): { title: string; body: string; action: string } {
  const ru = frenchVocabularyGateCopyRuUk(surface, 'ru');
  const uk = frenchVocabularyGateCopyRuUk(surface, 'uk');
  const other = FRENCH_VOCAB_GATE_OTHER[surface];
  return {
    title: triLang(lang, ruUkPlus(ru.title, uk.title, other.title)),
    body: triLang(lang, ruUkPlus(ru.body, uk.body, other.body)),
    action: triLang(lang, ruUkPlus(ru.action, uk.action, { en: 'To the lesson', es: 'A la lección', 'pt-BR': 'Para a lição', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derse', pl: 'Do lekcji' })),
  };
}

export const FRENCH_VOCABULARY_SOURCE_GATE_REQUIRED_EVIDENCE = Object.freeze([
  ...FRENCH_VOCABULARY_EVIDENCE,
  ...FRENCH_IRREGULAR_VERB_EVIDENCE,
  ...FRENCH_PREPOSITION_DRILL_EVIDENCE,
  ...FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation,
]);

export default function __VocabularyTargetGateRouteShim() {
  return null;
}
