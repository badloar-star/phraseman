import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const session="en:lesson-01:session-41";
const atomicPath=path.join(root,"sessions/en/l01/s41/practice.atomic.json");
const atomic=JSON.parse(fs.readFileSync(atomicPath,"utf8"));

for(const locale of ["ru","uk"]){
  const interactions=atomic.interactionsByLocale[locale];
  const i10=interactions.findIndex(item=>item.interactionId===`${session}:i10`);
  const prompt10=locale==="ru"
    ?"Соберите фразу — вы отвечаете человеку, который зря извинился"
    :"Складіть фразу — ви відповідаєте людині, яка дарма вибачилася";
  interactions[i10]={
    interactionId:`${session}:i10`, ordinal:interactions[i10].ordinal,
    purpose:"guided_practice", family:"phrase_builder", inputMode:"ordered_tokens",
    prompt:prompt10, responseOptions:[], mediaIds:[], audioTargetIds:[], accessibilityLabel:prompt10,
    modePayload:{family:"phrase_builder",targetPhrase:"You're fine.",orderedTokens:["You're","fine"],authoredDistractorTokens:["sorry"],slotFeedback:[]},
    scriptedAlternate:null
  };
  const i15=interactions.findIndex(item=>item.interactionId===`${session}:i15`);
  const prompt15=locale==="ru"
    ?"Послушайте и соберите — у стойки спросили, кто опоздал"
    :"Послухайте і складіть — біля стійки спитали, хто спізнився";
  interactions[i15]={
    interactionId:`${session}:i15`, ordinal:interactions[i15].ordinal,
    purpose:"independent_check", family:"listen_build_dictation", inputMode:"ordered_tokens",
    prompt:prompt15, responseOptions:[], mediaIds:[], audioTargetIds:[`${session}:i15:audio`], accessibilityLabel:prompt15,
    modePayload:{family:"listen_build_dictation",referenceAudio:{audioTargetId:`${session}:i15:audio`,transcript:"I am."},slowReferenceAudio:null,hiddenTargetPhrase:"I am.",orderedTokens:["I","am"],authoredDistractorTokens:[],slotFeedback:[]},
    scriptedAlternate:null
  };
  const i14=interactions.findIndex(item=>item.interactionId===`${session}:i14`);
  const prompt14=locale==="ru"
    ?"Послушайте и выберите — вы успокаиваете человека после извинения"
    :"Послухайте і виберіть — ви заспокоюєте людину після вибачення";
  const options=["You're fine.","I'm fine.","You're late."];
  interactions[i14]={
    interactionId:`${session}:i14`, ordinal:interactions[i14].ordinal,
    purpose:"independent_check", family:"listen_choose", inputMode:"single_choice",
    prompt:prompt14, responseOptions:options.map((text,index)=>({responseId:`${session}:i14:r${index+1}`,text})), mediaIds:[], audioTargetIds:[`${session}:i14:audio`], accessibilityLabel:prompt14,
    modePayload:{family:"listen_choose",referenceAudio:{audioTargetId:`${session}:i14:audio`,transcript:"You're fine."},slowReferenceAudio:null,localizedMeaningChoices:options.map((targetText,index)=>({responseId:`${session}:i14:r${index+1}`,targetText,meaningByLocale:null})),transcriptRevealPolicy:"after_first_attempt",choiceFeedback:[{responseId:`${session}:i14:r2`,correct:false,testedDimension:prompt14,feedbackByLocale:{ru:"«I'm fine» — это ответ о себе; здесь вы успокаиваете другого человека.",uk:"«I'm fine» — це відповідь про себе; тут ви заспокоюєте іншу людину."}},{responseId:`${session}:i14:r3`,correct:false,testedDimension:prompt14,feedbackByLocale:{ru:"«You're late» — это про опоздание. После извинения вы говорите, что всё в порядке.",uk:"«You're late» — це про запізнення. Після вибачення ви кажете, що все гаразд."}}],isWordCard:false,wordCard:null},
    scriptedAlternate:null
  };
}
atomic.answers=atomic.answers.map(item=>item.interactionId===`${session}:i10`
  ?{interactionId:item.interactionId,correctText:"You're fine.",correctResponseId:null}
  :item.interactionId===`${session}:i14`
    ?{interactionId:item.interactionId,correctText:"You're fine.",correctResponseId:`${session}:i14:r1`}:item);
fs.writeFileSync(atomicPath,JSON.stringify(atomic,null,2)+"\n");

