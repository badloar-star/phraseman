'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { audit } = require('../scripts/phraseman-baseline.cjs');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'pm-p0-'));
  t.after(() => fs.rmSync(dir,{recursive:true,force:true}));
  const git = (...args) => execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
  const file = (name,text) => fs.writeFileSync(path.join(dir,name),text);
  const commit = () => { git('add','-A'); git('commit','-qm','fixture'); return git('rev-parse','HEAD'); };
  git('init','-q'); git('config','user.email','test@invalid.example'); git('config','user.name','Fixture'); git('config','commit.gpgsign','false');
  file('source.txt','unchanged'); return {dir,git,file,commit,first:commit()};
}
test('equal trees are not deployment approval', t => {
  const f=fixture(t); const r=audit({repo:f.dir,release:f.first,candidate:'HEAD'});
  assert.equal(r.state,'COMMITTED_TREES_MATCH'); assert.equal(r.deployApproved,false);
});
test('tracked, staged and untracked state survives a scan', t => {
  const f=fixture(t); f.file('source.txt','changed'); f.git('add','source.txt'); f.file('local.txt','private text');
  const index = path.join(f.dir,'.git','index'); const previous=fs.readFileSync(index);
  const r=audit({repo:f.dir,release:f.first,candidate:'HEAD'});
  assert.equal(r.state,'HOLD_DIRTY_WORKTREE'); assert.equal(r.localTrackedChanges,1); assert.equal(r.localUntrackedFiles,1);
  assert.deepEqual(fs.readFileSync(index),previous); assert.equal(f.git('rev-parse','HEAD'),f.first);
  assert.ok(!JSON.stringify(r).includes('local.txt')); assert.ok(!JSON.stringify(r).includes('private text'));
});
test('missing release is never replaced by HEAD', t => {
  const f=fixture(t); assert.equal(audit({repo:f.dir,release:'missing-ref',candidate:'HEAD'}).state,'HOLD_MISSING_OBJECT');
});
test('release-only and changed paths reported in the correct direction', t => {
  const f=fixture(t); f.file('old name.txt','release only'); const release=f.commit();
  fs.unlinkSync(path.join(f.dir,'old name.txt')); f.file('source.txt','newer'); f.commit();
  const r=audit({repo:f.dir,release,candidate:'HEAD',paths:true});
  assert.equal(r.state,'HOLD_REVIEW_DIFF'); assert.deepEqual(r.byStatus,{D:1,M:1});
  assert.deepEqual(r.paths,[{status:'D',file:'old name.txt'},{status:'M',file:'source.txt'}]);
});
test('scan from a subdirectory includes changes elsewhere', t => {
  const f=fixture(t); fs.mkdirSync(path.join(f.dir,'sub')); f.file('source.txt','abc'); f.commit();
  const r=audit({repo:path.join(f.dir,'sub'),release:f.first,candidate:'HEAD'}); assert.equal(r.changedPaths,1);
});
test('invalid ref cannot be an option', t => {
  const f=fixture(t); assert.throws(()=>audit({repo:f.dir,release:'--help',candidate:'HEAD'}),/Invalid ref/);
});
