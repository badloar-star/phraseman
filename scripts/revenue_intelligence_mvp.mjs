#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const REPORT_ROOT = path.join(REPO_ROOT, "docs", "reports", "buyer-radar");
const PIPELINE_DOC = path.join(
  REPO_ROOT,
  "docs",
  "pipelines",
  "buyer-radar-revenue-intelligence-pipeline.ru.md",
);

const VERSION = 1;
const DEFAULT_PLATFORMS = [
  "tiktok",
  "reels",
  "shorts",
  "carousel",
  "reddit",
  "x",
  "threads",
  "telegram",
  "pinterest",
  "linkedin",
];

const SEED_PAIN_CLUSTERS = [
  {
    painClusterId: "pain_speaking_freeze_001",
    pain: "I understand English content but freeze when I need to speak",
    buyerMotivation:
      "Wants active speaking confidence, not passive recognition of words.",
    emotionalState: ["frustration", "embarrassment", "stagnation"],
    competitorEvidence: ["Duolingo", "ELSA", "Babbel"],
    proofSignals: [],
    evidenceNote:
      "Seeded from the revenue intelligence pipeline discussion. Add real market_signals IDs before final decisions.",
    productBridge:
      "Phraseman trains ready-to-use phrases for real speaking moments.",
    scoreInputs: {
      painScore: 9,
      viralityScore: 7,
      purchaseScore: 9,
      evergreenScore: 10,
      noveltyScore: 6,
      competitionScore: 6,
      ctrPredictionScore: 7,
      retentionPredictionScore: 8,
      subscriptionPredictionScore: 9,
    },
  },
  {
    painClusterId: "pain_forgetting_001",
    pain: "I keep forgetting the English I learn",
    buyerMotivation:
      "Wants a system that makes phrases stick and return at the right time.",
    emotionalState: ["annoyance", "self-doubt", "fatigue"],
    competitorEvidence: ["Duolingo", "LingQ"],
    proofSignals: [],
    evidenceNote:
      "Seeded from the revenue intelligence pipeline discussion. Add real market_signals IDs before final decisions.",
    productBridge:
      "Phraseman uses repeated phrase practice and recall to make useful English stay usable.",
    scoreInputs: {
      painScore: 8,
      viralityScore: 6,
      purchaseScore: 7,
      evergreenScore: 9,
      noveltyScore: 5,
      competitionScore: 7,
      ctrPredictionScore: 6,
      retentionPredictionScore: 7,
      subscriptionPredictionScore: 7,
    },
  },
  {
    painClusterId: "pain_embarrassed_to_speak_001",
    pain: "I feel embarrassed speaking English out loud",
    buyerMotivation:
      "Wants private practice before risking mistakes with real people.",
    emotionalState: ["shame", "fear", "tension"],
    competitorEvidence: ["ELSA", "Speak", "Babbel"],
    proofSignals: [],
    evidenceNote:
      "Seeded from the revenue intelligence pipeline discussion. Add real market_signals IDs before final decisions.",
    productBridge:
      "Phraseman gives low-pressure phrase rehearsal before real conversations.",
    scoreInputs: {
      painScore: 9,
      viralityScore: 8,
      purchaseScore: 8,
      evergreenScore: 10,
      noveltyScore: 6,
      competitionScore: 5,
      ctrPredictionScore: 7,
      retentionPredictionScore: 8,
      subscriptionPredictionScore: 8,
    },
  },
  {
    painClusterId: "pain_years_stuck_001",
    pain: "I have studied English for years but still feel stuck",
    buyerMotivation:
      "Wants a visible breakthrough after long, demoralizing effort.",
    emotionalState: ["stagnation", "resentment", "hope"],
    competitorEvidence: ["Duolingo", "Babbel", "LingQ"],
    proofSignals: [],
    evidenceNote:
      "Seeded from the revenue intelligence pipeline discussion. Add real market_signals IDs before final decisions.",
    productBridge:
      "Phraseman turns knowledge into small usable speaking actions instead of another passive lesson streak.",
    scoreInputs: {
      painScore: 8,
      viralityScore: 6,
      purchaseScore: 8,
      evergreenScore: 10,
      noveltyScore: 5,
      competitionScore: 7,
      ctrPredictionScore: 6,
      retentionPredictionScore: 7,
      subscriptionPredictionScore: 8,
    },
  },
  {
    painClusterId: "pain_work_english_001",
    pain: "I need English for work calls and messages",
    buyerMotivation:
      "Has a practical deadline and direct economic reason to improve.",
    emotionalState: ["pressure", "urgency", "career anxiety"],
    competitorEvidence: ["Babbel", "Speak", "ELSA"],
    proofSignals: [],
    evidenceNote:
      "Seeded from the revenue intelligence pipeline discussion. Add real market_signals IDs before final decisions.",
    productBridge:
      "Phraseman trains phrase patterns that transfer into work calls, chats, and meetings.",
    scoreInputs: {
      painScore: 9,
      viralityScore: 6,
      purchaseScore: 10,
      evergreenScore: 10,
      noveltyScore: 6,
      competitionScore: 5,
      ctrPredictionScore: 7,
      retentionPredictionScore: 9,
      subscriptionPredictionScore: 10,
    },
  },
];

