# BUYER RADAR Run 2026-06-26

This folder is a manual-first MVP run for BUYER RADAR, the Phraseman buyer-search revenue intelligence pipeline.

## Workflow

1. Add real buyer-intent signals to `market_signals.jsonl`.
2. Edit or add pain clusters in `pain_clusters.json`.
3. Run `npm run buyer-radar:score -- --date 2026-06-26`.
4. Run `npm run buyer-radar:package -- --date 2026-06-26 --top 3`.
5. Fill hooks, first 3 seconds, bodies, CTAs, and publish times.
6. Add funnel outcomes to `funnel_results.json`.
7. Run `npm run buyer-radar:report -- --date 2026-06-26`.
8. Run `npm run buyer-radar:check -- --date 2026-06-26`.

## JSONL market signal example

```json
{"signalId":"sig_20260626_001","source":"app_store_review","sourceUrl":"https://example.com","rawText":"I paid because I need English for work calls.","language":"en","competitor":"example","detectedPain":"needs English for work","purchaseIntent":"high","sentiment":"mixed","collectedAt":"2026-06-26T09:00:00Z"}
```

Keep personal data out of this folder. Store campaign behavior, not user identity.
