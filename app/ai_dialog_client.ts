/**
 * Клиент для премиум-функции ИИ-диалогов (premiumDialogSend).
 * Паттерн скопирован с community_packs/functionsClient.ts.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { triLang, type Lang } from '../constants/i18n';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  aiOffline,
  AiOfflineError,
  AI_GLOBAL_BUDGET_ERROR_CODE,
} from './ai_kill_switch_copy';
import {
  warmAiFunction,
  withAiCallableRetry,
  isDefinitelyNotStarted,
  aiAttemptTimeoutMs,
} from './ai_callable_resilience';
import {
  withExplainCallableTimeout,
  EXPLAIN_CALLABLE_TIMEOUT_MS,
} from './explain_callable_timeout';

const FUNCTIONS_REGION = 'us-central1';
const premiumDialogSendInFlight = new Map<string, Promise<PremiumDialogResponse>>();
const premiumDialogTranslateInFlight = new Map<string, Promise<PremiumDialogTranslateResponse>>();
const premiumDialogReviewInFlight = new Map<string, Promise<PremiumDialogReviewResponse>>();

export type DialogChatRole = 'user' | 'assistant';

export interface DialogChatTurn {
  role: DialogChatRole;
  content: string;
}

/** Память коуча для режима companion (собирается из профиля + SRS-истории). */
export interface DialogMemory {
  profile?: string;
  weakWords?: string[];
  summary?: string;
}

export interface PremiumDialogRequest {
  mode: 'scenario' | 'companion';
  userText: string;
  cefr?: string;
  history?: DialogChatTurn[];
  /** scenario-режим */
  role?: string;
  setting?: string;
  goalEn?: string;
  /** Характер персонажа (имя, манера речи, настроение) — задаёт живой голос. */
  persona?: string;
  scenarioId?: string;
  /** UI/native-help language. Server uses this for brief meta-help. */
  interfaceLang?: Lang;
  /** Изучаемый язык (StudyTarget 'en'|'fr'). Реплики собеседника — на этом языке. Отсутствие ⇒ сервер 'en'. */
  studyTarget?: string;
  /** companion-режим */
  memory?: DialogMemory;
  isPremium?: boolean;
  /** Возрастная группа для серверного safety-флага и возрастного гейта. */
  /**
   * «Диалог как игра» (scenario): под-цели [{id, en}] и темперамент собеседника.
   * Если переданы — сервер включает игровой режим (mood/исход в ответе).
   */
  objectives?: { id: string; en: string }[];
  temperament?: { patience: 'high' | 'medium' | 'low'; warmth: 'warm' | 'neutral' | 'cold' };
}

export interface PremiumDialogResponse {
  ok: boolean;
  assistantMessage: string;
  remainingQuota: number;
  model: string;
  /**
   * Игровое состояние хода (null/undefined вне игрового режима). Сервер шлёт
   * частично-валидный объект; клиент ОБЯЗАН прогнать его через parseTurnState
   * (dialog_outcome.ts), который безопасно разбирает недостающие/битые поля.
   * Тип намеренно `unknown` — контракт защищён парсером, а не структурой.
   */
  turnState?: unknown;
}

export type PremiumDialogErrorKind =
  | 'free_limit'
  | 'premium_limit'
  | 'global_budget'
  | 'rate_limited'
  | 'auth_required'
  | 'age_restricted'
  | 'provider_unavailable'
  | 'network'
  | 'unknown';

export function classifyPremiumDialogError(error: unknown): PremiumDialogErrorKind {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  const text = `${code} ${message}`;

  if (text.includes('dialog_free_limit') || text.includes('dialog_plus_required')) return 'free_limit';
  if (text.includes('dialog_premium_cap')) return 'premium_limit';
  // Глобальный бюджет ИИ иссяк (на всех сразу) — сервер шлёт resource-exhausted
  // с сообщением 'explain_global_budget'. ВАЖНО: проверяем ДО общего
  // resource-exhausted, иначе это ошибочно уедет в 'rate_limited'.
  if (text.includes(AI_GLOBAL_BUDGET_ERROR_CODE)) return 'global_budget';
  if (text.includes('dialog_rate_limited') || text.includes('resource-exhausted')) return 'rate_limited';
  if (text.includes('auth_required') || text.includes('unauthenticated')) return 'auth_required';
  if (text.includes('age_restricted')) return 'age_restricted';
  if (
    text.includes('dialog_provider_failed') ||
    text.includes('dialog_empty_reply') ||
    text.includes('unavailable') ||
    text.includes('deadline-exceeded') ||
    text.includes('functions/internal')
  ) {
    return 'provider_unavailable';
  }
  if (text.includes('network') || text.includes('timeout')) return 'network';
  return 'unknown';
}

