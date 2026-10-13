import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const session="en:lesson-01:session-32";
const file=path.join(root,"sessions/en/l01/s32/practice.atomic.json");
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const choices={
i01:["`small` — «маленький». Слышно `small`, не `smell` и не `mall`.","`small` — «маленький». Чути `small`, не `smell` і не `mall`."],
i02:["Комната мала, поэтому `small` — «маленькая». `It is small.`","Кімната мала, тому `small` — «маленька». `It is small`."],
i03:["`dark` — «темно». Это не `park` и не `duck`.","`dark` — «темно». Це не `park` і не `duck`."],
i05:["Света полно, значит подходит `dark`: с `not` получается `It is not dark.` — «здесь не темно».","Світла повно, тому підходить `dark`: з `not` виходить `It is not dark` — «тут не темно»."],
i06:["`expensive` — «дорого». Это не `expense` и не `offensive`.","`expensive` — «дорого». Це не `expense` і не `offensive`."],
i10:["`cold` — «холодно». Это не `called` и не `gold`.","`cold` — «холодно». Це не `called` і не `gold`."],
i12:["`rainy` — «дождливо». Это не `rain` и не `train`.","`rainy` — «дощово». Це не `rain` і не `train`."],
i13:["Льёт с утра, поэтому `rainy` — «дождливо». `It is rainy.`","Ллє зранку, тому `rainy` — «дощово». `It is rainy`."],
i14:["`warm` — «тепло». Это не `worm` и не `farm`.","`warm` — «тепло». Це не `worm` і не `farm`."],
i15:["Горячие батареи означают `warm` — «тепло». `It is warm.`","Гарячі батареї означають `warm` — «тепло». `It is warm`."],
i17:["`clean` — «чисто». Это не `clan` и не `green`.","`clean` — «чисто». Це не `clan` і не `green`."],};
const tile=["`are` лишнее: после `It` ставят `is` — `It is dark.`","`are` зайве: після `It` ставлять `is` — `It is dark`."];
function upsert(rows,item){const i=rows.findIndex(x=>x.responseId===item.responseId);return(i<0?[...rows,item]:rows.map((x,n)=>n===i?item:x)).filter((x,n,a)=>x.responseId!==item.responseId||n===a.findIndex(y=>y.responseId===x.responseId));}
for(const locale of ["ru","uk"]){const rows=new Map(data.interactionsByLocale[locale].map(x=>[x.interactionId.slice(session.length+1),x]));const room=rows.get("i05");room.prompt=locale==="ru"?"Вставьте слово — окна на солнечную сторону, света полно":"Вставте слово — вікна на сонячний бік, світла повно";room.modePayload.localizedScene={...(room.modePayload.localizedScene??{}),[locale]:room.prompt};for(const [id,[ru,uk]] of Object.entries(choices)){const row=rows.get(id);row.modePayload.choiceFeedback=upsert(row.modePayload.choiceFeedback??[],{responseId:`${session}:${id}:r1`,correct:true,testedDimension:row.prompt,feedbackByLocale:{ru,uk}})}const row=rows.get("i04");row.responseOptions=[];row.modePayload.slotFeedback=upsert((row.modePayload.slotFeedback??[]).filter(x=>x.responseId===`${session}:i04:tile:d1`),{responseId:`${session}:i04:tile:d1`,correct:false,testedDimension:row.prompt,feedbackByLocale:{ru:tile[0],uk:tile[1]}})}
fs.writeFileSync(file,`${JSON.stringify(data,null,2)}\n`);
