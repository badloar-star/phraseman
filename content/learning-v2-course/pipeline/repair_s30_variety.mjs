#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-30";
const id = `${session}:i15`;
const atomicPath = path.join(root, "sessions/en/l01/s30/practice.atomic.json");
const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
for (const locale of ["ru", "uk"]) {
  const item = atomic.interactionsByLocale[locale].find((x) => x.interactionId === id);
  if (!item) throw new Error(`missing:${locale}`);
  const prompt = locale === "ru" ? "Соберите фразу — в кафе всего четыре стола, и они стоят вплотную" : "Складіть фразу — у кафе лише чотири столики, і вони стоять впритул";
  Object.assign(item, { family:"phrase_builder", inputMode:"ordered_tokens", prompt, responseOptions:[], mediaIds:[], audioTargetIds:[], accessibilityLabel:prompt, modePayload:{family:"phrase_builder",targetPhrase:"It is small.",orderedTokens:["It","is","small"],authoredDistractorTokens:["are"],slotFeedback:[]}, scriptedAlternate:null });
}
atomic.answers = atomic.answers.map((x) => x.interactionId === id ? {interactionId:id,correctText:"It is small.",correctResponseId:null} : x);
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic,null,2)}\n`);
const edits = {"final.ru.md":[["**15 · Вставьте слово — в кафе всего четыре стола, и они стоят вплотную**\n<!-- interaction_id: en:lesson-01:session-30:i15; family: context_gap_grammar -->\nЦель: `It is ___ .`\nВарианты: `small` · `loud` · `free`","**15 · Соберите фразу — в кафе всего четыре стола, и они стоят вплотную**\n<!-- interaction_id: en:lesson-01:session-30:i15; family: phrase_builder -->\nЦель: `It is small.`"],["15=context_gap_grammar, 16=listen_build_dictation","15=phrase_builder, 16=listen_build_dictation"]],"final.uk.md":[["**15 · Вставте слово — у кафе лише чотири столики, і вони стоять впритул**\n<!-- interaction_id: en:lesson-01:session-30:i15; family: context_gap_grammar -->\nЦіль: `It is ___ .`\nВаріанти: `small` · `loud` · `free`","**15 · Складіть фразу — у кафе лише чотири столики, і вони стоять впритул**\n<!-- interaction_id: en:lesson-01:session-30:i15; family: phrase_builder -->\nЦіль: `It is small.`"],["15=context_gap_grammar, 16=listen_build_dictation","15=phrase_builder, 16=listen_build_dictation"]]};
for (const [name,replacements] of Object.entries(edits)) { const file=path.join(root,"sessions/en/l01/s30",name); let text=fs.readFileSync(file,"utf8"); for (const [before,after] of replacements) { if(text.includes(before)) text=text.replace(before,after); else if(!text.includes(after)) throw new Error(`missing:${name}`); } fs.writeFileSync(file,text); }
const ledgerPath=path.join(root,"migration/single-phrase-2026-10-03/preservation-ledger.json"); const ledger=JSON.parse(fs.readFileSync(ledgerPath,"utf8")); const row=ledger.rows.find((x)=>x.courseSessionId===session&&x.oldInteractionId===id); if(!row) throw new Error("missing-ledger"); Object.assign(row,{newTargetSegment:"It is small.",correctText:"It is small."}); ledger.amendments??=[]; ledger.amendments=ledger.amendments.filter((x)=>!(x.courseSessionId===session&&x.oldInteractionId===id)); ledger.amendments.push({courseSessionId:session,oldInteractionId:id,segmentIndex:1,from:"It is ___ .",to:"It is small.",reason:"Full phrase construction separates two adjacent word-choice tasks while preserving the exact small-cafe meaning (2026-10-10)."}); fs.writeFileSync(ledgerPath,`${JSON.stringify(ledger,null,2)}\n`);
