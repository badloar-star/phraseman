import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { decideReviewPrompt, type ReviewPromptInput } from './review_prompt_policy';

const KEY_LAST_PROMPTED = 'review_prompted_at';
const KEY_SESSIONS      = 'app_session_count';
const KEY_SHOW_COUNT    = 'review_show_count';
const KEY_RATED         = 'review_user_rated';
export type ReviewContext = 'perfect_lesson' | 'level_exam_pass' | 'streak_milestone';

export interface ReviewVariant {
  emoji: string;
  title: string;
  subtitle: string;
  btnYes: string;
  btnNo: string;
  presentation: 'dialog' | 'bottom_sheet';
}

type LocalizedCopy = Record<Lang, string>;

function pickLoc(row: LocalizedCopy, lang: Lang): string {
  return row[lang];
}

type ReviewVariantDefinition = {
  emoji: string;
  title: LocalizedCopy;
  subtitle: LocalizedCopy;
  btnYes: LocalizedCopy;
  btnNo: LocalizedCopy;
};

function localizeVariant(v: ReviewVariantDefinition, lang: Lang): ReviewVariant {
  return {
    emoji: v.emoji,
    title: pickLoc(v.title, lang),
    subtitle: pickLoc(v.subtitle, lang),
    btnYes: pickLoc(v.btnYes, lang),
    btnNo: pickLoc(v.btnNo, lang),
    presentation: 'dialog',
  };
}

const APPROVED_RU_COPY: Record<ReviewContext, Omit<ReviewVariant, 'presentation'>> = {
  perfect_lesson: {
    emoji: '',
    title: '100%. Ты вообще оставил уроку шанс?',
    subtitle: 'Оставь отзыв о Phraseman в магазине приложений и напиши пару слов. Мы прочитаем всё. Даже если там будет просто «норм».',
    btnYes: 'Открыть магазин и оценить',
    btnNo: 'Не сейчас',
  },
  level_exam_pass: {
    emoji: '',
    title: 'Зачёт сдан. Можно перестать выглядеть скромно.',
    subtitle: 'Оставь отзыв о Phraseman в магазине приложений и напиши пару слов. Пусть другие тоже знают, куда идти за такими зачётами.',
    btnYes: 'Открыть магазин и оценить',
    btnNo: 'Не сейчас',
  },
  streak_milestone: {
    emoji: '',
    title: 'Это уже не серия. Это отношения с календарём.',
    subtitle: 'Оставь отзыв о Phraseman в магазине приложений и напиши пару слов. Мы не будем делать вид, что случайно этого не ждали.',
    btnYes: 'Открыть магазин и оценить',
    btnNo: 'Не сейчас',
  },
};

const REVIEW_ACTIONS = {
  btnYes: {
    ru: 'Оставить отзыв',
    uk: 'Залишити відгук',
    en: 'Leave a review',
    es: 'Escribir reseña',
    'pt-BR': 'Escrever avaliação',
    vi: 'Viết đánh giá',
    id: 'Tulis ulasan',
    tr: 'Yorum yaz',
    pl: 'Napisz recenzję',
  },
  btnNo: {
    ru: 'Не сейчас',
    uk: 'Не зараз',
    en: 'Not now',
    es: 'Ahora no',
    'pt-BR': 'Agora não',
    vi: 'Không phải bây giờ',
    id: 'Nanti saja',
    tr: 'Şimdi değil',
    pl: 'Nie teraz',
  },
} satisfies Record<'btnYes' | 'btnNo', LocalizedCopy>;

