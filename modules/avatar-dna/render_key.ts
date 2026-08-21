import * as Crypto from 'expo-crypto';
import { canonicalizeAvatarDNA } from './canonicalize';

export const avatarDNARenderKey = async (
  input: unknown,
  manifestVersion: number,
): Promise<string> => {
  if (!Number.isSafeInteger(manifestVersion) || manifestVersion < 1) {
    throw new TypeError('avatar_render_key_invalid');
  }
  const canonicalDNA = canonicalizeAvatarDNA(input);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify({ manifestVersion, canonicalDNA }),
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return `avatar-dna:v${manifestVersion}:${digest}`;
};
