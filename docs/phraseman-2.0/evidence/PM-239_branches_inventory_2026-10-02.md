# PM-239 — инвентаризация веток и worktree на 2026-10-02 (только чтение)

Источник: `git for-each-ref`, `git worktree list --porcelain`, `git status --porcelain`, `gh pr list --state all` (только чтение). HEAD = `f0b2153b4` (`feature/referral-roulette`).
Ничего не удалялось, не переключалось, не пушилось, веток не создавалось. Прежние документы: PM-239_branch_inventory.md (30.09), PM-239_integration_branch_triage.md (01.10).

## Сводка
- локальных веток: 291; remote-веток (refs/remotes): 54; worktree всего: 22 (с веткой: 14, detached: 8, locked: 5)
- веток с уникальными коммитами относительно HEAD (ahead > 0): 228; без уникальных коммитов: 116
- локальных веток без remote-пары: 273
- PR на GitHub (всего 34): открытых 6, merged 23, closed 5; веток с найденным PR: 39
- незакоммиченных путей в общем дереве: 236 (modified 216, deleted 0, untracked 19, staged-added 1)

## Открытые PR
- #34 `claude/new-session-dp9z13` → `master`: Онбординг: новый минимальный флоу целиком в master
- #33 `codex/full-performance-audio-audit-167` → `master`: fix: complete Phraseman 1.6.7 performance and stability audit
- #32 `codex/full-phraseman-updates` → `master`: Add product analytics and resilient AI explanations
- #15 `agent/english-level-test-20260721` → `master`: feat: launch audited English level test
- #14 `agent/english-level-test-full-audit` → `master`: feat(web): English Level Check with certificate and analytics
- #13 `content/editorial-voice-v1` → `master`: docs: add Phraseman editorial voice and research-led content engine

## Worktree (владелец = путь расположения; GitHub/git владельца не хранят)
| путь | ветка | HEAD | locked | как определён владелец |
|---|---|---|---|---|
| `C:/appsprojects/phraseman` | `feature/referral-roulette` | f0b2153b4 | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/angry-heisenberg-adace4` | `claude/angry-heisenberg-adace4` | d618226ba | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/busy-cerf-4c737c` | `claude/busy-cerf-4c737c` | 4e11134f9 | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/determined-napier-89a855` | `claude/determined-napier-89a855` | d618226ba | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/gallant-lalande-2de40e` | `claude/gallant-lalande-2de40e` | 123c0545f | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/heuristic-swartz-d9213a` | `claude/heuristic-swartz-d9213a` | d618226ba | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/nostalgic-grothendieck-b02fca` | `claude/nostalgic-grothendieck-b02fca` | d618226ba | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/recursing-goldberg-7fb296` | `claude/great-herschel-c555c4` | d618226ba | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/stoic-jepsen-878a17` | `claude/stoic-jepsen-878a17` | d618226ba | нет | ветка + путь |
| `C:/appsprojects/phraseman/.claude/worktrees/upbeat-payne-1f254e` | `claude/upbeat-payne-1f254e` | 6ba4f73c4 | нет | ветка + путь |
| `C:/appsprojects/phraseman/.worktrees/post-delete-fresh-identity` | `codex/post-delete-fresh-identity` | 36b1cc78b | нет | ветка + путь |
| `C:/appsprojects/phraseman-aura-native-lab` | `codex/aura-native-lab` | 4dd077509 | да | ветка + путь |
| `C:/appsprojects/phraseman-recovery-1.6.19` | `recovery/from-1.6.19` | 83ad0f338 | нет | ветка + путь |
| `C:/appsprojects/phraseman-spire-admin-release` | (detached) | 54b3b90e6 | нет | нет имени ветки: владелец по пути |
| `C:/Temp/phraseman-plus-release-check` | `release/plus-access-da6eea651` | da6eea651 | да | ветка + путь |
| `C:/Users/badlo/.codex/worktrees/3192/phraseman` | (detached) | 7c8e245a8 | да | нет имени ветки: владелец по пути |
| `C:/Users/badlo/.codex/worktrees/5218/phraseman` | (detached) | 27cbb713e | нет | нет имени ветки: владелец по пути |
| `C:/Users/badlo/.codex/worktrees/5891/phraseman` | (detached) | 64b0388a9 | да | нет имени ветки: владелец по пути |
| `C:/Users/badlo/.codex/worktrees/5db8/phraseman` | (detached) | d618226ba | нет | нет имени ветки: владелец по пути |
| `C:/Users/badlo/.codex/worktrees/6b89/phraseman` | (detached) | a99ba51a7 | нет | нет имени ветки: владелец по пути |
| `C:/Users/badlo/.codex/worktrees/934f/phraseman` | (detached) | 64b0388a9 | да | нет имени ветки: владелец по пути |
| `C:/Users/badlo/.codex/worktrees/release-1-6-22/phraseman` | (detached) | 6c02e4088 | нет | нет имени ветки: владелец по пути |

## Незакоммиченные изменения общего дерева по верхним каталогам (PM-239-A2)
- `app`: 105
- `docs`: 27
- `functions-content`: 23
- `tests`: 19
- `functions`: 17
- `modules`: 14
- `components`: 12
- `hooks`: 11
- `(root)`: 3
- `runtime-probes`: 3
- `.claude`: 1
- `scripts`: 1
Эти изменения принадлежат нескольким параллельным сессиям; групповой откат/очистка запрещены.

