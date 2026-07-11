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
