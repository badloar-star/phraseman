import {
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';

export async function copyReferralCodeForAccount(input: Readonly<{
  accountToken: AccountGenerationToken;
  accountKey: string;
  code: string;
  readText: () => Promise<string>;
  writeText: (value: string) => Promise<void>;
}>): Promise<boolean> {
  const code = input.code.trim();
  const requestIsCurrent = () => accountScopeKey(input.accountToken) === input.accountKey
    && isCurrentAccountGeneration(input.accountToken);
  if (!code || !requestIsCurrent()) return false;
  await input.writeText(code);
  if (requestIsCurrent()) return true;

  // Clipboard APIs provide no atomic compare-and-swap: an external value
  // overwritten before a delayed native write completes cannot be restored safely.
  // Compensation may only clear the exact stale code it can still observe.
  try {
    const currentClipboard = await input.readText();
    if (currentClipboard !== code) return false;
    await input.writeText('');
    await input.readText();
  } catch {
    // Best effort only. A stale operation must never report copied success.
  }
  return false;
}

export default function __RouteShim() { return null; }