export function getPremiumDialogErrorMessage(
  error: unknown,
  options?: { hasPremiumAccess?: boolean; lang?: Lang },
): string {
  const lang = options?.lang ?? 'ru';
  switch (classifyPremiumDialogError(error)) {
    case 'free_limit':
      if (options?.hasPremiumAccess) {
        return triLang(lang, {
          ru: 'Полный доступ активен, но ещё не везде подхватился. Обнови статус доступа и попробуй ещё раз.',
          uk: 'Повний доступ активний, але ще не всюди підхопився. Онови статус доступу і спробуй ще раз.',
          es: 'Plus está activo en la app, pero el servidor aún no lo ve para el diálogo con IA. Actualiza la suscripción e inténtalo otra vez.',
          'pt-BR': 'Plus está ativo no app, mas o servidor ainda não o vê para o diálogo com IA. Atualize o status da assinatura e tente novamente.',
          vi: 'Plus đã hoạt động trong ứng dụng, nhưng máy chủ chưa nhận ra quyền này cho cuộc đối thoại AI. Hãy cập nhật trạng thái đăng ký rồi thử lại.',
          id: 'Plus sudah aktif di aplikasi, tetapi server belum melihatnya untuk dialog AI. Perbarui status langganan lalu coba lagi.',
          tr: 'Plus uygulamada aktif, ancak sunucu AI diyaloğu için bunu henüz görmüyor. Abonelik durumunu yenileyip tekrar dene.',
          pl: 'Plus jest aktywny w aplikacji, ale serwer jeszcze nie widzi go dla dialogu AI. Odśwież status subskrypcji i spróbuj ponownie.',
        });
      }
      return triLang(lang, {
        ru: 'Диалоги входят в Plus. Открой Plus, чтобы начать разговор.',
        uk: 'Діалоги входять у Plus. Відкрий Plus, щоб почати розмову.',
        es: 'Los diálogos están incluidos en Plus. Abre Plus para empezar a hablar.',
        'pt-BR': 'Os diálogos estão incluídos no Plus. Abra o Plus para começar a conversar.',
        vi: 'Đối thoại thuộc gói Plus. Mở Plus để bắt đầu trò chuyện.',
        id: 'Dialog termasuk dalam Plus. Buka Plus untuk mulai berbicara.',
        tr: 'Diyaloglar Plus kapsamındadır. Konuşmaya başlamak için Plus’ı aç.',
        pl: 'Dialogi są dostępne w Plus. Otwórz Plus, aby zacząć rozmowę.',
      });
    case 'premium_limit':
      return triLang(lang, {
        ru: 'Лимит диалогов на сегодня исчерпан. Попробуй завтра.',
        uk: 'Ліміт діалогів на сьогодні вичерпано. Спробуй завтра.',
        es: 'Se agotó el límite de diálogos de hoy. Inténtalo mañana.',
        'pt-BR': 'O limite de diálogos de hoje acabou. Tente amanhã.',
        vi: 'Bạn đã hết giới hạn đối thoại hôm nay. Hãy thử lại vào ngày mai.',
        id: 'Batas dialog hari ini sudah habis. Coba lagi besok.',
        tr: 'Bugünkü diyalog limiti doldu. Yarın tekrar dene.',
        pl: 'Dzisiejszy limit dialogów został wyczerpany. Spróbuj jutro.',
      });
    case 'global_budget':
      return triLang(lang, {
        ru: 'Сервис диалогов временно недоступен.\n\nДостигнут общий лимит сервиса. Попробуй позже.',
        uk: 'Сервіс діалогів тимчасово недоступний.\n\nДосягнуто загального ліміту сервісу. Спробуй пізніше.',
        es: 'El servicio de diálogos no está disponible temporalmente.\n\nSe alcanzó el límite general del servicio. Inténtalo más tarde.',
        'pt-BR': 'O serviço de diálogos está temporariamente indisponível.\n\nO limite geral do serviço foi atingido. Tente mais tarde.',
        vi: 'Dịch vụ hội thoại tạm thời không khả dụng.\n\nDịch vụ đã đạt giới hạn chung. Hãy thử lại sau.',
        id: 'Layanan dialog untuk sementara tidak tersedia.\n\nBatas umum layanan telah tercapai. Coba lagi nanti.',
        tr: 'Diyalog hizmeti geçici olarak kullanılamıyor.\n\nHizmetin genel sınırına ulaşıldı. Daha sonra tekrar dene.',
        pl: 'Usługa dialogów jest chwilowo niedostępna.\n\nOsiągnięto ogólny limit usługi. Spróbuj później.',
      });
    case 'rate_limited':
      return triLang(lang, {
        ru: 'Слишком много сообщений подряд. Подожди немного и попробуй ещё раз.',
        uk: 'Забагато повідомлень поспіль. Почекай трохи і спробуй ще раз.',
        es: 'Demasiados mensajes seguidos. Espera un poco e inténtalo otra vez.',
        'pt-BR': 'Muitas mensagens seguidas. Espere um pouco e tente novamente.',
        vi: 'Bạn gửi quá nhiều tin nhắn liên tiếp. Hãy đợi một chút rồi thử lại.',
        id: 'Terlalu banyak pesan berturut-turut. Tunggu sebentar lalu coba lagi.',
        tr: 'Arka arkaya çok fazla mesaj gönderdin. Biraz bekleyip tekrar dene.',
        pl: 'Za dużo wiadomości z rzędu. Poczekaj chwilę i spróbuj ponownie.',
      });
    case 'auth_required':
      return triLang(lang, {
        ru: 'Нужно войти в аккаунт, чтобы продолжить диалог.',
        uk: 'Потрібно увійти в акаунт, щоб продовжити діалог.',
        es: 'Necesitas iniciar sesión para continuar el diálogo.',
        'pt-BR': 'Você precisa entrar na conta para continuar o diálogo.',
        vi: 'Bạn cần đăng nhập để tiếp tục cuộc đối thoại.',
        id: 'Kamu perlu masuk ke akun untuk melanjutkan dialog.',
        tr: 'Diyaloğa devam etmek için hesaba giriş yapman gerekiyor.',
        pl: 'Musisz zalogować się na konto, aby kontynuować dialog.',
      });
    case 'age_restricted':
      return triLang(lang, {
        ru: 'ИИ-диалоги доступны только с 16 лет. Сейчас этот режим закрыт настройками безопасности.',
        uk: 'AI-діалоги доступні лише з 16 років. Зараз цей режим закрито налаштуваннями безпеки.',
        es: 'Los diálogos con IA están disponibles solo desde los 16 años. Este modo está bloqueado por seguridad.',
        'pt-BR': 'Os diálogos com IA estão disponíveis apenas a partir dos 16 anos. Este modo está bloqueado por segurança.',
        vi: 'Đối thoại AI chỉ dành cho người từ 16 tuổi. Chế độ này đang bị khóa vì an toàn.',
        id: 'Dialog AI hanya tersedia untuk usia 16+. Mode ini dikunci demi keamanan.',
        tr: 'AI diyalogları yalnızca 16 yaş ve üzeri için açıktır. Bu mod güvenlik nedeniyle kapalı.',
        pl: 'Dialogi AI są dostępne tylko od 16 lat. Ten tryb jest teraz zablokowany ze względów bezpieczeństwa.',
      });
    case 'provider_unavailable':
      return triLang(lang, {
        ru: 'Сервис диалогов временно недоступен.\n\nСообщение не отправлено. Попробуй ещё раз через минуту.',
        uk: 'Сервіс діалогів тимчасово недоступний.\n\nПовідомлення не надіслано. Спробуй ще раз за хвилину.',
        es: 'El servicio de diálogos no está disponible temporalmente.\n\nEl mensaje no se envió. Inténtalo de nuevo en un minuto.',
        'pt-BR': 'O serviço de diálogos está temporariamente indisponível.\n\nA mensagem não foi enviada. Tente novamente em um minuto.',
        vi: 'Dịch vụ hội thoại tạm thời không khả dụng.\n\nTin nhắn chưa được gửi. Hãy thử lại sau một phút.',
        id: 'Layanan dialog untuk sementara tidak tersedia.\n\nPesan belum terkirim. Coba lagi dalam satu menit.',
        tr: 'Diyalog hizmeti geçici olarak kullanılamıyor.\n\nMesaj gönderilmedi. Bir dakika sonra tekrar dene.',
        pl: 'Usługa dialogów jest chwilowo niedostępna.\n\nWiadomość nie została wysłana. Spróbuj ponownie za minutę.',
      });
    case 'network':
      return triLang(lang, {
        ru: 'Не удалось связаться с сервером.\n\nПроверь интернет-соединение и попробуй ещё раз.',
        uk: 'Не вдалося зв’язатися із сервером.\n\nПеревір інтернет-з’єднання та спробуй ще раз.',
        es: 'No se pudo conectar con el servidor.\n\nComprueba tu conexión a internet e inténtalo de nuevo.',
        'pt-BR': 'Não foi possível conectar ao servidor.\n\nVerifique sua conexão com a internet e tente novamente.',
        vi: 'Không thể kết nối với máy chủ.\n\nHãy kiểm tra kết nối mạng rồi thử lại.',
        id: 'Tidak dapat terhubung ke server.\n\nPeriksa koneksi internet lalu coba lagi.',
        tr: 'Sunucuya bağlanılamadı.\n\nİnternet bağlantını kontrol edip tekrar dene.',
        pl: 'Nie udało się połączyć z serwerem.\n\nSprawdź połączenie z internetem i spróbuj ponownie.',
      });
    case 'unknown':
    default:
      return triLang(lang, {
        ru: 'Не удалось отправить сообщение.\n\nПопробуй ещё раз. Если ошибка повторится, вернись позже.',
        uk: 'Не вдалося надіслати повідомлення.\n\nСпробуй ще раз. Якщо помилка повториться, повернися пізніше.',
        es: 'No se pudo enviar el mensaje.\n\nInténtalo de nuevo. Si el error se repite, vuelve más tarde.',
        'pt-BR': 'Não foi possível enviar a mensagem.\n\nTente novamente. Se o erro continuar, volte mais tarde.',
        vi: 'Không thể gửi tin nhắn.\n\nHãy thử lại. Nếu lỗi lặp lại, hãy quay lại sau.',
        id: 'Pesan tidak dapat dikirim.\n\nCoba lagi. Jika kesalahan berulang, kembali nanti.',
        tr: 'Mesaj gönderilemedi.\n\nTekrar dene. Hata tekrarlanırsa daha sonra geri dön.',
        pl: 'Nie udało się wysłać wiadomości.\n\nSpróbuj ponownie. Jeśli błąd się powtórzy, wróć później.',
      });
  }
}

