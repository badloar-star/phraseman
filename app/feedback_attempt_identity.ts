type FeedbackAttemptIdDependencies = {
  now?: () => number;
  random?: () => number;
};

/**
 * One local feedback submission attempt. The server's idempotency key includes
 * this value, so a retry remains one record while a new playthrough is kept.
 */
export function makeFeedbackAttemptId({
  now = Date.now,
  random = Math.random,
}: FeedbackAttemptIdDependencies = {}): string {
  const timestamp = Math.max(0, Math.floor(now())).toString(36);
  const entropy = Math.floor(Math.max(0, Math.min(0.999999, random())) * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `a${timestamp}-${entropy}`;
}
