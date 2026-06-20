const fs = require('fs');

// Read the voyazh file
const content = fs.readFileSync('./app/plan_content_voyazh.ts', 'utf-8');

// Extract all rule, why, and commonMistake parts
const ruleRegex = /rule:\s*{\s*ru:\s*["']([^"']+)["']/g;
const whyRegex = /why:\s*{\s*ru:\s*["']([^"']+)["']/g;
const mistakeRegex = /commonMistake:\s*{\s*ru:\s*["']([^"']+)["']/g;

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractAll(regex, text) {
  const results = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    results.push(match[1]);
  }
  return results;
}

const rules = extractAll(ruleRegex, content);
const whys = extractAll(whyRegex, content);
const mistakes = extractAll(mistakeRegex, content);

const allParts = [
  ...rules.map(r => ({ text: r, type: 'rule' })),
  ...whys.map(w => ({ text: w, type: 'why' })),
  ...mistakes.map(m => ({ text: m, type: 'mistake' }))
];

const exceeding = allParts.filter(p => countWords(p.text) > 24);

console.log(`Total explanation parts: ${allParts.length}`);
console.log(`Parts exceeding 24-word limit: ${exceeding.length}\n`);

if (exceeding.length > 0) {
  console.log('EXCEEDING PARTS:');
  for (const part of exceeding.slice(0, 20)) {
    const count = countWords(part.text);
    console.log(`\n${part.type} (${count} words):`);
    console.log(`  "${part.text.substring(0, 100)}..."`);
  }
} else {
  console.log('NO PARTS EXCEED 24 WORDS');
  // Show max for each type
  if (rules.length > 0) {
    const ruleMaxWords = Math.max(...rules.map(countWords));
    const whyMaxWords = Math.max(...whys.map(countWords));
    const mistakeMaxWords = Math.max(...mistakes.map(countWords));
    console.log(`\nMax words by type:`);
    console.log(`  rule: ${ruleMaxWords}`);
    console.log(`  why: ${whyMaxWords}`);
    console.log(`  commonMistake: ${mistakeMaxWords}`);
  }
}
