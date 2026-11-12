"""Public build entrypoint. Published canonical data are immutable; input aliases change only which existing lexeme a new word occurrence cites."""
from pathlib import Path
import sys,json,re,html
import compile9 as compiler
source_prepare=compiler.prepare

def prepare_lexicon(book):
    lookup=source_prepare(book)
    for surface,key in {'salidas':'salida'}.items():
        assert key in book and lookup.get(surface,key)==key
        lookup[surface]=key
    return lookup

def bank_reader(lessons):
    e=html.escape
    css='''*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font:16px/1.52 system-ui,sans-serif;color:#1d2c44;background:#f1f4f8}header,main{max-width:900px;margin:auto;padding:22px 16px}header{padding-top:38px}h1,h2,h3{line-height:1.18}h1{margin:9px 0}small{color:#53647d}h2{margin-top:34px}article{background:white;border:1px solid #dce4ef;border-radius:15px;padding:16px 19px;margin:10px 0}h3{font-size:1.22rem;margin:7px 0}p{margin:6px 0}.hint{background:#eff4fb;padding:8px;border-radius:7px}.chips{display:flex;gap:4px;flex-wrap:wrap}.chips span,nav a{background:#e6edfa;color:#243f73;border-radius:8px;padding:4px 9px}nav{display:flex;gap:5px;flex-wrap:wrap;margin:12px 0}input{width:100%;padding:12px 14px;font:inherit;border:1px solid #afbdd4;border-radius:9px}details{margin-top:10px}summary{cursor:pointer;color:#2e4771}[hidden]{display:none!important}@media print{input,nav{display:none}article{break-inside:avoid}}'''
    z=['<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PhraseMan Classic · 450 фраз / фраз</title><style>'+css+'</style><header><small>PHRASEMAN CLASSIC / ES 01–09</small><h1>Все 450 фраз · Усі 450 фраз</h1><p>ES → RU / UK · Словесная сборка и разбор каждой фразы.</p><nav>'+''.join(f'<a href="#L{i}">ES-{i:02d}</a>' for i in range(1,10))+'</nav><input type="search" id="q" placeholder="Поиск / пошук: llave, ключ, es:07:13…" aria-label="Поиск / пошук"><small id="count" role="status">450 / 450</small></header><main>']
    for l in lessons:
        z.append(f'<section id="L{l["ordinal"]}"><h2>ES-{l["ordinal"]:02d} · {e(l["title"]["ru"])}</h2>')
        for p in l['phrases']:
            a=p['analysis'];u=p['prompt'];c=p['context'];z.append('<article><small>'+e(p['id'])+'</small><h3 lang="es">'+e(p['targetText'])+'</h3><p><b>RU</b> '+e(u['ru'])+'</p><p lang="uk"><b>UK</b> '+e(u['uk'])+'</p>');
            if c['ru']:z.append('<p class="hint">'+e(c['ru'])+' / '+e(c['uk'])+'</p>')
            z.append('<div class="chips">'+''.join('<span lang="es">'+e(w['text'])+'</span>' for w in p['practiceWords'])+'</div><details><summary>Разбор / Розбір</summary>')
            for k in ['ru','uk']:z.append(f'<p lang="{k}"><b>{k.upper()}</b> '+e(' '.join(a[x][k] for x in ['agreement','operation','meaning']))+'</p>')
            z.append('</details></article>')
        z.append('</section>')
    return ''.join(z)+'''</main><script>const q=document.getElementById('q'),norm=s=>s.normalize('NFC').toLocaleLowerCase().trim();q.addEventListener('input',()=>{let n=0;document.querySelectorAll('main section').forEach(s=>{let m=0;s.querySelectorAll('article').forEach(a=>{a.hidden=!norm(a.textContent).includes(norm(q.value));if(!a.hidden)m++});s.hidden=!m;n+=m});document.querySelector('#count').textContent=n+' / 450'})</script></html>'''

def build(base,out):
    compiler.prepare=prepare_lexicon
    compiler.build(base,out)
    ls=[compiler.read(out/'lessons'/f'ES-{i:02}.json') for i in range(1,10)]
    (out/'ALL-450.html').write_text(bank_reader(ls),'utf8')
    p=out/'START.html';s=p.read_text('utf8');
    if 'function jumpToLesson()' not in s:
        assert s.count('</html>')==1;s=s.replace('</html>','<script>function jumpToLesson(){const m=location.hash.match(/^#(?:L|ES-)?0?([1-9])$/i);if(m)pick(Number(m[1])-1)}window.addEventListener("hashchange",jumpToLesson);jumpToLesson()</script></html>')
    s=s.replace('04–06','01–09');p.write_text(s,'utf8')
    print('Built ES 01–09:',(out/'manifest.json').read_text('utf8'))
if __name__=='__main__':build(Path(sys.argv[1]).resolve(),Path(sys.argv[2]).resolve())
