
// Day 19 distractor and rule/why analysis

var rules = [
  {id:'p1', rule:'I watch — говоришь про себя. Для он/она добавляешь -s: she watches.', why:'Watch значит «смотреть». TV — телевизор. In the evening — вечером.'},
  {id:'p2', rule:'Когда говоришь про неё — reads (с -s). After dinner — после ужина.', why:'Read — читать. Book — книга. After dinner — после ужина.'},
  {id:'p3', rule:'At home — дома (где ты). In the evening — вечером (когда).', why:'Rest — отдыхать. At home — дома. Два места в одном предложении — нормально.'},
  {id:'p4', rule:'On the sofa — на диване. On — это про поверхность: лежишь или сидишь на чём-то.', why:'Sit — сидеть. Sofa — диван. Together — вместе.'},
  {id:'p5', rule:'Can — могу. После can всегда базовая форма глагола без изменений: can watch, can read.', why:'Film — фильм. Tonight — сегодня вечером. Can watch — могу посмотреть.'},
  {id:'p6', rule:'Cannot — не могу/не может. Это одно слово. После него — базовая форма глагола.', why:'Sleep — спать. Early — рано. Tonight — сегодня вечером.'},
];

console.log('=== WORD COUNTS (rule/why) ===');
rules.forEach(function(r) {
  var rW = r.rule.split(/\s+/).filter(Boolean).length;
  var wW = r.why.split(/\s+/).filter(Boolean).length;
  console.log(r.id + ' rule=' + rW + (rW>24?' OVER24!':'') + ' | why=' + wW + (wW>24?' OVER24!':''));
});

console.log('');
console.log('=== KEY DISTRACTOR ISSUES ===');

// p1 slot 'evening': morning/afternoon are valid substitutions
console.log('p1|in the evening|morning => "I watch TV in the morning." VALID => BRAK');
console.log('p1|in the evening|afternoon => "I watch TV in the afternoon." VALID => BRAK');
console.log('p1|the (article)|an => "I watch TV in an evening." - "in an evening" is natural English meaning "on a given evening" => BRAK');

// p2 slot 'a': the/this/my all produce valid sentences
console.log('p2|a|the => "She reads the book after dinner." VALID => BRAK');
console.log('p2|a|this => "She reads this book after dinner." VALID => BRAK');
console.log('p2|a|my => "She reads my book after dinner." VALID => BRAK');

// p2 slot 'after': before/during both produce valid sentences
console.log('p2|after|before => "She reads a book before dinner." VALID => BRAK');
console.log('p2|after|during => "She reads a book during dinner." VALID => BRAK');

// p3 slot 'rest': work/read/sleep all produce valid "at home in the evening" sentences
console.log('p3|rest|work => "I work at home in the evening." VALID => BRAK');
console.log('p3|rest|read => "I read at home in the evening." VALID => BRAK');
console.log('p3|rest|sleep => "I sleep at home in the evening." VALID => BRAK');

// p4 slot 'sofa': chair/floor/bed all valid with "sit on the ___"
console.log('p4|sofa|chair => "We sit on the chair together." VALID => BRAK');
console.log('p4|sofa|floor => "We sit on the floor together." VALID => BRAK');
console.log('p4|sofa|bed => "We sit on the bed together." VALID => BRAK');

// p4 slot 'together': alone is valid
console.log('p4|together|alone => "We sit on the sofa alone." VALID => BRAK');

// p5 slot 'watch': distractors are inflected -s forms (reads/sleeps/cooks/walks/rests)
// After 'can', base form required - these distractors are grammatically incompatible in a different way
// They serve as lures but are WRONG CLASS: inflected forms vs base form
console.log('p5|watch|reads,sleeps,cooks,walks,rests => WRONG CLASS: inflected -s forms after "can". Should be base: read,sleep,cook,walk,rest => BRAK');

// p5 slot 'tonight': tomorrow is valid
console.log('p5|tonight|tomorrow => "I can watch a film tomorrow." VALID => BRAK');

// p6 slot 'cannot': ALL modals produce valid sentences
console.log('p6|cannot|must => "She must sleep early tonight." VALID => BRAK');
console.log('p6|cannot|should => "She should sleep early tonight." VALID => BRAK');
console.log('p6|cannot|will => "She will sleep early tonight." VALID => BRAK');
console.log('p6|cannot|may => "She may sleep early tonight." VALID => BRAK');
console.log('p6|cannot|might => "She might sleep early tonight." VALID => BRAK');

// p6 slot 'sleep': read/cook/rest produce valid sentences
console.log('p6|sleep|read => "She cannot read early tonight." VALID => BRAK');
console.log('p6|sleep|cook => "She cannot cook early tonight." VALID => BRAK');
console.log('p6|sleep|rest => "She cannot rest early tonight." VALID => BRAK');

// p6 slot 'early': late is valid
console.log('p6|early|late => "She cannot sleep late tonight." VALID => BRAK');

console.log('');
console.log('=== OTHER CHECKS ===');
// Emoji check in text fields (scanning known text)
console.log('No emojis detected in rules/why/title text (none present).');

// Grammar term check
// 'partOfSpeech' in words are internal codes, not shown to user - OK
// Check intro tips for grammar terms visible to user
console.log('Intro tips: no grammar jargon terms visible in body text.');

// commonMistake p6: "cannot — стандарт" - note about "can not (два слова)" distinction
// Actually this is a real subtle point at A1 - mentioning it may confuse more than help
// "не пиши can not вместо cannot — это разные оттенки, а cannot — стандарт"
// "разные оттенки" is vague and the distinction is nuanced (not really A1 level)
console.log('p6 commonMistake: "разные оттенки" — can not vs cannot distinction is too subtle for A1. Could confuse.');

// vocabulary section: 'reads' as a vocabulary entry (conjugated form, not base form)
// Convention: vocabulary typically lists base form
console.log('vocabulary: "reads" listed as vocabulary word (conjugated). Convention is to list base form "read".');

// p3 why: "Два места в одном предложении — нормально" — what does this mean?
// The sentence has "at home" and "in the evening" - two adverbials, not two "places"
// "Два места" is misleading - "in the evening" is time, not place
console.log('p3 why: "Два места в одном предложении" — "in the evening" is TIME not place. Misleading wording.');

// p5 'watch' slot: after 'can', distractors are inflected forms (reads/sleeps etc.)
// This is confusing because the rule being taught is "can + base form"
// A student who knows the rule will immediately spot these as wrong, but for the wrong reason
// (they are recognizable as wrong not because of meaning, but because of the -s)
// This actually could HELP teach the rule by showing the contrast - but it's wrong class
console.log('p5 watch distractors: inflected forms (reads/sleeps) serve as class-error traps, which could be intentional for teaching "can+base", but they are wrong distractor CLASS per standard rules.');
