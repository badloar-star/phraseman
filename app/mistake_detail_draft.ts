/**
 * Черновик карточки ошибки из строки списка — для первого кадра экрана деталей.
 *
 * зачем (аудит Optimistic UI 05.10, п.3): деталь строится из журнала асинхронно, и первый кадр показывал только «‹».
 * Строка списка уже знает фразу, перевод, число ошибок и шаги — кладём их сюда при тапе, деталь рисует шапку сразу,
 * а панели ниже появляются, когда журнал прочитан. Только память процесса.
 */
export type MistakeDetailDraft = Readonly<{
  mistakeId: string;
  phrase: string;
  meaning: string | null;
  captureCount: number;
  qualifyingDays: number;
  status: 'active' | 'corrected' | 'hidden' | 'unavailable';
}>;

const drafts = new Map<string, MistakeDetailDraft>();
const MAX_DRAFTS = 50;

export function rememberMistakeDetailDraft(draft: MistakeDetailDraft): void {
  drafts.delete(draft.mistakeId);
  drafts.set(draft.mistakeId, draft);
  if (drafts.size > MAX_DRAFTS) {
    const oldest = drafts.keys().next().value;
    if (oldest !== undefined) drafts.delete(oldest);
  }
}

export function peekMistakeDetailDraft(mistakeId: string): MistakeDetailDraft | null {
  return drafts.get(mistakeId) ?? null;
}

/* expo-router: утилита, не экран */
export default function __MistakeDetailDraftRouteShim() {
  return null;
}
