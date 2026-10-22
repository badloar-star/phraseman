/**
 * «Дуэль на 5 фраз» (идея 3) — тексты экрана хода на 9 языках: шапка «Дуэль · 2 из 5», задание, «Верно · 7 секунд», «Дальше».
 * зачем (макет docs/design/v2-app/friends-full.html, «Фраза 2 из 5» и «Верно»): отдельный файл, чтобы не мешать сверке
 * duel_copy.ts у Переводчика. Имена не склоняем: «Дуэль · 2 из 5» вместо «Дуэль с Ириной · 2 из 5». Черновик — на сверку Переводчику.
 */
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWithCount } from '../../constants/plural';

type L9 = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;
const L = (ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): L9 =>
  ({ ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });
const pick = (lang: Lang, copy: L9): string => triLang(lang, copy);

const COPY = {
  buildPhrase: L('Собери фразу', 'Збери фразу', 'Build the phrase', 'Arma la frase', 'Monte a frase', 'Ghép câu', 'Susun frasa', 'Cümleyi kur', 'Ułóż frazę'),
  situation: L('Ситуация', 'Ситуація', 'Situation', 'Situación', 'Situação', 'Tình huống', 'Situasi', 'Durum', 'Sytuacja'),
  sayInEnglish: L('Скажи по-английски', 'Скажи англійською', 'Say it in English', 'Dilo en inglés', 'Diga em inglês', 'Nói bằng tiếng Anh', 'Ucapkan dalam bahasa Inggris', 'İngilizce söyle', 'Powiedz po angielsku'),
  tapWords: L('Нажимай слова по порядку', 'Натискай слова по черзі', 'Tap the words in order', 'Toca las palabras en orden', 'Toque as palavras na ordem', 'Chạm các từ theo thứ tự', 'Ketuk kata secara berurutan', 'Kelimelere sırayla dokun', 'Stukaj słowa po kolei'),
  check: L('Проверить', 'Перевірити', 'Check', 'Comprobar', 'Verificar', 'Kiểm tra', 'Periksa', 'Kontrol et', 'Sprawdź'),
  next: L('Дальше', 'Далі', 'Next', 'Siguiente', 'Próxima', 'Tiếp', 'Lanjut', 'Devam', 'Dalej'),
  close: L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'),
  time: L('Время', 'Час', 'Time', 'Tiempo', 'Tempo', 'Thời gian', 'Waktu', 'Süre', 'Czas'),
  errorTitle: L('Дуэль не открылась', 'Дуель не відкрилася', 'Couldn’t open the duel', 'No se pudo abrir el duelo', 'Não foi possível abrir o duelo', 'Không mở được trận đấu', 'Duel tidak bisa dibuka', 'Düello açılamadı', 'Nie udało się otworzyć pojedynku'),
  errorBody: L(
    'Фраз этой дуэли нет в приложении. Обнови его и открой вызов снова.',
    'Фраз цієї дуелі немає в застосунку. Онови його й відкрий виклик знову.',
    'This duel’s phrases aren’t in your version of the app. Update it and open the challenge again.',
    'Las frases de este duelo no están en tu versión de la app. Actualízala y vuelve a abrir el desafío.',
    'As frases deste duelo não estão na sua versão do app. Atualize e abra o desafio de novo.',
    'Phiên bản ứng dụng của bạn chưa có các câu của trận đấu này. Hãy cập nhật rồi mở lại lời thách.',
    'Frasa duel ini tidak ada di versi aplikasimu. Perbarui aplikasi lalu buka tantangan lagi.',
    'Bu düellonun cümleleri uygulama sürümünde yok. Uygulamayı güncelleyip daveti yeniden aç.',
    'Fraz tego pojedynku nie ma w twojej wersji aplikacji. Zaktualizuj ją i otwórz wyzwanie ponownie.',
  ),
  rejectedTitle: L('Вызов не ушёл', 'Виклик не надіслано', 'Challenge not sent', 'El desafío no se envió', 'O desafio não foi enviado', 'Chưa gửi được lời thách', 'Tantangan tidak terkirim', 'Düello daveti gönderilmedi', 'Wyzwanie nie zostało wysłane'),
  expiredTitle: L('Время на ход вышло', 'Час на хід минув', 'Time’s up for this duel', 'Se acabó el tiempo del duelo', 'O tempo do duelo acabou', 'Đã hết giờ của trận đấu', 'Waktu duel sudah habis', 'Düellonun süresi doldu', 'Czas na ruch minął'),
  alreadyMoved: L('Ход уже сделан', 'Хід уже зроблено', 'You’ve already played this duel', 'Ya jugaste este duelo', 'Você já jogou este duelo', 'Bạn đã chơi trận này rồi', 'Kamu sudah main duel ini', 'Bu düelloyu zaten oynadın', 'Ruch już wykonany'),
  tryLater: L('Попробуй позже.', 'Спробуй пізніше.', 'Try again later.', 'Inténtalo más tarde.', 'Tente mais tarde.', 'Hãy thử lại sau.', 'Coba lagi nanti.', 'Daha sonra tekrar dene.', 'Spróbuj później.'),
  /** Под монетой друга, пока он не сходил (`.vs` «ходит»). */
  friendTurn: L('ходит', 'ходить', 'playing', 'jugando', 'jogando', 'đang chơi', 'sedang main', 'oynuyor', 'gra'),
} as const;

