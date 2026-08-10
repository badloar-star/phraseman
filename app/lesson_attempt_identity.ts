const LESSON_ATTEMPT_ID_RE = /^[A-Za-z0-9_]{8,48}$/;

export function makeLessonServerAttemptId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeLessonServerAttemptId(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim();
  return LESSON_ATTEMPT_ID_RE.test(normalized) ? normalized : null;
}
