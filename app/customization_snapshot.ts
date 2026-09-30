import type { AvatarDNAStoredState } from '../modules/avatar-dna/storage';

// зачем: D108 — купленные ауры и кастомные аватары удалены. Снимок больше не
// несёт списков купленного/подаренного и выбранной ауры: их никто не рисует.
// Остались только текущий аватар, уровень, баланс и Avatar DNA.
export interface CustomizationSnapshot {
  source: 'storage' | 'memory' | 'local';
  updatedAt: number;
  activeAvatar: string;
  level: number;
  shards: number;
  avatarDNA?: AvatarDNAStoredState;
}

function readNonNegativeInt(raw: string | null | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function buildCustomizationSnapshot(
  values: ReadonlyMap<string, string | null>,
  updatedAt: number,
  level: number,
  avatarDNA?: AvatarDNAStoredState,
): CustomizationSnapshot {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return {
    source: 'storage',
    updatedAt,
    activeAvatar: values.get('user_avatar')?.trim() || String(Math.min(60, safeLevel)),
    level: safeLevel,
    shards: readNonNegativeInt(values.get('shards_balance')),
    avatarDNA,
  };
}
