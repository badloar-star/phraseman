# Analytics deployment configuration

Production analytics functions are deployed to Firebase project `phraseman-ea0b3`.
Before every deploy, create the untracked file
`functions/.env.phraseman-ea0b3` with these non-secret runtime settings:

```dotenv
ANALYTICS_BIGQUERY_DATASET=phraseman-ea0b3.analytics_532376954
ANALYTICS_BIGQUERY_LOCATION=US
```

Run `npm run analytics:deploy:preflight` before deployment; the command rejects
missing, tracked, or mismatched settings. After deployment, invoke a protected
analytics callable with a real Firebase admin ID token as the runtime smoke check.

For a staging project, use its own `.env.<project-id>` and its own BigQuery dataset.
Do not reuse production tokens or datasets across projects.

CI verifies the Functions package with `npx jest --ci`; run the same command locally
when changing an analytics callable or its shared aggregation code.
