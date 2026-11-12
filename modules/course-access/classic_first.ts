/** Stage 1 policy, deliberately not activated in store builds. Inputs come from trusted adapters, never navigation params. */
export type Evidence = Readonly<{
  owner: string; target: string; kind: 'explicit_open' | 'session_started' | 'progress' | 'auto_impression';
  clock: 'verified' | 'device_only'; atMs: number;
}>;
export type CourseAccessInput = Readonly<{
  owner: string | null; target: string; cutoverMs: number | null;
  history: Readonly<{ owner: string; target: string; state: 'loading' | 'complete' | 'incomplete' | 'conflict'; evidence: readonly Evidence[] }> | null;
  classicReady: boolean; v2Ready: boolean; uiLocaleAllowsV2: boolean | null; v2GloballyHidden: boolean;
}>;
export type Cohort = 'prior' | 'new' | 'unresolved' | 'conflict';
export type Landing = 'classic' | 'v2_library' | 'home';
export type V2Entry = 'open_v2' | 'wait' | 'classic' | 'home';
export type CourseAccess = Readonly<{ cohort: Cohort; landing: Landing; showNewCourseButton: boolean; v2Entry: V2Entry }>;
const provenKinds = new Set(['explicit_open', 'session_started', 'progress']);
const validTime = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

export function resolveClassicFirst(input: CourseAccessInput): CourseAccess {
  const { owner, target, cutoverMs, history } = input;
  let cohort: Cohort = 'unresolved';
  if (owner && target && history && history.owner === owner && history.target === target && validTime(cutoverMs)) {
    const relevant = history.evidence.filter(e => e.owner === owner && e.target === target && provenKinds.has(e.kind));
    if (history.state === 'conflict') cohort = 'conflict';
    else if (relevant.some(e => e.clock === 'verified' && validTime(e.atMs) && e.atMs < cutoverMs)) cohort = 'prior';
    else if (history.state === 'complete' && !relevant.some(e => e.clock !== 'verified' || !validTime(e.atMs))) cohort = 'new';
  }
  const fallback = input.classicReady === true ? 'classic' : 'home';
  const enabled = input.v2Ready === true && input.v2GloballyHidden === false;
  const showNewCourseButton = enabled && input.uiLocaleAllowsV2 === true && cohort === 'prior';
  const landing = fallback === 'classic' ? 'classic' : showNewCourseButton ? 'v2_library' : 'home';
  const pending = enabled && input.uiLocaleAllowsV2 !== false && cohort !== 'new' && cohort !== 'conflict' &&
    (input.uiLocaleAllowsV2 == null || cohort === 'unresolved');
  return { cohort, landing, showNewCourseButton, v2Entry: showNewCourseButton ? 'open_v2' : pending ? 'wait' : fallback };
}

/** Use on a tap, notification, friend link or resume. No warmup, navigation or energy effects unless permitted. */
export function startV2WhenAllowed<T>(input: CourseAccessInput, start: () => T):
  { outcome: 'open_v2'; result: T } | { outcome: Exclude<V2Entry, 'open_v2'> } {
  const decision = resolveClassicFirst(input).v2Entry;
  return decision === 'open_v2' ? { outcome: decision, result: start() } : { outcome: decision };
}
