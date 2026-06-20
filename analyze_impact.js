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
let exceeding24 = 0;
const stats = {
  '25-30': 0,
  '31-40': 0,
  '41+': 0
};
const charStats = {
  '100-200': 0,
  '201-300': 0,
  '301+': 0
};

for (const file of planFiles) {
  if (!fs.existsSync(file)) continue;
  
  const content = fs.readFileSync(file, 'utf-8');
  let match;
  
  while ((match = phraseRegex.exec(content)) !== null) {
    const rule = match[1];
    const why = match[2];
    const combined = `${rule} ${why}`;
    const combinedWordCount = countWords(combined);
    const charCount = combined.length;
    
    totalCombinations++;
    
    if (combinedWordCount > 24) {
      exceeding24++;
      if (combinedWordCount <= 30) stats['25-30']++;
      else if (combinedWordCount <= 40) stats['31-40']++;
      else stats['41+']++;
    }
    
    if (charCount >= 100 && charCount <= 200) charStats['100-200']++;
    else if (charCount >= 201 && charCount <= 300) charStats['201-300']++;
    else if (charCount > 300) charStats['301+']++;
  }
}

console.log(`\n====== IMPACT ANALYSIS ======`);
console.log(`Total combinations: ${totalCombinations}`);
console.log(`Combined exceeding 24 words: ${exceeding24} (${((exceeding24/totalCombinations)*100).toFixed(1)}%)`);
console.log(`\nWord distribution of exceeding:`);
console.log(`  25-30 words: ${stats['25-30']}`);
console.log(`  31-40 words: ${stats['31-40']}`);
console.log(`  41+ words: ${stats['41+']}`);
console.log(`\nCharacter length distribution:`);
console.log(`  100-200 chars: ${charStats['100-200']}`);
console.log(`  201-300 chars: ${charStats['201-300']}`);
console.log(`  300+ chars: ${charStats['301+']}`);

// Typical mobile screen is ~45-55 chars per line at normal text size
// So 300+ chars = ~6-7 lines of text = decent amount of vertical space
console.log(`\nNote: At ~50 chars/line on mobile, 300 chars = ~6 lines of text`);
