(() => {
 'use strict';
 const scenes=document.querySelectorAll('.method-chapter,.energy-story,.download-scene');
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('in-view',entry.isIntersecting);},{threshold:.12});scenes.forEach(scene=>observer.observe(scene));}
 document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('page-inactive',document.hidden));
})();