function premiumDialogSendRequestKey(req: PremiumDialogRequest): string {
  return JSON.stringify({
    mode: req.mode,
    userText: req.userText,
    cefr: req.cefr,
    history: req.history,
    role: req.role,
    setting: req.setting,
    goalEn: req.goalEn,
    persona: req.persona,
    scenarioId: req.scenarioId,
    interfaceLang: req.interfaceLang,
    studyTarget: req.studyTarget ?? 'en',
    memory: req.memory,
    isPremium: req.isPremium,
    objectives: req.objectives,
    temperament: req.temperament,
  });
}

/** Необязательные крючки вызова: UI подменяет подпись под индикатором на повторе. */
export interface CallPremiumDialogSendOptions {
  /** Дёргается, когда первый вызов не удался и пошёл тихий повтор. */
  onRetryStart?: () => void;
}

/**
 * Прогрев инстанса premiumDialogSend. Зовётся при ОТКРЫТИИ экрана диалога —
 * пока пользователь читает приветствие и печатает первое сообщение (5–15 сек),
 * инстанс просыпается, и отправка идёт на тёплый сервер.
 *
 * зачем: у функции minInstances: 0 (владелец не платит за тёплый инстанс,
 * сторож ai_functions_warm_instance_contract). Из трёх ИИ-функций у диалога
 * задержка ощущается сильнее всего — собеседник, который «думает» 5 секунд
 * перед первой репликой, читается как зависший.
 *
 * Никогда не бросает — вызывать через `void`.
 */