const replacements={
  "final.ru.md":[
    ["**10 · Вставьте слово — собеседник извинился, хотя не за что**\n<!-- interaction_id: en:lesson-01:session-41:i10; family: context_gap_grammar -->\nЦель: `You're ___ .`\nВарианты: `fine` · `sorry` · `late`","**10 · Соберите фразу — вы отвечаете человеку, который зря извинился**\n<!-- interaction_id: en:lesson-01:session-41:i10; family: phrase_builder -->\nЦель: `You're fine.`"],
    ["**14 · Соберите фразу — «ты в порядке»**\n<!-- interaction_id: en:lesson-01:session-41:i14; family: phrase_builder -->\nЦель: `You're fine.`","**14 · Послушайте и выберите — вы успокаиваете человека после извинения**\n<!-- interaction_id: en:lesson-01:session-41:i14; family: listen_choose -->\nЦель: `You're fine.`\nВарианты: `You're fine.` · `I'm fine.` · `You're late.`"],
    ["**15 · Соберите ответ — у стойки спросили: «Кто опоздал?» Ответьте двумя словами**\n<!-- interaction_id: en:lesson-01:session-41:i15; family: phrase_builder -->\nЦель: `I am.`","**15 · Послушайте и соберите — у стойки спросили, кто опоздал**\n<!-- interaction_id: en:lesson-01:session-41:i15; family: listen_build_dictation -->\nЦель: `I am.`"]
  ],
  "final.uk.md":[
    ["**10 · Вставте слово — співрозмовник вибачився, хоча нема за що**\n<!-- interaction_id: en:lesson-01:session-41:i10; family: context_gap_grammar -->\nЦіль: `You're ___ .`\nВаріанти: `fine` · `sorry` · `late`","**10 · Складіть фразу — ви відповідаєте людині, яка дарма вибачилася**\n<!-- interaction_id: en:lesson-01:session-41:i10; family: phrase_builder -->\nЦіль: `You're fine.`"],
    ["**14 · Складіть фразу — «з тобою все гаразд»**\n<!-- interaction_id: en:lesson-01:session-41:i14; family: phrase_builder -->\nЦіль: `You're fine.`","**14 · Послухайте і виберіть — ви заспокоюєте людину після вибачення**\n<!-- interaction_id: en:lesson-01:session-41:i14; family: listen_choose -->\nЦіль: `You're fine.`\nВаріанти: `You're fine.` · `I'm fine.` · `You're late.`"],
    ["**15 · Складіть відповідь — біля стійки спитали: «Хто спізнився?» Відповідайте двома словами**\n<!-- interaction_id: en:lesson-01:session-41:i15; family: phrase_builder -->\nЦіль: `I am.`","**15 · Послухайте і складіть — біля стійки спитали, хто спізнився**\n<!-- interaction_id: en:lesson-01:session-41:i15; family: listen_build_dictation -->\nЦіль: `I am.`"]
  ]
};
for(const [file,pairs] of Object.entries(replacements)){
  const filePath=path.join(root,"sessions/en/l01/s41",file);
  let text=fs.readFileSync(filePath,"utf8");
  for(const [before,after] of pairs){
    if(text.includes(before)) text=text.replace(before,after);
    else if(!text.includes(after)) throw new Error(`Expected source absent in ${file}`);
  }
  text=text
    .replace(/(^|,\s*)10=context_gap_grammar(?=,|$)/m,"$1"+"10=phrase_builder")
    .replace(/(^|,\s*)15=phrase_builder(?=,|$)/m,"$1"+"15=listen_build_dictation")
    .replace(/(^|,\s*)14=phrase_builder(?=,|$)/m,"$1"+"14=listen_choose");
  fs.writeFileSync(filePath,text);
}

const ledgerPath=path.join(root,"migration/single-phrase-2026-10-03/preservation-ledger.json");
const ledger=JSON.parse(fs.readFileSync(ledgerPath,"utf8"));
const row10=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===`${session}:i10`&&item.segmentIndex===1);
const row15=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===`${session}:i15`&&item.segmentIndex===1);
const row14=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===`${session}:i14`&&item.segmentIndex===1);
if(!row10||!row14||!row15) throw new Error("Missing preservation row");
Object.assign(row10,{newTargetSegment:"You're fine.",correctText:"You're fine.",audioTranscript:null});
Object.assign(row15,{newTargetSegment:"I am.",correctText:"I am.",audioTranscript:"I am."});
Object.assign(row14,{newTargetSegment:"You're fine.",correctText:"You're fine.",audioTranscript:"You're fine."});
ledger.amendments??=[];
ledger.amendments=ledger.amendments.filter(item=>!(item.courseSessionId===session&&item.oldInteractionId===`${session}:i10`&&item.segmentIndex===1));
ledger.amendments.push({courseSessionId:session,oldInteractionId:`${session}:i10`,segmentIndex:1,from:"You're ___ .",to:"You're fine.",reason:"Changed the adjacent word choice into full-phrase construction without changing the apology-response meaning (2026-10-10)."});
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+"\n");
