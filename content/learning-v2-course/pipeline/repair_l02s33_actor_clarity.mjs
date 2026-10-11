import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "sessions", "en", "l02", "s33", "practice.atomic.json");
const substitutions = new Map([
  ["мужчина машет вам; узнайте у соседа, кто он", "Алекс машет вам; узнайте у соседа Ильи, кто он"],
  ["чоловік махає вам; дізнайтеся в сусіда, хто він", "Алекс махає вам; дізнайтеся в сусіда Іллі, хто він"],
]);
const source = fs.readFileSync(file, "utf8");
const updated = [...substitutions].reduce((text, [from, to]) => text.split(from).join(to), source);
if (updated === source) throw new Error("l02/s33 actor repair made no change");
JSON.parse(updated);
fs.writeFileSync(file, updated, "utf8");