function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const withoutPrefix = arg.slice(2);
    const eqIndex = withoutPrefix.indexOf("=");
    if (eqIndex >= 0) {
      options[withoutPrefix.slice(0, eqIndex)] = withoutPrefix.slice(eqIndex + 1);
      continue;
    }

    const next = rest[i + 1];
    if (next && !next.startsWith("--")) {
      options[withoutPrefix] = next;
      i += 1;
    } else {
      options[withoutPrefix] = true;
    }
  }

  return { command, options };
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromOptions(options) {
  const value = options.date || todayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date "${value}". Use YYYY-MM-DD.`);
  }
  return value;
}

function runDir(date) {
  return path.join(REPORT_ROOT, date);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonIfMissing(filePath, value, force = false) {
  if (fs.existsSync(filePath) && !force) {
    return false;
  }
  writeJson(filePath, value);
  return true;
}

function writeTextIfMissing(filePath, value, force = false) {
  if (fs.existsSync(filePath) && !force) {
    return false;
  }
  fs.writeFileSync(filePath, value, "utf8");
  return true;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${path.relative(REPO_ROOT, filePath)}:${index + 1} is invalid JSONL: ${error.message}`);
    }
  });
}

function round(value, digits = 2) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function normalizeScore(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(0, Math.min(10, number));
}

function getScoreInputs(cluster) {
  const input = cluster.scoreInputs || {};
  return {
    painScore: normalizeScore(input.painScore, 5),
    viralityScore: normalizeScore(input.viralityScore, 5),
    purchaseScore: normalizeScore(input.purchaseScore, 5),
    evergreenScore: normalizeScore(input.evergreenScore, 5),
    noveltyScore: normalizeScore(input.noveltyScore, 5),
    competitionScore: normalizeScore(input.competitionScore, 5),
    ctrPredictionScore: normalizeScore(input.ctrPredictionScore, 5),
    retentionPredictionScore: normalizeScore(input.retentionPredictionScore, 5),
    subscriptionPredictionScore: normalizeScore(input.subscriptionPredictionScore, 5),
  };
}

function scoreCluster(cluster) {
  const scores = getScoreInputs(cluster);
  const priorityScore =
    scores.purchaseScore * 0.3 +
    scores.subscriptionPredictionScore * 0.25 +
    scores.retentionPredictionScore * 0.15 +
    scores.painScore * 0.15 +
    scores.evergreenScore * 0.1 +
    scores.noveltyScore * 0.05 -
    scores.competitionScore * 0.1;

  let decision = "hold";
  if (scores.purchaseScore <= 3 || scores.subscriptionPredictionScore <= 3) {
    decision = "hold_low_purchase_intent";
  } else if (priorityScore >= 7) {
    decision = "generate_content_package";
  } else if (priorityScore >= 5.5) {
    decision = "manual_review";
  }

  const reasons = [];
  if (scores.purchaseScore >= 8) {
    reasons.push("high purchase intent");
  }
  if (scores.subscriptionPredictionScore >= 8) {
    reasons.push("high subscription prediction");
  }
  if (scores.retentionPredictionScore >= 8) {
    reasons.push("likely retention fit");
  }
  if (scores.viralityScore >= 8) {
    reasons.push("strong attention potential");
  }
  if (scores.competitionScore >= 8) {
    reasons.push("crowded topic risk");
  }
  if (reasons.length === 0) {
    reasons.push("balanced but unproven opportunity");
  }

  return {
    painClusterId: cluster.painClusterId,
    pain: cluster.pain,
    buyerMotivation: cluster.buyerMotivation,
    productBridge: cluster.productBridge,
    ...scores,
    priorityScore: round(priorityScore, 2),
    decision,
    reasons,
  };
}

