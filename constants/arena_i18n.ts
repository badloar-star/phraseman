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
  loadingQuestions: { ru: 'Арена', uk: 'Арена', es: 'Arena', 'pt-BR': 'Arena', vi: 'Đấu trường', id: 'Arena', tr: 'Arena', pl: 'Arena' },
  abortedUi: { ru: 'Отмена…', uk: 'Скасовано…', es: 'Cancelado…', 'pt-BR': 'Cancelado...', vi: 'Đã hủy...', id: 'Dibatalkan...', tr: 'İptal edildi...', pl: 'Anulowano...' },
  waitOpponent: { ru: 'Раунд арены', uk: 'Раунд арени', es: 'Ronda de arena', 'pt-BR': 'Rodada da arena', vi: 'Vòng đấu trường', id: 'Ronde arena', tr: 'Arena turu', pl: 'Runda areny' },
  timeLeft: { ru: 'Осталось', uk: 'Залишилось', es: 'Te quedan', 'pt-BR': 'Restam', vi: 'Còn lại', id: 'Tersisa', tr: 'Kalan süre', pl: 'Zostało' },
  connecting: { ru: 'Игра найдена', uk: 'Гру знайдено', es: 'Duelo encontrado', 'pt-BR': 'Jogo encontrado', vi: 'Tìm thấy trận đấu', id: 'Duel ditemukan', tr: 'Düello bulundu', pl: 'Pojedynek znaleziony' },
  gameFound: { ru: 'ИГРА НАЙДЕНА', uk: 'ГРУ ЗНАЙДЕНО', es: '¡DUELO ENCONTRADO!', 'pt-BR': 'JOGO ENCONTRADO', vi: 'ĐÃ TÌM THẤY TRẬN', id: 'DUEL DITEMUKAN', tr: 'DÜELLO BULUNDU', pl: 'POJEDYNEK ZNALEZIONY' },
  decline: { ru: 'Отклонить', uk: 'Відмовити', es: 'Rechazar', 'pt-BR': 'Recusar', vi: 'Từ chối', id: 'Tolak', tr: 'Reddet', pl: 'Odrzuć' },
  accept: { ru: 'ПРИНЯТЬ', uk: 'ПРИЙНЯТИ', es: 'ACEPTAR', 'pt-BR': 'ACEITAR', vi: 'CHẤP NHẬN', id: 'TERIMA', tr: 'KABUL ET', pl: 'AKCEPTUJ' },
  premeet: { ru: 'ПРИГОТОВЬСЯ', uk: 'ПРИГОТУЙСЯ', es: '¡PREPÁRATE!', 'pt-BR': 'PREPARE-SE!', vi: 'CHUẨN BỊ!', id: 'BERSIAP!', tr: 'HAZIRLAN!', pl: 'PRZYGOTUJ SIĘ!' },
  letsGo: { ru: 'Поехали!', uk: 'Поїхали!', es: '¡Vamos!', 'pt-BR': 'Vamos!', vi: 'Bắt đầu!', id: 'Ayo!', tr: 'Haydi!', pl: 'Start!' },
  xpCorrect: { ru: '✓ правильно', uk: '✓ вірно', es: '✓ correcto', 'pt-BR': '✓ correto', vi: '✓ đúng', id: '✓ benar', tr: '✓ doğru', pl: '✓ poprawnie' },
  forfeitTitle: { ru: '🏳️ Сдаться?', uk: '🏳️ Здатися?', es: '🏳️ ¿Te rindes?', 'pt-BR': '🏳️ Desistir?', vi: '🏳️ Đầu hàng?', id: '🏳️ Menyerah?', tr: '🏳️ Peslim mi oluyorsun?', pl: '🏳️ Poddać się?' },
  forfeitSub: {
    ru: 'Засчитается поражение и потеряешь звезду',
    uk: 'Зарахується поразка й ти втратиш зірку',
    es: 'Se contará como derrota y perderás una estrella.',
    'pt-BR': 'Conta como derrota e você perde uma estrela',
    vi: 'Sẽ tính là thua và bạn sẽ mất một ngôi sao',
    id: 'Ini dihitung sebagai kekalahan dan kamu kehilangan satu bintang',
    tr: 'Yenilgi sayılır ve bir yıldız kaybedersin',
    pl: 'Zostanie zaliczone jako porażka i stracisz gwiazdkę',
  },
  forfeitConfirm: { ru: 'Сдаться', uk: 'Здатися', es: 'Rendirse', 'pt-BR': 'Desistir', vi: 'Đầu hàng', id: 'Menyerah', tr: 'Peslim ol', pl: 'Poddaj się' },
  forfeitContinue: { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' },
  duelReactPicker: { ru: 'Реакция', uk: 'Реакція', es: 'Reacción', 'pt-BR': 'Reação', vi: 'Cảm xúc', id: 'Reaksi', tr: 'Tepki', pl: 'Reakcja' },
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
    messageUk: 'Матч скасовано: один із гравців відмовився.',
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
    messageUk: 'Відповідь не надіслано. Перевір з\'єднання і спробуй ще раз.',
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
  duelReactSendFail: {
    messageRu: 'Не удалось отправить реакцию. Проверь сеть.',
    messageUk: 'Не вдалося надіслати реакцію. Перевір мережу.',
    messageEs: 'No se ha podido enviar la reacción. Comprueba la conexión.',
  },
} as const;

/** Тост: игрок с именем `displayName` прислал эмодзи-реакцию (ник без слова «соперник»). */
export function arenaOpponentReactToast(displayName: string, emoji: string) {
  const who = displayName.replace(/\s+/g, ' ').trim() || '—';
  const line = `${who}: ${emoji}`;
  return {
    type: 'info' as const,
    messageRu: line,
    messageUk: line,
    messageEs: line,
  };
}
