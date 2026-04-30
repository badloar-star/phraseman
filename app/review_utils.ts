import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import type { Lang } from '../constants/i18n';

const KEY_LAST_PROMPTED = 'review_prompted_at';
const KEY_SESSIONS      = 'app_session_count';
const KEY_SHOW_COUNT    = 'review_show_count';
const KEY_RATED         = 'review_user_rated';
const COOLDOWN_DAYS     = 30;
const MIN_SESSIONS      = 5;
const MAX_SHOWS         = 3;

export type ReviewContext = 'general' | 'perfect_lesson' | 'arena_win';

export interface ReviewVariant {
  emoji: string;
  title: string;
  subtitle: string;
  btnYes: string;
  btnNo: string;
}

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

type Loc3 = { ru: string; uk: string; es: string };

function pickLoc<T extends Loc3>(row: T, lang: Lang): string {
  if (lang === 'uk') return row.uk;
  if (lang === 'es') return row.es;
  return row.ru;
}

function localizeVariant(v: {
  emoji: string;
  title: Loc3;
  subtitle: Loc3;
  btnYes: Loc3;
  btnNo: Loc3;
}, lang: Lang): ReviewVariant {
  return {
    emoji: v.emoji,
    title: pickLoc(v.title, lang),
    subtitle: pickLoc(v.subtitle, lang),
    btnYes: pickLoc(v.btnYes, lang),
    btnNo: pickLoc(v.btnNo, lang),
  };
}

/** Контекстные варианты — ru / uk / es */
const CONTEXTUAL: Record<'perfect_lesson' | 'arena_win', {
  emoji: string;
  title: Loc3;
  subtitle: Loc3;
  btnYes: Loc3;
  btnNo: Loc3;
}> = {
  perfect_lesson: {
    emoji: '🎯',
    title: {
      ru: 'Ноль ошибок. Серьёзно?',
      uk: 'Нуль помилок. Серйозно?',
      es: '¿Cero errores? ¿En serio?',
    },
    subtitle: {
      ru: 'Ты только что прошёл урок идеально. Такие люди обычно и пишут лучшие отзывы. Совпадение?',
      uk: 'Ти щойно пройшов урок ідеально. Такі люди зазвичай пишуть найкращі відгуки. Випадковість?',
      es: 'Acabas de terminar la lección sin fallos: quienes logran eso suelen dejar las mejores reseñas. ¿Casualidad?',
    },
    btnYes: {
      ru: 'Написать отзыв',
      uk: 'Написати відгук',
      es: 'Escribir reseña',
    },
    btnNo: {
      ru: 'Случайно получилось',
      uk: 'Випадково вийшло',
      es: 'Fue sin querer',
    },
  },
  arena_win: {
    emoji: '⚔️',
    title: {
      ru: 'Победитель! Теперь финальный босс',
      uk: 'Переможець! Тепер фінальний бос',
      es: '¡Victoria! El último desafío',
    },
    subtitle: {
      ru: `Ты только что разгромил соперника. Осталось победить ${STORE_NAME} — поставь нам 5 звёзд.`,
      uk: `Ти щойно здолав суперника. Залишилося перемогти ${STORE_NAME} — постав 5 зірок.`,
      es: `Acabas de ganarle a tu rival. Solo queda un último paso en ${STORE_NAME}: déjanos 5 estrellas.`,
    },
    btnYes: {
      ru: 'Победить!',
      uk: 'Перемогти!',
      es: '¡A por ello!',
    },
    btnNo: {
      ru: 'Мне хватит одной победы',
      uk: 'Мені вистачить однієї перемоги',
      es: 'Con una victoria me basta',
    },
  },
};

