import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = "modules/learning-v2/curriculum/de/evidence/task6c_l01_seven_formulaic_v1";
const TASK5 = "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json";
const TASK5_HASH = "494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29";
const MANIFEST_SHA256 = "2c3bca21dc11dee134979bacf64520cca3ce1dce1d0bd58b16657d2f75955e98";
const EXTRACTION_MAP_SHA256 = "4cb9d040275870fe6857b222c9bad26fab46646094994a7704bb9d9f0c93c3a7";
const IMMUTABLE_SCOPE = {
  task5BlueprintSha256: TASK5_HASH,
  englishCourseManifestSha256: "bfcc82ba0300eba9f706bdd82e7b2a6a9d2b5a9ea18859bff2d451b39d7fe976",
  b3aFinalAcceptanceManifestSha256: "fc3f891df1dfed6469463672545b6ddeb7eb6223274bb2074677efcc7bdca9ab",
  morphSemanticFactsModuleSha256: "63d3a10b0943e2afef0918f005a1d2784ba1077b6f6e48df094bd27b6b88f9d4",
  directSourceCaptureModuleSha256: "bbb58e3b4a35a237f6ce926559f5ace7ef40b8716aca11765804f139d48ca5bf",
  sourceAnchorAmendmentModuleSha256: "b7a59b55c51cf633b768164d025f3224432c72d862a54fae04c2281115912333",
  sixNounManifestSha256: "a3a44ab4d1bc79ccc0af6741070eeb36267382fab2f44bb3dfb912adcdb42b55",
  sixNounClosureSha256: "6bc849c3369468cfb59be92bfcbd249473f65a29c8e9170385ddcfbcfe619c44",
  canonicalRegistrySha256: "3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29",
} as const;
const IMMUTABLE_SCOPE_FILES = {
  task5BlueprintSha256: TASK5,
  englishCourseManifestSha256: "modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2.ts",
  b3aFinalAcceptanceManifestSha256: "docs/v2/curriculum/de/TASK6B3A_FINAL_ACCEPTANCE_MANIFEST_2026-10-11.json",
  morphSemanticFactsModuleSha256: "modules/learning-v2/curriculum/de/task6c_l01_morph_semantic_facts_de_v1.ts",
  directSourceCaptureModuleSha256: "modules/learning-v2/curriculum/de/task6c_l01_direct_source_capture_de_v1.ts",
  sourceAnchorAmendmentModuleSha256: "modules/learning-v2/curriculum/de/task6c_l01_source_anchor_amendment_de_v1.ts",
  sixNounManifestSha256: "modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/manifest.json",
  sixNounClosureSha256: "docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1/F.json",
  canonicalRegistrySha256: "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
} as const;
const ROSTER = [
  ["de_lex_plan_l01_c01_hallo_v1","de_l01_c01_s08","hallo|neutral informal greeting on meeting","Hallo","redemittel"],
  ["de_lex_plan_l01_c02_tschuess_v1","de_l01_c02_s16","tschuss|informal leave taking","Tschüss","wortliste"],
  ["de_lex_plan_l01_c03_ich_heisse_v1","de_l01_c03_s24","ich heiße|fixed first person expression for giving one s name","Ich heiße","redemittel"],
  ["de_lex_plan_l01_c04_guten_tag_v1","de_l01_c04_s32","guten tag|neutral formal greeting","Guten Tag","redemittel"],
  ["de_lex_plan_l01_c05_das_ist_v1","de_l01_c05_s40","das ist|fixed chunk for identifying a person","Das ist","redemittel"],
  ["de_lex_plan_l01_c06_auf_wiedersehen_v1","de_l01_c06_s48","auf wiedersehen|neutral formal leave taking","Auf Wiedersehen","redemittel"],
  ["de_lex_plan_l01_c07_guten_abend_v1","de_l01_c07_s56","guten abend|neutral greeting used on meeting in the evening","Guten Abend","redemittel"],
] as const;
const EXTRACTIONS = [
  [3,"WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN","Guten Tag! / Hallo!"],
  [24,"alphabetical Wortliste > T","tschüss Junge Leute sagen meistens „tschüss!“ und nicht „auf Wiedersehen“."],
  [2,"INFORMATIONEN ZUR PERSON","Ich heiße Max."],
  [3,"WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN","Guten Tag! / Hallo!"],
  [60,"FOTOS BESCHREIBEN > Wer?","Das ist / Das sind …"],
  [3,"WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN","Auf Wiedersehen! / Tschüs!"],
  [3,"WIE SAGT MAN? > BEGRÜSSEN UND VERABSCHIEDEN","Guten Abend! / Hallo!"],
] as const;
const sha=(x:Buffer|string)=>createHash("sha256").update(x).digest("hex"); type R=Record<string,unknown>;
function rec(x:unknown,c:string):asserts x is R{if(!x||typeof x!=="object"||Array.isArray(x))throw Error(c)}
function keys(x:R,k:string[],c:string){if(Object.keys(x).sort().join("\0")!==k.sort().join("\0"))throw Error(c)}
function plan(task5:R,id:string):R{for(const l of task5.lessons as any[]||[])for(const c of l.chapters as any[]||[])for(const p of c.checkpoint?.plannedNewLexicalSenses||[])if(p.id===id)return p;throw Error("task6c_l01_formulaic_task5_plan_missing")}
export function loadGermanTask6cL01SevenFormulaicCandidateDeV1(options:Readonly<{rootForTest?:string;task5PathForTest?:string;expectedManifestSha256ForTest?:string}>={}){
 const root=options.rootForTest??ROOT, tpath=options.task5PathForTest??TASK5, expectedManifestSha256=options.expectedManifestSha256ForTest??MANIFEST_SHA256; const tb=fs.readFileSync(tpath);if(sha(tb)!==TASK5_HASH)throw Error("task6c_l01_formulaic_task5_hash");const t=JSON.parse(tb.toString());rec(t,"task6c_l01_formulaic_task5_invalid");const manifestBytes=fs.readFileSync(path.join(root,"manifest.json"));if(sha(manifestBytes)!==expectedManifestSha256)throw Error("task6c_l01_formulaic_manifest_hash");const m:any=JSON.parse(manifestBytes.toString("utf8"));rec(m,"task6c_l01_formulaic_manifest_invalid");keys(m,["schemaVersion","status","canonicalAdmission","rowsPromoted","task7Unlock","learnerFacing","phraseClaim","task5","sources","extractionMap","immutableScope","rows"],"task6c_l01_formulaic_manifest_schema");if(m.schemaVersion!=="learning-v2-de-task6c-l01-seven-formulaic-durable-evidence.v1"||m.status!=="HOLD"||m.canonicalAdmission!=="FORBIDDEN"||m.rowsPromoted!==0||m.task7Unlock!==false||m.learnerFacing!==false||m.phraseClaim!==false)throw Error("task6c_l01_formulaic_authority");rec(m.task5,"task6c_l01_formulaic_task5_binding");keys(m.task5,["path","byteSha256"],"task6c_l01_formulaic_task5_binding");if(m.task5.path!==TASK5||m.task5.byteSha256!==TASK5_HASH)throw Error("task6c_l01_formulaic_task5_binding");
 rec(m.immutableScope,"task6c_l01_formulaic_immutable_scope");keys(m.immutableScope,Object.keys(IMMUTABLE_SCOPE),"task6c_l01_formulaic_immutable_scope");for(const k of Object.keys(IMMUTABLE_SCOPE) as (keyof typeof IMMUTABLE_SCOPE)[]){if(m.immutableScope[k]!==IMMUTABLE_SCOPE[k]||sha(fs.readFileSync(IMMUTABLE_SCOPE_FILES[k]))!==IMMUTABLE_SCOPE[k])throw Error("task6c_l01_formulaic_immutable_scope")}
 rec(m.sources,"task6c_l01_formulaic_sources_schema");keys(m.sources,["redemittel","wortliste"],"task6c_l01_formulaic_sources_schema");const used=new Set<string>();for(const [name,hash,bytes] of [["redemittel","5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",3685205],["wortliste","45fb648bc0ac02338f7898cae065953e320ab72ed0c14e13e0deffe6f1c5d64e",712341]] as const){rec(m.sources[name],"task6c_l01_formulaic_source");keys(m.sources[name],["path","sha256","bytes"],"task6c_l01_formulaic_source_schema");const s=m.sources[name];const p=path.resolve(root,s.path);if(!p.startsWith(path.resolve(root,"raw")+path.sep)||s.sha256!==hash||s.bytes!==bytes){throw Error("task6c_l01_formulaic_source")};const b=fs.readFileSync(p);if(sha(b)!==hash||b.length!==bytes)throw Error("task6c_l01_formulaic_source_integrity")}
 rec(m.extractionMap,"task6c_l01_formulaic_extraction_map");keys(m.extractionMap,["path","sha256"],"task6c_l01_formulaic_extraction_map");if(m.extractionMap.path!=="extraction_map.json"||m.extractionMap.sha256!==EXTRACTION_MAP_SHA256)throw Error("task6c_l01_formulaic_extraction_map");const mapBytes=fs.readFileSync(path.join(root,m.extractionMap.path));if(sha(mapBytes)!==EXTRACTION_MAP_SHA256)throw Error("task6c_l01_formulaic_extraction_map");const extraction:any=JSON.parse(mapBytes.toString("utf8"));rec(extraction,"task6c_l01_formulaic_extraction_map");keys(extraction,["schemaVersion","rawSources","rows"],"task6c_l01_formulaic_extraction_map");if(extraction.schemaVersion!=="learning-v2-de-task6c-l01-seven-formulaic-extraction-map.v1")throw Error("task6c_l01_formulaic_extraction_map");rec(extraction.rawSources,"task6c_l01_formulaic_extraction_map");keys(extraction.rawSources,["redemittel","wortliste"],"task6c_l01_formulaic_extraction_map");if(extraction.rawSources.redemittel!=="5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085"||extraction.rawSources.wortliste!=="45fb648bc0ac02338f7898cae065953e320ab72ed0c14e13e0deffe6f1c5d64e"||!Array.isArray(extraction.rows)||extraction.rows.length!==7)throw Error("task6c_l01_formulaic_extraction_map");
 for(let i=0;i<7;i++){const x=extraction.rows[i];rec(x,"task6c_l01_formulaic_extraction_map");keys(x,["sourcePlanId","source","pdfPage","heading","normalizedOccurrence"],"task6c_l01_formulaic_extraction_map");const r=ROSTER[i],e=EXTRACTIONS[i];if(x.sourcePlanId!==r[0]||x.source!==r[4]||x.pdfPage!==e[0]||x.heading!==e[1]||x.normalizedOccurrence!==e[2])throw Error("task6c_l01_formulaic_extraction_map")}
 if(!Array.isArray(m.rows)||m.rows.length!==7)throw Error("task6c_l01_formulaic_roster");for(let i=0;i<7;i++){const r=m.rows[i];rec(r,"task6c_l01_formulaic_row");keys(r,["sourcePlanId","checkpointPacketId","semanticIdentity","lemma","source","locator","occurrence","evidenceFunction","admissionStatus"],"task6c_l01_formulaic_row_schema");const e=ROSTER[i],x=EXTRACTIONS[i];if(r.sourcePlanId!==e[0])throw Error("task6c_l01_formulaic_roster_source");if(r.checkpointPacketId!==e[1])throw Error("task6c_l01_formulaic_roster_checkpoint");if(r.semanticIdentity!==e[2])throw Error("task6c_l01_formulaic_roster_identity");if(r.source!==e[4])throw Error("task6c_l01_formulaic_roster_source");if(r.lemma!==e[3]||used.has(r.sourcePlanId)||r.admissionStatus!=="PROPOSED_NOT_CANONICAL"||r.evidenceFunction!=="EXACT_OCCURRENCE_IN_OFFICIAL_LEARNING_INVENTORY")throw Error("task6c_l01_formulaic_roster");used.add(r.sourcePlanId);rec(r.locator,"task6c_l01_formulaic_locator");keys(r.locator,["pdfPage","heading"],"task6c_l01_formulaic_locator_schema");if(r.locator.pdfPage!==x[0]||r.locator.heading!==x[1])throw Error("task6c_l01_formulaic_extraction_map");rec(r.occurrence,"task6c_l01_formulaic_occurrence");keys(r.occurrence,["text","utf8Bytes","sha256"],"task6c_l01_formulaic_occurrence_schema");if(r.occurrence.text!==x[2]||Buffer.byteLength(r.occurrence.text,"utf8")!==r.occurrence.utf8Bytes||sha(r.occurrence.text)!==r.occurrence.sha256)throw Error("task6c_l01_formulaic_extraction_map");const p=plan(t,r.sourcePlanId);if(p.semanticIdentity!==r.semanticIdentity||p.lemmaOrExpression!==r.lemma)throw Error("task6c_l01_formulaic_task5_drift")}
 if(used.size!==7)throw Error("task6c_l01_formulaic_overclaim");return {status:"HOLD",canonicalAdmission:"FORBIDDEN",rowsPromoted:0,task7Unlock:false,learnerFacing:false,phraseClaim:false,task5:{path:TASK5,byteSha256:TASK5_HASH},sources:{redemittel:{path:"raw/goethe_redemittel.pdf",sha256:"5e514493a55e10895e04b16be6efcb91c5a3f19d8b18357abe799567e3331085",bytes:3685205},wortliste:{path:"raw/goethe_wortliste.pdf",sha256:"45fb648bc0ac02338f7898cae065953e320ab72ed0c14e13e0deffe6f1c5d64e",bytes:712341}},rows:m.rows.map((r:any)=>({sourcePlanId:r.sourcePlanId,checkpointPacketId:r.checkpointPacketId,semanticIdentity:r.semanticIdentity,lemma:r.lemma,source:r.source,locator:{pdfPage:r.locator.pdfPage,heading:r.locator.heading},occurrence:{text:r.occurrence.text,utf8Bytes:r.occurrence.utf8Bytes,sha256:r.occurrence.sha256},evidenceFunction:r.evidenceFunction,admissionStatus:r.admissionStatus}))};
}
