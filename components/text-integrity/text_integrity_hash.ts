import * as Crypto from 'expo-crypto';

export type TextIntegrityHasher = (saltedContent: string) => Promise<string>;

export function createFreshTextIntegritySalt(): string {
  return Crypto.randomUUID();
}

export async function sha256TextIntegrityContent(saltedContent: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, saltedContent);
}
