(() => {
 'use strict';
 const root=document.documentElement;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const small=matchMedia('(max-width: 700px)');
 const allowed=()=>!reduce.matches&&!root.classList.contains('no-motion');
 // Text enters in measured groups; forms remain immediately operable.
 const selector='main h1,main h2,main h3,main p,main .button,main .editorial-links a,main .guide-card,main .product-stage,main .app-overview,main .gift-preview,main .test-panel,main .support-card';
 const pieces=[...document.querySelectorAll(selector)].filter(el=>{
  if(el.closest('.article-body,.faq-list,.gift-certificate,.guide-image'))return false;
  const group=el.closest('.test-panel,.support-card,.guide-card');
  return !group||group===el;
 });
 let revealObserver;
 if('IntersectionObserver' in window){
  revealObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}}},{threshold:.06,rootMargin:'0px 0px -24px 0px'});
  for(const el of pieces){el.classList.add('fade-piece');if(el.matches('p'))el.style.setProperty('--fade-delay','100ms');else if(el.matches('.button'))el.style.setProperty('--fade-delay','180ms');revealObserver.observe(el);}
  if(allowed())root.classList.add('cinema-motion');
 }
 const layers=[...document.querySelectorAll('[data-depth]')];
 const active=new Set();
 let frame=0;
 const targets=new Map();
 function paint(){
  frame=0;root.classList.toggle('past-hero',window.scrollY>70);
  if(!allowed()||document.hidden)return;
  let settling=false;
  for(const el of active){
   const host=el.closest('.depth-scene,.product-stage')||el.parentElement;
   const rect=host.getBoundingClientRect();
   const speed=Number(el.dataset.depth)||.1;
   const desired=(innerHeight/2-rect.top-rect.height/2)*speed*(small.matches ? .45 : 1);
   const target=Math.max(-105,Math.min(105,desired));
   const current=targets.get(el)||0;const next=current+(target-current)*.16;
   targets.set(el,next);el.style.transform=`translate3d(0,${next.toFixed(2)}px,0)`;
   if(Math.abs(next-target)>.12)settling=true;
  }
  if(settling)frame=requestAnimationFrame(paint);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
 if('IntersectionObserver' in window){
  const depthObserver=new IntersectionObserver(entries=>{for(const entry of entries){const el=entry.target;el.classList.toggle('depth-active',entry.isIntersecting&&allowed());if(entry.isIntersecting)active.add(el);else active.delete(el);}schedule();},{rootMargin:'100px'});
  layers.forEach(el=>depthObserver.observe(el));
 }
 function motionChanged(){const enabled=allowed();root.classList.toggle('cinema-motion',enabled);if(!enabled){if(frame)cancelAnimationFrame(frame);frame=0;pieces.forEach(el=>el.classList.add('is-visible'));layers.forEach(el=>{el.style.transform='';el.classList.remove('depth-active');});targets.clear();}else{active.forEach(el=>el.classList.add('depth-active'));schedule();}}
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('preview-motion-change',motionChanged);
 reduce.addEventListener('change',motionChanged);
 small.addEventListener('change',schedule);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else schedule();});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;});
 window.addEventListener('pageshow',schedule);
 schedule();
})();
