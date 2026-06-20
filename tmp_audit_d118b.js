// Manual verification of BRAK findings + grammar term check in native languages

const phrases = [
  {
    id: "gavan_d118_p2",
    english: "She plays tennis every Sunday morning.",
    // Slot 'Sunday', distractor 'morning'
    // If user picks 'morning' for the Sunday slot => "She plays tennis every morning morning." => NO
    // BUT the BRAK rule is: if distractor appears anywhere in the phrase, a user who sees the distractor
    // might be confused. More importantly: in a word-tile exercise, the user picks from shuffled tiles.
    // 'morning' is both a distractor for Sunday AND the correct answer for the last slot.
    // => If user sees 'morning' tile appear for the Sunday slot, clicking it removes it from the pool,
    //    but morning tile also needs to appear as correct for the last slot. This creates a DUPLICATE tile problem.
    note: "CONFIRMED BRAK: 'morning' is a distractor for 'Sunday' slot but also a correct word in the phrase (last slot). Causes duplicate tile / confusion."
  },
  {
    id: "gavan_d118_p3",
    english: "We swim in the pool twice a week.",
    // Slot 'the', distractor 'a'
    // 'a' appears in the phrase as correct word for the 'a' slot
    // If distractor 'a' for slot 'the' => "We swim in a pool twice a week." => GRAMMATICALLY VALID!
    // This is a real BRAK: substituting 'a' for 'the' gives a perfectly correct English sentence.
    note: "CONFIRMED BRAK: 'a' as distractor for 'the' → 'We swim in a pool twice a week.' is valid English. Classic article swap."
  },
  {
    id: "gavan_d118_p5",
    english: "Do you play any sport in winter?",
    // Slot 'play', distractor 'do'
    // 'do' appears in phrase as correct word for the 'Do' slot
    // If user picks 'do' for 'play' slot => "Do you do any sport in winter?" => VALID informal English!
    note: "CONFIRMED BRAK: 'do' as distractor for 'play' → 'Do you do any sport in winter?' is grammatically acceptable in informal English."
  }
];

// Grammar terms in native languages to check
const nativeGrammarTerms = {
  ru: ['глагол', 'существительное', 'прилагательное', 'наречие', 'предлог', 'местоимение', 'артикль', 'союз', 'причастие', 'инфинитив', 'частица', 'падеж', 'склонение', 'спряжение'],
  uk: ['дієслово', 'іменник', 'прикметник', 'прислівник', 'прийменник', 'займенник', 'артикль', 'сполучник', 'дієприкметник', 'інфінітив', 'частка'],
  es: ['verbo', 'sustantivo', 'adjetivo', 'adverbio', 'preposición', 'pronombre', 'artículo', 'conjunción', 'participio', 'infinitivo']
};

// Check all rule/why fields in native languages
const allPhrases = [
  {id:"gavan_d118_p1", explanation:{rule:{ru:"«Times a week» — сколько раз в неделю ты что-то делаешь.",uk:"«Times a week» — скільки разів на тиждень ти щось робиш.",es:"«Times a week» indica cuántas veces a la semana haces algo."},why:{ru:"Так легко объяснить свой режим тренировок любому.",uk:"Так легко пояснити свій режим тренувань будь-кому.",es:"Así explicas fácilmente tu rutina de entrenamiento a cualquiera."}}},
  {id:"gavan_d118_p2", explanation:{rule:{ru:"«Every + день» значит, что это происходит каждую неделю в этот день.",uk:"«Every + день» означає, що це відбувається щотижня в цей день.",es:"«Every + día» indica que algo ocurre cada semana ese día."},why:{ru:"Это стандартный способ рассказать о еженедельной привычке.",uk:"Це стандартний спосіб розповісти про щотижневу звичку.",es:"Es la forma estándar de hablar sobre un hábito semanal."}}},
  {id:"gavan_d118_p3", explanation:{rule:{ru:"«Twice a week» = два раза в неделю. Похоже на «three times a week», но короче.",uk:"«Twice a week» = двічі на тиждень. Схоже на «three times a week», але коротше.",es:"«Twice a week» = dos veces a la semana. Similar a «three times a week», pero más corto."},why:{ru:"Это удобное готовое выражение, которое все понимают.",uk:"Це зручний готовий вислів, який усі розуміють.",es:"Es una expresión fija muy práctica que todos entienden."}}},
  {id:"gavan_d118_p4", explanation:{rule:{ru:"«Every day» в конце предложения говорит о ежедневной привычке.",uk:"«Every day» в кінці речення говорить про щоденну звичку.",es:"«Every day» al final de la oración indica un hábito diario."},why:{ru:"Это короткая и понятная фраза для описания режима жизни.",uk:"Це коротка і зрозуміла фраза для опису режиму життя.",es:"Es una frase breve y clara para describir una rutina de vida."}}},
  {id:"gavan_d118_p5", explanation:{rule:{ru:"В вопросах с «you» ставь «Do» в начало: Do you + глагол?",uk:"У запитаннях з «you» став «Do» на початок: Do you + дієслово?",es:"En preguntas con «you» pon «Do» al inicio: Do you + verbo?"},why:{ru:"Без «Do» вопрос звучит неграмотно и непонятно.",uk:"Без «Do» запитання звучить неграмотно і незрозуміло.",es:"Sin «Do» la pregunta suena incorrecta e incomprensible."}}},
  {id:"gavan_d118_p6", explanation:{rule:{ru:"«On weekdays» = по будням (понедельник — пятница). Всегда с предлогом «on».",uk:"«On weekdays» = у будні (понеділок — п'ятниця). Завжди з прийменником «on».",es:"«On weekdays» = los días de semana (lunes a viernes). Siempre con la preposición «on»."},why:{ru:"Так удобно объяснить, что ты делаешь в рабочие дни, одним словом.",uk:"Так зручно пояснити, що ти робиш у робочі дні, одним словом.",es:"Así explicas fácilmente lo que haces en los días laborables con una sola palabra."}}}
];

console.log("=== NATIVE LANGUAGE GRAMMAR TERM CHECK ===");
for (const phrase of allPhrases) {
  for (const lang of ['ru','uk','es']) {
    const terms = nativeGrammarTerms[lang] || [];
    for (const field of ['rule','why']) {
      const text = phrase.explanation[field][lang] || '';
      for (const term of terms) {
        if (text.toLowerCase().includes(term.toLowerCase())) {
          console.log("GRAMTERM " + phrase.id + " " + field + "." + lang + ": '" + term + "' in \"" + text + "\"");
        }
      }
    }
  }
}

console.log("\n=== BRAK MANUAL ANALYSIS ===");
for (const p of phrases) {
  console.log(p.id + ": " + p.note);
}

// Check partOfSpeech values that are grammar terms in words[] - this is expected/OK
// But check if rule/why in ES contains 'verbo' (Spanish grammar term)
console.log("\n=== CHECKING ES rule/why for 'verbo' ===");
for (const phrase of allPhrases) {
  const ruleEs = phrase.explanation.rule.es || '';
  const whyEs = phrase.explanation.why.es || '';
  if (ruleEs.toLowerCase().includes('verbo')) console.log(phrase.id + " rule.es has 'verbo': " + ruleEs);
  if (whyEs.toLowerCase().includes('verbo')) console.log(phrase.id + " why.es has 'verbo': " + whyEs);
}
