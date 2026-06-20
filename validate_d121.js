var VALID_POS = ['verb','noun','pronoun','adjective','adverb','modifier','preposition','syntax','determiner','existential','article','to-be','conjunction','modal','phrasal_particle','other'];
var issues = [];

var phrases = [
  {id:'gavan_d121_p1', english:'I try to eat more vegetables.', words:[
    {text:'I',pos:'pronoun',dist:['We','She','They','He','You']},
    {text:'try',pos:'verb',dist:['want','need','like','have','know']},
    {text:'to',pos:'other',dist:['for','of','in','with','on']},
    {text:'eat',pos:'verb',dist:['drink','buy','cook','make','take']},
    {text:'more',pos:'determiner',dist:['less','some','few','many','much']},
    {text:'vegetables',pos:'noun',dist:['fruit','meat','sugar','bread','water']}
  ]},
  {id:'gavan_d121_p2', english:'I drink less sugar in my tea.', words:[
    {text:'I',pos:'pronoun',dist:['We','She','He','They','You']},
    {text:'drink',pos:'verb',dist:['eat','cook','buy','make','need']},
    {text:'less',pos:'determiner',dist:['more','much','few','many','some']},
    {text:'sugar',pos:'noun',dist:['salt','milk','coffee','bread','fruit']},
    {text:'in',pos:'preposition',dist:['on','with','to','at','for']},
    {text:'my',pos:'pronoun',dist:['his','her','our','your','their']}
  ]},
  {id:'gavan_d121_p3', english:'Vegetables are better for your health.', words:[
    {text:'Vegetables',pos:'noun',dist:['Fruit','Meat','Sugar','Bread','Salt']},
    {text:'are',pos:'to-be',dist:['is','was','were','be','been']},
    {text:'better',pos:'adjective',dist:['worse','good','great','more','less']},
    {text:'for',pos:'preposition',dist:['to','in','with','on','at']},
    {text:'your',pos:'pronoun',dist:['my','his','her','our','their']},
    {text:'health',pos:'noun',dist:['body','life','mind','diet','heart']}
  ]},
  {id:'gavan_d121_p4', english:'I eat fruit every morning for breakfast.', words:[
    {text:'I',pos:'pronoun',dist:['We','She','He','They','You']},
    {text:'eat',pos:'verb',dist:['drink','cook','buy','make','like']},
    {text:'fruit',pos:'noun',dist:['meat','bread','sugar','salt','milk']},
    {text:'every',pos:'determiner',dist:['some','any','each','many','few']},
    {text:'morning',pos:'noun',dist:['evening','night','day','week','lunch']},
    {text:'breakfast',pos:'noun',dist:['dinner','lunch','snack','meal','supper']}
  ]},
  {id:'gavan_d121_p5', english:'Fast food is worse than home cooking.', words:[
    {text:'Fast',pos:'adjective',dist:['Home','Good','Fresh','Hot','Cold']},
    {text:'food',pos:'noun',dist:['drink','meal','diet','sugar','snack']},
    {text:'is',pos:'to-be',dist:['are','was','were','be','been']},
    {text:'worse',pos:'adjective',dist:['better','bad','less','more','harder']},
    {text:'than',pos:'conjunction',dist:['then','that','when','after','before']},
    {text:'home',pos:'noun',dist:['fast','good','fresh','daily','real']}
  ]},
  {id:'gavan_d121_p6', english:'I prefer water to sweet drinks.', words:[
    {text:'I',pos:'pronoun',dist:['We','She','He','They','You']},
    {text:'prefer',pos:'verb',dist:['like','want','need','drink','eat']},
    {text:'water',pos:'noun',dist:['juice','milk','tea','coffee','sugar']},
    {text:'to',pos:'other',dist:['than','over','for','with','above']},
    {text:'sweet',pos:'adjective',dist:['salty','hot','cold','fresh','healthy']},
    {text:'drinks',pos:'noun',dist:['food','snacks','meals','juice','water']}
  ]}
];

var vocab = [
  {word:'vegetables',pos:'noun',example:'I try to eat more vegetables.'},
  {word:'sugar',pos:'noun',example:'I drink less sugar in my tea.'},
  {word:'health',pos:'noun',example:'Vegetables are better for your health.'},
  {word:'breakfast',pos:'noun',example:'I eat fruit every morning for breakfast.'},
  {word:'worse',pos:'adjective',example:'Fast food is worse than home cooking.'},
  {word:'prefer',pos:'verb',example:'I prefer water to sweet drinks.'}
];

