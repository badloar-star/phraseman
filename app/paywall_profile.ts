/**
 * paywall_profile.ts — персональные данные пользователя для пейвола.
 *
 * Чинит «протечку персонализации»: онбординг-пейвол знает имя/цель/уровень, а
 * переиспользуемые A/B/C-пейволы (показываются ВЕЗДЕ — нет энергии, лимиты,
 * стрик…) раньше были обезличены. Этот модуль читает уже сохранённый профиль
 * из AsyncStorage и отдаёт его пейволу, чтобы тот обращался по имени и упоминал
 * цель/срок — «приложение тебя понимает».
 *
 * Источники (только чтение, без сети, ошибки проглатываются):
 *   - имя: AsyncStorage 'user_name' (его пишут онбординг и настройки);
 *   - профиль: AsyncStorage 'user_profile' (UserProfile: goal/level/targetDate).
 *
 * Локализация целей — собственная компактная карта (RU/UK/ES + 5 planned-языков),
 * чтобы не тащить тяжёлый onboarding-компонент в лёгкий экран пейвола.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LearningGoal, UserProfile } from './types/user_profile';

export type PaywallLang = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl' | 'en';

export interface PaywallProfile {
  /** Имя как подписался пользователь (пусто → не обращаемся по имени). */
  name: string;
  learningGoal: LearningGoal | null;
  /** Короткая мотивирующая формулировка цели на языке интерфейса (или null). */
  goalLabel: string | null;
  /** ISO-дата ориентировочного достижения цели (или null). */
  targetDate: string | null;
}

const EMPTY_PROFILE: PaywallProfile = {
  name: '',
  learningGoal: null,
  goalLabel: null,
  targetDate: null,
};

/**
 * Короткая цель-в-винительном «… к английскому для <цели>» / «… в <цели>».
 * Подаётся как мотив: «Premium доведёт тебя до <goalLabel>».
 */
const GOAL_LABELS: Record<LearningGoal, Partial<Record<PaywallLang, string>>> = {
  tourism: {
    ru: 'свободы в поездках',
    uk: 'свободи в подорожах',
    es: 'libertad al viajar',
    'pt-BR': 'liberdade nas viagens',
    vi: 'tự tin khi đi du lịch',
    id: 'bebas saat bepergian',
    tr: 'seyahatte rahatlık',
    pl: 'swobody w podróżach',
    en: 'confidence when you travel',
  },
  work: {
    ru: 'уверенной речи в работе',
    uk: 'впевненої мови в роботі',
    es: 'seguridad en el trabajo',
    'pt-BR': 'segurança no trabalho',
    vi: 'tự tin trong công việc',
    id: 'percaya diri di tempat kerja',
    tr: 'işte özgüvenli konuşma',
    pl: 'pewności w pracy',
    en: 'confidence at work',
  },
  emigration: {
    ru: 'жизни за границей без барьера',
    uk: 'життя за кордоном без бар’єра',
    es: 'una vida sin barreras en el extranjero',
    'pt-BR': 'uma vida sem barreiras no exterior',
    vi: 'cuộc sống ở nước ngoài không rào cản',
    id: 'hidup di luar negeri tanpa hambatan',
    tr: 'yurt dışında engelsiz bir yaşam',
    pl: 'życia za granicą bez bariery',
    en: 'life abroad without the language barrier',
  },
  hobby: {
    ru: 'английского в удовольствие',
    uk: 'англійської в задоволення',
    es: 'aprender inglés con gusto',
    'pt-BR': 'aprender inglês com prazer',
    vi: 'học tiếng Anh một cách thoải mái',
    id: 'belajar bahasa Inggris dengan santai',
    tr: 'keyifle İngilizce öğrenmek',
    pl: 'angielskiego dla przyjemności',
    en: 'enjoying English at your own pace',
  },
};

function goalLabelFor(goal: LearningGoal | null, lang: PaywallLang): string | null {
  if (!goal) return null;
  const row = GOAL_LABELS[goal];
  return row[lang] ?? row.ru ?? null;
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  // Защита от мусора/слишком длинных имён в hero-строке.
  if (!trimmed || trimmed.length > 24) return '';
  return trimmed;
}

function parseProfile(raw: string | null): Partial<UserProfile> | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== 'object') return null;
    return obj as Partial<UserProfile>;
  } catch {
    return null;
  }
}

const VALID_GOALS: readonly LearningGoal[] = ['tourism', 'work', 'emigration', 'hobby'];

function asGoal(v: unknown): LearningGoal | null {
  return typeof v === 'string' && (VALID_GOALS as readonly string[]).includes(v)
    ? (v as LearningGoal)
    : null;
}

/**
 * Читает персональный профиль для пейвола. Никогда не бросает — при любой ошибке
 * возвращает пустой профиль (пейвол просто остаётся обезличенным, но не падает).
 */
export async function readPaywallProfile(lang: PaywallLang = 'ru'): Promise<PaywallProfile> {
  try {
    const [nameRaw, profileRaw] = await Promise.all([
      AsyncStorage.getItem('user_name'),
      AsyncStorage.getItem('user_profile'),
    ]);
    const profile = parseProfile(profileRaw);
    const name = sanitizeName(nameRaw) || sanitizeName(profile?.name);
    const learningGoal = asGoal(profile?.learningGoal);
    const targetDate =
      typeof profile?.estimatedTargetDate === 'string' && profile.estimatedTargetDate
        ? profile.estimatedTargetDate
        : null;
    return {
      name,
      learningGoal,
      goalLabel: goalLabelFor(learningGoal, lang),
      targetDate,
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route. */
export default function __RouteShim() {
  return null;
}
