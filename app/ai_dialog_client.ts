/**
 * Клиент для премиум-функции ИИ-диалогов (premiumDialogSend).
 * Паттерн скопирован с community_packs/functionsClient.ts.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { triLang, type Lang } from '../constants/i18n';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';
const premiumDialogSendInFlight = new Map<string, Promise<PremiumDialogResponse>>();
const premiumDialogTranslateInFlight = new Map<string, Promise<PremiumDialogTranslateResponse>>();

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
  /** UI/native-help language. Dialogue replies stay English; server uses this for brief meta-help. */
  interfaceLang?: Lang;
  /** companion-режим */
  memory?: DialogMemory;
  isPremium?: boolean;
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
  | 'rate_limited'
  | 'auth_required'
  | 'provider_unavailable'
  | 'network'
  | 'unknown';

export function classifyPremiumDialogError(error: unknown): PremiumDialogErrorKind {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  const text = `${code} ${message}`;

  if (text.includes('dialog_free_limit')) return 'free_limit';
  if (text.includes('dialog_premium_cap')) return 'premium_limit';
  if (text.includes('dialog_rate_limited') || text.includes('resource-exhausted')) return 'rate_limited';
  if (text.includes('auth_required') || text.includes('unauthenticated')) return 'auth_required';
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
          es: 'Premium está activo en la app, pero el servidor aún no lo ve para el diálogo con IA. Actualiza la suscripción e inténtalo otra vez.',
          'pt-BR': 'Premium está ativo no app, mas o servidor ainda não o vê para o diálogo com IA. Atualize o status da assinatura e tente novamente.',
          vi: 'Premium đã hoạt động trong ứng dụng, nhưng máy chủ chưa nhận ra quyền này cho cuộc đối thoại AI. Hãy cập nhật trạng thái đăng ký rồi thử lại.',
          id: 'Premium sudah aktif di aplikasi, tetapi server belum melihatnya untuk dialog AI. Perbarui status langganan lalu coba lagi.',
          tr: 'Premium uygulamada aktif, ancak sunucu AI diyaloğu için bunu henüz görmüyor. Abonelik durumunu yenileyip tekrar dene.',
          pl: 'Premium jest aktywny w aplikacji, ale serwer jeszcze nie widzi go dla dialogu AI. Odśwież status subskrypcji i spróbuj ponownie.',
        });
      }
      return triLang(lang, {
        ru: 'Пробный диалог уже пройден. Открой все диалоги — полный доступ.',
        uk: 'Пробний діалог уже пройдено. Відкрий усі діалоги — повний доступ.',
        es: 'Ya usaste tu diálogo gratis. Abre todos los diálogos con Premium.',
        'pt-BR': 'Você já usou o diálogo grátis. Desbloqueie todos os diálogos com Premium.',
        vi: 'Bạn đã dùng cuộc đối thoại miễn phí. Mở tất cả cuộc đối thoại với Premium.',
        id: 'Dialog gratis sudah digunakan. Buka semua dialog dengan Premium.',
        tr: 'Ücretsiz diyaloğu zaten kullandın. Premium ile tüm diyalogları aç.',
        pl: 'Darmowy dialog został już wykorzystany. Otwórz wszystkie dialogi z Premium.',
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
    case 'provider_unavailable':
      return triLang(lang, {
        ru: 'Сейчас не получилось получить ответ. Попробуй ещё раз чуть позже.',
        uk: 'Зараз не вдалося отримати відповідь. Спробуй ще раз трохи пізніше.',
        es: 'El servicio de IA no responde ahora. Inténtalo un poco más tarde.',
        'pt-BR': 'O serviço de IA não está respondendo agora. Tente de novo um pouco mais tarde.',
        vi: 'Dịch vụ AI hiện không phản hồi. Hãy thử lại sau một chút.',
        id: 'Layanan AI sedang tidak merespons. Coba lagi beberapa saat nanti.',
        tr: 'AI servisi şu anda yanıt vermiyor. Biraz sonra tekrar dene.',
        pl: 'Usługa AI teraz nie odpowiada. Spróbuj ponownie trochę później.',
      });
    case 'network':
      return triLang(lang, {
        ru: 'Связь прервалась. Проверь интернет и попробуй ещё раз.',
        uk: 'Зв’язок перервався. Перевір інтернет і спробуй ще раз.',
        es: 'Se cortó la conexión. Revisa internet e inténtalo otra vez.',
        'pt-BR': 'A conexão caiu. Verifique a internet e tente novamente.',
        vi: 'Kết nối bị gián đoạn. Hãy kiểm tra internet rồi thử lại.',
        id: 'Koneksi terputus. Periksa internet lalu coba lagi.',
        tr: 'Bağlantı kesildi. İnternetini kontrol edip tekrar dene.',
        pl: 'Połączenie zostało przerwane. Sprawdź internet i spróbuj ponownie.',
      });
    case 'unknown':
    default:
      return triLang(lang, {
        ru: 'Не получилось получить ответ. Попробуй ещё раз.',
        uk: 'Не вдалося отримати відповідь. Спробуй ще раз.',
        es: 'No se pudo obtener la respuesta. Inténtalo otra vez.',
        'pt-BR': 'Não foi possível receber a resposta. Tente novamente.',
        vi: 'Không lấy được câu trả lời. Hãy thử lại.',
        id: 'Tidak bisa mendapatkan jawaban. Coba lagi.',
        tr: 'Yanıt alınamadı. Tekrar dene.',
        pl: 'Nie udało się uzyskać odpowiedzi. Spróbuj ponownie.',
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
    memory: req.memory,
    isPremium: req.isPremium,
    objectives: req.objectives,
    temperament: req.temperament,
  });
}

export async function callPremiumDialogSend(req: PremiumDialogRequest): Promise<PremiumDialogResponse> {
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

/** Запрос на перевод одной реплики собеседника на язык интерфейса. */
export interface PremiumDialogTranslateRequest {
  /** Чистый текст реплики (БЕЗ маркеров [[...]]) — их режет клиент перед отправкой. */
  text: string;
  /** Код языка интерфейса (Lang): 'ru' | 'uk' | 'es' | … */
  targetLang: Lang;
  scenarioId?: string;
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
