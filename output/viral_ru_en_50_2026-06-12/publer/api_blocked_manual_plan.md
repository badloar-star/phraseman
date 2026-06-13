# Publer API Blocked: Manual Schedule Plan

Publer API returned: `Please upgrade to Business to access our API.`

Because of that, automatic discovery of connected social accounts, Publer best-times analytics, media upload, and scheduling cannot be completed through the API on the current plan/key.

Generated fallback:

- CSV: C:\appsprojects\phraseman\output\viral_ru_en_50_2026-06-12\publer\manual_schedule_4_per_day_no_youtube.csv
- Batch: C:\appsprojects\phraseman\output\viral_ru_en_50_2026-06-12
- Cadence: 4 posts/day
- Networks listed: Instagram, Threads, TikTok, Facebook, LinkedIn, X/Twitter, Pinterest, Telegram, Mastodon, Bluesky, Google Business
- Excluded: YouTube

Recommended next action: upgrade/enable Publer API access, then rerun:

```bash
npm run carousel:publer -- --apply
```
