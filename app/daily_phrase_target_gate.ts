import { ruUkPlus } from '../constants/i18n_ru_uk_plus';
import { triLang, type Lang } from '../constants/i18n';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { hasBundledDailyPhrasePack } from './daily_phrase_bundled_packs';

type DailyPhrasePlannedTarget = 'es' | 'de' | 'it';

function isDailyPhrasePlannedTarget(value: RuntimeStudyTarget): value is DailyPhrasePlannedTarget {
  return value === 'es' || value === 'de' || value === 'it';
}

export type DailyPhraseContentGate = {
  enabled: boolean;
  studyTarget: string;
  reason:
    | 'english_daily_phrase_bank_available'
    | 'french_flashcard_system_daily_phrase_available'
    | 'french_daily_phrase_source_gate'
    | 'target_daily_phrase_dev_server_pack'
    | 'target_daily_phrase_bundled_pack'
    | 'native_daily_phrase_pack_not_available'
    | 'unsupported_daily_phrase_target';
  blockedSurfaces: readonly string[];
  requiredEvidence: readonly string[];
};

const FRENCH_DAILY_PHRASE_REQUIRED_EVIDENCE = Object.freeze([
  'french_daily_phrase_bank',
  'ru_uk_daily_phrase_prompt_review',
  'french_flashcard_system_bank',
  'ru_uk_flashcard_prompt_review',
]);

// зачем (владелец 12.10, D163, «сперва логи»): одна строка на смену решения по цели — без шума на каждый рендер карточки.
const lastLoggedGate = new Map<string, string>();
function logGateDecision(gate: DailyPhraseContentGate): DailyPhraseContentGate {
  const signature = `${gate.enabled}:${gate.reason}`;
  if (lastLoggedGate.get(gate.studyTarget) !== signature) {
    lastLoggedGate.set(gate.studyTarget, signature);
    console.log('[DAILY-PHRASE-GATE] decision', JSON.stringify({ // guard-ok: решение гейта с причиной и источником
      studyTarget: gate.studyTarget,
      enabled: gate.enabled,
      reason: gate.reason,
      packSource: gate.reason === 'target_daily_phrase_bundled_pack' ? 'bundled'
        : gate.reason === 'english_daily_phrase_bank_available' ? 'bundled_idiom_bank'
          : gate.reason === 'french_flashcard_system_daily_phrase_available' ? 'remote_flashcards' : 'none',
    }));
  }
  return gate;
}

export function dailyPhraseContentGateForTarget(studyTarget?: RuntimeStudyTarget): DailyPhraseContentGate {
  return logGateDecision(resolveDailyPhraseContentGate(studyTarget));
}

function resolveDailyPhraseContentGate(studyTarget?: RuntimeStudyTarget): DailyPhraseContentGate {
  const target = studyTarget == null ? 'en' : studyTarget;
  if (isDailyPhrasePlannedTarget(target)) {
    // зачем (владелец 12.10 через координатора: «Фразы дня должны быть подключены для ВСЕХ языков… ВКЛЮЧАЙ», D163): принятые
    // пакеты 2026.10.04.editorial-accepted-dev-v1 теперь в сборке (app/daily_phrase_bundled_packs.ts) — dev-сервер не нужен.
    if (hasBundledDailyPhrasePack(target)) {
      return {
        enabled: true,
        studyTarget: target,
        reason: 'target_daily_phrase_bundled_pack',
        blockedSurfaces: [],
        requiredEvidence: [
          `${target}_daily_phrase_editorial_accepted_pack`,
          'bundled_pack_sha256_checked_at_generation',
          'no_english_idiom_bank_fallback',
        ],
      };
    }
    return {
      enabled: false,
      studyTarget: target,
      reason: 'native_daily_phrase_pack_not_available',
      blockedSurfaces: ['home_daily_phrase', 'daily_phrase_quest', 'daily_phrase_save'],
      requiredEvidence: [
        `${target}_daily_phrase_bank`,
        `${target}_daily_phrase_source_evidence`,
        `${target}_daily_phrase_runtime_pack`,
        'no_english_idiom_bank_fallback',
      ],
    };
  }
  if (target === 'fr') {
    return {
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_flashcard_system_daily_phrase_available',
      blockedSurfaces: [],
      requiredEvidence: [
        'french_flashcard_system_bank',
        'french_daily_phrase_from_remote_flashcards_runtime',
        'target_scoped_daily_phrase_cache',
        'no_english_idiom_bank_fallback',
      ],
    };
  }

  if (target !== 'en') {
    return {
      enabled: false,
      studyTarget: String(target),
      reason: 'unsupported_daily_phrase_target',
      blockedSurfaces: ['home_daily_phrase', 'daily_phrase_quest', 'daily_phrase_save'],
      requiredEvidence: ['supported_study_target', 'no_english_idiom_bank_fallback'],
    };
  }

  return {
    enabled: true,
    studyTarget: 'en',
    reason: 'english_daily_phrase_bank_available',
    blockedSurfaces: [],
    requiredEvidence: [],
  };
}

