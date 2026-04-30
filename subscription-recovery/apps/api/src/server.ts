import { createHash } from "node:crypto";
import Fastify, { type FastifyRequest } from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { findingPriorityScore, findingPriorityTier } from "@subscription-recovery/core";

const app = Fastify({
  logger: process.env.SKIP_API_LISTEN === "1" ? false : true
});
const port = Number(process.env.PORT ?? 4000);
const prisma = new PrismaClient();
const DEMO_ORG_NAME = "Demo Organization";
const monthlyWindowDays = { min: 28, max: 33 };

type DetectionCandidate = {
  /** Grouping key from normalized merchant text + currency. */
  detectionKey: string;
  canonicalName: string;
  currency: string;
  avgAmount: number;
  confidence: number;
  transactionCount: number;
  missingCycles: number;
  amountVarianceRatio: number;
};

function normalizeMerchantText(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\b(SUBSCR|SUBSCRIPTION|PAYMENT|ONLINE|CARD)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toCanonicalName(normalized: string): string {
  return normalized
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function csvEscape(value: string | number | bigint | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "bigint" ? value.toString() : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const bom = "\uFEFF";
  const lines = [`${bom}${headers.map(csvEscape).join(",")}`];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

type CreatedAtRange =
  | { ok: true; from?: Date; to?: Date }
  | { ok: false; error: string };

function parseCreatedAtRangeQuery(query: Record<string, string | undefined>): CreatedAtRange {
  const fromRaw = query.from?.trim();
  const toRaw = query.to?.trim();
  if (!fromRaw && !toRaw) {
    return { ok: true };
  }
  let from: Date | undefined;
  let to: Date | undefined;
  if (fromRaw) {
    const parsed = new Date(fromRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "Invalid from date (use ISO-8601, e.g. 2026-04-01 or full timestamp)" };
    }
    from = parsed;
  }
  if (toRaw) {
    const parsed = new Date(toRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "Invalid to date (use ISO-8601)" };
    }
    to = parsed;
  }
  if (from && to && from.getTime() > to.getTime()) {
    return { ok: false, error: "from must be before or equal to to" };
  }
  return { ok: true, from, to };
}

function detectMonthlyCandidates(
  rows: Array<{ bookedAt: Date; amount: number; currency: string; merchantText: string }>
): DetectionCandidate[] {
  const grouped = new Map<string, Array<{ bookedAt: Date; amount: number; currency: string }>>();

  for (const row of rows) {
    const normalized = normalizeMerchantText(row.merchantText);
    if (!normalized) continue;
    const key = `${normalized}::${row.currency}`;
    const group = grouped.get(key) ?? [];
    group.push({ bookedAt: row.bookedAt, amount: row.amount, currency: row.currency });
    grouped.set(key, group);
  }

  const candidates: DetectionCandidate[] = [];

  for (const [key, group] of grouped.entries()) {
    if (group.length < 3) continue;
    const sorted = [...group].sort((a, b) => a.bookedAt.getTime() - b.bookedAt.getTime());
    const amounts = sorted.map((item) => item.amount);
    const intervals: number[] = [];
    for (let index = 1; index < sorted.length; index += 1) {
      const diffMs = sorted[index].bookedAt.getTime() - sorted[index - 1].bookedAt.getTime();
      intervals.push(diffMs / (1000 * 60 * 60 * 24));
    }

    const avgInterval = average(intervals);
    const avgAmount = average(amounts);
    if (avgAmount <= 0) continue;
    if (avgInterval < monthlyWindowDays.min || avgInterval > monthlyWindowDays.max * 2) continue;

    const amountDeviation = standardDeviation(amounts);
    const amountVarianceRatio = amountDeviation / avgAmount;
    let missingCycles = 0;
    let intervalPenalty = 0;

    for (const interval of intervals) {
      if (interval >= monthlyWindowDays.min && interval <= monthlyWindowDays.max) {
        continue;
      }
      if (interval >= monthlyWindowDays.min * 2 - 3 && interval <= monthlyWindowDays.max * 2 + 3) {
        missingCycles += 1;
        intervalPenalty += 0.12;
        continue;
      }
      intervalPenalty += 0.24;
    }

    const variancePenalty = clamp(amountVarianceRatio * 1.8, 0, 0.35);
    const confidence = clamp(0.96 - variancePenalty - intervalPenalty, 0.5, 0.98);

    const [normalized, currency] = key.split("::");
    candidates.push({
      detectionKey: key,
      canonicalName: toCanonicalName(normalized),
      currency,
      avgAmount: Number(avgAmount.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      transactionCount: sorted.length,
      missingCycles,
      amountVarianceRatio: Number(amountVarianceRatio.toFixed(4))
    });
  }

  return candidates.sort((a, b) => b.avgAmount - a.avgAmount);
}

const webhookBodySchema = z.object({
  provider: z.string().min(1),
  accountId: z.string().min(1),
  transactions: z.array(
    z.object({
      externalTxId: z.string().min(1),
      bookedAt: z.string().datetime(),
      amount: z.number(),
      currency: z.string().length(3),
      merchantText: z.string().min(1)
    })
  )
});

type WebhookBody = z.infer<typeof webhookBodySchema>;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function webhookPayloadHash(body: WebhookBody): string {
  return createHash("sha256").update(stableStringify(body), "utf8").digest("hex");
}

function readIdempotencyHeader(request: FastifyRequest): string | undefined {
  const raw = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function webhookLookupKey(request: FastifyRequest, body: WebhookBody): string {
  const headerKey = readIdempotencyHeader(request);
  if (headerKey) {
    return `idemp:${headerKey}`;
  }
  return `payload:${webhookPayloadHash(body)}`;
}

const findingStatusSchema = z.object({
  status: z.enum(["open", "in_review", "actioned", "closed"])
});

const subscriptionOwnerBodySchema = z.object({
  ownerUserId: z.string().min(1).nullable()
});

const confirmSavingsBodySchema = z.object({
  confirmedMonthly: z.number().nonnegative().optional(),
  /** If true (default), set finding status to `actioned` after recording savings. */
  markFindingActioned: z.boolean().optional().default(true)
});

app.get("/health", async () => ({ ok: true }));

app.get("/api/dashboard/summary", async () => {
  const [
    subscriptionSpend,
    findingsAgg,
    savingsAgg,
    openFindings,
    confidenceAgg,
    totalFindings,
    confirmedLedgersCount
  ] = await Promise.all([
    prisma.subscriptionDetected.aggregate({
      _sum: { avgAmount: true }
    }),
    prisma.wasteFinding.aggregate({
      _sum: { estimatedMonthlySaving: true }
    }),
    prisma.savingsLedger.aggregate({
      _sum: { confirmedMonthly: true }
    }),
    prisma.wasteFinding.count({ where: { status: { in: ["open", "in_review"] } } }),
    prisma.wasteFinding.aggregate({
      _avg: { confidence: true }
    }),
    prisma.wasteFinding.count(),
    prisma.savingsLedger.count({
      where: { confirmedMonthly: { not: null } }
    })
  ]);

  const potential = Number(findingsAgg._sum.estimatedMonthlySaving ?? 0);
  const confirmed = Number(savingsAgg._sum.confirmedMonthly ?? 0);
  const confirmedToPotentialRatio =
    potential > 0 ? Math.min(1, confirmed / potential) : 0;
  const recoveryRatePercent = confirmedToPotentialRatio * 100;
  const avgFindingConfidence = Number(confidenceAgg._avg.confidence ?? 0);

  return {
    totalMonthlySpend: Number(subscriptionSpend._sum.avgAmount ?? 0),
    potentialMonthlySavings: potential,
    confirmedMonthlySavings: confirmed,
    openFindings,
    totalFindings,
    confirmedLedgersCount,
    recoveryRatePercent: Number(recoveryRatePercent.toFixed(1)),
    confirmedToPotentialRatio: Number(confirmedToPotentialRatio.toFixed(4)),
    avgFindingConfidence: Number(avgFindingConfidence.toFixed(3))
  };
});

app.get("/api/subscriptions", async () => {
  const subscriptions = await prisma.subscriptionDetected.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      merchant: { select: { canonicalName: true, category: true } },
      owner: { select: { id: true, email: true, role: true } }
    }
  });
  return { items: subscriptions };
});

