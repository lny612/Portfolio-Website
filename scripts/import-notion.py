"""Import only the supplied public portfolio pages; no authentication is used."""
import concurrent.futures, json, pathlib, re, urllib.request, uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'content'
OUT.mkdir(exist_ok=True)
BASE = 'https://brass-wormhole-c66.notion.site'
PROJECTS = {
 'bone-to-gather':'221dac73098e80f496e7e44fc351b441',
 'clockwork-nabi':'221dac73098e80df849bc35df76fd04a',
 'wizard-candy-maker':'2abdac73098e80b1a28eeda5c33761e3',
 'mutant-lab':'221dac73098e80b689e7e411cd873cce',
 'classic-rts':'221dac73098e8055b80dd62af7b4f047',
 'quench':'221dac73098e8024a13fde80072a99af',
 'flip-maze':'221dac73098e80c7b5c4eaa54ff2694b',
 'darkest-dungeon':'221dac73098e8011b259f111cfebfbc7'
}

def post(endpoint, payload):
 req=urllib.request.Request(BASE+'/api/v3/'+endpoint,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0'})
 with urllib.request.urlopen(req,timeout=40) as response: return json.load(response)

def unwrap(value):
 while isinstance(value,dict) and 'value' in value: value=value['value']
 return value

def fetch(page):
 result={}; cursor={'stack':[]}; chunk=0
 while True:
  data=post('loadPageChunk',{'pageId':page,'limit':100,'cursor':cursor,'chunkNumber':chunk,'verticalColumns':False})
  for key,record in data.get('recordMap',{}).get('block',{}).items():
   v=unwrap(record)
   if v.get('type'): result[key]={k:v[k] for k in ['id','type','properties','content','format'] if k in v}
  cursor=data.get('cursor',{'stack':[]}); chunk+=1
  if not cursor.get('stack'): break
  if chunk>50: raise RuntimeError('Unexpected pagination depth')
 return result

def import_project(item):
 slug,raw=item; page=str(uuid.UUID(raw)); blocks=fetch(page); fetched={page}; visited=set()
 def visit(key):
  if key in visited:return
  visited.add(key)
  if key not in blocks or (blocks[key]['type']=='page' and key not in fetched):
   blocks.update(fetch(key)); fetched.add(key)
  if key not in blocks: raise RuntimeError('Missing public block '+key)
  block=blocks[key]
  for child in block.get('content',[]):visit(child)
  for runs in block.get('properties',{}).values():
   for run in runs:
    for mark in run[1] if len(run)>1 else []:
     if mark[0]=='p':visit(mark[1])
     if mark[0]=='a' and 'brass-wormhole-c66.notion.site' in str(mark[1]):
      ids=re.findall(r'[a-f0-9]{32}',mark[1])
      if ids:visit(str(uuid.UUID(ids[-1])))
 visit(page)
 # Keep only content reached from this project, never unrelated ancestor records.
 result={'slug':slug,'root':page,'blocks':{key:blocks[key] for key in visited}}
 (OUT/(slug+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 return slug,len(visited)

if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for result in pool.map(import_project,PROJECTS.items()):print(*result,flush=True)
