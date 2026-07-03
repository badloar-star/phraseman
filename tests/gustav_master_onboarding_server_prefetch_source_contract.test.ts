import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'scripts', 'gustav_french_reviewer_master_manifest.ts'), 'utf8');

describe('Gustav master onboarding server prefetch source contract', () => {
  it('keeps the onboarding server prefetch packet in the master evidence inventory', () => {
    expect(SOURCE).toContain("'audits/onboarding_server_prefetch_contract_v2_packet.json'");
  });
});
