function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// English version from the issue
const englishRule = "The definite article 'the' is used before specific nouns we've mentioned before or that are known to both speaker and listener";

// Possible Russian translation
const russianRule1 = "Определённый артикль 'the' используется перед конкретными существительными, о которых мы уже упомянули или которые известны собеседнику.";
const russianRule2 = "Артикль 'the' пишут перед существительным, если оно уже знакомо слушателю или упоминалось в разговоре.";

console.log(`English version (${countWords(englishRule)} words):`);
console.log(`  "${englishRule}"\n`);

console.log(`Russian v1 (${countWords(russianRule1)} words):`);
console.log(`  "${russianRule1}"\n`);

console.log(`Russian v2 (${countWords(russianRule2)} words) — SHORT VERSION:`);
console.log(`  "${russianRule2}"\n`);

console.log(`Analysis:`);
console.log(`  Issue claims English version is 25 words.`);
console.log(`  But validation is done on RUSSIAN text, not English.`);
console.log(`  Russian v1 is ${countWords(russianRule1)} words — violates limit.`);
console.log(`  Russian v2 is ${countWords(russianRule2)} words — within limit.`);
