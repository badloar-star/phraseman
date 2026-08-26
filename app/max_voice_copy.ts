import type { Lang } from '../constants/i18n';
import type { MaxCallUiPhase, MaxCallUiState } from './max_call_ui_state';

type MaxSystemCopy = Readonly<{
  reconnecting: string;
  failed: string;
  wrappingUp: string;
  /** Пауза перед первой фразой учителя: экран не должен молчать. */
  connecting: string;
  maxSpeaking: string;
  speak: string;
  retry: string;
  finish: string;
}>;

/** Complete authored system-state copy for every supported interface locale. */
export const MAX_COPY: Readonly<Record<Lang, MaxSystemCopy>> = {
  ru: { connecting: 'Учитель звонит тебе', reconnecting: 'Восстанавливаем связь', failed: 'Не удалось восстановить связь', wrappingUp: 'Завершаем разговор', maxSpeaking: 'MAX говорит', speak: 'Говори', retry: 'Попробовать снова', finish: 'Завершить и перейти к разбору' },
  uk: { connecting: 'Учитель дзвонить тобі', reconnecting: 'Відновлюємо зв’язок', failed: 'Не вдалося відновити зв’язок', wrappingUp: 'Завершуємо розмову', maxSpeaking: 'MAX говорить', speak: 'Говори', retry: 'Спробувати знову', finish: 'Завершити й перейти до розбору' },
  es: { connecting: 'El profesor te está llamando', reconnecting: 'Recuperando la conexión', failed: 'No se pudo recuperar la conexión', wrappingUp: 'Finalizando la conversación', maxSpeaking: 'MAX está hablando', speak: 'Habla', retry: 'Reintentar conexión', finish: 'Finalizar e ir a la revisión' },
  'pt-BR': { connecting: 'O professor está te ligando', reconnecting: 'Restaurando a conexão', failed: 'Não foi possível restaurar a conexão', wrappingUp: 'Encerrando a conversa', maxSpeaking: 'MAX está falando', speak: 'Fale', retry: 'Tentar conectar novamente', finish: 'Encerrar e ir para a revisão' },
  vi: { connecting: 'Giáo viên đang gọi bạn', reconnecting: 'Đang khôi phục kết nối', failed: 'Không thể khôi phục kết nối', wrappingUp: 'Đang kết thúc cuộc trò chuyện', maxSpeaking: 'MAX đang nói', speak: 'Hãy nói', retry: 'Thử kết nối lại', finish: 'Kết thúc và xem đánh giá' },
  id: { connecting: 'Guru sedang menghubungimu', reconnecting: 'Memulihkan koneksi', failed: 'Koneksi tidak dapat dipulihkan', wrappingUp: 'Mengakhiri percakapan', maxSpeaking: 'MAX sedang berbicara', speak: 'Silakan bicara', retry: 'Coba sambungkan lagi', finish: 'Akhiri dan buka ulasan' },
  tr: { connecting: 'Öğretmen seni arıyor', reconnecting: 'Bağlantı yeniden kuruluyor', failed: 'Bağlantı yeniden kurulamadı', wrappingUp: 'Konuşma bitiriliyor', maxSpeaking: 'MAX konuşuyor', speak: 'Konuş', retry: 'Bağlantıyı tekrar dene', finish: 'Bitir ve değerlendirmeye geç' },
  pl: { connecting: 'Nauczyciel do ciebie dzwoni', reconnecting: 'Przywracanie połączenia', failed: 'Nie udało się przywrócić połączenia', wrappingUp: 'Kończymy rozmowę', maxSpeaking: 'MAX mówi', speak: 'Mów', retry: 'Spróbuj połączyć ponownie', finish: 'Zakończ i przejdź do podsumowania' },
};

