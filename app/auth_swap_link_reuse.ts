/**
 * Решение B3 (координатор 12.10, реестр п.73): при входе в существующий аккаунт свап может НЕ перечитывать привязку
 * вторым callable, если этот же вход только что получил её от сервера. Иначе — перечтение, как раньше.
 *
 * зачем: прогон Сверки 12.10 — `authoritative_link_read` 3,66 с перечитывал ту же привязку (тот же stableUid, source=callable),
 * которую `ensure_link remote` вернул 3,7 с назад, при том что слияние не вызывалось. Перечтение нужно только после слияния
 * (его callable мог истечь по времени, а сервер — продолжить) или когда ответ был не авторитетный.
 * Чистая функция: без сети и хранилища — условия фиксирует tests/auth_swap_link_reuse.test.ts.
 */
import type { StableAuthLinkEnsureResult } from './cloud_sync';

/** Факты ответа `ensure_link remote` этого входа (только при ok). */
export type RemoteLinkEvidence = Readonly<{
  stableUid: string;
  authUid: string | null;
  source: StableAuthLinkEnsureResult['source'];
  /** identityTraceClockMs() в момент ответа — для ageMs в логе. */
  atMs: number;
}>;

export type RemoteLinkReuseDecision =
  | Readonly<{ reuse: true; evidence: RemoteLinkEvidence }>
  | Readonly<{ reuse: false; reason: string }>;

export function decideRemoteLinkReuseForSwap(input: Readonly<{
  /** Вызывалось ли серверное слияние в этом свапе (preserveLocalProgress). */
  mergeCalled: boolean;
  evidence: RemoteLinkEvidence | null;
  remoteStableId: string;
  currentAuthUid: string | null;
}>): RemoteLinkReuseDecision {
  if (input.mergeCalled) return { reuse: false, reason: 'merge_called' };
  const evidence = input.evidence;
  if (!evidence) return { reuse: false, reason: 'no_remote_evidence' };
  if (evidence.source !== 'callable') return { reuse: false, reason: `source_${evidence.source}` };
  if (evidence.stableUid !== input.remoteStableId) return { reuse: false, reason: 'stable_mismatch' };
  if (!evidence.authUid || !input.currentAuthUid) return { reuse: false, reason: 'auth_uid_missing' };
  if (evidence.authUid !== input.currentAuthUid) return { reuse: false, reason: 'auth_uid_mismatch' };
  return { reuse: true, evidence };
}
