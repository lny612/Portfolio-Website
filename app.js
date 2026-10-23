document.querySelector('#year').textContent=new Date().getFullYear();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if('IntersectionObserver' in window){document.documentElement.classList.add('motion');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
let scheduled=false;function update(){const range=document.documentElement.scrollHeight-innerHeight;document.querySelector('.progress').style.width=`${range>0?scrollY/range*100:0}%`;if(!reduced.matches)document.documentElement.style.setProperty('--rotation',`${scrollY*.055}deg`);scheduled=false;}addEventListener('scroll',()=>{if(!scheduled){requestAnimationFrame(update);scheduled=true;}},{passive:true});addEventListener('resize',update);update();

const timeline=document.querySelector(".timeline");
if(timeline){const updateTimeline=()=>{const box=timeline.getBoundingClientRect();timeline.style.setProperty("--timeline-progress",`${Math.max(0,Math.min(1,(innerHeight*.65-box.top)/box.height))*100}%`);};addEventListener("scroll",updateTimeline,{passive:true});addEventListener("resize",updateTimeline);timeline.addEventListener("toggle",()=>{updateTimeline();update();},true);updateTimeline();}
