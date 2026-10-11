# Daily Phrase dev-server packs (ES/DE/IT)

Scope: prepare immutable local upload-ready packs and a dev-only, fail-closed
runtime path. No Firebase/Storage write, deploy, release, production activation,
or mutation of editorial `active` / `activationApproved` flags is allowed.

TDD plan:

1. RED: prove ES/DE/IT registrations are target/source scoped, dev-gated and
   reject path traversal; prove row adaptation rejects mixed target/locale data.
2. RED: prove the builder accepts only hash-bound editorial manifests, emits
   exactly six immutable payloads, and leaves upload/release/activation false.
3. GREEN: add the minimal registration, runtime adapter and builder.
4. Integrate Daily Phrase lookup so ES/DE/IT use only their remote target pool;
   a missing, corrupt or not-yet-uploaded pack returns `null`.
5. Verify focused tests, generated hashes/paths, TypeScript and existing target
   isolation tests. Keep FR and EN behavior unchanged.

