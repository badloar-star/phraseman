/**
 * Клиент облачных функций «Разговорного клуба» (speakingClubSend/Review) +
 * локальное состояние миссий (звёзды, «миссия дня»). Паттерн — ai_dialog_client.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triLang, type Lang } from '../constants/i18n';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import type { DialogChatTurn } from './ai_dialog_client';
import { aiOffline, AiOfflineError } from './ai_kill_switch_copy';

const FUNCTIONS_REGION = 'us-central1';
const clubSendInFlight = new Map<string, Promise<SpeakingClubSendResponse>>();
const clubReviewInFlight = new Map<string, Promise<SpeakingClubReviewResponse>>();

/**
 * Зеркало серверного FREE_MISSIONS_PER_DAY (functions/src/speaking_club.ts).
 * Сервер — источник правды; клиентский счётчик нужен только для мгновенного
 * UX-замка (показать пейвол ДО первой реплики, а не после ошибки сервера).
 */
export const FREE_MISSIONS_PER_DAY = 1;

export interface SpeakingClubSendRequest {
  userText: string;
  cefr?: string;
  history?: DialogChatTurn[];
  role?: string;
  setting?: string;
  goalEn?: string;
  persona?: string;
  missionId?: string;
  lessonId?: number;
  interfaceLang?: Lang;
  studyTarget?: string;
  objectives?: { id: string; en: string }[];
  temperament?: { patience: 'high' | 'medium' | 'low'; warmth: 'warm' | 'neutral' | 'cold' };
  targetPhrases?: string[];
}

export interface SpeakingClubSendResponse {
  ok: boolean;
  assistantMessage: string;
  remainingQuota: number;
  model: string;
  /** Игровое состояние хода — разбирать через parseTurnState (dialog_outcome). */
  turnState?: unknown;
}

export interface SpeakingClubReviewRequest {
  history: DialogChatTurn[];
  cefr?: string;
  interfaceLang?: Lang;
  missionId?: string;
  goalEn?: string;
  studyTarget?: string;
  targetPhrases?: string[];
}

export interface SpeakingClubReviewCorrection {
  original: string;
  corrected: string;
  note: string;
}

export interface SpeakingClubReviewResponse {
  ok: boolean;
  praise: string;
  corrections: SpeakingClubReviewCorrection[];
  tip: string;
}

export type SpeakingClubErrorKind =
  | 'mission_limit'
  | 'free_limit'
  | 'premium_limit'
  | 'rate_limited'
  | 'auth_required'
  | 'provider_unavailable'
  | 'network'
  | 'unknown';

export function classifySpeakingClubError(error: unknown): SpeakingClubErrorKind {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  const combined = `${code} ${message}`;

  if (combined.includes('club_mission_limit')) return 'mission_limit';
  if (combined.includes('club_free_limit')) return 'free_limit';
  if (combined.includes('club_premium_cap')) return 'premium_limit';
  if (combined.includes('dialog_rate_limited') || combined.includes('resource-exhausted')) return 'rate_limited';
  if (combined.includes('auth_required') || combined.includes('unauthenticated')) return 'auth_required';
  if (
    combined.includes('dialog_provider_failed') ||
    combined.includes('dialog_empty_reply') ||
    combined.includes('unavailable') ||
    combined.includes('deadline-exceeded')
  ) {
    return 'provider_unavailable';
  }
  if (combined.includes('network') || combined.includes('timeout')) return 'network';
  return 'unknown';
}

