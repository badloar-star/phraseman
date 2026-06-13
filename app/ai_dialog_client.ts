/**
 * Клиент для премиум-функции ИИ-диалогов (premiumDialogSend).
 * Паттерн скопирован с community_packs/functionsClient.ts.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { triLang, type Lang } from '../constants/i18n';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

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
  scenarioId?: string;
  /** companion-режим */
  memory?: DialogMemory;
  isPremium?: boolean;
}

export interface PremiumDialogResponse {
  ok: boolean;
  assistantMessage: string;
  remainingQuota: number;
  model: string;
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
          ru: 'Premium активен в приложении, но сервер ещё не видит его для ИИ-диалога. Обнови статус подписки и попробуй ещё раз.',
          uk: 'Premium активний у застосунку, але сервер ще не бачить його для AI-діалогу. Онови статус підписки і спробуй ще раз.',
          es: 'Premium está activo en la app, pero el servidor aún no lo ve para el diálogo con IA. Actualiza la suscripción e inténtalo otra vez.',
        });
      }
      return triLang(lang, {
        ru: 'Бесплатный диалог на сегодня уже использован. Завтра снова будет доступен.',
        uk: 'Безкоштовний діалог на сьогодні вже використано. Завтра він знову буде доступний.',
        es: 'Ya usaste el diálogo gratis de hoy. Mañana estará disponible de nuevo.',
      });
    case 'premium_limit':
      return triLang(lang, {
        ru: 'Лимит диалогов на сегодня исчерпан. Попробуй завтра.',
        uk: 'Ліміт діалогів на сьогодні вичерпано. Спробуй завтра.',
        es: 'Se agotó el límite de diálogos de hoy. Inténtalo mañana.',
      });
    case 'rate_limited':
      return triLang(lang, {
        ru: 'Слишком много сообщений подряд. Подожди немного и попробуй ещё раз.',
        uk: 'Забагато повідомлень поспіль. Почекай трохи і спробуй ще раз.',
        es: 'Demasiados mensajes seguidos. Espera un poco e inténtalo otra vez.',
      });
    case 'auth_required':
      return triLang(lang, {
        ru: 'Нужно войти в аккаунт, чтобы продолжить диалог.',
        uk: 'Потрібно увійти в акаунт, щоб продовжити діалог.',
        es: 'Necesitas iniciar sesión para continuar el diálogo.',
      });
    case 'provider_unavailable':
      return triLang(lang, {
        ru: 'ИИ-сервис сейчас не отвечает. Попробуй ещё раз чуть позже.',
        uk: 'AI-сервіс зараз не відповідає. Спробуй ще раз трохи пізніше.',
        es: 'El servicio de IA no responde ahora. Inténtalo un poco más tarde.',
      });
    case 'network':
      return triLang(lang, {
        ru: 'Связь прервалась. Проверь интернет и попробуй ещё раз.',
        uk: 'Зв’язок перервався. Перевір інтернет і спробуй ще раз.',
        es: 'Se cortó la conexión. Revisa internet e inténtalo otra vez.',
      });
    case 'unknown':
    default:
      return triLang(lang, {
        ru: 'Не получилось получить ответ. Попробуй ещё раз.',
        uk: 'Не вдалося отримати відповідь. Спробуй ще раз.',
        es: 'No se pudo obtener la respuesta. Inténtalo otra vez.',
      });
  }
}

export async function callPremiumDialogSend(req: PremiumDialogRequest): Promise<PremiumDialogResponse> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<PremiumDialogRequest, PremiumDialogResponse>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'premiumDialogSend',
  );
  const res = await fn(req);
  return res.data;
}
