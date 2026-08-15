# Public profile authority rollout

This cross-contract change must be staged in this order. Each stage needs its own verification and owner-approved deployment action.

1. Functions

   Deploy `publicProfileProjectMine` first. Verify canonical identity resolution, deletion/hidden-account rejection, and server-owned progress and entitlement projection before any client depends on it.

2. App adoption

   Release the app version that routes public-profile publication through the callable and authoritatively rechecks `auth_links` before cloud mutation. Confirm supported clients no longer write `public_profiles` or create `users` documents directly.

3. Firestore Rules

   Deploy the Rules denial last: client `public_profiles` writes and `users` creation remain server-only. Do not deploy Rules before app adoption, because older clients still use the direct-write contracts.

The source Rules may land with the other source changes, but that does not authorize deploying them early. Audit repair is a separate owner-approved operation: create and review a preflight plan, then invoke explicit apply with the exact project, exact scope, plan artifact, and checkpoint directory.
