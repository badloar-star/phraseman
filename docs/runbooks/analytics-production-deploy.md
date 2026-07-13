# Analytics production deploy

This release is intentionally limited to the analytics Functions and Admin v2 Hosting.

## Required local configuration

Create `functions/.env.phraseman-ea0b3` locally. It must remain ignored and untracked. The analytics keys are:

```dotenv
ANALYTICS_BIGQUERY_DATASET=phraseman-ea0b3.analytics_532376954
ANALYTICS_BIGQUERY_LOCATION=US
```

Do not paste secrets into tickets, pull requests, terminal output, or this file. Preserve any other production Function environment values through the normal secured local deploy environment.

## Preflight

```powershell
npm run analytics:deploy:preflight
npm run scan:secrets:staged
npm run analytics:privacy:staged
```

The preflight prints only configuration status, never environment values.

## Deployment scope

Deploy from the exact reviewed and merged commit:

```powershell
npm --prefix functions ci --ignore-scripts
npm --prefix functions run build
npm run analytics:deploy:preflight
firebase deploy --project phraseman-ea0b3 --only "functions:adminProductAnalytics,functions:adminSubscriptionAnalytics,functions:adminMonthlyDecisionPack,functions:revenueCatShardsWebhook"
npm run hosting:admin -- --project phraseman-ea0b3
```

The explicit build is mandatory because Functions deploys `functions/lib/index.js` and this repository does not commit generated `functions/lib` output or define a Firebase Functions predeploy hook. Do not include Firestore rules, indexes, other Functions, or a mobile update in this release.

## Post-deploy checks

- Authenticate as an administrator and call each analytics callable.
- Download the monthly ZIP, verify its SHA-256, ZIP signature, 18-file manifest, and privacy validation.
- Confirm Admin v2 and its analytics JavaScript return HTTP 200.
- Review recent Function logs for permission, BigQuery, timeout, and serialization errors.