export function dailyPhraseContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return dailyPhraseContentGateForTarget(studyTarget).enabled;
}

function frenchDailyPhraseGateCopyRuUk(sourceLocale?: string) {
  const uk = sourceLocale === 'uk';
  return {
    title: uk ? 'Вислів дня французькою ще готується' : 'Фраза дня для French ещё готовится',
    body: uk
      ? 'Англійський вислів дня приховано в режимі French. Він відкриється тільки після окремого французького банку, перевіреного за джерелами й поясненнями українською/російською.'
      : 'Английская фраза дня скрыта в режиме French. Она откроется только после отдельного французского банка, проверенного по источникам и объяснениям на русском/украинском.',
  };
}

function dailyPhraseGateCopyForTargetRuUk(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: string,
) {
  if (studyTarget === 'fr') return frenchDailyPhraseGateCopyRuUk(sourceLocale);

  const uk = sourceLocale === 'uk';
  const targetLabel = studyTarget === 'es'
    ? 'Spanish'
    : studyTarget === 'de'
      ? 'German'
      : studyTarget === 'it'
        ? 'Italian'
      : uk
        ? 'обраної мови'
        : 'выбранного языка';
  return {
    title: uk
      ? `Фраза дня для ${targetLabel} ще готується`
      : `Фраза дня для ${targetLabel} ещё готовится`,
    body: uk
      ? 'Контент для обраної мови поки недоступний. Англійський вислів не буде показано замість нього.'
      : 'Контент для выбранного языка пока недоступен. Английская фраза не будет показана вместо него.',
  };
}

// зачем (координатор 13.10, проход зоны Ядра по текстам без перевода): окна фразы дня были только ru/uk — при другом языке
// интерфейса человек видел русский. ru/uk — прежние функции без изменений (тексты закрепляют тесты), остальные 7 языков — здесь.
type OtherLang = 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type Other<T> = Readonly<Record<OtherLang, T>>;

const FRENCH_DAILY_OTHER: Readonly<{ title: Other<string>; body: Other<string> }> = {
  title: { en: 'The French phrase of the day is on its way', es: 'La frase del día en francés está en preparación', 'pt-BR': 'A frase do dia em francês está sendo preparada', vi: 'Câu nói trong ngày bằng tiếng Pháp đang được chuẩn bị', id: 'Frasa hari ini dalam bahasa Prancis sedang disiapkan', tr: 'Fransızca günün ifadesi hazırlanıyor', pl: 'Zwrot dnia po francusku jest w przygotowaniu' },
  body: {
    en: 'The English phrase of the day is hidden while you study French. The French one will appear once its phrase bank is ready.',
    es: 'Mientras estudias francés, la frase del día en inglés está oculta. La francesa aparecerá cuando su banco de frases esté listo.',
    'pt-BR': 'Enquanto você estuda francês, a frase do dia em inglês fica oculta. A francesa aparecerá quando o banco de frases estiver pronto.',
    vi: 'Khi bạn học tiếng Pháp, câu nói tiếng Anh trong ngày được ẩn đi. Câu tiếng Pháp sẽ xuất hiện khi kho câu sẵn sàng.',
    id: 'Saat kamu belajar bahasa Prancis, frasa harian bahasa Inggris disembunyikan. Frasa bahasa Prancis akan muncul setelah bank frasanya siap.',
    tr: 'Fransızca çalışırken İngilizce günün ifadesi gizlenir. Fransızcası, ifade bankası hazır olunca görünecek.',
    pl: 'Gdy uczysz się francuskiego, angielski zwrot dnia jest ukryty. Francuski pojawi się, gdy baza zwrotów będzie gotowa.',
  },
};

