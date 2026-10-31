#!/usr/bin/env python3
"""Local authoring compiler. No network, external packages, production writes or model calls."""
from pathlib import Path
from collections import defaultdict, Counter
from functools import lru_cache
from html import escape
import argparse, hashlib, json, re, unicodedata
ROOT=Path(__file__).resolve().parent
class Invalid(ValueError): pass
def ensure(value, msg):
    if not value: raise Invalid(msg)
def tokens(s): return re.findall(r"[^\W\d_]+(?:['’][^\W\d_]+)*|\d+",unicodedata.normalize('NFC',s),re.UNICODE)
def norm(s): return ' '.join(t.casefold() for t in tokens(s))
def fold(s): return ''.join(c for c in unicodedata.normalize('NFD',norm(s)) if not unicodedata.combining(c))
def rows(p,n):
    result=[]
    for i,line in enumerate(p.read_text('utf-8-sig').splitlines(),1):
        if not line.strip() or line.lstrip().startswith('#'): continue
        fields=[v.strip() for v in line.split('|')]; ensure(len(fields)==n and all(fields),f'{p.name}:{i}: expected {n} nonempty fields'); result.append(fields)
    return result
def dump(obj): return json.dumps(obj,ensure_ascii=False,indent=2)+'\n'
def hashdata(obj): return hashlib.sha256(dump(obj).encode()).hexdigest()
def numbered(n):return [f'{i:02}' for i in range(1,n+1)]
def align(text, tags, lex):
    words=norm(text).split()
    @lru_cache(None)
    def match(k,at):
        if k==len(tags): return () if at==len(words) else None
        key=tags[k]; ensure(key in lex,'unknown sense '+key)
        for form in sorted(lex[key]['forms'],key=lambda x:-len(x)):
            part=norm(form).split(); end=at+len(part)
            if words[at:end]==part:
                rest=match(k+1,end)
                if rest is not None: return ((key,at,end),)+rest
        return None
    spans=match(0,0); ensure(spans is not None,f'uncovered or wrong form: {text} / {tags}'); return spans

def read_guide(p,lesson,target):
    g=json.loads(p.read_text('utf-8')); ids=set(numbered(50))
    ensure(g.get('id')==f'{target.upper()}-{lesson}' and g.get('status')=='author_draft','unexpected guide id/status')
    ensure(g['speechLocale'].split('-')[0]==target,'wrong TTS target')
    for k in ('title','goal'):
        ensure(all(g[k].get(x,'').strip() for x in ('ru','uk')),k+' incomplete')
    ensure([b['start'] for b in g['blocks']]==[1,11,21,31,41],'five blocks expected')
    for b in g['blocks']: ensure(all(b.get(k,'').strip() for k in ('ru','uk','tipRu','tipUk')),'block text missing')
    def refs(ls):ensure(isinstance(ls,list) and ls and all(i in ids for i in ls),'dangling phrase reference')
    ensure(len(g['theory'])>=3 and len(g['forms'])>=1 and len(g['dialogues'])>=1 and len(g['checks'])>=3,'lesson support incomplete')
    for t in g['theory']:
        ensure(all(t.get(k,'').strip() for k in ('titleRu','titleUk','ru','uk')),'theory translation missing'); refs(t['refs'])
    for lemma,forms,ru,uk,reference in g['forms']: ensure(all((lemma,forms,ru,uk)),'empty form'); refs(reference)
    for d in g['dialogues']:
        ensure(d['ru'] and d['uk'] and len(d['turns'])>=2 and all(role for role,_ in d['turns']),'dialogue incomplete'); refs([pid for _,pid in d['turns']])
    for ru,uk,opts,answer,whyru,whyuk in g['checks']:
        refs(opts); ensure(len(opts)==len(set(opts))>=2 and answer in opts and all((ru,uk,whyru,whyuk)),'invalid check')
    ensure(g.get('sources') and all(url.startswith('https://') for url in g['sources']),'missing source'); return g

