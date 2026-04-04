const fs = require('fs');
let content = fs.readFileSync('app/lesson_data_all.ts', 'utf8');

// Direct targeted replacements for known problematic english field values in lesson 25
// Replace single-quoted english values containing apostrophes with double-quoted ones
const replacements = [
  ["english:'I was listening to that important lecture at ten o'clock.'",
   'english:"I was listening to that important lecture at ten o\'clock."'],
  ["english:'They were not watching that boring movie at nine o'clock.'",
   "english:\"They were not watching that boring movie at nine o'clock.\""],
  ["english:'Were you listening to that strange message on answering machine at five o'clock?'",
   "english:\"Were you listening to that strange message on answering machine at five o'clock?\""],
  ["english:'Were you discussing that serious problem with equipment yesterday at four o'clock?'",
   "english:\"Were you discussing that serious problem with equipment yesterday at four o'clock?\""],
  ["english:'Those little children were not playing on this dirty playground at four o'clock.'",
   "english:\"Those little children were not playing on this dirty playground at four o'clock.\""],
  ["english:'My colleagues were not signing those important documents yesterday at two o'clock.'",
   "english:\"My colleagues were not signing those important documents yesterday at two o'clock.\""],
  // Ukrainian strings with apostrophes
  ["ukrainian:'Вони не дивилися той нудний фільм о дев'ятій годині ранку.'",
   "ukrainian:\"Вони не дивилися той нудний фільм о дев'ятій годині ранку.\""],
  ["ukrainian:'Ви слухали те дивне повідомлення на автовідповідачі о п'ятій годині?'",
   "ukrainian:\"Ви слухали те дивне повідомлення на автовідповідачі о п'ятій годині?\""],
  ["ukrainian:'Вона не друкувала той річний фінансовий план протягом п'яти годин.'",
   "ukrainian:\"Вона не друкувала той річний фінансовий план протягом п'яти годин.\""],
  ["ukrainian:'Ми не лагодили той старий дах учора о п'ятій годині вечора.'",
   "ukrainian:\"Ми не лагодили той старий дах учора о п'ятій годині вечора.\""],
  ["ukrainian:'Вона не перекладала цей технічний текст сьогодні о п'ятій ранку.'",
   "ukrainian:\"Вона не перекладала цей технічний текст сьогодні о п'ятій ранку.\""],
  ["ukrainian:'Вона не відправляла ту важливу посилку сьогодні о дев'ятій ранку.'",
   "ukrainian:\"Вона не відправляла ту важливу посилку сьогодні о дев'ятій ранку.\""],
  ["ukrainian:\"Вона не видаляла ті важливі файли на своєму робочому комп'ютері опівдні.\"",
   "ukrainian:\"Вона не видаляла ті важливі файли на своєму робочому комп'ютері опівдні.\""], // already double
];

let count = 0;
for (const [from, to] of replacements) {
  if (content.includes(from)) {
    content = content.replace(from, to);
    count++;
    console.log('Fixed:', from.slice(0, 60));
  } else {
    // Try to find similar pattern
    const key = from.slice(8, 30); // part of the value
    if (content.includes(key)) {
      console.log('FOUND but no exact match for:', key);
    }
  }
}

fs.writeFileSync('app/lesson_data_all.ts', content, 'utf8');
console.log('Total fixed:', count);
