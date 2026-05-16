# POS Analytics QA

## Machine Gate

Run before release:

```bash
npm run audit:pre-release
```

POS-only check:

```bash
npm run audit:pos
```

The POS gate fails if any lesson token resolves to:

- `other`
- `unknown`
- low confidence

Current expected status:

- 7838 lesson tokens
- 100% resolved
- 0 unresolved
- 0 unknown-source
- 0 low-confidence

## App QA Screen

Open the dev-only POS audit screen:

```bash
phraseman:///pos_analytics_audit
```

The screen shows:

- full lesson corpus release coverage
- POS source distribution
- POS category distribution
- runtime mistake event quality
- legacy vs exact mistake events

## Maestro Smoke

With Metro and Android dev-client running:

```bash
npm run maestro:pos-audit
```

This opens `/pos_analytics_audit`, asserts `pos-audit-release-ready`, and captures:

- `pos_audit_release_coverage.png`
- `pos_audit_coverage_sources.png`
- `pos_audit_runtime_events.png`

If the dev-client is already on Home, the flow navigates through Settings -> Testers -> POS audit. Avoid generic
`Continue` taps in this flow: Expo dev-client also exposes English continue-style controls, and tapping them can move
the test away from the app shell.
