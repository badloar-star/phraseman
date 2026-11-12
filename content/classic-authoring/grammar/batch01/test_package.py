import hashlib,json,random,re,tempfile,unittest
from pathlib import Path
import compile_batch as b
import lingua as g
class PackTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls): cls.ls,cls.d=b.compile_all();cls.src=b.old.prepare(b.BASE)['lessons'][0]['phrases']
 def test_150_stable_distinct(self):
  p=[p for l in self.ls for p in l['phrases']];self.assertEqual([len(l['phrases']) for l in self.ls],[50]*3);self.assertEqual(len({x['id'] for x in p}),150);self.assertEqual(len({x['targetText'].casefold() for x in p}),150);self.assertEqual([z['ordinal'] for z in self.ls],[1,2,3])
 def test_es01_order_id_and_text(self):
  self.assertEqual([(p['id'],p['targetText']) for p in self.ls[0]['phrases']],[(p['id'],p['targetText']) for p in self.src])
 def test_word_only_all_positions(self):
  for l in self.ls:
   for p in l['phrases']:
    tc=[s['correct'] for s in p['practiceWords']];self.assertEqual(p['format'],'word_builder');self.assertTrue(all(x.isalpha() for x in tc));self.assertEqual(p['punctuation']['before']+' '.join(tc)+p['punctuation']['after'],p['targetText']);self.assertEqual(p['tts']['text'],p['targetText']);self.assertEqual(p['tts']['locale'],'es-ES');self.assertTrue(set(tc)&set(g.V) or {x.lower() for x in tc}&set(g.V))
    for j,s in enumerate(p['practiceWords']):
     self.assertEqual(len(s['choices']),6);self.assertEqual(len({g.norm(x) for x in s['choices']}),6);self.assertCountEqual(s['choices'],[s['correct'],*s['distractors']]);self.assertTrue(s['explanation']['ru'] and s['explanation']['uk']);self.assertIn(s['senseId'],self.d)
     for alt in p['acceptedExamples']:
      words=re.findall(r'[^\W\d_]+',alt.lower());pre=[w.lower() for w in tc[:j]]
      if words[:j]==pre and len(words)>j:self.assertNotIn(words[j],{x.lower() for x in s['distractors']},(p['id'],alt,j))
 def test_each_language_and_reference(self):
  for l in self.ls:
   ids={p['id'] for p in l['phrases']};self.assertEqual(len(l['intro']),3);self.assertGreaterEqual(len(l['theory']),7);self.assertEqual(len(l['verbs']['forms']),6);self.assertEqual({r['surface'] for r in l['verbs']['forms']},set(g.V));self.assertEqual(len(l['bands']),5)
   for c in l['intro']+l['theory']:
    self.assertTrue(c['examples'] and set(c['examples'])<=ids);self.assertNotEqual(c['body']['ru'],c['body']['uk']);self.assertTrue(min(map(len,c['body'].values()))>60)
   for r in l['verbs']['forms']:
    self.assertTrue(r['examples'] and set(r['examples'])<=ids);self.assertTrue(all(next(p for p in l['phrases'] if p['id']==id)['analysis']['verb']==r['surface'] for id in r['examples']))
   for p in l['phrases']:
    for lang in ('ru','uk'):
     self.assertTrue(p['prompt'][lang]);self.assertTrue(all(p['analysis'][k][lang] for k in ['agreement','meaning','operation','assembly']));
     if p['prompt'][lang].lower().startswith(('вы ','ви ')):self.assertTrue(p['context'][lang],p['id'])
 def test_cumulative_dictionary(self):
  first={};seen=set()
  for l in self.ls:
   used={k for p in l['phrases'] for k in p['senses']};self.assertEqual(set(l['vocabulary']['new']),used-seen);self.assertEqual(set(l['vocabulary']['seenBefore']),used&seen);seen|=used
   for p in l['phrases']:
    for k in p['senses']:first.setdefault(k,(l['id'],p['id']));self.assertIn(p['id'],self.d[k]['examples'])
  self.assertEqual(seen,set(self.d));self.assertEqual(set(self.ls[1]['vocabulary']['new']),{'no_neg','bolso','bolsillo','oficina','tienda'});self.assertEqual(set(self.ls[2]['vocabulary']['new']),{'hotel','billete','pasaporte','salida','parada'});self.assertEqual({g.norm(x) for x in self.d['estar_loc']['formsSeen']},set(g.V));self.assertEqual(self.d['estar_loc']['firstPhrase'],'es:01:01');
  for k,(l,p) in first.items():self.assertEqual((self.d[k]['firstLesson'],self.d[k]['firstPhrase']),(l,p))
 def test_actual_person_and_polarity(self):
  for l in self.ls:
   for p in l['phrases']:
    ru=p['prompt']['ru'].lower();uk=p['prompt']['uk'].lower();s=p['analysis'];v=s['verb'];n=l['ordinal'];self.assertEqual(n==3,p['targetText'].startswith('¿'));self.assertEqual(n==3,p['targetText'].endswith('?'));self.assertEqual(n==2,'no' in p['targetText'].lower().replace('¿','').split());self.assertEqual(n==2,bool(re.search(r'\b(не|нет|недалеко)\b',ru)));self.assertEqual(n==2,bool(re.search(r'\b(не|немає|недалеко)\b',uk)));
    if ru.startswith('я '):self.assertEqual(v,'estoy');self.assertTrue(uk.startswith('я '));
    if ru.startswith('ты '):self.assertEqual(v,'estás');self.assertTrue(uk.startswith('ти '));
    if ru.startswith('мы '):self.assertEqual(v,'estamos');self.assertTrue(uk.startswith('ми '));
    if ru.startswith(('паспорта ','ключи ','ключей ','книги ','билеты ','машины ')):self.assertEqual(v,'están')
    if ru.startswith(('рюкзак ','телефон ','книга ','ключ ','паспорт ','билет ','станция ','сумка ','выход ','отель ','остановка ')):self.assertEqual(v,'está')
 def test_validator_rejects_faults(self):
  for lid,wrong in [('01','Estoy en aquí.'),('02','Ana está no en casa.'),('02','Las llaves no está en casa.'),('02','Ana está aquí.'),('02','No no estoy aquí.'),('03','Estás en casa?'),('03','¿Estás en casa?.'),('03','¿Están Ana en la cocina?'),('03','¿Dónde está Ana?'),('03','¿No está Ana en casa?')]:
   with self.subTest(wrong=wrong),self.assertRaises(ValueError):g.decode(wrong,lid)
 def test_output_and_import(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);b.write(root);m=json.loads((root/'manifest.json').read_text());self.assertFalse(m['published']);self.assertEqual(m['counts']['phrases'],150)
   for path,sha in m['sha256'].items():self.assertEqual(hashlib.sha256((root/path).read_bytes()).hexdigest(),sha)
   for i,l in enumerate(self.ls,1):
    a=json.loads((root/f'classic-adapter/ES-{i:02}.phrases.json').read_text());self.assertEqual(len(a),50)
    for p,r in zip(l['phrases'],a,strict=True):
     self.assertEqual((p['id'],p['targetText'],p['prompt']['ru'],p['prompt']['uk'],p['acceptedExamples']),(r['id'],r['spanish'],r['russian'],r['ukrainian'],r['alternativesEs']));self.assertTrue(r['english']);self.assertTrue(all(len(w['distractors'])==5 and w['teachingNote']['correctUk'] for w in r['words']))
if __name__=='__main__':unittest.main()
