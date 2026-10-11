import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const session="en:lesson-01:session-42";
const atomicPath=path.join(root,"sessions/en/l01/s42/practice.atomic.json");
const atomic=JSON.parse(fs.readFileSync(atomicPath,"utf8"));
for(const locale of ["ru","uk"]){
  const interactions=atomic.interactionsByLocale[locale];
  const index=interactions.findIndex(item=>item.interactionId===`${session}:i09`);
  const prompt=locale==="ru"?"Послушайте и соберите — Лина читает сообщение: «Она тихая»":"Послухайте і складіть — Ліна читає повідомлення: «Вона тиха»";
  interactions[index]={
    interactionId:`${session}:i09`, ordinal:interactions[index].ordinal,
    purpose:"guided_practice", family:"listen_build_dictation", inputMode:"ordered_tokens",
    prompt, responseOptions:[], mediaIds:[], audioTargetIds:[`${session}:i09:audio`], accessibilityLabel:prompt,
    modePayload:{family:"listen_build_dictation",referenceAudio:{audioTargetId:`${session}:i09:audio`,transcript:"She's quiet."},slowReferenceAudio:null,hiddenTargetPhrase:"She's quiet.",orderedTokens:["She's","quiet"],authoredDistractorTokens:["She"],slotFeedback:[]},
    scriptedAlternate:null
  };
}
atomic.answers=atomic.answers.map(item=>item.interactionId===`${session}:i09`?{interactionId:item.interactionId,correctText:"She's quiet.",correctResponseId:null}:item);
fs.writeFileSync(atomicPath,JSON.stringify(atomic,null,2)+"\n");

const replacements={
  "final.ru.md":[["**9 · Вставьте значок — «она тихая»**\n<!-- interaction_id: en:lesson-01:session-42:i09; family: context_gap_grammar -->\nЦель: `She___ quiet.`\nВарианты: `'s` · `s` · `is's`","**9 · Послушайте и соберите — Лина читает сообщение: «Она тихая»**\n<!-- interaction_id: en:lesson-01:session-42:i09; family: listen_build_dictation -->\nЦель: `She's quiet.`"]],
  "final.uk.md":[["**9 · Вставте значок — «вона тиха»**\n<!-- interaction_id: en:lesson-01:session-42:i09; family: context_gap_grammar -->\nЦіль: `She___ quiet.`\nВаріанти: `'s` · `s` · `is's`","**9 · Послухайте і складіть — Ліна читає повідомлення: «Вона тиха»**\n<!-- interaction_id: en:lesson-01:session-42:i09; family: listen_build_dictation -->\nЦіль: `She's quiet.`"]]
};
for(const [file,pairs] of Object.entries(replacements)){
  const filePath=path.join(root,"sessions/en/l01/s42",file);
  let text=fs.readFileSync(filePath,"utf8");
  for(const [before,after] of pairs){
    if(text.includes(before)) text=text.replace(before,after);
    else if(!text.includes(after)) throw new Error(`Expected source absent in ${file}`);
  }
  text=text.replace(/(^|,\s*)9=context_gap_grammar(?=,|$)/m,"$1"+"9=listen_build_dictation");
  fs.writeFileSync(filePath,text);
}
const ledgerPath=path.join(root,"migration/single-phrase-2026-10-03/preservation-ledger.json");
const ledger=JSON.parse(fs.readFileSync(ledgerPath,"utf8"));
const row=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===`${session}:i09`&&item.segmentIndex===1);
if(!row) throw new Error("Missing preservation row");
Object.assign(row,{newTargetSegment:"She's quiet.",correctText:"She's quiet.",audioTranscript:"She's quiet."});
ledger.amendments??=[];
ledger.amendments=ledger.amendments.filter(item=>!(item.courseSessionId===session&&item.oldInteractionId===`${session}:i09`&&item.segmentIndex===1));
ledger.amendments.push({courseSessionId:session,oldInteractionId:`${session}:i09`,segmentIndex:1,from:"She___ quiet.",to:"She's quiet.",reason:"Replaced the repeated contraction blank with listening-and-building the same contracted phrase (2026-10-10)."});
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+"\n");
