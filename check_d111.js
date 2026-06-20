const draft = {
  phrases: [
    {
      id: "impuls_d111_p1",
      english: "My ideal home has a garden.",
      explanation: {
        rule: {
          ru: "has — это «имеет». Так говорят, когда в доме что-то есть.",
          uk: "has — це «має». Так кажуть, коли в будинку щось є.",
          es: "has significa «tiene». Se usa para decir lo que hay en la casa."
        },
        why: {
          ru: "has нужна, потому что говорим про дом — не про себя.",
          uk: "has потрібна, бо говоримо про будинок, а не про себе.",
          es: "Usamos has porque hablamos de la casa, no de nosotros mismos."
        }
      },
      words: [
        { text: "My", partOfSpeech: "determiner", distractors: ["Your","His","Her","Our","Their"] },
        { text: "ideal", partOfSpeech: "adjective", distractors: ["old","small","empty","dark","noisy"] },
        { text: "home", partOfSpeech: "noun", distractors: ["room","street","city","office","school"] },
        { text: "has", partOfSpeech: "verb", distractors: ["have","is","are","was","wants"] },
        { text: "a", partOfSpeech: "article", distractors: ["the","an","this","that","no"] },
        { text: "garden", partOfSpeech: "noun", distractors: ["garage","balcony","window","roof","fence"] }
      ]
    },
    {
      id: "impuls_d111_p2",
      english: "I have a very big kitchen.",
      explanation: {
        rule: {
          ru: "I have — у меня есть. Так описываешь, что есть в твоём доме.",
          uk: "I have — у мене є. Так описуєш, що є у твоєму будинку.",
          es: "I have — tengo. Así describes lo que hay en tu casa."
        },
        why: {
          ru: "Говорим I have, потому что это твоё — твоя кухня.",
          uk: "Кажемо I have, бо це твоє — твоя кухня.",
          es: "Decimos I have porque es tuya, tu cocina."
        }
      },
      words: [
        { text: "I", partOfSpeech: "pronoun", distractors: ["We","You","He","She","They"] },
        { text: "have", partOfSpeech: "verb", distractors: ["has","am","is","want","need"] },
        { text: "a", partOfSpeech: "article", distractors: ["the","an","this","that","my"] },
        { text: "very", partOfSpeech: "adverb", distractors: ["quite","really","so","too","just"] },
        { text: "big", partOfSpeech: "adjective", distractors: ["small","clean","dark","old","bright"] },
        { text: "kitchen", partOfSpeech: "noun", distractors: ["bedroom","bathroom","hallway","balcony","garden"] }
      ]
    },
    {
      id: "impuls_d111_p3",
      english: "The house has two large bedrooms.",
      explanation: {
        rule: {
          ru: "has — говорим про конкретный дом. Two large — два больших.",
          uk: "has — кажемо про конкретний будинок. Two large — два великих.",
          es: "has — hablamos de una casa específica. Two large — dos grandes."
        },
        why: {
          ru: "The house — конкретный дом, поэтому has, а не have.",
          uk: "The house — конкретний будинок, тому has, а не have.",
          es: "The house es la casa específica, por eso has y no have."
        }
      },
      words: [
        { text: "The", partOfSpeech: "article", distractors: ["A","An","My","This","That"] },
        { text: "house", partOfSpeech: "noun", distractors: ["flat","room","garden","street","office"] },
        { text: "has", partOfSpeech: "verb", distractors: ["have","is","are","needs","wants"] },
        { text: "two", partOfSpeech: "determiner", distractors: ["three","four","some","many","few"] },
        { text: "large", partOfSpeech: "adjective", distractors: ["small","dark","cold","empty","cheap"] },
        { text: "bedrooms", partOfSpeech: "noun", distractors: ["kitchens","bathrooms","balconies","windows","garages"] }
      ]
    },
    {
      id: "impuls_d111_p4",
      english: "We need a quiet neighbourhood.",
      explanation: {
        rule: {
          ru: "need — нужно. We need говорит про то, что важно для жизни.",
          uk: "need — потрібно. We need каже про те, що важливо для життя.",
          es: "need — necesitamos. We need habla de lo que es importante para vivir."
        },
        why: {
          ru: "We need, а не We needs — с We глагол без -s.",
          uk: "We need, а не We needs — з We дієслово без -s.",
          es: "We need, no We needs — con We el verbo no lleva -s."
        }
      },
      words: [
        { text: "We", partOfSpeech: "pronoun", distractors: ["I","You","He","She","They"] },
        { text: "need", partOfSpeech: "verb", distractors: ["needs","want","have","like","find"] },
        { text: "a", partOfSpeech: "article", distractors: ["the","an","this","that","no"] },
        { text: "quiet", partOfSpeech: "adjective", distractors: ["noisy","busy","dark","cold","new"] },
        { text: "neighbourhood", partOfSpeech: "noun", distractors: ["garden","kitchen","bedroom","balcony","street"] }
      ]
    },
    {
      id: "impuls_d111_p5",
      english: "I want a bright living room.",
      explanation: {
        rule: {
          ru: "I want — я хочу. Говоришь о своей мечте или желании.",
          uk: "I want — я хочу. Кажеш про свою мрію або бажання.",
          es: "I want — quiero. Hablas de tu sueño o deseo."
        },
        why: {
          ru: "bright перед living room — так описывают какая комната.",
          uk: "bright перед living room — так описують яка кімната.",
          es: "bright antes de living room — así describes cómo es la sala."
        }
      },
      words: [
        { text: "I", partOfSpeech: "pronoun", distractors: ["We","You","He","She","They"] },
        { text: "want", partOfSpeech: "verb", distractors: ["have","need","like","find","see"] },
        { text: "a", partOfSpeech: "article", distractors: ["the","an","this","that","my"] },
        { text: "bright", partOfSpeech: "adjective", distractors: ["dark","cold","old","empty","small"] },
        { text: "living", partOfSpeech: "adjective", distractors: ["dining","reading","sleeping","working","playing"] },
        { text: "room", partOfSpeech: "noun", distractors: ["kitchen","garden","bedroom","bathroom","balcony"] }
      ]
    },
    {
      id: "impuls_d111_p6",
      english: "My home has a comfortable bathroom.",
      explanation: {
        rule: {
          ru: "My home has — в моём доме есть. Говоришь о своём жилье.",
          uk: "My home has — у моєму будинку є. Кажеш про своє житло.",
          es: "My home has — mi casa tiene. Hablas de tu propio hogar."
        },
        why: {
          ru: "comfortable перед bathroom — какая именно ванная.",
          uk: "comfortable перед bathroom — яка саме ванна.",
          es: "comfortable antes de bathroom — así dices cómo es el baño."
        }
      },
      words: [
        { text: "My", partOfSpeech: "determiner", distractors: ["Your","His","Her","Our","Their"] },
        { text: "home", partOfSpeech: "noun", distractors: ["room","street","city","office","school"] },
        { text: "has", partOfSpeech: "verb", distractors: ["have","is","are","needs","wants"] },
        { text: "a", partOfSpeech: "article", distractors: ["the","an","this","that","no"] },
        { text: "comfortable", partOfSpeech: "adjective", distractors: ["small","dark","old","noisy","cold"] },
        { text: "bathroom", partOfSpeech: "noun", distractors: ["bedroom","kitchen","garden","balcony","hallway"] }
      ]
    }
  ]
};

