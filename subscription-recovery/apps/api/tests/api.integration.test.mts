import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

describe("subscription-recovery API", () => {
  let app: FastifyInstance;

  before(async () => {
    process.env.SKIP_API_LISTEN = "1";
    const mod = await import("../src/server.js");
    app = mod.app;
    await app.ready();
  });

  after(async () => {
    await app.close();
    const { prisma } = await import("../src/server.js");
    await prisma.$disconnect();
  });

  test("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body), { ok: true });
  });

  test("POST /api/bank/webhook rejects invalid body before DB", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/bank/webhook",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ provider: "x" })
    });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body) as { error?: string };
    assert.equal(body.error, "Invalid webhook payload");
  });

  test(
    "webhook ingest, detection run, PATCH finding status",
    { skip: !hasDatabaseUrl },
    async () => {
      const accountId = `acc_test_${randomUUID().slice(0, 8)}`;
      const base = "ADOBE*API_TEST";
      const webhookPayload = {
        provider: "integration_test",
        accountId,
        transactions: [
          {
            externalTxId: `e_${randomUUID()}_1`,
            bookedAt: "2026-01-01T10:00:00.000Z",
            amount: 50,
            currency: "GBP",
            merchantText: base
          },
          {
            externalTxId: `e_${randomUUID()}_2`,
            bookedAt: "2026-02-03T10:00:00.000Z",
            amount: 50,
            currency: "GBP",
            merchantText: base
          },
          {
            externalTxId: `e_${randomUUID()}_3`,
            bookedAt: "2026-03-02T10:00:00.000Z",
            amount: 50,
            currency: "GBP",
            merchantText: base
          }
        ]
      };

      const w1 = await app.inject({
        method: "POST",
        url: "/api/bank/webhook",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(webhookPayload)
      });
      assert.equal(w1.statusCode, 200);
      const w1Body = JSON.parse(w1.body) as { accepted?: boolean; deduplicated?: boolean };
      assert.equal(w1Body.accepted, true);
      assert.equal(w1Body.deduplicated, false);

      const w2 = await app.inject({
        method: "POST",
        url: "/api/bank/webhook",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify(webhookPayload)
      });
      assert.equal(w2.statusCode, 200);
      const w2Body = JSON.parse(w2.body) as { deduplicated?: boolean };
      assert.equal(w2Body.deduplicated, true);

      const det = await app.inject({ method: "POST", url: "/api/detection/run" });
      assert.equal(det.statusCode, 200);
      const detBody = JSON.parse(det.body) as { ok?: boolean; scannedTransactions?: number };
      assert.equal(detBody.ok, true);
      assert.ok(typeof detBody.scannedTransactions === "number");

      const list = await app.inject({ method: "GET", url: "/api/findings" });
      assert.equal(list.statusCode, 200);
      const listBody = JSON.parse(list.body) as { items: Array<{ id: string; status: string }> };
      assert.ok(Array.isArray(listBody.items));
      assert.ok(listBody.items.length > 0, "expected at least one finding after detection");
      const findingId = listBody.items[0].id;

      const patch = await app.inject({
        method: "PATCH",
        url: `/api/findings/${findingId}/status`,
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ status: "in_review" })
      });
      assert.equal(patch.statusCode, 200);
      const patchBody = JSON.parse(patch.body) as { ok?: boolean; item?: { status: string } };
      assert.equal(patchBody.ok, true);
      assert.equal(patchBody.item?.status, "in_review");
    }
  );
});
