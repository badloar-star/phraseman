import fs from 'fs';
import path from 'path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin monthly decision pack browser safety', () => {
  test('bounds and validates an inline ZIP before decoding or downloading it', () => {
    const page = read('admin/v2/scripts/pages/monthly-decision-pack.js');
    const serverZip = read('functions/src/monthly_decision_pack_zip.ts');

    expect(serverZip).toContain('DECISION_PACK_ZIP_LIMIT_BYTES = 4 * 1024 * 1024');
    expect(page).toContain('MAX_INLINE_ZIP_BYTES = 4 * 1024 * 1024');
    expect(page).toContain("data.mimeType !== 'application/zip'");
    expect(page).toContain('data.byteSize > MAX_INLINE_ZIP_BYTES');
    expect(page).toContain('data.base64.length > MAX_BASE64_LENGTH');
    expect(page).toContain('binary.length !== data.byteSize');
    expect(page).toContain('safeDecisionPackFilename');
    expect(page).not.toContain('anchor.download = data.filename');
  });
});
