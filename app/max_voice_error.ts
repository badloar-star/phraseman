import { triLang, type Lang } from '../constants/i18n';

/**
 * Нормализация ошибок MAX Voice на границе Firebase/native/OpenAI.
 *
 * Firebase Functions заворачивает серверное `HttpsError.message` по-разному
 * на iOS/Android и между версиями SDK. UI и транспорт не должны зависеть от
 * строки вида `[functions/failed-precondition] ...`, поэтому здесь выделяем
 * стабильный машинный reason без показа пользователю сырого исключения.
 */

const KNOWN_REASONS = [
  'ai_globally_disabled',
  'app_check_unavailable',
  'auth_required',
  'connection_timeout',
  'dev_admin_required',
  'media_failed',
  'mint_malformed',
  'native_unavailable',
  'network_unavailable',
  'openai_key_missing',
  'preflight_failed',
  'reconnect_exhausted',
  'sdp_exchange_failed',
  'server_timeout',
  'service_unavailable',
  'set_remote_description_failed',
  'voice_budget_exhausted',
  'voice_disabled',
  'voice_max_required',
  'voice_mint_rate_limited',
  'voice_provider_failed',
  'voice_daily_quota_exhausted',
  'voice_monthly_quota_exhausted',
  'voice_quota_exhausted',
  'voice_session_active',
  'voice_trial_paused',
] as const;

export type MaxVoiceFailureReason = typeof KNOWN_REASONS[number] | string;

function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (!error || typeof error !== 'object') return '';
  const e = error as Record<string, unknown>;
  return [e.code, e.message, e.details, e.nativeErrorCode]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

/** Выделить стабильную причину из FirebaseError/Error/нативного исключения. */
export function maxVoiceFailureReason(error: unknown, fallback: string): MaxVoiceFailureReason {
  const raw = errorText(error);
  for (const reason of KNOWN_REASONS) {
    if (raw.includes(reason)) return reason;
  }
  if (/network-request-failed|not connected|network connection|offline|internet/.test(raw)) {
    return 'network_unavailable';
  }
  if (/deadline-exceeded|timed?\s*out|timeout/.test(raw)) return 'server_timeout';
  if (/unauthenticated|permission-denied/.test(raw)) return 'auth_required';
  if (/unavailable|internal/.test(raw)) return 'service_unavailable';
  return fallback;
}

/**
 * зачем: аудит 2026-08-22 — «Повторить подготовку» предлагалась и там, где
 * повтор заведомо бесполезен (кончились минуты, линия выключена, нет нативного
 * модуля). Для таких причин пре-экран прячет ретрай и оставляет объяснение.
 */
const NON_RETRYABLE_REASONS: ReadonlySet<string> = new Set([
  'ai_globally_disabled',
  'dev_admin_required',
  'native_unavailable',
  'voice_budget_exhausted',
  'voice_disabled',
  'voice_max_required',
  'voice_daily_quota_exhausted',
  'voice_monthly_quota_exhausted',
  'voice_quota_exhausted',
  'voice_trial_paused',
]);

export function isMaxVoiceFailureRetryable(reason: string | null | undefined): boolean {
  return !NON_RETRYABLE_REASONS.has(String(reason ?? ''));
}

export function shouldOfferMaxUpgradeForVoiceReason(
  reason: string | null | undefined,
): boolean {
  // Месячная квота теперь существует только у уже активного тарифа MAX.
  // Пейвол нужен лишь Free/Плюс/Про после единственного пробного звонка.
  return reason === 'voice_max_required';
}

/** Ошибка с reason, который транспорт может безопасно передать UI-автомату. */
export class MaxVoiceStageError extends Error {
  constructor(readonly reason: MaxVoiceFailureReason, readonly causeValue?: unknown) {
    super(reason);
    this.name = 'MaxVoiceStageError';
  }
}

