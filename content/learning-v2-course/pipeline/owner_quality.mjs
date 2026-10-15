const TRAP_ANNOUNCEMENT_RE = /(?:серед|среди)\s+плиток[^.!?]*?(?:чуж\p{L}*|лишн\p{L}*|зайв\p{L}*)|(?:чуж\p{L}*|лишн\p{L}*|зайв\p{L}*)\s+(?:плитка|плитки|скрепка|скріпка|скрепку|слово|сокращение|скорочення)|лишн\p{L}*\s+`|(?:плитка|плитки)\s+(?:лишн\p{L}*|зайв\p{L}*)|`\s*(?:тут|здесь)\s+лишн\p{L}*/iu;
const SUPPORT_LEVEL_RE = /без\s+(?:подсказ\p{L}*|підказ\p{L}*|опор\p{L}*|помощ\p{L}*|допомог\p{L}*)|самостоятельн\p{L}*|самостійн\p{L}*|провер\p{L}*\s+себя|перевір\p{L}*\s+себе/iu;

function practiceTaskHeadings(markdown) {
  const text = String(markdown || "");
  const practice = text.split(/^##\s*(?:Практик|Практич)[^\r\n]*$/mi)[1] ?? text;
  return [...practice.matchAll(/^\*\*(\d+)\s*·\s*([^*\r\n]+?)\s*\*\*/gmu)]
    .map((match) => ({ ordinal: Number(match[1]), heading: match[2].trim() }));
}

export function taskInstructionIssues(markdown) {
  const issues = [];
  for (const { ordinal, heading } of practiceTaskHeadings(markdown)) {
    if (TRAP_ANNOUNCEMENT_RE.test(heading)) {
      issues.push(`задание ${ordinal}: инструкция объявляет лишнюю плитку до ответа — «${heading}»`);
    }
    if (SUPPORT_LEVEL_RE.test(heading)) {
      issues.push(`задание ${ordinal}: инструкция комментирует уровень помощи — «${heading}»`);
    }
  }
  return issues;
}
