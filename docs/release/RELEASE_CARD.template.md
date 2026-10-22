# Release card

Copy this file to `.release-card.md` before running `npm run update:gate` or any `npm run eas:update:*` command.

## Type

fix | feature | polish

## Goal

What single outcome does this update deliver?

## Allowed changes

-

## Forbidden changes

-

## Risk level

low | medium | high — explain why.

## Manual tests

- Smoke:
- Regression area:
- Upgrade from previous version:
- User type(s): new / existing free / existing paid / restore / poor network
- Platform-specific checks:
- Performance check:

## Diff review

- Why is every changed file needed?
- What can break?
- How will it be checked manually?

## Release evidence

- [ ] Automated gate passed
- [ ] Smoke passed
- [ ] Regression passed
- [ ] Upgrade passed
- [ ] Beta/TestFlight passed
- [ ] Freeze applied; only critical fixes allowed
- [ ] Rollout and 24h monitoring plan ready
- [ ] Store build from a new code base has its OWN `runtimeVersion` in app.json (e.g. 2.0.1 / 2.1.0), never the one already live. Same runtime + channel `production` = every OTA for the old build also lands on the new one and rolls its JS back (22.10: builds 139–143 all on runtime 2.0.0).
