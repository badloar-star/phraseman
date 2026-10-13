import type { V2DoneError } from '../components/completion/V2DoneScreen';
import type { PhraseMistakeInput } from './phrase_analytics';

/**
 * Ошибки только что пройденного урока для списка «Ошибки» на итоге (макет practice.html#done, урок V1:
 * «слово → было → стало»).
 *
 * зачем (владелец 13.10, «почему тут нет всех элементов»): итог урока не получал список ошибок вообще — в массиве прогресса
 * лежат только `correct`/`wrong` без фраз, а сами промахи жили в `lessonWrongMistakesRef` экрана урока и обнулялись перед
 * переходом. Память процесса, а не диск: список нужен один раз на экране итога; пропущенный показ ничего не стоит
 * (празднование не ставится в durable-очередь, фундамент 01.09), а после перезапуска приложения итог просто без списка.
 */
export const LESSON_RUN_ERRORS_LIMIT = 5;

let remembered: Readonly<{ lessonId: number; rows: readonly V2DoneError[] }> | null = null;

/** Строки «слово → было → стало» из промахов урока: без повторов по слову, только там, где известен выбранный ответ. */
export function lessonRunErrorRows(signals: readonly PhraseMistakeInput[]): readonly V2DoneError[] {
  const rows: V2DoneError[] = [];
  const seen = new Set<string>();
  for (const signal of signals) {
    if (typeof signal === 'string') continue;
    const label = (signal.tokenText ?? '').trim();
    const was = (signal.picked ?? '').trim();
    const ok = (signal.expected ?? signal.tokenText ?? '').trim();
    if (!label || !was || !ok || was.toLowerCase() === ok.toLowerCase()) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ label, was, ok });
    if (rows.length >= LESSON_RUN_ERRORS_LIMIT) break;
  }
  return rows;
}

export function rememberLessonRunErrors(lessonId: number, signals: readonly PhraseMistakeInput[]): void {
  remembered = { lessonId, rows: lessonRunErrorRows(signals) };
}

/** Ошибки последнего прохода именно этого урока; чужой урок или пусто — пустой список. */
export function peekLessonRunErrors(lessonId: number): readonly V2DoneError[] {
  return remembered && remembered.lessonId === lessonId ? remembered.rows : [];
}

export function clearLessonRunErrors(): void {
  remembered = null;
}

export type DevLessonResultDemo = Readonly<{ correct: number; wrong: number; score: number; tier: 'none' | 'bronze' | 'silver' | 'gold' }>;

/**
 * Только dev: ссылка `/lesson_complete?id=1&devResult=15:5` открывает итог с цифрами, как после настоящего прохода.
 * зачем (владелец 13.10): без прогресса урока итог по dev-ссылке рисовал «заголовок + серые звёзды + +0» без счёта и ошибок —
 * робот-съёмка Сверки снимала пустой экран. Медаль считается теми же порогами, что и настоящая (5 баллов за 100 %: бронза ≥ 2,5, серебро ≥ 4,5, золото = 5,0).
 */
export function parseDevLessonResult(raw: string | readonly string[] | undefined): DevLessonResultDemo | null {
  const text = Array.isArray(raw) ? raw[0] : raw;
  const match = typeof text === 'string' ? /^(\d{1,2}):(\d{1,2})$/.exec(text) : null;
  if (!match) return null;
  const correct = Number(match[1]);
  const wrong = Number(match[2]);
  const total = correct + wrong;
  if (total <= 0) return null;
  const score = parseFloat(((correct / total) * 5).toFixed(1));
  const tier = score >= 5 ? 'gold' : score >= 4.5 ? 'silver' : score >= 2.5 ? 'bronze' : 'none';
  return { correct, wrong, score, tier };
}
