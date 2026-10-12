import json,sys,collections,re
def short(u):
    m=re.search(r'(?:modulesOnly|bundle)[^/]*',u or '')
    return (u or '').split('?')[0].split('/')[-1][:60] or '[none]'
def an(n):
    p=json.load(open(f'C:/Temp/claude/cold{n}.cpuprofile',encoding='utf-8'))
    nodes={x['id']:x for x in p['nodes']}
    td=p['timeDeltas'][:]; td[1]=17000  # артефакт: первая дельта = время от эпохи
    t=0; ts=[]
    for d in td: t+=d; ts.append(t/1000)
    s=p['samples']
    idle={'(root)','[suspended]','(program)','(idle)','[native]'}
    def nm(i):
        cf=nodes[i]['callFrame']; return cf['functionName'] or '(anon)', cf.get('url','') ,cf.get('lineNumber')
    selfms=collections.Counter(); win=collections.defaultdict(lambda:[0,0,collections.Counter()])
    for k,i in enumerate(s):
        dur=(td[k+1] if k+1<len(td) else 17000)/1000
        f,u,l=nm(i); key=f'{f} @ {short(u)}:{l}'
        busy=f not in idle and u!='[suspended]'
        w=int(ts[k]//500)
        win[w][0]+=dur; 
        if busy: win[w][1]+=dur; win[w][2][key]+=dur; selfms[key]+=dur
    print(f'=== cold{n}: сэмплов {len(s)}, длительность {ts[-1]/1000:.1f} с')
    print('топ-12 функций по собственному времени (мс):')
    for k,v in selfms.most_common(12): print(f'  {v:7.0f}  {k}')
    print('окна по 0,5 с (занято, мс из окна) и главная функция:')
    for w in sorted(win):
        tot,b,c=win[w]
        top=c.most_common(1)[0] if c else ('-',0)
        if b>=250: print(f'  +{w*0.5:4.1f} с занято {b:4.0f}/{tot:4.0f}  {top[0][:90]} {top[1]:.0f}')
for n in (1,2,3): an(n)