/** Конкретное, но безопасное объяснение + действие для экрана отказа. */
export function maxVoiceFailureMessage(reason: string | null, lang: Lang): string {
  if (reason === 'voice_disabled' || reason === 'ai_globally_disabled') {
    return triLang(lang, {
      ru: 'Голосовая линия сейчас выключена на сервере. Попробуй позже.',
      uk: 'Голосова лінія зараз вимкнена на сервері. Спробуй пізніше.',
      es: 'La línea de voz está desactivada en el servidor. Inténtalo más tarde.',
      'pt-BR': 'A linha de voz está desativada no servidor. Tente mais tarde.',
      vi: 'Đường dây thoại đang bị tắt trên máy chủ. Hãy thử lại sau.',
      id: 'Jalur suara sedang dinonaktifkan di server. Coba lagi nanti.',
      tr: 'Ses hattı sunucuda kapalı. Daha sonra tekrar dene.',
      pl: 'Linia głosowa jest wyłączona na serwerze. Spróbuj później.',
    });
  }
  if (reason === 'voice_daily_quota_exhausted') {
    return triLang(lang, {
      ru: 'Минуты MAX на сегодня закончились. Лимит восстановится автоматически.',
      uk: 'Хвилини MAX на сьогодні закінчилися. Ліміт відновиться автоматично.',
      es: 'Se acabaron los minutos MAX de hoy. El límite se renovará automáticamente.',
      'pt-BR': 'Os minutos MAX de hoje acabaram. O limite será renovado automaticamente.',
      vi: 'Số phút MAX hôm nay đã hết. Giới hạn sẽ tự động được đặt lại.',
      id: 'Menit MAX hari ini habis. Batas akan pulih otomatis.',
      tr: 'Bugünkü MAX dakikaları bitti. Limit otomatik yenilenecek.',
      pl: 'Dzisiejsze minuty MAX się skończyły. Limit odnowi się automatycznie.',
    });
  }
  if (reason === 'voice_monthly_quota_exhausted') {
    return triLang(lang, {
      ru: 'Месячный запас минут MAX закончился. Он восстановится в следующем месяце.',
      uk: 'Місячний запас хвилин MAX закінчився. Він відновиться наступного місяця.',
      es: 'Se acabaron los minutos MAX del mes. Se renovarán el próximo mes.',
      'pt-BR': 'Os minutos MAX do mês acabaram. Eles serão renovados no próximo mês.',
      vi: 'Số phút MAX trong tháng đã hết. Hạn mức sẽ được làm mới vào tháng tới.',
      id: 'Menit MAX bulan ini habis. Batas akan diperbarui bulan depan.',
      tr: 'Bu ayın MAX dakikaları bitti. Gelecek ay yenilenecek.',
      pl: 'Miesięczny zapas minut MAX się skończył. Odnowi się w przyszłym miesiącu.',
    });
  }
  if (reason === 'voice_quota_exhausted') {
    return triLang(lang, {
      ru: 'Доступных минут MAX недостаточно. Лимит восстановится автоматически.',
      uk: 'Доступних хвилин MAX недостатньо. Ліміт відновиться автоматично.',
      es: 'No quedan suficientes minutos MAX. El límite se renovará automáticamente.',
      'pt-BR': 'Não há minutos MAX suficientes. O limite será renovado automaticamente.',
      vi: 'Không còn đủ phút MAX. Giới hạn sẽ tự động được đặt lại.',
      id: 'Menit MAX yang tersedia tidak cukup. Batas akan pulih otomatis.',
      tr: 'Yeterli MAX dakikası kalmadı. Limit otomatik yenilenecek.',
      pl: 'Brakuje dostępnych minut MAX. Limit odnowi się automatycznie.',
    });
  }
  if (reason === 'voice_max_required') {
    return triLang(lang, {
      ru: 'Для этого звонка нужен доступ MAX или доступный пробный звонок.',
      uk: 'Для цього дзвінка потрібен доступ MAX або доступний пробний дзвінок.',
      es: 'Esta llamada requiere acceso MAX o una llamada de prueba disponible.',
      'pt-BR': 'Esta ligação requer acesso MAX ou uma chamada de teste disponível.',
      vi: 'Cuộc gọi này cần quyền MAX hoặc một cuộc gọi dùng thử còn hiệu lực.',
      id: 'Panggilan ini memerlukan akses MAX atau panggilan uji coba yang tersedia.',
      tr: 'Bu arama için MAX erişimi veya kullanılabilir deneme araması gerekir.',
      pl: 'Ta rozmowa wymaga dostępu MAX albo dostępnej rozmowy próbnej.',
    });
  }
  // зачем: владелец 2026-08-16 — DEV-гейт звонка снят навсегда, сервер больше не
  // отдаёт dev_admin_required (functions/src/max_voice_mint.ts). Текст удалён,
  // чтобы плашка не могла вернуться на экран; сам reason оставлен в KNOWN_REASONS
  // ради старых сборок в проде — они получат общий текст «связь не установилась».
  if (reason === 'media_failed') {
    return triLang(lang, {
      ru: 'Не удалось запустить микрофон. Проверь разрешение микрофона в настройках устройства.',
      uk: 'Не вдалося запустити мікрофон. Перевір дозвіл мікрофона в налаштуваннях пристрою.',
      es: 'No se pudo iniciar el micrófono. Revisa su permiso en los ajustes del dispositivo.',
      'pt-BR': 'Não foi possível iniciar o microfone. Verifique a permissão nas configurações do dispositivo.',
      vi: 'Không thể bật micrô. Hãy kiểm tra quyền micrô trong phần cài đặt thiết bị.',
      id: 'Mikrofon tidak dapat dimulai. Periksa izin mikrofon di pengaturan perangkat.',
      tr: 'Mikrofon başlatılamadı. Cihaz ayarlarından mikrofon iznini kontrol et.',
      pl: 'Nie udało się uruchomić mikrofonu. Sprawdź uprawnienie w ustawieniach urządzenia.',
    });
  }
  if (reason === 'native_unavailable') {
    return triLang(lang, {
      ru: 'В этой сборке нет нативного WebRTC. Установи новую DEV-сборку.',
      uk: 'У цій збірці немає нативного WebRTC. Встанови нову DEV-збірку.',
      es: 'Esta compilación no incluye WebRTC nativo. Instala una nueva compilación DEV.',
      'pt-BR': 'Esta build não inclui WebRTC nativo. Instale uma nova build DEV.',
      vi: 'Bản dựng này không có WebRTC gốc. Hãy cài bản DEV mới.',
      id: 'Build ini tidak memiliki WebRTC native. Instal build DEV baru.',
      tr: 'Bu derlemede yerel WebRTC yok. Yeni bir DEV derlemesi yükle.',
      pl: 'Ta kompilacja nie zawiera natywnego WebRTC. Zainstaluj nową kompilację DEV.',
    });
  }
  // зачем: пробник пожизненный и один на аккаунт, поэтому на этой ступени
  // (voice_trial_paused — бюджет ставит пробники на паузу ДО резерва, штамп
  // trialUsedAtMs не выставляется) человеку обязательно надо сказать, что его
  // единственный звонок цел. Иначе отказ читается как «я только что его сжёг».
  if (reason === 'voice_trial_paused') {
    return triLang(lang, {
      ru: 'Линия временно достигла дневного лимита. Пробный звонок остался у тебя — повтори позже.',
      uk: 'Лінія тимчасово досягла денного ліміту. Пробний дзвінок лишився в тебе — повтори пізніше.',
      es: 'La línea alcanzó temporalmente su límite diario. Tu llamada de prueba sigue disponible: inténtalo más tarde.',
      'pt-BR': 'A linha atingiu temporariamente o limite diário. Sua chamada de teste continua disponível: tente mais tarde.',
      vi: 'Đường dây tạm thời đã đạt giới hạn hằng ngày. Cuộc gọi dùng thử của bạn vẫn còn — hãy thử lại sau.',
      id: 'Jalur sementara mencapai batas harian. Panggilan uji cobamu masih utuh — coba lagi nanti.',
      tr: 'Hat geçici olarak günlük limite ulaştı. Deneme aramanı kaybetmedin — daha sonra tekrar dene.',
      pl: 'Linia tymczasowo osiągnęła dzienny limit. Twoja rozmowa próbna nadal czeka — spróbuj później.',
    });
  }
  if (reason === 'voice_budget_exhausted') {
    return triLang(lang, {
      ru: 'Линия временно достигла дневного лимита. Повтори звонок позже.',
      uk: 'Лінія тимчасово досягла денного ліміту. Повтори дзвінок пізніше.',
      es: 'La línea alcanzó temporalmente su límite diario. Inténtalo más tarde.',
      'pt-BR': 'A linha atingiu temporariamente o limite diário. Tente mais tarde.',
      vi: 'Đường dây tạm thời đã đạt giới hạn hằng ngày. Hãy thử lại sau.',
      id: 'Jalur sementara mencapai batas harian. Coba lagi nanti.',
      tr: 'Hat geçici olarak günlük limite ulaştı. Daha sonra tekrar dene.',
      pl: 'Linia tymczasowo osiągnęła dzienny limit. Spróbuj później.',
    });
  }
  return triLang(lang, {
    ru: 'Связь не установилась. Проверь интернет и повтори звонок — минуты не списаны.',
    uk: 'Зв’язок не встановився. Перевір інтернет і повтори дзвінок — хвилини не списані.',
    es: 'No se estableció la conexión. Revisa Internet y vuelve a llamar; no se descontaron minutos.',
    'pt-BR': 'A conexão não foi estabelecida. Verifique a internet e ligue novamente; nenhum minuto foi descontado.',
    vi: 'Không thể kết nối. Hãy kiểm tra Internet và gọi lại; số phút chưa bị trừ.',
    id: 'Koneksi gagal. Periksa internet dan telepon lagi; menit tidak dipotong.',
    tr: 'Bağlantı kurulamadı. İnterneti kontrol edip tekrar ara; dakika düşülmedi.',
    pl: 'Nie udało się połączyć. Sprawdź Internet i zadzwoń ponownie; minuty nie zostały odjęte.',
  });
}

/* expo-router route shim: файлы в app/ считаются роутами. */
export default function __RouteShim() {
  return null;
}