function slugifyId(value, fallback = "item") {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/^pain_/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 44);
  return slug || fallback;
}

function readPainClusters(dir) {
  const filePath = path.join(dir, "pain_clusters.json");
  const parsed = readJson(filePath, []);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed.painClusters)) {
    return parsed.painClusters;
  }
  throw new Error("pain_clusters.json must be an array or { painClusters: [] }.");
}

function readOpportunityScores(dir) {
  const filePath = path.join(dir, "opportunity_scores.json");
  const parsed = readJson(filePath, { opportunities: [] });
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed.opportunities)) {
    return parsed.opportunities;
  }
  return [];
}

function readObjectArray(filePath, key) {
  const parsed = readJson(filePath, { [key]: [] });
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed[key])) {
    return parsed[key];
  }
  return [];
}

function mergeById(existingItems, newItems, idKey) {
  const byId = new Map(existingItems.map((item) => [item[idKey], item]));
  let added = 0;
  for (const item of newItems) {
    if (!byId.has(item[idKey])) {
      byId.set(item[idKey], item);
      added += 1;
    }
  }
  return { items: [...byId.values()], added };
}

function makeReadme(date) {
  return `# BUYER RADAR Run ${date}

This folder is a manual-first MVP run for BUYER RADAR, the Phraseman buyer-search revenue intelligence pipeline.

## Workflow

1. Add real buyer-intent signals to \`market_signals.jsonl\`.
2. Edit or add pain clusters in \`pain_clusters.json\`.
3. Run \`npm run revenue:score -- --date ${date}\`.
4. Run \`npm run revenue:package -- --date ${date} --top 3\`.
5. Fill hooks, first 3 seconds, bodies, CTAs, and publish times.
6. Add funnel outcomes to \`funnel_results.json\`.
7. Run \`npm run revenue:report -- --date ${date}\`.
8. Run \`npm run revenue:check -- --date ${date}\`.

## JSONL market signal example

\`\`\`json
{"signalId":"sig_${date.replace(/-/g, "")}_001","source":"app_store_review","sourceUrl":"https://example.com","rawText":"I paid because I need English for work calls.","language":"en","competitor":"example","detectedPain":"needs English for work","purchaseIntent":"high","sentiment":"mixed","collectedAt":"${date}T09:00:00Z"}
\`\`\`

Keep personal data out of this folder. Store campaign behavior, not user identity.
`;
}

function commandInit(options) {
  const date = dateFromOptions(options);
  const dir = runDir(date);
  const force = Boolean(options.force);
  ensureDir(dir);

  const created = [];
  const touchJson = (name, value) => {
    if (writeJsonIfMissing(path.join(dir, name), value, force)) {
      created.push(name);
    }
  };
  const touchText = (name, value) => {
    if (writeTextIfMissing(path.join(dir, name), value, force)) {
      created.push(name);
    }
  };

  touchJson("run_manifest.json", {
    pipeline: "BUYER_RADAR",
    version: VERSION,
    date,
    generatedAt: new Date().toISOString(),
    pipelineDoc: path.relative(REPO_ROOT, PIPELINE_DOC).replace(/\\/g, "/"),
    status: "manual-first-mvp",
  });
  touchText("README.md", makeReadme(date));
  touchText("market_signals.jsonl", "");
  touchJson("pain_clusters.json", SEED_PAIN_CLUSTERS);
  touchJson("opportunity_scores.json", {
    generatedAt: null,
    formula:
      "purchase*0.30 + subscription*0.25 + retention*0.15 + pain*0.15 + evergreen*0.10 + novelty*0.05 - competition*0.10",
    opportunities: [],
  });
  touchJson("content_experiments.json", {
    generatedAt: null,
    experiments: [],
  });
  touchJson("visual_briefs.json", {
    generatedAt: null,
    visualBriefs: [],
  });
  touchJson("publishing_plan.json", {
    generatedAt: null,
    items: [],
  });
  touchJson("funnel_results.json", {
    generatedAt: null,
    results: [],
  });
  touchText(
    "subscription_learning_report.md",
    `# Subscription Learning Report ${date}\n\nRun \`npm run revenue:report -- --date ${date}\` after scoring and funnel collection.\n`,
  );

  console.log(`Initialized ${path.relative(REPO_ROOT, dir)}`);
  if (created.length > 0) {
    console.log(`Created: ${created.join(", ")}`);
  } else {
    console.log("No files created; all templates already existed.");
  }
}

