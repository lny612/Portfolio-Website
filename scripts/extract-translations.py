import json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
strings={}
def plain(runs):
 return ''.join(run[0] if run[0]!='‣' else '' for run in runs).strip()
for p in sorted((ROOT/'content').glob('*.json')):
 data=json.loads(p.read_text(encoding='utf-8'))
 for b in data.get('blocks',{}).values():
  props=b.get('properties',{})
  keys=['title','caption'] if b['type']!='image' else ['caption']
  if b['type']=='page':keys=list(props)
  for key in keys:
   value=plain(props.get(key,[]))
   if value and not value.startswith('http') and re.search(r'[A-Za-z가-힣]',value):strings[value]=None
values=sorted(strings)
(ROOT/'content'/'translation-source.json').write_text(json.dumps(values,ensure_ascii=False,indent=2),encoding='utf-8')
for i,value in enumerate(values):print(str(i)+' '+json.dumps(value,ensure_ascii=False))
