import assert from "node:assert/strict";

import { createLearningV2InteractionRuneAwardLedgerV1 } from "../app/learning_v2_interaction_rune_award_v1";

const ledger = createLearningV2InteractionRuneAwardLedgerV1();
assert.equal(ledger.claim("interaction-1", 3), 3);
assert.equal(ledger.claim("interaction-1", 3), 0, "double tap must not award twice");
assert.equal(ledger.claim("interaction-2", 2), 2);
assert.equal(ledger.total(), 5);

process.stdout.write("LEARNING V2 SESSION 1 RUNE IDEMPOTENCY GATE: PASS\n");
