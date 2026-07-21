import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const harnessRoot = path.join(
  repositoryRoot,
  "functions",
  ".codex-tmp",
  "v2-progress-transport",
);

await mkdir(harnessRoot, { recursive: true });
await writeFile(
  path.join(harnessRoot, "package.json"),
  `${JSON.stringify({
    name: "phraseman-v2-progress-transport-emulator",
    private: true,
    main: "lib/functions/src/learning_v2/emulator/progress_callable_transport_entry.js",
    engines: { node: "22" },
    dependencies: {
      "firebase-admin": "^13.10.0",
      "firebase-functions": "^7.2.5",
    },
  }, null, 2)}\n`,
  "utf8",
);