app.get("/api/organization/members", async (_request, reply) => {
  const organization = await prisma.organization.findUnique({
    where: { name: DEMO_ORG_NAME }
  });
  if (!organization) {
    return reply.status(404).send({ error: "Demo organization not found" });
  }
  const users = await prisma.user.findMany({
    where: { organizationId: organization.id },
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true }
  });
  return { items: users };
});

app.patch("/api/subscriptions/:id/owner", async (request, reply) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.status(400).send({ error: "Invalid subscription id" });
  }

  const body = subscriptionOwnerBodySchema.safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({
      error: "Invalid owner payload",
      details: body.error.flatten()
    });
  }

  const subscription = await prisma.subscriptionDetected.findUnique({
    where: { id: params.data.id },
    include: { organization: { select: { name: true, id: true } } }
  });
  if (!subscription || subscription.organization.name !== DEMO_ORG_NAME) {
    return reply.status(404).send({ error: "Subscription not found" });
  }

  if (body.data.ownerUserId) {
    const user = await prisma.user.findFirst({
      where: {
        id: body.data.ownerUserId,
        organizationId: subscription.organizationId
      },
      select: { id: true }
    });
    if (!user) {
      return reply.status(400).send({ error: "Owner must be a user in the same organization" });
    }
  }

  const updated = await prisma.subscriptionDetected.update({
    where: { id: subscription.id },
    data: { ownerUserId: body.data.ownerUserId },
    select: {
      id: true,
      ownerUserId: true,
      owner: { select: { id: true, email: true } }
    }
  });

  if (body.data.ownerUserId) {
    await prisma.wasteFinding.updateMany({
      where: {
        subscriptionId: subscription.id,
        type: "owner_gap",
        status: { in: ["open", "in_review"] }
      },
      data: { status: "closed" }
    });
  }

  return { ok: true, item: updated };
});

