// Подставной parity_shot для тестов робота (PARITY_SHOT_SCRIPT): вместо playwright/макета «склеивает» кадр, дописав метку.
// STUB_STITCH_FAIL=1 — имитирует отказ склейки (сервер макетов недоступен и т. п.).
const fs = require('node:fs');
const path = require('node:path');

const id = process.argv[3];
const bare = process.env.PARITY_FAKE_DEVICE_PNG;
const outDir = process.env.PARITY_EVIDENCE_DIR;
if (process.env.STUB_STITCH_FAIL === '1') {
  console.error('mockup_unreachable:http://127.0.0.1:8765/cards-v2.html status=none');
  process.exit(1);
}
if (!id || !bare || !outDir) {
  console.error('stub: нет id / PARITY_FAKE_DEVICE_PNG / PARITY_EVIDENCE_DIR');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${id}.png`), Buffer.concat([Buffer.from('STITCHED:'), fs.readFileSync(bare)]));
console.log(`[PARITY-SHOT] stub wrote ${id}.png`);
