(() => {
'use strict';
const reduce=matchMedia('(prefers-reduced-motion:reduce)'),small=matchMedia('(max-width:700px)');
const scenes=[...document.querySelectorAll('.world')].map(el=>({el,host:el.parentElement,layers:[...el.querySelectorAll('[data-world-depth]')],value:0,active:false}));
let frame=0;const allowed=()=>!reduce.matches&&!document.hidden&&!document.documentElement.classList.contains('no-motion');
function draw(){frame=0;if(!allowed())return;let more=false;const writes=[];for(const scene of scenes){if(!scene.active)continue;const r=scene.host.getBoundingClientRect(),p=Math.max(-1,Math.min(1,(innerHeight/2-r.top-r.height/2)/(innerHeight/2+r.height/2)));scene.value+=(p-scene.value)*.085;more ||= Math.abs(p-scene.value)>.0005;for(const layer of scene.layers){const d=Number(layer.dataset.worldDepth),v=scene.value*(small.matches?.55:1);writes.push([layer,`translate3d(${(v*d*-90).toFixed(2)}px,${(v*d*380).toFixed(2)}px,0) scale(${(1.025+v*d).toFixed(4)})`]);}}for(const [el,t] of writes)el.style.transform=t;if(more)frame=requestAnimationFrame(draw);}
function schedule(){if(allowed()&&!frame)frame=requestAnimationFrame(draw);}
function sync(){if(!allowed()){cancelAnimationFrame(frame);frame=0;if(reduce.matches||document.documentElement.classList.contains('no-motion'))scenes.forEach(s=>s.layers.forEach(l=>l.style.transform='none'));}else schedule();}
if('IntersectionObserver'in window){const map=new Map(scenes.map(s=>[s.host,s]));const io=new IntersectionObserver(entries=>{for(const e of entries){const s=map.get(e.target);if(s)s.active=e.isIntersecting;}schedule();},{rootMargin:'140px'});scenes.forEach(s=>io.observe(s.host));}else scenes.forEach(s=>s.active=true);
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});addEventListener('preview-motion-change',sync);reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;});addEventListener('pageshow',sync);sync();
})();
