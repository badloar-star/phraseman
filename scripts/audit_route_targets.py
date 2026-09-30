"""Read-only audit: route literals in code that do not resolve to a file under app/.
// зачем: после массового ретайра (лиги/сезон/MAX/подарки) искать ссылки на удалённые экраны — иначе белый экран."""
import os
import re

routes = set()
for root, _dirs, files in os.walk('app'):
    for f in files:
        if f.endswith(('.tsx', '.ts', '.js')):
            rel = os.path.relpath(os.path.join(root, f), 'app').replace(os.sep, '/')
            rel = re.sub(r'\.(tsx|ts|js)$', '', rel)
            routes.add('/' + rel)
            if rel.endswith('/index'):
                routes.add('/' + rel[:-6])
            routes.add('/' + re.sub(r'\([^)]*\)/', '', rel))

pat = re.compile(r"""(?:pathname:\s*|router\.(?:push|replace|navigate)\(\s*|href=\s*)\{?\s*['"](/[A-Za-z0-9_\-/\[\]\(\)]+)['"]""")
dyn = [re.compile(re.sub(r'\[[^\]]+\]', '[^/]+', x)) for x in routes if '[' in x]
bad = {}
for base in ['app', 'components', 'modules', 'hooks']:
    for root, _dirs, files in os.walk(base):
        if 'node_modules' in root:
            continue
        for f in files:
            if not f.endswith(('.ts', '.tsx')):
                continue
            p = os.path.join(root, f).replace(os.sep, '/')
            try:
                s = open(p, encoding='utf-8').read()
            except Exception as e:
                print('SKIP', p, e)
                continue
            for m in pat.finditer(s):
                r = m.group(1)
                if r == '/':
                    continue
                if r in routes or any(d.fullmatch(r) for d in dyn):
                    continue
                bad.setdefault(r, []).append(p)
for r, ps in sorted(bad.items()):
    print(r, len(ps), ps[:2])
print('unresolved route literals:', len(bad))
