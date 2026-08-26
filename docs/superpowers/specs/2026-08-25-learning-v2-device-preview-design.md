# Learning V2 Device Preview — design

**Owner decision:** 2026-08-25. Every authored Learning V2 session must be personally playable on the owner's physical phone before approval.

## Outcome

The DEV build exposes a dedicated `Learning V2 · проверка сессий` entry in DEV Hub. It lists the immutable locked prefix plus the single current authoring session from the English authoring registry. Forbidden future sessions remain visible only as a blocked count and cannot be opened.

Opening a row launches the real `LearningV2DirectSessionPlayerV1` with the actual authoring source projected through the real shard and learner-package builders. The preview is not a showcase fixture and is not a static HTML mock.

## Safety boundary

- DEV/internal builds only; store builds redirect away.
- The current authoring registry is the allowlist. Today only session 1 is open.
- Preview does not spend energy, write course progress/stars, append completion spools, capture mistakes, write cards, or emit learner telemetry.
- Missing unpublished audio is shown honestly as unavailable and remains a release blocker; no fake audio reference is created.
- Voice recording remains local so the owner can test the actual microphone interaction.
- The preview uses the existing theme, stable safe area, 44px minimum touch targets, semantic labels and reduced-motion behavior.

## Acceptance

1. Owner can open DEV Hub on a physical phone and reach the session review list.
2. Session 1 opens from its current English DRAFT source and renders all actual intro/word/practice interactions.
3. Sessions 2–56 cannot be opened while the registry forbids them.
4. Completing or deliberately failing tasks in preview leaves learner progress, stars, mistakes and saved cards unchanged.
5. The same route automatically exposes each later session when the registry advances, without a new preview implementation.

