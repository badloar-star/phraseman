import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "sessions", "en", "l02", "s12", "practice.atomic.json");
const substitutions = new Map([
  ["мужчина у окна", "Том у окна"], ["чоловік біля вікна", "Том біля вікна"],
  ["У окна сидит мужчина", "У окна сидит Том"], ["Біля вікна сидить чоловік", "Біля вікна сидить Том"],
  ["женщина у двери", "Мира у двери"], ["жінка біля дверей", "Міра біля дверей"],
  ["парень за стойкой", "Том за стойкой"], ["хлопець за стійкою", "Том за стійкою"],
]);
const source = fs.readFileSync(file, "utf8");
const updated = [...substitutions].reduce((text, [from, to]) => text.split(from).join(to), source);
if (updated === source) throw new Error("l02/s12 actor repair made no change");
JSON.parse(updated);
fs.writeFileSync(file, updated, "utf8");
