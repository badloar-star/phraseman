const fs=require("fs");
const D={}; // word -> {reading:count}
for(let n=1;n<=21;n++){const f=String(n).padStart(2,"0");
 const lj=require("./en/lesson_"+f+".json"); const inp=require("./input/en_lesson_"+f+".json");
 const by=Object.fromEntries(inp.phrases.map(p=>[p.id,p.target]));
 for(const c of lj.chapters)for(const e of c.examples){const t=by[e.phraseId];if(!t)continue;
  const tw=t.toLowerCase().replace(/[.,!?]/g,"").split(/\s+/);const sw=e.say.ru.replace(/[.,!?]/g,"").split(/\s+/);
  if(tw.length!==sw.length)continue;
  tw.forEach((w,i)=>{D[w]=D[w]||{};D[w][sw[i]]=(D[w][sw[i]]||0)+1;});}}
const out={};for(const w in D){out[w]=Object.entries(D[w]).sort((a,b)=>b[1]-a[1])[0][0];}
fs.writeFileSync("/c/Temp/x/dict.json".replace("/c/","C:/"),JSON.stringify(out));
console.log(Object.keys(out).length);
