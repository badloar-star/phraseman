export const ADMIN_ROLES = [
  'owner',
  'admin',
  'support',
  'content_editor',
  'content_reviewer',
  'moderator',
  'analyst',
  'developer',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function hasAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ADMIN_ROLES as readonly string[]).includes(value);
}