const GENERAL_VARIANTS: Array<{
  emoji: string;
  title: Loc3;
  subtitle: Loc3;
  btnYes: Loc3;
  btnNo: Loc3;
}> = [
  {
    emoji: '🗝️',
    title: {
      ru: 'Секретный уровень: Признание',
      uk: 'Секретний рівень: Визнання',
      es: 'Nivel secreto: reconocimiento',
    },
    subtitle: {
      ru: 'Мы тут поспорили, нравится тебе Phraseman или ты просто зашёл посмотреть на шрифты. Рассудишь нас?',
      uk: 'Ми сперечаємось: тобі подобається Phraseman чи ти просто зайшов подивитися на шрифти. Ти вирішиш?',
      es: 'Discutimos si de verdad te gusta Phraseman o si solo entraste a mirar la interfaz. ¿Nos das tu veredicto?',
    },
    btnYes: {
      ru: 'Обожаю!',
      uk: 'Обожнюю!',
      es: '¡Me encanta!',
    },
    btnNo: {
      ru: 'Я просто смотрю',
      uk: 'Я просто дивлюся',
      es: 'Solo estoy mirando',
    },
  },
  {
    emoji: '👋',
    title: {
      ru: 'Дай пять?',
      uk: 'Дай п’ять?',
      es: '¿Chocamos?',
    },
    subtitle: {
      ru: 'Пять звёзд, конечно. Нам будет дико приятно, а тебе — плюс к удаче в следующем уроке.',
      uk: 'П’ять зірок, звісно. Нам буде дуже приємно, а тобі — плюс до удачі в наступному уроці.',
      es: 'Cinco estrellas, claro. Nos haría muchísima ilusión… y puede que te den suerte en la próxima lección.',
    },
    btnYes: {
      ru: 'Даю пять!',
      uk: 'Даю п’ять!',
      es: '¡Ahí va!',
    },
    btnNo: {
      ru: 'Пока не готов(а)',
      uk: 'Поки не готов(а)',
      es: 'Aún no estoy listo/a',
    },
  },
  {
    emoji: '🚫',
    title: {
      ru: 'Не нажимай на эту кнопку!',
      uk: 'Не тисни на цю кнопку!',
      es: '¡No pulses este botón!',
    },
    subtitle: {
      ru: 'Ладно, шучу. Нажимай. Там можно поставить 5 звёзд и сделать одного разработчика абсолютно счастливым человеком.',
      uk: 'Гаразд, жартую. Тисни. Там можна поставити 5 зірок і зробити одного розробника щасливою людиною.',
      es: 'Broma: adelante. Ahí puedes darnos 5 estrellas y alegrarle el día a un desarrollador.',
    },
    btnYes: {
      ru: 'Сделать счастливым',
      uk: 'Зробити щасливим',
      es: 'Hacer feliz a alguien',
    },
      btnNo: {
      ru: 'Я люблю ломать правила',
      uk: 'Я люблю ламати правила',
      es: 'Me gusta romper las reglas',
    },
  },
];

/** lang — язык интерфейса для всех текстов модалки. */
export const getReviewVariant = async (
  context: ReviewContext,
  lang: Lang = 'ru'
): Promise<ReviewVariant> => {
  if (context === 'perfect_lesson') return localizeVariant(CONTEXTUAL.perfect_lesson, lang);
  if (context === 'arena_win') return localizeVariant(CONTEXTUAL.arena_win, lang);
  const raw = await AsyncStorage.getItem(KEY_SHOW_COUNT).catch(() => null);
  const idx = (parseInt(raw || '0')) % GENERAL_VARIANTS.length;
  return localizeVariant(GENERAL_VARIANTS[idx], lang);
};

export const incrementSessionCount = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSIONS);
    const n = parseInt(raw || '0') + 1;
    await AsyncStorage.setItem(KEY_SESSIONS, String(n));
  } catch {}
};

export const canShowReview = async (): Promise<boolean> => {
  try {
    const [sessRaw, lastRaw, ratedRaw, showCountRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_SESSIONS),
      AsyncStorage.getItem(KEY_LAST_PROMPTED),
      AsyncStorage.getItem(KEY_RATED),
      AsyncStorage.getItem(KEY_SHOW_COUNT),
    ]);
    if (ratedRaw === '1') return false;
    const sessions = parseInt(sessRaw || '0');
    if (sessions < MIN_SESSIONS) return false;
    const showCount = parseInt(showCountRaw || '0');
    if (showCount >= MAX_SHOWS) return false;
    if (lastRaw) {
      const daysSince = (Date.now() - parseInt(lastRaw)) / (1000 * 60 * 60 * 24);
      if (daysSince < COOLDOWN_DAYS) return false;
    }
    return true;
  } catch { return false; }
};

/** Вызывать когда пользователь нажал "Да" — помечает как оценившего навсегда. */
export const markReviewRated = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.setItem(KEY_RATED, '1'),
      AsyncStorage.setItem(KEY_LAST_PROMPTED, String(Date.now())),
    ]);
  } catch {}
};

/** Вызывать когда показали диалог (независимо от ответа) — увеличивает счётчик показов. */
export const markReviewPrompted = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(KEY_SHOW_COUNT);
    const n = parseInt(raw || '0') + 1;
    await Promise.all([
      AsyncStorage.setItem(KEY_SHOW_COUNT, String(n)),
      AsyncStorage.setItem(KEY_LAST_PROMPTED, String(Date.now())),
    ]);
  } catch {}
};

export const requestNativeReview = async (): Promise<void> => {
  try {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
    }
  } catch {}
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