export const MAX_END_INTENTS = {
  en: ['end the call', 'finish the conversation', 'finish the lesson', "let's stop", 'i want to stop', 'we need to end the call'],
  ru: ['закончи разговор', 'закончить разговор', 'давай закончим', 'закончи урок', 'я хочу закончить', 'надо закончить разговор', 'нам надо закончить разговор'],
  uk: ['закінчи розмову', 'закінчити розмову', 'давай закінчимо', 'закінчи урок', 'я хочу закінчити', 'треба закінчити розмову'],
  es: ['termina la conversación', 'terminar la conversación', 'acabemos', 'termina la lección', 'quiero terminar'],
  'pt-BR': ['encerre a conversa', 'terminar a conversa', 'vamos terminar', 'encerre a aula', 'quero terminar'],
  vi: ['kết thúc cuộc trò chuyện', 'dừng cuộc trò chuyện', 'kết thúc bài học', 'tôi muốn dừng lại'],
  id: ['akhiri percakapan', 'selesaikan percakapan', 'akhiri pelajaran', 'saya ingin berhenti'],
  tr: ['konuşmayı bitir', 'sohbeti bitir', 'dersi bitir', 'bitirelim', 'durmak istiyorum'],
  pl: ['zakończ rozmowę', 'skończ rozmowę', 'zakończ lekcję', 'skończmy', 'chcę zakończyć'],
} as const;

const POLITE_PREFIXES = [
  'please', 'please max', 'max please', 'can you', 'could you', 'would you',
  'пожалуйста', 'макс пожалуйста', 'будь ласка', 'макс будь ласка',
  'por favor', 'max por favor', 'vui lòng', 'làm ơn', 'tolong', 'lütfen', 'proszę',
] as const;
const POLITE_SUFFIXES = [
  'please', 'please now', 'now', 'пожалуйста', 'сейчас', 'будь ласка',
  'por favor', 'agora', 'bây giờ', 'sekarang', 'lütfen', 'proszę', 'teraz',
] as const;

function normalizeIntent(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[.,!?;:()[\]{}"'“”‘’«»…—–_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeEdgePhrase(value: string, phrases: readonly string[], edge: 'start' | 'end'): string {
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    if (edge === 'start' && value.startsWith(`${phrase} `)) return value.slice(phrase.length).trim();
    if (edge === 'end' && value.endsWith(` ${phrase}`)) return value.slice(0, -(phrase.length + 1)).trim();
  }
  return value;
}

/**
 * Matches only a complete, final learner command. Ordinary discussion that
 * merely contains words such as "finish" or "stop" remains unmatched.
 */
export function isMaxEndIntent(value: string): boolean {
  const normalized = normalizeIntent(value);
  if (!normalized) return false;
  const catalog = Object.values(MAX_END_INTENTS).flat().map(normalizeIntent);
  if (catalog.includes(normalized)) return true;
  const withoutPrefix = removeEdgePhrase(normalized, POLITE_PREFIXES, 'start');
  const withoutEdges = removeEdgePhrase(withoutPrefix, POLITE_SUFFIXES, 'end');
  return catalog.includes(withoutEdges);
}

export function maxVoicePhaseLabel(
  phase: MaxCallUiPhase,
  eqOwner: MaxCallUiState['eqOwner'],
  lang: Lang,
): string {
  const c = MAX_COPY[lang];
  if (phase === 'reconnecting') return c.reconnecting;
  if (phase === 'failed') return c.failed;
  if (phase === 'wrapping_up') return c.wrappingUp;
  if (eqOwner === 'ai') return c.maxSpeaking;
  if (eqOwner === 'user') return c.speak;
  // зачем (владелец 2026-08-23): «убери нахуй текст, никто никого не соединяет».
  // В ожидании первой фразы экран показывает ЦЕЛЬ УРОКА (что сегодня делаем),
  // а не служебный статус связи — см. max_call_session, блок ожидания.
  return '';
}

export function maxVoiceFailureActions(lang: Lang): { retry: string; finish: string } {
  const c = MAX_COPY[lang];
  return { retry: c.retry, finish: c.finish };
}

export const MAX_LEARNER_END_INSTRUCTION =
  'The learner explicitly asked to end now. Say one short, warm goodbye in the learner interface language, then call end_call(). Do not continue the lesson, ask another question, or add a summary.';

export default function __RouteShim() { return null; }
