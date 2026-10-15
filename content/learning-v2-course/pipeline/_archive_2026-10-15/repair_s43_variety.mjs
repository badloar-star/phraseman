import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const session="en:lesson-01:session-43";
const atomicPath=path.join(root,"sessions/en/l01/s43/practice.atomic.json");
const atomic=JSON.parse(fs.readFileSync(atomicPath,"utf8"));
const changes={
  i08:{family:"phrase_builder",target:"They are funny.",tokens:["They","are","funny"],distractors:["is"],prompts:{ru:"Соберите фразу — несколько коллег за соседним столом всех рассмешили",uk:"Складіть фразу — кілька колег за сусіднім столом усіх розсмішили"}},
  i11:{family:"listen_build_dictation",target:"She is funny.",tokens:["She","is","funny"],distractors:[],prompts:{ru:"Послушайте и соберите — одна коллега всех рассмешила",uk:"Послухайте і складіть — одна колега всіх розсмішила"}},
  i13:{family:"listen_build_dictation",target:"I am not wrong.",tokens:["I","am","not","wrong"],distractors:[],prompts:{ru:"Послушайте и соберите — приятель ошибочно говорит, что вы неправы",uk:"Послухайте і складіть — приятель помилково каже, що ви неправі"}}
};
for(const locale of ["ru","uk"]){
  const interactions=atomic.interactionsByLocale[locale];
  for(const [shortId,change] of Object.entries(changes)){
    const id=`${session}:${shortId}`;
    const index=interactions.findIndex(item=>item.interactionId===id);
    const prompt=change.prompts[locale];
    const isDictation=change.family==="listen_build_dictation";
    interactions[index]={interactionId:id,ordinal:interactions[index].ordinal,purpose:interactions[index].purpose,family:change.family,inputMode:"ordered_tokens",prompt,responseOptions:[],mediaIds:[],audioTargetIds:isDictation?[`${id}:audio`]:[],accessibilityLabel:prompt,modePayload:isDictation
      ?{family:change.family,referenceAudio:{audioTargetId:`${id}:audio`,transcript:change.target},slowReferenceAudio:null,hiddenTargetPhrase:change.target,orderedTokens:change.tokens,authoredDistractorTokens:change.distractors,slotFeedback:[]}
      :{family:change.family,targetPhrase:change.target,orderedTokens:change.tokens,authoredDistractorTokens:change.distractors,slotFeedback:[]},scriptedAlternate:null};
  }
}
atomic.answers=atomic.answers.map(item=>{
  const shortId=item.interactionId.split(":").at(-1);
  return changes[shortId]?{interactionId:item.interactionId,correctText:changes[shortId].target,correctResponseId:null}:item;
});
fs.writeFileSync(atomicPath,JSON.stringify(atomic,null,2)+"\n");

