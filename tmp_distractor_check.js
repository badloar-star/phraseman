var issues = [];

// P1: "I am working on it right now."
// [working] -> waiting: "I am waiting on it right now." = natural, "waiting on" = waiting for
issues.push({phrase:'p1', word:'working', distractor:'waiting', sub:'I am waiting on it right now.', note:'VALID: "waiting on it" is natural English for waiting for something'});
// [on] -> at: "I am working at it right now." = "working at it" = trying hard, natural phrase
issues.push({phrase:'p1', word:'on', distractor:'at', sub:'I am working at it right now.', note:'VALID: "working at it" = making effort, natural English'});
// [it] -> them: "I am working on them right now." = valid
issues.push({phrase:'p1', word:'it', distractor:'them', sub:'I am working on them right now.', note:'VALID: grammatically and semantically correct'});

// P2: "She is reading the report at the moment."
// [reading] -> writing: "She is writing the report at the moment." = PERFECTLY valid
issues.push({phrase:'p2', word:'reading', distractor:'writing', sub:'She is writing the report at the moment.', note:'VALID: completely natural - she could be writing the report. SERIOUS FLAW.'});
// [report] -> letter: "She is reading the letter at the moment." = valid
issues.push({phrase:'p2', word:'report', distractor:'letter', sub:'She is reading the letter at the moment.', note:'VALID: natural English'});
// [report] -> invoice: "She is reading the invoice at the moment." = valid business English
issues.push({phrase:'p2', word:'report', distractor:'invoice', sub:'She is reading the invoice at the moment.', note:'VALID: natural business English'});
// [the] -> a: "She is reading a report at the moment." = valid
issues.push({phrase:'p2', word:'the', distractor:'a', sub:'She is reading a report at the moment.', note:'VALID: grammatically correct, natural'});

// P3: "I can't talk right now, I am in a meeting."
// [meeting] -> class: "I am in a class." = valid and natural
issues.push({phrase:'p3', word:'meeting', distractor:'class', sub:'I am in a class.', note:'VALID: "in a class" is common real-life phrase'});

// P4: "We are waiting for your answer."
// [for] -> on: "We are waiting on your answer." = common in business English
issues.push({phrase:'p4', word:'for', distractor:'on', sub:'We are waiting on your answer.', note:'VALID: "waiting on your answer" is common business phrase (especially US)'});
// [answer] -> document: "We are waiting for your document." = valid
issues.push({phrase:'p4', word:'answer', distractor:'document', sub:'We are waiting for your document.', note:'VALID: natural business phrase'});
// [answer] -> number: "We are waiting for your number." = valid
issues.push({phrase:'p4', word:'answer', distractor:'number', sub:'We are waiting for your number.', note:'VALID: natural - waiting for a phone number/code'});

// P5: "He is sending the file to the client."
// [client] -> manager: "He is sending the file to the manager." = valid
issues.push({phrase:'p5', word:'client', distractor:'manager', sub:'He is sending the file to the manager.', note:'VALID: completely natural office language'});
// [file] -> letter: "He is sending the letter to the client." = valid
issues.push({phrase:'p5', word:'file', distractor:'letter', sub:'He is sending the letter to the client.', note:'VALID: natural business phrase'});
// [the] -> a: "He is sending a file to the client." = valid
issues.push({phrase:'p5', word:'the', distractor:'a', sub:'He is sending a file to the client.', note:'VALID: equally correct'});

// P6: "Can you call me back? I am finishing a task."
// [back] -> again: "Can you call me again?" = valid and natural
issues.push({phrase:'p6', word:'back', distractor:'again', sub:'Can you call me again?', note:'VALID: "call me again" is natural English. Bad distractor.'});
// [back] -> later: "Can you call me later?" = very natural
issues.push({phrase:'p6', word:'back', distractor:'later', sub:'Can you call me later?', note:'VALID: "call me later" is very common. Serious distractor flaw.'});
// [task] -> game: "I am finishing a game." = valid
issues.push({phrase:'p6', word:'task', distractor:'game', sub:'I am finishing a game.', note:'VALID: natural English, though odd in office context'});
// [task] -> film: "I am finishing a film." = valid
issues.push({phrase:'p6', word:'task', distractor:'film', sub:'I am finishing a film.', note:'VALID: natural English - watching/finishing a film'});

console.log('DISTRACTOR ISSUES FOUND: ' + issues.length);
issues.forEach(function(i, idx) {
  console.log((idx+1) + '. [' + i.phrase + '] word=' + i.word + ' distractor=' + i.distractor);
  console.log('   Sub: ' + i.sub);
  console.log('   ' + i.note);
});
