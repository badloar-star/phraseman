import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const file=path.join(root,"sessions/en/l01/s21/practice.atomic.json"), session="en:lesson-01:session-21", data=JSON.parse(fs.readFileSync(file,"utf8"));
const choices={
i02:["В записи `short`: после `sh` слышно округлённое «о», не как в `shirt` и `sort`.","У записі `short`: після `sh` чути округлене «о», не як у `shirt` і `sort`."],
i04:["В записи `thin`: язык между зубами, это не `tin` и не `then`.","У записі `thin`: язик між зубами, це не `tin` і не `then`."],
i06:["После `She` нужна форма `is`: `She is thin.`","Після `She` потрібна форма `is`: `She is thin`."],
i09:["В записи один слог `young`, не двухсложное `yellow` и не `tongue`.","У записі один склад `young`, не двоскладове `yellow` і не `tongue`."],
i10:["С `I` ставят `am`: `I am young.`","З `I` ставлять `am`: `I am young`."],
i14:["Новенький весь день молчит, поэтому он `quiet`, не `loud` и не `young`.","Новачок увесь день мовчить, тому він `quiet`, а не `loud` чи `young`."],
i17:["К человеку, с которым вы говорите, обращаются `You are new.`","До людини, з якою ви говорите, звертаються `You are new`."],
};
const tiles={i05:["`am` лишнее: с `He` ставят `is` — `He is short.`","`am` зайве: з `He` ставлять `is` — `He is short`."],i15:["`are` лишнее: с `She` ставят `is` — `She is young.`","`are` зайве: з `She` ставлять `is` — `She is young`."],i16:["`is` лишнее: с `I` ставят `am` — `I am tired.`","`is` зайве: з `I` ставлять `am` — `I am tired`."],"i18:s03":["`are` лишнее: с `He` ставят `is` — `He is quiet.`","`are` зайве: з `He` ставлять `is` — `He is quiet`." ]};
function upsert(rows,item){const n=rows.findIndex(x=>x.responseId===item.responseId);return (n<0?[...rows,item]:rows.map((x,i)=>i===n?item:x)).filter((x,i,a)=>x.responseId!==item.responseId||i===a.findIndex(y=>y.responseId===x.responseId));}
for(const locale of ["ru","uk"]){const byId=new Map(data.interactionsByLocale[locale].map(x=>[x.interactionId.slice(session.length+1),x]));for(const [id,[ru,uk]] of Object.entries(choices)){const x=byId.get(id);x.modePayload.choiceFeedback=upsert(x.modePayload.choiceFeedback??[],{responseId:`${session}:${id}:r1`,correct:true,testedDimension:x.prompt,feedbackByLocale:{ru,uk}});}for(const [id,[ru,uk]] of Object.entries(tiles)){const x=byId.get(id);x.modePayload.slotFeedback=upsert(x.modePayload.slotFeedback??[],{responseId:`${session}:${id}:tile:d1`,correct:false,testedDimension:x.prompt,feedbackByLocale:{ru,uk}});}}
fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n");
