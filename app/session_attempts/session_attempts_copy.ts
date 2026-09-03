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
    useGift: 'Использовать подарок',
    restoreForRunes: 'Восстановить · 25 рун',
    restartWithEnergy: 'Начать заново',
    endSession: 'Завершить сессию',
    permanentGift: 'Без срока действия',
    notEnoughRunes: (missing) => `Нужно ещё ${missing} ${missing === 1 ? 'руну' : 'рун'}`,
    giftAppliedTitle: 'Второй шанс',
    giftAppliedRunesSaved: 'Руны сохранены',
    giftRecoveryFailed: 'Не удалось применить подарок',
    retryGiftRecovery: 'Повторить',
  },
  uk: {
    attemptsStatus: (remaining, total) => `Спроби: ${remaining} із ${total}`,
    exhaustedTitle: 'Спроби закінчилися',
    exhaustedBody: 'Відновіть усі 3 спроби й повторіть це запитання.',
    useGift: 'Використати подарунок',
    restoreForRunes: 'Відновити · 25 рун',
    restartWithEnergy: 'Почати заново',
    endSession: 'Завершити сесію',
    permanentGift: 'Без терміну дії',
    notEnoughRunes: (missing) => `Потрібно ще ${missing} рун`,
    giftAppliedTitle: 'Другий шанс',
    giftAppliedRunesSaved: 'Руни збережено',
    giftRecoveryFailed: 'Не вдалося застосувати подарунок',
    retryGiftRecovery: 'Повторити',
  },
  en: {
    attemptsStatus: (remaining, total) => `Attempts: ${remaining} of ${total}`,
    exhaustedTitle: 'No attempts left',
    exhaustedBody: 'Restore all 3 attempts and retry this question.',
    useGift: 'Use gift',
    restoreForRunes: 'Restore · 25 runes',
    restartWithEnergy: 'Start over',
    endSession: 'End session',
    permanentGift: 'Never expires',
    notEnoughRunes: (missing) => `You need ${missing} more rune${missing === 1 ? '' : 's'}`,
    giftAppliedTitle: 'Second chance',
    giftAppliedRunesSaved: 'Runes saved',
    giftRecoveryFailed: 'Could not apply the gift',
    retryGiftRecovery: 'Try again',
  },
  es: {
    attemptsStatus: (remaining, total) => `Intentos: ${remaining} de ${total}`,
    exhaustedTitle: 'No quedan intentos',
    exhaustedBody: 'Recupera los 3 intentos y repite esta pregunta.',
    useGift: 'Usar regalo',
    restoreForRunes: 'Recuperar · 25 runas',
    restartWithEnergy: 'Empezar de nuevo',
    endSession: 'Terminar sesión',
    permanentGift: 'No caduca',
    notEnoughRunes: (missing) => `Te faltan ${missing} runas`,
    giftAppliedTitle: 'Segunda oportunidad',
    giftAppliedRunesSaved: 'Runas conservadas',
    giftRecoveryFailed: 'No se pudo usar el regalo',
    retryGiftRecovery: 'Reintentar',
  },
  'pt-BR': {
    attemptsStatus: (remaining, total) => `Tentativas: ${remaining} de ${total}`,
    exhaustedTitle: 'As tentativas acabaram',
    exhaustedBody: 'Recupere as 3 tentativas e repita esta pergunta.',
    useGift: 'Usar presente',
    restoreForRunes: 'Recuperar · 25 runas',
    restartWithEnergy: 'Começar de novo',
    endSession: 'Encerrar sessão',
    permanentGift: 'Não expira',
    notEnoughRunes: (missing) => `Faltam ${missing} runas`,
    giftAppliedTitle: 'Segunda chance',
    giftAppliedRunesSaved: 'Runas preservadas',
    giftRecoveryFailed: 'Não foi possível usar o presente',
    retryGiftRecovery: 'Tentar novamente',
  },
  vi: {
    attemptsStatus: (remaining, total) => `Lượt thử: ${remaining}/${total}`,
    exhaustedTitle: 'Đã hết lượt thử',
    exhaustedBody: 'Khôi phục cả 3 lượt thử và làm lại câu hỏi này.',
    useGift: 'Dùng quà',
    restoreForRunes: 'Khôi phục · 25 rune',
    restartWithEnergy: 'Bắt đầu lại',
    endSession: 'Kết thúc phiên',
    permanentGift: 'Không hết hạn',
    notEnoughRunes: (missing) => `Bạn cần thêm ${missing} rune`,
    giftAppliedTitle: 'Cơ hội thứ hai',
    giftAppliedRunesSaved: 'Đã giữ rune',
    giftRecoveryFailed: 'Không thể dùng quà',
    retryGiftRecovery: 'Thử lại',
  },
  id: {
    attemptsStatus: (remaining, total) => `Kesempatan: ${remaining} dari ${total}`,
    exhaustedTitle: 'Kesempatan habis',
    exhaustedBody: 'Pulihkan semua 3 kesempatan dan ulangi pertanyaan ini.',
    useGift: 'Gunakan hadiah',
    restoreForRunes: 'Pulihkan · 25 rune',
    restartWithEnergy: 'Mulai lagi',
    endSession: 'Akhiri sesi',
    permanentGift: 'Tidak kedaluwarsa',
    notEnoughRunes: (missing) => `Kamu perlu ${missing} rune lagi`,
    giftAppliedTitle: 'Kesempatan kedua',
    giftAppliedRunesSaved: 'Rune tersimpan',
    giftRecoveryFailed: 'Hadiah tidak dapat digunakan',
    retryGiftRecovery: 'Coba lagi',
  },
  tr: {
    attemptsStatus: (remaining, total) => `Deneme: ${remaining}/${total}`,
    exhaustedTitle: 'Deneme hakkın bitti',
    exhaustedBody: '3 denemenin hepsini yenile ve bu soruyu tekrar dene.',
    useGift: 'Hediyeyi kullan',
    restoreForRunes: 'Yenile · 25 rün',
    restartWithEnergy: 'Baştan başla',
    endSession: 'Oturumu bitir',
    permanentGift: 'Süresi dolmaz',
    notEnoughRunes: (missing) => `${missing} rüne daha ihtiyacın var`,
    giftAppliedTitle: 'İkinci şans',
    giftAppliedRunesSaved: 'Rünler korundu',
    giftRecoveryFailed: 'Hediye kullanılamadı',
    retryGiftRecovery: 'Tekrar dene',
  },
  pl: {
    attemptsStatus: (remaining, total) => `Próby: ${remaining} z ${total}`,
    exhaustedTitle: 'Nie masz już prób',
    exhaustedBody: 'Odnów wszystkie 3 próby i powtórz to pytanie.',
    useGift: 'Użyj prezentu',
    restoreForRunes: 'Odnów · 25 run',
    restartWithEnergy: 'Zacznij od nowa',
    endSession: 'Zakończ sesję',
    permanentGift: 'Bez terminu ważności',
    notEnoughRunes: (missing) => `Potrzebujesz jeszcze ${missing} run`,
    giftAppliedTitle: 'Druga szansa',
    giftAppliedRunesSaved: 'Runy zachowane',
    giftRecoveryFailed: 'Nie udało się użyć prezentu',
    retryGiftRecovery: 'Spróbuj ponownie',
  },
};

export function getSessionAttemptsCopy(locale: string): SessionAttemptsCopy {
  return COPY[locale as SessionAttemptsCopyLocale] ?? COPY.ru;
}
