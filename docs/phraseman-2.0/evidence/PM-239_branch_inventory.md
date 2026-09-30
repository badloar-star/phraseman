# PM-239 — инвентаризация веток и worktree (только чтение)

Сгенерировано: `node scripts/pm239_branch_inventory.mjs` на HEAD `17fbb3d32` (ветка `feature/referral-roulette`). Ничего не удалялось и не менялось в git.
Каноническая ветка по решению D30/панели P7: `feature/referral-roulette` (не подтверждено владельцем письменно как единственная).

## Сводка
- локальных веток: 288; remote-веток: 54; worktree: 12 (с веткой)
- веток с уникальными коммитами относительно HEAD (ahead > 0): 225
- веток без уникальных коммитов (достижимы из HEAD): 116
- незакоммиченных путей в общем дереве: 3508 (modified 976, deleted 1918, untracked 614, other 0)

## Незакоммиченные изменения по верхним каталогам (PM-239-A2)
- `assets`: 1180
- `tests`: 776
- `app`: 613
- `functions`: 270
- `components`: 230
- `docs`: 194
- `modules`: 65
- `scripts`: 63
- `content`: 23
- `shared`: 20
- `constants`: 16
- `(root)`: 14
- `hooks`: 11
- `runtime-probes`: 8
- `targets`: 6
- `admin`: 4
- `legal`: 4
- `config`: 2
- `knowly-www`: 2
- `plugins`: 2
- `.claude`: 1
- `functions-admin`: 1
- `patches`: 1
- `lib`: 1
- `tools`: 1

