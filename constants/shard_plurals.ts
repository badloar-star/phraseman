/**
 * Согласование «монет» с числом (RU / UK) для строк вида "+N …".
 * Ранее — «осколки знаний»; переименование чисто отображаемое (экономика §9).
 */

export function ruKnowledgeShardsAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'монета';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'монеты';
  return 'монет';
}

export function ukKnowledgeShardsAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'монета';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'монети';
  return 'монет';
}

export function ruShardKnowledgeSubtitle(amount: number): string {
  return `+${amount} ${ruKnowledgeShardsAfterNumber(amount)}`;
}

export function ukShardKnowledgeSubtitle(amount: number): string {
  return `+${amount} ${ukKnowledgeShardsAfterNumber(amount)}`;
}
