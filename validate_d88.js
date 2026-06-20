
const draft = {"planId":"mitap","dayIndex":88,"level":"B1","prerequisiteLessons":[12,26],"intro":[{"kind":"explanation"},{"kind":"explanation"},{"kind":"explanation"}],"phrases":[{"id":"mitap_d88_p1","english":"I spent all my savings at once.","constructions":["past-simple-irregular"],"words":[{"text":"I","partOfSpeech":"pronoun","distractors":["He","She","We","They","You"]},{"text":"spent","partOfSpeech":"verb","distractors":["saved","earned","borrowed","lost","invested"]},{"text":"all","partOfSpeech":"determiner","distractors":["some","no","each","few","every"]},{"text":"my","partOfSpeech":"pronoun","distractors":["his","her","our","their","your"]},{"text":"savings","partOfSpeech":"noun","distractors":["debts","salary","bills","losses","expenses"]},{"text":"at once","partOfSpeech":"adverb","distractors":["slowly","carefully","later","monthly","partly"]}]},{"id":"mitap_d88_p2","english":"I should not have taken that loan.","constructions":["past-simple-irregular","conditionals"],"words":[{"text":"I","partOfSpeech":"pronoun","distractors":["He","She","We","They","You"]},{"text":"should","partOfSpeech":"modal","distractors":["can","will","must","may","might"]},{"text":"not","partOfSpeech":"adverb","distractors":["never","also","just","even","still"]},{"text":"have","partOfSpeech":"verb","distractors":["had","has","be","been","do"]},{"text":"taken","partOfSpeech":"verb","distractors":["paid","saved","avoided","refused","planned"]},{"text":"loan","partOfSpeech":"noun","distractors":["bonus","salary","savings","discount","tax"]}]},{"id":"mitap_d88_p3","english":"If I had saved more, I would not have had problems.","constructions":["conditionals"],"words":[{"text":"If","partOfSpeech":"other","distractors":["When","But","Because","Although","Until"]},{"text":"had","partOfSpeech":"verb","distractors":["have","has","was","did","would"]},{"text":"saved","partOfSpeech":"verb","distractors":["spent","borrowed","lost","wasted","invested"]},{"text":"more","partOfSpeech":"adverb","distractors":["less","faster","soon","once","already"]},{"text":"would","partOfSpeech":"modal","distractors":["should","could","must","can","might"]},{"text":"problems","partOfSpeech":"noun","distractors":["debts","bills","loans","losses","risks"]}]},{"id":"mitap_d88_p4","english":"I lost my job and ran out of money.","constructions":["past-simple-irregular","phrasal-verbs"],"words":[{"text":"I","partOfSpeech":"pronoun","distractors":["He","She","We","They","You"]},{"text":"lost","partOfSpeech":"verb","distractors":["found","got","kept","left","changed"]},{"text":"job","partOfSpeech":"noun","distractors":["salary","savings","account","loan","contract"]},{"text":"ran","partOfSpeech":"verb","distractors":["run","runs","running","went","came"]},{"text":"out","partOfSpeech":"adverb","distractors":["up","in","back","down","off"]},{"text":"money","partOfSpeech":"noun","distractors":["time","food","space","hope","energy"]}]},{"id":"mitap_d88_p5","english":"That mistake taught me a real lesson.","constructions":["past-simple-irregular"],"words":[{"text":"That","partOfSpeech":"determiner","distractors":["This","These","Those","Some","Every"]},{"text":"mistake","partOfSpeech":"noun","distractors":["success","decision","payment","habit","plan"]},{"text":"taught","partOfSpeech":"verb","distractors":["gave","cost","brought","made","showed"]},{"text":"me","partOfSpeech":"pronoun","distractors":["him","her","us","them","you"]},{"text":"real","partOfSpeech":"adjective","distractors":["small","easy","quick","cheap","brief"]},{"text":"lesson","partOfSpeech":"noun","distractors":["problem","profit","reward","risk","debt"]}]},{"id":"mitap_d88_p6","english":"Now I think twice before I spend money.","constructions":["present-simple"],"words":[{"text":"Now","partOfSpeech":"adverb","distractors":["Then","Still","Soon","Often","Always"]},{"text":"I","partOfSpeech":"pronoun","distractors":["He","She","We","They","You"]},{"text":"think","partOfSpeech":"verb","distractors":["spend","save","borrow","plan","check"]},{"text":"twice","partOfSpeech":"adverb","distractors":["once","late","fast","well","hard"]},{"text":"before","partOfSpeech":"other","distractors":["after","while","unless","until","although"]},{"text":"spend","partOfSpeech":"verb","distractors":["lose","waste","borrow","invest","earn"]}]}],"vocabulary":[{"word":"savings","partOfSpeech":"noun","example":"I spent all my savings at once."},{"word":"loan","partOfSpeech":"noun","example":"I should not have taken that loan."},{"word":"ran out of","partOfSpeech":"phrasal verb","example":"I lost my job and ran out of money."},{"word":"mistake","partOfSpeech":"noun","example":"That mistake taught me a real lesson."},{"word":"taught","partOfSpeech":"verb","example":"That mistake taught me a real lesson."},{"word":"think twice","partOfSpeech":"phrase","example":"Now I think twice before I spend money."}]};