const TARGET_NAME_OTHER: Readonly<Record<'es' | 'de' | 'it' | 'other', Other<string>>> = {
  es: { en: 'Spanish', es: 'español', 'pt-BR': 'espanhol', vi: 'tiếng Tây Ban Nha', id: 'bahasa Spanyol', tr: 'İspanyolca', pl: 'po hiszpańsku' },
  de: { en: 'German', es: 'alemán', 'pt-BR': 'alemão', vi: 'tiếng Đức', id: 'bahasa Jerman', tr: 'Almanca', pl: 'po niemiecku' },
  it: { en: 'Italian', es: 'italiano', 'pt-BR': 'italiano', vi: 'tiếng Ý', id: 'bahasa Italia', tr: 'İtalyanca', pl: 'po włosku' },
  other: { en: 'your language', es: 'tu idioma', 'pt-BR': 'seu idioma', vi: 'ngôn ngữ đã chọn', id: 'bahasa pilihanmu', tr: 'Seçtiğin dilde', pl: 'w wybranym języku' },
};
const TARGET_TITLE_OTHER: Other<(name: string) => string> = {
  en: (n) => `The phrase of the day in ${n} is on its way`,
  es: (n) => `La frase del día en ${n} está en preparación`,
  'pt-BR': (n) => `A frase do dia em ${n} está sendo preparada`,
  vi: (n) => `Câu nói trong ngày bằng ${n} đang được chuẩn bị`,
  id: (n) => `Frasa hari ini dalam ${n} sedang disiapkan`,
  tr: (n) => `${n} günün ifadesi hazırlanıyor`,
  pl: (n) => `Zwrot dnia ${n} jest w przygotowaniu`,
};
const TARGET_BODY_OTHER: Other<string> = {
  en: 'Content for this language isn’t available yet. We won’t show the English phrase in its place.',
  es: 'El contenido de este idioma aún no está disponible. No mostraremos la frase en inglés en su lugar.',
  'pt-BR': 'O conteúdo deste idioma ainda não está disponível. Não mostraremos a frase em inglês no lugar.',
  vi: 'Nội dung cho ngôn ngữ này chưa có. Chúng tôi sẽ không hiển thị câu tiếng Anh thay thế.',
  id: 'Konten untuk bahasa ini belum tersedia. Kami tidak akan menampilkan frasa bahasa Inggris sebagai gantinya.',
  tr: 'Bu dil için içerik henüz hazır değil. Yerine İngilizce ifadeyi göstermeyeceğiz.',
  pl: 'Treści w tym języku nie są jeszcze dostępne. Nie pokażemy zamiast nich angielskiego zwrotu.',
};

export function frenchDailyPhraseGateCopy(sourceLocale?: string) {
  const ru = frenchDailyPhraseGateCopyRuUk('ru');
  const uk = frenchDailyPhraseGateCopyRuUk('uk');
  const lang = (sourceLocale ?? 'ru') as Lang;
  return {
    title: triLang(lang, ruUkPlus(ru.title, uk.title, FRENCH_DAILY_OTHER.title)),
    body: triLang(lang, ruUkPlus(ru.body, uk.body, FRENCH_DAILY_OTHER.body)),
  };
}

export function dailyPhraseGateCopyForTarget(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: string,
) {
  if (studyTarget === 'fr') return frenchDailyPhraseGateCopy(sourceLocale);
  const ru = dailyPhraseGateCopyForTargetRuUk(studyTarget, 'ru');
  const uk = dailyPhraseGateCopyForTargetRuUk(studyTarget, 'uk');
  const names = TARGET_NAME_OTHER[studyTarget === 'es' || studyTarget === 'de' || studyTarget === 'it' ? studyTarget : 'other'];
  const title = (l: OtherLang) => TARGET_TITLE_OTHER[l](names[l]);
  const lang = (sourceLocale ?? 'ru') as Lang;
  return {
    title: triLang(lang, { ru: ru.title, uk: uk.title, en: title('en'), es: title('es'), 'pt-BR': title('pt-BR'), vi: title('vi'), id: title('id'), tr: title('tr'), pl: title('pl') }),
    body: triLang(lang, ruUkPlus(ru.body, uk.body, TARGET_BODY_OTHER)),
  };
}

export default function __DailyPhraseTargetGateRouteShim() {
  return null;
}
