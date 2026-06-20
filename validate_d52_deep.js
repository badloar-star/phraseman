// Deep analysis of word coverage gaps and distractor conflicts
const draft = {"phrases":[{"id":"gavan_d52_p1","english":"The manager said that the budget was confirmed.","words":[{"text":"manager","partOfSpeech":"noun","distractors":["director","colleague","client","assistant","supervisor"]},{"text":"said","partOfSpeech":"verb","distractors":["told","wrote","asked","heard","knew"]},{"text":"budget","partOfSpeech":"noun","distractors":["report","schedule","contract","plan","project"]},{"text":"was","partOfSpeech":"to-be","distractors":["is","are","were","be","been"]},{"text":"confirmed","partOfSpeech":"verb","distractors":["approved","cancelled","delayed","rejected","changed"]}]},{"id":"gavan_d52_p2","english":"She told us that the meeting was moved.","words":[{"text":"told","partOfSpeech":"verb","distractors":["said","wrote","asked","showed","sent"]},{"text":"us","partOfSpeech":"pronoun","distractors":["them","him","her","me","you"]},{"text":"meeting","partOfSpeech":"noun","distractors":["project","deadline","report","conference","training"]},{"text":"moved","partOfSpeech":"verb","distractors":["cancelled","started","confirmed","finished","delayed"]}]},{"id":"gavan_d52_p3","english":"He confirmed that the deadline was next Friday.","words":[{"text":"confirmed","partOfSpeech":"verb","distractors":["said","asked","heard","hoped","forgot"]},{"text":"deadline","partOfSpeech":"noun","distractors":["budget","meeting","report","contract","schedule"]},{"text":"next","partOfSpeech":"adjective","distractors":["last","this","every","first","another"]},{"text":"Friday","partOfSpeech":"noun","distractors":["Monday","Tuesday","Wednesday","Thursday","Saturday"]}]},{"id":"gavan_d52_p4","english":"The director said that the project was approved.","words":[{"text":"director","partOfSpeech":"noun","distractors":["manager","colleague","client","assistant","specialist"]},{"text":"project","partOfSpeech":"noun","distractors":["budget","report","schedule","contract","plan"]},{"text":"approved","partOfSpeech":"verb","distractors":["cancelled","delayed","rejected","changed","started"]}]},{"id":"gavan_d52_p5","english":"They said that the new plan was ready.","words":[{"text":"They","partOfSpeech":"pronoun","distractors":["We","He","She","I","You"]},{"text":"new","partOfSpeech":"adjective","distractors":["old","good","final","main","last"]},{"text":"plan","partOfSpeech":"noun","distractors":["budget","report","project","schedule","contract"]},{"text":"ready","partOfSpeech":"adjective","distractors":["late","busy","early","wrong","difficult"]}]},{"id":"gavan_d52_p6","english":"The boss told me that the decision was final.","words":[{"text":"boss","partOfSpeech":"noun","distractors":["colleague","client","specialist","assistant","partner"]},{"text":"told","partOfSpeech":"verb","distractors":["said","wrote","asked","showed","called"]},{"text":"me","partOfSpeech":"pronoun","distractors":["him","her","us","them","you"]},{"text":"decision","partOfSpeech":"noun","distractors":["budget","meeting","report","project","deadline"]},{"text":"final","partOfSpeech":"adjective","distractors":["late","new","wrong","early","difficult"]}]}],"vocabulary":[{"word":"confirmed"},{"word":"approved"},{"word":"decision"},{"word":"final"},{"word":"moved"},{"word":"deadline"}]};

const issues = [];

// ===== A: DISTRACTOR COUNT - p4 only has 3 words (not a rule breach per se, but check) =====
// Rule says 5 distractors per word - p4 words have 5 each. Check:
for(const ph of draft.phrases){
  for(const w of ph.words){
    if(w.distractors.length!==5){
      console.log('DISTRACTOR COUNT FAIL:', ph.id, w.text, w.distractors.length);
      issues.push({where:ph.id+'/'+w.text, problem:'Need exactly 5 distractors, got '+w.distractors.length, fix:'Adjust to 5 distractors', severity:'error'});
    }
  }
}
console.log('A: distractor count OK for all words');

// ===== B: WORD COVERAGE - p2,p3,p4,p5,p6 missing 'was'; p4,p5 missing 'said' =====
// The rule says "слово english-фразы не покрыто в words[]"
// 'was' appears in p2,p3,p4,p5,p6 but is only tagged in p1
// 'said' appears in p4,p5 but is tagged in p1 only
// 'she' in p2, 'he' in p3, 'they' in p5 - subject pronouns not tagged
// Question: is covering 'was' in every phrase required, or is it OK to not tag every word?
// The rule is: every non-stopword in the english phrase must be covered in words[]
// Let's define the test clearly:

const strictStopWords = new Set(['the','that','a','an']);
// Everything else in the phrase is a content word that should be tagged

