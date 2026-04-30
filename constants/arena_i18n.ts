/**
 * Тексты экранов арены / матчмейкинга (RU / UK / ES).
 */
import type { Lang } from './i18n';

type ArenaLang = 'ru' | 'uk' | 'es';

export function arenaUiLang(lang: Lang): ArenaLang {
  if (lang === 'uk') return 'uk';
  if (lang === 'es') return 'es';
  return 'ru';
}

/**
 * Выбор языкового сегмента в строках контента арены.
 * Разделители: « · » (RU · UK · ES) или « / » (как в старых данных).
 * Для ES: третий сегмент при наличии, иначе первый (обычно RU/EN до доп. локалей).
 */
export function arenaBilingualFirst(text: string, lang: Lang): string {
  if (!text) return text;
  const dotSep = ' · ';
  const slashSep = ' / ';
  let parts: string[];
  if (text.includes(dotSep)) {
    parts = text.split(dotSep).map((p) => p.trim());
  } else if (text.includes(slashSep)) {
    parts = text.split(slashSep).map((p) => p.trim());
  } else {
    return text;
  }
  if (lang === 'uk') return parts[1] ?? parts[0] ?? text;
  if (lang === 'es') return parts[2] ?? parts[0] ?? text;
  return parts[0] ?? text;
}

const GAME = {
  loadingQuestions: { ru: 'Загружаем вопросы…', uk: 'Завантаження…', es: 'Cargando preguntas…' },
  abortedUi: { ru: 'Отмена…', uk: 'Скасовано…', es: 'Cancelado…' },
  waitOpponent: { ru: 'Ждём соперника…', uk: 'Очікуємо суперника…', es: 'Esperando al rival…' },
  timeLeft: { ru: 'Осталось', uk: 'Залишилось', es: 'Te quedan' },
  connecting: {
    ru: 'Подключение к матчу…',
    uk: 'Підключення до матчу…',
    es: 'Uniéndote al duelo…',
  },
  gameFound: { ru: 'ИГРА НАЙДЕНА', uk: 'ГРУ ЗНАЙДЕНО', es: '¡DUELO ENCONTRADO!' },
  decline: { ru: 'Отклонить', uk: 'Відмовити', es: 'Rechazar' },
  accept: { ru: 'ПРИНЯТЬ', uk: 'ПРИЙНЯТИ', es: 'ACEPTAR' },
  premeet: { ru: 'ПРИГОТОВЬСЯ', uk: 'ПРИГОТУЙСЯ', es: '¡PREPÁRATE!' },
  letsGo: { ru: 'Поехали!', uk: 'Поїхали!', es: '¡Vamos!' },
  xpCorrect: { ru: '✓ правильно', uk: '✓ вірно', es: '✓ correcto' },
  forfeitTitle: { ru: '🏳️ Сдаться?', uk: '🏳️ Здатися?', es: '🏳️ ¿Te rindes?' },
  forfeitSub: {
    ru: 'Засчитается поражение и потеряешь звезду',
    uk: 'Зарахується поразка й ти втратиш зірку',
    es: 'Se contará como derrota y perderás una estrella.',
  },
  forfeitConfirm: { ru: 'Сдаться', uk: 'Здатися', es: 'Rendirse' },
  forfeitContinue: { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar' },
} as const;

export type ArenaGameStrKey = keyof typeof GAME;

export function arenaGameStr(lang: Lang, key: ArenaGameStrKey): string {
  const L = arenaUiLang(lang);
  const entry = GAME[key];
  return (entry as Record<ArenaLang, string>)[L];
}

/** Суффикс секунд у таймера (RU/UK — «30с», ES — «30 s»). */
export function arenaSecondsSuffix(lang: Lang): string {
  return arenaUiLang(lang) === 'es' ? ' s' : 'с';
}

export function arenaXpSpeed(lang: Lang, elapsedSec: number): string {
  const L = arenaUiLang(lang);
  if (L === 'uk') return `відповів за ${elapsedSec} с`;
  if (L === 'es') return `respondiste en ${elapsedSec} s`;
  return `ответил за ${elapsedSec} сек`;
}

export function arenaXpFirst(lang: Lang): string {
  const L = arenaUiLang(lang);
  if (L === 'uk') return 'перша вірна відповідь!';
  if (L === 'es') return '¡Primera respuesta correcta!';
  return 'первый правильный!';
}

export function arenaXpStreak(lang: Lang): string {
  const L = arenaUiLang(lang);
  if (L === 'uk') return '3 поспіль!';
  if (L === 'es') return '¡Tres aciertos seguidos!';
  return '3 подряд!';
}

export function arenaXpOutspeed(lang: Lang): string {
  const L = arenaUiLang(lang);
  if (L === 'uk') return 'швидше за суперника!';
  if (L === 'es') return '¡Más rápido que tu rival!';
  return 'быстрее соперника!';
}

/** Подпись «ты» на табло очков. */
export function arenaScoreboardYou(lang: Lang): string {
  if (lang === 'uk') return 'Ти';
  if (lang === 'es') return 'Tú';
  return 'Ты';
}

/** Тосты: общие фразы арены / лобби / join. */
export const arenaToasts = {
  matchAbortedDecline: {
    messageRu: 'Матч отменён: один из игроков отказался.',
    messageUk: 'Матч скасовано: одна з гравців відмовилася.',
    messageEs: 'Partida cancelada: un jugador rechazó la partida.',
  },
  matchAbortedTimeout: {
    messageRu: 'Время на принятие вышло — поиск снова в лобби.',
    messageUk: 'Час на прийняття вичерпано — знову лобі.',
    messageEs:
      'Se ha agotado el tiempo para aceptar el duelo. Vuelve a la Arena y busca otro rival.',
  },
  answerNotSent: {
    messageRu: 'Ответ не отправлен. Проверь соединение и попробуй снова.',
    messageUk: 'Відповідь не надіслано. Перевір зʼєднання і спробуй ще раз.',
    messageEs: 'La respuesta no se ha enviado. Revisa la conexión e inténtalo de nuevo.',
  },
  matchFinishFail: {
    messageRu: 'Не удалось корректно завершить матч.',
    messageUk: 'Не вдалося коректно завершити матч.',
    messageEs: 'No se ha podido finalizar el duelo correctamente.',
  },
  lobbyChoiceSendFail: {
    messageRu: 'Не получилось отправить. Повтори.',
    messageUk: 'Не вдалося надіслати. Ще раз.',
    messageEs: 'No se ha podido enviar. Inténtalo de nuevo.',
  },
  queueJoinFailAuth: {
    messageRu: 'Не удалось войти в очередь. Войдите в аккаунт или проверьте сеть.',
    messageUk: 'Не вдалося увійти в чергу. Увійдіть у обліковий запис або перевірте мережу.',
    messageEs:
      'No hemos podido añadirte a la cola. Inicia sesión o comprueba la conexión.',
  },
  searchTimeout: {
    messageRu: 'Время поиска истекло. Попробуй ещё раз.',
    messageUk: 'Час пошуку вичерпано. Спробуй ще раз.',
    messageEs: 'Se ha agotado el tiempo de búsqueda. Inténtalo de nuevo.',
  },
  queueJoinFailRetry: {
    messageRu: 'Не удалось войти в очередь. Попробуй ещё раз.',
    messageUk: 'Не вдалося увійти в чергу. Спробуй ще раз.',
    messageEs: 'No se ha podido entrar en la cola. Inténtalo de nuevo.',
  },
} as const;