function commandScore(options) {
  const date = dateFromOptions(options);
  const dir = runDir(date);
  const clusters = readPainClusters(dir);
  const opportunities = clusters
    .map(scoreCluster)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  writeJson(path.join(dir, "opportunity_scores.json"), {
    generatedAt: new Date().toISOString(),
    formula:
      "purchase*0.30 + subscription*0.25 + retention*0.15 + pain*0.15 + evergreen*0.10 + novelty*0.05 - competition*0.10",
    note: "Virality is tracked but does not directly increase priorityScore.",
    opportunities,
  });

  console.log(`Scored ${opportunities.length} opportunities for ${date}`);
  for (const item of opportunities.slice(0, 5)) {
    console.log(`${item.priorityScore.toFixed(2)} ${item.decision} ${item.painClusterId}`);
  }
}

function makeExperiment(date, opportunity, platform) {
  const painSlug = slugifyId(opportunity.painClusterId);
  const dateSlug = date.replace(/-/g, "");
  const contentVariantId = `cv_${painSlug}_${platform}_a`;
  const campaignId = `camp_${dateSlug}_${platform}_${painSlug}_a`;

  return {
    contentVariantId,
    campaignId,
    painClusterId: opportunity.painClusterId,
    platform,
    status: "draft",
    targetMetric: "trial_started",
    hook: `TODO: Name the pain fast: ${opportunity.pain}`,
    first3Seconds:
      "TODO: Show the emotional moment before explaining anything.",
    bodyStructure: [
      "pain recognition",
      "emotional proof",
      "tiny insight",
      "Phraseman bridge",
      "measurable CTA",
    ],
    body: "TODO",
    cta: "TODO: Send to a measured install/trial path.",
    utm: {
      source: platform,
      medium: platform === "reddit" ? "community_post" : "organic_social",
      campaign: `ri_${dateSlug}_${painSlug}`,
      content: `${platform}_a`,
    },
    notes:
      "Fill copy manually or with an LLM after checking that this pain still has buyer-intent evidence.",
  };
}

function makeVisualBrief(opportunity) {
  const painSlug = slugifyId(opportunity.painClusterId);
  return {
    visualBriefId: `vb_${painSlug}_001`,
    painClusterId: opportunity.painClusterId,
    emotion: "TODO: primary emotional state from the pain cluster",
    scene: `TODO: visualize the pain, not generic English learning. Pain: ${opportunity.pain}`,
    doNotUse: [
      "flags",
      "generic books",
      "generic classroom",
      "smiling stock student",
    ],
    platformFit: ["tiktok", "reels", "shorts"],
    supportsHook: opportunity.pain,
  };
}

