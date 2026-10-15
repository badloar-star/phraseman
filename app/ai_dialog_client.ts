/**
 * Клиент для премиум-функции ИИ-диалогов (premiumDialogSend).
 * Паттерн скопирован с community_packs/functionsClient.ts.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { triLang, type Lang } from '../constants/i18n';
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
import { parseAiDialogQuotaObservation } from './ai_dialog_daily_quota';
import { buildDialogueV2CompletionReview } from './dialogue_v2_completion_review_adapter';

const FUNCTIONS_REGION = 'us-central1';
const premiumDialogSendInFlight = new Map<string, Promise<PremiumDialogResponse>>();
const premiumDialogTranslateInFlight = new Map<string, Promise<PremiumDialogTranslateResponse>>();
const premiumDialogReviewInFlight = new Map<string, Promise<PremiumDialogReviewResponse>>();

export type DialogChatRole = 'user' | 'assistant';

export interface DialogChatTurn {
  role: DialogChatRole;
  content: string;
}

/** Память коуча для режима companion (профиль + новая история ошибок). */
export interface DialogMemory {
  profile?: string;
  weakWords?: string[];
  summary?: string;
}

export interface DialogGameStateInput {
  exchangeIndex: number;
  mood: number;
  objectivesMet: string[];
  noProgressTurns: number;
}

export interface DialogQualityMeta {
  repeatDetected: boolean;
  repeatReason: 'none' | 'exact' | 'near';
  similarityBucket: 'none' | 'medium' | 'high' | 'exact';
  regenerationAttempted: boolean;
  regenerationSucceeded: boolean;
  gameModeAvailable: boolean;
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
  /** Изучаемый язык. Обязателен: Dialogues никогда не подменяют его English. */
  studyTarget: string;
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
  /** Каноническое состояние сценария перед текущим ходом. */
  gameState?: DialogGameStateInput;
}

/**
 * Поля тренера, приходящие ВМЕСТЕ с репликой собеседника (редизайн Диалогов,
 * владелец 2026-09-14: «почему так» открывается мгновенно, без генерации).
 * Все на языке интерфейса, кроме suggestions и userFix.corrected — они на
 * изучаемом языке. null/undefined — старый сервер или не игровой режим.
 */
export interface DialogCoachTurn {
  /** Почему собеседник сказал именно так (1-2 предложения, без терминов). */
  note: string;
  /** Перевод всей реплики на язык интерфейса. */
  translation: string;
  /** 2-3 готовых ответа под уровень: тап вставляет их в поле ввода. */
  suggestions: string[];
  /** Мягкая поправка последней реплики ученика; null — ошибок нет. */
  userFix: { corrected: string; note: string } | null;
}

export interface PremiumDialogResponse {
  ok: boolean;
  assistantMessage: string;
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
  model: string;
  /** Поля тренера из того же вызова (см. DialogCoachTurn). */
  coach?: DialogCoachTurn | null;
  /**
   * Игровое состояние хода (null/undefined вне игрового режима). Сервер шлёт
   * частично-валидный объект; клиент ОБЯЗАН прогнать его через parseTurnState
   * (dialog_outcome.ts), который безопасно разбирает недостающие/битые поля.
   * Тип намеренно `unknown` — контракт защищён парсером, а не структурой.
   */
  turnState?: unknown;
  /** Только обезличенные флаги качества; тексты диалога сюда не входят. */
  quality?: DialogQualityMeta;
}

export function parsePremiumDialogResponse(value: unknown): PremiumDialogResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const quota = parseAiDialogQuotaObservation(candidate);
  if (!quota
    || typeof candidate.ok !== 'boolean'
    || typeof candidate.assistantMessage !== 'string'
    || typeof candidate.model !== 'string') return null;
  return {
    ...candidate,
    ...quota,
  } as unknown as PremiumDialogResponse;
}