export type DuelPlayCopyKey = keyof typeof COPY;
export const duelPlayCopy = (lang: Lang, key: DuelPlayCopyKey): string => pick(lang, COPY[key]);

/** «Дуэль · 2 из 5». */
export function duelProgressLabel(lang: Lang, current: number, total: number): string {
  return pick(lang, L(`Дуэль · ${current} из ${total}`, `Дуель · ${current} з ${total}`, `Duel · ${current} of ${total}`, `Duelo · ${current} de ${total}`, `Duelo · ${current} de ${total}`, `Đấu · ${current}/${total}`, `Duel · ${current} dari ${total}`, `Düello · ${current}/${total}`, `Pojedynek · ${current} z ${total}`));
}

const SECONDS = {
  ru: { one: 'секунда', few: 'секунды', many: 'секунд' },
  uk: { one: 'секунда', few: 'секунди', many: 'секунд' },
  en: { one: 'second', few: 'seconds', many: 'seconds' },
  es: { one: 'segundo', few: 'segundos', many: 'segundos' },
  'pt-BR': { one: 'segundo', few: 'segundos', many: 'segundos' },
  vi: { one: 'giây', few: 'giây', many: 'giây' },
  id: { one: 'detik', few: 'detik', many: 'detik' },
  tr: { one: 'saniye', few: 'saniye', many: 'saniye' },
  pl: { one: 'sekunda', few: 'sekundy', many: 'sekund' },
} as const;

/** Секунды на фразу, не меньше одной: «7 секунд», «1 second». */
function secondsText(lang: Lang, ms: number): string {
  return pluralWithCount(lang, Math.max(1, Math.round(ms / 1000)), triLang(lang, SECONDS));
}

/** Заголовок разбора: «Верно · 7 секунд» / «Не совсем · 9 секунд». */
export function duelVerdictTitle(lang: Lang, correct: boolean, ms: number): string {
  const head = correct
    ? pick(lang, L('Верно', 'Правильно', 'Correct', 'Correcto', 'Correto', 'Đúng', 'Benar', 'Doğru', 'Dobrze'))
    : pick(lang, L('Не совсем', 'Не зовсім', 'Not quite', 'Casi', 'Quase', 'Chưa đúng', 'Belum tepat', 'Tam değil', 'Nie całkiem'));
  return `${head} · ${secondsText(lang, ms)}`;
}

/** «Правильно: I am busy.» — после неверного ответа. */
export function duelCorrectAnswerLine(lang: Lang, targetPhrase: string): string {
  return pick(lang, L(`Правильно: ${targetPhrase}`, `Правильно: ${targetPhrase}`, `Correct answer: ${targetPhrase}`, `Respuesta correcta: ${targetPhrase}`, `Resposta correta: ${targetPhrase}`, `Đáp án đúng: ${targetPhrase}`, `Jawaban benar: ${targetPhrase}`, `Doğru cevap: ${targetPhrase}`, `Poprawnie: ${targetPhrase}`));
}

/** Часы хода «0:48»: сначала округляем до секунд, потом делим — иначе 59,6 с стали бы «0:60». */
export function duelClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
