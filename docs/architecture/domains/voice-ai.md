# Voice and AI domain contract

## Owner

Voice/AI engineering owns session orchestration; Safety and Privacy approve consent, retention and model-boundary changes; Finance owns quota/cost controls.

## Source of truth

Client consent starts at [ai_dialog_consent.ts](../../../app/ai_dialog_consent.ts). Server privacy and behavior are guarded by [max_voice_privacy_contract.test.ts](../../../functions/src/max_voice_privacy_contract.test.ts) and [max_voice_client_server_contract.test.ts](../../../functions/src/max_voice_client_server_contract.test.ts).

## Authority

The client owns capture lifecycle and explicit consent UI; the server owns authenticated AI requests, quotas, safety policy and durable memory operations. A UI state cannot assert that audio was accepted, transcribed or retained.

## Invariants

No voice/AI session starts without the applicable consent gate. Quotas and entitlements are checked consistently, raw capture is ephemeral unless an explicit retained artifact is authorized, and one noisy speech score is not the sole access gate.

## Idempotency

Session finalization, quota accounting, memory writes and retries require stable request/session identities. A network retry must not consume quota twice or append duplicate memory.

## Offline behavior

Local/device speech may operate where explicitly supported. Cloud AI functionality must fail honestly when unavailable; queued requests cannot imply successful scoring, memory or entitlement consumption before confirmation.

## Security and privacy

Audio, transcripts, prompts and memory can contain child or sensitive personal data. Minimize collection, bind it to consent and purpose, enforce access controls and retention, redact logs, and keep development API credentials outside Codex workflows.

## Recovery

Bounded watchdogs return interrupted sessions to a replayable state. Reconciliation repairs usage from durable receipts; privacy deletion follows the account-deletion path. Provider failover and RTO/RPO are not yet approved.

## Owning tests

[max_voice_privacy_contract.test.ts](../../../functions/src/max_voice_privacy_contract.test.ts), [max_voice_safety.test.ts](../../../functions/src/max_voice_safety.test.ts), [max_voice_session_end.test.ts](../../../functions/src/max_voice_session_end.test.ts), and [audio_session_coordinator.test.ts](../../../tests/audio_session_coordinator.test.ts).
