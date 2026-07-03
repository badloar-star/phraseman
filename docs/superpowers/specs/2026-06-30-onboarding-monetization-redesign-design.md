# Phraseman Onboarding Monetization Redesign

Date: 2026-06-30

## Goal

Make onboarding shorter, clearer, more branded, and stronger for monetization without feeling pushy. The user should choose a language, tell Phraseman their goal, taste the method, see a concrete plan promise, then hit the full app paywall.

## Approved Flow

1. Study target: English or French.
2. Goal: routes to the canonical personal plan.
3. Level: tunes difficulty, does not replace the plan chosen by goal.
4. Time per day: tunes pacing and pending activation.
5. Mini-aha: a short method sample with listening, meaning, and phrase-building mechanics.
6. Plan ready: shows plan name, route, time promise, and first-day preview.
7. Full paywall: existing A/B/C paywall with onboarding source and onboarding-only midnight liquid chrome.
8. Name.
9. Age wheel and consent.

## Removed From Onboarding

- Streak screen.
- Auth screen.
- "Just look at the app" branch.
- Old illustrated background dependency for the new route.

Auth is deferred. On day 2, Compass may show an account-linking modal only if the user is still anonymous and has not discovered login by themselves.

## Routing

Goal maps to the existing personal plan resolver:

- Series -> Echo.
- Everyday -> Impuls.
- Travel -> Voyazh.
- Words -> Gavan.
- Mind -> Mitap.

The implementation must reuse `resolvePersonalPlanForGoal` and pending personal plan activation instead of duplicating plan logic.

## Mini-Aha

One phrase is not enough. The aha screen should be one compact scenario with 2-3 actions:

- hear the phrase / meaning;
- choose the natural reply;
- build a short answer from chips.

This should feel like the product method, not a decorative quote.

## Paywall

Use the existing A/B/C paywalls and purchase flow. The onboarding CTA opens the paywall with `source=onboarding_plan` and `context=personal_plan`.

Only onboarding-specific chrome changes:

- midnight palette;
- liquid dark background;
- blue-violet CTA treatment;
- preserve restore, legal disclosure, trial timeline, price cards, sticky CTA, and continue-free return behavior.

## Consent

Use one checkbox for Terms of Use and Privacy Policy acknowledgement. Keep analytics as a separate optional choice because it is a different consent category. Age remains a wheel picker.

## Copy Rules

Use Phraseman voice:

- address the user as "ты";
- short gain-framed sentences;
- avoid technical language;
- avoid "купить", "стоимость", "цена" in onboarding screens;
- keep paywall legal copy intact where required by stores.

## Design Direction

Use the "Полночь" palette: black base, soft white text, electric blue and violet accents. Buttons use a friendly blue-violet gradient. Cards are liquid glass, symmetric, and stable. Logo appears in the onboarding route.