export function warmPremiumDialog(): void {
  void warmAiFunction('premiumDialogSend', async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'premiumDialogSend');
    return fn({ warmupPing: true });
  });
}

export async function callPremiumDialogSend(
  req: PremiumDialogRequest,
  options?: CallPremiumDialogSendOptions,
): Promise<PremiumDialogResponse> {
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  // зачем: возрастную группу сюда НЕ добавлять. После онбординга возраст ничего не
  // блокирует (см. age_gate.isFullAccess), а лишняя отправка метки — это передача
  // персональных данных без цели. Закреплено age_post_onboarding_no_blockers_contract.
  const key = premiumDialogSendRequestKey(req);
  const existing = premiumDialogSendInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<PremiumDialogRequest, PremiumDialogResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'premiumDialogSend',
    );
    // зачем: раньше здесь не было НИ таймаута, НИ повтора — при холодном старте
    // (minInstances: 0) сообщение просто не отправлялось, и пользователь видел
    // ошибку. Сторож нужен и сам по себе: без него зависший вызов висел бы вечно.
    //
    // ⚠️ ОСТОРОЖНО с идемпотентностью (разбор аудита 2026-08-04): этот вызов
    // списывает дневную квоту (functions/src/premium_dialog.ts →
    // enforceDailyQuota) ДО обращения к OpenAI. Поэтому здесь строгая проверка
    // isDefinitelyNotStarted, а НЕ общая isColdStartLike.
    //
    // Разница принципиальная: общая проверка повторяет и по ТАЙМАУТУ, а таймаут
    // означает «мы не знаем, что там» — запрос мог дойти, снять квоту и в этот
    // момент генерировать ответ. Повтор снял бы вторую единицу и отправил
    // сообщение дважды. Здесь повторяем ровно те сбои, где сервер гарантированно
    // не начал работу; на таймауте показываем честную ошибку с кнопкой повтора.
    const res = await withAiCallableRetry(
      (attempt) => withExplainCallableTimeout(
        fn(req),
        'premiumDialogSend',
        aiAttemptTimeoutMs(EXPLAIN_CALLABLE_TIMEOUT_MS, attempt),
      ),
      {
        label: 'premiumDialogSend',
        shouldRetry: isDefinitelyNotStarted,
        onRetryStart: options?.onRetryStart,
      },
    );
    return res.data;
  })().finally(() => {
    premiumDialogSendInFlight.delete(key);
  });

  premiumDialogSendInFlight.set(key, request);
  return request;
}

