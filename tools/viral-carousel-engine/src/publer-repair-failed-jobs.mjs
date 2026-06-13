import fs from "fs";
import path from "path";

const API_BASE = "https://app.publer.com/api/v1";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MEDIA_LIMITS = {
  twitter: 4,
  mastodon: 4,
  pinterest: 5,
  instagram: 10,
  tiktok: 35,
  threads: 20,
  linkedin: 20,
  telegram: 10,
  facebook: 10,
  bluesky: 4,
  google: 1,
};
const TYPE_BY_PROVIDER = {
  instagram: "photo",
  tiktok: "photo",
  pinterest: "carousel",
  facebook: "photo",
  linkedin: "photo",
  twitter: "photo",
  threads: "photo",
  telegram: "photo",
  mastodon: "photo",
  bluesky: "photo",
  google: "photo",
};
const FALLBACK_HOURS = [8, 10, 12, 15, 19, 21];
const FALLBACK_MINUTES = [7, 19, 31, 43, 55, 11];
const CTA_HASHTAGS = "#английский #английскийязык #разговорныйанглийский #phrases #Phraseman";

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

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(pathname, { method = "GET", workspaceId, body, formData } = {}) {
  const headers = {
    Authorization: `Bearer-API ${process.env.PUBLER_API_KEY}`,
    Accept: "application/json",
  };
  if (workspaceId) headers["Publer-Workspace-Id"] = workspaceId;
  if (body) headers["Content-Type"] = "application/json";

  for (let attempt = 0; attempt <= 6; attempt += 1) {
    const response = await fetch(`${API_BASE}${pathname}`, {
      method,
      headers,
      body: formData || (body ? JSON.stringify(body) : undefined),
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (response.ok) return data;
    if (response.status === 429 && attempt < 6) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 65_000;
      console.log(`RATE_LIMIT ${method} ${pathname}; retry ${attempt + 1}/6 in ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
      continue;
    }
    const error = new Error(`Publer API ${method} ${pathname} failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  throw new Error(`Publer API ${method} ${pathname} failed after retries`);
}

function hasJobFailures(status) {
  const failures = status?.payload?.failures;
  if (!failures || typeof failures !== "object") return false;
  return Object.values(failures).some((items) => Array.isArray(items) && items.length > 0);
}

async function jobStatus(workspaceId, jobId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await api(`/job_status/${jobId}`, { workspaceId });
    if (status?.status === "complete" || status?.status === "failed") return status;
    await sleep(1500);
  }
  throw new Error(`Timed out waiting for job ${jobId}`);
}

function captionFor(post) {
  const raw = post.caption || "";
  if (raw.includes("#")) return raw;
  return `${raw}\n\n${CTA_HASHTAGS}`;
}

async function uploadMediaFile(workspaceId, filePath) {
  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  const blob = new Blob([buffer], { type: "image/png" });
  form.append("file", blob, path.basename(filePath));
  form.append("direct_upload", "false");
  form.append("in_library", "true");
  return api("/media", { method: "POST", workspaceId, formData: form });
}

async function uploadCarouselMedia(workspaceId, postDir, cache, maxNeeded = 8) {
  const slides = fs
    .readdirSync(postDir)
    .filter((file) => /^slide_\d+\.png$/.test(file))
    .sort()
    .slice(0, maxNeeded);
  const uploaded = [];
  for (const slide of slides) {
    const filePath = path.join(postDir, slide);
    const cacheKey = path.relative(process.cwd(), filePath).replaceAll("\\", "/");
    if (!cache[cacheKey]) {
      const media = await uploadMediaFile(workspaceId, filePath);
      cache[cacheKey] = {
        id: media.id,
        type: media.type || "photo",
        path: media.path,
        thumbnail: media.thumbnail,
        width: media.width,
        height: media.height,
        name: media.name,
      };
    }
    uploaded.push(cache[cacheKey]);
  }
  return uploaded;
}

function mediaForProvider(uploaded, provider) {
  const limit = MEDIA_LIMITS[provider] || 8;
  return uploaded.slice(0, limit).map((media, index) => ({
    id: media.id,
    type: media.type || "photo",
    path: media.path,
    caption: `Phraseman English carousel slide ${index + 1}`,
    alt_text: `Phraseman English carousel slide ${index + 1}`,
  }));
}

function buildNetwork(provider, post, uploaded) {
  const network = {
    type: TYPE_BY_PROVIDER[provider] || "photo",
    text: captionFor(post),
    media: mediaForProvider(uploaded, provider),
  };
  if (provider === "pinterest") {
    network.title = post.slides?.[0]?.title?.replace(/\s+/g, " ").slice(0, 95) || "Phraseman English";
  }
  if (provider === "tiktok") {
    network.title = post.slides?.[0]?.title?.replace(/\s+/g, " ").slice(0, 88) || "English phrases";
    network.details = {
      privacy: "PUBLIC_TO_EVERYONE",
      auto_add_music: true,
      comment: true,
      promotional: false,
      paid: false,
      reminder: false,
    };
  }
  return network;
}

async function scheduleOne(workspaceId, item, post, uploaded, scheduledAt) {
  const body = {
    bulk: {
      state: "scheduled",
      posts: [
        {
          networks: {
            [item.provider]: buildNetwork(item.provider, post, uploaded),
          },
          accounts: [
            {
              id: item.account_id,
              scheduled_at: scheduledAt,
            },
          ],
        },
      ],
    },
  };
  return api("/posts/schedule", { method: "POST", workspaceId, body });
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function scheduleTimestamp(date, hour, minute, tzOffset) {
  return `${isoDate(date)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${tzOffset}`;
}

function slotForPost(postId, startDate, perDay, tzOffset, attempt = 0) {
  const numeric = Number(postId);
  const index = Number.isFinite(numeric) ? numeric - 1 : 0;
  const dayOffset = Math.floor(index / perDay) + Math.floor(attempt / 12);
  const position = index % perDay;
  const date = addDays(startDate, dayOffset);
  const hour = FALLBACK_HOURS[(position + Math.floor(attempt / 3)) % FALLBACK_HOURS.length] ?? 9;
  const minuteBase = FALLBACK_MINUTES[position % FALLBACK_MINUTES.length] ?? 7;
  const minute = (minuteBase + attempt * 3) % 60;
  return {
    scheduled_at: scheduleTimestamp(date, hour, minute, tzOffset),
    day: DAY_NAMES[date.getUTCDay()],
    hour,
    minute,
  };
}

async function main() {
  const args = parseArgs();
  loadEnvFile(path.resolve(".env.local"));
  loadEnvFile(path.resolve(".env"));
  if (!process.env.PUBLER_API_KEY) throw new Error("Missing PUBLER_API_KEY");

  const batchDir = path.resolve(args.batch || "output/carousel_original_style_validated_50_2026-06-12");
  const reportDir = path.join(batchDir, "publer");
  const scheduleReportPath = path.join(reportDir, "schedule_report.json");
  const repairReportPath = path.join(reportDir, "schedule_repair_report.json");
  const cachePath = path.join(reportDir, "media_cache.json");
  const postsData = readJson(path.join(batchDir, "posts.json"), null);
  const scheduleReport = readJson(scheduleReportPath, null);
  const repairReport = readJson(repairReportPath, {
    created_at: new Date().toISOString(),
    batch: path.basename(batchDir),
    verified_ok: [],
    original_failed: [],
    repaired: [],
    repair_failures: [],
  });
  const mediaCache = readJson(cachePath, {});

  if (!postsData?.posts?.length) throw new Error(`Missing posts.json in ${batchDir}`);
  if (!scheduleReport?.scheduled?.length) throw new Error(`Missing schedule report: ${scheduleReportPath}`);
  const workspaceId = scheduleReport.workspaces?.[0]?.id;
  if (!workspaceId) throw new Error("Missing workspace id in schedule report");

  const perDay = Number(args["per-day"] || 5);
  const tzOffset = args["tz-offset"] || "+01:00";
  const today = new Date();
  const startDate = args.start ? new Date(`${args.start}T00:00:00Z`) : addDays(today, 1);
  const postsById = new Map(postsData.posts.map((post) => [post.post_id, post]));
  const maxNeeded = Math.max(
    ...scheduleReport.workspaces[0].accounts.map((account) => MEDIA_LIMITS[account.provider] || 8),
    8,
  );
  const repairedKeys = new Set(repairReport.repaired.map((item) => `${item.account_id}:${item.post_id}`));
  const okKeys = new Set(repairReport.verified_ok.map((item) => `${item.account_id}:${item.post_id}`));
  const originalFailedKeys = new Set(repairReport.original_failed.map((item) => `${item.account_id}:${item.post_id}`));

  for (const item of scheduleReport.scheduled) {
    const key = `${item.account_id}:${item.post_id}`;
    if (repairedKeys.has(key) || okKeys.has(key)) continue;
    try {
      const status = await jobStatus(workspaceId, item.job_id);
      if (hasJobFailures(status) || status?.status === "failed") {
        if (originalFailedKeys.has(key)) continue;
        repairReport.original_failed.push({ ...item, job_status: status });
        originalFailedKeys.add(key);
        console.log(`ORIGINAL_FAILED ${item.provider}/${item.account_name} post_${item.post_id}`);
      } else {
        repairReport.verified_ok.push({ ...item, job_status: status });
        console.log(`ORIGINAL_OK ${item.provider}/${item.account_name} post_${item.post_id}`);
      }
      writeJson(repairReportPath, repairReport);
      await sleep(250);
    } catch (error) {
      repairReport.original_failed.push({
        ...item,
        verify_error: error.message,
        status: error.status,
        data: error.data,
      });
      originalFailedKeys.add(key);
      writeJson(repairReportPath, repairReport);
      console.log(`VERIFY_FAILED ${item.provider}/${item.account_name} post_${item.post_id}`);
    }
  }

  const failedItemsByKey = new Map();
  for (const item of repairReport.original_failed) {
    const key = `${item.account_id}:${item.post_id}`;
    if (!repairedKeys.has(key) && !okKeys.has(key)) failedItemsByKey.set(key, item);
  }
  const failedItems = [...failedItemsByKey.values()];

  for (const item of failedItems) {
    const key = `${item.account_id}:${item.post_id}`;
    if (repairedKeys.has(key)) continue;
    const post = postsById.get(item.post_id);
    if (!post) {
      repairReport.repair_failures.push({ ...item, error: "Post data not found" });
      writeJson(repairReportPath, repairReport);
      continue;
    }
    const postDir = path.join(batchDir, `post_${item.post_id}`);
    const uploaded = await uploadCarouselMedia(workspaceId, postDir, mediaCache, maxNeeded);
    writeJson(cachePath, mediaCache);

    let repaired = false;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const slot = slotForPost(item.post_id, startDate, perDay, tzOffset, attempt);
      try {
        const result = await scheduleOne(workspaceId, item, post, uploaded, slot.scheduled_at);
        const repairJobId = result?.job_id || result?.data?.job_id || result?.data?.id || null;
        const status = repairJobId ? await jobStatus(workspaceId, repairJobId) : null;
        if (status && (hasJobFailures(status) || status.status === "failed")) {
          console.log(`REPAIR_CONFLICT ${item.provider}/${item.account_name} post_${item.post_id} ${slot.scheduled_at}`);
          await sleep(500);
          continue;
        }
        repairReport.repaired.push({
          account_id: item.account_id,
          provider: item.provider,
          account_name: item.account_name,
          post_id: item.post_id,
          scheduled_at: slot.scheduled_at,
          media_count: mediaForProvider(uploaded, item.provider).length,
          original_job_id: item.job_id,
          repair_job_id: repairJobId,
          job_status: status,
        });
        repairedKeys.add(key);
        writeJson(repairReportPath, repairReport);
        console.log(`REPAIRED ${item.provider}/${item.account_name} post_${item.post_id} ${slot.scheduled_at}`);
        repaired = true;
        break;
      } catch (error) {
        if (error.status === 400 || error.status === 409) {
          await sleep(500);
          continue;
        }
        repairReport.repair_failures.push({
          ...item,
          error: error.message,
          status: error.status,
          data: error.data,
        });
        writeJson(repairReportPath, repairReport);
        console.log(`REPAIR_FAILED ${item.provider}/${item.account_name} post_${item.post_id} ${error.status || ""}`);
        break;
      }
    }
    if (!repaired && !repairedKeys.has(key)) {
      repairReport.repair_failures.push({ ...item, error: "All repair slot attempts failed" });
      writeJson(repairReportPath, repairReport);
    }
  }

  console.log(
    `DONE verified_ok=${repairReport.verified_ok.length} original_failed=${repairReport.original_failed.length} repaired=${repairReport.repaired.length} repair_failures=${repairReport.repair_failures.length}`,
  );
  console.log(`Repair report: ${repairReportPath}`);
}

main().catch((error) => {
  console.error(error.message);
  if (error.data) console.error(JSON.stringify(error.data, null, 2));
  process.exit(1);
});