app.get("/api/findings", async () => {
  const findings = await prisma.wasteFinding.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      owner: { select: { id: true, email: true } },
      subscription: {
        select: {
          id: true,
          billingCycle: true,
          avgAmount: true,
          currency: true
        }
      }
    }
  });

  const findingIds = findings.map((row) => row.id);
  const ledgers =
    findingIds.length === 0
      ? []
      : await prisma.savingsLedger.findMany({
          where: { wasteFindingId: { in: findingIds } },
          select: {
            wasteFindingId: true,
            confirmedMonthly: true,
            estimatedMonthly: true,
            realizedAt: true,
            id: true
          }
        });
  const ledgerByFindingId = new Map(ledgers.map((entry) => [entry.wasteFindingId, entry]));

  const items = findings.map((row) => {
    const saving = Number(row.estimatedMonthlySaving);
    const conf = Number(row.confidence);
    const priorityScore = findingPriorityScore({
      estimatedMonthlySaving: saving,
      confidence: conf,
      type: row.type
    });
    const priorityTier = findingPriorityTier({
      estimatedMonthlySaving: saving,
      confidence: conf,
      type: row.type
    });
    const ledgerRow = ledgerByFindingId.get(row.id);
    const confirmedMonthlySaving =
      ledgerRow?.confirmedMonthly != null ? Number(ledgerRow.confirmedMonthly) : null;
    return {
      ...row,
      estimatedMonthlySaving: saving,
      confidence: conf,
      priorityScore,
      priorityTier,
      confirmedMonthlySaving,
      savingsLedgerId: ledgerRow?.id ?? null,
      savingsRealizedAt: ledgerRow?.realizedAt ?? null
    };
  });

  items.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return b.estimatedMonthlySaving - a.estimatedMonthlySaving;
  });

  return { items };
});

