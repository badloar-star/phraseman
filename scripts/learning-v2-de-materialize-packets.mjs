import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function rejectGermanTask7WriteUntilGeneratorExists() {
  throw new Error(
    "TASK7_WRITE_UNIMPLEMENTED: packet records require a reviewed native blueprint generator",
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--write")
    return rejectGermanTask7WriteUntilGeneratorExists();
  if (args.length !== 0)
    throw new Error("TASK7_MATERIALIZER_ARGUMENTS_INVALID");
  const { loadGermanTask6cValidatedFullAllocationForTask7DryRunDeV1 } =
    await import("../modules/learning-v2/curriculum/de/task6c_full_allocation_authority_de_v1.ts");
  const allocation =
    loadGermanTask6cValidatedFullAllocationForTask7DryRunDeV1();
  process.stdout.write(
    `TASK7_DRY_RUN_INPUTS_VALID allocations=${allocation.allocationCount} status=HOLD\n`,
  );
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.env.LEARNING_V2_TASK7_TSX_LOADER !== "1") {
    const child = spawnSync(
      process.execPath,
      ["--import", "tsx", process.argv[1], ...process.argv.slice(2)],
      {
        stdio: "inherit",
        env: { ...process.env, LEARNING_V2_TASK7_TSX_LOADER: "1" },
      },
    );
    process.exitCode = child.status ?? 1;
  } else {
    await main();
  }
}
