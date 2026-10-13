import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadGermanTask6cL01SevenFormulaicCandidateDeV1 } from "../modules/learning-v2/curriculum/de/task6c_l01_seven_formulaic_candidate_de_v1";
const repo=process.cwd(), root=path.join(repo,"modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1"), task5=path.join(repo,"modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json");
const read=(f:string):any=>JSON.parse(fs.readFileSync(f,"utf8"));const write=(f:string,x:any)=>fs.writeFileSync(f,JSON.stringify(x));const sha=(f:string)=>createHash("sha256").update(fs.readFileSync(f)).digest("hex");
function fixture(){const d=fs.mkdtempSync(path.join(os.tmpdir(),"formulaic-"));fs.cpSync(root,d,{recursive:true});const t=path.join(d,"task5.json");fs.copyFileSync(task5,t);return{d,t}}
function bad(mut:(x:{d:string,t:string})=>void,re:RegExp){const x=fixture();try{mut(x);assert.throws(()=>loadGermanTask6cL01SevenFormulaicCandidateDeV1({rootForTest:x.d,task5PathForTest:x.t,expectedManifestSha256ForTest:sha(path.join(x.d,"manifest.json"))}),re)}finally{fs.rmSync(x.d,{recursive:true,force:true})}}
const x=loadGermanTask6cL01SevenFormulaicCandidateDeV1();assert.equal(x.rows.length,7);assert.equal(x.status,"HOLD");
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rows[1].sourcePlanId=v.rows[0].sourcePlanId;write(f,v)},/roster/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rows[1].source="redemittel";write(f,v)},/roster_source/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);[v.rows[0].locator,v.rows[0].occurrence,v.rows[2].locator,v.rows[2].occurrence]=[v.rows[2].locator,v.rows[2].occurrence,v.rows[0].locator,v.rows[0].occurrence];write(f,v)},/extraction_map/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rows[0].locator.pdfPage=999;write(f,v)},/extraction_map/);
bad(({d})=>fs.appendFileSync(path.join(d,"raw/goethe_redemittel.pdf"),"x"),/source_integrity/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.sources.unreviewed={path:"raw/english.pdf",sha256:"0".repeat(64),bytes:0};write(f,v)},/sources_schema/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rows[0].occurrence.sha256="0".repeat(64);write(f,v)},/extraction_map/);
bad(({t})=>fs.appendFileSync(t," "),/task5_hash/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.immutableScope.canonicalRegistrySha256="0".repeat(64);write(f,v)},/immutable_scope/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.immutableScope.englishCourseManifestSha256="0".repeat(64);write(f,v)},/immutable_scope/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.task7Unlock=true;write(f,v)},/authority/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rowsPromoted=1;write(f,v)},/authority/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.learnerFacing=true;write(f,v)},/authority/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rows[0].admissionStatus="CANONICAL";write(f,v)},/roster/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rows[0].evidenceFunction="FORMALITY_POLICY";write(f,v)},/roster/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rows[0].learnerRu="Привет";write(f,v)},/row_schema/);
bad(({d})=>{const f=path.join(d,"manifest.json"),v=read(f);v.rows.push({sourcePlanId:"en_fake"});write(f,v)},/roster/);
process.stdout.write("TASK6C_L01_SEVEN_FORMULAIC status=HOLD rows=7 rowsPromoted=0 task7Unlock=false\n");