const GATE = 32;
const VALID_POS = ['verb','noun','pronoun','adjective','adverb','modifier','preposition','syntax','determiner','existential','article','to-be','conjunction','modal','phrasal_particle','other'];
const BANNED_POS = ['numeral','wh-word','auxiliary','phrase','phrasal verb'];

const issues = [];

// 1. prerequisiteLessons
for (const l of draft.prerequisiteLessons) {
  if (l === draft.dayIndex) issues.push({where:'prerequisiteLessons', problem:'contains dayIndex '+l+' itself', severity:'error', fix:'remove '+l});
  if (l > GATE) issues.push({where:'prerequisiteLessons', problem:'lesson '+l+' > gate '+GATE, severity:'error', fix:'remove or replace'});
}

// 2. intro count
if (draft.intro.length !== 3) issues.push({where:'intro', problem:'count='+draft.intro.length+', need 3', severity:'error', fix:'adjust to 3'});

// 3. phrases count
if (draft.phrases.length !== 6) issues.push({where:'phrases', problem:'count='+draft.phrases.length+', need 6', severity:'error', fix:'adjust to 6'});

// 4. vocabulary checks
if (draft.vocabulary.length !== 6) issues.push({where:'vocabulary', problem:'count='+draft.vocabulary.length+', need 6', severity:'error', fix:'adjust to 6'});

const vocabWords = draft.vocabulary.map(v=>v.word.toLowerCase());
const vocabSeen = {};
for (const v of draft.vocabulary) {
  const k = v.word.toLowerCase();
  if (vocabSeen[k]) issues.push({where:'vocabulary['+v.word+']', problem:'duplicate vocab word', severity:'error', fix:'remove duplicate'});
  vocabSeen[k] = true;

  // POS validity
  if (!VALID_POS.includes(v.partOfSpeech)) {
    issues.push({where:'vocabulary['+v.word+']', problem:'partOfSpeech="'+v.partOfSpeech+'" is not in valid POS list', severity:'error', fix:'use valid POS: '+VALID_POS.join(', ')});
  }
  if (BANNED_POS.includes(v.partOfSpeech)) {
    issues.push({where:'vocabulary['+v.word+']', problem:'partOfSpeech="'+v.partOfSpeech+'" is banned', severity:'error', fix:'replace with valid POS'});
  }

  // word form in example
  if (!v.example.toLowerCase().includes(v.word.toLowerCase())) {
    issues.push({where:'vocabulary['+v.word+']', problem:'word not found in example in same form', severity:'error', fix:'fix example or word form'});
  }
}

// 5. Per-phrase checks
const CONSTRUCTION_TO_LESSON = {
  'to-be':1,'pronouns':1,'to-be-negation':2,'to-be-questions':2,'present-simple':3,
  'present-simple-negation':4,'present-simple-questions':5,'wh-questions':6,'to-have':7,
  'prepositions-time':8,'there-is':9,'there-are':9,'modals':10,'past-simple-regular':11,
  'past-simple-irregular':12,'future-simple':13,'comparatives':14,'superlatives':14,
  'possessive-pronouns':15,'phrasal-verbs':16,'present-continuous':17,'imperative':18,
  'prepositions-place':19,'articles':20,'indefinite-pronouns':21,'gerund':22,
  'passive-voice':23,'present-perfect':24,'past-continuous':25,'conditionals':26,
  'reported-speech':27,'reflexive-pronouns':28,'used-to':29,'relative-clauses':30,
  'complex-object':31
};

