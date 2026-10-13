import type { V2DoneError } from '../components/completion/V2DoneScreen';
import type { PhraseMistakeInput } from './phrase_analytics';

/**
 * Ошибки только что пройденного урока для итога (макет learn.html E1–E4 / practice.html#done):
 * список «Ошибки» («слово → было → стало») и кнопка «Добить: Ещё учу (N)» — повтор этих ошибок в «Моих ошибках».
 *
 * зачем (владелец 13.10, «почему тут нет всех элементов»): итог урока не получал список ошибок вообще — в массиве прогресса
 * лежат только `correct`/`wrong` без фраз, а сами промахи жили в `lessonWrongMistakesRef` экрана урока и обнулялись перед
 * переходом. Память процесса, а не диск: список нужен один раз на экране итога; пропущенный показ ничего не стоит
 * (празднование не ставится в durable-очередь, фундамент 01.09), а после перезапуска приложения итог просто без списка.
 */
export const LESSON_RUN_ERRORS_LIMIT = 5;

type Remembered = Readonly<{ lessonId: number; rows: readonly V2DoneError[]; mistakeIds: readonly string[] }>;

let remembered: Remembered | null = null;
let collecting: { lessonId: number; ids: string[] } | null = null;
// зачем (ревью Авторизации 13.10): проход закрыт (rememberLessonRunErrors) — запоздавший id записи ошибки НЕ создаёт новый сборщик, иначе он всплыл бы в «Добить» следующего прохода этого урока.
let sealedLessonId: number | null = null;

/** Начало прохода урока: прошлый проход запечатан/забыт, сборщик id пуст (вызывает экран урока при монтировании и при повторе). */
export function beginLessonRunErrors(lessonId: number): void {
  if (sealedLessonId === lessonId || (collecting && collecting.lessonId === lessonId)) {
    console.log(`[LESSON-RESULT] новый проход lesson=${lessonId}: сборщик id ошибок сброшен`); // guard-ok: журнал начала прохода
  }
  sealedLessonId = null;
  collecting = null;
}

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

/** В «Моих ошибках» записалась ошибка этого прохода (id нужен кнопке «Добить»). Повтор того же id не считается дважды. */
export function collectLessonRunMistakeId(lessonId: number, mistakeId: string): void {
  if (!mistakeId) return;
  if (sealedLessonId === lessonId) {
    console.warn(`[LESSON-RESULT] запоздавший id ошибки отброшен lesson=${lessonId} id=${mistakeId} — проход уже закрыт`); // guard-ok: ранний выход логируется
    return;
  }
  if (!collecting || collecting.lessonId !== lessonId) collecting = { lessonId, ids: [] };
  if (!collecting.ids.includes(mistakeId)) collecting.ids.push(mistakeId);
}

/** Проход закончен: запоминаем строки списка и id собранных ошибок; сборщик обнуляется — следующий проход начнётся с нуля. */
export function rememberLessonRunErrors(lessonId: number, signals: readonly PhraseMistakeInput[]): void {
  const mistakeIds = collecting && collecting.lessonId === lessonId ? [...collecting.ids] : [];
  collecting = null;
  sealedLessonId = lessonId;
  remembered = { lessonId, rows: lessonRunErrorRows(signals), mistakeIds };
}

/** Ошибки последнего прохода именно этого урока; чужой урок или пусто — пустой список. */
export function peekLessonRunErrors(lessonId: number): readonly V2DoneError[] {
  return remembered && remembered.lessonId === lessonId ? remembered.rows : [];
}

/** id ошибок последнего прохода этого урока из «Моих ошибок» — для «Добить: Ещё учу (N)». */
export function peekLessonRunMistakeIds(lessonId: number): readonly string[] {
  return remembered && remembered.lessonId === lessonId ? remembered.mistakeIds : [];
}

export function clearLessonRunErrors(): void {
  remembered = null;
  collecting = null;
  sealedLessonId = null;
}

export type LessonResultCounts = Readonly<{ correct: number; wrong: number; score: number }>;

/** Счёт урока по числам верно/ошибок: оценка 0…5 как у настоящего прохода (верно / всего × 5, один знак). */
export function lessonResultFromCounts(correct: number, wrong: number): LessonResultCounts | null {
  if (!Number.isFinite(correct) || !Number.isFinite(wrong) || correct < 0 || wrong < 0) return null;
  const total = correct + wrong;
  if (total <= 0) return null;
  return { correct, wrong, score: parseFloat(((correct / total) * 5).toFixed(1)) };
}

function firstParam(raw: string | readonly string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : (raw as string | undefined);
}

/**
 * Только dev: ссылка `/lesson_complete?id=1&devResult=15:5` открывает итог с цифрами, как после настоящего прохода.
 * зачем (владелец 13.10): без прогресса урока итог по dev-ссылке рисовал «заголовок + серые звёзды + +0» без счёта и ошибок —
 * робот-съёмка Сверки снимала пустой экран.
 */
export function parseDevLessonResult(raw: string | readonly string[] | undefined): LessonResultCounts | null {
  const text = firstParam(raw);
  const match = typeof text === 'string' ? /^(\d{1,2}):(\d{1,2})$/.exec(text) : null;
  return match ? lessonResultFromCounts(Number(match[1]), Number(match[2])) : null;
}

/**
 * Итог урока, пришедший В МАРШРУТЕ от экрана урока (`resultCorrect`, `resultTotal`), — запасной источник, когда ключа прогресса
 * в хранилище нет (очищен, не успел записаться): координатор 13.10 — «показывать полный вид с данными сессии из навигации».
 */
export function parseRouteLessonResult(
  correctRaw: string | readonly string[] | undefined,
  totalRaw: string | readonly string[] | undefined,
): LessonResultCounts | null {
  const correctText = firstParam(correctRaw);
  const totalText = firstParam(totalRaw);
  if (!correctText || !totalText || !/^\d{1,3}$/.test(correctText) || !/^\d{1,3}$/.test(totalText)) return null;
  const correct = Number(correctText);
  const total = Number(totalText);
  if (total <= 0 || correct > total) return null;
  return lessonResultFromCounts(correct, total - correct);
}
