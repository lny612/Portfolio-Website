import concurrent.futures, json, pathlib, urllib.parse, urllib.request
from importlib import import_module

api=import_module('import-notion')
ROOT=pathlib.Path(__file__).resolve().parents[1]
DEST=ROOT/'assets'/'projects'; DEST.mkdir(exist_ok=True)
blocks={}
for p in (ROOT/'content').glob('*.json'):
 data=json.loads(p.read_text(encoding='utf-8'))
 if 'blocks' in data: blocks.update(data['blocks'])
media=[b for b in blocks.values() if b['type'] in ('image','file','pdf','audio','video') and b.get('properties',{}).get('source') and not any(x in b['properties']['source'][0][0] for x in ['youtu.be','youtube.com','vimeo.com'])]
media += [{'id':b['id'],'key':b['id']+'-cover','properties':{'source':[[b['format']['page_cover']]]}} for b in blocks.values() if b.get('format',{}).get('page_cover')]
def download(b):
 src=b['properties']['source'][0][0]
 name=src.split(':')[-1] if src.startswith('attachment:') else urllib.parse.urlparse(src).path
 ext=pathlib.Path(name).suffix.lower() or '.bin'
 dest=DEST/(b.get('key',b['id'])+ext)
 if not dest.exists():
  signed=api.post('getSignedFileUrls',{'urls':[{'url':src,'permissionRecord':{'table':'block','id':b['id']}}]})
  url=signed['signedUrls'][0]
  if not isinstance(url,str): raise RuntimeError(str(signed))
  url=urllib.parse.quote(url,safe=":/?&=%+;,@!~*'()#")
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=60) as r: dest.write_bytes(r.read())
 return b.get('key',b['id']),dest.relative_to(ROOT).as_posix()
if __name__=='__main__':
 result={};errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
  futures={pool.submit(download,b):b for b in media}
  for future in concurrent.futures.as_completed(futures):
   try:
    key,path=future.result();result[key]=path;print('Saved',path,flush=True)
   except Exception as e:errors.append({'id':futures[future]['id'],'error':str(e)})
 (ROOT/'content'/'media.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
 print('Downloaded',len(result),'Failed',json.dumps(errors),flush=True)
 if errors:raise SystemExit(1)
