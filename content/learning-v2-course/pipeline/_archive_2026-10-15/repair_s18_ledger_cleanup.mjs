import fs from "node:fs";
const file="migration/single-phrase-2026-10-03/preservation-ledger.json";
const d=JSON.parse(fs.readFileSync(file,"utf8"));
const s="en:lesson-01:session-18",i18=`${s}:i18`,i22=`${s}:i22`;
d.amendments=(d.amendments??[]).filter(x=>!(x.courseSessionId===s&&((!x.action&&x.oldInteractionId===i18)||(x.action==='retire'&&String(x.oldInteractionId??"").startsWith(i22))||(x.action==='replacement'&&x.newInteractionId===i22))));
const old=["She is loud.","He is quiet.","She is kind."];
for(const [index,from] of old.entries())d.amendments.push({action:"retire",courseSessionId:s,oldInteractionId:i22,segmentIndex:index+1,from,replacementInteractionId:i22,to:"She is loud.",reason:"Three answer-revealing voice steps replaced with one independent response (2026-10-10)."});
d.amendments.push({action:"replacement",courseSessionId:s,newInteractionId:i22,retires:old.map((_,index)=>({oldInteractionId:i22,segmentIndex:index+1})),reason:"One independent response replaces the answer-revealing voice chain (2026-10-10)."});
fs.writeFileSync(file,JSON.stringify(d,null,2)+"\n");
