/**
 * Итог ПЕРВОГО бесплатного разговора с ИИ — для пейвола «М» при входе dialog_limit.
 *
 * зачем (координатор 25.10, пейвол «Вариант М»): экран Plus говорит с человеком его же цифрами — «твой первый разговор:
 * 7 минут, 12 реплик, было → стало». Храним только на телефоне (AsyncStorage), без сети и Firestore; записываем один раз
 * (первый разговор при Free), читаем в память один раз и отдаём входу в пейвол синхронно — окно не ждёт хранилища.
 * Нет данных — входы шлют прежние context/source, пейвол показывает общий экран. Текст фразы в журнал не пишем.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DIALOG_FIRST_FREE_SUMMARY_KEY = 'dialog_first_free_summary_v1';
const PHRASE_MAX = 200;

export type DialogFirstFreeSummary = Readonly<{
  minutes: number;
  learnerTurns: number;
  correctionWas: string | null;
  correctionNow: string | null;
  savedAtMs: number;
}>;

/** Параметры к существующему входу пейвола (context/source не меняются). */
export type DialogFirstSummaryParams = Readonly<{
  firstDialogMinutes?: string;
  firstDialogTurns?: string;
  firstDialogWas?: string;
  firstDialogNow?: string;
}>;

let cached: DialogFirstFreeSummary | null = null;
let hydrated = false;
let hydration: Promise<void> | null = null;

function clip(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 ? text.slice(0, PHRASE_MAX) : null;
}

function parse(raw: string | null): DialogFirstFreeSummary | null {
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as Record<string, unknown>;
    const minutes = Number(row.minutes);
    const learnerTurns = Number(row.learnerTurns);
    if (!Number.isInteger(minutes) || minutes < 1 || !Number.isInteger(learnerTurns) || learnerTurns < 1) {
      console.warn('[DIALOG-FIRST-SUMMARY] read skipped reason=invalid_row'); // guard-ok: ранний выход с причиной
      return null;
    }
    const was = clip(row.correctionWas);
    const now = clip(row.correctionNow);
    return Object.freeze({
      minutes,
      learnerTurns,
      correctionWas: was && now ? was : null,
      correctionNow: was && now ? now : null,
      savedAtMs: Number(row.savedAtMs) || 0,
    });
  } catch (error) {
    console.warn(`[DIALOG-FIRST-SUMMARY] read skipped reason=parse_failed ${error instanceof Error ? error.name : typeof error}`); // guard-ok: catch с причиной
    return null;
  }
}

/** Прочитать сохранённый итог в память (один раз за процесс). Вызывать заранее — до тапа по входу в пейвол. */
export function warmDialogFirstFreeSummary(): Promise<void> {
  if (hydration) return hydration;
  hydration = AsyncStorage.getItem(DIALOG_FIRST_FREE_SUMMARY_KEY)
    .then((raw) => {
      cached = parse(raw);
      console.log(`[DIALOG-FIRST-SUMMARY] read source=storage found=${cached ? 'yes' : 'no'}`);
    })
    .catch((error: unknown) => {
      console.warn(`[DIALOG-FIRST-SUMMARY] read failed ${error instanceof Error ? error.name : typeof error}`); // guard-ok: catch с причиной
    })
    .finally(() => {
      hydrated = true;
    });
  return hydration;
}

export function peekDialogFirstFreeSummary(): DialogFirstFreeSummary | null {
  return cached;
}

export async function recordDialogFirstFreeSummary(input: Readonly<{
  freeTier: boolean;
  startedAtMs: number;
  endedAtMs: number;
  learnerTurns: number;
  corrections: readonly Readonly<{ original: string; corrected: string }>[];
}>): Promise<void> {
  if (!input.freeTier) {
    console.log('[DIALOG-FIRST-SUMMARY] write skipped reason=not_free_tier');
    return;
  }
  if (input.learnerTurns < 1) {
    console.log('[DIALOG-FIRST-SUMMARY] write skipped reason=no_learner_turns');
    return;
  }
  await warmDialogFirstFreeSummary();
  if (cached) {
    console.log('[DIALOG-FIRST-SUMMARY] write skipped reason=already_saved');
    return;
  }
  const first = input.corrections.find((item) => clip(item.original) && clip(item.corrected));
  const summary: DialogFirstFreeSummary = Object.freeze({
    minutes: Math.max(1, Math.round(Math.max(0, input.endedAtMs - input.startedAtMs) / 60_000)),
    learnerTurns: Math.min(999, Math.trunc(input.learnerTurns)),
    correctionWas: first ? clip(first.original) : null,
    correctionNow: first ? clip(first.corrected) : null,
    savedAtMs: input.endedAtMs,
  });
  cached = summary;
  try {
    await AsyncStorage.setItem(DIALOG_FIRST_FREE_SUMMARY_KEY, JSON.stringify(summary));
    console.log(`[DIALOG-FIRST-SUMMARY] written minutes=${summary.minutes} turns=${summary.learnerTurns} correction=${summary.correctionWas ? `${summary.correctionWas.length}>${summary.correctionNow?.length ?? 0}` : 'none'}`);
  } catch (error) {
    console.warn(`[DIALOG-FIRST-SUMMARY] write failed ${error instanceof Error ? error.name : typeof error}`); // guard-ok: catch с причиной; в памяти итог остаётся до перезапуска
  }
}

/** Параметры пейвола dialog_limit: прежние context/source плюс итог первого разговора, если он есть. */
export function dialogLimitPaywallParams(source: string): Readonly<{ context: 'dialog_limit'; source: string } & DialogFirstSummaryParams> {
  if (!hydrated) void warmDialogFirstFreeSummary();
  const summary = cached;
  if (!summary) {
    console.log(`[DIALOG-FIRST-SUMMARY] paywall source=${source} params=none reason=${hydrated ? 'no_summary' : 'not_hydrated'}`);
    return { context: 'dialog_limit', source };
  }
  console.log(`[DIALOG-FIRST-SUMMARY] paywall source=${source} params=minutes,turns${summary.correctionWas ? ',correction' : ''}`);
  return {
    context: 'dialog_limit',
    source,
    firstDialogMinutes: String(summary.minutes),
    firstDialogTurns: String(summary.learnerTurns),
    ...(summary.correctionWas && summary.correctionNow
      ? { firstDialogWas: summary.correctionWas, firstDialogNow: summary.correctionNow }
      : {}),
  };
}

/** Только для тестов. */
export function __resetDialogFirstFreeSummaryForTests(): void {
  cached = null;
  hydrated = false;
  hydration = null;
}