for (const p of draft.phrases) {
  // constructions gate
  for (const c of p.constructions) {
    const lessonNum = CONSTRUCTION_TO_LESSON[c];
    if (lessonNum && lessonNum > GATE) {
      issues.push({where:p.id+' constructions', problem:'construction "'+c+'" requires lesson '+lessonNum+' > gate '+GATE, severity:'error', fix:'remove construction'});
    }
    if (!lessonNum) {
      issues.push({where:p.id+' constructions', problem:'unknown construction "'+c+'"', severity:'warning', fix:'check construction name'});
    }
  }

  // word coverage
  const phraseClean = p.english.replace(/[.,!?]/g,'').toLowerCase();
  const phraseTokens = phraseClean.split(' ');

  // build covered tokens from words[]
  const coveredTokens = {};
  for (const w of p.words) {
    w.text.toLowerCase().split(' ').forEach(t => {
      coveredTokens[t] = (coveredTokens[t]||0)+1;
    });
  }

  // count phrase tokens
  const phraseCount = {};
  phraseTokens.forEach(t => phraseCount[t]=(phraseCount[t]||0)+1);

  // find uncovered
  const structuralGlue = ['a','an','the','and','or','but','for','with','of'];
  const uncovered = [];
  for (const [tok, cnt] of Object.entries(phraseCount)) {
    const covered = coveredTokens[tok]||0;
    if (covered < cnt && !structuralGlue.includes(tok)) {
      for (let i=0;i<cnt-covered;i++) uncovered.push(tok);
    }
  }
  if (uncovered.length > 0) {
    issues.push({where:p.id+' words[]', problem:'phrase tokens not covered (non-glue): '+uncovered.join(', '), severity:'error', fix:'add word slots for missing tokens or include in multi-word slot'});
  }

  // POS validity per word
  for (const w of p.words) {
    if (!VALID_POS.includes(w.partOfSpeech)) {
      issues.push({where:p.id+'['+w.text+']', problem:'partOfSpeech="'+w.partOfSpeech+'" invalid', severity:'error', fix:'use valid POS'});
    }
    if (BANNED_POS.includes(w.partOfSpeech)) {
      issues.push({where:p.id+'['+w.text+']', problem:'partOfSpeech="'+w.partOfSpeech+'" is banned', severity:'error', fix:'use valid POS'});
    }

    // distractor count
    if (w.distractors.length !== 5) {
      issues.push({where:p.id+'['+w.text+'] distractors', problem:'count='+w.distractors.length+', need 5', severity:'error', fix:'adjust to 5'});
    }

    // distractor = word itself
    const dLower = w.distractors.map(d=>d.toLowerCase());
    if (dLower.includes(w.text.toLowerCase())) {
      issues.push({where:p.id+'['+w.text+'] distractors', problem:'distractor equals the answer word', severity:'error', fix:'replace with different word'});
    }

    // distractor duplicates
    const dSeen = {};
    for (const d of dLower) {
      if (dSeen[d]) issues.push({where:p.id+'['+w.text+'] distractors', problem:'duplicate distractor "'+d+'"', severity:'error', fix:'remove duplicate'});
      dSeen[d]=true;
    }

    // word text in phrase
    if (!p.english.toLowerCase().includes(w.text.toLowerCase())) {
      issues.push({where:p.id+'['+w.text+']', problem:'word text not found in phrase', severity:'error', fix:'fix word text'});
    }
  }

  // specific POS checks
  for (const w of p.words) {
    // 'out' in phrasal verb context
    if (p.id==='mitap_d88_p4' && w.text==='out' && w.partOfSpeech==='adverb') {
      issues.push({where:'mitap_d88_p4[out]', problem:'"out" in phrasal verb "ran out of" tagged as "adverb", should be "phrasal_particle"', severity:'warning', fix:'change partOfSpeech to "phrasal_particle"'});
    }
  }
}

// 6. p2: 'that' missing
const p2 = draft.phrases.find(p=>p.id==='mitap_d88_p2');
// Already checked via coverage — 'that' would be flagged

console.log(JSON.stringify({issues}, null, 2));