console.log("=== CHECK 1: Grammar terms in rule/why ===");
const grammarTerms = ["noun","verb","adjective","adverb","pronoun","article","determiner","preposition","conjunction","participle","infinitive","gerund","clause","subject","predicate","object","plural","singular","tense","passive","active","conditional"];

draft.phrases.forEach(p => {
  ["ru","uk","es"].forEach(lang => {
    const rule = (p.explanation.rule[lang] || "").toLowerCase();
    const why = (p.explanation.why[lang] || "").toLowerCase();
    grammarTerms.forEach(term => {
      if (rule.includes(term)) console.log("GRAMTERM_RULE", p.id, lang, term, "->", p.explanation.rule[lang]);
      if (why.includes(term)) console.log("GRAMTERM_WHY", p.id, lang, term, "->", p.explanation.why[lang]);
    });

    const ruleWords = (p.explanation.rule[lang] || "").trim().split(/\s+/).length;
    const whyWords = (p.explanation.why[lang] || "").trim().split(/\s+/).length;
    if (ruleWords > 24) console.log("TOO_LONG_RULE", p.id, lang, ruleWords + " words");
    if (whyWords > 24) console.log("TOO_LONG_WHY", p.id, lang, whyWords + " words");
  });
});

console.log("\n=== CHECK 2: Emoji ===");
const allText = JSON.stringify(draft);
const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F9FF}]/gu;
const foundEmoji = allText.match(emojiRegex);
if (foundEmoji) console.log("EMOJI found:", foundEmoji);
else console.log("No emoji found");

console.log("\n=== CHECK 3: Multiword in words[].text ===");
draft.phrases.forEach(p => {
  p.words.forEach(w => {
    if (w.text.includes(" ")) console.log("MULTIWORD", p.id, JSON.stringify(w.text));
  });
});
console.log("(done)");

