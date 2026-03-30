# Claude Code Configuration - Phraseman

## 📚 About Phraseman

**What:** React Native English learning app for Russian/Ukrainian speakers (iOS + Android).
**Users:** 18-50 y.o. from post-Soviet countries learning business English or English for travel/work.
**Monetization:** RevenueCat subscription (€3.99/mo, €23.99/yr). Freemium: A1+A2 free, B1+B2 premium.
**Content:** 32 lessons (grammar progression), vocabulary, irregular verbs, quizzes, dialogs, cards, level exams, final exam, diagnostic test.
**Status (Mar 2026):** Beta. Phase 1 complete (energy system, personal plans, Phrasemen currency). Moving to Phase 2 (Variable Reward, Push notifications).

**Key files:**
- `app/lesson1.tsx` — lesson engine (1000+ lines)
- `app/energy_system.ts` — energy mechanic (NEW)
- `app/phrasemen_system.ts` — currency system (NEW)
- `app/league_engine.ts` — 12 clubs, weekly ranking
- `constants/theme.ts` — colors & themes
- `components/LangContext.tsx` — RU/UK localization

**Phase 1 Progress (Mar 29, 2026):**
- ✅ Paywall enabled (DEV_MODE = false)
- ✅ Energy system (5 max, -1/lesson, +1/2h)
- ✅ Phrasemen currency (13 shop items, 5 earning methods)
- ✅ Onboarding with personal plan ("B1 through 120 days")
- ✅ All systems tested (11 + 15 + 73 + 15 tests = 114 passing)

**Next (Phase 2):**
- Variable Reward (random XP bonuses, daily treasure)
- Push notifications (phrase of day, streak reminders)
- Firebase league integration (real opponents)
- Group boosters (club members buy for all)
- Referral program

---

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files

## File Organization

- NEVER save to root folder
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files

## Build & Test

```bash
npm run build
npm test
npm run lint
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries

## Concurrency

- Batch ALL file reads/writes/edits in ONE message
- Batch ALL Bash commands in ONE message
