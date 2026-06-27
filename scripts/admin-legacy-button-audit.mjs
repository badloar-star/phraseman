import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'admin', 'index.html');
const outDir = path.join(root, '.codex-tmp', 'admin-audit');

const html = fs.readFileSync(sourcePath, 'utf8');
const sections = collectSections(html);
const buttons = collectButtons(html, sections);
const functions = collectFunctions(html);
const links = linkButtonsToFunctions(buttons, functions);
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

function collectButtons(source, sectionRows) {
  const buttonRe = /<button\b[\s\S]*?<\/button>/gi;
  const dangerRe = /delete|remove|purge|ban|disable|deactivate|cleanup|reset|force|grant|save|send|publish|seed|repair|migrat|wipe|bulk|mark|set|update/i;
  const writeRe = /save|set|update|delete|remove|purge|ban|grant|send|seed|repair|cleanup|deactivate|disable|migrat|publish|create|bulk|mark|reset/i;
  const rows = [];
  let match;

  while ((match = buttonRe.exec(source))) {
    const raw = match[0];
    const section = sectionRows.filter((item) => item.index < match.index).at(-1);
    const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const onclick = attr(raw, 'onclick');
    const title = attr(raw, 'title');
    const id = attr(raw, 'id');
    const className = attr(raw, 'class');
    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
    const write = writeRe.test(onclick);
    const hasConfirmSignal = /showConfirmModal|confirm\(|showInputModal/i.test(raw + ' ' + onclick);

    rows.push({
      tab: section?.id || 'pre-sections',
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
    byTab[row.tab] ||= { total: 0, danger: 0, write: 0, noTitle: 0, emoji: 0, directWriteCandidate: 0 };
    byTab[row.tab].total += 1;
    if (row.danger) byTab[row.tab].danger += 1;
    if (row.write) byTab[row.tab].write += 1;
    if (!row.hasTitle) byTab[row.tab].noTitle += 1;
    if (row.hasEmoji) byTab[row.tab].emoji += 1;
    if (row.directWriteCandidate) byTab[row.tab].directWriteCandidate += 1;
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

function linkButtonsToFunctions(buttonRows, functionRows) {
  const links = [];
  for (const button of buttonRows) {
    const names = [...button.onclick.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)]
      .map((match) => match[1])
      .filter((name) => !['if', 'typeof', 'event', 'document', 'window'].includes(name));
    for (const name of names) {
      const fn = functionRows.find((row) => row.name === name);
      links.push({
        tab: button.tab,
        line: button.line,
        text: button.text,
        onclick: button.onclick,
        function: name,
        found: Boolean(fn),
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
