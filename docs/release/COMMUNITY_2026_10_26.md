# iOS 2.0.3 (147), owner-authorized working snapshot

## Type
feature

## Goal
Deliver the current app changes, including community packs, shared optimistic hearts, monthly contest rules and countdown starting 1 November 2026, through an iOS production build with automatic submission to App Store Connect.

## Allowed changes
Owner explicitly requested all current changes in the build on 26 October 2026. Snapshot of the working tree based on 82cfea233; isolated release checkout preserves original work. iOS buildNumber and Android versionCode both advance from 146 to 147. Backend source is included in Git but is deployed independently; an IPA does not deploy Firebase functions or Rules.

## Forbidden changes
No deletion or stashing of other sessions' work. No fabricated visual evidence or test results. No real reward claims during verification. No secret values committed. No unrequested API spending.

## Risk level
High: broad current working snapshot; contest rewards and access contracts require coordinated server rollout. Visual registry precheck failed with stale, pending and differing evidence; owner explicitly waived visual comparison and instructed build launch. This waiver does not assert visual parity or a passing visual gate.

## Manual tests
Six isolated native review states were captured with enabled Back buttons. Countdown and monthly rollover: 15 focused tests passed; reward and Plus: 11 focused server tests passed. Static keys, store routes, release-content parity, audio coverage, excluded resource imports and store stubs passed in the source checkout. Native build gates passed locally for iOS 147 with documented placeholder RevenueCat prefix solely for version-gate testing; real build credentials come from EAS production. Full visual parity is unproven.