export function getSpeakingClubErrorMessage(error: unknown, lang: Lang): string {
  switch (classifySpeakingClubError(error)) {
    case 'mission_limit':
      return triLang(lang, {
        ru: 'Миссия дня уже пройдена. Возвращайся завтра — или открой безлимит миссий с Plus.',
        uk: 'Місію дня вже пройдено. Повертайся завтра — або відкрий безліміт місій із Plus.',
        es: 'Ya completaste la misión de hoy. Vuelve mañana o desbloquea misiones ilimitadas con Plus.',
        'pt-BR': 'Você já completou a missão de hoje. Volte amanhã ou desbloqueie missões ilimitadas com o Plus.',
        vi: 'Bạn đã hoàn thành nhiệm vụ hôm nay. Hãy quay lại vào ngày mai hoặc mở khóa nhiệm vụ không giới hạn với Plus.',
        id: 'Misi hari ini sudah selesai. Kembali besok atau buka misi tanpa batas dengan Plus.',
        tr: 'Bugünün görevi tamamlandı. Yarın tekrar gel ya da Plus ile sınırsız görev aç.',
        pl: 'Misja dnia została już ukończona. Wróć jutro albo odblokuj nielimitowane misje z Plus.',
      });
    case 'free_limit':
    case 'premium_limit':
      return triLang(lang, {
        ru: 'Лимит разговоров на сегодня исчерпан. Попробуй завтра.',
        uk: 'Ліміт розмов на сьогодні вичерпано. Спробуй завтра.',
        es: 'Se agotó el límite de conversación de hoy. Inténtalo mañana.',
        'pt-BR': 'O limite de conversas de hoje acabou. Tente amanhã.',
        vi: 'Bạn đã hết giới hạn hội thoại hôm nay. Hãy thử lại vào ngày mai.',
        id: 'Batas percakapan hari ini sudah habis. Coba lagi besok.',
        tr: 'Bugünkü konuşma limiti doldu. Yarın tekrar dene.',
        pl: 'Dzisiejszy limit rozmów został wyczerpany. Spróbuj jutro.',
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
        ru: 'Нужно войти в аккаунт, чтобы начать миссию.',
        uk: 'Потрібно увійти в акаунт, щоб почати місію.',
        es: 'Necesitas iniciar sesión para empezar la misión.',
        'pt-BR': 'Você precisa entrar na conta para começar a missão.',
        vi: 'Bạn cần đăng nhập để bắt đầu nhiệm vụ.',
        id: 'Kamu perlu masuk ke akun untuk memulai misi.',
        tr: 'Göreve başlamak için hesaba giriş yapman gerekiyor.',
        pl: 'Musisz zalogować się na konto, aby rozpocząć misję.',
      });
    case 'provider_unavailable':
      return triLang(lang, {
        ru: 'Сейчас не получилось получить ответ. Попробуй ещё раз чуть позже.',
        uk: 'Зараз не вдалося отримати відповідь. Спробуй ще раз трохи пізніше.',
        es: 'El servicio de IA no responde ahora. Inténtalo un poco más tarde.',
        'pt-BR': 'O serviço de IA não está respondendo agora. Tente de novo mais tarde.',
        vi: 'Dịch vụ AI hiện không phản hồi. Hãy thử lại sau một chút.',
        id: 'Layanan AI sedang tidak merespons. Coba lagi beberapa saat nanti.',
        tr: 'AI servisi şu anda yanıt vermiyor. Biraz sonra tekrar dene.',
        pl: 'Usługa AI teraz nie odpowiada. Spróbuj ponownie później.',
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

function clubSendRequestKey(req: SpeakingClubSendRequest): string {
  return JSON.stringify({
    userText: req.userText,
    history: req.history,
    missionId: req.missionId,
    interfaceLang: req.interfaceLang,
    studyTarget: req.studyTarget ?? 'en',
  });
}

export async function callSpeakingClubSend(req: SpeakingClubSendRequest): Promise<SpeakingClubSendResponse> {
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  const key = clubSendRequestKey(req);
  const existing = clubSendInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<SpeakingClubSendRequest, SpeakingClubSendResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'speakingClubSend',
    );
    const res = await fn(req);
    return res.data;
  })().finally(() => {
    clubSendInFlight.delete(key);
  });

  clubSendInFlight.set(key, request);
  return request;
}

function clubReviewRequestKey(req: SpeakingClubReviewRequest): string {
  return JSON.stringify({
    history: req.history,
    missionId: req.missionId,
    interfaceLang: req.interfaceLang,
    studyTarget: req.studyTarget ?? 'en',
  });
}

export async function callSpeakingClubReview(req: SpeakingClubReviewRequest): Promise<SpeakingClubReviewResponse> {
  // Глобальный рубильник ИИ: не бьём сеть, сразу бросаем — вызывающий UI
  // покажет забавную заглушку (ручной вызов) или тихо скроет (авто-вызов).
  if (aiOffline()) throw new AiOfflineError();
  const key = clubReviewRequestKey(req);
  const existing = clubReviewInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<SpeakingClubReviewRequest, SpeakingClubReviewResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'speakingClubReview',
    );
    const res = await fn(req);
    return res.data;
  })().finally(() => {
    clubReviewInFlight.delete(key);
  });

  clubReviewInFlight.set(key, request);
  return request;
}

