import fs from 'node:fs';
import path from 'node:path';
describe('manual admin reads after digest retirement',()=>{
 const html=fs.readFileSync(path.join(process.cwd(),'admin/v2/legacy.html'),'utf8');
 test('removes digest business reads, retaining manual controls',()=>{
  expect(html).not.toContain("collection(db, 'admin_digest_runs')");
  expect(html).not.toContain("doc(db, 'admin_digests'");
  expect(html).toContain('data-pm-manual-load');
  expect(html).toContain("pmV5RevalidateManagedAccess(reason, false)");
 });
 test('SOC2 manual path loads both sources, with no snapshot write loop',()=>{
  expect(html).toContain("'soc2-readiness': () => pmV5SafeCall('loadSoc2Readiness')");
  expect(html).toContain('[await soc2SyncReadiness(), await loadAutomatedProjection()]');
  expect(html).not.toContain("backend.persistControl(control, 'snapshot')");
 });
});