app.get("/api/export/findings.csv", async (request, reply) => {
  const query = request.query as Record<string, string | undefined>;
  const range = parseCreatedAtRangeQuery(query);
  if (!range.ok) {
    return reply.status(400).type("text/plain; charset=utf-8").send(range.error);
  }

  const organization = await prisma.organization.findUnique({
    where: { name: DEMO_ORG_NAME }
  });
  if (!organization) {
    return reply.status(404).type("text/plain; charset=utf-8").send("Demo organization not found");
  }

  const where: Prisma.WasteFindingWhereInput = { organizationId: organization.id };
  if (range.from || range.to) {
    where.createdAt = {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {})
    };
  }

  const findings = await prisma.wasteFinding.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: {
      owner: { select: { email: true } },
      subscription: { select: { currency: true, avgAmount: true } }
    }
  });

  const findingIds = findings.map((row) => row.id);
  const ledgers =
    findingIds.length === 0
      ? []
      : await prisma.savingsLedger.findMany({
          where: { wasteFindingId: { in: findingIds } },
          select: {
            wasteFindingId: true,
            confirmedMonthly: true,
            realizedAt: true
          }
        });
  const ledgerByFindingId = new Map(ledgers.map((entry) => [entry.wasteFindingId, entry]));

  const headers = [
    "id",
    "created_at",
    "type",
    "status",
    "title",
    "estimated_monthly_saving",
    "confidence",
    "priority_score",
    "priority_tier",
    "subscription_id",
    "subscription_currency",
    "subscription_avg_amount",
    "owner_email",
    "ledger_confirmed_monthly",
    "savings_realized_at"
  ];

  const rows = findings.map((row) => {
    const saving = Number(row.estimatedMonthlySaving);
    const conf = Number(row.confidence);
    const priorityScore = findingPriorityScore({
      estimatedMonthlySaving: saving,
      confidence: conf,
      type: row.type
    });
    const priorityTier = findingPriorityTier({
      estimatedMonthlySaving: saving,
      confidence: conf,
      type: row.type
    });
    const ledgerRow = ledgerByFindingId.get(row.id);
    return [
      row.id,
      row.createdAt.toISOString(),
      row.type,
      row.status,
      row.title,
      saving,
      conf,
      Number(priorityScore.toFixed(4)),
      priorityTier,
      row.subscriptionId ?? "",
      row.subscription?.currency ?? "",
      row.subscription != null ? Number(row.subscription.avgAmount) : "",
      row.owner?.email ?? "",
      ledgerRow?.confirmedMonthly != null ? Number(ledgerRow.confirmedMonthly) : "",
      ledgerRow?.realizedAt != null ? ledgerRow.realizedAt.toISOString() : ""
    ];
  });

  const body = rowsToCsv(headers, rows);
  return reply
    .header("content-type", "text/csv; charset=utf-8")
    .header("content-disposition", 'attachment; filename="findings-export.csv"')
    .send(body);
});

app.get("/api/export/savings.csv", async (request, reply) => {
  const query = request.query as Record<string, string | undefined>;
  const basis = query.basis === "realized" ? "realized" : "created";
  const range = parseCreatedAtRangeQuery(query);
  if (!range.ok) {
    return reply.status(400).type("text/plain; charset=utf-8").send(range.error);
  }

  const organization = await prisma.organization.findUnique({
    where: { name: DEMO_ORG_NAME }
  });
  if (!organization) {
    return reply.status(404).type("text/plain; charset=utf-8").send("Demo organization not found");
  }

  const where: Prisma.SavingsLedgerWhereInput = { organizationId: organization.id };
  if (range.from || range.to) {
    const window = {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {})
    };
    if (basis === "realized") {
      where.realizedAt = window;
    } else {
      where.createdAt = window;
    }
  }

  const ledgers = await prisma.savingsLedger.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: {
      wasteFinding: {
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          createdAt: true
        }
      }
    }
  });

  const headers = [
    "ledger_id",
    "ledger_created_at",
    "realized_at",
    "basis_filter",
    "waste_finding_id",
    "finding_created_at",
    "finding_type",
    "finding_status",
    "finding_title",
    "estimated_monthly",
    "confirmed_monthly"
  ];

  const rows = ledgers.map((row) => [
    row.id,
    row.createdAt.toISOString(),
    row.realizedAt != null ? row.realizedAt.toISOString() : "",
    basis,
    row.wasteFindingId,
    row.wasteFinding.createdAt.toISOString(),
    row.wasteFinding.type,
    row.wasteFinding.status,
    row.wasteFinding.title,
    Number(row.estimatedMonthly),
    row.confirmedMonthly != null ? Number(row.confirmedMonthly) : ""
  ]);

  const body = rowsToCsv(headers, rows);
  return reply
    .header("content-type", "text/csv; charset=utf-8")
    .header("content-disposition", 'attachment; filename="savings-ledger-export.csv"')
    .send(body);
});