const replacements={
  "final.ru.md":[
    ["**8 · Вставьте слово — про несколько человек за соседним столом**\n<!-- interaction_id: en:lesson-01:session-43:i08; family: context_gap_grammar -->\nЦель: `They ___ funny.`\nВарианты: `are` · `is` · `am`","**8 · Соберите фразу — несколько коллег за соседним столом всех рассмешили**\n<!-- interaction_id: en:lesson-01:session-43:i08; family: phrase_builder -->\nЦель: `They are funny.`"],
    ["**11 · Вставьте слово — про одну коллегу, которая всех насмешила**\n<!-- interaction_id: en:lesson-01:session-43:i11; family: context_gap_grammar -->\nЦель: `She ___ funny.`\nВарианты: `is` · `are` · `am`","**11 · Послушайте и соберите — одна коллега всех рассмешила**\n<!-- interaction_id: en:lesson-01:session-43:i11; family: listen_build_dictation -->\nЦель: `She is funny.`"],
    ["**13 · Соберите фразу — приятель говорит, что вы ошиблись. Возразите: «я не ошибся»**\n<!-- interaction_id: en:lesson-01:session-43:i13; family: phrase_builder -->\nЦель: `I am not wrong.`","**13 · Послушайте и соберите — приятель ошибочно говорит, что вы неправы**\n<!-- interaction_id: en:lesson-01:session-43:i13; family: listen_build_dictation -->\nЦель: `I am not wrong.`"]
  ],
  "final.uk.md":[
    ["**8 · Вставте слово — про кількох людей за сусіднім столом**\n<!-- interaction_id: en:lesson-01:session-43:i08; family: context_gap_grammar -->\nЦіль: `They ___ funny.`\nВаріанти: `are` · `is` · `am`","**8 · Складіть фразу — кілька колег за сусіднім столом усіх розсмішили**\n<!-- interaction_id: en:lesson-01:session-43:i08; family: phrase_builder -->\nЦіль: `They are funny.`"],
    ["**11 · Вставте слово — про одну колегу, яка всіх насмішила**\n<!-- interaction_id: en:lesson-01:session-43:i11; family: context_gap_grammar -->\nЦіль: `She ___ funny.`\nВаріанти: `is` · `are` · `am`","**11 · Послухайте і складіть — одна колега всіх розсмішила**\n<!-- interaction_id: en:lesson-01:session-43:i11; family: listen_build_dictation -->\nЦіль: `She is funny.`"],
    ["**13 · Складіть фразу — приятель каже, що ви помилилися. Заперечте: «я не помилився»**\n<!-- interaction_id: en:lesson-01:session-43:i13; family: phrase_builder -->\nЦіль: `I am not wrong.`","**13 · Послухайте і складіть — приятель помилково каже, що ви неправі**\n<!-- interaction_id: en:lesson-01:session-43:i13; family: listen_build_dictation -->\nЦіль: `I am not wrong.`"]
  ]
};
for(const [file,pairs] of Object.entries(replacements)){
  const filePath=path.join(root,"sessions/en/l01/s43",file); let text=fs.readFileSync(filePath,"utf8");
  for(const [before,after] of pairs){if(text.includes(before))text=text.replace(before,after);else if(!text.includes(after))throw new Error(`Expected source absent in ${file}`);}
  text=text.replace(/(^|,\s*)8=context_gap_grammar(?=,|$)/m,"$1"+"8=phrase_builder").replace(/(^|,\s*)11=context_gap_grammar(?=,|$)/m,"$1"+"11=listen_build_dictation").replace(/(^|,\s*)13=phrase_builder(?=,|$)/m,"$1"+"13=listen_build_dictation");
  fs.writeFileSync(filePath,text);
}
const ledgerPath=path.join(root,"migration/single-phrase-2026-10-03/preservation-ledger.json"); const ledger=JSON.parse(fs.readFileSync(ledgerPath,"utf8"));
for(const [shortId,change] of Object.entries(changes)){
  const id=`${session}:${shortId}`; const row=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===id&&item.segmentIndex===1); if(!row)throw new Error(`Missing preservation row ${id}`);
  Object.assign(row,{newTargetSegment:change.target,correctText:change.target,audioTranscript:change.family==="listen_build_dictation"?change.target:null});
}
ledger.amendments??=[]; ledger.amendments=ledger.amendments.filter(item=>!(item.courseSessionId===session&&([`${session}:i08`,`${session}:i11`].includes(item.oldInteractionId))&&item.segmentIndex===1));
ledger.amendments.push({courseSessionId:session,oldInteractionId:`${session}:i08`,segmentIndex:1,from:"They ___ funny.",to:"They are funny.",reason:"Replaced a repeated word-choice step with full-phrase construction in the same multi-person scene (2026-10-10)."});
ledger.amendments.push({courseSessionId:session,oldInteractionId:`${session}:i11`,segmentIndex:1,from:"She ___ funny.",to:"She is funny.",reason:"Replaced a repeated word-choice step with listening-and-building the full sentence in the same colleague scene (2026-10-10)."});
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+"\n");
