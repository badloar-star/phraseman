import { loadGermanTask7V2AuthorityMigrationHoldDeV2 } from "../modules/learning-v2/curriculum/de/task6c_full_allocation_authority_de_v2.ts";

const args = process.argv.slice(2);

if (args.includes("--write")) {
  throw new Error("TASK7_V2_WRITE_FORBIDDEN");
}

if (args.length !== 0) {
  throw new Error("TASK7_V2_ARGUMENTS_FORBIDDEN");
}

const hold = loadGermanTask7V2AuthorityMigrationHoldDeV2();

process.stdout.write(
  `TASK7_V2_DRY_RUN status=${hold.status} authority=${hold.authority} plans=${hold.task5PlanIds} resolved=${hold.resolvedPlanIds} unresolved=${hold.unresolvedPlanIds} packets=${hold.packetIds} materialized=${hold.materializedPackets} next=${hold.nextEligibleSessionId} task7Unlock=${String(hold.task7Unlock)} learner=${String(hold.learnerFacing)} release=${String(hold.releaseAuthorized)}\n`,
);