function commandPackage(options) {
  const date = dateFromOptions(options);
  const dir = runDir(date);
  let opportunities = readOpportunityScores(dir);
  if (opportunities.length === 0) {
    const clusters = readPainClusters(dir);
    opportunities = clusters.map(scoreCluster).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  const top = options.top === undefined ? Number.POSITIVE_INFINITY : Number.parseInt(options.top, 10);
  const limit = Number.isFinite(top) && top > 0 ? top : Number.POSITIVE_INFINITY;
  const selected = opportunities
    .filter((item) => ["generate_content_package", "manual_review"].includes(item.decision))
    .slice(0, limit);

  const platforms = String(options.platforms || DEFAULT_PLATFORMS.join(","))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const experimentPath = path.join(dir, "content_experiments.json");
  const visualPath = path.join(dir, "visual_briefs.json");
  const publishingPath = path.join(dir, "publishing_plan.json");

  const existingExperiments = readObjectArray(experimentPath, "experiments");
  const existingVisuals = readObjectArray(visualPath, "visualBriefs");
  const existingPlanItems = readObjectArray(publishingPath, "items");

  const newExperiments = selected.flatMap((opportunity) =>
    platforms.map((platform) => makeExperiment(date, opportunity, platform)),
  );
  const newVisuals = selected.map(makeVisualBrief);
  const newPlanItems = newExperiments.map((experiment) => ({
    campaignId: experiment.campaignId,
    contentVariantId: experiment.contentVariantId,
    painClusterId: experiment.painClusterId,
    platform: experiment.platform,
    status: "not_scheduled",
    publishAt: null,
    landingUrl: "TODO",
  }));

  const mergedExperiments = mergeById(existingExperiments, newExperiments, "contentVariantId");
  const mergedVisuals = mergeById(existingVisuals, newVisuals, "visualBriefId");
  const mergedPlan = mergeById(existingPlanItems, newPlanItems, "campaignId");

  writeJson(experimentPath, {
    generatedAt: new Date().toISOString(),
    experiments: mergedExperiments.items,
  });
  writeJson(visualPath, {
    generatedAt: new Date().toISOString(),
    visualBriefs: mergedVisuals.items,
  });
  writeJson(publishingPath, {
    generatedAt: new Date().toISOString(),
    items: mergedPlan.items,
  });

  console.log(
    `Packaged ${selected.length} pain clusters: +${mergedExperiments.added} experiments, +${mergedVisuals.added} visual briefs, +${mergedPlan.added} publishing items.`,
  );
}

function metricRate(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "n/a";
  }
  return Number(value).toFixed(digits);
}

function resultWithMetrics(result) {
  const views = Number(result.views || 0);
  const installs = Number(result.installs || 0);
  const activations = Number(result.activations || 0);
  const trials = Number(result.trials || 0);
  const purchases = Number(result.purchases || 0);
  const ltvD30 = Number(result.ltvD30 || 0);

  return {
    ...result,
    installRate: metricRate(installs, views),
    activationRate: metricRate(activations, installs),
    trialRate: metricRate(trials, installs),
    purchaseRate: metricRate(purchases, trials),
    ltvPerInstall: metricRate(ltvD30, installs),
    expectedLtvPer1000Views: views > 0 ? (ltvD30 / views) * 1000 : null,
  };
}

