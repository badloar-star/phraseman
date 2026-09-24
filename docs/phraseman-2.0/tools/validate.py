#!/usr/bin/env python3
"""Validate package links, traceability, IDs, task DAG, evidence rules and optional hashes."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import sys
ROOT = Path(__file__).resolve().parents[1]
STATUSES = {'ready_audit','planned','needs_decision','deferred','in_progress','blocked','review','done','superseded'}

def validate(check_manifest: bool = False) -> dict:
    errors=[]
    def need(ok, text):
        if not ok: errors.append(text)
    def load(name): return json.loads((ROOT/name).read_text(encoding='utf-8'))
    tasks=load('registries/tasks.json'); reqs=load('registries/requirements.json'); epics=load('registries/epics.json')
    models=load('registries/models.json'); gates=load('registries/gates.json')
    tid={t['id']:t for t in tasks}; rid={r['id']:r for r in reqs}; eid={e['id']:e for e in epics}
    need(len(tid)==len(tasks),'Duplicate task IDs');need(len(rid)==len(reqs),'Duplicate requirement IDs');need(len(eid)==len(epics),'Duplicate epic IDs')
    for r in reqs:
        s=r['source'];path=ROOT/s['file'];need(path.is_file(),f"{r['id']}: missing source")
        if path.is_file():
            data=path.read_text(encoding='utf-8')
            if s.get('verbatim'):
                need(data[s.get('start_char',0):s.get('end_char',0)]==s['excerpt'],f"{r['id']}: source excerpt differs")
            else:
                need(s.get('anchor','__NONE__') in data,f"{r['id']}: source anchor absent")
        need(bool(r['tasks']),f"{r['id']}: orphan requirement")
        for t in r['tasks']:
            need(t in tid,f"{r['id']}: unknown task {t}")
            if t in tid: need(r['id'] in tid[t]['requirement_ids'],f"{r['id']}: reverse mapping {t} missing")
    all_ac=set()
    for t in tasks:
        name=t['id'];need(t['epic'] in eid,f'{name}: unknown epic');need(t['status'] in STATUSES,f'{name}: unknown status')
        need((ROOT/t['spec']).is_file(),f'{name}: missing specification')
        need(bool(t['acceptance']),f'{name}: missing acceptance')
        need(t['profile'] in models,f'{name}: unknown model profile')
        if t['profile'] in models:
            p=models[t['profile']]
            need(t['model']==p['model'] and t['reasoning']==p['reasoning'],f'{name}: model profile mismatch')
        for g in t['gates']: need(g in gates,f'{name}: unknown gate {g}')
        for r in t['requirement_ids']: need(r in rid and name in rid[r]['tasks'],f'{name}: invalid requirement {r}')
        for dep in t['depends_on']: need(dep in tid and dep!=name,f'{name}: invalid dependency {dep}')
        for ac in t['acceptance']:
            need(ac['id'] not in all_ac,f'{name}: duplicate acceptance');all_ac.add(ac['id'])
            if ac['accepted']: need(bool(ac['evidence']),f"{ac['id']}: accepted without evidence")
        if t['status']=='done':
            need(t.get('kind') in {'code','audit','documentation','design','decision'},f'{name}: completion kind not classified')
            need(bool(t.get('actual_model')) and bool(t.get('actual_reasoning')),f'{name}: actual model/effort absent')
            need(all(a['accepted'] for a in t['acceptance']),f'{name}: done before acceptance')
            need(bool(t.get('evidence')),f'{name}: done without evidence')
            need(bool(t.get('reviewer')),f'{name}: done without reviewer')
            need(t.get('review_verdict')=='PASS',f'{name}: done without review PASS')
            if t.get('kind')=='code': need(bool(t.get('result_sha')),f'{name}: code done without result SHA')
            for g in t['gates']: need(bool(t.get('gate_evidence',{}).get(g)),f'{name}: gate {g} lacks evidence')
    for e in epics:
        need(set(e['tasks'])=={t['id'] for t in tasks if t['epic']==e['id']},f"{e['id']}: epic members mismatch")
    visiting=set();visited=set()
    def visit(name):
        if name in visiting: errors.append('Dependency cycle: '+name);return
        if name in visited or name not in tid:return
        visiting.add(name)
        for dep in tid[name]['depends_on']:visit(dep)
        visiting.remove(name);visited.add(name)
    for name in tid:visit(name)
    for path in ROOT.rglob('*.md'):
        for link in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)',path.read_text(encoding='utf-8')):
            if '://' in link or link.startswith(('#','mailto:')): continue
            target=(path.parent/link.split('#')[0]).resolve()
            need(target.exists(),f'Missing Markdown link in {path.relative_to(ROOT)}: {link}')
    manifest=ROOT/'source_manifest.json'
    if manifest.exists():
        for entry in load('source_manifest.json')['files']:
            f=ROOT/entry['path'];need(f.exists(),f'Missing original: {entry["path"]}')
            if f.exists():need(hashlib.sha256(f.read_bytes()).hexdigest()==entry['sha256'],f'Original changed: {entry["path"]}')
    if check_manifest:
        for entry in load('MANIFEST.json')['files']:
            f=ROOT/entry['path'];need(f.is_file(),f'Missing package file: {entry["path"]}')
            if f.is_file():need(hashlib.sha256(f.read_bytes()).hexdigest()==entry['sha256'],f'Package hash mismatch: {entry["path"]}')
    counts={s:sum(t['status']==s for t in tasks) for s in sorted({t['status'] for t in tasks})}
    return {'passed':not errors,'tasks':len(tasks),'requirements':len(reqs),'epics':len(epics),'acceptance_criteria':len(all_ac),'accepted_criteria':sum(a['accepted'] for t in tasks for a in t['acceptance']),'status_counts':counts,'errors':errors,'scope':'Documentation integrity only; not source-code, billing, device, migration or visual app validation.'}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--manifest',action='store_true');args=parser.parse_args()
    try: result=validate(args.manifest)
    except (OSError,ValueError,KeyError,TypeError) as exc:
        print(json.dumps({'passed':False,'error':str(exc)},ensure_ascii=False));return 2
    print(json.dumps(result,ensure_ascii=False,indent=2));return 0 if result['passed'] else 1
if __name__=='__main__':raise SystemExit(main())