app.patch("/api/findings/:id/status", async (request, reply) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.status(400).send({ error: "Invalid finding id" });
  }

  const body = findingStatusSchema.safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({
      error: "Invalid status payload",
      details: body.error.flatten()
    });
  }

  const existing = await prisma.wasteFinding.findUnique({
    where: { id: params.data.id },
    select: { id: true }
  });
  if (!existing) {
    return reply.status(404).send({ error: "Finding not found" });
  }

  const updated = await prisma.wasteFinding.update({
    where: { id: params.data.id },
    data: { status: body.data.status },
    select: {
      id: true,
      status: true
    }
  });

  return { ok: true, item: updated };
});

app.post("/api/findings/:id/confirm-savings", async (request, reply) => {
  const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
  if (!params.success) {
    return reply.status(400).send({ error: "Invalid finding id" });
  }

  const body = confirmSavingsBodySchema.safeParse(request.body ?? {});
  if (!body.success) {
    return reply.status(400).send({
      error: "Invalid confirm savings payload",
      details: body.error.flatten()
    });
  }

  const finding = await prisma.wasteFinding.findUnique({
    where: { id: params.data.id },
    select: {
      id: true,
      organizationId: true,
      estimatedMonthlySaving: true,
      status: true
    }
  });

  if (!finding) {
    return reply.status(404).send({ error: "Finding not found" });
  }

  const estimated = Number(finding.estimatedMonthlySaving);
  const confirmed =
    body.data.confirmedMonthly !== undefined ? body.data.confirmedMonthly : estimated;

  const existingLedger = await prisma.savingsLedger.findFirst({
    where: { wasteFindingId: finding.id },
    orderBy: { createdAt: "desc" }
  });

  const now = new Date();
  const ledger = existingLedger
    ? await prisma.savingsLedger.update({
        where: { id: existingLedger.id },
        data: {
          estimatedMonthly: estimated,
          confirmedMonthly: confirmed,
          realizedAt: now
        }
      })
    : await prisma.savingsLedger.create({
        data: {
          organizationId: finding.organizationId,
          wasteFindingId: finding.id,
          estimatedMonthly: estimated,
          confirmedMonthly: confirmed,
          realizedAt: now
        }
      });

  let findingStatus = finding.status;
  if (body.data.markFindingActioned) {
    const updatedFinding = await prisma.wasteFinding.update({
      where: { id: finding.id },
      data: { status: "actioned" },
      select: { status: true }
    });
    findingStatus = updatedFinding.status;
  }

  return {
    ok: true,
    ledger: {
      id: ledger.id,
      wasteFindingId: ledger.wasteFindingId,
      estimatedMonthly: Number(ledger.estimatedMonthly),
      confirmedMonthly: ledger.confirmedMonthly != null ? Number(ledger.confirmedMonthly) : null,
      realizedAt: ledger.realizedAt
    },
    finding: { id: finding.id, status: findingStatus }
  };
});

