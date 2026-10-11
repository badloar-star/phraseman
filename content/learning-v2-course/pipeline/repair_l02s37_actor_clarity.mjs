import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "sessions", "en", "l02", "s37", "practice.atomic.json");
const substitutions = new Map([
  ["мужчина машет другу; узнайте, кто он", "Алекс машет Илье; узнайте, кто он"],
  ["чоловік махає другові; дізнайтеся, хто він", "Алекс махає Іллі; дізнайтеся, хто він"],
  ["спросите друга о мужчине у двери", "спросите Илью об Алексe у двери"],
  ["запитайте друга про чоловіка біля дверей", "запитайте Іллю про Алекса біля дверей"],
]);
const source = fs.readFileSync(file, "utf8");
const updated = [...substitutions].reduce((text, [from, to]) => text.split(from).join(to), source);
if (updated === source) throw new Error("l02/s37 actor repair made no change");
JSON.parse(updated);
fs.writeFileSync(file, updated, "utf8");
