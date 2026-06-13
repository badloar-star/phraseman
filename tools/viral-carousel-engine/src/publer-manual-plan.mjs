import fs from "fs";
import path from "path";

const DEFAULT_BATCH = "output/viral_ru_en_50_2026-06-12";
const DEFAULT_HOURS = [9, 13, 17, 20];
const PROVIDERS = ["instagram", "threads", "tiktok", "facebook", "linkedin", "twitter", "pinterest", "telegram", "mastodon", "bluesky", "google"];

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function csvEscape(value = "") {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function scheduleAt(startDate, index, perDay, tzOffset) {
  const dayOffset = Math.floor(index / perDay);
  const slot = index % perDay;
  const date = addDays(startDate, dayOffset);
  const hour = DEFAULT_HOURS[slot] ?? 9;
  return `${isoDate(date)}T${String(hour).padStart(2, "0")}:00:00${tzOffset}`;
}

function main() {
  const args = parseArgs();
  const batchDir = path.resolve(args.batch || DEFAULT_BATCH);
  const postsPath = path.join(batchDir, "posts.json");
  const data = JSON.parse(fs.readFileSync(postsPath, "utf8"));
  const startDate = args.start ? new Date(`${args.start}T00:00:00Z`) : addDays(new Date(), 1);
  const perDay = Number(args["per-day"] || 4);
  const tzOffset = args["tz-offset"] || "+01:00";
  const outDir = path.join(batchDir, "publer");
  fs.mkdirSync(outDir, { recursive: true });

  const rows = [["Provider", "Date", "Text", "Local Folder", "Media Count", "Note"]];
  for (const provider of PROVIDERS) {
    for (let i = 0; i < data.posts.length; i += 1) {
      const post = data.posts[i];
      rows.push([
        provider,
        scheduleAt(startDate, i, perDay, tzOffset),
        post.caption,
        `post_${post.post_id}`,
        "8",
        "YouTube excluded. API blocked by Publer plan; use this as manual schedule/import checklist.",
      ]);
    }
  }

  const csvPath = path.join(outDir, "manual_schedule_4_per_day_no_youtube.csv");
  fs.writeFileSync(csvPath, toCsv(rows), "utf8");

  const mdPath = path.join(outDir, "api_blocked_manual_plan.md");
  fs.writeFileSync(
    mdPath,
    [
      "# Publer API Blocked: Manual Schedule Plan",
      "",
      "Publer API returned: `Please upgrade to Business to access our API.`",
      "",
      "Because of that, automatic discovery of connected social accounts, Publer best-times analytics, media upload, and scheduling cannot be completed through the API on the current plan/key.",
      "",
      "Generated fallback:",
      "",
      `- CSV: ${csvPath}`,
      `- Batch: ${batchDir}`,
      "- Cadence: 4 posts/day",
      "- Networks listed: Instagram, Threads, TikTok, Facebook, LinkedIn, X/Twitter, Pinterest, Telegram, Mastodon, Bluesky, Google Business",
      "- Excluded: YouTube",
      "",
      "Recommended next action: upgrade/enable Publer API access, then rerun:",
      "",
      "```bash",
      "npm run carousel:publer -- --apply",
      "```",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Manual CSV: ${csvPath}`);
  console.log(`Report: ${mdPath}`);
}

main();
