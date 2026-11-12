import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveClassicFirst as resolve, startV2WhenAllowed as launch } from '../modules/course-access/classic_first.ts';

const prior = { owner: 'alice', target: 'en', kind: 'explicit_open', clock: 'verified', atMs: 990 };
const snapshot = { owner: 'alice', target: 'en', state: 'complete', evidence: [prior] };
const base = { owner: 'alice', target: 'en', cutoverMs: 1000, classicReady: true, v2Ready: true, uiLocaleAllowsV2: true, v2GloballyHidden: false, history: snapshot };
const hist = (patch) => ({ ...snapshot, ...patch });
const evidence = (e) => hist({ evidence: [{ ...prior, ...e }] });
const cases = [
  ['new / no button or direct entry', {history: hist({ evidence: [] })}, 'new','classic',false,'classic'],
  ['opened without completing a lesson', {}, 'prior','classic',true,'open_v2'],
  ['session started', {history:evidence({kind:'session_started'})}, 'prior','classic',true,'open_v2'],
  ['old progress restores access', {history:evidence({kind:'progress'})}, 'prior','classic',true,'open_v2'],
  ['auto impression is not a visit', {history:evidence({kind:'auto_impression'})}, 'new','classic',false,'classic'],
  ['cutoff itself is excluded', {history:evidence({atMs:1000})}, 'new','classic',false,'classic'],
  ['post-cutover cannot self-enrol', {history:evidence({atMs:1100})}, 'new','classic',false,'classic'],
  ['device time alone is insufficient', {history:evidence({clock:'device_only'})}, 'unresolved','classic',false,'wait'],
  ['invalid evidence timestamp', {history:evidence({atMs:NaN})}, 'unresolved','classic',false,'wait'],
  ['foreign receipt gives no access', {history:evidence({owner:'bob'})}, 'new','classic',false,'classic'],
  ['language history is isolated', {history:evidence({target:'es'})}, 'new','classic',false,'classic'],
  ['old account snapshot after account switch', {owner:'bob'}, 'unresolved','classic',false,'wait'],
  ['old snapshot after language switch', {target:'es'}, 'unresolved','classic',false,'wait'],
  ['unbound guest must not inherit a grant', {owner:null}, 'unresolved','classic',false,'wait'],
  ['empty scope is not a grant', {owner:''}, 'unresolved','classic',false,'wait'],
  ['unknown cutoff is not evidence', {cutoverMs:null}, 'unresolved','classic',false,'wait'],
  ['profile still loading', {history:null}, 'unresolved','classic',false,'wait'],
  ['incomplete history is not new', {history:hist({state:'incomplete',evidence:[]})}, 'unresolved','classic',false,'wait'],
  ['known positive survives partial restoration', {history:hist({state:'incomplete'})}, 'prior','classic',true,'open_v2'],
  ['conflict needs recovery', {history:hist({state:'conflict'})}, 'conflict','classic',false,'classic'],
  ['global switch wins over grant', {v2GloballyHidden:true}, 'prior','classic',false,'classic'],
  ['unpublished target', {v2Ready:false}, 'prior','classic',false,'classic'],
  ['unsupported interface locale', {uiLocaleAllowsV2:false}, 'prior','classic',false,'classic'],
  ['unknown interface locale waits', {uiLocaleAllowsV2:null}, 'prior','classic',false,'wait'],
  ['no classic, entitled prior user has library', {classicReady:false}, 'prior','v2_library',true,'open_v2'],
  ['no classic or V2 available', {classicReady:false,v2Ready:false}, 'prior','home',false,'home'],
  ['no classic for new learner', {classicReady:false,history:hist({evidence:[]})}, 'new','home',false,'home'],
  ['Plus does not enrol a user', {isPremium:true,history:hist({evidence:[]})}, 'new','classic',false,'classic'],
];
for (const [name,patch,cohort,landing,button,entry] of cases) test(name, () => {
  const input = { ...base,...patch };
  assert.deepEqual(resolve(input), {cohort,landing,showNewCourseButton:button,v2Entry:entry});
  let starts = 0;
  const outcome = launch(input, () => ++starts);
  assert.equal(outcome.outcome,entry);
  assert.equal(starts, entry === 'open_v2' ? 1 : 0);
});
