# Feature intro completion plan

> **For agentic workers:** Execute this plan inline in the current checkout. Do not create a worktree or delegate a coding session: the owner did not request one.

**Goal:** Finish the owner-approved first-visit explanations as real app integrations, with one universal illustration palette that remains correct in every app theme, and provide an honest coverage boundary for screens that deliberately keep their existing UX.

**Architecture:** Each intro is registered by a stable one-time key and mounted at the real entry point of the feature. Static theme paths all resolve to byte-identical universal art; application colours and shell typography still come from the active theme. The review page uses the same modal components, while source contracts prove the actual app mounts them.

**Tech stack:** Expo / React Native / TypeScript, static `require()` image map, Node source contracts, React Native Web review build.

---

- [x] Replace the bad theme recolouring pipeline with one neutral forest-green, warm-paper and brass visual language; generate 13 masters and wire a static asset path for every supported theme.
- [x] Add resolution, binary-alpha and universal-palette contracts for the 117 bundled paths.
- [x] Wire the 13 owner-approved scenes into real feature entry points: Cards, Statistics, Phrase of the day, Videos, Friends, Arena, League, card swipe, three training modes, AI consent and Mistake practice.
- [x] Correct Mistake practice so its real setup sheet uses its own illustration rather than the generic practice art.
- [x] Add a source-level wiring contract that fails if a preview-only modal replaces a real app integration.
- [x] Rebuild the interactive review page from the actual intro components.
- [x] Record the explicit boundary for the audited keep/context scenarios so they are not silently turned into unwanted auto-modals.
- [ ] Run an Android bundle / native acceptance gate only after the shared heavy-process semaphore can be acquired; do not bypass the traffic-light rule.

## Acceptance criteria

1. Every approved intro is connected to a user-facing app route, not only the review page.
2. The first-visit state remains one-time and the developer replay tooling can replay it without changing production behaviour.
3. All bundled artwork is actually statically referenced, 256×256, has clean transparency and is visually identical across theme folders.
4. Audited existing instructions, paywalls, prices, access, consent-state semantics and keep scenarios remain intact.
5. The review page is rebuilt from the production components and targeted contracts pass.
