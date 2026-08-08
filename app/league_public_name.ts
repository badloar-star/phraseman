const EMAIL_LIKE_PATTERN = /\S\s*@\s*\S/;

export function looksLikePublicEmail(value: unknown): boolean {
  return typeof value === 'string' && EMAIL_LIKE_PATTERN.test(value.trim());
}

function stableFourDigits(value: unknown): string {
  const source = String(value ?? 'league-player');
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return String(Math.abs(hash) % 10_000).padStart(4, '0');
}

export function leaguePublicName(rawName: unknown, stableKey: unknown): string {
  const candidate = typeof rawName === 'string' ? rawName.trim() : '';
  if (candidate && !looksLikePublicEmail(candidate)) return candidate;
  return `Игрок ${stableFourDigits(stableKey)}`;
}
