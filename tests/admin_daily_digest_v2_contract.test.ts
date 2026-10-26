import fs from 'fs';
import path from 'path';
describe('retired owner digest surface', () => {
 const html=fs.readFileSync(path.join(process.cwd(),'admin/v2/legacy.html'),'utf8');
 test('has no route, panel, renderer or callable entry',()=>{
  for(const token of ['tab-daily-digest','daily-digest.js','adminGenerateDailyDigest','adminOpenDailyDigest','registerDailyDigestOpen','loadDailyDigest']) expect(html).not.toContain(token);
 });
 test('keeps unrelated owner alert routing and diagnostics',()=>{
  expect(html).toContain("id:'ownerDailyDigest'");
  expect(html).toContain('tab-diagnostics');
 });
});
