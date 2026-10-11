import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const session="en:lesson-01:session-44";
const atomicPath=path.join(root,"sessions/en/l01/s44/practice.atomic.json");
const atomic=JSON.parse(fs.readFileSync(atomicPath,"utf8"));
for(const locale of ["ru","uk"]){
  const interactions=atomic.interactionsByLocale[locale];
  const firstId=`${session}:i16:s01`, secondId=`${session}:i16:s02`;
  const iFirst=interactions.findIndex(item=>item.interactionId===firstId);
  const iSecond=interactions.findIndex(item=>item.interactionId===secondId);
  const promptFirst=locale==="ru"?"Вставьте значок — друг спрашивает, холодное ли пиво":"Вставте значок — друг питає, чи холодне пиво";
  interactions[iFirst]={interactionId:firstId,ordinal:interactions[iFirst].ordinal,purpose:"independent_check",family:"context_gap_grammar",inputMode:"single_choice",prompt:promptFirst,responseOptions:["'s","is","are"].map((text,index)=>({responseId:`${firstId}:r${index+1}`,text})),mediaIds:[],audioTargetIds:[],accessibilityLabel:promptFirst,modePayload:{family:"context_gap_grammar",localizedScene:{ru:"Вставьте значок — друг спрашивает, холодное ли пиво",uk:"Вставте значок — друг питає, чи холодне пиво"},gappedTargetPhrase:"It___ cold.",gapOptions:["'s","is","are"].map((text,index)=>({responseId:`${firstId}:r${index+1}`,text})),testedDimension:promptFirst,choiceFeedback:[{responseId:`${firstId}:r2`,correct:false,testedDimension:promptFirst,feedbackByLocale:{ru:"`is` — полная форма; здесь нужно собрать краткую форму `it's`.",uk:"`is` — повна форма; тут треба зібрати коротку форму `it's`."}},{responseId:`${firstId}:r3`,correct:false,testedDimension:promptFirst,feedbackByLocale:{ru:"`are` употребляется с `you`, `we`, `they`, а с `it` — `is` или `'s`.",uk:"`are` вживається з `you`, `we`, `they`, а з `it` — `is` або `'s`."}}]},scriptedAlternate:null};
  const promptSecond=locale==="ru"?"Соберите фразу — Мира спрашивает, почему вы зеваете":"Складіть фразу — Міра питає, чому ви позіхаєте";
  interactions[iSecond]={interactionId:secondId,ordinal:interactions[iSecond].ordinal,purpose:"independent_check",family:"phrase_builder",inputMode:"ordered_tokens",prompt:promptSecond,responseOptions:[],mediaIds:[],audioTargetIds:[],accessibilityLabel:promptSecond,modePayload:{family:"phrase_builder",targetPhrase:"I'm tired.",orderedTokens:["I'm","tired"],authoredDistractorTokens:["are"],slotFeedback:[]},scriptedAlternate:null};
}
atomic.answers=atomic.answers.map(item=>item.interactionId===`${session}:i16:s01`?{interactionId:item.interactionId,correctText:"'s",correctResponseId:`${session}:i16:s01:r1`}:item);
fs.writeFileSync(atomicPath,JSON.stringify(atomic,null,2)+"\n");
const replacements={
  "final.ru.md":[
    ["**17 · Произнесите фразу — друг спрашивает, холодное ли пиво**\n<!-- interaction_id: en:lesson-01:session-44:i16:s01; family: scripted_repeat_compare -->\nЦель: `It's cold.`","**17 · Послушайте и выберите — друг спрашивает, холодное ли пиво**\n<!-- interaction_id: en:lesson-01:session-44:i16:s01; family: listen_choose -->\nЦель: `It's cold.`\nВарианты: `It's cold.` · `He's cold.` · `It's old.`"],
    ["**18 · Произнесите фразу — Мира спрашивает, почему вы зеваете**\n<!-- interaction_id: en:lesson-01:session-44:i16:s02; family: scripted_repeat_compare -->\nЦель: `I'm tired.`","**18 · Соберите фразу — Мира спрашивает, почему вы зеваете**\n<!-- interaction_id: en:lesson-01:session-44:i16:s02; family: phrase_builder -->\nЦель: `I'm tired.`"]
  ],
  "final.uk.md":[
    ["**17 · Промовте фразу — друг питає, чи холодне пиво**\n<!-- interaction_id: en:lesson-01:session-44:i16:s01; family: scripted_repeat_compare -->\nЦіль: `It's cold.`","**17 · Послухайте і виберіть — друг питає, чи холодне пиво**\n<!-- interaction_id: en:lesson-01:session-44:i16:s01; family: listen_choose -->\nЦіль: `It's cold.`\nВаріанти: `It's cold.` · `He's cold.` · `It's old.`"],
    ["**18 · Промовте фразу — Міра питає, чому ви позіхаєте**\n<!-- interaction_id: en:lesson-01:session-44:i16:s02; family: scripted_repeat_compare -->\nЦіль: `I'm tired.`","**18 · Складіть фразу — Міра питає, чому ви позіхаєте**\n<!-- interaction_id: en:lesson-01:session-44:i16:s02; family: phrase_builder -->\nЦіль: `I'm tired.`"]
  ]
};
for(const [file,pairs] of Object.entries(replacements)){const filePath=path.join(root,"sessions/en/l01/s44",file);let text=fs.readFileSync(filePath,"utf8");for(const [before,after] of pairs){if(text.includes(before))text=text.replace(before,after);else if(!text.includes(after))throw new Error(`Expected source absent in ${file}`);}text=text.replace(/(^|,\s*)17=scripted_repeat_compare(?=,|$)/m,"$1"+"17=listen_choose").replace(/(^|,\s*)18=scripted_repeat_compare(?=,|$)/m,"$1"+"18=phrase_builder");fs.writeFileSync(filePath,text);}
for(const [file, before, after] of [
  ["final.ru.md","**17 · Послушайте и выберите — друг спрашивает, холодное ли пиво**\n<!-- interaction_id: en:lesson-01:session-44:i16:s01; family: listen_choose -->\nЦель: `It's cold.`\nВарианты: `It's cold.` · `He's cold.` · `It's old.`","**17 · Вставьте значок — друг спрашивает, холодное ли пиво**\n<!-- interaction_id: en:lesson-01:session-44:i16:s01; family: context_gap_grammar -->\nЦель: `It___ cold.`\nВарианты: `'s` · `is` · `are`"],
  ["final.uk.md","**17 · Послухайте і виберіть — друг питає, чи холодне пиво**\n<!-- interaction_id: en:lesson-01:session-44:i16:s01; family: listen_choose -->\nЦіль: `It's cold.`\nВаріанти: `It's cold.` · `He's cold.` · `It's old.`","**17 · Вставте значок — друг питає, чи холодне пиво**\n<!-- interaction_id: en:lesson-01:session-44:i16:s01; family: context_gap_grammar -->\nЦіль: `It___ cold.`\nВаріанти: `'s` · `is` · `are`"]
]){const filePath=path.join(root,"sessions/en/l01/s44",file);let text=fs.readFileSync(filePath,"utf8");if(text.includes(before))text=text.replace(before,after);else if(!text.includes(after))throw new Error(`Expected second source absent in ${file}`);text=text.replace(/(^|,\s*)17=listen_choose(?=,|$)/m,"$1"+"17=context_gap_grammar");fs.writeFileSync(filePath,text);}
const ledgerPath=path.join(root,"migration/single-phrase-2026-10-03/preservation-ledger.json");const ledger=JSON.parse(fs.readFileSync(ledgerPath,"utf8"));
const firstRow=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===`${session}:i16`&&item.segmentIndex===1);const secondRow=ledger.rows.find(item=>item.courseSessionId===session&&item.oldInteractionId===`${session}:i16`&&item.segmentIndex===2);if(!firstRow||!secondRow)throw new Error("Missing preservation rows");Object.assign(firstRow,{newTargetSegment:"It___ cold.",correctText:"'s",audioTranscript:null});Object.assign(secondRow,{newTargetSegment:"I'm tired.",correctText:"I'm tired.",audioTranscript:null});
ledger.amendments??=[];ledger.amendments=ledger.amendments.filter(item=>!(item.courseSessionId===session&&item.oldInteractionId===`${session}:i16`&&item.segmentIndex===1));ledger.amendments.push({courseSessionId:session,oldInteractionId:`${session}:i16`,segmentIndex:1,from:"It's cold.",to:"It___ cold.",reason:"Replaced repeated listening choice with contraction assembly; the same beer question still tests the contraction (2026-10-10)."});
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+"\n");
