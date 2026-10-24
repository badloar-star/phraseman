// зачем (жалоба №6 «теряет связь с микрофоном», координатор 24.10): при быстром «Дальше» новая запись стартовала, пока прежняя ещё освобождала
// микрофон (recording.stop() в процессе) — и не поднималась. Перед новой записью дожидаемся освобождения прежней, но не дольше потолка:
// зависший нативный stop не должен блокировать следующее задание.

export type PreviousCaptureReleaseOutcomeV1 = 'none' | 'released' | 'failed' | 'timeout';

export async function awaitPreviousCaptureReleaseV1(
  inFlight: Promise<unknown> | null,
  ceilingMs: number,
): Promise<Readonly<{ outcome: PreviousCaptureReleaseOutcomeV1; waitedMs: number }>> {
  if (!inFlight) return { outcome: 'none', waitedMs: 0 };
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const outcome = await Promise.race<PreviousCaptureReleaseOutcomeV1>([
    inFlight.then(() => 'released' as const, () => 'failed' as const),
    new Promise<PreviousCaptureReleaseOutcomeV1>((resolve) => { timer = setTimeout(() => resolve('timeout'), ceilingMs); }),
  ]);
  if (timer !== null) clearTimeout(timer);
  return { outcome, waitedMs: Date.now() - startedAt };
}
