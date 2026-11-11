const d=require("C:/Temp/x/dict.json");const n=process.argv[2];
const j=require("./input/en_lesson_"+n+".json");const unk=new Set();
for(const p of j.phrases){const out=p.target.toLowerCase().split(/\s+/).map(w=>{const c=w.replace(/[.,!?]/g,"");const p2=/[.,!?]$/.test(w)?w.slice(-1):"";if(d[c]){return d[c]+p2;}unk.add(c);return "?"+c+"?"+p2;});console.log(p.id.split(":")[1],out.join(" "));}
console.log("UNK",[...unk].join(" "));
