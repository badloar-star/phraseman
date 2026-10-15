import { pluralWord } from '../../constants/plural';

export const SESSION_ATTEMPTS_COPY_LOCALES = [
  'ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
] as const;

export type SessionAttemptsCopyLocale = (typeof SESSION_ATTEMPTS_COPY_LOCALES)[number];

// зачем (D09/D148, 04.10): тексты подарка («второй шанс», «без срока действия», сбой применения) убраны вместе с подарками
export type SessionAttemptsCopy = {
  attemptsStatus: (remaining: number, total: number) => string;
  exhaustedTitle: string;
  exhaustedBody: string;
  restoreForRunes: string;
  restartWithEnergy: string;
  endSession: string;
  notEnoughRunes: (missing: number) => string;
};

const COPY: Record<SessionAttemptsCopyLocale, SessionAttemptsCopy> = {
  ru: {
    attemptsStatus: (remaining, total) => `Попытки: ${remaining} из ${total}`,
    exhaustedTitle: 'Попытки закончились',
    exhaustedBody: 'Восстанови все 3 попытки и повтори этот вопрос.',
    restoreForRunes: 'Восстановить · 25 монет',
    restartWithEnergy: 'Начать заново',
    endSession: 'Завершить сессию',
    notEnoughRunes: (missing) => `Нужно ещё ${missing} ${pluralWord('ru', missing, { one: 'монету', few: 'монеты', many: 'монет' })}`,
  },
  uk: {
    attemptsStatus: (remaining, total) => `Спроби: ${remaining} із ${total}`,
    exhaustedTitle: 'Спроби закінчилися',
    exhaustedBody: 'Віднови всі 3 спроби й повтори це запитання.',
    restoreForRunes: 'Відновити · 25 монет',
    restartWithEnergy: 'Почати заново',
    endSession: 'Завершити сесію',
    notEnoughRunes: (missing) => `Потрібно ще ${missing} ${pluralWord('uk', missing, { one: 'монету', few: 'монети', many: 'монет' })}`,
  },
  en: {
    attemptsStatus: (remaining, total) => `Attempts: ${remaining} of ${total}`,
    exhaustedTitle: 'No attempts left',
    exhaustedBody: 'Restore all 3 attempts and retry this question.',
    restoreForRunes: 'Restore · 25 coins',
    restartWithEnergy: 'Start over',
    endSession: 'End session',
    notEnoughRunes: (missing) => `You need ${missing} more coin${missing === 1 ? '' : 's'}`,
  },
  es: {
    attemptsStatus: (remaining, total) => `Intentos: ${remaining} de ${total}`,
    exhaustedTitle: 'No quedan intentos',
    exhaustedBody: 'Recupera los 3 intentos y repite esta pregunta.',
    restoreForRunes: 'Recuperar · 25 monedas',
    restartWithEnergy: 'Empezar de nuevo',
    endSession: 'Terminar sesión',
    notEnoughRunes: (missing) => `Te ${missing === 1 ? 'falta' : 'faltan'} ${missing} ${missing === 1 ? 'moneda' : 'monedas'}`,
  },
  'pt-BR': {
    attemptsStatus: (remaining, total) => `Tentativas: ${remaining} de ${total}`,
    exhaustedTitle: 'As tentativas acabaram',
    exhaustedBody: 'Recupere as 3 tentativas e repita esta pergunta.',
    restoreForRunes: 'Recuperar · 25 moedas',
    restartWithEnergy: 'Começar de novo',
    endSession: 'Encerrar sessão',
    notEnoughRunes: (missing) => `${missing === 1 ? 'Falta' : 'Faltam'} ${missing} ${missing === 1 ? 'moeda' : 'moedas'}`,
  },
  vi: {
    attemptsStatus: (remaining, total) => `Lượt thử: ${remaining}/${total}`,
    exhaustedTitle: 'Đã hết lượt thử',
    exhaustedBody: 'Khôi phục cả 3 lượt thử và làm lại câu hỏi này.',
    restoreForRunes: 'Khôi phục · 25 xu',
    restartWithEnergy: 'Bắt đầu lại',
    endSession: 'Kết thúc phiên',
    notEnoughRunes: (missing) => `Bạn cần thêm ${missing} xu`,
  },
  id: {
    attemptsStatus: (remaining, total) => `Kesempatan: ${remaining} dari ${total}`,
    exhaustedTitle: 'Kesempatan habis',
    exhaustedBody: 'Pulihkan semua 3 kesempatan dan ulangi pertanyaan ini.',
    restoreForRunes: 'Pulihkan · 25 koin',
    restartWithEnergy: 'Mulai lagi',
    endSession: 'Akhiri sesi',
    notEnoughRunes: (missing) => `Kamu perlu ${missing} koin lagi`,
  },
  tr: {
    attemptsStatus: (remaining, total) => `Deneme: ${remaining}/${total}`,
    exhaustedTitle: 'Deneme hakkın bitti',
    exhaustedBody: '3 denemenin hepsini yenile ve bu soruyu tekrar dene.',
    restoreForRunes: 'Yenile · 25 jeton',
    restartWithEnergy: 'Baştan başla',
    endSession: 'Oturumu bitir',
    notEnoughRunes: (missing) => `${missing} jetona daha ihtiyacın var`,
  },
  pl: {
    attemptsStatus: (remaining, total) => `Próby: ${remaining} z ${total}`,
    exhaustedTitle: 'Nie masz już prób',
    exhaustedBody: 'Odnów wszystkie 3 próby i powtórz to pytanie.',
    restoreForRunes: 'Odnów · 25 monet',
    restartWithEnergy: 'Zacznij od nowa',
    endSession: 'Zakończ sesję',
    notEnoughRunes: (missing) => `Potrzebujesz jeszcze ${missing} ${pluralWord('pl', missing, { one: 'monetę', few: 'monety', many: 'monet' })}`,
  },
};

export function getSessionAttemptsCopy(locale: string): SessionAttemptsCopy {
  return COPY[locale as SessionAttemptsCopyLocale] ?? COPY.ru;
}