function commandReport(options) {
  const date = dateFromOptions(options);
  const dir = runDir(date);
  const opportunities = readOpportunityScores(dir);
  const funnelResults = readObjectArray(path.join(dir, "funnel_results.json"), "results").map(resultWithMetrics);
  const sortedFunnel = [...funnelResults].sort(
    (a, b) => (b.expectedLtvPer1000Views || 0) - (a.expectedLtvPer1000Views || 0),
  );

  const lines = [];
  lines.push(`# Subscription Learning Report ${date}`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Top Opportunities");
  lines.push("");
  if (opportunities.length === 0) {
    lines.push("No opportunity scores yet. Run `npm run revenue:score` first.");
  } else {
    lines.push("| Rank | Score | Decision | Pain |");
    lines.push("|---:|---:|---|---|");
    opportunities.slice(0, 10).forEach((item, index) => {
      lines.push(
        `| ${index + 1} | ${formatNumber(item.priorityScore)} | ${item.decision} | ${item.pain} |`,
      );
    });
  }

  lines.push("");
  lines.push("## Funnel Results");
  lines.push("");
  if (sortedFunnel.length === 0) {
    lines.push("No funnel results yet. Fill `funnel_results.json` after publishing.");
  } else {
    lines.push(
      "| Campaign | Platform | Views | Installs | Trials | Purchases | D30 LTV | LTV / 1000 Views |",
    );
    lines.push("|---|---|---:|---:|---:|---:|---:|---:|");
    sortedFunnel.forEach((item) => {
      lines.push(
        `| ${item.campaignId || "n/a"} | ${item.platform || "n/a"} | ${item.views || 0} | ${item.installs || 0} | ${item.trials || 0} | ${item.purchases || 0} | ${formatNumber(item.ltvD30)} | ${formatNumber(item.expectedLtvPer1000Views, 4)} |`,
      );
    });
  }

  lines.push("");
  lines.push("## Learning Notes");
  lines.push("");
  if (sortedFunnel.length === 0) {
    lines.push("- Hypothesis only: no funnel data has been collected yet.");
    lines.push("- Next action: publish measured experiments and add install/trial/payment results.");
  } else {
    const winner = sortedFunnel[0];
    lines.push(
      `- Current best campaign by expected LTV per 1000 views: \`${winner.campaignId || "n/a"}\` (${formatNumber(
        winner.expectedLtvPer1000Views,
        4,
      )}).`,
    );
    const zeroPurchase = sortedFunnel.filter((item) => Number(item.views || 0) > 0 && Number(item.purchases || 0) === 0);
    if (zeroPurchase.length > 0) {
      lines.push(
        `- ${zeroPurchase.length} campaign(s) have views but zero purchases; do not scale them until the CTA/product bridge is fixed.`,
      );
    }
  }

  lines.push("");
  lines.push("## Next Actions");
  lines.push("");
  lines.push("- Add real buyer-intent evidence to pain clusters before scaling.");
  lines.push("- Keep campaign IDs unique per platform and variant.");
  lines.push("- Optimize for paid LTV, not views.");

  const reportPath = path.join(dir, "subscription_learning_report.md");
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${path.relative(REPO_ROOT, reportPath)}`);
}

function collectDuplicateIds(items, key) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    const value = item?.[key];
    if (!value) {
      continue;
    }
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

function commandCheck(options) {
  const date = dateFromOptions(options);
  const dir = runDir(date);
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(dir)) {
    errors.push(`Run directory does not exist: ${path.relative(REPO_ROOT, dir)}`);
  }

  const requiredFiles = [
    "run_manifest.json",
    "market_signals.jsonl",
    "pain_clusters.json",
    "opportunity_scores.json",
    "content_experiments.json",
    "visual_briefs.json",
    "publishing_plan.json",
    "funnel_results.json",
    "subscription_learning_report.md",
  ];

  for (const fileName of requiredFiles) {
    const filePath = path.join(dir, fileName);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing ${fileName}`);
    }
  }

  let marketSignals = [];
  let painClusters = [];
  let opportunities = [];
  let experiments = [];
  let visuals = [];
  let planItems = [];
  let funnelResults = [];

  try {
    marketSignals = readJsonl(path.join(dir, "market_signals.jsonl"));
  } catch (error) {
    errors.push(error.message);
  }

  try {
    painClusters = readPainClusters(dir);
  } catch (error) {
    errors.push(error.message);
  }

  try {
    opportunities = readOpportunityScores(dir);
    experiments = readObjectArray(path.join(dir, "content_experiments.json"), "experiments");
    visuals = readObjectArray(path.join(dir, "visual_briefs.json"), "visualBriefs");
    planItems = readObjectArray(path.join(dir, "publishing_plan.json"), "items");
    funnelResults = readObjectArray(path.join(dir, "funnel_results.json"), "results");
  } catch (error) {
    errors.push(error.message);
  }

  for (const duplicate of collectDuplicateIds(painClusters, "painClusterId")) {
    errors.push(`Duplicate painClusterId: ${duplicate}`);
  }
  for (const duplicate of collectDuplicateIds(experiments, "contentVariantId")) {
    errors.push(`Duplicate contentVariantId: ${duplicate}`);
  }
  for (const duplicate of collectDuplicateIds(experiments, "campaignId")) {
    errors.push(`Duplicate experiment campaignId: ${duplicate}`);
  }
  for (const duplicate of collectDuplicateIds(visuals, "visualBriefId")) {
    errors.push(`Duplicate visualBriefId: ${duplicate}`);
  }

  const painIds = new Set(painClusters.map((item) => item.painClusterId));
  const experimentCampaignIds = new Set(experiments.map((item) => item.campaignId));
  const planCampaignIds = new Set(planItems.map((item) => item.campaignId));
  const signalIds = new Set(marketSignals.map((item) => item.signalId).filter(Boolean));

  for (const cluster of painClusters) {
    if (!cluster.painClusterId) {
      errors.push("Pain cluster missing painClusterId.");
    }
    if (!cluster.pain) {
      errors.push(`${cluster.painClusterId || "unknown"} missing pain.`);
    }
    if (!cluster.productBridge) {
      errors.push(`${cluster.painClusterId || "unknown"} missing productBridge.`);
    }
    if (!Array.isArray(cluster.proofSignals) || cluster.proofSignals.length === 0) {
      warnings.push(`${cluster.painClusterId || "unknown"} has no proofSignals yet.`);
    } else {
      for (const signalId of cluster.proofSignals) {
        if (!signalIds.has(signalId)) {
          warnings.push(`${cluster.painClusterId} references missing signal ${signalId}.`);
        }
      }
    }
  }

  for (const experiment of experiments) {
    if (!experiment.contentVariantId || !experiment.campaignId || !experiment.painClusterId || !experiment.platform) {
      errors.push(`Experiment has missing required IDs: ${JSON.stringify(experiment)}`);
      continue;
    }
    if (!painIds.has(experiment.painClusterId)) {
      errors.push(`${experiment.contentVariantId} references missing pain ${experiment.painClusterId}.`);
    }
    if (!experiment.utm?.source || !experiment.utm?.campaign || !experiment.utm?.content) {
      errors.push(`${experiment.contentVariantId} missing UTM mapping.`);
    }
    if (!planCampaignIds.has(experiment.campaignId)) {
      warnings.push(`${experiment.campaignId} has no publishing_plan item.`);
    }
  }

  for (const result of funnelResults) {
    if (!result.campaignId) {
      errors.push(`Funnel result missing campaignId: ${JSON.stringify(result)}`);
      continue;
    }
    if (!experimentCampaignIds.has(result.campaignId)) {
      warnings.push(`Funnel result references unknown campaignId ${result.campaignId}.`);
    }
  }

  const topOpportunityIds = opportunities
    .filter((item) => item.decision === "generate_content_package")
    .map((item) => item.painClusterId);
  const packagedPainIds = new Set(experiments.map((item) => item.painClusterId));
  for (const painClusterId of topOpportunityIds) {
    if (!packagedPainIds.has(painClusterId)) {
      warnings.push(`${painClusterId} is scored for generation but has no content package yet.`);
    }
  }

  console.log(`BUYER RADAR check for ${date}`);
  console.log(`Signals: ${marketSignals.length}`);
  console.log(`Pain clusters: ${painClusters.length}`);
  console.log(`Opportunities: ${opportunities.length}`);
  console.log(`Experiments: ${experiments.length}`);
  console.log(`Visual briefs: ${visuals.length}`);
  console.log(`Publishing items: ${planItems.length}`);
  console.log(`Funnel results: ${funnelResults.length}`);

  if (warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (errors.length > 0) {
    console.error("");
    console.error("Errors:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("OK: no blocking errors.");
}

function printHelp() {
  console.log(`BUYER RADAR MVP

Usage:
  node scripts/revenue_intelligence_mvp.mjs init [--date YYYY-MM-DD] [--force]
  node scripts/revenue_intelligence_mvp.mjs score [--date YYYY-MM-DD]
  node scripts/revenue_intelligence_mvp.mjs package [--date YYYY-MM-DD] [--top 3]
  node scripts/revenue_intelligence_mvp.mjs report [--date YYYY-MM-DD]
  node scripts/revenue_intelligence_mvp.mjs check [--date YYYY-MM-DD]
  node scripts/revenue_intelligence_mvp.mjs run [--date YYYY-MM-DD]
`);
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  switch (command) {
    case "init":
      commandInit(options);
      break;
    case "score":
      commandScore(options);
      break;
    case "package":
      commandPackage(options);
      break;
    case "report":
      commandReport(options);
      break;
    case "check":
      commandCheck(options);
      break;
    case "run":
      commandScore(options);
      commandPackage(options);
      commandReport(options);
      commandCheck(options);
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
