const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

async function printJson(label, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  console.log(`\n=== ${label} (${response.status}) ===`);
  console.log(JSON.stringify(body, null, 2));
}

async function run() {
  const webhookPayload = {
    provider: "truelayer",
    accountId: "acc_demo_001",
    transactions: [
      {
        externalTxId: "tx_001",
        bookedAt: "2026-04-01T09:00:00.000Z",
        amount: 49.99,
        currency: "GBP",
        merchantText: "NOTION*SUBSCRIPTION"
      },
      {
        externalTxId: "tx_002",
        bookedAt: "2026-04-02T09:00:00.000Z",
        amount: 129.0,
        currency: "GBP",
        merchantText: "ADOBE*SUBSCR"
      }
    ]
  };

  const webhookResponse = await fetch(`${baseUrl}/api/bank/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(webhookPayload)
  });

  const webhookBody = await webhookResponse.json();
  console.log("\n=== WEBHOOK RESULT (first) ===");
  console.log(JSON.stringify(webhookBody, null, 2));

  const webhookReplay = await fetch(`${baseUrl}/api/bank/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(webhookPayload)
  });
  const webhookReplayBody = await webhookReplay.json();
  console.log("\n=== WEBHOOK RESULT (replay, expect deduplicated) ===");
  console.log(JSON.stringify(webhookReplayBody, null, 2));

  await printJson("DASHBOARD SUMMARY", "/api/dashboard/summary");
  await printJson("SUBSCRIPTIONS", "/api/subscriptions");
  await printJson("FINDINGS", "/api/findings");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