def compile_course(root,target):
    folder=root/target; course=rows(folder/'course.psv',5); ensure(course and [r[0] for r in course]==numbered(len(course)),'programme gap')
    lex={}; senses=set()
    for key,lemma,pos,tier,ru,uk,forms in rows(folder/'senses.psv',7):
        ensure(re.fullmatch(r'[a-z][a-z0-9_]*',key) and key not in lex,'bad/duplicate sense: '+key); ensure(tier in ('core','recognize','support','name'),'bad tier'); identity=(norm(lemma),pos,ru.casefold()); ensure(identity not in senses,'same lemma/sense twice: '+key); senses.add(identity)
        lex[key]=dict(lemma=lemma,pos=pos,tier=tier,ru=ru,uk=uk,forms=forms.split(';')); ensure(all(norm(f) for f in lex[key]['forms']),'empty form')
    existing=sorted(p.name for p in (folder/'lessons').iterdir() if p.is_dir()); ensure(existing and existing==numbered(len(existing)) and len(existing)<=len(course),'lesson sequence gap or extra folder')
    ledger={}; seen_phrases={}; lessons=[]
    for lid in existing:
        src=folder/'lessons'/lid; guide=read_guide(src/'guide.json',lid,target); source=rows(src/'phrases.psv',8); ensure([r[0] for r in source]==numbered(50),lid+': 50 sequential ids required'); phrases=[]; used=set(); known=set(ledger)
        for pid,es,ru,uk,keys,alts,cr,cu in source:
            code=f'{target}:{lid}:{pid}'; normal=norm(es); ensure(normal and normal not in seen_phrases,f'duplicate phrase {code}: {normal}'); seen_phrases[normal]=code
            if target=='es': ensure(es.count('¿')==es.count('?') and es.count('¡')==es.count('!'),code+': unpaired punctuation')
            variants=[] if alts=='—' else [v.strip() for v in alts.split(';')]; av=[norm(s) for s in variants]; ensure(all(av) and len(av)==len(set(av)) and normal not in av,code+': duplicate/empty alternative')
            tags=keys.split(); spans=align(es,tags,lex); used.update(tags)
            for k in dict.fromkeys(tags):
                if k not in ledger:ledger[k]={'key':f'{target}:{k}','firstLesson':lid,'firstPhrase':code,'examples':[],'attestedForms':[]}
                ledger[k]['examples'].append(code)
            for k,a,b in spans:
                form=' '.join(tokens(es)[a:b]); entry=ledger[k]['attestedForms'];
                if norm(form) not in [norm(v) for v in entry]:entry.append(form)
            phrases.append(dict(id=code,localId=pid,targetText=es,ru=ru,uk=uk,cue={'ru':cr,'uk':cu},alternatives=variants,spans=[{'sense':k,'fromToken':a,'toExclusive':b} for k,a,b in spans],tts={'text':es,'locale':guide['speechLocale'],'engine':'device'}))
        # Token-building practice: reproduce the printed/heard reference, not an exhaustive free-translation judge. Five replay-stable distractors per tile.
        pool=sorted({w.casefold() for p in phrases for w in tokens(p['targetText'])}); ensure(len(pool)>8,'not enough distinct tokens')
        for p in phrases:
            words=tokens(p['targetText']); excluded={fold(w) for s in [p['targetText']]+p['alternatives'] for w in tokens(s)}; choices=[w for w in pool if fold(w) not in excluded]; ensure(len(choices)>=5,p['id']+': insufficient distractors')
            p['practiceWords']=[dict(text=w,correct=w,distractors=sorted(choices,key=lambda x:hashlib.sha256((p['id']+':'+str(i)+':'+x).encode()).digest())[:5]) for i,w in enumerate(words)]
        levels=Counter(lex[k]['tier'] for k in used-known); lessons.append(dict(ordinal=lid,guide=guide,phrases=phrases,newSenses=sorted(used-known),recycledSenses=sorted(used&known),newByTier=dict(levels)))
    unused=set(lex)-set(ledger);ensure(not unused,'dictionary entries not in a lesson: '+str(sorted(unused)))
    nextrow=course[len(existing)] if len(course)>len(existing) else None; last=lessons[-1]['guide']['handoff']; ensure(last['next']==(target.upper()+'-'+nextrow[0] if nextrow else 'END'),'stale next lesson'); ensure(last['ru'] and last['uk'],'empty handoff')
    for k,entry in ledger.items():entry.update({f:lex[k][f] for f in ('lemma','pos','tier','ru','uk')})
    return dict(schema='phraseman.authoring/1',target=target,productionReady=False,independentReview='pending',programme=course,lessons=lessons,ledger=ledger,nextBrief={'row':nextrow,'handoff':last,'priorPhraseCount':len(seen_phrases),'knownSenseIds':sorted(ledger)})

