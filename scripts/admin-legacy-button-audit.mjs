import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const sourcePath = path.join(root, 'admin', 'index.html');
const outDir = path.join(root, '.codex-tmp', 'admin-audit');

const html = fs.readFileSync(sourcePath, 'utf8');
const sections = collectSections(html);
const scriptRanges = collectScriptRanges(html);
const buttons = collectButtons(html, sections, scriptRanges);
const functions = collectFunctions(html);
const callableNames = collectCallableNames(readLinkedRuntimeSources(html, sourcePath));
const links = linkButtonsToFunctions(buttons, functions, callableNames);
const summary = summarize(buttons, sections);
const functionSummary = summarizeFunctions(functions, links);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'legacy-buttons.json'), JSON.stringify(buttons, null, 2));
fs.writeFileSync(path.join(outDir, 'legacy-buttons-summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outDir, 'legacy-functions.json'), JSON.stringify(functions, null, 2));
fs.writeFileSync(path.join(outDir, 'legacy-button-function-links.json'), JSON.stringify(links, null, 2));
fs.writeFileSync(path.join(outDir, 'legacy-functions-summary.json'), JSON.stringify(functionSummary, null, 2));

console.log(JSON.stringify({ buttons: summary, functions: functionSummary }, null, 2));

function collectSections(source) {
  const sectionRe = /<div\s+id="tab-([^"]+)"/gi;
  const rows = [];
  let match;
  while ((match = sectionRe.exec(source))) {
    rows.push({ id: match[1], index: match.index });
  }
  return rows.sort((a, b) => a.index - b.index);
}

function collectScriptRanges(source) {
  const scriptRe = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
  const ranges = [];
  let match;
  while ((match = scriptRe.exec(source))) ranges.push({ start: match.index, end: scriptRe.lastIndex });
  return ranges;
}

