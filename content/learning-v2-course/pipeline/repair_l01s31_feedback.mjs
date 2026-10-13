import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const session="en:lesson-01:session-31";
const file=path.join(root,"sessions/en/l01/s31/practice.atomic.json");
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const choices={
  i02:["`wet` — «мокро». В слове короткий звук «э» и конечное `t`; это не `went` и не `what`.","`wet` — «мокро». У слові короткий звук «е» й кінцеве `t`; це не `went` і не `what`."],
  i04:["`dry` — «сухо». После `d` слышно «рай», поэтому это не `try` и не `draw`.","`dry` — «сухо». Після `d` чути «рай», тому це не `try` і не `draw`."],
  i06:["Третий час идёт дождь, поэтому `wet` — «мокро». Полная фраза: `It is wet.`","Третю годину йде дощ, тому `wet` — «мокро». Повна фраза: `It is wet`."],
  i10:["`warm` — «тепло». Это не `worm` («червяк») и не короткое `war`.","`warm` — «тепло». Це не `worm` («черв'як») і не коротке `war`."],
  i11:["Солнце печёт и нужна тень: `hot` — «жарко». Полная фраза: `It is hot.`","Сонце пече й потрібна тінь: `hot` — «спекотно». Повна фраза: `It is hot`."],
  i13:["Шарф и вторая кофта означают `cold` — «холодно». Полная фраза: `It is cold.`","Шарф і друга кофта означають `cold` — «холодно». Повна фраза: `It is cold`."],
  i15:["Льёт с утра: `rainy` — «дождливо». Полная фраза: `It is rainy.`","Ллє зранку: `rainy` — «дощово». Повна фраза: `It is rainy`."],
  i17:["Шапку сдувает: `windy` — «ветрено». Полная фраза: `It is windy.`","Шапку здуває: `windy` — «вітряно». Повна фраза: `It is windy`."],
};
const tiles={
  i07:["`are` лишнее: после `It` ставят `is` — `It is dry.`","`are` зайве: після `It` ставлять `is` — `It is dry`."],
  i18:["`open` лишнее: в записи сказано `It is rainy.` — «дождливо».","`open` зайве: у записі сказано `It is rainy` — «дощово»."],
  i19:["`are` лишнее: про улицу говорят `It is windy.`","`are` зайве: про вулицю кажуть `It is windy`."],
};
function upsert(rows,item){const index=rows.findIndex(x=>x.responseId===item.responseId);return(index<0?[...rows,item]:rows.map((x,n)=>n===index?item:x)).filter((x,n,a)=>x.responseId!==item.responseId||n===a.findIndex(y=>y.responseId===x.responseId));}
for(const locale of ["ru","uk"]){
  const rows=new Map(data.interactionsByLocale[locale].map(x=>[x.interactionId.slice(session.length+1),x]));
  for(const [id,[ru,uk]] of Object.entries(choices)){
    const row=rows.get(id);
    row.modePayload.choiceFeedback=upsert(row.modePayload.choiceFeedback??[],{responseId:`${session}:${id}:r1`,correct:true,testedDimension:row.prompt,feedbackByLocale:{ru,uk}});
  }
  for(const [id,[ru,uk]] of Object.entries(tiles)){
    const row=rows.get(id);
    row.responseOptions=[];
    row.modePayload.slotFeedback=upsert((row.modePayload.slotFeedback??[]).filter(x=>x.responseId===`${session}:${id}:tile:d1`),{responseId:`${session}:${id}:tile:d1`,correct:false,testedDimension:row.prompt,feedbackByLocale:{ru,uk}});
  }
}
fs.writeFileSync(file,`${JSON.stringify(data,null,2)}\n`);
