import fs from "node:fs";import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const session="en:lesson-01:session-40";
const atomicPath=path.join(root,"sessions/en/l01/s40/practice.atomic.json");
const atomic=JSON.parse(fs.readFileSync(atomicPath,"utf8"));

for(const locale of ["ru","uk"]){
  const interactions=atomic.interactionsByLocale[locale];
  const index=interactions.findIndex(item=>item.interactionId===`${session}:i03`);
  const prompt=locale==="ru"
    ?"Соберите фразу — из-за стены весь день гремит смех"
    :"Складіть фразу — з-за стіни весь день гримить сміх";
  interactions[index]={
    interactionId:`${session}:i03`, ordinal:interactions[index].ordinal,
    purpose:"retrieval_practice", family:"phrase_builder", inputMode:"ordered_tokens",
    prompt, responseOptions:[], mediaIds:[], audioTargetIds:[], accessibilityLabel:prompt,
    modePayload:{family:"phrase_builder",targetPhrase:"They are loud.",orderedTokens:["They","are","loud"],authoredDistractorTokens:["is"],slotFeedback:[]},
    scriptedAlternate:null
  };
}
atomic.answers=atomic.answers.map(item=>item.interactionId===`${session}:i03`
  ?{interactionId:item.interactionId,correctText:"They are loud.",correctResponseId:null}:item);
fs.writeFileSync(atomicPath,JSON.stringify(atomic,null,2)+"\n");

const replacements={
  "final.ru.md":[["**3 · Вставьте слово — из-за стены весь день гремит смех**\n<!-- interaction_id: en:lesson-01:session-40:i03; family: context_gap_grammar -->\nЦель: `They are ___ .`\nВарианты: `loud` · `quiet` · `new`","**3 · Соберите фразу — из-за стены весь день гремит смех**\n<!-- interaction_id: en:lesson-01:session-40:i03; family: phrase_builder -->\nЦель: `They are loud.`"]],
  "final.uk.md":[["**3 · Вставте слово — за стіною цілий день лунає сміх**\n<!-- interaction_id: en:lesson-01:session-40:i03; family: context_gap_grammar -->\nЦіль: `They are ___ .`\nВаріанти: `loud` · `quiet` · `new`","**3 · Складіть фразу — з-за стіни весь день гримить сміх**\n<!-- interaction_id: en:lesson-01:session-40:i03; family: phrase_builder -->\nЦіль: `They are loud.`"]]
};
for(const [file, pairs] of Object.entries(replacements)){
  const pathToFile=path.join(root,"sessions/en/l01/s40",file);
  let text=fs.readFileSync(pathToFile,"utf8");
  for(const [before,after] of pairs){
    if(text.includes(before)) text=text.replace(before,after);
    else if(!text.includes(after)) throw new Error(`Expected text absent in ${file}`);
  }
  text=text.replace("3=context_gap_grammar", "3=phrase_builder");
  fs.writeFileSync(pathToFile,text);
}

const ledgerPath=path.join(root,"migration/single-phrase-2026-10-03/preservation-ledger.json");
const ledger=JSON.parse(fs.readFileSync(ledgerPath,"utf8"));
const row=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===`${session}:i03`&&item.segmentIndex===1);
if(!row) throw new Error("Missing preservation row for s40 i03");
Object.assign(row,{newTargetSegment:"They are loud.",correctText:"They are loud.",audioTranscript:null});
ledger.amendments??=[];
ledger.amendments=ledger.amendments.filter(item=>!(item.courseSessionId===session&&item.oldInteractionId===`${session}:i03`&&item.segmentIndex===1));
ledger.amendments.push({courseSessionId:session,oldInteractionId:`${session}:i03`,segmentIndex:1,from:"They are ___ .",to:"They are loud.",reason:"Replaced an adjacent word-choice repetition with full-phrase construction in the same audible-laughter scene (2026-10-10)."});

for(const locale of ["ru","uk"]){
  const interactions=atomic.interactionsByLocale[locale];
  const dictationIndex=interactions.findIndex(item=>item.interactionId===`${session}:i06`);
  const dictationPrompt=locale==="ru"
    ?"Послушайте и соберите — ваша команда только вышла на эту работу"
    :"Послухайте і складіть — ваша команда щойно вийшла на цю роботу";
  interactions[dictationIndex]={
    interactionId:`${session}:i06`, ordinal:interactions[dictationIndex].ordinal,
    purpose:"supported_practice", family:"listen_build_dictation", inputMode:"ordered_tokens",
    prompt:dictationPrompt, responseOptions:[], mediaIds:[], audioTargetIds:[`${session}:i06:audio`], accessibilityLabel:dictationPrompt,
    modePayload:{family:"listen_build_dictation",referenceAudio:{audioTargetId:`${session}:i06:audio`,transcript:"We are new."},slowReferenceAudio:null,hiddenTargetPhrase:"We are new.",orderedTokens:["We","are","new"],authoredDistractorTokens:[],slotFeedback:[]},
    scriptedAlternate:null
  };
  const builderIndex=interactions.findIndex(item=>item.interactionId===`${session}:i13`);
  const builderPrompt=locale==="ru"
    ?"Соберите фразу — вы работаете с этими людьми в одном отделе"
    :"Складіть фразу — ви працюєте з цими людьми в одному відділі";
  interactions[builderIndex]={
    interactionId:`${session}:i13`, ordinal:interactions[builderIndex].ordinal,
    purpose:"retrieval_practice", family:"phrase_builder", inputMode:"ordered_tokens",
    prompt:builderPrompt, responseOptions:[], mediaIds:[], audioTargetIds:[], accessibilityLabel:builderPrompt,
    modePayload:{family:"phrase_builder",targetPhrase:"They are my colleagues.",orderedTokens:["They","are","my","colleagues"],authoredDistractorTokens:["is"],slotFeedback:[]},
    scriptedAlternate:null
  };
}
atomic.answers=atomic.answers.map(item=>item.interactionId===`${session}:i13`
  ?{interactionId:item.interactionId,correctText:"They are my colleagues.",correctResponseId:null}:item);
