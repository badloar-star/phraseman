const fs = require('fs');

const planFiles = [
  './app/plan_content_echo.ts',
  './app/plan_content_gavan.ts',
  './app/plan_content_impuls.ts',
  './app/plan_content_mitap.ts',
  './app/plan_content_voyazh.ts'
];

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

let totalParts = 0;
let totalExceeding = 0;
const limits = { 25: 0, 26: 0, 27: 0, 28: 0, 29: 0, 30: 0 };
const longExamples = [];

for (const file of planFiles) {
  if (!fs.existsSync(file)) continue;
  
  const content = fs.readFileSync(file, 'utf-8');
  const rules = extractAll(ruleRegex, content);
  const whys = extractAll(whyRegex, content);
  const mistakes = extractAll(mistakeRegex, content);

  const allParts = [
    ...rules.map(r => ({ text: r, type: 'rule' })),
    ...whys.map(w => ({ text: w, type: 'why' })),
    ...mistakes.map(m => ({ text: m, type: 'mistake' }))
  ];

  totalParts += allParts.length;
  
  const exceeding = allParts.filter(p => {
    const count = countWords(p.text);
    if (count > 24) {
      totalExceeding++;
      if (count >= 25 && count <= 30) {
        limits[count]++;
      }
      if (longExamples.length < 5) {
        longExamples.push({ file, type: p.type, count, text: p.text.substring(0, 100) });
      }
      return true;
    }
    return false;
  });
}

console.log(`\n====== SUMMARY ======`);
console.log(`Total parts across all plans: ${totalParts}`);
console.log(`Parts exceeding 24 words: ${totalExceeding}`);
console.log(`Percentage exceeding: ${((totalExceeding / totalParts) * 100).toFixed(2)}%`);

if (totalExceeding > 0) {
  console.log(`\nDistribution of exceeding parts:`);
  for (let i = 25; i <= 30; i++) {
    if (limits[i] > 0) {
      console.log(`  ${i} words: ${limits[i]}`);
    }
  }
  
  console.log(`\nFirst few exceeding examples:`);
  for (const ex of longExamples) {
    console.log(`  ${ex.file} - ${ex.type} (${ex.count}): "${ex.text}..."`);
  }
} else {
  console.log(`\n✓ NO parts exceed 24-word limit in any production plan file`);
}
