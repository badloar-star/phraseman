const fs=require("fs");const n=process.argv[2];
const known=new Set(fs.readFileSync("review/en_known_before_"+n+".md","utf8").split("\n").slice(2).join(" ").toLowerCase().split(/[^a-z'’]+/).filter(Boolean));
const j=require("./input/en_lesson_"+n+".json");
for(const p of j.phrases){const u=p.target.toLowerCase().split(/[^a-z'’]+/).filter(w=>w&&!known.has(w));console.log(p.id.split(":")[1],p.target,"  ->",u.join(","));}
