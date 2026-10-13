import fs from 'node:fs';
import path from 'node:path';
const out = path.resolve('ART_STYLE_FOR_CODEX/trials/interactive');
const source = fs.readFileSync('docs/design/v2-app/spire.html', 'utf8');
const names = ['Гранит','Базальт','Мрамор','Нефрит','Кварц','Агат','Оникс','Аметист','Опал','Топаз','Обсидиан','Алмаз'];
const designs = ['Цилиндрическая','Стройная','Террасы','Контрфорсы','Монолит'];
const setup = `
const PARAMS=new URLSearchParams(location.search);
const DESIGN=Math.max(0,Math.min(4,Number(PARAMS.get('design'))||0));
const TIER=Math.max(0,Math.min(11,Number(PARAMS.get('tier'))||0));
const COMPARE=PARAMS.get('compare')==='1';
const TIER_NAMES=${JSON.stringify(names)};
const DESIGN_NAMES=${JSON.stringify(designs)};
const MATERIALS=['#77736e','#373b43','#dad8d0','#4c8876','#cad3d7','#a87b68','#353841','#947aaf','#b8d3cc','#c4a35c','#232631','#dce9ec'];
const MATERIAL=MATERIALS[TIER];
`;
let result = source.replace('<meta charset="utf-8">','<meta charset="utf-8"><base href="../../../docs/design/v2-app/">')
  .replace('const { icon, phone, col, block, sheet, energy, coins, coinImg } = K;', setup + '\nconst { icon, phone, col, block, sheet, energy, coins, coinImg } = K;')
  .replace('const FH = (f) => (isGuard(f) ? 60 : 46);','const FH=(f)=>(isGuard(f)?60:46)+(DESIGN===1?5:DESIGN===2&&isGuard(f)?8:0);')
  .replace('const FW = (f) => 196 - (f - 1) * 5;','const FW=(f)=>{const progression=TIER*.8;if(DESIGN===1)return 172+progression-(f-1)*3.8;if(DESIGN===2)return 204+progression-Math.floor((f-1)/5)*26-(f%5===0?-6:0);if(DESIGN===3)return 192+progression-(f-1)*4.5;if(DESIGN===4)return 180+progression-(f-1)*2.7;return 196+progression-(f-1)*5;};')
  .replace('${stones(fl)}','${DESIGN===4?stones(fl).replace(/stroke-width="1.1"/g,\'stroke-width=".5"\'):stones(fl)}${DESIGN===3?`<rect x="${x0+4}" y="${y}" width="7" height="${h}" fill="url(#cylCorn)"/><rect x="${x0+w-11}" y="${y}" width="7" height="${h}" fill="url(#cylCorn)"/>`:""}');