// ── Локальное состояние миссий (звёзды + «миссия дня») ──────────────────────

function missionStarsKey(missionId: string, studyTarget?: RuntimeStudyTarget): string {
  return `club_mission_stars_${storageStudyTarget(studyTarget)}_${missionId}`;
}

function missionDayKey(studyTarget?: RuntimeStudyTarget): string {
  return `club_mission_day_${storageStudyTarget(studyTarget)}`;
}

function utcDayStamp(nowMs: number): string {
  const d = new Date(nowMs);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

export interface ClubMissionsLocalState {
  /** Лучшие звёзды по missionId (0–3). */
  starsByMission: Record<string, number>;
  /** Сколько миссий НАЧАТО сегодня (зеркало серверного счётчика для UX-замка). */
  missionsStartedToday: number;
}

export async function loadClubMissionsLocalState(
  missionIds: string[],
  studyTarget?: RuntimeStudyTarget,
): Promise<ClubMissionsLocalState> {
  const keys = [missionDayKey(studyTarget), ...missionIds.map((id) => missionStarsKey(id, studyTarget))];
  const entries = await AsyncStorage.multiGet(keys);
  const map: Record<string, string | null> = Object.fromEntries(entries);

  const starsByMission: Record<string, number> = {};
  for (const id of missionIds) {
    const raw = parseInt(map[missionStarsKey(id, studyTarget)] || '0', 10) || 0;
    starsByMission[id] = Math.max(0, Math.min(3, raw));
  }

  let missionsStartedToday = 0;
  const dayRaw = map[missionDayKey(studyTarget)];
  if (dayRaw) {
    try {
      const parsed = JSON.parse(dayRaw) as { day?: string; count?: number };
      if (parsed.day === utcDayStamp(Date.now())) {
        missionsStartedToday = Math.max(0, Math.floor(Number(parsed.count) || 0));
      }
    } catch {
      missionsStartedToday = 0;
    }
  }
  return { starsByMission, missionsStartedToday };
}

/** Отметить старт миссии сегодня (сброс по UTC-дню — как серверный resetAtMs). */
export async function markClubMissionStartedToday(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const key = missionDayKey(studyTarget);
  const day = utcDayStamp(Date.now());
  let count = 0;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as { day?: string; count?: number };
      if (parsed.day === day) count = Math.max(0, Math.floor(Number(parsed.count) || 0));
    }
  } catch {
    count = 0;
  }
  await AsyncStorage.setItem(key, JSON.stringify({ day, count: count + 1 }));
}

/** Сохранить звёзды миссии (только если новый результат лучше прежнего). */
export async function saveClubMissionStars(
  missionId: string,
  stars: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const key = missionStarsKey(missionId, studyTarget);
  const prev = parseInt((await AsyncStorage.getItem(key)) || '0', 10) || 0;
  const next = Math.max(0, Math.min(3, Math.floor(stars)));
  if (next > prev) await AsyncStorage.setItem(key, String(next));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