app.post("/api/bank/webhook", async (request, reply) => {
  const parsed = webhookBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: "Invalid webhook payload",
      details: parsed.error.flatten()
    });
  }

  const organization = await prisma.organization.upsert({
    where: { name: DEMO_ORG_NAME },
    create: { name: DEMO_ORG_NAME },
    update: {}
  });

  const bankConnection = await prisma.bankConnection.upsert({
    where: {
      organizationId_provider_externalRef: {
        organizationId: organization.id,
        provider: parsed.data.provider,
        externalRef: `${parsed.data.provider}:default`
      }
    },
    create: {
      organizationId: organization.id,
      provider: parsed.data.provider,
      externalRef: `${parsed.data.provider}:default`,
      status: "active"
    },
    update: {
      status: "active"
    }
  });

  const lookupKey = webhookLookupKey(request, parsed.data);
  const payloadHash = webhookPayloadHash(parsed.data);

  const priorIngestion = await prisma.webhookIngestion.findUnique({
    where: {
      bankConnectionId_lookupKey: {
        bankConnectionId: bankConnection.id,
        lookupKey
      }
    }
  });

  if (priorIngestion) {
    app.log.info(
      {
        provider: parsed.data.provider,
        accountId: parsed.data.accountId,
        deduplicated: true,
        lookupKey
      },
      "Webhook deduplicated"
    );
    return {
      accepted: true,
      insertedCount: priorIngestion.insertedCount,
      deduplicated: true
    };
  }

  const bankAccount = await prisma.bankAccount.upsert({
    where: {
      bankConnectionId_externalAccountId: {
        bankConnectionId: bankConnection.id,
        externalAccountId: parsed.data.accountId
      }
    },
    create: {
      bankConnectionId: bankConnection.id,
      externalAccountId: parsed.data.accountId,
      currency: parsed.data.transactions[0]?.currency ?? "GBP",
      name: "Primary account"
    },
    update: {}
  });

  const createManyPayload = parsed.data.transactions.map((tx) => ({
    bankAccountId: bankAccount.id,
    externalTxId: tx.externalTxId,
    bookedAt: new Date(tx.bookedAt),
    amount: tx.amount,
    currency: tx.currency,
    merchantText: tx.merchantText,
    rawPayload: tx
  }));

  const writeResult = await prisma.transactionRaw.createMany({
    data: createManyPayload,
    skipDuplicates: true
  });

  try {
    await prisma.webhookIngestion.create({
      data: {
        bankConnectionId: bankConnection.id,
        lookupKey,
        payloadHash,
        insertedCount: writeResult.count,
        transactionCount: parsed.data.transactions.length
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raceReplay = await prisma.webhookIngestion.findUnique({
        where: {
          bankConnectionId_lookupKey: {
            bankConnectionId: bankConnection.id,
            lookupKey
          }
        }
      });
      if (raceReplay) {
        app.log.info(
          {
            provider: parsed.data.provider,
            accountId: parsed.data.accountId,
            deduplicated: true,
            lookupKey
          },
          "Webhook deduplicated after race"
        );
        return {
          accepted: true,
          insertedCount: raceReplay.insertedCount,
          deduplicated: true
        };
      }
    }
    throw error;
  }

  app.log.info(
    {
      provider: parsed.data.provider,
      accountId: parsed.data.accountId,
      transactionCount: parsed.data.transactions.length,
      insertedCount: writeResult.count
    },
    "Webhook accepted"
  );

  return { accepted: true, insertedCount: writeResult.count, deduplicated: false };
});