/** Контекстные варианты для спокойной просьбы о честном отзыве. */
const CONTEXTUAL: Record<'perfect_lesson', ReviewVariantDefinition> = {
  perfect_lesson: {
    emoji: '🎯',
    title: {
      ru: 'Ноль ошибок. Отличная работа!',
      uk: 'Жодної помилки. Чудова робота!',
      en: 'Zero mistakes. Great work!',
      es: 'Cero errores. ¡Muy bien!',
      'pt-BR': 'Zero erros. Ótimo trabalho!',
      vi: 'Không có lỗi nào. Làm tốt lắm!',
      id: 'Tidak ada kesalahan. Kerja bagus!',
      tr: 'Sıfır hata. Harika iş!',
      pl: 'Zero błędów. Świetna robota!',
    },
    subtitle: {
      ru: 'Отличный результат. Если Phraseman помогает тебе учиться, поделись, пожалуйста, честным отзывом.',
      uk: 'Чудовий результат. Якщо Phraseman допомагає тобі навчатися, поділися, будь ласка, чесним відгуком.',
      en: 'A great result. If Phraseman is helping you learn, please share an honest review.',
      es: '¡Un resultado excelente! Si Phraseman te ayuda a aprender, comparte por favor una reseña sincera.',
      'pt-BR': 'Ótimo resultado! Se o Phraseman ajuda você a aprender, compartilhe, por favor, uma avaliação honesta.',
      vi: 'Kết quả tuyệt vời! Nếu Phraseman giúp bạn học tốt hơn, hãy chia sẻ một đánh giá chân thật nhé.',
      id: 'Hasil yang luar biasa! Jika Phraseman membantumu belajar, bagikan ulasan jujurmu, ya.',
      tr: 'Harika bir sonuç! Phraseman öğrenmene yardımcı oluyorsa lütfen dürüst bir yorum paylaş.',
      pl: 'Świetny wynik! Jeśli Phraseman pomaga Ci w nauce, podziel się proszę szczerą recenzją.',
    },
    btnYes: REVIEW_ACTIONS.btnYes,
    btnNo: REVIEW_ACTIONS.btnNo,
  },
};

const GENERAL_VARIANTS: ReviewVariantDefinition[] = [
  {
    emoji: '🗝️',
    title: {
      ru: 'Как тебе Phraseman?',
      uk: 'Як тобі Phraseman?',
      en: 'How do you like Phraseman?',
      es: '¿Qué te parece Phraseman?',
      'pt-BR': 'O que você acha do Phraseman?',
      vi: 'Bạn thấy Phraseman thế nào?',
      id: 'Bagaimana menurutmu tentang Phraseman?',
      tr: 'Phraseman hakkında ne düşünüyorsun?',
      pl: 'Co sądzisz o Phraseman?',
    },
    subtitle: {
      ru: 'Твоё честное мнение помогает нам улучшать приложение и помогает другим сделать выбор.',
      uk: 'Твоя чесна думка допомагає нам покращувати застосунок і допомагає іншим зробити вибір.',
      en: 'Your honest opinion helps us improve the app and helps others decide.',
      es: 'Tu opinión sincera nos ayuda a mejorar la app y ayuda a otras personas a decidirse.',
      'pt-BR': 'Sua opinião sincera nos ajuda a melhorar o app e ajuda outras pessoas a decidir.',
      vi: 'Ý kiến chân thật của bạn giúp chúng mình cải thiện ứng dụng và giúp người khác lựa chọn.',
      id: 'Pendapat jujurmu membantu kami meningkatkan aplikasi dan membantu orang lain memilih.',
      tr: 'Dürüst fikrin uygulamayı geliştirmemize ve başkalarının seçim yapmasına yardımcı olur.',
      pl: 'Twoja szczera opinia pomaga nam ulepszać aplikację i pomaga innym w wyborze.',
    },
    btnYes: REVIEW_ACTIONS.btnYes,
    btnNo: REVIEW_ACTIONS.btnNo,
  },
  {
    emoji: '👋',
    title: {
      ru: 'Спасибо, что учишься с нами',
      uk: 'Дякуємо, що навчаєшся з нами',
      en: 'Thanks for learning with us',
      es: 'Gracias por aprender con nosotros',
      'pt-BR': 'Obrigado por aprender com a gente',
      vi: 'Cảm ơn bạn đã học cùng chúng mình',
      id: 'Terima kasih sudah belajar bersama kami',
      tr: 'Bizimle öğrendiğin için teşekkürler',
      pl: 'Dziękujemy, że uczysz się z nami',
    },
    subtitle: {
      ru: 'Если есть минутка, поделись, пожалуйста, честным отзывом о Phraseman.',
      uk: 'Якщо маєш хвилинку, поділися, будь ласка, чесним відгуком про Phraseman.',
      en: 'If you have a minute, please share an honest review of Phraseman.',
      es: 'Si tienes un minuto, comparte por favor una reseña sincera sobre Phraseman.',
      'pt-BR': 'Se tiver um minuto, compartilhe por favor uma avaliação honesta sobre o Phraseman.',
      vi: 'Nếu bạn có một phút, hãy chia sẻ đánh giá chân thật về Phraseman nhé.',
      id: 'Jika punya waktu sebentar, bagikan ulasan jujur tentang Phraseman, ya.',
      tr: 'Bir dakikan varsa Phraseman hakkında dürüst bir yorum paylaşır mısın?',
      pl: 'Jeśli masz chwilę, podziel się proszę szczerą recenzją Phraseman.',
    },
    btnYes: REVIEW_ACTIONS.btnYes,
    btnNo: REVIEW_ACTIONS.btnNo,
  },
  {
    emoji: '🚫',
    title: {
      ru: 'Твоё мнение важно',
      uk: 'Твоя думка важлива',
      en: 'Your opinion matters',
      es: 'Tu opinión es importante',
      'pt-BR': 'Sua opinião é importante',
      vi: 'Ý kiến của bạn rất quan trọng',
      id: 'Pendapatmu penting',
      tr: 'Fikrin önemli',
      pl: 'Twoja opinia jest ważna',
    },
    subtitle: {
      ru: 'Расскажи, что тебе нравится в приложении и что можно улучшить.',
      uk: 'Розкажи, що тобі подобається в застосунку і що можна покращити.',
      en: 'Tell us what you like about the app and what could be better.',
      es: 'Cuéntanos qué te gusta de la app y qué podríamos mejorar.',
      'pt-BR': 'Conte o que você gosta no app e o que podemos melhorar.',
      vi: 'Hãy cho chúng mình biết bạn thích điều gì ở ứng dụng và điều gì có thể cải thiện.',
      id: 'Ceritakan apa yang kamu sukai dari aplikasi ini dan apa yang bisa kami tingkatkan.',
      tr: 'Uygulamada neleri sevdiğini ve neleri geliştirebileceğimizi anlat.',
      pl: 'Powiedz, co podoba Ci się w aplikacji i co możemy ulepszyć.',
    },
    btnYes: REVIEW_ACTIONS.btnYes,
    btnNo: REVIEW_ACTIONS.btnNo,
  },
];

