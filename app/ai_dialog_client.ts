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
  aiErrorToast,
  aiGlobalBudgetToast,
  AI_GLOBAL_BUDGET_ERROR_CODE,
} from './ai_kill_switch_copy';

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

  if (text.includes('dialog_free_limit')) return 'free_limit';
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
    text.includes('deadline-exceeded')
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
        ru: 'Пробный диалог уже пройден. Открой все диалоги — полный доступ.',
        uk: 'Пробний діалог уже пройдено. Відкрий усі діалоги — повний доступ.',
        es: 'Ya usaste tu diálogo gratis. Abre todos los diálogos con Plus.',
        'pt-BR': 'Você já usou o diálogo grátis. Desbloqueie todos os diálogos com Plus.',
        vi: 'Bạn đã dùng cuộc đối thoại miễn phí. Mở tất cả cuộc đối thoại với Plus.',
        id: 'Dialog gratis sudah digunakan. Buka semua dialog dengan Plus.',
        tr: 'Ücretsiz diyaloğu zaten kullandın. Plus ile tüm diyalogları aç.',
        pl: 'Darmowy dialog został już wykorzystany. Otwórz wszystkie dialogi z Plus.',
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
    case 'global_budget': {
      // Глобальный бюджет ИИ иссяк (на всех). Забавная плашка вместо сухого
      // «сервис недоступен» — тот же набор, что и в разборе ошибок.
      const budget = aiGlobalBudgetToast(lang);
      return `${budget.title}\n\n${budget.message}`;
    }
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
    case 'network':
    case 'unknown':
    default: {
      // ИИ не ответил / связь оборвалась / непонятный сбой. Забавная плашка
      // вместо сухого текста — тот же набор, что и в разборе ошибок; зовёт
      // «попробуй ещё раз», и кнопка «Повторить» для этих видов доступна.
      const copy = aiErrorToast(lang);
      return `${copy.title}\n\n${copy.message}`;
    }
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

export async function callPremiumDialogSend(req: PremiumDialogRequest): Promise<PremiumDialogResponse> {
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  // Возрастная группа берётся из единого источника (age_gate) и уходит на сервер
  // для safety-флага и возрастного гейта (defense-in-depth поверх клиентского блока).
  const key = premiumDialogSendRequestKey(req);
  const existing = premiumDialogSendInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<PremiumDialogRequest, PremiumDialogResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'premiumDialogSend',
    );
    const res = await fn(req);
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
}

/** Одно исправление: как сказал ученик → как естественнее + короткое пояснение. */
export interface PremiumDialogReviewCorrection {
  /** Фраза ученика как была написана (или её проблемная часть). */
  original: string;
  /** Естественный английский вариант. */
  corrected: string;
  /** Короткое тёплое пояснение на языке интерфейса (без жаргона). */
  note: string;
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
    const res = await fn(req);
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
    const res = await fn(req);
    return res.data;
  })().finally(() => {
    premiumDialogTranslateInFlight.delete(key);
  });

  premiumDialogTranslateInFlight.set(key, request);
  return request;
}
