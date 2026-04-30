export type CurrencyCode = "USD" | "EUR" | "GBP";

export type FindingPriorityTier = "P1" | "P2" | "P3";

export function findingTypeWeight(type: string): number {
  if (type === "duplicate") return 1.15;
  if (type === "orphaned") return 1.08;
  if (type === "owner_gap") return 1.06;
  return 1;
}

export function findingPriorityScore(input: {
  estimatedMonthlySaving: number;
  confidence: number;
  type: string;
}): number {
  const saving = Number(input.estimatedMonthlySaving);
  const conf = Number(input.confidence);
  return saving * conf * findingTypeWeight(input.type);
}

export function findingPriorityTier(input: {
  estimatedMonthlySaving: number;
  confidence: number;
  type: string;
}): FindingPriorityTier {
  const score = findingPriorityScore(input);
  if (score >= 180 || input.estimatedMonthlySaving >= 400) return "P1";
  if (score >= 55 || input.estimatedMonthlySaving >= 120) return "P2";
  return "P3";
}
