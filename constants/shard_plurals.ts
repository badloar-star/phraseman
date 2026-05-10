/**
 * Согласование «осколков знаний» с числом (RU / UK) для строк вида "+N …".
 */

export function ruKnowledgeShardsAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'осколок знаний';
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'осколка знаний';
  return 'осколков знаний';
}

export function ukKnowledgeShardsAfterNumber(n: number): string {
  const k = Math.abs(Math.trunc(n));
  const n100 = k % 100;
  const n10 = k % 10;
  if (n10 === 1 && n100 !== 11) return 'осколок знань';
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'осколки знань';
  return 'осколків знань';
}

export function ruShardKnowledgeSubtitle(amount: number): string {
  return `+${amount} ${ruKnowledgeShardsAfterNumber(amount)}`;
}

export function ukShardKnowledgeSubtitle(amount: number): string {
  return `+${amount} ${ukKnowledgeShardsAfterNumber(amount)}`;
}
