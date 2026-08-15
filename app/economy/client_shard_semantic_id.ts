import * as Crypto from 'expo-crypto';

/**
 * Deterministic inside an owner-scoped ledger/cloud collection. The owner is
 * deliberately not embedded because the enclosing storage path is the scope.
 */
export async function semanticShardOperationId(kind: string, subjectId: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify([String(kind), String(subjectId)]),
  );
  return `semantic_${digest.slice(0, 56)}`;
}