export type PremiumDialogErrorKind =
  | 'plus_required'
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

  if (text.includes('dialog_plus_required')) return 'plus_required';
  if (text.includes('dialog_free_limit')) return 'free_limit';
  // зачем (D123): тихий суточный потолок Plus (300 ответов) — тот же спокойный
  // «продолжим завтра», что и прежний кап; проверяем ДО общего resource-exhausted.
  if (text.includes('dialog_premium_cap') || text.includes('plus_daily_cap')) return 'premium_limit';
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
    text.includes('dialog_repeated_reply') ||
    // Стриминг оборвался/недоступен — для человека это тот же «сбой у провайдера»
    // с кнопкой «Повторить», а не загадочный код.
    text.includes('dialog_stream_incomplete') ||
    text.includes('stream_unavailable') ||
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
    case 'plus_required':
    case 'free_limit':
      if (options?.hasPremiumAccess) {
        return triLang(lang, {
          ru: 'Полный доступ активен, но ещё не везде подхватился. Обнови статус доступа и попробуй ещё раз.',
          uk: 'Повний доступ активний, але ще не всюди підхопився. Онови статус доступу і спробуй ще раз.',
          en: 'Full access is active but has not caught up everywhere yet. Refresh your access status and try again.',
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
        en: 'Dialogues are part of Plus. Unlock Plus to start talking.',
        es: 'Los diálogos están incluidos en Plus. Abre Plus para empezar a hablar.',
        'pt-BR': 'Os diálogos estão incluídos no Plus. Abra o Plus para começar a conversar.',
        vi: 'Đối thoại thuộc gói Plus. Mở Plus để bắt đầu trò chuyện.',
        id: 'Dialog termasuk dalam Plus. Buka Plus untuk mulai berbicara.',
        tr: 'Diyaloglar Plus kapsamındadır. Konuşmaya başlamak için Plus’ı aç.',
        pl: 'Dialogi są dostępne w Plus. Otwórz Plus, aby zacząć rozmowę.',
      });
    case 'premium_limit':
      // зачем (D123): у Plus на экране «безлимит», а серверный потолок тихий —
      // поэтому без слова «лимит»: спокойно зовём продолжить завтра.
      return triLang(lang, {
        ru: 'На сегодня разговоров достаточно. Продолжим завтра.',
        uk: 'На сьогодні розмов досить. Продовжимо завтра.',
        en: "That's enough talking for today. Let's continue tomorrow.",
        es: 'Por hoy ya hemos hablado bastante. Seguimos mañana.',
        'pt-BR': 'Por hoje já conversamos bastante. Continuamos amanhã.',
        vi: 'Hôm nay trò chuyện vậy là đủ rồi. Mai mình nói tiếp nhé.',
        id: 'Untuk hari ini sudah cukup mengobrol. Kita lanjut besok.',
        tr: 'Bugünlük bu kadar sohbet yeter. Yarın devam ederiz.',
        pl: 'Na dziś wystarczy rozmów. Kontynuujemy jutro.',
      });
    case 'global_budget':
      return triLang(lang, {
        ru: 'Диалоги сейчас недоступны.\n\nПопробуй чуть позже.',
        uk: 'Діалоги зараз недоступні.\n\nСпробуй трохи пізніше.',
        en: 'Dialogues aren’t available right now.\n\nTry again a bit later.',
        es: 'Los diálogos no están disponibles ahora.\n\nInténtalo un poco más tarde.',
        'pt-BR': 'Os diálogos não estão disponíveis agora.\n\nTente de novo daqui a pouco.',
        vi: 'Hội thoại hiện chưa dùng được.\n\nHãy thử lại sau ít phút.',
        id: 'Dialog sedang tidak tersedia.\n\nCoba lagi sebentar lagi.',
        tr: 'Diyaloglar şu an kullanılamıyor.\n\nBiraz sonra tekrar dene.',
        pl: 'Dialogi są teraz niedostępne.\n\nSpróbuj trochę później.',
      });
    case 'rate_limited':
      return triLang(lang, {
        ru: 'Слишком много сообщений подряд. Подожди немного и попробуй ещё раз.',
        uk: 'Забагато повідомлень поспіль. Почекай трохи і спробуй ще раз.',
        en: 'Too many messages in a row. Wait a bit and try again.',
        es: 'Demasiados mensajes seguidos. Espera un poco e inténtalo otra vez.',
        'pt-BR': 'Muitas mensagens seguidas. Espere um pouco e tente novamente.',
        vi: 'Bạn gửi quá nhiều tin nhắn liên tiếp. Hãy đợi một chút rồi thử lại.',
        id: 'Terlalu banyak pesan berturut-turut. Tunggu sebentar lalu coba lagi.',
        tr: 'Arka arkaya çok fazla mesaj gönderdin. Biraz bekleyip tekrar dene.',
        pl: 'Za dużo wiadomości z rzędu. Poczekaj chwilę i spróbuj ponownie.',
      });
    case 'auth_required':
      return triLang(lang, {
        // зачем (аудит по Библии, 2026-08-26): безличная констатация вместо
        // приглашения. Стиль 1 (Тренер): зовём действием, говорим на «ты».
        ru: 'Войди в аккаунт — и продолжим разговор.',
        uk: 'Увійди в акаунт — і продовжимо розмову.',
        en: 'Sign in and we will pick up the conversation.',
        es: 'Inicia sesión y seguimos la conversación.',
        'pt-BR': 'Entre na conta e continuamos a conversa.',
        vi: 'Đăng nhập nhé, rồi mình nói tiếp.',
        id: 'Masuk ke akun, lalu kita lanjut mengobrol.',
        tr: 'Hesabına giriş yap, sohbete devam edelim.',
        pl: 'Zaloguj się, a wrócimy do rozmowy.',
      });
    case 'age_restricted':
      return triLang(lang, {
        ru: 'ИИ-диалоги доступны только с 16 лет. Сейчас этот режим закрыт настройками безопасности.',
        uk: 'AI-діалоги доступні лише з 16 років. Зараз цей режим закрито налаштуваннями безпеки.',
        en: 'AI dialogues are available from age 16 only. This mode is currently locked by safety settings.',
        es: 'Los diálogos con IA están disponibles solo desde los 16 años. Este modo está bloqueado por seguridad.',
        'pt-BR': 'Os diálogos com IA estão disponíveis apenas a partir dos 16 anos. Este modo está bloqueado por segurança.',
        vi: 'Đối thoại AI chỉ dành cho người từ 16 tuổi. Chế độ này đang bị khóa vì an toàn.',
        id: 'Dialog AI hanya tersedia untuk usia 16+. Mode ini dikunci demi keamanan.',
        tr: 'AI diyalogları yalnızca 16 yaş ve üzeri için açıktır. Bu mod güvenlik nedeniyle kapalı.',
        pl: 'Dialogi AI są dostępne tylko od 16 lat. Ten tryb jest teraz zablokowany ze względów bezpieczeństwa.',
      });
    case 'provider_unavailable':
      return triLang(lang, {
        ru: 'Сообщение не отправилось.\n\nПопробуй ещё раз через минуту.',
        uk: 'Повідомлення не надіслалося.\n\nСпробуй ще раз за хвилину.',
        en: 'Your message didn’t send.\n\nTry again in a minute.',
        es: 'El mensaje no se envió.\n\nInténtalo de nuevo en un minuto.',
        'pt-BR': 'A mensagem não foi enviada.\n\nTente novamente em um minuto.',
        vi: 'Tin nhắn chưa gửi được.\n\nHãy thử lại sau một phút.',
        id: 'Pesan belum terkirim.\n\nCoba lagi dalam satu menit.',
        tr: 'Mesaj gönderilemedi.\n\nBir dakika sonra tekrar dene.',
        pl: 'Wiadomość się nie wysłała.\n\nSpróbuj ponownie za minutę.',
      });
    case 'network':
      return triLang(lang, {
        ru: 'Нет связи.\n\nПроверь интернет и попробуй ещё раз.',
        uk: 'Немає зв’язку.\n\nПеревір інтернет і спробуй ще раз.',
        en: 'No connection.\n\nCheck your internet and try again.',
        es: 'Sin conexión.\n\nRevisa tu internet e inténtalo de nuevo.',
        'pt-BR': 'Sem conexão.\n\nVerifique a internet e tente de novo.',
        vi: 'Mất kết nối.\n\nHãy kiểm tra mạng rồi thử lại.',
        id: 'Tidak ada koneksi.\n\nPeriksa internet lalu coba lagi.',
        tr: 'Bağlantı yok.\n\nİnternetini kontrol edip tekrar dene.',
        pl: 'Brak połączenia.\n\nSprawdź internet i spróbuj ponownie.',
      });
    case 'unknown':
    default:
      return triLang(lang, {
        ru: 'Не удалось отправить сообщение.\n\nПопробуй ещё раз. Если ошибка повторится, вернись позже.',
        uk: 'Не вдалося надіслати повідомлення.\n\nСпробуй ще раз. Якщо помилка повториться, повернися пізніше.',
        en: "Couldn't send the message.\n\nTry again. If the error keeps happening, come back later.",
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
    studyTarget: req.studyTarget,
    memory: req.memory,
    isPremium: req.isPremium,
    objectives: req.objectives,
    temperament: req.temperament,
    gameState: req.gameState,
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
export function warmPremiumDialog(studyTarget: string): void {
  void warmAiFunction('premiumDialogSend', async () => {
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'premiumDialogSend');
    return fn({ warmupPing: true, studyTarget });
  });
}

/**
 * Прогрев инстанса premiumDialogTranslate. Зовётся при открытии экрана диалога.
 * зачем (владелец 2026-09-14: «перевод тоже немедленно»): у перевода
 * minInstances: 0, и первое нажатие «Показать перевод» ловило холодный старт
 * 2–5 с. Ping бесплатен — сервер выходит до Firestore и OpenAI.
 * Никогда не бросает — вызывать через `void`.
 */
export function warmPremiumDialogTranslate(studyTarget: string): void {
  void warmAiFunction('premiumDialogTranslate', async () => {
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'premiumDialogTranslate');
    return fn({ warmupPing: true, studyTarget });
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
    const fn = httpsCallable<PremiumDialogRequest, unknown>(
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
    const parsed = parsePremiumDialogResponse(res.data);
    if (!parsed) throw new Error('dialog_response_invalid');
    return parsed;
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
  /** Изучаемый язык. Обязателен: Dialogues никогда не подменяют его English. */
  studyTarget: string;
  /**
   * 'text' (по умолчанию) — печатный диалог. 'voice' —
   * транскрипт голосового диалога: сервер мягче к артефактам устной речи
   * (filler words, самоисправления) и не меняет форму JSON-ответа.
   */
  mode?: 'text' | 'voice' | 'tutor';
  /** tutor: домашка от учителя (инструмент assign_homework) — уходит в его память. */
  homework?: string[];
  /** tutor: тема следующего урока (set_next_topic). */
  nextTopic?: string;
  /** tutor: просьба ученика, как говорить (set_language_preference). */
  languagePreference?: string;
  /** voice/tutor: категории flag_safety; отправляется только обезличенный сигнал без записи разговора. */
  safetyFlags?: { kind: string; note: string }[];
  /** voice/tutor: id сессии звонка (дедуп журнала с мгновенными репортами). */
  sessionId?: string;
  /** tutor: итоги повторения речи (mark_phrase_result). */
  phraseResults?: { text: string; result: 'pass' | 'needs_work' | 'uncertain' | 'invalid' }[];
  /** tutor: итог сцены-задачи (end_scene outcome). */
  sceneOutcome?: string;
  /** tutor: прогресс по текущей речевой цели (mark_goal_progress). */
  goalProgress?: {
    goalId: string;
    mastery: number;
    evidence?: 'scene';
    sceneId?: string;
  };
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
   * (voice-режим звонка); UI не зачёркивает исходник. Отсутствие = 'fix'.
   */
  kind?: 'fix' | 'polish';
}

/**
 * Разбор ОДНОЙ реплики ученика (владелец 2026-09-14: «разбор фраз полноценный,
 * каждой фразы»). 'ok' — сказано верно, 'polish' — верно, но есть естественнее,
 * 'fix' — ошибка.
 */
export interface PremiumDialogReviewPhrase {
  original: string;
  corrected: string;
  note: string;
  kind: 'fix' | 'ok' | 'polish';
}

/** A review observation tied to a verbatim learner message from this session. */
export interface PremiumDialogReviewEvidence {
  learnerTurn: string;
  note: string;
}

/**
 * A released V2 scenario can expose the evaluation of every one of its
 * 6–12 concrete tasks. This is optional so legacy dialogue reviews keep their
 * exact wire format while the terminal surface is migrated gradually.
 */
export interface PremiumDialogReviewObjectiveResult {
  objectiveId: string;
  /** Label comes from the reviewed, target-language scenario pack. */
  label: string;
  status: 'met' | 'not_met';
  /** Accepted learner messages supporting this task result. */
  evidence: string[];
}

export interface PremiumDialogReviewResponse {
  ok: boolean;
  /** Похвала на языке интерфейса (что реально получилось). */
  praise: string;
  /** Общая оценка от лица собеседника, основанная на этой переписке. */
  assessment?: string;
  /** 1–3 проверяемые реплики ученика, которые поддерживают оценку. */
  evidence?: PremiumDialogReviewEvidence[];
  /** V2: detailed status of every task from the released scenario. */
  objectiveResults?: PremiumDialogReviewObjectiveResult[];
  /**
   * V2-only server receipt. This carries no learner text and is accepted only
   * after the terminal debrief itself has passed the V2 grounding checks.
   */
  v2Memory?: {
    sharedMemoryStored: boolean;
    scenarioCheckpointStored: boolean;
  };
  corrections: PremiumDialogReviewCorrection[];
  /** Один практичный совет на следующий раз (язык интерфейса). */
  tip: string;
  /** Разбор каждой реплики ученика по порядку (text-режим). */
  phrases?: PremiumDialogReviewPhrase[];
  /** Оценка разговора 0-100 (text-режим). */
  score?: number;
  /** Free: сколько фраз скрыто за Plus (0 — скрытых нет). */
  lockedPhrases?: number;
  /** Free: разбор урезан сервером до первой фразы. */
  locked?: boolean;
  /** Локальный честный итог, показанный только при недоступности review-сервиса. */
  fallback?: boolean;
  /** Tutor-only durable projection; UI must not claim mastery from local tool output. */
  tutorMemory?: {
    callCount: number;
    homework: string[];
    nextTopic: string;
    acceptedGoalProgress?: { goalId: string; mastery: number };
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseDialogueV2MemoryReceipt(value: unknown): {
  sharedMemoryStored: boolean;
  scenarioCheckpointStored: boolean;
} | null {
  const receipt = record(value);
  if (!receipt) return null;
  const keys = Object.keys(receipt);
  if (keys.length !== 2
    || !keys.includes('sharedMemoryStored')
    || !keys.includes('scenarioCheckpointStored')
    || typeof receipt.sharedMemoryStored !== 'boolean'
    || typeof receipt.scenarioCheckpointStored !== 'boolean') return null;
  return {
    sharedMemoryStored: receipt.sharedMemoryStored,
    scenarioCheckpointStored: receipt.scenarioCheckpointStored,
  };
}

/**
 * Converts the strict V2 completion envelope delivered by the callable into
 * the already-mounted terminal verdict view model. The envelope itself is a
 * server response; its learner claims are still rejected unless they pass the
 * V2 ledger/objective validator in the adapter.
 *
 * Legacy responses retain their established shape during the staged rollout.
 */
export function normalizePremiumDialogReviewCallableResponse(
  value: unknown,
): PremiumDialogReviewResponse | null {
  const response = record(value);
  if (!response || response.ok !== true) return null;
  const hasV2MemoryReceipt = Object.prototype.hasOwnProperty.call(response, 'v2Memory');
  const v2Completion = record(response.v2Completion);
  if (!v2Completion) {
    if (hasV2MemoryReceipt) return null;
    return typeof response.praise === 'string'
      && typeof response.tip === 'string'
      && Array.isArray(response.corrections)
      ? response as unknown as PremiumDialogReviewResponse
      : null;
  }

  const review = buildDialogueV2CompletionReview({
    feedback: v2Completion.feedback,
    context: v2Completion.context,
    objectiveLabels: v2Completion.objectiveLabels,
    personaNames: v2Completion.personaNames,
    userMessages: v2Completion.userMessages,
    evidenceNote: v2Completion.evidenceNote,
  });
  if (!review) return null;
  let v2Memory: PremiumDialogReviewResponse['v2Memory'];
  if (hasV2MemoryReceipt) {
    const receipt = parseDialogueV2MemoryReceipt(response.v2Memory);
    if (!receipt) return null;
    v2Memory = receipt;
  }

  return {
    ok: true,
    praise: '',
    assessment: review.assessment,
    evidence: review.evidence.map((item) => ({ ...item })),
    objectiveResults: review.objectiveResults.map((result) => ({
      ...result,
      evidence: [...result.evidence],
    })),
    corrections: review.corrections.map((correction) => ({ ...correction })),
    tip: review.tip,
    v2Memory,
  };
}

function premiumDialogReviewRequestKey(req: PremiumDialogReviewRequest): string {
  return JSON.stringify({
    history: req.history,
    cefr: req.cefr,
    interfaceLang: req.interfaceLang,
    scenarioId: req.scenarioId,
    studyTarget: req.studyTarget,
    mode: req.mode ?? 'text',
    sessionId: req.sessionId ?? '',
    homework: req.homework ?? [],
    nextTopic: req.nextTopic ?? '',
    languagePreference: req.languagePreference ?? '',
    phraseResults: req.phraseResults ?? [],
    sceneOutcome: req.sceneOutcome ?? '',
    goalProgress: req.goalProgress ?? null,
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
    const fn = httpsCallable<PremiumDialogReviewRequest, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'premiumDialogReview',
    );
    // sessionId делает tutor-обновление памяти идемпотентным; ключ in-flight
    // выше также включает все детерминированные итоги конкретного урока.
    const res = await withAiCallableRetry(
      (attempt) => withExplainCallableTimeout(
        fn(req),
        'premiumDialogReview',
        aiAttemptTimeoutMs(EXPLAIN_CALLABLE_TIMEOUT_MS, attempt),
      ),
      { label: 'premiumDialogReview' },
    );
    const normalized = normalizePremiumDialogReviewCallableResponse(res.data);
    if (!normalized) throw new Error('dialog_review_invalid_response');
    return normalized;
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
  /** Изучаемый язык исходной реплики. Обязателен без English fallback. */
  studyTarget: string;
  /**
   * 'to_native' (по умолчанию) — перевести реплику собеседника на язык
   * интерфейса. 'to_study' — «Как сказать…»: человек написал мысль на родном
   * языке, сервер вернёт 2 готовых варианта на изучаемом.
   */
  direction?: 'to_native' | 'to_study';
  /** 'to_study': уровень ученика, чтобы варианты были ему по силам. */
  cefr?: string;
}

/** Один вариант ответа для «Как сказать…». */
export interface PremiumDialogHowToSayVariant {
  /** Готовая фраза на изучаемом языке — её вставляют в поле ввода. */
  text: string;
  /** Короткая подсказка на языке интерфейса: когда так говорят. */
  hint: string;
}

export interface PremiumDialogTranslateResponse {
  ok: boolean;
  translation: string;
  /** 'to_study': разобранные варианты (в обычном переводе отсутствуют). */
  variants?: PremiumDialogHowToSayVariant[];
  /** true — перевод пришёл из серверного кэша (без вызова OpenAI). */
  cached?: boolean;
}

function premiumDialogTranslateRequestKey(req: PremiumDialogTranslateRequest): string {
  return JSON.stringify({
    text: req.text,
    targetLang: req.targetLang,
    scenarioId: req.scenarioId,
    studyTarget: req.studyTarget,
    // Направление и уровень входят в ключ дедупа: иначе «Как сказать…» и
    // обычный перевод одной и той же строки схлопнулись бы в один запрос и
    // один из них получил бы чужой ответ.
    direction: req.direction ?? 'to_native',
    cefr: req.cefr ?? '',
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
