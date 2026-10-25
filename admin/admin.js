let catalog,revision,token,baseline=new Map(),pageIndex=0,working=false,pollTimer;
const $=s=>document.querySelector(s),size=15;
const pageName=p=>p==='index.html'?'홈':p==='projects.html'?'프로젝트 갤러리':p.replace('projects/','').replace('.html','');
const changed=e=>e.en!==baseline.get(e.id)?.en||e.ko!==baseline.get(e.id)?.ko;
const edits=()=>catalog.entries.filter(changed).map(({id,en,ko})=>({id,en,ko}));
const status=(text,error=false)=>{$('#status').textContent=text;$('#status').classList.toggle('error',error);};
function refreshCount(){$('#changes').textContent=`저장되지 않은 변경 ${edits().length}개`;}
function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
async function api(route,data){const response=await fetch('/api/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Editor-Token':token},body:JSON.stringify({revision,...data})});const body=await response.json();if(!response.ok)throw Error(body.error||'작업을 완료하지 못했습니다.');return body;}
function lock(value){working=value;for(const id of ['save','preview','deploy','confirm-deploy'])$('#'+id).disabled=value;document.querySelectorAll('textarea').forEach(el=>el.disabled=value||el.dataset.locked==='true');}
function render(){
 const q=$('#search').value.trim().toLowerCase(),page=$('#page').value;
 const entries=catalog.entries.filter(e=>(!page||e.pages.includes(page))&&(!$('#dirty-only').checked||changed(e))&&(!q||[e.en,e.ko,e.original.en,e.original.ko].some(s=>s.toLowerCase().includes(q))));
 pageIndex=Math.max(0,Math.min(pageIndex,Math.ceil(entries.length/size)-1));$('#count').textContent=`전체 ${catalog.entries.length}개 중 ${entries.length}개`;
 const list=$('#entries');list.replaceChildren();
 for(const e of entries.slice(pageIndex*size,(pageIndex+1)*size)){
  const card=element('article',undefined,'entry'+(changed(e)?' changed':''));const head=element('div',undefined,'entry-head');
  const info=element('div');info.append(element('p',e.pages.map(pageName).join(' · ')),element('p',({text:'화면 문구',title:'브라우저 제목',description:'검색 설명',alt:'이미지 설명','aria-label':'접근성 설명','rich-en':'링크가 포함된 영문 일부','rich-ko':'링크가 포함된 국문 일부'})[e.kind]||e.kind));
  for(const p of e.pages){const link=element('a',pageName(p)+' ↗');link.href='/preview/'+p;link.target='_blank';link.rel='noopener';link.style.marginRight='12px';info.append(link);}
  const reset=element('button','저장된 내용으로 되돌리기');reset.onclick=()=>{Object.assign(e,baseline.get(e.id));render();};head.append(info,reset);card.append(head);const fields=element('div',undefined,'fields');
  for(const lang of ['ko','en']){const label=element('label',lang==='ko'?'한국어':'English');const input=element('textarea');input.value=e[lang];input.lang=lang;input.rows=e[lang].length>180?5:3;input.dataset.locked=String(e.kind==='rich-en'&&lang==='ko'||e.kind==='rich-ko'&&lang==='en');input.disabled=working||input.dataset.locked==='true';input.oninput=()=>{e[lang]=input.value;card.classList.toggle('changed',changed(e));refreshCount();$('#review').hidden=true;};label.append(input);fields.append(label);}
  card.append(fields);list.append(card);
 }
 if(!entries.length)list.append(element('p','검색 결과가 없습니다.','empty'));
 $('#pagination').textContent=`${entries.length?pageIndex+1:0} / ${Math.ceil(entries.length/size)}`;$('#previous').disabled=pageIndex===0;$('#next').disabled=(pageIndex+1)*size>=entries.length;refreshCount();
}
async function save(){const count=edits().length;if(!count)return;const result=await api('save',{edits:edits()});revision=result.revision;baseline=new Map(catalog.entries.map(e=>[e.id,{en:e.en,ko:e.ko}]));render();status(`${count}개 문구를 이 컴퓨터에 저장했습니다. 온라인에는 아직 반영되지 않았습니다.`);}
$('#save').onclick=async()=>{lock(true);try{await save();}catch(e){status(e.message,true);}finally{lock(false);}};
$('#preview').onclick=async()=>{const tab=window.open('about:blank','portfolio-preview');lock(true);try{await api('preview',{edits:edits()});const url='/preview/'+($('#page').value||'index.html');if(tab)tab.location=url;else status('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 눌러 주세요.',true);}catch(e){tab?.close();status(e.message,true);}finally{lock(false);}};
$('#deploy').onclick=()=>{const n=edits().length;$('#review-changes').textContent=n?`저장되지 않은 변경 ${n}개를 먼저 저장한 뒤 배포합니다. 이전에 저장한 변경도 함께 반영됩니다.`:'현재 이 컴퓨터에 저장된 문구를 배포합니다.';$('#review').hidden=false;$('#review').scrollIntoView({behavior:'smooth',block:'center'});};
$('#cancel-deploy').onclick=()=>{$('#review').hidden=true;};
async function poll(){try{const result=await(await fetch('/api/status')).json();status(result.message,result.state==='error');if(['running','pushed'].includes(result.state)){pollTimer=setTimeout(poll,3000);}else{lock(false);}}catch{status('편집기 연결이 끊어졌습니다. 실행 아이콘으로 다시 열어 주세요.',true);lock(false);}}
$('#confirm-deploy').onclick=async()=>{lock(true);try{await save();await api('deploy',{});$('#review').hidden=true;status('배포를 시작했습니다. 완료될 때까지 편집기를 실행해 두세요.');await poll();}catch(e){status(e.message,true);lock(false);}};
for(const id of ['search','page','dirty-only'])$('#'+id).addEventListener(id==='search'?'input':'change',()=>{pageIndex=0;render();});
$('#previous').onclick=()=>{pageIndex--;render();};$('#next').onclick=()=>{pageIndex++;render();};
window.addEventListener('beforeunload',e=>{if(catalog&&edits().length){e.preventDefault();e.returnValue='';}});
(async()=>{try{const result=await(await fetch('/api/catalog')).json();if(result.error)throw Error(result.error);({catalog,revision,token}=result);baseline=new Map(catalog.entries.map(e=>[e.id,{en:e.en,ko:e.ko}]));for(const p of [...new Set(catalog.entries.flatMap(e=>e.pages))].sort()){const option=element('option',pageName(p));option.value=p;$('#page').append(option);}render();status('준비되었습니다. 수정 후 먼저 미리보기로 확인하세요.');const job=await(await fetch('/api/status')).json();if(['running','pushed'].includes(job.state)){lock(true);poll();}}catch(e){status(e.message||'편집기를 불러오지 못했습니다.',true);}})();