var intro_count = 3;

// Check counts
console.log('intro='+intro_count+' phrases='+phrases.length+' vocab='+vocab.length);

// Per phrase
for (var pi=0; pi<phrases.length; pi++) {
  var phrase = phrases[pi];
  var rawTokens = phrase.english.replace(/[.,!?]$/,'').split(' ');
  console.log(phrase.id + ': tokens='+rawTokens.length+' words='+phrase.words.length+' tokens='+JSON.stringify(rawTokens));
  if (rawTokens.length !== phrase.words.length) {
    issues.push(phrase.id+': token count '+rawTokens.length+' vs words count '+phrase.words.length);
  }
  for (var wi=0; wi<phrase.words.length; wi++) {
    var w = phrase.words[wi];
    if (w.dist.length !== 5) {
      issues.push(phrase.id+' word['+wi+'] '+w.text+': expected 5 distractors, got '+w.dist.length);
    }
    if (VALID_POS.indexOf(w.pos) === -1) {
      issues.push(phrase.id+' word['+wi+'] '+w.text+': invalid POS "'+w.pos+'"');
    }
    if (w.text.indexOf(' ') !== -1) {
      issues.push(phrase.id+' word['+wi+']: text has space "'+w.text+'"');
    }
    var clean = phrase.english.replace(/[.,!?]/g,'').split(' ');
    var cleanLower = clean.map(function(t){return t.toLowerCase();});
    if (cleanLower.indexOf(w.text.toLowerCase()) === -1) {
      issues.push(phrase.id+' word['+wi+'] "'+w.text+'": not found in phrase tokens '+JSON.stringify(cleanLower));
    }
  }
}

// Vocab
for (var vi=0; vi<vocab.length; vi++) {
  var v = vocab[vi];
  if (VALID_POS.indexOf(v.pos) === -1) {
    issues.push('vocab['+vi+'] '+v.word+': invalid POS "'+v.pos+'"');
  }
  var exTokens = v.example.replace(/[.,!?]/g,'').split(' ').map(function(t){return t.toLowerCase();});
  if (exTokens.indexOf(v.word.toLowerCase()) === -1) {
    issues.push('vocab['+vi+'] '+v.word+': not found as exact form in example tokens '+JSON.stringify(exTokens));
  }
  var inPhrase = false;
  for (var pi2=0; pi2<phrases.length; pi2++) {
    var pt = phrases[pi2].english.replace(/[.,!?]/g,'').split(' ').map(function(t){return t.toLowerCase();});
    if (pt.indexOf(v.word.toLowerCase()) !== -1) {
      inPhrase = true;
      break;
    }
  }
  if (!inPhrase) {
    issues.push('vocab['+vi+'] '+v.word+': not found as exact form in any phrase');
  }
}

// Special checks
// p6: "drinks" distractor "water" collides with correct answer "water" in same phrase
var p6 = phrases[5];
for (var wi=0; wi<p6.words.length; wi++) {
  if (p6.words[wi].text === 'drinks') {
    if (p6.words[wi].dist.indexOf('water') !== -1) {
      issues.push('gavan_d121_p6 word "drinks" has distractor "water" which is also the correct answer for another word in the same phrase');
    }
  }
}

// p5: "home" in "home cooking" tagged as noun — noun adjunct should be modifier
var p5 = phrases[4];
for (var wi=0; wi<p5.words.length; wi++) {
  if (p5.words[wi].text.toLowerCase() === 'home' && p5.words[wi].pos === 'noun') {
    issues.push('WARNING gavan_d121_p5 word "home" tagged "noun" but in "home cooking" it is a noun adjunct modifying "cooking" — consider "modifier"');
  }
}

// p4: token count check (7 tokens: I eat fruit every morning for breakfast)
var p4tokens = 'I eat fruit every morning for breakfast'.split(' ');
console.log('p4 manual token count: '+p4tokens.length+' words count: '+phrases[3].words.length);

console.log('\n=== ISSUES ('+issues.length+') ===');
if (issues.length === 0) {
  console.log('NONE');
} else {
  for (var i=0; i<issues.length; i++) {
    console.log('- '+issues[i]);
  }
}
