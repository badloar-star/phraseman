import { loadGermanTask6cL02CaptureTransportDeV2 } from "../modules/learning-v2/curriculum/de/task6c_l02_capture_transport_de_v2";

const capture = loadGermanTask6cL02CaptureTransportDeV2();
process.stdout.write(
  `LEARNING V2 GERMAN L02 CAPTURE TRANSPORT V2: ${capture.status} rows=${capture.captures.length}\n`,
);