const contentReplacements={
  "final.ru.md":[
    ["**6 · Соберите фразу — коллега Лина спрашивает, давно ли ваша команда тут работает**\n<!-- interaction_id: en:lesson-01:session-40:i06; family: phrase_builder -->\nЦель: `We are new.`","**6 · Послушайте и соберите — ваша команда только вышла на эту работу**\n<!-- interaction_id: en:lesson-01:session-40:i06; family: listen_build_dictation -->\nЦель: `We are new.`"],
    ["**13 · Вставьте слово — Лина спрашивает, кто эти люди: вы видите их только в офисе**\n<!-- interaction_id: en:lesson-01:session-40:i13; family: context_gap_grammar -->\nЦель: `They are my ___ .`\nВарианты: `colleagues` · `friends` · `guests`","**13 · Соберите фразу — вы работаете с этими людьми в одном отделе**\n<!-- interaction_id: en:lesson-01:session-40:i13; family: phrase_builder -->\nЦель: `They are my colleagues.`"]
  ],
  "final.uk.md":[
    ["**6 · Складіть фразу — колега Ліна питає, чи давно ваша команда тут працює**\n<!-- interaction_id: en:lesson-01:session-40:i06; family: phrase_builder -->\nЦіль: `We are new.`","**6 · Послухайте і складіть — ваша команда щойно вийшла на цю роботу**\n<!-- interaction_id: en:lesson-01:session-40:i06; family: listen_build_dictation -->\nЦіль: `We are new.`"],
    ["**13 · Вставте слово — Ліна питає, хто ці люди: ви бачите їх лише в офісі**\n<!-- interaction_id: en:lesson-01:session-40:i13; family: context_gap_grammar -->\nЦіль: `They are my ___ .`\nВаріанти: `colleagues` · `friends` · `guests`","**13 · Складіть фразу — ви працюєте з цими людьми в одному відділі**\n<!-- interaction_id: en:lesson-01:session-40:i13; family: phrase_builder -->\nЦіль: `They are my colleagues.`"]
  ]
};
for(const [file,pairs] of Object.entries(contentReplacements)){
  const filePath=path.join(root,"sessions/en/l01/s40",file);
  let text=fs.readFileSync(filePath,"utf8");
  for(const [before,after] of pairs){
    if(text.includes(before)) text=text.replace(before,after);
    else if(!text.includes(after)) throw new Error(`Expected content absent in ${file}`);
  }
  text=text
    .replace("16=listen_build_dictation", "16=phrase_builder")
    .replace(/(^|,\s*)6=phrase_builder(?=,|$)/m, "$1"+"6=listen_build_dictation")
    .replace(/(^|,\s*)13=context_gap_grammar(?=,|$)/m, "$1"+"13=phrase_builder");
  fs.writeFileSync(filePath,text);
}
for(const [interactionId,changes] of Object.entries({
  [`${session}:i06`]:{newTargetSegment:"We are new.",correctText:"We are new.",audioTranscript:"We are new."},
  [`${session}:i13`]:{newTargetSegment:"They are my colleagues.",correctText:"They are my colleagues.",audioTranscript:null}
})){
  const preservationRow=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===interactionId&&item.segmentIndex===1);
  if(!preservationRow) throw new Error(`Missing preservation row for ${interactionId}`);
  Object.assign(preservationRow,changes);
}
ledger.amendments=ledger.amendments.filter(item=>!(item.courseSessionId===session&&([`${session}:i06`,`${session}:i13`].includes(item.oldInteractionId))&&item.segmentIndex===1));
ledger.amendments.push(
  {courseSessionId:session,oldInteractionId:`${session}:i13`,segmentIndex:1,from:"They are my ___ .",to:"They are my colleagues.",reason:"Changed the adjacent word choice to full-phrase construction and removed the under-specified office-only scene (2026-10-10)."}
);
fs.writeFileSync(atomicPath,JSON.stringify(atomic,null,2)+"\n");
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+"\n");
