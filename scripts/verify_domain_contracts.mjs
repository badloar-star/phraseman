import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const domains = [
  "identity",
  "learning",
  "economy-entitlements",
  "voice-ai",
  "admin-commands",
  "telemetry-privacy",
  "release",
];

const requiredSections = [
  "Owner",
  "Source of truth",
  "Authority",
  "Invariants",
  "Idempotency",
  "Offline behavior",
  "Security and privacy",
  "Recovery",
  "Owning tests",
];

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function sectionBody(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "mi"));
  return match?.[1].trim() ?? null;
}

function localLinks(markdown) {
  return [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().replace(/^<|>$/g, ""))
    .filter((target) => target && !target.startsWith("#") && !/^[a-z][a-z0-9+.-]*:/i.test(target));
}

export function verifyDomainContracts(root) {
  const findings = [];
  for (const domain of domains) {
    const file = resolve(root, "docs", "architecture", "domains", `${domain}.md`);
    if (!existsSync(file)) {
      findings.push(`missing domain contract: ${domain}`);
      continue;
    }

    const markdown = readFileSync(file, "utf8");
    for (const section of requiredSections) {
      const body = sectionBody(markdown, section);
      if (!body) findings.push(`${domain}: empty section "${section}"`);
    }

    for (const target of localLinks(markdown)) {
      const withoutAnchor = decodeURIComponent(target.split("#", 1)[0]);
      if (!withoutAnchor) continue;
      const linked = isAbsolute(withoutAnchor) ? withoutAnchor : resolve(dirname(file), withoutAnchor);
      if (!existsSync(linked)) findings.push(`${domain}: broken local link ${target}`);
    }
  }
  return findings;
}

const root = resolve(argument("--root", process.cwd()));
const findings = verifyDomainContracts(root);
if (findings.length) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`domain_contracts_ok domains=${domains.length} sections=${requiredSections.length}`);
}
