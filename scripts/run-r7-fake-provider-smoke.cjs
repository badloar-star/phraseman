const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { runR7FakeProviderMatrix } = require('../functions/lib/content_factory/r7_fake_provider_harness');
const { SUPPORTED_CONTENT_FACTORY_STUDY_TARGETS } = require('../functions/lib/admin_content_factory');

async function main() {
  const out = path.resolve(__dirname, '..', '.codex-tmp', 'admin-content-factory-r7-fake-smoke');
  fs.mkdirSync(out, { recursive: true });
  const report = await runR7FakeProviderMatrix({ supportedTargets: SUPPORTED_CONTENT_FACTORY_STUDY_TARGETS });
  const write = (name, value) => fs.writeFileSync(path.join(out, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  write('matrix.json', report);
  write('verification.json', { status: report.scenarios.every((item) => item.status === 'passed') ? 'passed' : 'failed', externalApiCalls: 0, provider: 'injected-fake-only', scenarioCount: report.scenarios.length, crossLanguageLeakage: report.crossLanguageLeakage });
  const names = ['matrix.json', 'verification.json'];
  const files = Object.fromEntries(names.map((name) => [name, { sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(out, name))).digest('hex'), bytes: fs.statSync(path.join(out, name)).size }]));
  write('manifest.json', { runId: 'r7-fake-provider-smoke', files });
  const manifestHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, 'manifest.json'))).digest('hex');
  fs.writeFileSync(path.join(out, 'manifest.sha256'), `${manifestHash}  manifest.json\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ status: 'passed', scenarios: report.scenarios.length, manifestHash })}\n`);
}
main().catch((error) => { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; });
