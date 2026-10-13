import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const session="en:lesson-01:session-30";
const file=path.join(root,"sessions/en/l01/s30/practice.atomic.json");
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const choices={
  i02:["`busy` — «занято, людно»: слышно два слога, «би-зи». Не `bus` и не `bee`.","`busy` — «зайнято, людно»: чути два склади, «бі-зі». Не `bus` і не `bee`."],
  i04:["`quiet` — «тихо». В слове два слога: «ку-айет»; это не `white` и не `queen`.","`quiet` — «тихо». У слові два склади: «ку-айет»; це не `white` і не `queen`."],
  i05:["Очередь и гул означают `busy` — «людно». Полная фраза: `It is busy.`","Черга й гомін означають `busy` — «людно». Повна фраза: `It is busy`."],
  i08:["`loud` — «громко»: в конце слышно «-ауд». Это не `lot` и не `low`.","`loud` — «гучно»: наприкінці чути «-ауд». Це не `lot` і не `low`."],
  i10:["`free` — «свободно». Начало — звук «ф», поэтому это не `three` и не `tree`.","`free` — «вільно». Початок — звук «ф», тому це не `three` і не `tree`."],
  i12:["Пустой зал и тихая песня означают `quiet` — «тихо». Полная фраза: `It is quiet.`","Порожня зала й тиха пісня означають `quiet` — «тихо». Повна фраза: `It is quiet`."],
  i14:["Кафе работает, дверь открыта: `open` — «открыто». Полная фраза: `It is open.`","Кав'ярня працює, двері відчинені: `open` — «відчинено». Повна фраза: `It is open`."],
};
const tiles={
  i06:["`are` лишнее: после `It` ставят `is` — `It is quiet.`","`are` зайве: після `It` ставлять `is` — `It is quiet`."],
  i13:["`are` лишнее: про один столик говорят `It is free.`","`are` зайве: про один столик кажуть `It is free`."],
  i15:["`are` лишнее: про одно кафе говорят `It is small.`","`are` зайве: про одну кав'ярню кажуть `It is small`."],
  i16:["`open` лишнее: в записи сказано `It is closed.` — «уже закрыто».","`open` зайве: у записі сказано `It is closed` — «уже зачинено»."],
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