// ── Финальный разбор диалога («разбор полётов») ─────────────────────────────

/** Запрос финального разбора завершённого диалога. */
export interface PremiumDialogReviewRequest {
  /** Полный транскрипт диалога (реплики юзера и собеседника, по порядку). */
  history: DialogChatTurn[];
  cefr?: string;
  interfaceLang?: Lang;
  scenarioId?: string;
  goalEn?: string;
  /** Изучаемый язык (StudyTarget 'en'|'fr'). Отсутствие ⇒ сервер 'en'. */
  studyTarget?: string;
  /**
   * 'text' (по умолчанию) — печатный диалог. 'voice' (МАКС ПЛАН §6.2) —
   * транскрипт голосового MAX-звонка: сервер мягче к артефактам устной речи
   * (filler words, самоисправления) и не меняет форму JSON-ответа.
   */
  mode?: 'text' | 'voice' | 'tutor';
  /** tutor: домашка от учителя (инструмент assign_homework) — уходит в его память. */
  homework?: string[];
  /** tutor: тема следующего урока (set_next_topic). */
  nextTopic?: string;
  /** tutor: просьба ученика, как говорить (set_language_preference). */
  languagePreference?: string;
  /** voice/tutor: флаги безопасности учителя (flag_safety) — сервер пишет safety_flags + Telegram. */
  safetyFlags?: { kind: string; note: string }[];
  /** voice/tutor: id сессии звонка (дедуп журнала с мгновенными репортами). */
  sessionId?: string;
  /** tutor: итоги повторения речи (mark_phrase_result). */
  phraseResults?: { text: string; ok: boolean }[];
  /** tutor: итог сцены-задачи (end_scene outcome). */
  sceneOutcome?: string;
  /** tutor: прогресс по текущей речевой цели (mark_goal_progress). */
  goalProgress?: { goalId: string; mastery: number };
}

/** Одно исправление: как сказал ученик → как естественнее + короткое пояснение. */
export interface PremiumDialogReviewCorrection {
  /** Фраза ученика как была написана (или её проблемная часть). */
  original: string;
  /** Естественный английский вариант. */
  corrected: string;
  /** Короткое тёплое пояснение на языке интерфейса (без жаргона). */
  note: string;
  /**
   * 'polish' — реплика была верной, это лишь более естественный вариант
   * (voice-режим МАКС-звонка); UI не зачёркивает исходник. Отсутствие = 'fix'.
   */
  kind?: 'fix' | 'polish';
}

