#!/usr/bin/env python3
"""Build the offline classic-course reader. No remote writes; no runtime publication."""
import argparse, csv, hashlib, io, json
from pathlib import Path
import build as core


def parse_guide(path, lesson):
    if not path.is_file(): raise core.Invalid(f'Missing intro/theory: {path.name}')
    d=core.section(path); req={'order','bands','intro','theory','checks','scenes'}
    core.check(set(d)==req,'Missing or unknown guidance section')
    ids={p['num'] for p in lesson['phrases']}; order=' '.join(d['order']).split()
    core.check(len(order)==len(ids) and set(order)==ids,'Order must be a permutation of the bank')
    out={'order':order}
    for section in ['intro','theory']:
        rows=[core.split(r,5) for r in d[section]]
        core.check((2<=len(rows)<=5) if section=='intro' else len(rows)>=4, 'Missing teaching content: '+section)
        for r in rows:
            core.check(all(x in ids for x in r[4].split(',')), 'Dangling example in '+section)
        out[section]=rows
    core.check(not set(r[2] for r in out['intro']) & set(r[2] for r in out['theory']), 'Intro must not duplicate theory')
    out['bands']=[core.split(r,4) for r in d['bands']];core.check(len(out['bands'])*10==len(order),'Missing study blocks')
    out['checks']=[core.split(r,6) for r in d['checks']];core.check(len(out['checks'])>=2 and all(core.key(r[2])!=core.key(r[3]) for r in out['checks']),'Missing independent practice or overlapping answers')
    out['scenes']={}
    for r in d['scenes']:
        i,ru,uk=core.split(r,3);core.check(i in ids and i not in out['scenes'],'Invalid scene ID');out['scenes'][i]=[ru,uk]
    return out


def prepare(root,target='es'):
    data=core.compile_course(root,target); ledger=data['ledger']
    for e in ledger.values(): e['forms']=[];e['examples']=[]
    for lesson in data['lessons']:
        g=parse_guide(root/target/(lesson['id']+'.guide'),lesson); lesson['guide']=g
        by={p['num']:p for p in lesson['phrases']}; lesson['phrases']=[by[n] for n in g['order']]
        for rank,p in enumerate(lesson['phrases'],1):
            p['displayPosition']=rank
            for i,(w,sense) in enumerate(zip(p['practiceWords'],p['senses'])):
                # Definite vs indefinite is not the first lesson's objective. A valid translation
                # using 'una mochila' must not appear as a supposedly incorrect choice of article.
                if target=='es' and w['kind']=='article':
                    pool=['el','la','los','las','le','les'];pool=[x.capitalize() if w['correct'][0].isupper() else x for x in pool];core.check(w['correct'] in pool,'Unexpected Spanish article')
                    w['choices']=sorted(pool,key=lambda x:hashlib.sha256(f"{p['id']}:{i}:{x}".encode()).hexdigest());w['distractors']=[x for x in w['choices'] if x!=w['correct']]
                e=ledger[sense]
                if not e['examples']: e['firstLesson']=lesson['id'];e['firstPhrase']=p['id']
                if p['id'] not in e['examples']:e['examples'].append(p['id'])
                if core.key(w['text']) not in {core.key(z) for z in e['forms']}:e['forms'].append(w['text'])
    data['schema']='classic-grammar-guided/1'; return data


def write(root,out,target='es'):
    d=prepare(root,target);out.mkdir(parents=True,exist_ok=True)
    def save(name,s): (out/name).write_bytes(s.encode('utf-8'))
    save('bundle.json',core.dump(d));save('ledger.json',core.dump(d['ledger']));save('NEXT.json',core.dump({'next':d['nextTopic'],'priorSenses':sorted(d['ledger']),'required':['grammar validator','50 phrases','localized intro before practice','separate detailed theory','blind transfer checks'],'status':'editorial only'}))
    template=(root/'preview.html').read_text('utf8');shell=template.split('<script type="application/json" id="data">')[0];core.check('@@STATIC@@' in shell and len(shell)<15000,'Unexpected shared preview shell')
    runtime=(root/'guide_runtime.js').read_text('utf8');style=(root/'guide.css').read_text('utf8');shell=shell.replace('</style>','\n'+style+'\n</style>')
    for l in d['lessons']:
        payload=json.dumps({'lesson':l,'ledger':d['ledger'],'programme':d['programme']},ensure_ascii=False,sort_keys=True).replace('<','\\u003c')
        static=''.join('<p>'+core.h(p['displayPosition'])+'. '+core.h(p['ru'])+' — '+core.h(p['targetText'])+'</p>' for p in l['phrases'])
        save(target.upper()+'-'+l['id']+'.html',shell.replace('@@STATIC@@',static)+'<script type="application/json" id="data">'+payload+'</script><script>'+runtime+'</script></body></html>')
    receipt={'status':'editorial technical checks only','deployed':False,'independentReview':'pending','learnerPilot':'not_run','phrases':sum(len(l['phrases']) for l in d['lessons']),'wordPositions':sum(len(p['practiceWords']) for l in d['lessons'] for p in l['phrases']),'lessonsWithIntroAndTheory':len(d['lessons'])};save('receipt.json',core.dump(receipt));print(receipt)
    if len(d['lessons'])==1 and (root/target/'01.review').is_file():
        notes={}; l=d['lessons'][0]
        for row in core.read(root/target/'01.review'):
            id,n=core.split(row,2);core.check(id not in notes,'Duplicate audit row');notes[id]=n
        core.check(set(notes)=={p['num'] for p in l['phrases']},'One audit note required per phrase')
        buf=io.StringIO(newline='');w=csv.writer(buf,delimiter='\t',lineterminator='\n');w.writerow(['Позиция','Исходный ID','Испанская фраза','Перевод','Форма','Редакторское решение','Подсказка ситуации'])
        for p in l['phrases']:w.writerow([p['displayPosition'],p['id'],p['targetText'],p['ru'],core.FORMS[p['person']],notes[p['num']],l['guide']['scenes'].get(p['num'],['',''])[0]])
        save('audit-50.tsv','\ufeff'+buf.getvalue())
    return receipt

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--target',choices=['es'],default='es');a=p.parse_args();o=a.out.resolve();core.check(o!=core.ROOT and core.ROOT not in o.parents,'Use a separate output directory');write(core.ROOT,o,a.target)