console.log("\n=== CHECK 4: BRAK distractors ===");
// For each phrase, check if any distractor at a slot produces a grammatically/semantically valid sentence
// Key patterns to check manually:
// p1: "My ideal home has a garden."
//   slot[4] article 'a' -> distractors include 'an' -- 'My ideal home has an garden' -- WRONG (an before consonant g = wrong)
//   slot[4] 'no' -> 'My ideal home has no garden' -- semantically valid! opposite meaning but grammatically correct
// p2: "I have a very big kitchen."
//   slot[1] 'have' -> distractors 'has','am','is','want','need'
//   'He have a very big kitchen' - no, 'He' not in sentence. Actually we replace slot by position
//   tokens: I(0) have(1) a(2) very(3) big(4) kitchen(5)
//   slot[3] 'very' -> distractors 'quite','really','so','too','just'
//   'I have a quite big kitchen' - VALID! 'quite' works as adverb before adjective
//   'I have a really big kitchen' - VALID!
//   'I have a so big kitchen' - WRONG (so big = informal/nonstandard)
//   'I have a too big kitchen' - grammatically marginal ('too big' usually needs 'for X')
//   'I have a just big kitchen' - WRONG
// p3: "The house has two large bedrooms."
//   tokens: The(0) house(1) has(2) two(3) large(4) bedrooms(5)
//   slot[3] 'two' -> distractors 'three','four','some','many','few'
//   'The house has three large bedrooms' - VALID (different number but grammatically fine) -- BRAK!
//   'The house has four large bedrooms' - VALID -- BRAK!
//   'The house has some large bedrooms' - VALID -- BRAK!
//   'The house has many large bedrooms' - VALID -- BRAK!
//   'The house has few large bedrooms' - VALID -- BRAK!
// p4: "We need a quiet neighbourhood."
//   tokens: We(0) need(1) a(2) quiet(3) neighbourhood(4)
//   slot[1] 'need' -> distractors 'needs','want','have','like','find'
//   'We want a quiet neighbourhood' - VALID -- BRAK!
//   'We have a quiet neighbourhood' - VALID -- BRAK!
//   'We like a quiet neighbourhood' - VALID -- BRAK!
// p5: "I want a bright living room."
//   tokens: I(0) want(1) a(2) bright(3) living(4) room(5)
//   slot[4] 'living' -> distractors 'dining','reading','sleeping','working','playing'
//   'I want a bright dining room' - VALID -- BRAK!
// p6: "My home has a comfortable bathroom."
//   tokens: My(0) home(1) has(2) a(3) comfortable(4) bathroom(5)
//   slot[5] 'bathroom' -> distractors 'bedroom','kitchen','garden','balcony','hallway'
//   'My home has a comfortable bedroom' - VALID -- BRAK!
//   'My home has a comfortable kitchen' - VALID -- BRAK!
//   etc.

// Let's be systematic about BRAK: substitution gives a sentence that's also grammatically+semantically valid
// (doesn't need to match the answer, just produces a "correct" English sentence)

const brakChecks = [
  // p2 slot 3 (very/adverb): 'quite' and 'really' are valid adverbs before adjectives
  { id: "impuls_d111_p2", slot: 3, word: "very", distractor: "quite", candidate: "I have a quite big kitchen", verdict: "BRAK - 'quite big kitchen' is grammatically and semantically valid English" },
  { id: "impuls_d111_p2", slot: 3, word: "very", distractor: "really", candidate: "I have a really big kitchen", verdict: "BRAK - 'really big kitchen' is valid" },
  // p3 slot 3 (two/determiner): all number words produce valid sentences
  { id: "impuls_d111_p3", slot: 3, word: "two", distractor: "three", candidate: "The house has three large bedrooms", verdict: "BRAK - semantically valid, different number" },
  { id: "impuls_d111_p3", slot: 3, word: "two", distractor: "four", candidate: "The house has four large bedrooms", verdict: "BRAK - semantically valid" },
  { id: "impuls_d111_p3", slot: 3, word: "two", distractor: "some", candidate: "The house has some large bedrooms", verdict: "BRAK - 'some large bedrooms' is valid" },
  { id: "impuls_d111_p3", slot: 3, word: "two", distractor: "many", candidate: "The house has many large bedrooms", verdict: "BRAK - 'many large bedrooms' is valid" },
  { id: "impuls_d111_p3", slot: 3, word: "two", distractor: "few", candidate: "The house has few large bedrooms", verdict: "BRAK - 'few large bedrooms' is valid" },
  // p4 slot 1 (need/verb): want/have/like all produce valid sentences
  { id: "impuls_d111_p4", slot: 1, word: "need", distractor: "want", candidate: "We want a quiet neighbourhood", verdict: "BRAK - semantically valid" },
  { id: "impuls_d111_p4", slot: 1, word: "need", distractor: "have", candidate: "We have a quiet neighbourhood", verdict: "BRAK - semantically valid" },
  { id: "impuls_d111_p4", slot: 1, word: "need", distractor: "like", candidate: "We like a quiet neighbourhood", verdict: "BRAK - semantically valid" },
  // p5 slot 4 (living/adjective): dining room is valid compound
  { id: "impuls_d111_p5", slot: 4, word: "living", distractor: "dining", candidate: "I want a bright dining room", verdict: "BRAK - 'dining room' is valid compound noun" },
  // p6 slot 5 (bathroom/noun): bedroom/kitchen produce valid sentences
  { id: "impuls_d111_p6", slot: 5, word: "bathroom", distractor: "bedroom", candidate: "My home has a comfortable bedroom", verdict: "BRAK - semantically valid" },
  { id: "impuls_d111_p6", slot: 5, word: "bathroom", distractor: "kitchen", candidate: "My home has a comfortable kitchen", verdict: "BRAK - semantically valid" },
];

brakChecks.forEach(c => {
  console.log(c.id, "slot" + c.slot, c.word, "->", c.distractor, "|", c.verdict);
});