/** lang — язык интерфейса для всех текстов модалки. */
export const getReviewVariant = async (
  context: ReviewContext,
  lang: Lang = 'ru'
): Promise<ReviewVariant> => {
  if (lang === 'ru') {
    return {
      ...APPROVED_RU_COPY[context],
      presentation: 'dialog',
    };
  }
  const base = context === 'perfect_lesson' ? CONTEXTUAL.perfect_lesson : GENERAL_VARIANTS[0];
  return {
    ...localizeVariant(base, lang),
    presentation: 'dialog',
  };
};

export const incrementSessionCount = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSIONS);
    const n = parseInt(raw || '0') + 1;
    await AsyncStorage.setItem(KEY_SESSIONS, String(n));
  } catch {}
};

export const canShowReview = async (input: Omit<ReviewPromptInput, 'nowMs' | 'priorPromptCount' | 'lastPromptedAtMs' | 'hasRated'>): Promise<boolean> => {
  try {
    const [[, lastRaw], [, ratedRaw], [, showCountRaw]] = await AsyncStorage.multiGet([
      KEY_LAST_PROMPTED,
      KEY_RATED,
      KEY_SHOW_COUNT,
    ]);
    return decideReviewPrompt({
      ...input,
      nowMs: Date.now(),
      priorPromptCount: parseInt(showCountRaw || '0', 10) || 0,
      lastPromptedAtMs: lastRaw ? parseInt(lastRaw, 10) : null,
      hasRated: ratedRaw === '1',
    }).eligible;
  } catch { return false; }
};

export const getReviewActiveDays = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem('daily_stats');
    const stats = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    return Object.values(stats).filter((entry) => {
      if (typeof entry === 'number') return entry > 0;
      return typeof entry === 'object' && entry !== null && Number((entry as { points?: unknown }).points) > 0;
    }).length;
  } catch {
    return 0;
  }
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

/**
 * Уже оценил ли пользователь приложение (нажимал "Да" в любой из rate-модалок).
 * Используется потоками, которые показывают предложение оценить В ОБХОД canShowReview
 * (например VIP-окно), чтобы не докучать тем, кто уже поставил оценку.
 */
export const hasUserRated = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(KEY_RATED)) === '1';
  } catch {
    return false;
  }
};

/**
 * Вызывать в момент ПОКАЗА диалога (а не в обработчике кнопки) — увеличивает счётчик
 * показов и ставит метку времени для 30-дневного кулдауна. Так любой способ закрытия
 * (кнопка "нет", тап по фону, системное закрытие) уже учтён в лимитах.
 */
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
    const StoreReview = require('expo-store-review') as {
      hasAction: () => Promise<boolean>;
      requestReview: () => Promise<void>;
    };
    if (await StoreReview.hasAction()) {
      await markReviewPrompted();
      await StoreReview.requestReview();
    }
  } catch {}
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
