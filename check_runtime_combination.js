const fs = require('fs');

const planFiles = [
  './app/plan_content_echo.ts',
  './app/plan_content_gavan.ts',
  './app/plan_content_impuls.ts',
  './app/plan_content_mitap.ts',
  './app/plan_content_voyazh.ts'
];

const phraseRegex = /explanation:\s*{[\s\S]*?rule:\s*{\s*ru:\s*["']([^"']+)["'][\s\S]*?why:\s*{\s*ru:\s*["']([^"']+)["']/g;

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

let totalCombinations = 0;
let exceeding = 0;
const longExamples = [];

for (const file of planFiles) {
  if (!fs.existsSync(file)) continue;
  
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  
  while ((match = phraseRegex.exec(content)) !== null) {
    const rule = match[1];
    const why = match[2];
    const combined = `${rule} ${why}`;
    const combinedWordCount = countWords(combined);
    
    totalCombinations++;
    
    if (combinedWordCount > 24) {
      exceeding++;
      if (longExamples.length < 10) {
        longExamples.push({
          file,
          rule: rule.substring(0, 80),
          why: why.substring(0, 80),
          combinedCount: combinedWordCount,
          ruleCount: countWords(rule),
          whyCount: countWords(why)
        });
      }
    }
  }
}

console.log(`\n====== RUNTIME COMBINATION ANALYSIS ======`);
console.log(`Total rule+why combinations: ${totalCombinations}`);
console.log(`Combinations exceeding 24 words when joined: ${exceeding}`);
console.log(`Percentage exceeding: ${((exceeding / totalCombinations) * 100).toFixed(2)}%`);

if (exceeding > 0) {
  console.log(`\nFirst examples of combined exceeding 24 words:`);
  for (const ex of longExamples) {
    console.log(`\n${ex.file}:`);
    console.log(`  rule (${ex.ruleCount}): "${ex.rule}..."`);
    console.log(`  why (${ex.whyCount}): "${ex.why}..."`);
    console.log(`  combined (${ex.combinedCount}): would be too long for display`);
  }
}
