document.querySelector('#year').textContent=new Date().getFullYear();
let frame=false;
function progress(){const range=document.documentElement.scrollHeight-innerHeight;document.querySelector('.progress').style.width=`${range>0?scrollY/range*100:0}%`;frame=false;}
addEventListener('scroll',()=>{if(!frame){requestAnimationFrame(progress);frame=true;}},{passive:true});
addEventListener('resize',progress);
document.querySelectorAll('details').forEach(el=>el.addEventListener('toggle',progress));
document.querySelectorAll('img').forEach(el=>el.addEventListener('load',progress));
// Anchor navigation can point into nested expandable sections.
function revealAnchor(){if(!location.hash)return;const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(!target)return;let parent=target.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}target.scrollIntoView({block:'start'});}
addEventListener('hashchange',revealAnchor);
revealAnchor();progress();
