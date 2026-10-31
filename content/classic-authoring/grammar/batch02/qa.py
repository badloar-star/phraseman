"""Tests of the exported bytes and the cumulative ledger. Run after compile.py."""
import hashlib,json,sys,re
from pathlib import Path
from language import ck,key,words,morphology
from compile import build

def check(out):
    J=lambda p:json.loads((out/p).read_text('utf8'));manifest=J('manifest.json');curr,book0,prior=build();book=J('ledger.json');allphr={p['id']:p for l in prior for p in l['phrases']};before=set(q for l in prior for q in l['vocabulary']['new']);alltext={key(p['targetText']) for p in allphr.values()};checks=0
    for fn,h in manifest['sha256'].items():assert hashlib.sha256((out/fn).read_bytes()).hexdigest()==h,fn
    for n in (4,5,6):
        l=J(f'lessons/ES-{n:02}.json');adapt=J(f'classic-adapter/ES-{n:02}.phrases.json');assert l==curr[n-4];assert [p['displayOrder'] for p in l['phrases']]==list(range(1,51));assert [p['band'] for p in l['phrases']]==[x//10+1 for x in range(50)];assert len(adapt)==50;assert len(l['intro'])==3 and len(l['theory'])==7
        ids={p['id'] for p in l['phrases']};inlesson=set()
        for c in l['intro']+l['theory']:
            assert c['examples'] and set(c['examples'])<=ids and all(c['heading'][k] and len(c['body'][k])>=65 for k in ['ru','uk'])
        for p,a in zip(l['phrases'],adapt,strict=True):
            es=p['targetText'];assert p['id'] not in allphr and key(es) not in alltext;allphr[p['id']]=p;alltext.add(key(es));assert a['id']==p['id'] and a['english']==p['englishGloss'] and a['spanish']==es;assert a['russian']==p['prompt']['ru'] and a['ukrainian']==p['prompt']['uk'];assert p['format']=='word_builder' and p['tts']=={'text':es,'locale':'es-ES'};assert all(len(p['analysis'][s][k])>6 for s in ['agreement','meaning','operation'] for k in ('ru','uk'))
            assert p['punctuation']['before']+' '.join(w['correct'] for w in p['practiceWords'])+p['punctuation']['after']==es
            assert len(p['practiceWords'])==len(a['words'])==len(p['senses']);assert set(p['acceptedExamples'])==set(a['alternativesEs']);assert all(x!=es for x in p['acceptedExamples']);assert len(set(p['acceptedExamples']))==len(p['acceptedExamples'])
            for j,(w,aw,sid) in enumerate(zip(p['practiceWords'],a['words'],p['senses'],strict=True)):
                assert len(set(map(key,w['choices'])))==6 and len(w['distractors'])==5 and w['correct'] not in w['distractors'];assert set(w['choices'])==set([w['correct'],*w['distractors']]);assert all(re.fullmatch(r'[^\W\d_]+',x) for x in w['choices']);assert aw['text']==aw['correct']==w['correct'] and aw['distractors']==w['distractors'];assert w['senseId']==sid and p['id'] in book[sid]['examples'];assert aw['teachingNote']['correctRu'] and aw['teachingNote']['wrongUk'];inlesson.add(sid)
                for alt in p['acceptedExamples']:
                    toks=list(map(key,words(alt))); canon=list(map(key,words(es)));assert not(len(toks)>j and toks[:j]==canon[:j] and toks[j] in set(map(key,w['distractors']))),(p['id'],alt,j)
                checks+=1
        assert set(l['vocabulary']['new'])==inlesson-before and set(l['vocabulary']['seenBefore'])==inlesson&before;before|=inlesson
        assert all(r['examples'] and set(r['examples'])<=ids for t in l['grammarTables'] for r in t['rows']);assert all(len(t['forms'])==6 and set(p['id'] for p in l['phrases'] if p['analysis']['verbLemma']==t['lemma'])==set(i for r in t['forms'] for i in r['examples']) for t in l['verbTables']);
        if n==6:assert [r['form'] for r in l['grammarTables'][0]['rows']]==['el','la','los','las']
    assert set(book)==before and len(allphr)==len(alltext)==300;assert all(v['firstPhrase'] in allphr and allphr[v['firstPhrase']]['id'].rsplit(':',1)[0]==v['firstLesson'] and s in allphr[v['firstPhrase']]['senses'] for s,v in book.items());assert J('NEXT.json')['next']=='ES-07' and J('programme.json')[6]['example']=='Hay un libro en la mesa.'
    for n,es in [(4,'Ana somos médicas.'),(4,'Somos profesora.'),(4,'Estoy médico.'),(4,'Eres la profesor.'),(5,'¿Dónde están el libro?'),(5,'¿Qué libros está en casa?'),(5,'¿Quiénes es ella?'),(6,'La mapa está aquí.'),(6,'El foto está aquí.'),(6,'Los maletas están aquí.'),(6,'Las llaves está aquí.')]:
        try:morphology(es,n)
        except ValueError:continue
        raise AssertionError('Fault injected but accepted: '+es)
    print('PASS: 150 new + 150 earlier distinct canonical sentences; stable ledger, 21 bilingual chapters, 9 intros, all adapters, 11 deliberate errors rejected; checked',checks,'word slots.')
if __name__=='__main__':check(Path(sys.argv[1]))