## Ветки (ahead = уникальные коммиты ветки относительно HEAD; behind = коммиты HEAD, которых нет в ветке)
| вид | ветка | SHA | ahead | behind | последний коммит | worktree | состояние |
|---|---|---|---:|---:|---|---|---|
| local | `codex/release-current-final-20260715` | 94a485c85 | 334 | 3643 | 2026-07-15 | — | 334 unique commit(s) |
| local | `prod-snapshot/all-development-integration-20260721` | 35002323b | 330 | 3643 | 2026-07-21 | — | 330 unique commit(s) |
| local | `codex/all-development-integration` | 01551585a | 329 | 3643 | 2026-07-19 | — | 329 unique commit(s) |
| local | `prod-snapshot/youtube-final-integration-20260721` | 64829cc2b | 327 | 3643 | 2026-07-21 | — | 327 unique commit(s) |
| local | `codex/youtube-final-integration` | e9ec1c4b9 | 326 | 3643 | 2026-07-13 | — | 326 unique commit(s) |
| remote | `origin/codex/all-development-integration` | e9ec1c4b9 | 326 | 3643 | 2026-07-13 | — | 326 unique commit(s) |
| local | `prod-snapshot/youtube-analytics-integration-result-20260721` | 67f273bb3 | 320 | 3643 | 2026-07-21 | — | 320 unique commit(s) |
| local | `codex/youtube-analytics-integration-result` | 4634cbb00 | 319 | 3643 | 2026-07-13 | — | 319 unique commit(s) |
| local | `prod-snapshot/youtube-release-1.5.56-20260721` | 9be2c6ee8 | 295 | 3630 | 2026-07-21 | — | 295 unique commit(s) |
| local | `codex/release-youtube-analytics-1.5.56` | 5a0ea68e0 | 294 | 3630 | 2026-07-13 | — | 294 unique commit(s) |
| local | `prod-snapshot/release-1.5.56-20260721` | 588d06a2f | 267 | 3630 | 2026-07-21 | — | 267 unique commit(s) |
| local | `release/1.5.56` | 5888ae974 | 266 | 3630 | 2026-07-13 | — | 266 unique commit(s) |
| local | `codex/contextual-soft-upsell-integration` | 136beb1b1 | 260 | 3630 | 2026-07-13 | — | 260 unique commit(s) |
| local | `codex/soft-upsell-premium-integration` | a2082afb0 | 257 | 3643 | 2026-07-13 | — | 257 unique commit(s) |
| local | `codex/weekly-review-v2-integration-20260713` | 9c322c8da | 237 | 3643 | 2026-07-14 | — | 237 unique commit(s) |
| local | `codex/lessons-1-32-integration-result` | 0a488184b | 236 | 3640 | 2026-07-13 | — | 236 unique commit(s) |
| remote | `origin/codex/weekly-review-v2-integration-20260713` | 1ed170421 | 234 | 3643 | 2026-07-13 | — | 234 unique commit(s) |
| local | `codex/fix-friends-gift-release-status` | 68d2ff893 | 210 | 3643 | 2026-07-12 | — | 210 unique commit(s) |
| local | `codex/orbit-admin-access-critical-20260718` | bd2a1cd17 | 170 | 3540 | 2026-07-18 | — | 170 unique commit(s) |
| local | `codex/orbit-admin-role-migration-20260718` | 3b5eb5216 | 170 | 3540 | 2026-07-18 | — | 170 unique commit(s) |
| local | `prod-snapshot/codex-5d3a-20260721` | 3e5b26a01 | 170 | 3540 | 2026-07-21 | — | 170 unique commit(s) |
| local | `prod-snapshot/orbit-unified-release-base-20260718-20260721` | bf233dfdd | 170 | 3540 | 2026-07-21 | — | 170 unique commit(s) |
| local | `codex/orbit-unified-release-base-20260718` | fcae2fb8a | 169 | 3540 | 2026-07-18 | — | 169 unique commit(s) |
| local | `prod-snapshot/admin-language-factory-20260721` | 413cd2595 | 145 | 3761 | 2026-07-21 | — | 145 unique commit(s) |
| local | `codex/admin-language-factory` | d973456ff | 144 | 3761 | 2026-07-13 | — | 144 unique commit(s) |
| remote | `origin/codex/admin-language-factory` | d973456ff | 144 | 3761 | 2026-07-13 | — | 144 unique commit(s) |
| local | `codex/admin-support-russian-20260713` | 74b199b66 | 143 | 3761 | 2026-07-13 | — | 143 unique commit(s) |
| remote | `origin/prod-snapshot/learning-v2-pilot-20260721` | a178cba1f | 108 | 3549 | 2026-07-26 | — | 108 unique commit(s) |
| local | `prod-snapshot/learning-v2-pilot-20260721` | a178cba1f | 108 | 3549 | 2026-07-26 | — | 108 unique commit(s) |
| local | `codex/learning-v2-pilot` | 23c71a117 | 88 | 3549 | 2026-07-16 | — | 88 unique commit(s) |
| local | `codex/release-final-integration-20260715` | d5eea4982 | 85 | 3540 | 2026-07-15 | — | 85 unique commit(s) |
| remote | `origin/codex/release-final-integration-20260715` | d5eea4982 | 85 | 3540 | 2026-07-15 | — | 85 unique commit(s) |
| local | `codex/user-fixes-release-20260715` | cc0d38bc1 | 79 | 3544 | 2026-07-15 | — | 79 unique commit(s) |
| local | `codex/release-integrated-build-20260715` | d74d02790 | 75 | 3544 | 2026-07-15 | — | 75 unique commit(s) |
| local | `prod-snapshot/ai-recovery-release-20260715-20260721` | ab9073903 | 75 | 3544 | 2026-07-21 | — | 75 unique commit(s) |
| local | `codex/ai-recovery-release-20260715` | bb27a6395 | 74 | 3544 | 2026-07-15 | — | 74 unique commit(s) |
| local | `codex/monetization-guardrails-release-20260715` | e668003b1 | 74 | 3544 | 2026-07-15 | — | 74 unique commit(s) |
| remote | `origin/codex/release-integrated-build-20260715` | e794a80a2 | 73 | 3544 | 2026-07-15 | — | 73 unique commit(s) |
| local | `prod-snapshot/agent-manager-digest-integration-20260721` | 5d48c5252 | 49 | 3514 | 2026-07-21 | — | 49 unique commit(s) |
| local | `codex/agent-manager-digest-integration` | db4ea32aa | 48 | 3514 | 2026-07-17 | — | 48 unique commit(s) |
| local | `codex/daily-digest-agent-manager` | e7bb8e9f6 | 44 | 3514 | 2026-07-17 | — | 44 unique commit(s) |
| local | `prod-snapshot/agent-manager-foundation-20260721` | f48cc6308 | 44 | 3514 | 2026-07-21 | — | 44 unique commit(s) |
| local | `codex/agent-manager-foundation` | 470f8acfa | 43 | 3514 | 2026-07-16 | — | 43 unique commit(s) |
| local | `prod-snapshot/admin-v2-paywall-graphs-20260713-20260721` | cc41841b1 | 43 | 3563 | 2026-07-21 | — | 43 unique commit(s) |
| local | `codex/admin-v2-paywall-graphs-20260713` | ef3f23716 | 42 | 3563 | 2026-07-14 | — | 42 unique commit(s) |
| remote | `origin/codex/compass-future-learning-v2` | ece01dfe6 | 42 | 2249 | 2026-08-13 | — | 42 unique commit(s) |
| remote | `origin/codex/full-performance-audio-audit-167` | c331db7b7 | 40 | 2249 | 2026-08-12 | — | 40 unique commit(s) |
| local | `codex/xp-integrity-audit` | 86c0b2add | 32 | 3672 | 2026-07-11 | — | 32 unique commit(s) |
| remote | `origin/agent/english-level-test-20260721` | 6dc494dcc | 30 | 3756 | 2026-07-21 | — | 30 unique commit(s) |
| local | `prod-snapshot/admin-v2-youtube-analytics-20260721` | d1073fb43 | 27 | 3600 | 2026-07-21 | — | 27 unique commit(s) |
| local | `codex/admin-v2-youtube-analytics` | 1f40faf9d | 26 | 3600 | 2026-07-13 | — | 26 unique commit(s) |
| remote | `origin/audit/daily-challenges-2026-08-06` | 3feffe033 | 25 | 2393 | 2026-08-06 | — | 25 unique commit(s) |
| local | `codex/post-delete-fresh-identity` | 36b1cc78b | 24 | 1827 | 2026-08-21 | `C:/appsprojects/phraseman/.worktrees/post-delete-fresh-identity` | 24 unique commit(s) |
| local | `codex/admin-digest-app-codex` | ef7df2ead | 23 | 3750 | 2026-07-12 | — | 23 unique commit(s) |
| local | `prod-snapshot/admin-integrated-20260716-20260721` | eab5ac004 | 22 | 3534 | 2026-07-21 | — | 22 unique commit(s) |
| local | `prod-snapshot/social-learning-cards-20260721` | 3060c6d2c | 21 | 3675 | 2026-07-21 | — | 21 unique commit(s) |
| local | `recovery/from-1.6.19` | 83ad0f338 | 21 | 464 | 2026-09-26 | `C:/appsprojects/phraseman-recovery-1.6.19` | 21 unique commit(s) |
| local | `codex/social-learning-cards` | 766b870f2 | 20 | 3675 | 2026-07-12 | — | 20 unique commit(s) |
| local | `prod-snapshot/premium-landing-20260716-20260721` | 29c32ab13 | 20 | 3534 | 2026-07-21 | — | 20 unique commit(s) |
| local | `codex/premium-landing-20260716` | 01f1293ca | 19 | 3534 | 2026-07-16 | — | 19 unique commit(s) |
| remote | `origin/claude/new-session-dp9z13` | 5b69ebd0d | 18 | 2249 | 2026-08-16 | — | 18 unique commit(s) |
| remote | `origin/content/editorial-voice-v1` | 629012f13 | 18 | 3756 | 2026-07-20 | — | 18 unique commit(s) |
| local | `codex/contextual-soft-upsell-foundation` | 7f7020632 | 17 | 3641 | 2026-07-12 | — | 17 unique commit(s) |
| remote | `origin/audit/screenshot-fixes-2026-08-06` | a90812f6f | 17 | 2393 | 2026-08-06 | — | 17 unique commit(s) |
| remote | `origin/agent/english-level-test-full-audit` | c71da6581 | 16 | 3756 | 2026-07-21 | — | 16 unique commit(s) |
| remote | `origin/audit/remove-french-runtime-fixes-2026-08-05` | 57216c95f | 16 | 2393 | 2026-08-05 | — | 16 unique commit(s) |
| local | `codex/lessons-1-32-linguistic-remediation` | 3ddb79329 | 15 | 3650 | 2026-07-13 | — | 15 unique commit(s) |
| local | `codex/borderless-premium-surfaces` | e2652c735 | 14 | 3723 | 2026-07-11 | — | 14 unique commit(s) |
| local | `prod-snapshot/mobile-final-20260716-20260721` | 89aa0b17a | 13 | 3534 | 2026-07-21 | — | 13 unique commit(s) |
| local | `prod-snapshot/content-factory-canary-20260713-20260721` | 6c48a2ccc | 11 | 3610 | 2026-07-21 | — | 11 unique commit(s) |
| local | `codex/content-factory-canary-20260713` | 1426d4342 | 10 | 3610 | 2026-07-14 | — | 10 unique commit(s) |
| local | `codex/agent-office-integration` | a45c18ad4 | 9 | 3514 | 2026-07-16 | — | 9 unique commit(s) |
| local | `codex/english-test-adaptive-redesign` | 4b670ccf0 | 9 | 3436 | 2026-07-22 | — | 9 unique commit(s) |
| local | `codex/soft-upsell-premium-funnel` | f68dce36a | 9 | 3599 | 2026-07-13 | — | 9 unique commit(s) |
| remote | `origin/chore/remove-second-language-daily-challenge-2026-08-07` | 0f6287e49 | 8 | 2379 | 2026-08-07 | — | 8 unique commit(s) |
| remote | `origin/fix/personal-plan-next-task-errors-2026-08-07` | 21900dbf9 | 8 | 2388 | 2026-08-07 | — | 8 unique commit(s) |
| local | `prod-snapshot/agent-office-orchestrator-20260721` | b8a29afc7 | 8 | 3514 | 2026-07-21 | — | 8 unique commit(s) |
| local | `codex/agent-office-orchestrator` | 622121863 | 7 | 3514 | 2026-07-16 | — | 7 unique commit(s) |
| remote | `origin/fix/pearl-pack-purchase-reconcile-2026-08-07` | 31118bebf | 7 | 2387 | 2026-08-07 | — | 7 unique commit(s) |
| local | `prod-snapshot/lesson-audit-harness-20260721` | e986cb154 | 7 | 3650 | 2026-07-21 | — | 7 unique commit(s) |
| remote | `origin/fix/daily-reroll-durability-2026-08-07` | 584a9a00d | 6 | 2381 | 2026-08-07 | — | 6 unique commit(s) |
| remote | `origin/fix/personal-plan-transition-integrity-2026-08-07` | 18cc9c07c | 6 | 2381 | 2026-08-07 | — | 6 unique commit(s) |
| local | `claude/sad-cannon-876ae9` | 77a713e42 | 5 | 3654 | 2026-09-22 | — | 5 unique commit(s) |
| local | `claude/upbeat-payne-1f254e` | 6ba4f73c4 | 5 | 3654 | 2026-09-22 | `C:/appsprojects/phraseman/.claude/worktrees/upbeat-payne-1f254e` | 5 unique commit(s) |
| local | `codex/agent-office-telegram-publisher` | ae2476402 | 5 | 3518 | 2026-07-16 | — | 5 unique commit(s) |
| local | `prod-snapshot/admin-nav-restore-20260714-20260721` | 620b94d6e | 5 | 3756 | 2026-07-21 | — | 5 unique commit(s) |
| local | `prod-snapshot/admin-stretch-phone-deploy-20260714-20260721` | 9d95fd27b | 5 | 3756 | 2026-07-21 | — | 5 unique commit(s) |
| local | `claude/busy-cerf-4c737c` | 4e11134f9 | 4 | 3654 | 2026-09-22 | `C:/appsprojects/phraseman/.claude/worktrees/busy-cerf-4c737c` | 4 unique commit(s) |
| local | `codex/auth-runtime-integration` | 3ec80902a | 4 | 3757 | 2026-07-10 | — | 4 unique commit(s) |
| local | `codex/league-club-hub` | 32de93b09 | 4 | 3610 | 2026-07-13 | — | 4 unique commit(s) |
| local | `codex/release-app-current-20260714` | 854663005 | 4 | 3552 | 2026-07-14 | — | 4 unique commit(s) |
| local | `codex/restore-admin-v2-full-shell-20260714` | 921c8ca2c | 4 | 3756 | 2026-07-14 | — | 4 unique commit(s) |
| local | `gh-pages` | ec1092fca | 4 | 5086 | 2026-04-19 | — | 4 unique commit(s) |
| remote | `origin/agent/english-test-live-deploy` | 499f3e985 | 4 | 3745 | 2026-07-21 | — | 4 unique commit(s) |
| remote | `origin/gh-pages` | ec1092fca | 4 | 5086 | 2026-04-19 | — | 4 unique commit(s) |
| local | `prod-snapshot/admin-stretch-deploy-20260714-20260721` | 20567994c | 4 | 3756 | 2026-07-21 | — | 4 unique commit(s) |
| local | `prod-snapshot/borderless-baseline-20260721` | ee8fdebb1 | 4 | 3723 | 2026-07-21 | — | 4 unique commit(s) |
| local | `codex/coin-safety-20260722` | 31d0fb217 | 3 | 3430 | 2026-07-22 | — | 3 unique commit(s) |
| remote | `origin/chore/remove-audit-artifacts-2026-08-07` | 8e65d6b7b | 3 | 2389 | 2026-08-07 | — | 3 unique commit(s) |
| remote | `origin/chore/remove-french-daily-navigation-2026-08-07` | 33eed473c | 3 | 2384 | 2026-08-07 | — | 3 unique commit(s) |
| remote | `origin/fix/daily-screen-central-navigation-2026-08-07` | 07065f80f | 3 | 2383 | 2026-08-07 | — | 3 unique commit(s) |
| local | `prod-snapshot/agent-office-issuer-retry-20260721` | 3b4e6f920 | 3 | 3518 | 2026-07-21 | — | 3 unique commit(s) |
| local | `prod-snapshot/auth-runtime-reliability-20260721` | e640d7bec | 3 | 3761 | 2026-07-21 | — | 3 unique commit(s) |
| local | `prod-snapshot/explain-phrase-recovery-20260715-20260721` | 3f2594e26 | 3 | 3536 | 2026-07-21 | — | 3 unique commit(s) |
| local | `prod-snapshot/phraseman-motion-ad-film1-20260721` | d4b90fad4 | 3 | 3526 | 2026-07-21 | — | 3 unique commit(s) |
| local | `prod-snapshot/referral-vip-20260721` | 3e49d4bdd | 3 | 4878 | 2026-07-21 | — | 3 unique commit(s) |
| local | `prod-snapshot/speaking-mode-20260721` | 359b7b31d | 3 | 4864 | 2026-07-21 | — | 3 unique commit(s) |
| local | `backup/current-tree-before-recovery` | 1dcfdda19 | 2 | 4897 | 2026-06-07 | — | 2 unique commit(s) |
| local | `backup/hour-ago-stash-recovery` | 0139cd0b2 | 2 | 4897 | 2026-06-07 | — | 2 unique commit(s) |
| local | `claude/admiring-knuth-36984d` | 73f0ae9f3 | 2 | 3654 | 2026-08-03 | — | 2 unique commit(s) |
| local | `claude/eager-proskuriakova-03d900` | 28e1dd5c1 | 2 | 3654 | 2026-08-24 | — | 2 unique commit(s) |
| local | `claude/fervent-spence-e2a537` | ece62c73f | 2 | 3654 | 2026-09-21 | — | 2 unique commit(s) |
| local | `claude/gallant-lalande-2de40e` | 123c0545f | 2 | 3654 | 2026-09-22 | `C:/appsprojects/phraseman/.claude/worktrees/gallant-lalande-2de40e` | 2 unique commit(s) |
| local | `claude/gracious-euler-7077af` | 9e135cb49 | 2 | 3654 | 2026-09-03 | — | 2 unique commit(s) |
| local | `claude/nice-almeida-93b29b` | a5d789275 | 2 | 3654 | 2026-09-03 | — | 2 unique commit(s) |
| local | `claude/silly-tereshkova-1dbfd8` | 581554723 | 2 | 3654 | 2026-08-24 | — | 2 unique commit(s) |
| local | `claude/upbeat-snyder-64aebe` | 4a9d6b1d0 | 2 | 3654 | 2026-09-01 | — | 2 unique commit(s) |
| local | `codex/agent-office-approval-issuance` | acf6c2932 | 2 | 3518 | 2026-07-16 | — | 2 unique commit(s) |
| local | `codex/agent-office-approval-issuance-retry` | aed546ce6 | 2 | 3518 | 2026-07-16 | — | 2 unique commit(s) |
| local | `codex/auth-runtime-reliability` | 13e545184 | 2 | 3761 | 2026-07-10 | — | 2 unique commit(s) |
| local | `codex/english-test-russian-prompts` | 045bca913 | 2 | 3431 | 2026-07-22 | — | 2 unique commit(s) |
| local | `codex/explain-phrase-recovery-20260715` | 1d6785d5e | 2 | 3536 | 2026-07-15 | — | 2 unique commit(s) |
| local | `codex/phraseman-motion-ad-film1` | 471a721ee | 2 | 3526 | 2026-07-17 | — | 2 unique commit(s) |
| local | `feat/referral-vip` | 03637a395 | 2 | 4878 | 2026-06-09 | — | 2 unique commit(s) |
| local | `feat/speaking-mode` | 9cae59b81 | 2 | 4864 | 2026-06-08 | — | 2 unique commit(s) |
| local | `feat/weekly-ai-review` | 41018923f | 2 | 4806 | 2026-06-10 | — | 2 unique commit(s) |
| remote | `origin/codex/tournament-pairs-retry` | 796db76ca | 2 | 2394 | 2026-08-08 | — | 2 unique commit(s) |
| remote | `origin/fix/daily-challenge-navigation-2026-08-07` | e6b5f7710 | 2 | 2386 | 2026-08-07 | — | 2 unique commit(s) |
| remote | `origin/fix/lesson-prime-fail-open-2026-08-07` | af0d2b8cb | 2 | 2385 | 2026-08-07 | — | 2 unique commit(s) |
| remote | `origin/fix/trainer-srs-queue-separation-2026-08-07` | f035d31fe | 2 | 2382 | 2026-08-07 | — | 2 unique commit(s) |
| local | `prod-snapshot/admin-nav-release-43ba949e4-20260721` | ea7f07f09 | 2 | 3756 | 2026-07-21 | — | 2 unique commit(s) |
| local | `prod-snapshot/explain-recovery-run-20260721` | 565eed6cb | 2 | 3536 | 2026-07-21 | — | 2 unique commit(s) |
| local | `claude/amazing-germain-5181ba` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/angry-heisenberg-adace4` | d618226ba | 1 | 3654 | 2026-08-08 | `C:/appsprojects/phraseman/.claude/worktrees/angry-heisenberg-adace4` | 1 unique commit(s) |
| local | `claude/beautiful-jennings-5bd5fb` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/bold-tereshkova-ad498d` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/charming-vaughan-555a20` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/clever-bell-4420e0` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/compassionate-goldstine-d1d2cf` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/confident-herschel-803a11` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/determined-napier-89a855` | d618226ba | 1 | 3654 | 2026-08-08 | `C:/appsprojects/phraseman/.claude/worktrees/determined-napier-89a855` | 1 unique commit(s) |
| local | `claude/dreamy-bhabha-9ebaaa` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/dreamy-golick-b48896` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/elastic-stonebraker-78cd6a` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/elegant-bhabha-cacf17` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/friendly-merkle-1480dc` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/friendly-sammet-761f84` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/frosty-bun-3c76c2` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/frosty-matsumoto-b758a2` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/gallant-raman-7c7642` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/heuristic-kilby-847e88` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/heuristic-swartz-d9213a` | d618226ba | 1 | 3654 | 2026-08-08 | `C:/appsprojects/phraseman/.claude/worktrees/heuristic-swartz-d9213a` | 1 unique commit(s) |
| local | `claude/hopeful-chatelet-1433b2` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/hopeful-taussig-04e986` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/hungry-kilby-9bd1cb` | 234079c8e | 1 | 3687 | 2026-07-25 | — | 1 unique commit(s) |
| local | `claude/jolly-shirley-892ac6` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/keen-tharp-c8c49c` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/magical-mclaren-3c95d8` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/modest-wilson-c04e51` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/musing-dubinsky-159aca` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/musing-hofstadter-d1a238` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/nervous-jang-6055f4` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/nice-mendel-7d8593` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/nostalgic-grothendieck-b02fca` | d618226ba | 1 | 3654 | 2026-08-08 | `C:/appsprojects/phraseman/.claude/worktrees/nostalgic-grothendieck-b02fca` | 1 unique commit(s) |
| local | `claude/optimistic-meninsky-8ab8df` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/quirky-robinson-32b1f4` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/relaxed-chebyshev-d8e55c` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/relaxed-sammet-7e892e` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/reverent-bell-be68fe` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/reverent-franklin-1542bd` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/serene-napier-656b6b` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/sharp-edison-e1de09` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/sharp-shirley-3a9d17` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/silly-merkle-99a9b4` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/unruffled-shtern-b9042d` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/vibrant-roentgen-0eb655` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/wizardly-dubinsky-1cd25d` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/wonderful-jang-654e1b` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/wonderful-leavitt-c8e2cd` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/youthful-hertz-7833ab` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/zen-dubinsky-1bcbb3` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `claude/zen-wozniak-e5fc65` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| local | `codex/admin2-integration` | 43cfc5e79 | 1 | 3657 | 2026-07-12 | — | 1 unique commit(s) |
| local | `codex/agent-office-admin-center` | d3a5b2176 | 1 | 3517 | 2026-07-16 | — | 1 unique commit(s) |
| local | `codex/analytics-admin-foundation-20260713` | f31b2b60f | 1 | 3761 | 2026-07-13 | — | 1 unique commit(s) |
| local | `codex/analytics-admin-renderers-20260713` | e4d60753e | 1 | 3760 | 2026-07-14 | — | 1 unique commit(s) |
| local | `codex/analytics-foundations-20260713` | bb5ec052d | 1 | 3765 | 2026-07-13 | — | 1 unique commit(s) |
| local | `codex/analytics-monthly-pack-20260713` | 2eeee7b40 | 1 | 3762 | 2026-07-13 | — | 1 unique commit(s) |
| local | `codex/analytics-product-20260713` | 7f0fc0cfa | 1 | 3764 | 2026-07-13 | — | 1 unique commit(s) |
| local | `codex/analytics-server-admin-production-20260713` | 1b0e5f5e5 | 1 | 3766 | 2026-07-13 | — | 1 unique commit(s) |
| local | `codex/analytics-subscriptions-20260713` | 1cd3d127a | 1 | 3763 | 2026-07-13 | — | 1 unique commit(s) |
| local | `codex/arena-question-pool-critical-20260717` | 73bebf22f | 1 | 3502 | 2026-07-17 | — | 1 unique commit(s) |
| local | `codex/arena-question-replacement` | 86fbd8f65 | 1 | 3502 | 2026-07-17 | — | 1 unique commit(s) |
| local | `codex/functions-build-gate` | 3b4dbaeed | 1 | 3518 | 2026-07-16 | — | 1 unique commit(s) |
| local | `codex/release-gates-hygiene-20260713` | ac4f671c3 | 1 | 3766 | 2026-07-13 | — | 1 unique commit(s) |
| local | `codex/remove-constellations` | 05c350976 | 1 | 3657 | 2026-07-12 | — | 1 unique commit(s) |
| local | `codex/stats-redesign-reliability` | 85a55dbdb | 1 | 3687 | 2026-07-17 | — | 1 unique commit(s) |
| local | `master` | d618226ba | 1 | 3654 | 2026-08-08 | — | 1 unique commit(s) |
| remote | `origin/agent/diagnose-vitalii-account-20260807` | 853429f34 | 1 | 3647 | 2026-08-07 | — | 1 unique commit(s) |
| remote | `origin/agent/english-level-test-production` | e1ee7553f | 1 | 3738 | 2026-07-21 | — | 1 unique commit(s) |
| remote | `origin/audit/lesson-daily-task-delivery-2026-08-07` | fc4e2d883 | 1 | 2379 | 2026-08-07 | — | 1 unique commit(s) |
| remote | `origin/audit/pearl-pack-purchase-2026-08-06` | cfd279cee | 1 | 2393 | 2026-08-06 | — | 1 unique commit(s) |
| remote | `origin/audit/polyglot-day-inventory-2026-08-07` | 01db7f2c7 | 1 | 2379 | 2026-08-07 | — | 1 unique commit(s) |
| remote | `origin/codex/analytics-monthly-pack-20260713` | 2eeee7b40 | 1 | 3762 | 2026-07-13 | — | 1 unique commit(s) |
| remote | `origin/codex/analytics-server-admin-production-20260713` | 1b0e5f5e5 | 1 | 3766 | 2026-07-13 | — | 1 unique commit(s) |
| remote | `origin/codex/full-phraseman-updates` | 70dfbb58e | 1 | 3641 | 2026-08-09 | — | 1 unique commit(s) |
| remote | `origin/codex/release-gates-hygiene-20260713` | ac4f671c3 | 1 | 3766 | 2026-07-13 | — | 1 unique commit(s) |
| remote | `origin/codex/screenshot-findings-2026-08-08` | 767a95a29 | 1 | 2372 | 2026-08-08 | — | 1 unique commit(s) |
| remote | `origin/fix/daily-task-recall-capacity` | 7628b2971 | 1 | 3643 | 2026-08-07 | — | 1 unique commit(s) |
| remote | `origin/fix/lesson-daily-task-delivery-2026-08-07` | 767a95a29 | 1 | 2372 | 2026-08-08 | — | 1 unique commit(s) |
| local | `prod-snapshot/account-delete-deploy-20260715-20260721` | 771da819c | 1 | 3544 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/admin-v2-canonical-analytics-20260717b-20260721` | 861143c4a | 1 | 3504 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/ai-dialogue-phase0-20260721` | 2ffe246cc | 1 | 4871 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/analytics-production-deploy-20260714-20260721` | 5d7b68294 | 1 | 3756 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/analytics-release-20260713-20260721` | e3854ca0b | 1 | 3766 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/borderless-merge-master-20260721` | 46e011da6 | 1 | 3687 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/codex-1f20-20260721` | 97be7f1d8 | 1 | 3493 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/codex-444b-20260721` | e831e856b | 1 | 3493 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/codex-5f15-20260721` | 02b32c50f | 1 | 3493 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/codex-a51e-20260721` | b8ce9596c | 1 | 3493 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/codex-f3f7-stats-redesign-20260721` | a06b71a5f | 1 | 3531 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/codex-fc6b-20260721` | 7ddd3015c | 1 | 3493 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/lingman-montazher-20260721` | c576f900a | 1 | 4893 | 2026-07-21 | — | 1 unique commit(s) |
| local | `prod-snapshot/weekly-review-v2-release-20260713-20260721` | f6d8bfda3 | 1 | 3580 | 2026-07-21 | — | 1 unique commit(s) |
| local | `release/referral-invite-fix-2026-05-13` | 6c3cf8e09 | 1 | 4922 | 2026-05-13 | — | 1 unique commit(s) |
| local | `claude/admiring-bassi-0568bc` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/bold-goodall-38a663` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/clever-bassi-9f1acb` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/clever-shaw-8eb913` | 28f46e961 | 0 | 3687 | 2026-07-12 | — | no unique commits (reachable from HEAD) |
| local | `claude/compassionate-borg-75653f` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/epic-margulis-81e706` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/fervent-swanson-984b5c` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/festive-golick-366819` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/gifted-fermi-9ab08a` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/great-carson-ebe9e5` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/heuristic-hypatia-6f19a5` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/infallible-curie-4deb3f` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/infallible-mccarthy-3b50c1` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/lucid-shannon-9604c3` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/modest-noether-f0fd12` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/nostalgic-driscoll-99a615` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/peaceful-ardinghelli-9b8b15` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/pensive-nash-f94863` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/quizzical-babbage-1d6afa` | 47187a218 | 0 | 2495 | 2026-08-03 | — | no unique commits (reachable from HEAD) |
| local | `claude/serene-lalande-dc0502` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/serene-snyder-641442` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/stoic-euler-afa284` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/unruffled-antonelli-4386a9` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/vigilant-wing-f13183` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/xenodochial-easley-40e914` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `claude/xenodochial-elion-aeef86` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `codex/account-delete-deploy-20260715` | f324651b7 | 0 | 3544 | 2026-07-15 | — | no unique commits (reachable from HEAD) |
| local | `codex/admin-analytics-current` | 58023df0f | 0 | 2894 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/admin-v2-canonical-analytics-20260717` | 78b04de18 | 0 | 3526 | 2026-07-17 | — | no unique commits (reachable from HEAD) |
| local | `codex/admin-v2-canonical-analytics-20260717b` | e537dceda | 0 | 3504 | 2026-07-17 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-admin-retry` | 7182487f4 | 0 | 3515 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-analytics` | ac98e8319 | 0 | 3517 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-ledger` | 8fd472b4b | 0 | 3528 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-observation-review` | 94fd4d626 | 0 | 3524 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-observation-runner` | 1d624c280 | 0 | 3525 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-observation-runner-v2` | 8f54de134 | 0 | 3523 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-pilot-adapters` | 78a1044ba | 0 | 3521 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-provenance-remediation` | 78a1044ba | 0 | 3521 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-telegram-approvals` | e29aa155d | 0 | 3518 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/agent-office-triage-pilot` | 1d624c280 | 0 | 3525 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/analytics-admin-readonly-activation-20260713` | 545022f2a | 0 | 3757 | 2026-07-14 | — | no unique commits (reachable from HEAD) |
| local | `codex/arena-question-pool-20260717` | 9f2bacf09 | 0 | 3506 | 2026-07-17 | — | no unique commits (reachable from HEAD) |
| local | `codex/arena-question-pool-complete` | 8f4771b0e | 0 | 3498 | 2026-07-17 | — | no unique commits (reachable from HEAD) |
| local | `codex/aura-native-lab` | 4dd077509 | 0 | 2979 | 2026-07-28 | `C:/appsprojects/phraseman-aura-native-lab` | no unique commits (reachable from HEAD) |
| local | `codex/checkpoint-tabbar-shrink-20260612_121820` | e7bffd15a | 0 | 4655 | 2026-06-12 | — | no unique commits (reachable from HEAD) |
| local | `codex/daily-phrase-premium` | 7acd7a489 | 0 | 2895 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/daily-quest-icons-current` | 766a3f43d | 0 | 2892 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/evidence-analytics-production-20260713` | 02cd07800 | 0 | 3766 | 2026-07-05 | — | no unique commits (reachable from HEAD) |
| local | `codex/gift-certificate-admin-visual-history` | 399beb6d9 | 0 | 2894 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/integration-20260801` | 948910e60 | 0 | 2892 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/league-hub-redesign-20260719` | e30a9349d | 0 | 3463 | 2026-07-21 | — | no unique commits (reachable from HEAD) |
| local | `codex/learning-v2-rebuild` | 2654b6e40 | 0 | 2606 | 2026-08-02 | — | no unique commits (reachable from HEAD) |
| local | `codex/level-up-annual-gift` | c343aa896 | 0 | 2966 | 2026-07-29 | — | no unique commits (reachable from HEAD) |
| local | `codex/multilingual-language-level-tests` | 5ba5880ee | 0 | 2856 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/orbit-unified-integration-20260718` | 28f46e961 | 0 | 3687 | 2026-07-12 | — | no unique commits (reachable from HEAD) |
| local | `codex/pre-release-checkpoint-20260711` | 06fe090e4 | 0 | 3735 | 2026-07-11 | — | no unique commits (reachable from HEAD) |
| local | `codex/referrals-admin-redesign` | 2371b690a | 0 | 2959 | 2026-07-29 | — | no unique commits (reachable from HEAD) |
| local | `codex/release-integrated-20260715` | dbd1a2226 | 0 | 3490 | 2026-07-18 | — | no unique commits (reachable from HEAD) |
| local | `codex/release-integration-baseline-20260711` | c02b8c432 | 0 | 3722 | 2026-07-11 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-aura-native-lab` | 13a0d2352 | 0 | 2978 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-codex-3192` | 1211ed916 | 0 | 2961 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-codex-5891` | 3848e0a2c | 0 | 3231 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-codex-934f` | c6c5ecb71 | 0 | 3231 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-daily-phrase-premium` | 5504fb320 | 0 | 2936 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-daily-quest-d56c` | 2400e081d | 0 | 3653 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-gift-cert-release` | 0702b9e8c | 0 | 2952 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-gift-certificate-admin` | 2aedfe62f | 0 | 2944 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-level-up-annual-gift` | 13659ac9a | 0 | 2965 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-main-worktree` | 95eec1717 | 0 | 2944 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-main-worktree-final` | 292e062ac | 0 | 2943 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-main-worktree-late` | 4b61a9482 | 0 | 2943 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-onboarding-release` | dd1888527 | 0 | 2964 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/safety-20260801-sage-porcelain` | f0a10186a | 0 | 2935 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/sage-porcelain-light-theme` | f03176092 | 0 | 2887 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/settings-message-slots-main` | 8f77c6c90 | 0 | 3654 | 2026-07-26 | — | no unique commits (reachable from HEAD) |
| local | `codex/settings-messages-release` | 7e86492e1 | 0 | 2886 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/stats-redesign-current` | bbc6984ab | 0 | 3531 | 2026-07-16 | — | no unique commits (reachable from HEAD) |
| local | `codex/stats-screen-redesign-20260718` | 5d9a8e54c | 0 | 3483 | 2026-07-19 | — | no unique commits (reachable from HEAD) |
| local | `codex/streak-revive-modal-redesign` | 1e47f6c11 | 0 | 3641 | 2026-07-12 | — | no unique commits (reachable from HEAD) |
| local | `codex/tournament-current` | f43bd7dba | 0 | 2891 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/tournament-fill-gap-diversity` | 593daf5ac | 0 | 2891 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `codex/workspace-snapshot-20260712` | 96d2568fb | 0 | 3549 | 2026-07-14 | — | no unique commits (reachable from HEAD) |
| local | `content/mitap-week1-6` | a1583324f | 0 | 4806 | 2026-06-09 | — | no unique commits (reachable from HEAD) |
| local | `feat/ai-dialogue-phase0` | 35154f488 | 0 | 4871 | 2026-06-08 | — | no unique commits (reachable from HEAD) |
| local | `feat/bounce-rewrite` | 4e9993aac | 0 | 4769 | 2026-06-10 | — | no unique commits (reachable from HEAD) |
| local | `feature/lingman-montazher` | 57afa49e7 | 0 | 4893 | 2026-05-24 | — | no unique commits (reachable from HEAD) |
| local | `feature/multilang` | d7f2f1bdd | 0 | 4954 | 2026-04-11 | — | no unique commits (reachable from HEAD) |
| local | `feature/referral-roulette` | 17fbb3d32 | 0 | 0 | 2026-09-30 | `C:/appsprojects/phraseman` | HEAD (current) |
| local | `feature/tournaments-phase1` | e30a9349d | 0 | 3463 | 2026-07-21 | — | no unique commits (reachable from HEAD) |
| local | `fix/identity-merge-username` | c8a3703ec | 0 | 4798 | 2026-06-10 | — | no unique commits (reachable from HEAD) |
| local | `fix/pearl-purchase-balance` | cc63d665e | 0 | 2877 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `integration/merge-all` | bf3b94628 | 0 | 4829 | 2026-06-08 | — | no unique commits (reachable from HEAD) |
| local | `integration/unified-20260721` | 757e76423 | 0 | 3343 | 2026-07-25 | — | no unique commits (reachable from HEAD) |
| remote | `origin` | 53bb63352 | 0 | 2249 | 2026-08-08 | — | no unique commits (reachable from HEAD) |
| remote | `origin/codex/analytics-admin-readonly-activation-20260713` | 545022f2a | 0 | 3757 | 2026-07-14 | — | no unique commits (reachable from HEAD) |
| remote | `origin/codex/full-performance-audio-audit-167-mac-20260815` | 1c450880c | 0 | 2202 | 2026-08-13 | — | no unique commits (reachable from HEAD) |
| remote | `origin/feat/ai-dialogue-phase0` | 35154f488 | 0 | 4871 | 2026-06-08 | — | no unique commits (reachable from HEAD) |
| remote | `origin/feat/bounce-rewrite` | 2d7ccd24d | 0 | 4790 | 2026-06-10 | — | no unique commits (reachable from HEAD) |
| remote | `origin/feat/referral-vip` | 700708ead | 0 | 4878 | 2026-06-08 | — | no unique commits (reachable from HEAD) |
| remote | `origin/feature/referral-roulette` | 79c3f6984 | 0 | 312 | 2026-09-21 | — | no unique commits (reachable from HEAD) |
| remote | `origin/fix/audited-runtime-2026-08-07` | 962913992 | 0 | 2393 | 2026-08-05 | — | no unique commits (reachable from HEAD) |
| remote | `origin/fix/trainer-daily-challenge-accounting-2026-08-07` | 376cb58f3 | 0 | 2384 | 2026-08-07 | — | no unique commits (reachable from HEAD) |
| remote | `origin/lingman-scenarist-pipeline` | 730ce9a35 | 0 | 4910 | 2026-05-22 | — | no unique commits (reachable from HEAD) |
| remote | `origin/master` | 53bb63352 | 0 | 2249 | 2026-08-08 | — | no unique commits (reachable from HEAD) |
| remote | `origin/release/stable-build-2026-05-23` | 51f76a63c | 0 | 4909 | 2026-05-23 | — | no unique commits (reachable from HEAD) |
| remote | `origin/release/stable-build-2026-05-24` | 20ea6793f | 0 | 4904 | 2026-05-24 | — | no unique commits (reachable from HEAD) |
| local | `release/personal-plan-choice-5702039` | 5702039be | 0 | 2881 | 2026-08-01 | — | no unique commits (reachable from HEAD) |
| local | `release/plus-access-da6eea651` | da6eea651 | 0 | 2871 | 2026-08-01 | `C:/Temp/phraseman-plus-release-check` | no unique commits (reachable from HEAD) |
| local | `release/stable-build-2026-05-23` | 51f76a63c | 0 | 4909 | 2026-05-23 | — | no unique commits (reachable from HEAD) |
| local | `release/stable-build-2026-05-24` | 20ea6793f | 0 | 4904 | 2026-05-24 | — | no unique commits (reachable from HEAD) |
| local | `worktree-agent-a037a0f903c2f233a` | af199d089 | 0 | 4949 | 2026-05-03 | — | no unique commits (reachable from HEAD) |
| local | `worktree-agent-a2db3d88` | 361443dac | 0 | 4997 | 2026-04-01 | — | no unique commits (reachable from HEAD) |
| local | `worktree-agent-a6e5a8227051149b9` | af199d089 | 0 | 4949 | 2026-05-03 | — | no unique commits (reachable from HEAD) |
| local | `worktree-agent-a70188f4243bb73ce` | af199d089 | 0 | 4949 | 2026-05-03 | — | no unique commits (reachable from HEAD) |
| local | `worktree-agent-af0e13c27c9f91a6b` | af199d089 | 0 | 4949 | 2026-05-03 | — | no unique commits (reachable from HEAD) |
| local | `worktree-agent-af47514dd731dc686` | af199d089 | 0 | 4949 | 2026-05-03 | — | no unique commits (reachable from HEAD) |
| local | `worktree-agent-afc98d8feb7f5960f` | f0eccd609 | 0 | 4014 | 2026-07-03 | — | no unique commits (reachable from HEAD) |

## Ограничения
- «Владелец worktree / PR» в git не хранится: указан путь worktree, PR не сопоставлялись (нужен доступ к GitHub API — не выполнялся).
- Ветки с ahead > 0 могут нести уникальную работу: перед любым удалением — архив по PM-241 и список от владельца (PM-242). Этот документ ничего не рекомендует удалять.
- Незакоммиченные изменения общего дерева принадлежат нескольким параллельным сессиям; групповой откат/очистка запрещены.
