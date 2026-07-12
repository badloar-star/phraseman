export interface ContentFactoryProgress {
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
}

export function applyUnitProgressTransition(
  current: ContentFactoryProgress,
  transition: { readonly next: 'succeeded' | 'failed'; readonly wasSucceeded: boolean; readonly failureCounted: boolean },
): { progress: ContentFactoryProgress; failureCounted: boolean; jobState: 'partial' | 'needs_review' } {
  if (!Number.isSafeInteger(current.total) || current.total < 1 || !Number.isSafeInteger(current.completed) || current.completed < 0 || !Number.isSafeInteger(current.failed) || current.failed < 0 || current.completed + current.failed > current.total) throw new Error('content_factory_progress_invalid');
  let completed = current.completed;
  let failed = current.failed;
  let failureCounted = transition.failureCounted;
  if (transition.next === 'succeeded') {
    if (!transition.wasSucceeded) completed += 1;
    if (failureCounted) failed -= 1;
    failureCounted = false;
  } else if (!transition.wasSucceeded && !failureCounted) {
    failed += 1;
    failureCounted = true;
  }
  if (completed < 0 || failed < 0 || completed + failed > current.total) throw new Error('content_factory_progress_invalid');
  const progress = Object.freeze({ total: current.total, completed, failed });
  return Object.freeze({ progress, failureCounted, jobState: completed === current.total && failed === 0 ? 'needs_review' : 'partial' });
}