export interface PremiumDialogReviewResponse {
  ok: boolean;
  /** Похвала на языке интерфейса (что реально получилось). */
  praise: string;
  corrections: PremiumDialogReviewCorrection[];
  /** Один практичный совет на следующий раз (язык интерфейса). */
  tip: string;
}

function premiumDialogReviewRequestKey(req: PremiumDialogReviewRequest): string {
  return JSON.stringify({
    history: req.history,
    cefr: req.cefr,
    interfaceLang: req.interfaceLang,
    scenarioId: req.scenarioId,
    studyTarget: req.studyTarget ?? 'en',
    mode: req.mode ?? 'text',
  });
}

/**
 * Финальный разбор завершённого диалога: похвала + мягкие исправления ВСЕХ
 * языковых ошибок ученика + совет. Зовётся один раз при завершении диалога;
 * сбой не критичен — вызывающий экран просто не показывает секцию разбора.
 */
export async function callPremiumDialogReview(
  req: PremiumDialogReviewRequest,
): Promise<PremiumDialogReviewResponse> {
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  const key = premiumDialogReviewRequestKey(req);
  const existing = premiumDialogReviewInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<PremiumDialogReviewRequest, PremiumDialogReviewResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'premiumDialogReview',
    );
    // Идемпотентно: разбор только читает транскрипт и ничего не списывает.
    const res = await withAiCallableRetry(
      (attempt) => withExplainCallableTimeout(
        fn(req),
        'premiumDialogReview',
        aiAttemptTimeoutMs(EXPLAIN_CALLABLE_TIMEOUT_MS, attempt),
      ),
      { label: 'premiumDialogReview' },
    );
    return res.data;
  })().finally(() => {
    premiumDialogReviewInFlight.delete(key);
  });

  premiumDialogReviewInFlight.set(key, request);
  return request;
}

/** Запрос на перевод одной реплики собеседника на язык интерфейса. */
export interface PremiumDialogTranslateRequest {
  /** Чистый текст реплики (БЕЗ маркеров [[...]]) — их режет клиент перед отправкой. */
  text: string;
  /** Код языка интерфейса (Lang): 'ru' | 'uk' | 'es' | … */
  targetLang: Lang;
  scenarioId?: string;
  /** Изучаемый язык (StudyTarget 'en'|'fr') — язык ИСХОДНОЙ реплики. Отсутствие ⇒ сервер 'en'. */
  studyTarget?: string;
}

export interface PremiumDialogTranslateResponse {
  ok: boolean;
  translation: string;
  /** true — перевод пришёл из серверного кэша (без вызова OpenAI). */
  cached?: boolean;
}

function premiumDialogTranslateRequestKey(req: PremiumDialogTranslateRequest): string {
  return JSON.stringify({
    text: req.text,
    targetLang: req.targetLang,
    scenarioId: req.scenarioId,
    studyTarget: req.studyTarget ?? 'en',
  });
}

/**
 * Переводит реплику собеседника на язык интерфейса (ленивый перевод по нажатию
 * кнопки «Показать перевод»). Лимит «3 на диалог» держит вызывающий экран —
 * сервер только переводит и кэширует.
 */
export async function callPremiumDialogTranslate(
  req: PremiumDialogTranslateRequest,
): Promise<PremiumDialogTranslateResponse> {
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  const key = premiumDialogTranslateRequestKey(req);
  const existing = premiumDialogTranslateInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<PremiumDialogTranslateRequest, PremiumDialogTranslateResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'premiumDialogTranslate',
    );
    // Идемпотентно: перевод кэшируется на сервере, лимит «3 на диалог» держит
    // вызывающий экран локально — повтор упавшего вызова его не тратит.
    // База 25с, а не общие 35с: у premiumDialogTranslate серверный
    // timeoutSeconds всего 20 (functions/src/premium_dialog.ts) — ждать сильно
    // дольше сервера бессмысленно, он к тому моменту уже сдался.
    const res = await withAiCallableRetry(
      (attempt) => withExplainCallableTimeout(
        fn(req),
        'premiumDialogTranslate',
        aiAttemptTimeoutMs(25000, attempt),
      ),
      { label: 'premiumDialogTranslate' },
    );
    return res.data;
  })().finally(() => {
    premiumDialogTranslateInFlight.delete(key);
  });

  premiumDialogTranslateInFlight.set(key, request);
  return request;
}
