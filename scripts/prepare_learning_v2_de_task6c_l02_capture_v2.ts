import * as fs from "node:fs";

import {
  assertGermanTask6cL02CaptureRootAvailableDeV2,
  GERMAN_TASK6C_L02_CAPTURE_PREPARATION_PATHS_DE_V2,
  getGermanTask6cL02CaptureInputContractDeV2,
} from "../modules/learning-v2/curriculum/de/task6c_l02_capture_transport_de_v2";

const args = process.argv.slice(2);
if (
  args.length !== 1 ||
  (args[0] !== "--print-request" && args[0] !== "--assert-new-root")
) {
  throw new Error(
    "CAPTURE_V2_PREPARATION_USAGE:--print-request|--assert-new-root",
  );
}

assertGermanTask6cL02CaptureRootAvailableDeV2(
  fs.existsSync(GERMAN_TASK6C_L02_CAPTURE_PREPARATION_PATHS_DE_V2.evidenceRoot),
);

if (args[0] === "--assert-new-root") {
  process.stdout.write("CAPTURE_V2_NEW_ROOT_AVAILABLE\n");
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        networkAction: "FORBIDDEN_IN_PREPARATION_SCRIPT",
        requiredExecutor: "EXTERNAL_SIGNED_CAPTURE_RUNNER",
        immutableRootPolicy: "CREATE_ONCE_NO_OVERWRITE",
        input: getGermanTask6cL02CaptureInputContractDeV2(),
      },
      null,
      2,
    )}\n`,
  );
}
