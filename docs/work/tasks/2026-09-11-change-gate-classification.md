# Task packet: Change-to-gate classification

Governance-ID: MANUAL-2026-09-11-CHANGE-GATE-CLASSIFICATION  
Status: Complete locally / observe-only  
Owner: Codex session requested by product owner  
Related epic/enabler: E3 / EN-3.1

## Outcome

Create a deterministic, read-only classifier that maps changed files to universal quality checks, domain gate packs and independent-review requirements before CI blocking is considered.

## Scope

In scope: `config/change-gate-matrix.json`, `scripts/select_change_gates.mjs`, focused tests and a non-blocking workflow observation step if its current CI contract permits it. Out of scope: changing test semantics, suppressing existing gates, enforcing blocking before a review window, production/deploy changes, and broad repository scans.

## Architecture

Universal checks always apply. Domain packs are selected by explicit path patterns and critical domains (auth/privacy, economy, admin mutations, release) require an independent review marker. Unknown paths select a conservative `manual-triage` pack instead of silently receiving no checks. Output is a deterministic JSON plan suitable for a later CI observation artifact.

## Security and privacy

The classifier reads filenames only; it must not read file contents, secrets or production metadata. A filename cannot grant an exception or downgrade a critical pack.

## Technical debt

Pay now: change-to-gate mapping is currently implicit in workflow files and tribal knowledge. Contain: initial mode is observe-only and records selected packs. Accept temporarily: false-positive/false-negative rates require a review period and owner sign-off before blocking.

## Verification

Completed with 5/5 focused cases passing. The selector always emits universal checks, selects critical independent review, fails closed for unknown paths/CLI and the matrix parses successfully. `.github/workflows/source-quality.yml` now runs the selector as a non-blocking observe-only job; no blocking policy is enabled. A review window is still required before enforcement.

## Rollback

Remove the matrix, selector, tests and any observation-only workflow step. No runtime or production state changes.
