import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const API_BASE = "https://app.publer.com/api/v1";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CTA_HASHTAGS = "#английский #английскийязык #разговорныйанглийский #phrases #Phraseman";
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
const DEFAULT_RATE_LIMIT_RETRY_MS = 65_000;
const DEFAULT_API_RETRIES = 6;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
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
    if (!process.env[key]) {
      process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
    }
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

function sanitizeForReport(value) {
  if (!value) return value;
  return String(value).replace(/[A-Za-z0-9_-]{24,}/g, (match) => `${match.slice(0, 6)}…${match.slice(-4)}`);
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

  const retries = Number(process.env.PUBLER_API_RETRIES || DEFAULT_API_RETRIES);
  const retryMs = Number(process.env.PUBLER_RATE_LIMIT_RETRY_MS || DEFAULT_RATE_LIMIT_RETRY_MS);
  for (let attempt = 0; attempt <= retries; attempt += 1) {
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
    if (response.status === 429 && attempt < retries) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : retryMs;
      console.log(`RATE_LIMIT ${method} ${pathname}; retry ${attempt + 1}/${retries} in ${Math.round(waitMs / 1000)}s`);
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

async function listWorkspaces() {
  const data = await api("/workspaces");
  return Array.isArray(data) ? data : data?.workspaces || data?.data || [];
}

async function listAccounts(workspaceId) {
  const data = await api("/accounts", { workspaceId });
  const accounts = Array.isArray(data) ? data : data?.accounts || data?.data || [];
  return accounts.filter((account) => account?.provider && account.provider !== "youtube");
}

async function bestTimes(workspaceId, accountId, from, to) {
  try {
    const query = new URLSearchParams({ from, to }).toString();
    const data = await api(`/analytics/${accountId}/best_times?${query}`, { workspaceId });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, status: error.status, data: error.data };
  }
}

function topHoursForDay(heatmap, dayName, count = 4) {
  const scores = Array.isArray(heatmap?.[dayName]) ? heatmap[dayName] : [];
  if (!scores.length) return FALLBACK_HOURS.slice(0, count);
  const ranked = scores
    .map((score, hour) => ({ hour, score: Number(score) || 0 }))
    .filter(({ hour }) => hour >= 6 && hour <= 22)
    .sort((a, b) => b.score - a.score || a.hour - b.hour)
    .slice(0, count)
    .map(({ hour }) => hour)
    .sort((a, b) => a - b);
  if (ranked.length >= count) return ranked;
  return [...ranked, ...FALLBACK_HOURS].filter((hour, index, all) => all.indexOf(hour) === index).slice(0, count);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function scheduleTimestamp(date, hour, minute = 0, tzOffset = "+01:00") {
  return `${isoDate(date)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${tzOffset}`;
}

function scheduleSlots(startDate, postsCount, heatmap, perDay, tzOffset) {
  const slots = [];
  for (let index = 0; index < postsCount; index += 1) {
    const dayOffset = Math.floor(index / perDay);
    const position = index % perDay;
    const date = addDays(startDate, dayOffset);
    const dayName = DAY_NAMES[date.getUTCDay()];
    const hours = topHoursForDay(heatmap, dayName, perDay);
    const minute = FALLBACK_MINUTES[position % FALLBACK_MINUTES.length] ?? 0;
    slots.push({
      scheduled_at: scheduleTimestamp(date, hours[position] ?? FALLBACK_HOURS[position] ?? 9, minute, tzOffset),
      day: dayName,
      hour: hours[position] ?? FALLBACK_HOURS[position] ?? 9,
      minute,
    });
  }
  return slots;
}

function captionFor(post) {
  const raw = post.caption || "";
  if (raw.includes("#")) return raw;
  return `${raw}\n\n${CTA_HASHTAGS}`;
}

function postDirs(batchDir) {
  return fs
    .readdirSync(batchDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("post_"))
    .map((entry) => entry.name)
    .sort();
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
  const type = TYPE_BY_PROVIDER[provider] || "photo";
  const media = mediaForProvider(uploaded, provider);
  const network = {
    type,
    text: captionFor(post),
    media,
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

async function scheduleOne(workspaceId, account, post, uploaded, scheduledAt) {
  const provider = account.provider;
  const body = {
    bulk: {
      state: "scheduled",
      posts: [
        {
          networks: {
            [provider]: buildNetwork(provider, post, uploaded),
          },
          accounts: [
            {
              id: account.id,
              scheduled_at: scheduledAt,
            },
          ],
        },
      ],
    },
  };
  return api("/posts/schedule", { method: "POST", workspaceId, body });
}

async function main() {
  const args = parseArgs();
  loadEnvFile(path.resolve(".env.local"));
  loadEnvFile(path.resolve(".env"));

  if (!process.env.PUBLER_API_KEY) {
    throw new Error("Missing PUBLER_API_KEY");
  }

  const batchDir = path.resolve(args.batch || "output/viral_ru_en_50_2026-06-12");
  const postsFile = path.join(batchDir, "posts.json");
  const postsData = readJson(postsFile, null);
  if (!postsData?.posts?.length) throw new Error(`Missing posts data: ${postsFile}`);

  const reportDir = path.join(batchDir, "publer");
  ensureDir(reportDir);
  const cachePath = path.join(reportDir, "media_cache.json");
  const scheduleReportPath = path.join(reportDir, "schedule_report.json");
  const mediaCache = readJson(cachePath, {});
  const previousReport = args.apply ? readJson(scheduleReportPath, null) : null;
  const report = {
    created_at: new Date().toISOString(),
    batch: path.basename(batchDir),
    mode: args.apply ? "apply-resume" : "discover",
    workspaces: [],
    scheduled: previousReport?.scheduled || [],
    failures: [],
    best_times: {},
  };
  const alreadyScheduled = new Set(
    report.scheduled.map((item) => `${item.account_id}:${item.post_id}`),
  );

  const workspaces = await listWorkspaces();
  if (!workspaces.length) throw new Error("No Publer workspaces returned");

  const workspace = args.workspace
    ? workspaces.find((item) => item.id === args.workspace)
    : workspaces[0];
  if (!workspace) throw new Error(`Workspace not found: ${args.workspace}`);

  const accounts = await listAccounts(workspace.id);
  report.workspaces.push({
    id: workspace.id,
    name: workspace.name,
    plan: workspace.plan,
    accounts: accounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      name: account.name,
      type: account.type,
    })),
  });

  const today = new Date();
  const analyticsTo = args.to || isoDate(today);
  const analyticsFrom = args.from || isoDate(addDays(today, -90));
  const startDate = args.start ? new Date(`${args.start}T00:00:00Z`) : addDays(today, 1);
  const perDay = Number(args["per-day"] || 4);
  const tzOffset = args["tz-offset"] || "+01:00";

  for (const account of accounts) {
    const best = await bestTimes(workspace.id, account.id, analyticsFrom, analyticsTo);
    report.best_times[account.id] = {
      provider: account.provider,
      name: account.name,
      ok: best.ok,
      status: best.status,
      top_slots: {},
    };
    const heatmap = best.ok ? best.data : null;
    for (const day of DAY_NAMES) {
      report.best_times[account.id].top_slots[day] = topHoursForDay(heatmap, day, perDay);
    }
  }

  if (!args.apply) {
    writeJson(scheduleReportPath, report);
    console.log(`DISCOVER_OK workspace=${workspace.name || workspace.id} accounts=${accounts.length}`);
    console.log(`Report: ${scheduleReportPath}`);
    return;
  }

  const dirs = postDirs(batchDir);
  const postsById = new Map(postsData.posts.map((post) => [post.post_id, post]));
  const maxNeeded = Math.max(...accounts.map((account) => MEDIA_LIMITS[account.provider] || 8), 8);

  for (const account of accounts) {
    const best = report.best_times[account.id];
    const heatmap = best?.ok ? (await bestTimes(workspace.id, account.id, analyticsFrom, analyticsTo)).data : null;
    const slots = scheduleSlots(startDate, dirs.length, heatmap, perDay, tzOffset);

    for (let i = 0; i < dirs.length; i += 1) {
      const dir = dirs[i];
      const postId = dir.replace("post_", "");
      const post = postsById.get(postId);
      if (!post) continue;
      const scheduledKey = `${account.id}:${postId}`;
      if (alreadyScheduled.has(scheduledKey)) {
        console.log(`SKIP_ALREADY_SCHEDULED ${account.provider}/${account.name || account.id} post_${postId}`);
        continue;
      }
      const postDir = path.join(batchDir, dir);

      try {
        const uploaded = await uploadCarouselMedia(workspace.id, postDir, mediaCache, maxNeeded);
        writeJson(cachePath, mediaCache);
        const result = await scheduleOne(workspace.id, account, post, uploaded, slots[i].scheduled_at);
        report.scheduled.push({
          account_id: account.id,
          provider: account.provider,
          account_name: account.name,
          post_id: postId,
          scheduled_at: slots[i].scheduled_at,
          media_count: mediaForProvider(uploaded, account.provider).length,
          job_id: result?.job_id || result?.data?.job_id || result?.data?.id || null,
          result,
        });
        alreadyScheduled.add(scheduledKey);
        console.log(`SCHEDULED ${account.provider}/${account.name || account.id} post_${postId} ${slots[i].scheduled_at}`);
      } catch (error) {
        report.failures.push({
          account_id: account.id,
          provider: account.provider,
          account_name: account.name,
          post_id: postId,
          scheduled_at: slots[i]?.scheduled_at,
          status: error.status,
          error: error.message,
          data: error.data,
        });
        console.log(`FAILED ${account.provider}/${account.name || account.id} post_${postId} ${error.status || ""}`);
      }
      writeJson(scheduleReportPath, report);
    }
  }

  writeJson(scheduleReportPath, report);
  console.log(`DONE scheduled=${report.scheduled.length} failures=${report.failures.length}`);
  console.log(`Report: ${scheduleReportPath}`);
  console.log(`Workspace: ${sanitizeForReport(workspace.name || workspace.id)}`);
}

main().catch((error) => {
  console.error(error.message);
  if (error.data) console.error(JSON.stringify(error.data, null, 2));
  process.exit(1);
});
