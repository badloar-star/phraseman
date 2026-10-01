import { runeWord } from '../../constants/runes';

export const SESSION_ATTEMPTS_COPY_LOCALES = [
  'ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
] as const;

export type SessionAttemptsCopyLocale = (typeof SESSION_ATTEMPTS_COPY_LOCALES)[number];

export type SessionAttemptsCopy = {
  attemptsStatus: (remaining: number, total: number) => string;
  exhaustedTitle: string;
  exhaustedBody: string;
  useGift: string;
  restoreForRunes: string;
  restartWithEnergy: string;
  endSession: string;
  permanentGift: string;
  notEnoughRunes: (missing: number) => string;
  giftAppliedTitle: string;
  giftAppliedRunesSaved: string;
  giftRecoveryFailed: string;
  retryGiftRecovery: string;
};

const COPY: Record<SessionAttemptsCopyLocale, SessionAttemptsCopy> = {
  ru: {
    attemptsStatus: (remaining, total) => `Попытки: ${remaining} из ${total}`,
    exhaustedTitle: 'Попытки закончились',
    exhaustedBody: 'Восстановите все 3 попытки и повторите этот вопрос.',
    useGift: 'Использовать второй шанс',
    restoreForRunes: 'Восстановить · 25 монет',
    restartWithEnergy: 'Начать заново',
    endSession: 'Завершить сессию',
    permanentGift: 'Без срока действия',
    notEnoughRunes: (missing) => `Нужно ещё ${missing} ${missing === 1 ? 'монету' : runeWord('ru', missing)}`,
    giftAppliedTitle: 'Второй шанс',
    giftAppliedRunesSaved: 'Монеты сохранены',
    giftRecoveryFailed: 'Не удалось применить второй шанс',
    retryGiftRecovery: 'Повторить',
  },
  uk: {
    attemptsStatus: (remaining, total) => `Спроби: ${remaining} із ${total}`,
    exhaustedTitle: 'Спроби закінчилися',
    exhaustedBody: 'Відновіть усі 3 спроби й повторіть це запитання.',
    useGift: 'Використати другий шанс',
    restoreForRunes: 'Відновити · 25 монет',
    restartWithEnergy: 'Почати заново',
    endSession: 'Завершити сесію',
    permanentGift: 'Без терміну дії',
    notEnoughRunes: (missing) => `Потрібно ще ${missing} монет`,
    giftAppliedTitle: 'Другий шанс',
    giftAppliedRunesSaved: 'Монети збережено',
    giftRecoveryFailed: 'Не вдалося застосувати другий шанс',
    retryGiftRecovery: 'Повторити',
  },
  en: {
    attemptsStatus: (remaining, total) => `Attempts: ${remaining} of ${total}`,
    exhaustedTitle: 'No attempts left',
    exhaustedBody: 'Restore all 3 attempts and retry this question.',
    useGift: 'Use second chance',
    restoreForRunes: 'Restore · 25 coins',
    restartWithEnergy: 'Start over',
    endSession: 'End session',
    permanentGift: 'Never expires',
    notEnoughRunes: (missing) => `You need ${missing} more coin${missing === 1 ? '' : 's'}`,
    giftAppliedTitle: 'Second chance',
    giftAppliedRunesSaved: 'Coins saved',
    giftRecoveryFailed: 'Could not apply the second chance',
    retryGiftRecovery: 'Try again',
  },
  es: {
    attemptsStatus: (remaining, total) => `Intentos: ${remaining} de ${total}`,
    exhaustedTitle: 'No quedan intentos',
    exhaustedBody: 'Recupera los 3 intentos y repite esta pregunta.',
    useGift: 'Usar segunda oportunidad',
    restoreForRunes: 'Recuperar · 25 monedas',
    restartWithEnergy: 'Empezar de nuevo',
    endSession: 'Terminar sesión',
    permanentGift: 'No caduca',
    notEnoughRunes: (missing) => `Te faltan ${missing} monedas`,
    giftAppliedTitle: 'Segunda oportunidad',
    giftAppliedRunesSaved: 'Monedas conservadas',
    giftRecoveryFailed: 'No se pudo usar la segunda oportunidad',
    retryGiftRecovery: 'Reintentar',
  },
  'pt-BR': {
    attemptsStatus: (remaining, total) => `Tentativas: ${remaining} de ${total}`,
    exhaustedTitle: 'As tentativas acabaram',
    exhaustedBody: 'Recupere as 3 tentativas e repita esta pergunta.',
    useGift: 'Usar segunda chance',
    restoreForRunes: 'Recuperar · 25 monedas',
    restartWithEnergy: 'Começar de novo',
    endSession: 'Encerrar sessão',
    permanentGift: 'Não expira',
    notEnoughRunes: (missing) => `Faltam ${missing} moedas`,
    giftAppliedTitle: 'Segunda chance',
    giftAppliedRunesSaved: 'Moedas preservadas',
    giftRecoveryFailed: 'Não foi possível usar a segunda chance',
    retryGiftRecovery: 'Tentar novamente',
  },
  vi: {
    attemptsStatus: (remaining, total) => `Lượt thử: ${remaining}/${total}`,
    exhaustedTitle: 'Đã hết lượt thử',
    exhaustedBody: 'Khôi phục cả 3 lượt thử và làm lại câu hỏi này.',
    useGift: 'Dùng cơ hội thứ hai',
    restoreForRunes: 'Khôi phục · 25 xu',
    restartWithEnergy: 'Bắt đầu lại',
    endSession: 'Kết thúc phiên',
    permanentGift: 'Không hết hạn',
    notEnoughRunes: (missing) => `Bạn cần thêm ${missing} xu`,
    giftAppliedTitle: 'Cơ hội thứ hai',
    giftAppliedRunesSaved: 'Đã giữ xu',
    giftRecoveryFailed: 'Không thể dùng cơ hội thứ hai',
    retryGiftRecovery: 'Thử lại',
  },
  id: {
    attemptsStatus: (remaining, total) => `Kesempatan: ${remaining} dari ${total}`,
    exhaustedTitle: 'Kesempatan habis',
    exhaustedBody: 'Pulihkan semua 3 kesempatan dan ulangi pertanyaan ini.',
    useGift: 'Gunakan kesempatan kedua',
    restoreForRunes: 'Pulihkan · 25 koin',
    restartWithEnergy: 'Mulai lagi',
    endSession: 'Akhiri sesi',
    permanentGift: 'Tidak kedaluwarsa',
    notEnoughRunes: (missing) => `Kamu perlu ${missing} koin lagi`,
    giftAppliedTitle: 'Kesempatan kedua',
    giftAppliedRunesSaved: 'Koin tersimpan',
    giftRecoveryFailed: 'Kesempatan kedua tidak dapat digunakan',
    retryGiftRecovery: 'Coba lagi',
  },
  tr: {
    attemptsStatus: (remaining, total) => `Deneme: ${remaining}/${total}`,
    exhaustedTitle: 'Deneme hakkın bitti',
    exhaustedBody: '3 denemenin hepsini yenile ve bu soruyu tekrar dene.',
    useGift: 'İkinci şansı kullan',
    restoreForRunes: 'Yenile · 25 jeton',
    restartWithEnergy: 'Baştan başla',
    endSession: 'Oturumu bitir',
    permanentGift: 'Süresi dolmaz',
    notEnoughRunes: (missing) => `${missing} jetona daha ihtiyacın var`,
    giftAppliedTitle: 'İkinci şans',
    giftAppliedRunesSaved: 'Rünler korundu',
    giftRecoveryFailed: 'İkinci şans kullanılamadı',
    retryGiftRecovery: 'Tekrar dene',
  },
  pl: {
    attemptsStatus: (remaining, total) => `Próby: ${remaining} z ${total}`,
    exhaustedTitle: 'Nie masz już prób',
    exhaustedBody: 'Odnów wszystkie 3 próby i powtórz to pytanie.',
    useGift: 'Użyj drugiej szansy',
    restoreForRunes: 'Odnów · 25 monet',
    restartWithEnergy: 'Zacznij od nowa',
    endSession: 'Zakończ sesję',
    permanentGift: 'Bez terminu ważności',
    notEnoughRunes: (missing) => `Potrzebujesz jeszcze ${missing} monet`,
    giftAppliedTitle: 'Druga szansa',
    giftAppliedRunesSaved: 'Monety zachowane',
    giftRecoveryFailed: 'Nie udało się użyć drugiej szansy',
    retryGiftRecovery: 'Spróbuj ponownie',
  },
};

export function getSessionAttemptsCopy(locale: string): SessionAttemptsCopy {
  return COPY[locale as SessionAttemptsCopyLocale] ?? COPY.ru;
}
