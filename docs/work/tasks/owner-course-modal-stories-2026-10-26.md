# Owner corrections — course navigation, exam modal, stories

Owner instructions in the Codex handover chat on 2026-10-26 supersede the older exam-expanded-window and always-replay-avatar requirements.

- The legacy `/learning-v2/course` URL dismisses to the retained lessons tab and forwards result parameters. It no longer mounts a duplicate hub with a Back button and without the tab bar. The entry selects V2 even when the retained tab previously showed classic lessons.
- `SeasonExpandedCard` now only adapts exam actions/data to the existing approved `LearningV2SessionOutcomeSheet`. The old absolute gradient-card presentation is removed. Passed, cooldown and available states keep their existing actions; available exams retain facts and energy/Plus information.
- Avatar tap opens unseen stories. Once seen, tap opens the existing profile card. Holding for 2000 ms replays recent stories. Seen state remains in the existing account-scoped store.

Verification: story interaction suite (19 tests), season contracts (71 tests), navigation contract (9 tests), rendered modal/route checks (4 tests). TypeScript gate recorded in the chat work logs before committing. Full typecheck initially exceeded the default 4 GiB heap; rerun uses the release script's 6 GiB limit. The unrelated untracked community preview fixture needed `isOfficial: false` for its UGC packs; that single correction remains in the shared tree and the author's preview file is not included in this commit.

These corrections are subsequent to uploaded build 146, not retroactive changes to its binary. The Helium 42842 audio report is not marked resolved: the report identifies Android 11 and the `I am here.` reference item, but contains no playback diagnostics confirming a cause. Android build 146 submission still requires Play Console permission or manual AAB upload.
