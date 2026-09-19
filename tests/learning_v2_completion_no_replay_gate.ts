import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const resultSource = readFileSync(
  resolve(process.cwd(), "components/learning-v2/horizons/HorizonSessionResult.tsx"),
  "utf8",
);
const copySource = readFileSync(
  resolve(process.cwd(), "components/learning-v2/horizons/copy.ts"),
  "utf8",
);
const releaseCompletionSource = `${resultSource}\n${copySource}`;

assert.doesNotMatch(
  releaseCompletionSource,
  /Повторить анимацию|Replay animation|Повторити анімацію|Repetir anima(?:ç|c)ão|Xem lại hiệu ứng|Putar ulang animasi|Animasyonu tekrar oynat|Powtórz animację|learning-v2-completion-replay|ctaTertiary/u,
  "the learner-facing completion screen must never expose an animation replay control",
);
assert.doesNotMatch(
  resultSource,
  /useState\(0\)|setReplay|replayKey=\{replay\}/u,
  "release completion must not keep hidden replay state",
);

console.log("LEARNING V2 COMPLETION NO-REPLAY GATE: PASS");
