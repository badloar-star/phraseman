const REGION = 'us-central1';

export const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true';

export const HOT_CALLABLE_OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 80,
} as const;

