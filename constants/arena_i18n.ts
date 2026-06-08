import type { Lang } from './i18n';

type ArenaLang = Lang;

export function arenaUiLang(lang: Lang): ArenaLang {
  return lang;
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

/** Суффикс секунд у таймера. */
export function arenaSecondsSuffix(lang: Lang): string {
  const suffix: Record<ArenaLang, string> = {
    ru: 'с',
    uk: 'с',
    es: ' s',
    'pt-BR': ' s',
    vi: ' giây',
    id: ' dtk',
    tr: ' sn',
    pl: ' s',
  };
  return suffix[arenaUiLang(lang)];
}

export function arenaXpSpeed(lang: Lang, elapsedSec: number): string {
  const L = arenaUiLang(lang);
  if (L === 'uk') return `відповів за ${elapsedSec} с`;
  if (L === 'es') return `respondiste en ${elapsedSec} s`;
  if (L === 'pt-BR') return `você respondeu em ${elapsedSec} s`;
  if (L === 'vi') return `bạn trả lời trong ${elapsedSec} giây`;
  if (L === 'id') return `menjawab dalam ${elapsedSec} dtk`;
  if (L === 'tr') return `${elapsedSec} sn içinde yanıtladın`;
  if (L === 'pl') return `odpowiedź w ${elapsedSec} s`;
  return `ответил за ${elapsedSec} сек`;
}

export function arenaXpFirst(lang: Lang): string {
  const L = arenaUiLang(lang);
  if (L === 'uk') return 'перша вірна відповідь!';
  if (L === 'es') return '¡Primera respuesta correcta!';
  if (L === 'pt-BR') return 'primeira resposta correta!';
  if (L === 'vi') return 'câu trả lời đúng đầu tiên!';
  if (L === 'id') return 'jawaban benar pertama!';
  if (L === 'tr') return 'ilk doğru cevap!';
  if (L === 'pl') return 'pierwsza poprawna odpowiedź!';
  return 'первый правильный!';
}

export function arenaXpStreak(lang: Lang): string {
  const L = arenaUiLang(lang);
  if (L === 'uk') return '3 поспіль!';
  if (L === 'es') return '¡Tres aciertos seguidos!';
  if (L === 'pt-BR') return '3 acertos seguidos!';
  if (L === 'vi') return '3 câu đúng liên tiếp!';
  if (L === 'id') return '3 benar berturut-turut!';
  if (L === 'tr') return 'üst üste 3 doğru!';
  if (L === 'pl') return '3 poprawne z rzędu!';
  return '3 подряд!';
}

export function arenaXpOutspeed(lang: Lang): string {
  const L = arenaUiLang(lang);
  if (L === 'uk') return 'швидше за суперника!';
  if (L === 'es') return '¡Más rápido que tu rival!';
  if (L === 'pt-BR') return 'mais rápido que o rival!';
  if (L === 'vi') return 'nhanh hơn đối thủ!';
  if (L === 'id') return 'lebih cepat dari lawan!';
  if (L === 'tr') return 'rakibinden daha hızlı!';
  if (L === 'pl') return 'szybciej niż rywal!';
  return 'быстрее соперника!';
}

/** Подпись «ты» на табло очков. */
export function arenaScoreboardYou(lang: Lang): string {
  if (lang === 'uk') return 'Ти';
  if (lang === 'es') return 'Tú';
  if (lang === 'pt-BR') return 'Você';
  if (lang === 'vi') return 'Bạn';
  if (lang === 'id') return 'Kamu';
  if (lang === 'tr') return 'Sen';
  if (lang === 'pl') return 'Ty';
  return 'Ты';
}

/** Тосты: общие фразы арены / лобби / join. */
export const arenaToasts = {
  matchAbortedDecline: {
    messageRu: 'Матч отменён: один из игроков отказался.',
    messageUk: 'Матч скасовано: один із гравців відмовився.',
    messageEs: 'Partida cancelada: un jugador rechazó la partida.',
    messagePtBr: 'Partida cancelada: um dos jogadores recusou.',
    messageVi: 'Trận đấu đã bị hủy: một người chơi đã từ chối.',
    messageId: 'Pertandingan dibatalkan: salah satu pemain menolak.',
    messageTr: 'Maç iptal edildi: oyunculardan biri reddetti.',
    messagePl: 'Mecz anulowany: jeden z graczy odmówił.',
  },
  matchAbortedTimeout: {
    messageRu: 'Время на принятие вышло — поиск снова в лобби.',
    messageUk: 'Час на прийняття вичерпано — знову лобі.',
    messageEs:
      'Se ha agotado el tiempo para aceptar el duelo. Vuelve a la Arena y busca otro rival.',
    messagePtBr: 'O tempo para aceitar o duelo acabou. Volte à Arena e procure outro rival.',
    messageVi: 'Đã hết thời gian chấp nhận trận đấu. Quay lại Đấu trường và tìm đối thủ khác.',
    messageId: 'Waktu untuk menerima duel habis. Kembali ke Arena dan cari lawan lain.',
    messageTr: 'Düelloyu kabul etme süresi doldu. Arena’ya dönüp başka bir rakip ara.',
    messagePl: 'Czas na przyjęcie pojedynku minął. Wróć na Arenę i poszukaj innego rywala.',
  },
  answerNotSent: {
    messageRu: 'Ответ не отправлен. Проверь соединение и попробуй снова.',
    messageUk: 'Відповідь не надіслано. Перевір з\'єднання і спробуй ще раз.',
    messageEs: 'La respuesta no se ha enviado. Revisa la conexión e inténtalo de nuevo.',
    messagePtBr: 'A resposta não foi enviada. Verifique a conexão e tente novamente.',
    messageVi: 'Chưa gửi được câu trả lời. Kiểm tra kết nối rồi thử lại.',
    messageId: 'Jawaban belum terkirim. Periksa koneksi dan coba lagi.',
    messageTr: 'Cevap gönderilmedi. Bağlantını kontrol edip tekrar dene.',
    messagePl: 'Odpowiedź nie została wysłana. Sprawdź połączenie i spróbuj ponownie.',
  },
  matchFinishFail: {
    messageRu: 'Матч не завершился корректно.',
    messageUk: 'Не вдалося коректно завершити матч.',
    messageEs: 'No se ha podido finalizar el duelo correctamente.',
    messagePtBr: 'Não foi possível finalizar a partida corretamente.',
    messageVi: 'Không thể kết thúc trận đấu đúng cách.',
    messageId: 'Pertandingan tidak dapat diselesaikan dengan benar.',
    messageTr: 'Maç düzgün şekilde bitirilemedi.',
    messagePl: 'Nie udało się poprawnie zakończyć meczu.',
  },
  lobbyChoiceSendFail: {
    messageRu: 'Не получилось отправить. Повтори.',
    messageUk: 'Не вдалося надіслати. Ще раз.',
    messageEs: 'No se ha podido enviar. Inténtalo de nuevo.',
    messagePtBr: 'Não foi possível enviar. Tente novamente.',
    messageVi: 'Không gửi được. Hãy thử lại.',
    messageId: 'Tidak dapat mengirim. Coba lagi.',
    messageTr: 'Gönderilemedi. Tekrar dene.',
    messagePl: 'Nie udało się wysłać. Spróbuj ponownie.',
  },
  queueJoinFailAuth: {
    messageRu: 'Вход в очередь не прошёл. Войди в аккаунт или проверь сеть.',
    messageUk: 'Не вдалося увійти в чергу. Увійдіть у обліковий запис або перевірте мережу.',
    messageEs:
      'No hemos podido añadirte a la cola. Inicia sesión o comprueba la conexión.',
    messagePtBr: 'Não foi possível entrar na fila. Entre na conta ou verifique a conexão.',
    messageVi: 'Không thể vào hàng chờ. Hãy đăng nhập hoặc kiểm tra kết nối.',
    messageId: 'Tidak dapat masuk antrean. Masuk ke akun atau periksa koneksi.',
    messageTr: 'Sıraya girilemedi. Hesabına giriş yap veya bağlantını kontrol et.',
    messagePl: 'Nie udało się wejść do kolejki. Zaloguj się albo sprawdź połączenie.',
  },
  searchTimeout: {
    messageRu: 'Время поиска истекло. Попробуй ещё раз.',
    messageUk: 'Час пошуку вичерпано. Спробуй ще раз.',
    messageEs: 'Se ha agotado el tiempo de búsqueda. Inténtalo de nuevo.',
    messagePtBr: 'O tempo de busca acabou. Tente novamente.',
    messageVi: 'Đã hết thời gian tìm kiếm. Hãy thử lại.',
    messageId: 'Waktu pencarian habis. Coba lagi.',
    messageTr: 'Arama süresi doldu. Tekrar dene.',
    messagePl: 'Czas wyszukiwania minął. Spróbuj ponownie.',
  },
  queueJoinFailRetry: {
    messageRu: 'Вход в очередь не прошёл. Попробуй ещё раз.',
    messageUk: 'Не вдалося увійти в чергу. Спробуй ще раз.',
    messageEs: 'No se ha podido entrar en la cola. Inténtalo de nuevo.',
    messagePtBr: 'Não foi possível entrar na fila. Tente novamente.',
    messageVi: 'Không thể vào hàng chờ. Hãy thử lại.',
    messageId: 'Tidak dapat masuk antrean. Coba lagi.',
    messageTr: 'Sıraya girilemedi. Tekrar dene.',
    messagePl: 'Nie udało się wejść do kolejki. Spróbuj ponownie.',
  },
  duelReactSendFail: {
    messageRu: 'Реакция не отправилась. Проверь сеть.',
    messageUk: 'Не вдалося надіслати реакцію. Перевір мережу.',
    messageEs: 'No se ha podido enviar la reacción. Comprueba la conexión.',
    messagePtBr: 'Não foi possível enviar a reação. Verifique a conexão.',
    messageVi: 'Không gửi được cảm xúc. Hãy kiểm tra kết nối.',
    messageId: 'Tidak dapat mengirim reaksi. Periksa koneksi.',
    messageTr: 'Tepki gönderilemedi. Bağlantını kontrol et.',
    messagePl: 'Nie udało się wysłać reakcji. Sprawdź połączenie.',
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
    messagePtBr: line,
    messageVi: line,
    messageId: line,
    messageTr: line,
    messagePl: line,
  };
}
