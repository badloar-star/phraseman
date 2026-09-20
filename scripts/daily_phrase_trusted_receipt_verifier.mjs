/**
 * Trust root for Daily Phrase reviewer receipts. It is intentionally closed
 * until the owner wires a signature-backed, orchestrator-owned verifier here.
 * Candidate JSON cannot supply or replace this verifier.
 */
export function isTrustedDailyPhraseReceipt(_receipt) {
  return false;
}
