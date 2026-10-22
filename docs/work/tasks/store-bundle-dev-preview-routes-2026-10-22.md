# Task packet: cut dev preview routes out of the store bundle (router.ctx.js) + guard

Governance-ID: TG-2153CFC85DC7
Status: In progress
Owner: 3 · МАКЕТЫ (request from 0 · КООРДИНАТОР, Ревизор 3.157, 22.10)
Related epic/enabler: dev routes dev_home_scene_preview (8ce263b5f), dev_dialogs_scene_preview, dev_today_scene_preview, dev_season_preview

## Outcome

Store builds (EXPO_PUBLIC_STORE_RELEASE=1) no longer bundle the dev preview screens and their fixtures: every app/dev_*.tsx route that only exists for development is in the store exclusion regex of router.ctx.js. A guard test fails when a new app/dev_*.tsx route appears without being excluded (or explicitly allow-listed with a reason).

## Scope

In scope: router.ctx.js (store branch regex only), a new guard test, the list of all current app/dev_*.tsx routes.
Out of scope: the dev branch of router.ctx.js, bundler config stubs, non-dev routes, runtime Redirect guards inside the routes (kept as a second fence).

## Architecture

router.ctx.js picks the route context at build time by EXPO_PUBLIC_STORE_RELEASE; the store regex has a negative lookahead list of dev/admin route basenames. Adding names there removes the files from the store bundle; the routes keep their runtime Redirect for any other non-dev build. No other boundary changes.

## Security and privacy

Reduces store attack surface and bundle size (dev screens and fixtures not shipped). No data or permission change.

## Technical debt

- Pay now: the four preview routes + any other unlisted dev_* routes.
- Contain: guard test keeps future dev_* routes from leaking.

## Verification

Node-only checks (no heavy tools, PC low on memory): the guard test with node --test; a regex self-check that every app/dev_*.tsx basename is rejected by the store regex and that normal routes (home, index, (tabs)/…) are still accepted.

## Rollback

Revert the commit; routes keep their runtime Redirect, so behaviour in store builds stays safe either way.