const toolbar = `<div id="tower-tools" style="position:sticky;top:0;z-index:100;background:#18191d;color:#eee;padding:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;font:14px system-ui"><label>Конструкция <select id="tower-design"></select></label><label>Лига <select id="tower-tier"></select></label><label>Этаж <input id="tower-floor" type="range" min="1" max="15" value="4"><output id="floor-value">4</output></label><button id="save-tower" type="button">Выбрать конструкцию</button><span id="tower-selection" aria-live="polite"></span></div>`;
result=result.replace('<body>','<body>'+toolbar);
const enhancement = `
// In the comparison atlas keep the original main screen and its original tower interactions.
if(COMPARE){document.querySelectorAll('.block').forEach(b=>{if(b.id!=='main')b.remove()});document.querySelectorAll('.page-h1,.page-lead,.page-nav,#tower-tools,#main>h2,#main>p').forEach(e=>e.remove());document.querySelectorAll('#main .col').forEach((e,i)=>{if(i)e.remove()});document.querySelectorAll('#main .pgbtn').forEach(e=>e.remove());}
document.querySelectorAll('.ph').forEach(ph=>{const walker=document.createTreeWalker(ph,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(node.nodeValue.includes('Гранит'))node.nodeValue=node.nodeValue.replaceAll('Гранит',TIER_NAMES[TIER]);}});
// Tint actual architectural surfaces only; do not recolor avatars, windows or floor markers.
const rgb=MATERIAL.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16));
document.querySelectorAll('svg[data-tower]').forEach(svg=>{['cyl','cylG','cylCorn','cone'].forEach(id=>svg.querySelectorAll('linearGradient[id="'+id+'"] stop').forEach(stop=>{const original=stop.getAttribute('stop-color');const grey=parseInt(original.slice(1,3),16);const gain=.48+grey/110;stop.setAttribute('stop-color','rgb('+rgb.map(v=>Math.round(Math.max(0,Math.min(255,v*gain)))).join(',')+')');}));});
const designControl=document.getElementById('tower-design'),tierControl=document.getElementById('tower-tier');
if(designControl){designControl.innerHTML=DESIGN_NAMES.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('');designControl.value=String(DESIGN);tierControl.innerHTML=TIER_NAMES.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join('');tierControl.value=String(TIER);const navigate=()=>{const url=new URL(location.href);url.searchParams.set('design',designControl.value);url.searchParams.set('tier',tierControl.value);location.href=url.href};designControl.onchange=navigate;tierControl.onchange=navigate;document.getElementById('save-tower').onclick=()=>{try{localStorage.setItem('phraseman-tower-design',String(DESIGN))}catch{}document.getElementById('tower-selection').textContent='Выбрано: '+DESIGN_NAMES[DESIGN]};document.getElementById('tower-floor').oninput=e=>{const f=Number(e.target.value);document.getElementById('floor-value').value=String(f);document.querySelectorAll('svg[data-tower] .fl[data-floor="'+f+'"]').forEach(fl=>{fl.dispatchEvent(new MouseEvent('click',{bubbles:true}));const view=fl.closest('.tview');if(view)view.scrollTop=Math.max(0,G.floors[f-1].y+G.floors[f-1].h/2-view.clientHeight/2);});};}
`;
result=result.replace('K.init();\n</script>',enhancement+'\nK.init();\n</script>');
result=result.replace('</style>','\n#tower-tools select,#tower-tools button{font:inherit;background:#303239;color:#eee;border:0;border-radius:8px;padding:8px}body:has(#tower-tools:empty) .page{padding:0}\n</style>');
fs.writeFileSync(path.join(out,'tower-variants.html'), result);
const atlas=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Шпиль · 12 лиг × 5 конструкций</title><style>body{margin:0;background:#101114;color:#eee;font:14px system-ui}header{padding:18px 24px;position:sticky;top:0;background:#101114;z-index:2}h1{font-size:20px}section{padding:0 20px 25px}.row{display:grid;grid-template-columns:repeat(5,minmax(235px,1fr));gap:12px;overflow-x:auto}.cell{min-width:235px}.cell iframe{width:100%;height:630px;border:0;background:#101114}.cell button{width:100%;padding:10px;background:#262830;color:#eee;border:0;border-radius:10px;font:inherit}h2{font-size:18px}a{color:#c6d4ff}#selection{margin-left:14px}</style></head><body><header><h1>Шпиль · все 12 лиг и пять конструкций</h1><a href="index.html">Главная и иконки</a><span id="selection" aria-live="polite"></span></header>${names.map((name,tier)=>`<section><h2>${name}</h2><div class="row">${designs.map((design,id)=>`<div class="cell"><button type="button" data-design="${id}">${design}</button><iframe loading="lazy" title="${name} · ${design} · интерактивные этажи" src="tower-variants.html?compare=1&tier=${tier}&design=${id}#main"></iframe></div>`).join('')}</div></section>`).join('')}<script>document.querySelectorAll('[data-design]').forEach(b=>b.onclick=()=>{localStorage.setItem('phraseman-tower-design',b.dataset.design);document.getElementById('selection').textContent='Выбрано: '+b.textContent;document.querySelectorAll('[data-design]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.design===b.dataset.design)))});</script></body></html>`;
fs.writeFileSync(path.join(out,'tower-atlas.html'),atlas);
console.log(JSON.stringify({source:'docs/design/v2-app/spire.html',variants:5,leagues:12,floors:15,comparisonFrames:60,imagesGenerated:0}));