def render(bundle,lesson):
    # A self-contained review copy; no CDN, analytics, microphone, libraries or network.
    g=lesson['guide']; h=lambda x:escape(str(x)); P={p['localId']:p for p in lesson['phrases']}; ledger=bundle['ledger']; lid=lesson['ordinal']; tracks=[]
    for l in ('ru','uk'):
        uk=l=='uk'; suf='Uk' if uk else 'Ru'; parts=['<h1>'+h(g['title'][l])+'</h1><p class="lead">'+h(g['goal'][l])+'</p>'];
        for index,b in enumerate(g['blocks']):
            parts.append('<h2>'+str(index+1)+'. '+h(b[l])+'</h2><p>'+h(b['tip'+suf])+'</p>')
            for p in lesson['phrases'][index*10:index*10+10]:
                parts.append('<article><small>'+h(p['localId'])+' · '+h(p['cue'][l])+'</small><b lang="'+h(bundle['target'])+'">'+h(p['targetText'])+'</b><details><summary>'+('Переклад' if uk else 'Перевод')+'</summary>'+h(p[l])+'</details></article>')
        parts.append('<h2>'+('Як це працює' if uk else 'Как это работает')+'</h2>')
        for t in g['theory']:parts.append('<h3>'+h(t['title'+suf])+'</h3><p>'+h(t[l])+'</p>')
        parts.append('<h2>'+('Форми' if uk else 'Формы')+'</h2>')
        for lemma,forms,ru,ua,_ in g['forms']:parts.append('<p><strong>'+h(lemma)+'</strong> · '+h(forms)+'<br>'+h(ua if uk else ru)+'</p>')
        for d in g['dialogues']:
            parts.append('<h2>'+h(d[l])+'</h2>'); parts.extend('<p><strong>'+h(role)+'</strong> · '+h(P[pid]['targetText'])+' <small>'+h(P[pid][l])+'</small></p>' for role,pid in d['turns'])
        parts.append('<h2>'+('Перевір себе' if uk else 'Проверь себя')+'</h2>')
        for ru,ua,opts,ans,whyru,whyuk in g['checks']:parts.append('<article>'+h(ua if uk else ru)+'<p>'+' / '.join(h(P[x]['targetText']) for x in opts)+'</p><details><summary>'+('Відповідь' if uk else 'Ответ')+'</summary>'+h(P[ans]['targetText'])+' · '+h(whyuk if uk else whyru)+'</details></article>')
        parts.append('<h2>'+('Словник уроку' if uk else 'Словарь урока')+'</h2>');
        for k in sorted(lesson['newSenses']+lesson['recycledSenses'],key=lambda k:(['core','recognize','support','name'].index(ledger[k]['tier']),ledger[k]['lemma'])):
            e=ledger[k]; parts.append('<p><strong>'+h(e['lemma'])+'</strong> · '+h(e[l])+' <small>'+h(e['tier'])+' · '+h(e['firstPhrase'])+'</small></p>')
        tracks.append('<section id="'+l+'"'+(' hidden' if uk else '')+'>'+''.join(parts)+'</section>')
    return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PhraseMan · '+h(g['id'])+'</title><style>*{box-sizing:border-box}body{font:17px/1.55 system-ui,sans-serif;color:#172d32;max-width:820px;margin:auto;padding:22px;background:#f7faf8}header{border-bottom:2px solid #186661;padding:8px 0}button,summary{cursor:pointer}button{padding:8px 13px}article{background:white;border-left:3px solid #aacbc5;padding:.7em 1em;margin:.5em 0}b,small{display:block}b{font-size:1.23em}small{color:#476368}h2{margin-top:2em;color:#125b54}.lead{font-size:1.2em}details{margin-top:.3em}summary{color:#185d59}section[hidden]{display:none}</style><header>PHRASEMAN / CLASSIC · '+h(g['id'])+' &nbsp; <button data-l="ru">RU</button> <button data-l="uk">UA</button></header>'+''.join(tracks)+'<script>document.querySelectorAll("button[data-l]").forEach(b=>b.onclick=()=>{let l=b.dataset.l;document.documentElement.lang=l;document.querySelectorAll("section").forEach(s=>s.hidden=s.id!==l)})</script></html>'

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--target',default='es',choices=['es','en','fr','de','it']);ap.add_argument('--out',type=Path,required=True);a=ap.parse_args(); out=a.out.resolve(); ensure(out!=ROOT and ROOT not in out.parents,'choose an output outside authoring sources'); b=compile_course(ROOT,a.target);out.mkdir(parents=True,exist_ok=True)
    artifacts={'bundle.json':dump(b),'ledger.json':dump(b['ledger']),'NEXT.json':dump(b['nextBrief'])}
    for l in b['lessons']:artifacts[l['guide']['id']+'.html']=render(b,l)
    for name,text in artifacts.items():(out/name).write_bytes(text.encode())
    receipt={'status':'STRUCTURE_PASS_ONLY','independentLanguageReview':'pending','published':False,'counts':{l['guide']['id']:len(l['phrases']) for l in b['lessons']},'sha256':{k:hashlib.sha256(v.encode()).hexdigest() for k,v in artifacts.items()}};(out/'receipt.json').write_bytes(dump(receipt).encode());print(dump(receipt))
if __name__=='__main__':main()
