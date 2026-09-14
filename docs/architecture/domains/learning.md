# Learning domain contract

## Owner

Learning engineering owns runtime and projection; the curriculum owner approves normative content fingerprints; QA owns deterministic gates.

## Source of truth

The mandatory entry contract is [СТАРТ В2](../../v2/СТАРТ%20В2.md). Current English app content is the admitted factory release described by [factory_native/README.md](../../../modules/learning-v2/content/factory_native/README.md); the curriculum blueprint gate is the machine authority for its blueprint fingerprint. Current prose drift is preserved, not normalized, in [ADR-0001](../decisions/ADR-0001-learning-v2-authority-drift.md).

## Authority

Only admitted, fingerprinted local release artifacts may enter the English runtime. Historical shards, network/LKG fallback and documentation counters cannot override the canonical release. Spanish remains an independent target-language contour.

## Invariants

Prerequisites, session order, mode-native payloads, locale coverage, diagnostic feedback, content fingerprints and owner gates must remain intact. A failing required gate means `HOLD`; a document or mockup alone is not release evidence.

## Idempotency

Progress completion, reward binding and word unlock operations use stable operation identities and must be safe to replay. Rebuilding a manifest from unchanged admitted input must produce the same projection and fingerprint.

## Offline behavior

English catalog/session loading is local and fail closed. Missing or invalid admitted content must not fall back to a retired shard or network cache. Device speech fallback is separate from published-audio authority.

## Security and privacy

Learner progress and voice interactions are personal data. Keep authoring preview state separate from learner progress, do not expose QA metadata, and do not use project OpenAI credentials for local authoring or review.

## Recovery

Recover by restoring a previously admitted fingerprinted release and rebuilding its native manifest; never patch downstream projection to hide an upstream curriculum error. Current RTO/RPO are unapproved.

## Owning tests

[learning_v2_factory_native_projection_v1.test.ts](../../../tests/learning_v2_factory_native_projection_v1.test.ts), [learning_v2_release_loader.test.ts](../../../tests/learning_v2_release_loader.test.ts), and [learning_v2_activity_released_session_package_v1.test.ts](../../../tests/learning_v2_activity_released_session_package_v1.test.ts).
