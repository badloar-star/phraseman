export type MaxVoiceStudyTarget = 'en' | 'fr' | 'es';

/** Backward-compatible normalization: legacy/missing clients remain English. */
export function maxVoiceStudyTarget(value: unknown): MaxVoiceStudyTarget {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'fr' || normalized === 'es') return normalized;
  return 'en';
}

export function maxVoiceTargetLanguageName(value: unknown): 'English' | 'French' | 'Spanish' {
  const target = maxVoiceStudyTarget(value);
  if (target === 'fr') return 'French';
  if (target === 'es') return 'Spanish';
  return 'English';
}
