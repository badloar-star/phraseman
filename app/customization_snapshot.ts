// зачем: D108 — купленные ауры и кастомные аватары удалены. Снимок больше не
// несёт списков купленного/подаренного и выбранной ауры: их никто не рисует.
// Остались только текущий аватар и уровень (Avatar DNA удалён — Q5, 01.10;
// баланс жемчуга удалён вместе с валютой — PM-289, D70).
export interface CustomizationSnapshot {
  source: 'storage' | 'memory' | 'local';
  updatedAt: number;
  activeAvatar: string;
  level: number;
}

export function buildCustomizationSnapshot(
  values: ReadonlyMap<string, string | null>,
  updatedAt: number,
  level: number,
): CustomizationSnapshot {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return {
    source: 'storage',
    updatedAt,
    activeAvatar: values.get('user_avatar')?.trim() || String(Math.min(60, safeLevel)),
    level: safeLevel,
  };
}