function collectButtons(source, sectionRows, scriptRows) {
  const buttonRe = /<button\b[\s\S]*?<\/button>/gi;
  const dangerRe = /delete|remove|purge|ban|disable|deactivate|cleanup|reset|force|grant|save|send|publish|seed|repair|migrat|wipe|bulk|mark|set|update/i;
  const writeRe = /save|set|update|delete|remove|purge|ban|grant|send|seed|repair|cleanup|deactivate|disable|migrat|publish|create|bulk|mark|reset/i;
  const rows = [];
  const fingerprintCounts = new Map();
  let match;

  while ((match = buttonRe.exec(source))) {
    const raw = match[0];
    const provenance = scriptRows.some((range) => range.start <= match.index && match.index < range.end) ? 'script-template' : 'static-html';
    const section = provenance === 'static-html' ? sectionRows.filter((item) => item.index < match.index).at(-1) : null;
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const onclick = attr(raw, 'onclick');
    const title = attr(raw, 'title');
    const id = attr(raw, 'id');
    const className = attr(raw, 'class');
    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
    const write = writeRe.test(onclick);
    const hasConfirmSignal = /showConfirmModal|confirm\(|showInputModal/i.test(raw + ' ' + onclick);
    const fingerprint = createHash('sha256').update(raw.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16);
    const occurrence = (fingerprintCounts.get(fingerprint) ?? 0) + 1;
    fingerprintCounts.set(fingerprint, occurrence);

    rows.push({
      buttonKey: `button-${fingerprint}-${occurrence}`,
      provenance,
      tab: provenance === 'static-html' ? section?.id || 'pre-sections' : null,
      line: source.slice(0, match.index).split(/\r?\n/).length,
      id,
      className,
      text,
      onclick,
      title,
      hasTitle: Boolean(title),
      hasEmoji,
      danger: dangerRe.test(text + ' ' + onclick),
      write,
      directWriteCandidate: write && !hasConfirmSignal
    });
  }

  return rows;
}

function summarize(rows, sectionRows) {
  const byTab = {};
  for (const row of rows) {
    const tab = row.tab ?? 'unresolved-script-template';
    byTab[tab] ||= { total: 0, danger: 0, write: 0, noTitle: 0, emoji: 0, directWriteCandidate: 0 };
    byTab[tab].total += 1;
    if (row.danger) byTab[tab].danger += 1;
    if (row.write) byTab[tab].write += 1;
    if (!row.hasTitle) byTab[tab].noTitle += 1;
    if (row.hasEmoji) byTab[tab].emoji += 1;
    if (row.directWriteCandidate) byTab[tab].directWriteCandidate += 1;
  }

  return {
    sections: sectionRows.length,
    total: rows.length,
    write: rows.filter((row) => row.write).length,
    danger: rows.filter((row) => row.danger).length,
    noTitle: rows.filter((row) => !row.hasTitle).length,
    emoji: rows.filter((row) => row.hasEmoji).length,
    directWriteCandidate: rows.filter((row) => row.directWriteCandidate).length,
    byTab: Object.entries(byTab).sort((a, b) => b[1].total - a[1].total)
  };
}

function collectFunctions(source) {
  const functionRe = /(?:window\.)?([A-Za-z_$][\w$]*)\s*=\s*async\s*function\s*(?:[A-Za-z_$][\w$]*)?\s*\(|(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  const rows = [];
  let match;
  while ((match = functionRe.exec(source))) {
    const name = match[1] || match[2];
    const start = match.index;
    const chunk = source.slice(start, Math.min(source.length, start + 2200));
    rows.push({
      name,
      line: source.slice(0, start).split(/\r?\n/).length,
      writes: /setDoc|updateDoc|deleteDoc|addDoc|writeBatch|runTransaction|httpsCallable/i.test(chunk),
      confirm: /showConfirmModal|confirm\(|showInputModal/i.test(chunk),
      audit: /admin_log|logAction|remote_config_history|audit/i.test(chunk),
      callable: /httpsCallable/i.test(chunk),
      snippet: chunk.slice(0, 260).replace(/\s+/g, ' ')
    });
  }
  return rows;
}

function readLinkedRuntimeSources(source, entryPath) {
  const adminDir = path.dirname(entryPath);
  const sources = [source];
  for (const match of source.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)) {
    const value = match[1].split(/[?#]/, 1)[0];
    if (!value || /^(?:https?:)?\/\//i.test(value)) continue;
    const resolved = path.resolve(adminDir, value);
    if (!resolved.startsWith(`${adminDir}${path.sep}`) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) continue;
    sources.push(fs.readFileSync(resolved, 'utf8'));
  }
  return sources.join('\n');
}

function collectCallableNames(source) {
  const names = new Set(['getElementById', 'stopPropagation', 'stringify', 'remove']);
  const declarationRe = /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  const assignedRe = /(?:(?:const|let|var)\s+|(?:[A-Za-z_$][\w$]*\.)?)([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g;
  const aliases = [];
  const aliasRe = /(?:(?:const|let|var)\s+|(?:[A-Za-z_$][\w$]*\.)?)([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g;
  let match;
  while ((match = declarationRe.exec(source))) names.add(match[1]);
  while ((match = assignedRe.exec(source))) names.add(match[1]);
  while ((match = aliasRe.exec(source))) aliases.push([match[1], match[2]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [alias, target] of aliases) {
      if (!names.has(alias) && names.has(target)) {
        names.add(alias);
        changed = true;
      }
    }
  }
  return names;
}

function linkButtonsToFunctions(buttonRows, functionRows, callableNames) {
  const links = [];
  for (const button of buttonRows) {
    const names = [...button.onclick.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)]
      .map((match) => match[1])
      .filter((name) => !['if', 'typeof', 'event', 'document', 'window'].includes(name));
    for (const name of names) {
      const fn = functionRows.find((row) => row.name === name);
      const found = Boolean(fn) || callableNames.has(name);
      links.push({
        buttonKey: button.buttonKey,
        provenance: button.provenance,
        tab: button.tab,
        line: button.line,
        text: button.text,
        onclick: button.onclick,
        function: name,
        found,
        writes: Boolean(fn?.writes),
        confirm: Boolean(fn?.confirm),
        audit: Boolean(fn?.audit),
        callable: Boolean(fn?.callable),
        functionLine: fn?.line || 0
      });
    }
  }
  return links;
}

function summarizeFunctions(functionRows, links) {
  return {
    functions: functionRows.length,
    writingFunctions: functionRows.filter((row) => row.writes).length,
    confirmFunctions: functionRows.filter((row) => row.confirm).length,
    auditFunctions: functionRows.filter((row) => row.audit).length,
    callableFunctions: functionRows.filter((row) => row.callable).length,
    linkedActions: links.length,
    linkedWrites: links.filter((row) => row.writes).length,
    linkedWritesNoConfirm: links.filter((row) => row.writes && !row.confirm).length,
    linkedWritesNoAudit: links.filter((row) => row.writes && !row.audit).length,
    missingFunctions: links.filter((row) => !row.found).length
  };
}

function attr(raw, name) {
  return (raw.match(new RegExp(`${name}="([^"]*)"`, 'i')) || [])[1] || '';
}
