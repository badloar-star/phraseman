/**
 * Подписи под скелетоном на время ожидания ИИ-ответа.
 *
 * зачем (инцидент 2026-08-04): платные ИИ-функции держат minInstances: 0 —
 * владелец не платит за постоянно тёплый инстанс. Обычно прогрев по намерению
 * (app/ai_callable_resilience.ts) прячет холодный старт целиком, но если
 * прогреться не успели И понадобился тихий повтор, ожидание доходит до ~8 сек.
 * Неподвижный скелетон столько времени читается как зависание.
 *
 * Лечение — не спиннер и не проценты (обещать прогресс, которого мы не знаем,
 * нечестно), а смена ОДНОЙ строки по мере ожидания: интерфейс показывает, что
 * он жив и занят делом.
 *
 * Порог второй фразы намеренно поздний (5 сек): при удачном прогреве ответ
 * приходит за 1–2 сек, и пользователь ВООБЩЕ не увидит смены подписи — она
 * появится только там, где ожидание реально затянулось.
 */
import { triLang, type Lang } from '../constants/i18n';

/** Через сколько ждущая подпись сменится на следующую (мс от начала ожидания). */
export const AI_WAIT_SECOND_STAGE_MS = 5000;
export const AI_WAIT_THIRD_STAGE_MS = 11000;

export type AiWaitStage = 'start' | 'working' | 'long';

/**
 * Стадия ожидания по прошедшему времени. Чистая функция — тестируется без таймеров.
 * Повтор после сбоя сразу перескакивает на 'working': ждать ещё 5 секунд, чтобы
 * признать ожидание долгим, там уже незачем — оно долгое по факту.
 */
export function resolveAiWaitStage(elapsedMs: number, retried = false): AiWaitStage {
  if (elapsedMs >= AI_WAIT_THIRD_STAGE_MS) return 'long';
  if (retried || elapsedMs >= AI_WAIT_SECOND_STAGE_MS) return 'working';
  return 'start';
}

/**
 * Текст ожидания для разбора ошибки.
 *
 * Тон: спокойный, от первого лица, без техники. Пользователю нет дела до
 * холодного старта Cloud Run — ему важно, что его ответ разбирают. Про сбой и
 * повтор НЕ говорим: повтор тихий, а признание «первая попытка не удалась»
 * только тревожит там, где через секунду всё получится.
 */
export function aiMistakeWaitLine(lang: Lang, stage: AiWaitStage): string {
  if (stage === 'long') {
    return triLang(lang, {
      ru: 'ещё немного…',
      uk: 'ще трохи…',
      en: 'just a bit more…',
      es: 'un momento más…',
      'pt-BR': 'mais um instante…',
      vi: 'thêm một chút…',
      id: 'sebentar lagi…',
      tr: 'birazcık daha…',
      pl: 'jeszcze chwilka…',
    });
  }
  if (stage === 'working') {
    return triLang(lang, {
      ru: 'смотрю, где сбилось…',
      uk: 'дивлюся, де збилося…',
      en: 'checking where it went wrong…',
      es: 'viendo dónde falló…',
      'pt-BR': 'vendo onde errou…',
      vi: 'đang xem sai ở đâu…',
      id: 'melihat bagian yang salah…',
      tr: 'nerede hata var, bakıyorum…',
      pl: 'sprawdzam, co poszło źle…',
    });
  }
  return triLang(lang, {
    ru: 'разбираю твой ответ…',
    uk: 'розбираю твою відповідь…',
    en: 'looking over your answer…',
    es: 'analizando tu respuesta…',
    'pt-BR': 'analisando sua resposta…',
    vi: 'đang phân tích câu trả lời…',
    id: 'menganalisis jawabanmu…',
    tr: 'cevabını inceliyorum…',
    pl: 'analizuję Twoją odpowiedź…',
  });
}

/**
 * Текст ожидания для объяснения фразы. Первая строка совпадает с существующей
 * loadingLineForLang() из explain_phrase_request.ts — она уже прижилась,
 * менять её ради единообразия было бы регрессией знакомого интерфейса.
 */
export function aiExplainWaitLine(lang: Lang, stage: AiWaitStage): string {
  if (stage === 'long') {
    return triLang(lang, {
      ru: 'ещё немного…',
      uk: 'ще трохи…',
      en: 'just a bit more…',
      es: 'un momento más…',
      'pt-BR': 'mais um instante…',
      vi: 'thêm một chút…',
      id: 'sebentar lagi…',
      tr: 'birazcık daha…',
      pl: 'jeszcze chwilka…',
    });
  }
  if (stage === 'working') {
    return triLang(lang, {
      ru: 'подбираю слова попроще…',
      uk: 'добираю простіші слова…',
      en: 'finding simpler words…',
      es: 'buscando palabras más simples…',
      'pt-BR': 'buscando palavras mais simples…',
      vi: 'đang tìm cách nói đơn giản hơn…',
      id: 'mencari kata yang lebih sederhana…',
      tr: 'daha basit kelimeler seçiyorum…',
      pl: 'dobieram prostsze słowa…',
    });
  }
  return triLang(lang, {
    ru: 'готовлю объяснение…',
    uk: 'готую пояснення…',
    en: 'preparing the explanation…',
    es: 'preparando la explicación…',
    'pt-BR': 'preparando a explicação…',
    vi: 'đang chuẩn bị lời giải thích…',
    id: 'menyiapkan penjelasan…',
    tr: 'açıklama hazırlanıyor…',
    pl: 'przygotowuję wyjaśnienie…',
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