for(const ph of draft.phrases){
  const tokens = ph.english.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/)
    .filter(t=>t.length>0 && !strictStopWords.has(t));
  const covered = ph.words.map(w=>w.text.toLowerCase());
  const missing = tokens.filter(t=>!covered.includes(t));
  if(missing.length>0){
    console.log('\nUNCOVERED in '+ph.id+':');
    console.log('  Phrase:', ph.english);
    console.log('  Missing tokens:', missing);
    console.log('  Covered:', covered);
    for(const m of missing){
      issues.push({where:ph.id, problem:'Word "'+m+'" appears in phrase but has no entry in words[]', fix:'Add word "'+m+'" to words[] with appropriate POS and 5 distractors', severity:'error'});
    }
  }
}

// ===== C: CROSS-PHRASE DISTRACTOR CONFLICTS - 'confirmed' appears as distractor in p2 =====
// p2/moved distractors: ['cancelled','started','confirmed','finished','delayed']
// 'confirmed' is a vocabulary word and a key word in p3 (confirmed) and p1 (confirmed)
// Is 'confirmed' a distractor for 'moved' in p2? Yes. This means:
// If a user is doing p2 and sees 'confirmed' as an option for 'moved', that's fine - they're different words
// But: 'confirmed' as distractor for 'moved' in p2 could be confusing since 'confirmed' appears in the phrase p2's context
// However the strict rule is: distractors must not match another TAGGED WORD in the same phrase
// In p2, 'confirmed' is NOT a tagged word, so this is technically OK per the stated rule
// Let's check the exact rule: "дубль/совпадение дистрактора" - this means distractors within the same word must not duplicate
// Let's check p2/moved: ['cancelled','started','confirmed','finished','delayed'] - no dupes, doesn't match 'moved' itself -> OK

// ===== D: POS CHECK - 'Friday' as 'noun' =====
// 'next Friday' - Friday is a proper noun. Tagging as 'noun' is acceptable.
// 'next' as 'adjective' - in "next Friday", 'next' functions as an adjective/determiner.
// 'determiner' might be more precise but 'adjective' is also in valid list and commonly accepted. OK.

// ===== E: CONSTRUCTION 'past-simple-irregular' for p2 =====
// p2: 'She told us that the meeting was moved.'
// Constructions: ['reported-speech','past-simple-irregular']
// 'told' is irregular past of 'tell' -> past-simple-irregular: OK
// 'moved' is regular -> but the construction tag might refer to 'told'
// p3: 'He confirmed...' -> constructions: ['reported-speech','past-simple-regular']
// 'confirmed' is regular -> past-simple-regular: OK

// ===== F: CONSTRUCTION 'past-simple-irregular' for p5 =====
// p5: 'They said that the new plan was ready.'
// constructions: ['reported-speech','past-simple-irregular']
// 'said' is irregular -> OK

// ===== G: CONSTRUCTION 'past-simple-irregular' for p6 =====
// p6: 'The boss told me that the decision was final.'
// constructions: ['reported-speech','past-simple-irregular']
// 'told' is irregular -> OK

// ===== H: CONSTRUCTION 'passive-voice' for p4 =====
// p4: 'The director said that the project was approved.'
// constructions: ['reported-speech','passive-voice']
// passive-voice = lesson 23 <= gate 32: OK
// But also 'said' is irregular past -> should include 'past-simple-irregular'?
// Not required by rules - constructions are about what grammar is being TAUGHT/USED

// ===== I: p2 missing 'was' and 'she' =====
// In p2: 'She told us that the meeting was moved.'
// 'she' = subject pronoun (lesson 1: pronouns); 'was' = to-be (lesson 1)
// If the rule strictly requires every non-article/non-'that' word to be in words[], these are missing

// ===== J: Check distractor lists for cross-word conflicts within same phrase =====
for(const ph of draft.phrases){
  const taggedTexts = ph.words.map(w=>w.text.toLowerCase());
  for(const w of ph.words){
    for(const d of w.distractors){
      const dl = d.toLowerCase();
      if(dl !== w.text.toLowerCase() && taggedTexts.includes(dl)){
        console.log('\nCROSS-DISTRACTOR CONFLICT in '+ph.id+':');
        console.log('  Word "'+w.text+'" has distractor "'+d+'" which is another tagged word in same phrase');
        issues.push({where:ph.id+'/'+w.text, problem:'Distractor "'+d+'" matches another tagged word "'+d+'" in the same phrase', fix:'Replace "'+d+'" with a word that does not appear in this phrase\'s words[]', severity:'error'});
      }
    }
  }
}

// ===== K: Specific check: p5 'new' distractors include 'final' =====
// p5/new distractors: ['old','good','final','main','last']
// 'final' appears in p6 as a tagged word, but not in p5 -> OK (no rule about cross-phrase)
// But wait - does 'final' appear as a tagged word IN p5? No, it doesn't. So OK.

// ===== L: p4 has only 3 words - check if this is intentional =====
// Rule: no specification on minimum/maximum words per phrase
// Only rule on distractors: 5 per word
// p4 has 3 words each with 5 distractors -> valid per rules
// BUT: 'said' and 'was' are uncovered in p4

console.log('\n\n=== FINAL ISSUES FOUND ===');
console.log(JSON.stringify(issues,null,2));
console.log('\nTotal issues:', issues.length);
