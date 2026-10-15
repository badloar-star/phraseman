import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const file = path.join(root, "sessions", "en", "l02", "s07", "practice.atomic.json");
const substitutions = new Map([
  ["спросите парня у ворот про нервы", "спросите Тома у ворот про нервы"],
  ["запитайте хлопця біля воріт про нерви", "запитайте Тома біля воріт про нерви"],
  ["девушка на скамейке никуда не спешит", "Мира на скамейке никуда не спешит"],
  ["дівчина на лавці нікуди не поспішає", "Міра на лавці нікуди не поспішає"],
  ["во дворе ветер, парень стоит в одной футболке и обхватил себя руками", "во дворе ветер, Том стоит в одной футболке и обхватил себя руками"],
  ["у дворі вітер, хлопець стоїть в одній футболці й обхопив себе руками", "у дворі вітер, Том стоїть в одній футболці й обхопив себе руками"],
]);

const source = fs.readFileSync(file, "utf8");
const updated = [...substitutions].reduce((text, [from, to]) => text.split(from).join(to), source);
if (updated === source) throw new Error("l02/s07 actor repair made no change");
JSON.parse(updated);
fs.writeFileSync(file, updated, "utf8");
