const fs = require('fs');
const path = require('path');

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

  const exceeding = allParts.filter(p => countWords(p.text) > 24);

  console.log(`\n${path.basename(file)}:`);
  console.log(`  Total parts: ${allParts.length}, Exceeding: ${exceeding.length}`);
  
  if (allParts.length > 0) {
    const ruleMaxWords = rules.length > 0 ? Math.max(...rules.map(countWords)) : 0;
    const whyMaxWords = whys.length > 0 ? Math.max(...whys.map(countWords)) : 0;
    const mistakeMaxWords = mistakes.length > 0 ? Math.max(...mistakes.map(countWords)) : 0;
    console.log(`  Max: rule=${ruleMaxWords}, why=${whyMaxWords}, mistake=${mistakeMaxWords}`);
  }
  
  if (exceeding.length > 0) {
    console.log(`  *** FOUND EXCEEDING PARTS ***`);
    for (const part of exceeding.slice(0, 5)) {
      const count = countWords(part.text);
      console.log(`    ${part.type} (${count}): "${part.text.substring(0, 80)}..."`);
    }
  }
}
