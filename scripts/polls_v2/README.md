# Home Polls v2 production preparation

Run from the repository root with Application Default Credentials. These commands are intentionally separate so the export can be reviewed before any write.

```powershell
node scripts/polls_v2/export_daily_polls.mjs --project=phraseman-ea0b3 --out=docs/work/polls-export-1018/daily_polls.json
node scripts/polls_v2/seed_home_polls_v2.mjs --project=phraseman-ea0b3
node scripts/polls_v2/delete_daily_polls.mjs --project=phraseman-ea0b3 --export=docs/work/polls-export-1018/daily_polls.json
```

After checking the export and both dry-run summaries, the explicitly authorized apply commands are:

```powershell
node scripts/polls_v2/seed_home_polls_v2.mjs --project=phraseman-ea0b3 --apply --confirm=SEED_HOME_POLLS_V2
node scripts/polls_v2/delete_daily_polls.mjs --project=phraseman-ea0b3 --export=docs/work/polls-export-1018/daily_polls.json --apply --confirm=DELETE_DAILY_POLLS_AFTER_EXPORT
```

Deployments remain separate and manual. Do not run either apply command until the export exists and has been retained.
The export contains account-linked legacy vote rows: keep it in the ignored local export directory, never commit it, and retain it according to the privacy policy. The delete script refuses to proceed if any parent document or vote differs from that exact export; apply first fences every poll against new votes and deletes only the exported `votes` documents (no recursive deletion of unknown data).
