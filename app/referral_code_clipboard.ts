import {
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { DebugLogger } from './debug-logger';

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
  } catch (e) {
      // Best effort only. A stale operation must never report copied success.
      DebugLogger.error('referral_code_clipboard:currentClipboard', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return false;
}

export default function __RouteShim() { return null; }
