import { runGermanTask6cL02CaptureProducerDeV3 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_producer_de_v3";

runGermanTask6cL02CaptureProducerDeV3().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