app.post("/api/detection/run", async (request) => {
  const query = request.query as { reset?: string };
  const fullReset = query?.reset === "1" || query?.reset === "true";

  const organization = await prisma.organization.findUnique({
    where: { name: DEMO_ORG_NAME }
  });

  if (!organization) {
    return {
      ok: false,
      message: "No organization data found. Send bank webhook data first."
    };
  }

  const startedAt = new Date();

  const transactions = await prisma.transactionRaw.findMany({
    where: {
      bankAccount: {
        bankConnection: {
          organizationId: organization.id
        }
      }
    },
    select: {
      bookedAt: true,
      amount: true,
      currency: true,
      merchantText: true
    }
  });

  const candidates = detectMonthlyCandidates(
    transactions.map((tx) => ({
      bookedAt: tx.bookedAt,
      amount: Number(tx.amount),
      currency: tx.currency,
      merchantText: tx.merchantText
    }))
  );

  let removedStaleSubscriptions = 0;
  let clearedTransientFindings = 0;

  if (fullReset) {
    await prisma.savingsLedger.deleteMany({
      where: { organizationId: organization.id }
    });
    await prisma.wasteFinding.deleteMany({
      where: { organizationId: organization.id }
    });
    await prisma.subscriptionDetected.deleteMany({
      where: { organizationId: organization.id }
    });
  } else {
    const removable = await prisma.wasteFinding.findMany({
      where: {
        organizationId: organization.id,
        status: { in: ["open", "in_review"] },
        savingsEntries: { none: { confirmedMonthly: { not: null } } }
      },
      select: { id: true }
    });
    const removableIds = removable.map((row) => row.id);
    clearedTransientFindings = removableIds.length;
    if (removableIds.length > 0) {
      await prisma.savingsLedger.deleteMany({
        where: { wasteFindingId: { in: removableIds } }
      });
      await prisma.wasteFinding.deleteMany({
        where: { id: { in: removableIds } }
      });
    }

    const candidateKeys = new Set(candidates.map((c) => c.detectionKey));
    const existingSubs = await prisma.subscriptionDetected.findMany({
      where: { organizationId: organization.id },
      select: { id: true, detectionKey: true }
    });
    const protectedSubIds = new Set(
      (
        await prisma.wasteFinding.findMany({
          where: {
            organizationId: organization.id,
            status: { in: ["actioned", "closed"] },
            subscriptionId: { not: null }
          },
          select: { subscriptionId: true }
        })
      )
        .map((f) => f.subscriptionId)
        .filter((id): id is string => id != null)
    );

    for (const sub of existingSubs) {
      if (candidateKeys.has(sub.detectionKey)) continue;
      if (protectedSubIds.has(sub.id)) continue;
      const findingRows = await prisma.wasteFinding.findMany({
        where: { subscriptionId: sub.id },
        select: { id: true }
      });
      const findingIds = findingRows.map((f) => f.id);
      if (findingIds.length > 0) {
        await prisma.savingsLedger.deleteMany({
          where: { wasteFindingId: { in: findingIds } }
        });
        await prisma.wasteFinding.deleteMany({
          where: { id: { in: findingIds } }
        });
      }
      await prisma.subscriptionDetected.delete({ where: { id: sub.id } });
      removedStaleSubscriptions += 1;
    }
  }

  const createdSubscriptions: Array<{
    id: string;
    canonicalName: string;
    avgAmount: number;
    confidence: number;
    missingCycles: number;
    amountVarianceRatio: number;
  }> = [];
  let createdFindings = 0;

  for (const candidate of candidates) {
    const merchant = await prisma.merchant.upsert({
      where: { canonicalName: candidate.canonicalName },
      update: { category: "saas" },
      create: { canonicalName: candidate.canonicalName, category: "saas" }
    });

    const subscription = await prisma.subscriptionDetected.upsert({
      where: {
        organizationId_detectionKey: {
          organizationId: organization.id,
          detectionKey: candidate.detectionKey
        }
      },
      create: {
        organizationId: organization.id,
        detectionKey: candidate.detectionKey,
        merchantId: merchant.id,
        billingCycle: "monthly",
        avgAmount: candidate.avgAmount,
        currency: candidate.currency,
        confidence: candidate.confidence,
        status: "active"
      },
      update: {
        merchantId: merchant.id,
        billingCycle: "monthly",
        avgAmount: candidate.avgAmount,
        currency: candidate.currency,
        confidence: candidate.confidence,
        status: "active"
      }
    });

    createdSubscriptions.push({
      id: subscription.id,
      canonicalName: candidate.canonicalName,
      avgAmount: candidate.avgAmount,
      confidence: candidate.confidence,
      missingCycles: candidate.missingCycles,
      amountVarianceRatio: candidate.amountVarianceRatio
    });

    if (candidate.avgAmount >= 200 && candidate.confidence >= 0.62) {
      await prisma.wasteFinding.create({
        data: {
          organizationId: organization.id,
          subscriptionId: subscription.id,
          type: "review",
          title: `${candidate.canonicalName}: high-cost recurring charge requires ownership review`,
          estimatedMonthlySaving: Number((candidate.avgAmount * 0.2).toFixed(2)),
          confidence: Number(Math.max(0.6, candidate.confidence - 0.05).toFixed(2)),
          status: "open"
        }
      });
      createdFindings += 1;
    }

    if (candidate.missingCycles > 0 || candidate.amountVarianceRatio > 0.12) {
      await prisma.wasteFinding.create({
        data: {
          organizationId: organization.id,
          subscriptionId: subscription.id,
          type: "orphaned",
          title: `${candidate.canonicalName}: unstable cadence suggests account ownership drift`,
          estimatedMonthlySaving: Number((candidate.avgAmount * 0.12).toFixed(2)),
          confidence: Number(Math.max(0.55, candidate.confidence - 0.12).toFixed(2)),
          status: "in_review"
        }
      });
      createdFindings += 1;
    }
  }

  const duplicatesByMerchant = new Map<string, typeof createdSubscriptions>();
  for (const sub of createdSubscriptions) {
    const list = duplicatesByMerchant.get(sub.canonicalName) ?? [];
    list.push(sub);
    duplicatesByMerchant.set(sub.canonicalName, list);
  }

  let generatedDuplicateFindings = 0;
  for (const [canonicalName, subs] of duplicatesByMerchant.entries()) {
    if (subs.length < 2) continue;
    const sorted = [...subs].sort((a, b) => b.avgAmount - a.avgAmount);
    const duplicateTotal = sorted.slice(1).reduce((sum, sub) => sum + sub.avgAmount, 0);
    const confidence = average(sorted.map((sub) => sub.confidence));
    await prisma.wasteFinding.create({
      data: {
        organizationId: organization.id,
        subscriptionId: sorted[1].id,
        type: "duplicate",
        title: `${canonicalName}: possible duplicate subscriptions across accounts`,
        estimatedMonthlySaving: Number(duplicateTotal.toFixed(2)),
        confidence: Number(clamp(confidence - 0.08, 0.58, 0.96).toFixed(2)),
        status: "open"
      }
    });
    createdFindings += 1;
    generatedDuplicateFindings += 1;
  }

  const subsWithoutOwner = await prisma.subscriptionDetected.findMany({
    where: {
      organizationId: organization.id,
      ownerUserId: null
    },
    select: {
      id: true,
      avgAmount: true,
      merchant: { select: { canonicalName: true } }
    }
  });

  for (const subRow of subsWithoutOwner) {
    const openGap = await prisma.wasteFinding.findFirst({
      where: {
        subscriptionId: subRow.id,
        type: "owner_gap",
        status: { in: ["open", "in_review"] }
      },
      select: { id: true }
    });
    if (openGap) continue;
    const label = subRow.merchant?.canonicalName ?? "Subscription line";
    const avg = Number(subRow.avgAmount);
    await prisma.wasteFinding.create({
      data: {
        organizationId: organization.id,
        subscriptionId: subRow.id,
        type: "owner_gap",
        title: `${label}: no subscription owner assigned — assign in Owners`,
        estimatedMonthlySaving: Number((avg * 0.1).toFixed(2)),
        confidence: 0.72,
        status: "open"
      }
    });
    createdFindings += 1;
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const avgCandidateConfidence =
    candidates.length > 0 ? average(candidates.map((c) => c.confidence)) : 0;

  const run = await prisma.detectionRun.create({
    data: {
      organizationId: organization.id,
      startedAt,
      finishedAt,
      durationMs,
      success: true,
      incremental: !fullReset,
      fullReset,
      scannedTransactions: transactions.length,
      candidateCount: candidates.length,
      avgCandidateConfidence: Number(avgCandidateConfidence.toFixed(4)),
      detectedSubscriptions: createdSubscriptions.length,
      generatedFindings: createdFindings,
      generatedDuplicateFindings,
      removedStaleSubscriptions,
      clearedTransientFindings
    }
  });

  return {
    ok: true,
    runId: run.id,
    incremental: !fullReset,
    fullReset,
    scannedTransactions: transactions.length,
    detectedSubscriptions: createdSubscriptions.length,
    generatedFindings: createdFindings,
    generatedDuplicateFindings,
    removedStaleSubscriptions,
    clearedTransientFindings,
    durationMs,
    avgCandidateConfidence: Number(avgCandidateConfidence.toFixed(4))
  };
});

app.get("/api/detection/runs", async (request) => {
  const organization = await prisma.organization.findUnique({
    where: { name: DEMO_ORG_NAME }
  });
  if (!organization) {
    return { items: [] as const };
  }
  const query = request.query as { limit?: string };
  const rawLimit = Number(query?.limit ?? "15");
  const limit = Number.isFinite(rawLimit)
    ? Math.min(50, Math.max(1, Math.floor(rawLimit)))
    : 15;

  const rows = await prisma.detectionRun.findMany({
    where: { organizationId: organization.id },
    orderBy: { finishedAt: "desc" },
    take: limit
  });

  return {
    items: rows.map((row) => ({
      id: row.id,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt.toISOString(),
      durationMs: row.durationMs,
      success: row.success,
      errorMessage: row.errorMessage,
      incremental: row.incremental,
      fullReset: row.fullReset,
      scannedTransactions: row.scannedTransactions,
      candidateCount: row.candidateCount,
      avgCandidateConfidence: row.avgCandidateConfidence,
      detectedSubscriptions: row.detectedSubscriptions,
      generatedFindings: row.generatedFindings,
      generatedDuplicateFindings: row.generatedDuplicateFindings,
      removedStaleSubscriptions: row.removedStaleSubscriptions,
      clearedTransientFindings: row.clearedTransientFindings
    }))
  };
});

export { app, prisma };

export async function listenIfEnabled(): Promise<void> {
  if (process.env.SKIP_API_LISTEN === "1") {
    return;
  }
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}