## Ветки (ahead = уникальные коммиты ветки относительно HEAD; behind = коммиты HEAD, которых нет в ветке)
| вид | ветка | SHA | ahead | behind | последний коммит | автор | PR | worktree | тема последнего коммита |
|---|---|---|---:|---:|---|---|---|---|---|
| local | `codex/release-current-final-20260715` | 94a485c85 | 334 | 4460 | 2026-07-15 | Claude | — | — | test: reconcile daily phrase AI contract |
| local | `prod-snapshot/all-development-integration-20260721` | 35002323b | 330 | 4460 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/all-development-integration` | 01551585a | 329 | 4460 | 2026-07-19 | Claude | — | — | feat(auth): redesign registration prompt as interactive bottom sheet |
| local | `prod-snapshot/youtube-final-integration-20260721` | 64829cc2b | 327 | 4460 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/youtube-final-integration` | e9ec1c4b9 | 326 | 4460 | 2026-07-13 | Claude | — | — | chore: refresh text integrity inventory |
| remote | `origin/codex/all-development-integration` | e9ec1c4b9 | 326 | 4460 | 2026-07-13 | Claude | — | — | chore: refresh text integrity inventory |
| local | `prod-snapshot/youtube-analytics-integration-result-20260721` | 67f273bb3 | 320 | 4460 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/youtube-analytics-integration-result` | 4634cbb00 | 319 | 4460 | 2026-07-13 | Claude | — | — | Revert "fix: reconcile approved workspace release contracts" |
| local | `prod-snapshot/youtube-release-1.5.56-20260721` | 9be2c6ee8 | 295 | 4447 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/release-youtube-analytics-1.5.56` | 5a0ea68e0 | 294 | 4447 | 2026-07-13 | Claude | — | — | fix: preserve soft upsell target safety |
| local | `prod-snapshot/release-1.5.56-20260721` | 588d06a2f | 267 | 4447 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `release/1.5.56` | 5888ae974 | 266 | 4447 | 2026-07-13 | Claude | — | — | docs: normalize soft upsell preview spec |
| local | `codex/contextual-soft-upsell-integration` | 136beb1b1 | 260 | 4447 | 2026-07-13 | Claude | — | — | feat: enable verified lesson soft upsells |
| local | `codex/soft-upsell-premium-integration` | a2082afb0 | 257 | 4460 | 2026-07-13 | Claude | — | — | fix: isolate analytics deduplication by upsell mode |
| local | `codex/weekly-review-v2-integration-20260713` | 9c322c8da | 237 | 4460 | 2026-07-14 | Claude | — | — | fix: simplify weekly practice review card |
| local | `codex/lessons-1-32-integration-result` | 0a488184b | 236 | 4457 | 2026-07-13 | Claude | — | — | merge: integrate lessons 1-32 remediation |
| remote | `origin/codex/weekly-review-v2-integration-20260713` | 1ed170421 | 234 | 4460 | 2026-07-13 | Claude | — | — | fix: require complete weekly review locale map |
| local | `codex/fix-friends-gift-release-status` | 68d2ff893 | 210 | 4460 | 2026-07-12 | Claude | — | — | docs: record friends gift release integration plan |
| local | `codex/orbit-admin-access-critical-20260718` | bd2a1cd17 | 170 | 4357 | 2026-07-18 | Claude | — | — | fix(admin): enforce fail-closed access boundaries |
| local | `codex/orbit-admin-role-migration-20260718` | 3b5eb5216 | 170 | 4357 | 2026-07-18 | Claude | — | — | fix(admin): migrate legacy role claims safely |
| local | `prod-snapshot/codex-5d3a-20260721` | 3e5b26a01 | 170 | 4357 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/orbit-unified-release-base-20260718-20260721` | bf233dfdd | 170 | 4357 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/orbit-unified-release-base-20260718` | fcae2fb8a | 169 | 4357 | 2026-07-18 | Claude | — | — | docs(v2): record Orbit integration receipt |
| local | `prod-snapshot/admin-language-factory-20260721` | 413cd2595 | 145 | 4578 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/admin-language-factory` | d973456ff | 144 | 4578 | 2026-07-13 | Claude | — | — | docs(admin): record native production release |
| remote | `origin/codex/admin-language-factory` | d973456ff | 144 | 4578 | 2026-07-13 | Claude | — | — | docs(admin): record native production release |
| local | `codex/admin-support-russian-20260713` | 74b199b66 | 143 | 4578 | 2026-07-13 | Claude | — | — | fix(admin): keep support workflow panel compact |
| remote | `origin/prod-snapshot/learning-v2-pilot-20260721` | a178cba1f | 108 | 4366 | 2026-07-26 | Claude | — | — | feat: add Learning V2 generator tab to admin |
| local | `prod-snapshot/learning-v2-pilot-20260721` | a178cba1f | 108 | 4366 | 2026-07-26 | Claude | — | — | feat: add Learning V2 generator tab to admin |
| local | `codex/learning-v2-pilot` | 23c71a117 | 88 | 4366 | 2026-07-16 | Claude | — | — | feat(v2): enforce canonical episode revision bodies |
| local | `codex/release-final-integration-20260715` | d5eea4982 | 85 | 4357 | 2026-07-15 | Claude | — | — | fix: refresh premium access after entitlement events |
| remote | `origin/codex/release-final-integration-20260715` | d5eea4982 | 85 | 4357 | 2026-07-15 | Claude | — | — | fix: refresh premium access after entitlement events |
| local | `codex/user-fixes-release-20260715` | cc0d38bc1 | 79 | 4361 | 2026-07-15 | Claude | — | — | test: reconcile daily phrase AI contract |
| local | `codex/release-integrated-build-20260715` | d74d02790 | 75 | 4361 | 2026-07-15 | Claude | — | — | merge: integrate monetization guardrails |
| local | `prod-snapshot/ai-recovery-release-20260715-20260721` | ab9073903 | 75 | 4361 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/ai-recovery-release-20260715` | bb27a6395 | 74 | 4361 | 2026-07-15 | Claude | — | — | fix(ai): recover production explanations and app check |
| local | `codex/monetization-guardrails-release-20260715` | e668003b1 | 74 | 4361 | 2026-07-15 | Claude | — | — | feat: tighten legacy premium conversion guardrails |
| remote | `origin/codex/release-integrated-build-20260715` | e794a80a2 | 73 | 4361 | 2026-07-15 | Claude | — | — | fix(ui): let merged release text reflow safely |
| local | `prod-snapshot/agent-manager-digest-integration-20260721` | 5d48c5252 | 49 | 4331 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/agent-manager-digest-integration` | db4ea32aa | 48 | 4331 | 2026-07-17 | Claude | — | — | fix(agent-manager): make roster initialization recoverable |
| local | `codex/daily-digest-agent-manager` | e7bb8e9f6 | 44 | 4331 | 2026-07-17 | Claude | — | — | feat(agent-manager): recommend review for critical digests |
| local | `prod-snapshot/agent-manager-foundation-20260721` | f48cc6308 | 44 | 4331 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/agent-manager-foundation` | 470f8acfa | 43 | 4331 | 2026-07-16 | Claude | — | — | fix(agent-manager): query workers by scope before limit |
| local | `prod-snapshot/admin-v2-paywall-graphs-20260713-20260721` | cc41841b1 | 43 | 4380 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/admin-v2-paywall-graphs-20260713` | ef3f23716 | 42 | 4380 | 2026-07-14 | Claude | — | — | fix(admin): preserve all-source trend diagnostics |
| remote | `origin/codex/compass-future-learning-v2` | ece01dfe6 | 42 | 3066 | 2026-08-13 | badloar-star | — | — | chore(compass): park future-only work behind release lock |
| remote | `origin/codex/full-performance-audio-audit-167` | c331db7b7 | 40 | 3066 | 2026-08-12 | badloar-star | #33 open | — | fix release gates and support approval flow |
| local | `codex/xp-integrity-audit` | 86c0b2add | 32 | 4489 | 2026-07-11 | Claude | — | — | fix: classify missing XP evidence as indeterminate |
| remote | `origin/agent/english-level-test-20260721` | 6dc494dcc | 30 | 4573 | 2026-07-21 | badloar-star | #15 open | — | ci: export English test transport history |
| local | `prod-snapshot/admin-v2-youtube-analytics-20260721` | d1073fb43 | 27 | 4417 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/admin-v2-youtube-analytics` | 1f40faf9d | 26 | 4417 | 2026-07-13 | Claude | — | — | fix: label youtube exit clicks precisely |
| remote | `origin/audit/daily-challenges-2026-08-06` | 3feffe033 | 25 | 3210 | 2026-08-06 | badloar-star | — | — | ci(audit): run bounded full daily challenge validation |
| local | `codex/post-delete-fresh-identity` | 36b1cc78b | 24 | 2644 | 2026-08-21 | Claude | — | `./.worktrees/post-delete-fresh-identity` | fix(auth): harden fresh post-delete identity |
| local | `codex/admin-digest-app-codex` | ef7df2ead | 23 | 4567 | 2026-07-12 | Claude | — | — | fix: complete admin digest and product manager insights |
| local | `prod-snapshot/admin-integrated-20260716-20260721` | eab5ac004 | 22 | 4351 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 (functions |
| local | `prod-snapshot/social-learning-cards-20260721` | 3060c6d2c | 21 | 4492 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `recovery/from-1.6.19` | 83ad0f338 | 21 | 1281 | 2026-09-26 | Claude | — | `.-recovery-1.6.19` | docs: define Phraseman 2.0 identity foundation |
| local | `codex/social-learning-cards` | 766b870f2 | 20 | 4492 | 2026-07-12 | Claude | — | — | feat: make install slides unmistakably mobile |
| local | `prod-snapshot/premium-landing-20260716-20260721` | 29c32ab13 | 20 | 4351 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 (.env secr |
| local | `codex/premium-landing-20260716` | 01f1293ca | 19 | 4351 | 2026-07-16 | Claude | — | — | Revert "feat: add click spark feedback to landing CTAs" |
| remote | `origin/claude/new-session-dp9z13` | 5b69ebd0d | 18 | 3066 | 2026-08-16 | Claude | #34 open | — | test(dev-hub): follow onboarding section promotion in ordered expectat |
| remote | `origin/content/editorial-voice-v1` | 629012f13 | 18 | 4573 | 2026-07-20 | badloar-star | #13 open | — | docs: link visual stock search library |
| local | `codex/contextual-soft-upsell-foundation` | 7f7020632 | 17 | 4458 | 2026-07-12 | Claude | — | — | fix: share soft upsell cooldown across targets |
| remote | `origin/audit/screenshot-fixes-2026-08-06` | a90812f6f | 17 | 3210 | 2026-08-06 | badloar-star | #17 closed | — | ci(audit): trigger registered screenshot validator |
| remote | `origin/agent/english-level-test-full-audit` | c71da6581 | 16 | 4573 | 2026-07-21 | badloar-star | #14 open | — | chore: diagnose English test payload |
| remote | `origin/audit/remove-french-runtime-fixes-2026-08-05` | 57216c95f | 16 | 3210 | 2026-08-05 | badloar-star | — | — | ci(audit): export text source snapshot |
| local | `codex/lessons-1-32-linguistic-remediation` | 3ddb79329 | 15 | 4467 | 2026-07-13 | Claude | — | — | fix: finalize lesson audio remediation |
| local | `codex/borderless-premium-surfaces` | e2652c735 | 14 | 4540 | 2026-07-11 | Claude | — | — | refactor: complete borderless production surfaces |
| local | `prod-snapshot/mobile-final-20260716-20260721` | 89aa0b17a | 13 | 4351 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/content-factory-canary-20260713-20260721` | 6c48a2ccc | 11 | 4427 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/content-factory-canary-20260713` | 1426d4342 | 10 | 4427 | 2026-07-14 | Claude | — | — | fix(content-factory): harden intro dependency approval |
| local | `codex/agent-office-integration` | a45c18ad4 | 9 | 4331 | 2026-07-16 | Claude | — | — | fix(admin): restore content studio module graph |
| local | `codex/english-test-adaptive-redesign` | 4b670ccf0 | 9 | 4253 | 2026-07-22 | Claude | — | — | fix(english-test): harden adaptive assessment release |
| local | `codex/soft-upsell-premium-funnel` | f68dce36a | 9 | 4416 | 2026-07-13 | Claude | — | — | docs: mark premium soft upsell implementation complete |
| remote | `origin/chore/remove-second-language-daily-challenge-2026-08-07` | 0f6287e49 | 8 | 3196 | 2026-08-07 | github-actions[bot] | #30 merged | — | chore: remove second-language Daily Challenge runtime |
| remote | `origin/fix/personal-plan-next-task-errors-2026-08-07` | 21900dbf9 | 8 | 3205 | 2026-08-07 | badloar-star | #21 merged | — | fix: keep fallback material counts within safe integer range |
| local | `prod-snapshot/agent-office-orchestrator-20260721` | b8a29afc7 | 8 | 4331 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/agent-office-orchestrator` | 622121863 | 7 | 4331 | 2026-07-16 | Claude | — | — | fix(agent-office): validate approval TTL from issuer clock |
| remote | `origin/fix/pearl-pack-purchase-reconcile-2026-08-07` | 31118bebf | 7 | 3204 | 2026-08-07 | badloar-star | #22 merged | — | test: cover queued wallet balance refresh in paywall |
| local | `prod-snapshot/lesson-audit-harness-20260721` | e986cb154 | 7 | 4467 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| remote | `origin/fix/daily-reroll-durability-2026-08-07` | 584a9a00d | 6 | 3198 | 2026-08-07 | github-actions[bot] | #28 merged | — | fix: make Daily Challenge rerolls durable |
| remote | `origin/fix/personal-plan-transition-integrity-2026-08-07` | 18cc9c07c | 6 | 3198 | 2026-08-07 | github-actions[bot] | #29 merged | — | style: align Personal Plan transition block |
| local | `claude/sad-cannon-876ae9` | 77a713e42 | 5 | 4471 | 2026-09-22 | Claude | — | — | fix: read EMAIL_UNSUBSCRIBE_SECRET from Secret Manager too |
| local | `claude/upbeat-payne-1f254e` | 6ba4f73c4 | 5 | 4471 | 2026-09-22 | Claude | — | `./.claude/worktrees/upbeat-payne-1f254e` | fix: guarantee account deletion reaches the server, drop all alerts |
| local | `codex/agent-office-telegram-publisher` | ae2476402 | 5 | 4335 | 2026-07-16 | Claude | — | — | fix(agent-office): deny Telegram publication receipts |
| local | `prod-snapshot/admin-nav-restore-20260714-20260721` | 620b94d6e | 5 | 4573 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/admin-stretch-phone-deploy-20260714-20260721` | 9d95fd27b | 5 | 4573 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `claude/busy-cerf-4c737c` | 4e11134f9 | 4 | 4471 | 2026-09-22 | Claude | — | `./.claude/worktrees/busy-cerf-4c737c` | fix: убрать упоминание удаления аккаунта из текстов оплаты |
| local | `codex/auth-runtime-integration` | 3ec80902a | 4 | 4574 | 2026-07-10 | Claude | — | — | fix: remove unrelated function export |
| local | `codex/league-club-hub` | 32de93b09 | 4 | 4427 | 2026-07-13 | Claude | — | — | feat: compose league club hub screen |
| local | `codex/release-app-current-20260714` | 854663005 | 4 | 4369 | 2026-07-14 | Claude | — | — | fix(release): restore type-safe build inputs |
| local | `codex/restore-admin-v2-full-shell-20260714` | 921c8ca2c | 4 | 4573 | 2026-07-14 | Claude | — | — | fix: stack overview funnel on phones |
| local | `gh-pages` | ec1092fca | 4 | 5903 | 2026-04-19 | Claude | — | — | fix: pass duel roomId as Play Store referrer for deferred deep linking |
| remote | `origin/agent/english-test-live-deploy` | 499f3e985 | 4 | 4562 | 2026-07-21 | badloar-star | — | — | build: replace English test payload part 01 |
| remote | `origin/gh-pages` | ec1092fca | 4 | 5903 | 2026-04-19 | Claude | — | — | fix: pass duel roomId as Play Store referrer for deferred deep linking |
| local | `prod-snapshot/admin-stretch-deploy-20260714-20260721` | 20567994c | 4 | 4573 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/borderless-baseline-20260721` | ee8fdebb1 | 4 | 4540 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `codex/coin-safety-20260722` | 31d0fb217 | 3 | 4247 | 2026-07-22 | Claude | — | — | fix: close final coin economy races |
| remote | `origin/chore/remove-audit-artifacts-2026-08-07` | 8e65d6b7b | 3 | 3206 | 2026-08-07 | badloar-star | #19 merged | — | chore: remove accidental repository probe file |
| remote | `origin/chore/remove-french-daily-navigation-2026-08-07` | 33eed473c | 3 | 3201 | 2026-08-07 | badloar-star | #25 merged | — | chore: remove remaining language-specific navigation copy |
| remote | `origin/fix/daily-screen-central-navigation-2026-08-07` | 07065f80f | 3 | 3200 | 2026-08-07 | github-actions[bot] | #26 merged | — | fix: centralize Daily Challenges screen navigation |
| local | `prod-snapshot/agent-office-issuer-retry-20260721` | 3b4e6f920 | 3 | 4335 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/auth-runtime-reliability-20260721` | e640d7bec | 3 | 4578 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/explain-phrase-recovery-20260715-20260721` | 3f2594e26 | 3 | 4353 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/phraseman-motion-ad-film1-20260721` | d4b90fad4 | 3 | 4343 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/referral-vip-20260721` | 3e49d4bdd | 3 | 5695 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/speaking-mode-20260721` | 359b7b31d | 3 | 5681 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `backup/current-tree-before-recovery` | 1dcfdda19 | 2 | 5714 | 2026-06-07 | Claude | — | — | On master: SAFETY: working tree before hour-ago recovery |
| local | `backup/hour-ago-stash-recovery` | 0139cd0b2 | 2 | 5714 | 2026-06-07 | Claude | — | — | WIP on master: 4f10e102 Block incomplete AI review coverage |
| local | `claude/admiring-knuth-36984d` | 73f0ae9f3 | 2 | 4471 | 2026-08-03 | Claude | — | — | fix: stamp home screen hydration cache with account generation |
| local | `claude/eager-proskuriakova-03d900` | 28e1dd5c1 | 2 | 4471 | 2026-08-24 | Claude | — | — | fix: настоящий монохромный слой иконки Android вместо копии foreground |
| local | `claude/fervent-spence-e2a537` | ece62c73f | 2 | 4471 | 2026-09-21 | Claude | — | — | docs: task packet — вырезать мёртвую покупку тем за жемчуг |
| local | `claude/gallant-lalande-2de40e` | 123c0545f | 2 | 4471 | 2026-09-22 | Claude | — | `./.claude/worktrees/gallant-lalande-2de40e` | fix(идентичность): выдача friend-кода присваивала чужой профиль без вл |
| local | `claude/gracious-euler-7077af` | 9e135cb49 | 2 | 4471 | 2026-09-03 | Claude | — | — | fix: вернуть синхронизацию прогресса — список правил упирался в лимит  |
| local | `claude/nice-almeida-93b29b` | a5d789275 | 2 | 4471 | 2026-09-03 | Claude | — | — | fix: close top-level premium/premiumExpiry write hole in firestore.rul |
| local | `claude/silly-tereshkova-1dbfd8` | 581554723 | 2 | 4471 | 2026-08-24 | Claude | — | — | fix: restore owner-decided TURBO_REGEN_FACTOR (2/3) for turbo_regen bo |
| local | `claude/upbeat-snyder-64aebe` | 4a9d6b1d0 | 2 | 4471 | 2026-09-01 | Claude | — | — | fix: вынести карточки из документа users — прогресс перестал сохранять |
| local | `codex/agent-office-approval-issuance` | acf6c2932 | 2 | 4335 | 2026-07-16 | Claude | — | — | feat(functions): issue bounded agent approvals |
| local | `codex/agent-office-approval-issuance-retry` | aed546ce6 | 2 | 4335 | 2026-07-16 | Claude | — | — | feat(agent-office): issue bound Telegram approvals safely |
| local | `codex/auth-runtime-reliability` | 13e545184 | 2 | 4578 | 2026-07-10 | Claude | — | — | fix: harden auth restore and account transitions |
| local | `codex/english-test-russian-prompts` | 045bca913 | 2 | 4248 | 2026-07-22 | Claude | — | — | test(english-test): normalize generated line endings |
| local | `codex/explain-phrase-recovery-20260715` | 1d6785d5e | 2 | 4353 | 2026-07-15 | Claude | — | — | fix: recover false phrase language rejections |
| local | `codex/phraseman-motion-ad-film1` | 471a721ee | 2 | 4343 | 2026-07-17 | Claude | — | — | feat: author Film 1 motion graphic |
| local | `feat/referral-vip` | 03637a395 | 2 | 5695 | 2026-06-09 | Claude | #3 merged | — | feat(referral): add "My Referrals" modal with per-status list + header |
| local | `feat/speaking-mode` | 9cae59b81 | 2 | 5681 | 2026-06-08 | Claude | — | — | revert: restore origin/master lesson_data_25_32 without wordsEn bloat |
| local | `feat/weekly-ai-review` | 41018923f | 2 | 5623 | 2026-06-10 | Claude | — | — | fix(weekly-review): enforce premium server-side and trim free payload |
| remote | `origin/codex/tournament-pairs-retry` | 796db76ca | 2 | 3211 | 2026-08-08 | badloar-star | — | — | fix(tournaments): make pair scoring durable |
| remote | `origin/fix/daily-challenge-navigation-2026-08-07` | e6b5f7710 | 2 | 3203 | 2026-08-07 | badloar-star | #23 merged | — | test: guard executable daily challenge routes |
| remote | `origin/fix/lesson-prime-fail-open-2026-08-07` | af0d2b8cb | 2 | 3202 | 2026-08-07 | badloar-star | #24 merged | — | test: guard fail-open lesson priming |
| remote | `origin/fix/trainer-srs-queue-separation-2026-08-07` | f035d31fe | 2 | 3199 | 2026-08-07 | github-actions[bot] | #27 merged | — | fix: separate trainer and SRS daily-task accounting |
| local | `prod-snapshot/admin-nav-release-43ba949e4-20260721` | ea7f07f09 | 2 | 4573 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/explain-recovery-run-20260721` | 565eed6cb | 2 | 4353 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `claude/amazing-germain-5181ba` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/angry-heisenberg-adace4` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | `./.claude/worktrees/angry-heisenberg-adace4` | feat: pulse daily phrase once per day |
| local | `claude/beautiful-jennings-5bd5fb` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/bold-tereshkova-ad498d` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/charming-vaughan-555a20` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/clever-bell-4420e0` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/compassionate-goldstine-d1d2cf` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/confident-herschel-803a11` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/determined-napier-89a855` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | `./.claude/worktrees/determined-napier-89a855` | feat: pulse daily phrase once per day |
| local | `claude/dreamy-bhabha-9ebaaa` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/dreamy-golick-b48896` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/elastic-stonebraker-78cd6a` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/elegant-bhabha-cacf17` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/friendly-merkle-1480dc` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/friendly-sammet-761f84` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/frosty-bun-3c76c2` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/frosty-matsumoto-b758a2` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/gallant-raman-7c7642` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/great-herschel-c555c4` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | `./.claude/worktrees/recursing-goldberg-7fb296` | feat: pulse daily phrase once per day |
| local | `claude/heuristic-kilby-847e88` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/heuristic-swartz-d9213a` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | `./.claude/worktrees/heuristic-swartz-d9213a` | feat: pulse daily phrase once per day |
| local | `claude/hopeful-chatelet-1433b2` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/hopeful-taussig-04e986` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/hungry-kilby-9bd1cb` | 234079c8e | 1 | 4504 | 2026-07-25 | Claude | — | — | fix: soft c before silent e in ruleBasedIPA (face → feɪs, not feɪk) |
| local | `claude/jolly-shirley-892ac6` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/keen-tharp-c8c49c` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/magical-mclaren-3c95d8` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/modest-wilson-c04e51` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/musing-dubinsky-159aca` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/musing-hofstadter-d1a238` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/nervous-jang-6055f4` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/nice-mendel-7d8593` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/nostalgic-grothendieck-b02fca` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | `./.claude/worktrees/nostalgic-grothendieck-b02fca` | feat: pulse daily phrase once per day |
| local | `claude/optimistic-meninsky-8ab8df` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/quirky-robinson-32b1f4` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/recursing-goldberg-7fb296` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/relaxed-chebyshev-d8e55c` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/relaxed-sammet-7e892e` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/reverent-bell-be68fe` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/reverent-franklin-1542bd` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/serene-napier-656b6b` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/sharp-edison-e1de09` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/sharp-shirley-3a9d17` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/silly-merkle-99a9b4` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/stoic-jepsen-878a17` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | `./.claude/worktrees/stoic-jepsen-878a17` | feat: pulse daily phrase once per day |
| local | `claude/unruffled-shtern-b9042d` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/vibrant-roentgen-0eb655` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/wizardly-dubinsky-1cd25d` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/wonderful-jang-654e1b` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/wonderful-leavitt-c8e2cd` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/youthful-hertz-7833ab` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/zen-dubinsky-1bcbb3` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `claude/zen-wozniak-e5fc65` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| local | `codex/admin2-integration` | 43cfc5e79 | 1 | 4474 | 2026-07-12 | Claude | — | — | feat(admin): make Admin 2 the primary control plane |
| local | `codex/agent-office-admin-center` | d3a5b2176 | 1 | 4334 | 2026-07-16 | Claude | — | — | feat(admin): add Agent Office decision center |
| local | `codex/analytics-admin-foundation-20260713` | f31b2b60f | 1 | 4578 | 2026-07-13 | Claude | #10 merged | — | feat: add analytics admin v2 foundations |
| local | `codex/analytics-admin-renderers-20260713` | e4d60753e | 1 | 4577 | 2026-07-14 | Claude | #11 merged | — | feat: add read-only analytics renderers |
| local | `codex/analytics-foundations-20260713` | bb5ec052d | 1 | 4582 | 2026-07-13 | Claude | #6 merged | — | feat: add analytics calculation foundations |
| local | `codex/analytics-monthly-pack-20260713` | 2eeee7b40 | 1 | 4579 | 2026-07-13 | Claude | #9 merged | — | feat: add monthly analytics decision pack |
| local | `codex/analytics-product-20260713` | 7f0fc0cfa | 1 | 4581 | 2026-07-13 | Claude | #7 merged | — | feat: add governed product analytics callable |
| local | `codex/analytics-server-admin-production-20260713` | 1b0e5f5e5 | 1 | 4583 | 2026-07-13 | Claude | #4 closed | — | feat: ship governed analytics decision pack |
| local | `codex/analytics-subscriptions-20260713` | 1cd3d127a | 1 | 4580 | 2026-07-13 | Claude | #8 merged | — | feat: add governed subscription analytics |
| local | `codex/arena-question-pool-critical-20260717` | 73bebf22f | 1 | 4319 | 2026-07-17 | Claude | — | — | fix: harden arena question pool publishing |
| local | `codex/arena-question-replacement` | 86fbd8f65 | 1 | 4319 | 2026-07-17 | Claude | — | — | feat: add arena question replacement stage |
| local | `codex/functions-build-gate` | 3b4dbaeed | 1 | 4335 | 2026-07-16 | Claude | — | — | fix(functions): restore coherent content studio build inputs |
| local | `codex/release-gates-hygiene-20260713` | ac4f671c3 | 1 | 4583 | 2026-07-13 | Claude | #5 merged | — | fix: unblock production quality gates |
| local | `codex/remove-constellations` | 05c350976 | 1 | 4474 | 2026-07-12 | Claude | — | — | refactor: remove constellations game |
| local | `codex/stats-redesign-reliability` | 85a55dbdb | 1 | 4504 | 2026-07-17 | Claude | — | — | feat: redesign stats and harden weekly review |
| local | `master` | d618226ba | 1 | 4471 | 2026-08-08 | Claude | — | — | feat: pulse daily phrase once per day |
| remote | `origin/agent/diagnose-vitalii-account-20260807` | 853429f34 | 1 | 4464 | 2026-08-07 | badloar-star | — | — | ci: add one-time sanitized Vitalii account diagnostic |
| remote | `origin/agent/english-level-test-production` | e1ee7553f | 1 | 4555 | 2026-07-21 | badloar-star | #16 closed | — | chore(web): stage English test payload part 000 |
| remote | `origin/audit/lesson-daily-task-delivery-2026-08-07` | fc4e2d883 | 1 | 3196 | 2026-08-07 | badloar-star | — | — | audit: inventory lesson Daily Challenge delivery |
| remote | `origin/audit/pearl-pack-purchase-2026-08-06` | cfd279cee | 1 | 3210 | 2026-08-06 | badloar-star | #18 closed | — | fix: reconcile pearl balance before card-pack purchases |
| remote | `origin/audit/polyglot-day-inventory-2026-08-07` | 01db7f2c7 | 1 | 3196 | 2026-08-07 | badloar-star | — | — | audit: inventory polyglot-day remnants |
| remote | `origin/codex/analytics-monthly-pack-20260713` | 2eeee7b40 | 1 | 4579 | 2026-07-13 | Claude | #9 merged | — | feat: add monthly analytics decision pack |
| remote | `origin/codex/analytics-server-admin-production-20260713` | 1b0e5f5e5 | 1 | 4583 | 2026-07-13 | Claude | #4 closed | — | feat: ship governed analytics decision pack |
| remote | `origin/codex/full-phraseman-updates` | 70dfbb58e | 1 | 4458 | 2026-08-09 | badloar-star | #32 open | — | Add product analytics and resilient AI explanations |
| remote | `origin/codex/release-gates-hygiene-20260713` | ac4f671c3 | 1 | 4583 | 2026-07-13 | Claude | #5 merged | — | fix: unblock production quality gates |
| remote | `origin/codex/screenshot-findings-2026-08-08` | 767a95a29 | 1 | 3189 | 2026-08-08 | badloar-star | — | — | fix: scope durable lesson delivery to active tasks |
| remote | `origin/fix/daily-task-recall-capacity` | 7628b2971 | 1 | 4460 | 2026-08-07 | badloar-star | #20 merged | — | fix: filter impossible recall daily tasks |
| remote | `origin/fix/lesson-daily-task-delivery-2026-08-07` | 767a95a29 | 1 | 3189 | 2026-08-08 | badloar-star | #31 merged | — | fix: scope durable lesson delivery to active tasks |
| local | `prod-snapshot/account-delete-deploy-20260715-20260721` | 771da819c | 1 | 4361 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/admin-v2-canonical-analytics-20260717b-20260721` | 861143c4a | 1 | 4321 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/ai-dialogue-phase0-20260721` | 2ffe246cc | 1 | 5688 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/analytics-production-deploy-20260714-20260721` | 5d7b68294 | 1 | 4573 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/analytics-release-20260713-20260721` | e3854ca0b | 1 | 4583 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/borderless-merge-master-20260721` | 46e011da6 | 1 | 4504 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/codex-1f20-20260721` | 97be7f1d8 | 1 | 4310 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/codex-444b-20260721` | e831e856b | 1 | 4310 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/codex-5f15-20260721` | 02b32c50f | 1 | 4310 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/codex-a51e-20260721` | b8ce9596c | 1 | 4310 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/codex-f3f7-stats-redesign-20260721` | a06b71a5f | 1 | 4348 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/codex-fc6b-20260721` | 7ddd3015c | 1 | 4310 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/lingman-montazher-20260721` | c576f900a | 1 | 5710 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `prod-snapshot/weekly-review-v2-release-20260713-20260721` | f6d8bfda3 | 1 | 4397 | 2026-07-21 | Claude | — | — | snapshot: preserve uncommitted prod-source state 2026-07-21 |
| local | `release/referral-invite-fix-2026-05-13` | 6c3cf8e09 | 1 | 5739 | 2026-05-13 | Claude | — | — | Fix referral invite links and rewards |
| local | `claude/admiring-bassi-0568bc` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/bold-goodall-38a663` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/clever-bassi-9f1acb` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/clever-shaw-8eb913` | 28f46e961 | 0 | 4504 | 2026-07-12 | Claude | — | — | fix league chest replay and home visuals |
| local | `claude/compassionate-borg-75653f` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/epic-margulis-81e706` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/fervent-swanson-984b5c` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/festive-golick-366819` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/gifted-fermi-9ab08a` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/great-carson-ebe9e5` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/heuristic-hypatia-6f19a5` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/infallible-curie-4deb3f` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/infallible-mccarthy-3b50c1` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/lucid-shannon-9604c3` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/modest-noether-f0fd12` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/nostalgic-driscoll-99a615` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/peaceful-ardinghelli-9b8b15` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/pensive-nash-f94863` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/quizzical-babbage-1d6afa` | 47187a218 | 0 | 3312 | 2026-08-03 | Claude | — | — | feat(season-pass): серверная выдача (жемчуг/Plus/владение) + покупка з |
| local | `claude/serene-lalande-dc0502` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/serene-snyder-641442` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/stoic-euler-afa284` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/unruffled-antonelli-4386a9` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/vigilant-wing-f13183` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/xenodochial-easley-40e914` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `claude/xenodochial-elion-aeef86` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `codex/account-delete-deploy-20260715` | f324651b7 | 0 | 4361 | 2026-07-15 | Claude | — | — | docs: close V2 handover audit findings |
| local | `codex/admin-analytics-current` | 58023df0f | 0 | 3711 | 2026-08-01 | Claude | — | — | checkpoint: preserve admin analytics work before unification |
| local | `codex/admin-v2-canonical-analytics-20260717` | 78b04de18 | 0 | 4343 | 2026-07-17 | Claude | — | — | docs: plan Film 1 motion ad production |
| local | `codex/admin-v2-canonical-analytics-20260717b` | e537dceda | 0 | 4321 | 2026-07-17 | Claude | — | — | merge: restore content factory and arena foundation |
| local | `codex/agent-office-admin-retry` | 7182487f4 | 0 | 4332 | 2026-07-16 | Claude | — | — | fix(admin): harden Agent Office decisions |
| local | `codex/agent-office-analytics` | ac98e8319 | 0 | 4334 | 2026-07-16 | Claude | — | — | feat(agent-office): add deterministic business signals |
| local | `codex/agent-office-ledger` | 8fd472b4b | 0 | 4345 | 2026-07-16 | Claude | — | — | test(firestore): add Agent Office emulator denial gate |
| local | `codex/agent-office-observation-review` | 94fd4d626 | 0 | 4341 | 2026-07-16 | Claude | — | — | feat(agent-office): add fail-closed observation runner |
| local | `codex/agent-office-observation-runner` | 1d624c280 | 0 | 4342 | 2026-07-16 | Claude | — | — | fix(agent-office): account for dropped observation evidence |
| local | `codex/agent-office-observation-runner-v2` | 8f54de134 | 0 | 4340 | 2026-07-16 | Claude | — | — | fix(agent-office): deny observation receipts to clients |
| local | `codex/agent-office-pilot-adapters` | 78a1044ba | 0 | 4338 | 2026-07-16 | Claude | — | — | fix(agent-office): validate source freshness and success |
| local | `codex/agent-office-provenance-remediation` | 78a1044ba | 0 | 4338 | 2026-07-16 | Claude | — | — | fix(agent-office): validate source freshness and success |
| local | `codex/agent-office-telegram-approvals` | e29aa155d | 0 | 4335 | 2026-07-16 | Claude | — | — | feat(agent-office): add disabled Telegram webhook transport |
| local | `codex/agent-office-triage-pilot` | 1d624c280 | 0 | 4342 | 2026-07-16 | Claude | — | — | fix(agent-office): account for dropped observation evidence |
| local | `codex/analytics-admin-readonly-activation-20260713` | 545022f2a | 0 | 4574 | 2026-07-14 | Claude | #12 merged | — | test: enforce analytics server permission boundary |
| local | `codex/arena-question-pool-20260717` | 9f2bacf09 | 0 | 4323 | 2026-07-17 | Claude | — | — | merge: restore content factory into integrated admin |
| local | `codex/arena-question-pool-complete` | 8f4771b0e | 0 | 4315 | 2026-07-17 | Claude | — | — | fix: validate arena question replacement edits |
| local | `codex/aura-native-lab` | 4dd077509 | 0 | 3796 | 2026-07-28 | Claude | — | `.-aura-native-lab` 🔒 | docs: define league progress artifact icons |
| local | `codex/checkpoint-tabbar-shrink-20260612_121820` | e7bffd15a | 0 | 5472 | 2026-06-12 | Claude | — | — | security: harden low-risk public surfaces |
| local | `codex/daily-phrase-premium` | 7acd7a489 | 0 | 3712 | 2026-08-01 | Claude | — | — | SAFETY: preserve daily-quest-d56c worktree before unified integration |
| local | `codex/daily-quest-icons-current` | 766a3f43d | 0 | 3709 | 2026-08-01 | Claude | — | — | fix(boons): remove retired arena icon references |
| local | `codex/evidence-analytics-production-20260713` | 02cd07800 | 0 | 4583 | 2026-07-05 | Claude | — | — | fix: кликабельный автор идеи в админке — открывает карточку юзера по u |
| local | `codex/gift-certificate-admin-visual-history` | 399beb6d9 | 0 | 3711 | 2026-08-01 | Claude | — | — | fix: repair gift certificate personalization flow |
| local | `codex/integration-20260801` | 948910e60 | 0 | 3709 | 2026-08-01 | Claude | — | — | fix: harden settings message campaigns |
| local | `codex/league-hub-redesign-20260719` | e30a9349d | 0 | 4280 | 2026-07-21 | Claude | — | — | feat: admin v2 coin center |
| local | `codex/learning-v2-rebuild` | 2654b6e40 | 0 | 3423 | 2026-08-02 | Claude | — | — | feat(admin): business growth stage panel in the live admin |
| local | `codex/level-up-annual-gift` | c343aa896 | 0 | 3783 | 2026-07-29 | Claude | — | — | docs: expire level-up premium gift after 24 hours |
| local | `codex/multilingual-language-level-tests` | 5ba5880ee | 0 | 3673 | 2026-08-01 | Claude | — | — | fix: bind descriptor anchors to item levels |
| local | `codex/orbit-unified-integration-20260718` | 28f46e961 | 0 | 4504 | 2026-07-12 | Claude | — | — | fix league chest replay and home visuals |
| local | `codex/pre-release-checkpoint-20260711` | 06fe090e4 | 0 | 4552 | 2026-07-11 | Claude | — | — | docs: plan borderless premium surface migration |
| local | `codex/referrals-admin-redesign` | 2371b690a | 0 | 3776 | 2026-07-29 | Claude | — | — | fix: auto-load referral admin dashboard |
| local | `codex/release-integrated-20260715` | dbd1a2226 | 0 | 4307 | 2026-07-18 | Claude | — | — | docs: plan German CapCut production |
| local | `codex/release-integration-baseline-20260711` | c02b8c432 | 0 | 4539 | 2026-07-11 | Claude | — | — | merge: integrate current release work |
| local | `codex/safety-20260801-aura-native-lab` | 13a0d2352 | 0 | 3795 | 2026-08-01 | Claude | — | — | SAFETY: preserve aura-native-lab worktree before unified integration |
| local | `codex/safety-20260801-codex-3192` | 1211ed916 | 0 | 3778 | 2026-08-01 | Claude | — | — | SAFETY: preserve codex-3192 worktree before unified integration |
| local | `codex/safety-20260801-codex-5891` | 3848e0a2c | 0 | 4048 | 2026-08-01 | Claude | — | — | SAFETY: preserve codex-5891 worktree before unified integration |
| local | `codex/safety-20260801-codex-934f` | c6c5ecb71 | 0 | 4048 | 2026-08-01 | Claude | — | — | SAFETY: preserve codex-934f worktree before unified integration |
| local | `codex/safety-20260801-daily-phrase-premium` | 5504fb320 | 0 | 3753 | 2026-08-01 | Claude | — | — | SAFETY: preserve daily-phrase-premium worktree before unified integrat |
| local | `codex/safety-20260801-daily-quest-d56c` | 2400e081d | 0 | 4470 | 2026-08-01 | Claude | — | — | SAFETY: preserve daily-quest-d56c worktree before unified integration |
| local | `codex/safety-20260801-gift-cert-release` | 0702b9e8c | 0 | 3769 | 2026-08-01 | Claude | — | — | SAFETY: preserve gift-cert-release worktree before unified integration |
| local | `codex/safety-20260801-gift-certificate-admin` | 2aedfe62f | 0 | 3761 | 2026-08-01 | Claude | — | — | SAFETY: preserve gift-certificate-admin worktree before unified integr |
| local | `codex/safety-20260801-level-up-annual-gift` | 13659ac9a | 0 | 3782 | 2026-08-01 | Claude | — | — | SAFETY: preserve level-up-annual-gift worktree before unified integrat |
| local | `codex/safety-20260801-main-worktree` | 95eec1717 | 0 | 3761 | 2026-08-01 | Claude | — | — | SAFETY: preserve main-worktree worktree before unified integration |
| local | `codex/safety-20260801-main-worktree-final` | 292e062ac | 0 | 3760 | 2026-08-01 | Claude | — | — | SAFETY: preserve final main-worktree state before unified switch |
| local | `codex/safety-20260801-main-worktree-late` | 4b61a9482 | 0 | 3760 | 2026-08-01 | Claude | — | — | SAFETY: preserve late main-worktree writes before unified switch |
| local | `codex/safety-20260801-onboarding-release` | dd1888527 | 0 | 3781 | 2026-08-01 | Claude | — | — | SAFETY: preserve onboarding-release worktree before unified integratio |
| local | `codex/safety-20260801-sage-porcelain` | f0a10186a | 0 | 3752 | 2026-08-01 | Claude | — | — | SAFETY: preserve sage-porcelain worktree before unified integration |
| local | `codex/sage-porcelain-light-theme` | f03176092 | 0 | 3704 | 2026-08-01 | Claude | — | — | chore: rename sage theme to jade |
| local | `codex/settings-message-slots-main` | 8f77c6c90 | 0 | 4471 | 2026-07-26 | Claude | — | — | fix: restore claimed permission helper and drop committed build output |
| local | `codex/settings-messages-release` | 7e86492e1 | 0 | 3703 | 2026-08-01 | Claude | — | — | fix: complete sage daily phrase chrome |
| local | `codex/stats-redesign-current` | bbc6984ab | 0 | 4348 | 2026-07-16 | Claude | — | — | docs: plan agent office orbit rollout |
| local | `codex/stats-screen-redesign-20260718` | 5d9a8e54c | 0 | 4300 | 2026-07-19 | Claude | — | — | feat(auth): redesign registration prompt as interactive bottom sheet |
| local | `codex/streak-revive-modal-redesign` | 1e47f6c11 | 0 | 4458 | 2026-07-12 | Claude | — | — | docs: plan contextual soft upsell foundation |
| local | `codex/tournament-current` | f43bd7dba | 0 | 3708 | 2026-08-01 | Claude | — | — | fix(tournament): unblock deadline transitions |
| local | `codex/tournament-fill-gap-diversity` | 593daf5ac | 0 | 3708 | 2026-08-01 | Claude | — | — | migrate tournament pool contracts to v5 |
| local | `codex/workspace-snapshot-20260712` | 96d2568fb | 0 | 4366 | 2026-07-14 | Claude | — | — | fix(auth): recover deleted provider identities safely |
| local | `content/mitap-week1-6` | a1583324f | 0 | 5623 | 2026-06-09 | Claude | — | — | feat(content): mitap plan weeks 1-6 (days 1-42) + parameterize batch t |
| local | `feat/ai-dialogue-phase0` | 35154f488 | 0 | 5688 | 2026-06-08 | Claude | #2 merged | — | Merge remote-tracking branch 'origin/master' into feat/ai-dialogue-pha |
| local | `feat/bounce-rewrite` | 4e9993aac | 0 | 5586 | 2026-06-10 | Claude | — | — | chore: save concurrent session work (settings group refactor + medal_u |
| local | `feature/lingman-montazher` | 57afa49e7 | 0 | 5710 | 2026-05-24 | Claude | — | — | docs: document Lingman Montazher verification |
| local | `feature/multilang` | d7f2f1bdd | 0 | 5771 | 2026-04-11 | Claude | — | — | feat(multilang): Phase 3 — replace lang with uiLang alias across 38 fi |
| local | `feature/referral-roulette` | f0b2153b4 | 0 | 0 | 2026-10-02 | Claude | — | `.` | fix(ux): FINAL_PHASE п.7 — вибрация только на кнопках; откат тумблеров |
| local | `feature/tournaments-phase1` | e30a9349d | 0 | 4280 | 2026-07-21 | Claude | — | — | feat: admin v2 coin center |
| local | `fix/identity-merge-username` | c8a3703ec | 0 | 5615 | 2026-06-10 | Claude | — | — | chore: checkpoint session work before bounce rewrite |
| local | `fix/pearl-purchase-balance` | cc63d665e | 0 | 3694 | 2026-08-01 | Claude | — | — | test: normalize pearl contract line endings |
| local | `integration/merge-all` | bf3b94628 | 0 | 5646 | 2026-06-08 | Claude | — | — | feat(admin): add 08.06 QA sections to onboarding/premium/vip/referrals |
| local | `integration/unified-20260721` | 757e76423 | 0 | 4160 | 2026-07-25 | Claude | — | — | chore(tests): вычистить тесты снятых квизов и Арены |
| remote | `origin` | 53bb63352 | 0 | 3066 | 2026-08-08 | Claude | — | — | fix(release): harden gift claims and version gate |
| remote | `origin/codex/analytics-admin-readonly-activation-20260713` | 545022f2a | 0 | 4574 | 2026-07-14 | Claude | #12 merged | — | test: enforce analytics server permission boundary |
| remote | `origin/codex/full-performance-audio-audit-167-mac-20260815` | 1c450880c | 0 | 3019 | 2026-08-13 | badloar-star | — | — | chore(wip): restore complete Mac snapshot after referral roulette reba |
| remote | `origin/feat/ai-dialogue-phase0` | 35154f488 | 0 | 5688 | 2026-06-08 | Claude | #2 merged | — | Merge remote-tracking branch 'origin/master' into feat/ai-dialogue-pha |
| remote | `origin/feat/bounce-rewrite` | 2d7ccd24d | 0 | 5607 | 2026-06-10 | Claude | — | — | feat: in-app QA panel (speaking lab + referral lab) |
| remote | `origin/feat/referral-vip` | 700708ead | 0 | 5695 | 2026-06-08 | Claude | #3 merged | — | harden(referral): env-gate App Check via ENFORCE_APP_CHECK |
| remote | `origin/feature/referral-roulette` | 79c3f6984 | 0 | 1129 | 2026-09-21 | Claude | — | — | fix(админка): кнопка «Редактировать плашку» открывает форму на своей п |
| remote | `origin/fix/audited-runtime-2026-08-07` | 962913992 | 0 | 3210 | 2026-08-05 | Claude | — | — | fix(lint): AiMistakeCard wait line uses FlowText instead of raw number |
| remote | `origin/fix/trainer-daily-challenge-accounting-2026-08-07` | 376cb58f3 | 0 | 3201 | 2026-08-07 | badloar-star | — | — | fix: make lesson priming non-blocking |
| remote | `origin/lingman-scenarist-pipeline` | 730ce9a35 | 0 | 5727 | 2026-05-22 | Maksym Babiev | — | — | Add Lingman scenarist pipeline |
| remote | `origin/master` | 53bb63352 | 0 | 3066 | 2026-08-08 | Claude | — | — | fix(release): harden gift claims and version gate |
| remote | `origin/release/stable-build-2026-05-23` | 51f76a63c | 0 | 5726 | 2026-05-23 | Claude | — | — | checkpoint: stable build snapshot |
| remote | `origin/release/stable-build-2026-05-24` | 20ea6793f | 0 | 5721 | 2026-05-24 | Claude | — | — | checkpoint: stable build snapshot 2026-05-24 |
| local | `release/personal-plan-choice-5702039` | 5702039be | 0 | 3698 | 2026-08-01 | Claude | — | — | fix: keep personal plan choices responsive |
| local | `release/plus-access-da6eea651` | da6eea651 | 0 | 3688 | 2026-08-01 | Claude | — | `C:/Temp/phraseman-plus-release-check` 🔒 | test: update tournament integration contracts |
| local | `release/stable-build-2026-05-23` | 51f76a63c | 0 | 5726 | 2026-05-23 | Claude | — | — | checkpoint: stable build snapshot |
| local | `release/stable-build-2026-05-24` | 20ea6793f | 0 | 5721 | 2026-05-24 | Claude | — | — | checkpoint: stable build snapshot 2026-05-24 |
| local | `worktree-agent-a037a0f903c2f233a` | af199d089 | 0 | 5766 | 2026-05-03 | Claude | — | — | fix(eas): include production version gate in EAS archive and track scr |
| local | `worktree-agent-a2db3d88` | 361443dac | 0 | 5814 | 2026-04-01 | Claude | — | — | feat: update lesson data and quizzes |
| local | `worktree-agent-a6e5a8227051149b9` | af199d089 | 0 | 5766 | 2026-05-03 | Claude | — | — | fix(eas): include production version gate in EAS archive and track scr |
| local | `worktree-agent-a70188f4243bb73ce` | af199d089 | 0 | 5766 | 2026-05-03 | Claude | — | — | fix(eas): include production version gate in EAS archive and track scr |
| local | `worktree-agent-af0e13c27c9f91a6b` | af199d089 | 0 | 5766 | 2026-05-03 | Claude | — | — | fix(eas): include production version gate in EAS archive and track scr |
| local | `worktree-agent-af47514dd731dc686` | af199d089 | 0 | 5766 | 2026-05-03 | Claude | — | — | fix(eas): include production version gate in EAS archive and track scr |
| local | `worktree-agent-afc98d8feb7f5960f` | f0eccd609 | 0 | 4831 | 2026-07-03 | Claude | — | — | fix(compass): day-comment cache stuck at rejected/off_topic — use a Co |

## Ограничения
- Владелец ветки/worktree в git не хранится: для worktree он выводится из пути (.claude/worktrees, .codex/worktrees, внешний каталог), для остальных веток дан автор последнего коммита — это подсказка, не подтверждённое владение.
- PR сопоставлены по имени ветки (gh pr list, лимит 500, state=all); ветка без PR помечена «—».
- Ветки с ahead > 0 могут нести уникальную работу: перед любым удалением — архив (PM-241) и список от владельца (PM-242). Этот документ ничего не рекомендует удалять.
