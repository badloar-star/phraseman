import fs from "fs";
import path from "path";

const API_BASE = "https://app.publer.com/api/v1";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_BATCH = "output/social_mix_30plus_2026-06-12";
const DEFAULT_RATE_LIMIT_RETRY_MS = 65_000;
const DEFAULT_API_RETRIES = 10;
const DEFAULT_SOCIAL_HOURS = [7, 11, 15, 18, 21];
const EXISTING_CAROUSEL_HOURS = new Set([9, 13, 17, 20]);
const PROVIDERS = new Set(["facebook", "instagram", "threads"]);
const STATUS_PROVIDERS = new Set(["facebook", "threads"]);
const PHOTO_PROVIDERS = new Set(["facebook", "instagram", "threads"]);

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
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
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
  return accounts.filter((account) => PROVIDERS.has(account?.provider));
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

function topHoursForDay(heatmap, dayName, count = 5) {
  const scores = Array.isArray(heatmap?.[dayName]) ? heatmap[dayName] : [];
  if (!scores.length) return DEFAULT_SOCIAL_HOURS;
  const ranked = scores
    .map((score, hour) => ({ hour, score: Number(score) || 0 }))
    .filter(({ hour }) => hour >= 6 && hour <= 23 && !EXISTING_CAROUSEL_HOURS.has(hour))
    .sort((a, b) => b.score - a.score || a.hour - b.hour)
    .slice(0, count)
    .map(({ hour }) => hour)
    .sort((a, b) => a - b);
  return ranked.length >= count ? ranked : DEFAULT_SOCIAL_HOURS;
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

function scheduleSlots(startDate, count, heatmap, perDay, tzOffset) {
  const slots = [];
  for (let index = 0; index < count; index += 1) {
    const dayOffset = Math.floor(index / perDay);
    const position = index % perDay;
    const date = addDays(startDate, dayOffset);
    const dayName = DAY_NAMES[date.getUTCDay()];
    const hours = topHoursForDay(heatmap, dayName, perDay);
    const minutes = [45, 30, 30, 45, 30];
    slots.push({
      scheduled_at: scheduleTimestamp(date, hours[position] ?? DEFAULT_SOCIAL_HOURS[position] ?? 7, minutes[position] ?? 0, tzOffset),
      day: dayName,
      hour: hours[position] ?? DEFAULT_SOCIAL_HOURS[position] ?? 7,
    });
  }
  return slots;
}

function truncateForProvider(text, provider) {
  const limit = provider === "threads" ? 500 : provider === "instagram" ? 2200 : 10_000;
  if (text.length <= limit) return text;
  const suffix = "\n\nПродолжение — в Phraseman.";
  return `${text.slice(0, Math.max(0, limit - suffix.length - 1)).trim()}…${suffix}`;
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

async function mediaForItem(workspaceId, batchDir, item, mediaMap, mediaCache) {
  const media = mediaMap[item.id];
  if (!media?.file) return null;
  const filePath = path.join(batchDir, media.file);
  const cacheKey = path.relative(process.cwd(), filePath).replaceAll("\\", "/");
  if (!mediaCache[cacheKey]) {
    const uploaded = await uploadMediaFile(workspaceId, filePath);
    mediaCache[cacheKey] = {
      id: uploaded.id,
      type: uploaded.type || "photo",
      path: uploaded.path,
      thumbnail: uploaded.thumbnail,
      width: uploaded.width,
      height: uploaded.height,
      name: uploaded.name,
    };
  }
  return mediaCache[cacheKey];
}

function itemAllowedForProvider(item, provider, mediaMap) {
  if (!item.platform_priority?.includes(provider)) return false;
  if (mediaMap[item.id]) return PHOTO_PROVIDERS.has(provider);
  return STATUS_PROVIDERS.has(provider);
}

function networkFor(provider, item, uploaded) {
  const text = truncateForProvider(item.text, provider);
  if (uploaded) {
    return {
      type: "photo",
      text,
      media: [
        {
          id: uploaded.id,
          type: uploaded.type || "photo",
          alt_text: `Phraseman English 30+ post: ${item.hook}`.slice(0, 180),
        },
      ],
    };
  }
  return {
    type: "status",
    text,
  };
}

async function scheduleOne(workspaceId, account, item, uploaded, scheduledAt) {
  const provider = account.provider;
  const body = {
    bulk: {
      state: "scheduled",
      posts: [
        {
          networks: {
            [provider]: networkFor(provider, item, uploaded),
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
  if (!process.env.PUBLER_API_KEY) throw new Error("Missing PUBLER_API_KEY");

  const batchDir = path.resolve(args.batch || DEFAULT_BATCH);
  const data = readJson(path.join(batchDir, "social_posts.json"), null);
  if (!data?.items?.length) throw new Error(`Missing social_posts.json in ${batchDir}`);

  const reportDir = path.join(batchDir, "publer");
  ensureDir(reportDir);
  const cachePath = path.join(reportDir, "social_media_cache.json");
  const reportPath = path.join(reportDir, "social_schedule_report.json");
  const mediaCache = readJson(cachePath, {});
  const previousReport = args.apply ? readJson(reportPath, null) : null;
  const report = {
    created_at: new Date().toISOString(),
    batch: path.basename(batchDir),
    mode: args.apply ? "apply-resume" : "discover",
    per_day: Number(args["per-day"] || 5),
    scheduled: previousReport?.scheduled || [],
    failures: [],
    workspaces: [],
    best_times: {},
  };
  const alreadyScheduled = new Set(report.scheduled.map((item) => `${item.account_id}:${item.item_id}`));

  const workspaces = await listWorkspaces();
  if (!workspaces.length) throw new Error("No Publer workspaces returned");
  const workspace = args.workspace ? workspaces.find((item) => item.id === args.workspace) : workspaces[0];
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
  const perDay = Number(args["per-day"] || 5);
  const tzOffset = args["tz-offset"] || "+01:00";

  const heatmaps = {};
  for (const account of accounts) {
    const best = await bestTimes(workspace.id, account.id, analyticsFrom, analyticsTo);
    heatmaps[account.id] = best.ok ? best.data : null;
    report.best_times[account.id] = {
      provider: account.provider,
      name: account.name,
      ok: best.ok,
      status: best.status,
      top_slots: Object.fromEntries(DAY_NAMES.map((day) => [day, topHoursForDay(best.ok ? best.data : null, day, perDay)])),
    };
  }

  if (!args.apply) {
    writeJson(reportPath, report);
    console.log(`DISCOVER_OK workspace=${workspace.name || workspace.id} accounts=${accounts.length}`);
    console.log(`Report: ${reportPath}`);
    return;
  }

  for (const account of accounts) {
    const providerItems = data.items.filter((item) => itemAllowedForProvider(item, account.provider, data.media || {}));
    const slots = scheduleSlots(startDate, providerItems.length, heatmaps[account.id], perDay, tzOffset);
    for (let i = 0; i < providerItems.length; i += 1) {
      const item = providerItems[i];
      const key = `${account.id}:${item.id}`;
      if (alreadyScheduled.has(key)) {
        console.log(`SKIP_ALREADY_SCHEDULED ${account.provider}/${account.name || account.id} ${item.id}`);
        continue;
      }
      try {
        const uploaded = await mediaForItem(workspace.id, batchDir, item, data.media || {}, mediaCache);
        writeJson(cachePath, mediaCache);
        const result = await scheduleOne(workspace.id, account, item, uploaded, slots[i].scheduled_at);
        report.scheduled.push({
          account_id: account.id,
          provider: account.provider,
          account_name: account.name,
          item_id: item.id,
          type: item.type,
          has_media: Boolean(uploaded),
          scheduled_at: slots[i].scheduled_at,
          job_id: result?.job_id || result?.data?.job_id || result?.data?.id || null,
          result,
        });
        alreadyScheduled.add(key);
        console.log(`SCHEDULED ${account.provider}/${account.name || account.id} ${item.id} ${slots[i].scheduled_at}`);
      } catch (error) {
        report.failures.push({
          account_id: account.id,
          provider: account.provider,
          account_name: account.name,
          item_id: item.id,
          scheduled_at: slots[i]?.scheduled_at,
          status: error.status,
          error: error.message,
          data: error.data,
        });
        console.log(`FAILED ${account.provider}/${account.name || account.id} ${item.id} ${error.status || ""}`);
      }
      writeJson(reportPath, report);
    }
  }

  writeJson(reportPath, report);
  console.log(`DONE scheduled=${report.scheduled.length} failures=${report.failures.length}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error.message);
  if (error.data) console.error(JSON.stringify(error.data, null, 2));
  process.exit(1);
});
