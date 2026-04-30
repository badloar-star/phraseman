#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "atlas");

const SOURCE_ROOTS = ["app", "components", "hooks", "contexts", path.join("functions", "src")];
const IGNORE_DIRS = new Set(["node_modules", ".git", ".expo", ".claude", ".cursor", ".firebase", "dist", "android", "ios", "assets", "maestro", "tests"]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (CODE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function uniqBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function routeFromAppFile(relPath) {
  if (!relPath.startsWith("app/")) return null;
  if (!/\.(tsx?|jsx?)$/.test(relPath)) return null;
  let route = relPath.replace(/^app\//, "").replace(/\.(tsx?|jsx?)$/, "");
  if (route.endsWith("/index")) route = route.slice(0, -6);
  route = route.replace(/\/_layout$/, "");
  route = route.replace(/\(tabs\)\//g, "");
  return route ? `/${route}` : "/";
}

function literalText(node) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    const head = node.head?.text ?? "";
    return `${head}\${...}`;
  }
  return null;
}

function exprToShortText(node) {
  if (!node) return "";
  const raw = node.getText().replace(/\s+/g, " ").trim();
  return raw.length > 180 ? `${raw.slice(0, 180)}...` : raw;
}

function getJsxTagName(node) {
  const tag = node.tagName;
  if (!tag) return "";
  return tag.getText();
}

function getJsxAttribute(node, attrName) {
  const attrs = node.attributes?.properties ?? [];
  for (const a of attrs) {
    if (ts.isJsxAttribute(a) && a.name.text === attrName) return a;
  }
  return null;
}

function extractBindingNames(nameNode, out = []) {
  if (ts.isIdentifier(nameNode)) {
    out.push(nameNode.text);
    return out;
  }
  if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    for (const el of nameNode.elements) {
      if (ts.isBindingElement(el)) extractBindingNames(el.name, out);
    }
  }
  return out;
}

function resolveImportPath(fromFile, imp) {
  const fromDir = path.dirname(path.join(ROOT, fromFile));
  const tryBase = imp.startsWith(".") ? path.resolve(fromDir, imp) : path.resolve(ROOT, imp);
  const candidates = [
    tryBase,
    `${tryBase}.ts`,
    `${tryBase}.tsx`,
    `${tryBase}.js`,
    `${tryBase}.jsx`,
    path.join(tryBase, "index.ts"),
    path.join(tryBase, "index.tsx"),
    path.join(tryBase, "index.js"),
    path.join(tryBase, "index.jsx"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return toPosix(path.relative(ROOT, c));
  }
  return null;
}

function analyzeFile(absPath) {
  const relPath = toPosix(path.relative(ROOT, absPath));
  const text = safeRead(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const scriptKind = ext === ".tsx" ? ts.ScriptKind.TSX : ext === ".jsx" ? ts.ScriptKind.JSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, scriptKind);

  const exports = [];
  const functions = [];
  const imports = [];
  const importSymbols = [];
  const navCalls = [];
  const buttons = [];
  const storageKeys = [];
  const firestorePaths = [];
  const events = [];
  const calls = [];

  function visit(node, fnCtx = null) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const modulePath = literalText(node.moduleSpecifier);
      if (modulePath) imports.push(modulePath);
      if (modulePath && node.importClause) {
        if (node.importClause.name) {
          importSymbols.push({ local: node.importClause.name.text, imported: "default", from: modulePath });
        }
        const nb = node.importClause.namedBindings;
        if (nb && ts.isNamedImports(nb)) {
          for (const el of nb.elements) {
            importSymbols.push({ local: el.name.text, imported: (el.propertyName?.text ?? el.name.text), from: modulePath });
          }
        }
      }
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      functions.push(node.name.text);
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) exports.push(node.name.text);
      fnCtx = node.name.text;
    }

    if (ts.isVariableStatement(node)) {
      const isExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      for (const d of node.declarationList.declarations) {
        const init = d.initializer;
        const isFunctionLike =
          !!init &&
          (ts.isArrowFunction(init) ||
            ts.isFunctionExpression(init) ||
            ts.isClassExpression(init) ||
            ts.isCallExpression(init));
        if (!isFunctionLike) continue;
        for (const n of extractBindingNames(d.name)) {
          functions.push(n);
          if (isExport) exports.push(n);
        }
      }
    }

    if (ts.isCallExpression(node)) {
      const exprTxt = exprToShortText(node.expression);
      const firstArg = node.arguments?.[0];
      const firstArgText = firstArg ? exprToShortText(firstArg) : "";
      const firstArgLiteral = literalText(firstArg);

      calls.push({
        fromFunction: fnCtx,
        callee: exprTxt,
        arg0: firstArgText,
      });

      if (/router\.(push|replace|navigate|back)$/.test(exprTxt)) {
        navCalls.push({ action: exprTxt.split(".").pop(), target: firstArgText || "(none)", dynamic: !firstArgLiteral });
      }

      if (/AsyncStorage\.(getItem|setItem|removeItem|mergeItem)$/.test(exprTxt) && firstArgLiteral) {
        storageKeys.push(firstArgLiteral);
      }

      if (/(^|\.)(doc|collection)$/.test(exprTxt) && firstArgLiteral) {
        firestorePaths.push(firstArgLiteral);
      }

      if (/(DeviceEventEmitter|NativeEventEmitter)\.(emit|addListener)$/.test(exprTxt) && firstArgLiteral) {
        events.push({ kind: exprTxt.split(".").pop(), name: firstArgLiteral });
      }
    }

    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = getJsxTagName(node);
      const onPressAttr = getJsxAttribute(node, "onPress");
      if (onPressAttr) {
        let handler = "";
        const init = onPressAttr.initializer;
        if (init && ts.isJsxExpression(init)) handler = exprToShortText(init.expression);
        buttons.push({ type: tag, handler, text: "", dynamic: /\(|=>/.test(handler) });
      }
      const hrefAttr = getJsxAttribute(node, "href");
      if (hrefAttr?.initializer) {
        if (ts.isStringLiteral(hrefAttr.initializer)) {
          navCalls.push({ action: "href", target: hrefAttr.initializer.text, dynamic: false });
        } else if (ts.isJsxExpression(hrefAttr.initializer)) {
          navCalls.push({ action: "href", target: exprToShortText(hrefAttr.initializer.expression), dynamic: true });
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, fnCtx));
  }

  visit(sourceFile, null);

  return {
    file: relPath,
    route: routeFromAppFile(relPath),
    exports: uniqBy(exports, (x) => x).sort(),
    functions: uniqBy(functions, (x) => x).sort(),
    imports: uniqBy(imports, (x) => x),
    importSymbols: uniqBy(importSymbols, (x) => `${x.local}:${x.imported}:${x.from}`),
    navCalls: uniqBy(navCalls, (x) => `${x.action}:${x.target}:${x.dynamic}`),
    buttons: uniqBy(buttons, (x) => `${x.type}:${x.handler}:${x.dynamic}`),
    storageKeys: uniqBy(storageKeys, (x) => x).sort(),
    firestorePaths: uniqBy(firestorePaths, (x) => x).sort(),
    events: uniqBy(events, (x) => `${x.kind}:${x.name}`),
    calls: uniqBy(calls, (x) => `${x.fromFunction}:${x.callee}:${x.arg0}`),
  };
}

function buildInternalImportEdges(files) {
  const edges = [];
  for (const f of files) {
    for (const imp of f.imports) {
      const local = imp.startsWith(".") || /^(app|components|hooks|contexts|functions)\//.test(imp);
      if (!local) continue;
      edges.push({ from: f.file, to: resolveImportPath(f.file, imp) ?? imp });
    }
  }
  return uniqBy(edges, (x) => `${x.from}:${x.to}`);
}

function buildCallGraph(files, internalEdges) {
  const fnToFile = new Map();
  for (const f of files) {
    for (const name of f.functions) {
      if (!fnToFile.has(name)) fnToFile.set(name, []);
      fnToFile.get(name).push(f.file);
    }
  }

  const importLookup = new Map();
  for (const f of files) {
    const byLocal = new Map();
    for (const s of f.importSymbols) byLocal.set(s.local, s);
    importLookup.set(f.file, byLocal);
  }

  const graph = [];
  for (const f of files) {
    const importMap = importLookup.get(f.file) ?? new Map();
    for (const c of f.calls) {
      const calleeHead = c.callee.split(/[.(\s]/)[0];
      if (!calleeHead) continue;
      if (importMap.has(calleeHead)) {
        const sym = importMap.get(calleeHead);
        const targetFile = resolveImportPath(f.file, sym.from) ?? sym.from;
        graph.push({
          fromFile: f.file,
          fromFunction: c.fromFunction,
          to: `${targetFile}::${sym.imported}`,
          via: "imported-symbol",
          callee: c.callee,
        });
        continue;
      }
      const localTargets = fnToFile.get(calleeHead);
      if (localTargets?.length) {
        graph.push({
          fromFile: f.file,
          fromFunction: c.fromFunction,
          to: `${localTargets[0]}::${calleeHead}`,
          via: localTargets[0] === f.file ? "local-symbol" : "global-symbol",
          callee: c.callee,
        });
      }
    }
  }
  return uniqBy(graph, (x) => `${x.fromFile}:${x.fromFunction}:${x.to}:${x.callee}`);
}

function makeHtml(model) {
  const payload = JSON.stringify(model);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>PhraseMan Full Atlas</title>
  <style>
    body{font-family:Inter,Segoe UI,Arial,sans-serif;background:#0b1020;color:#e7ecff;margin:0}
    header{padding:16px 20px;background:#121a33;position:sticky;top:0;border-bottom:1px solid #2a3568}
    h1{margin:0 0 8px 0;font-size:20px}
    .sub{opacity:.8;font-size:13px}
    .bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .tabs{display:flex;gap:8px;margin-top:10px}
    .tab{background:#0f1730;color:#e7ecff;border:1px solid #30407a;border-radius:999px;padding:6px 12px;cursor:pointer}
    .tab.active{background:#22316a}
    input,select{background:#0f1730;color:#e7ecff;border:1px solid #30407a;border-radius:8px;padding:8px}
    main{padding:16px 20px;display:grid;grid-template-columns:320px 1fr;gap:16px}
    .panel{background:#121a33;border:1px solid #27356a;border-radius:12px;padding:12px}
    .list{max-height:74vh;overflow:auto}
    .item{padding:8px;border-radius:8px;cursor:pointer}
    .item:hover,.item.active{background:#1a2550}
    .k{opacity:.7;font-size:12px}
    .danger{color:#ff9ea2}
    code{color:#9fd1ff}
    table{width:100%;border-collapse:collapse}
    td,th{padding:6px;border-bottom:1px solid #27356a;vertical-align:top;text-align:left}
    .chips{display:flex;flex-wrap:wrap;gap:6px}
    .chip{background:#1a2550;border:1px solid #324587;border-radius:999px;padding:2px 8px;font-size:12px}
    .path-card{background:#10183a;border:1px solid #2f4486;border-radius:10px;padding:10px;margin-bottom:10px}
    .path-title{font-weight:600;margin-bottom:6px}
    .path-line{font-size:13px;line-height:1.6}
    .muted{opacity:.8}
  </style>
</head>
<body>
  <header>
    <h1>PhraseMan Full Architecture Atlas</h1>
    <div class="sub">AST-generated: screens, routes, buttons, navigation, functions, imports, call graph, storage, firestore, events</div>
    <div class="tabs">
      <button class="tab active" id="tab-files">File Explorer</button>
      <button class="tab" id="tab-critical">Critical Paths</button>
    </div>
    <div class="bar">
      <input id="q" placeholder="Search file/function/route/event..." style="min-width:320px" />
      <select id="kind">
        <option value="all">All files</option>
        <option value="route">Route files only</option>
        <option value="firebase">Firestore-related</option>
        <option value="storage">AsyncStorage-related</option>
        <option value="dynamic-nav">Dynamic navigation</option>
      </select>
    </div>
  </header>
  <main>
    <section class="panel">
      <div class="k" id="count"></div>
      <div class="list" id="list"></div>
    </section>
    <section class="panel" id="detail"><div class="k">Select a file on the left</div></section>
  </main>
<script>
const model = ${payload};
const listEl = document.getElementById('list');
const detailEl = document.getElementById('detail');
const qEl = document.getElementById('q');
const kindEl = document.getElementById('kind');
const countEl = document.getElementById('count');
const tabFilesEl = document.getElementById('tab-files');
const tabCriticalEl = document.getElementById('tab-critical');
let selected = null;
let mode = 'files';

function row(k, v){
  if(!v || (Array.isArray(v) && v.length===0)) return '';
  if(Array.isArray(v)){
    return '<tr><th>'+k+'</th><td><div class="chips">'+v.map(x=>'<span class="chip">'+escapeHtml(typeof x==='string'?x:JSON.stringify(x))+'</span>').join('')+'</div></td></tr>';
  }
  return '<tr><th>'+k+'</th><td>'+escapeHtml(String(v))+'</td></tr>';
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}
function textBlob(f){
  return [f.file,f.route,...f.exports,...f.functions,...f.imports,...f.storageKeys,...f.firestorePaths,...f.events.map(e=>e.name),...f.navCalls.map(n=>n.target),...f.calls.map(c=>c.callee)].join(' ').toLowerCase();
}
function filterFiles(){
  const q = qEl.value.trim().toLowerCase();
  const kind = kindEl.value;
  let files = model.files;
  if(kind==='route') files = files.filter(f=>!!f.route);
  if(kind==='firebase') files = files.filter(f=>f.firestorePaths.length>0);
  if(kind==='storage') files = files.filter(f=>f.storageKeys.length>0);
  if(kind==='dynamic-nav') files = files.filter(f=>f.navCalls.some(n=>n.dynamic));
  if(q) files = files.filter(f=>textBlob(f).includes(q));
  return files;
}
function impactedCriticalPaths(file){
  return (model.criticalPaths || []).filter(p => (p.nodes || []).includes(file));
}
function renderTabs(){
  tabFilesEl.classList.toggle('active', mode==='files');
  tabCriticalEl.classList.toggle('active', mode==='critical');
  const isFiles = mode==='files';
  qEl.style.display = isFiles ? '' : 'none';
  kindEl.style.display = isFiles ? '' : 'none';
}
function renderList(){
  renderTabs();
  if(mode === 'critical'){
    renderCritical();
    return;
  }
  const files = filterFiles();
  countEl.textContent = files.length + ' files';
  listEl.innerHTML = files.map((f,i)=>'<div class="item '+(selected===f.file?'active':'')+'" data-file="'+f.file+'"><div><code>'+escapeHtml(f.file)+'</code></div><div class="k">'+(f.route||'')+'</div></div>').join('');
  if(!selected && files[0]) selected = files[0].file;
  if(selected && !files.some(f=>f.file===selected)) selected = files[0]?.file || null;
  renderDetail();
}
function renderCritical(){
  const paths = model.criticalPaths || [];
  countEl.textContent = paths.length + ' critical paths';
  listEl.innerHTML = paths.map((p, idx)=>'<div class="item" data-critical="'+idx+'"><div><strong>'+escapeHtml(p.name)+'</strong></div><div class="k">'+p.nodes.length+' nodes</div></div>').join('');
  const selectedFile = selected || '';
  const impacted = selectedFile ? impactedCriticalPaths(selectedFile) : [];
  detailEl.innerHTML = ''
    + (selectedFile ? '<div class="k">Selected file: <code>'+escapeHtml(selectedFile)+'</code></div>' : '<div class="k">Select a file in File Explorer to see impact.</div>')
    + (selectedFile ? '<div class="'+(impacted.length?'danger':'k')+'">Critical impact: '+impacted.length+' path(s)</div>' : '')
    + '<hr style="border-color:#27356a;opacity:.4" />'
    + paths.map((p)=>{
      const hit = selectedFile && p.nodes.includes(selectedFile);
      return '<div class="path-card" style="'+(hit?'border-color:#ff9ea2;background:#2a1630':'')+'">'
        + '<div class="path-title">'+escapeHtml(p.name)+(hit?' <span class="danger">[IMPACTED]</span>':'')+'</div>'
        + '<div class="path-line">'+p.nodes.map(n=>'<code>'+escapeHtml(n)+'</code>').join(' <span class="muted">→</span> ')+'</div>'
        + '</div>';
    }).join('');
}
function renderDetail(){
  const f = model.files.find(x=>x.file===selected);
  if(!f){ detailEl.innerHTML = '<div class="k">No file selected</div>'; return; }
  const impacted = impactedCriticalPaths(f.file);
  detailEl.innerHTML = '<h3><code>'+escapeHtml(f.file)+'</code></h3><table>'
    + row('Route', f.route || '')
    + row('Exported symbols', f.exports)
    + row('Functions', f.functions)
    + row('Imports', f.imports)
    + row('Navigation calls', f.navCalls.map(n=>n.action+' -> '+n.target+(n.dynamic?' [dynamic]':'')))
    + row('Buttons', f.buttons.map(b=>b.type+' onPress='+b.handler+(b.text?(' text="'+b.text+'"') : '')))
    + row('Call expressions', f.calls.map(c=>(c.fromFunction||'<module>')+' -> '+c.callee))
    + row('AsyncStorage keys', f.storageKeys)
    + row('Firestore paths', f.firestorePaths)
    + row('Events', f.events.map(e=>e.kind+':'+e.name))
    + row('Critical paths impacted', impacted.map(p=>p.name))
    + '</table>';
}
listEl.addEventListener('click', (e)=>{
  if(mode === 'files'){
    const el = e.target.closest('[data-file]');
    if(!el) return;
    selected = el.dataset.file;
    renderList();
    return;
  }
  const el = e.target.closest('[data-critical]');
  if(!el) return;
  const idx = Number(el.dataset.critical);
  const p = (model.criticalPaths || [])[idx];
  if(!p) return;
  detailEl.innerHTML = '<div class="path-card"><div class="path-title">'+escapeHtml(p.name)+'</div><div class="path-line">'+p.nodes.map(n=>'<code>'+escapeHtml(n)+'</code>').join(' <span class="muted">→</span> ')+'</div></div>';
});
qEl.addEventListener('input', renderList);
kindEl.addEventListener('change', renderList);
tabFilesEl.addEventListener('click', ()=>{ mode = 'files'; renderList(); });
tabCriticalEl.addEventListener('click', ()=>{ mode = 'critical'; renderList(); });
renderList();
</script>
</body>
</html>`;
}

function makeClaudeMarkdown(model) {
  const topRoutes = model.files.filter((f) => f.route).slice(0, 120);
  const topEvents = model.events.slice(0, 200);
  const topStorage = model.storageKeys.slice(0, 200);
  const topFirestore = model.firestorePaths.slice(0, 200);
  return `# PhraseMan Code Atlas (for Claude)

This file is generated from source and intended to be loaded as working context.

## Quick Stats
- Total code files indexed: ${model.stats.totalFiles}
- Route files: ${model.stats.routeFiles}
- Exported symbols: ${model.stats.exportedSymbols}
- Functions detected: ${model.stats.functions}
- Internal import edges: ${model.stats.internalImportEdges}
- Call graph edges: ${model.stats.callGraphEdges}
- AsyncStorage keys: ${model.stats.storageKeys}
- Firestore paths: ${model.stats.firestorePaths}
- Event names: ${model.stats.events}

## Entry Points
- \`app/_layout.tsx\`
- \`app/(tabs)/_layout.tsx\`
- \`functions/src/index.ts\`

## Routes (detected)
${topRoutes.map((f) => `- \`${f.route}\` <- \`${f.file}\``).join("\n")}

## Global Events
${topEvents.map((e) => `- \`${e}\``).join("\n")}

## AsyncStorage Keys
${topStorage.map((k) => `- \`${k}\``).join("\n")}

## Firestore Collections/Paths
${topFirestore.map((k) => `- \`${k}\``).join("\n")}

## Call Graph Coverage
- Edge sample count: ${Math.min(model.callGraph.length, 300)}
- Heuristic: imported symbol matching + local/global symbol lookup
- Full graph: \`docs/atlas/atlas.full.json\` -> \`callGraph\`

## Critical Paths
${model.criticalPaths.map((p) => `- **${p.name}**: ${p.nodes.map((n) => `\`${n}\``).join(" -> ")}`).join("\n")}

## Recommended Claude Context Bundle
Load these files first:
- \`docs/MASTER_MAP.md\`
- \`docs/atlas/atlas.claude.md\` (this file)
- \`docs/atlas/atlas.full.json\` (complete machine graph)
- \`docs/atlas/atlas.critical.md\` (high-signal chains)
`;
}

function buildCriticalPaths(model) {
  const fileSet = new Set(model.files.map((f) => f.file));
  const has = (f) => fileSet.has(f);
  const edgeSet = new Set(
    model.callGraph.map((e) => `${e.fromFile}=>${String(e.to).split("::")[0]}`)
  );
  const link = (from, to) => edgeSet.has(`${from}=>${to}`);

  const paths = [];
  const addPath = (name, nodes) => {
    const available = nodes.filter((n) => has(n));
    if (available.length >= 2) paths.push({ name, nodes: available });
  };

  addPath("XP -> Leaderboard -> Hall", [
    "app/xp_manager.ts",
    "app/firestore_leaderboard.ts",
    "app/(tabs)/hall_of_fame.tsx",
  ]);

  addPath("Premium -> Energy -> Gates", [
    "app/revenuecat_init.ts",
    "app/premium_guard.ts",
    "components/PremiumContext.tsx",
    "components/EnergyContext.tsx",
    "app/premium_modal.tsx",
  ]);

  addPath("Arena full game flow", [
    "app/arena_lobby.tsx",
    "contexts/MatchmakingContext.tsx",
    "app/services/arena_db.ts",
    "hooks/use-arena-session.ts",
    "app/arena_game.tsx",
    "app/arena_results.tsx",
    "app/arena_rating.tsx",
  ]);

  addPath("Cloud sync user/progress", [
    "app/cloud_sync.ts",
    "app/stable_id.ts",
    "app/firestore_leaderboard.ts",
    "functions/src/sync_leaderboard.ts",
  ]);

  addPath("Root bootstrap and routing", [
    "app/_layout.tsx",
    "app/(tabs)/_layout.tsx",
    "app/(tabs)/home.tsx",
    "app/(tabs)/settings.tsx",
  ]);

  const enriched = paths.map((p) => {
    const edges = [];
    for (let i = 0; i < p.nodes.length - 1; i += 1) {
      edges.push({
        from: p.nodes[i],
        to: p.nodes[i + 1],
        observedInCallGraph: link(p.nodes[i], p.nodes[i + 1]),
      });
    }
    return { ...p, edges };
  });

  return enriched;
}

function makeCriticalMarkdown(model) {
  return `# PhraseMan Critical Paths

Auto-generated high-signal chains for quick impact analysis.

## How to use
- If your change touches any node below, inspect the whole chain.
- Use \`atlas.full.json\` for deep graph details.

## Paths
${model.criticalPaths
  .map(
    (p) => `### ${p.name}
${p.nodes.map((n) => `- \`${n}\``).join("\n")}
Observed edges:
${p.edges
  .map((e) => `- \`${e.from}\` -> \`${e.to}\` (${e.observedInCallGraph ? "observed" : "heuristic"})`)
  .join("\n")}`
  )
  .join("\n\n")}
`;
}

function run() {
  const files = uniqBy(
    SOURCE_ROOTS.flatMap((root) => walk(path.join(ROOT, root))),
    (f) => toPosix(path.relative(ROOT, f))
  )
    .map(analyzeFile)
    .sort((a, b) => a.file.localeCompare(b.file));

  const internalImportEdges = buildInternalImportEdges(files);
  const callGraph = buildCallGraph(files, internalImportEdges);

  const allStorage = uniqBy(
    files.flatMap((f) => f.storageKeys),
    (x) => x
  ).sort();
  const allFirestore = uniqBy(
    files.flatMap((f) => f.firestorePaths),
    (x) => x
  ).sort();
  const allEvents = uniqBy(
    files.flatMap((f) => f.events.map((e) => e.name)),
    (x) => x
  ).sort();

  const model = {
    generatedAt: new Date().toISOString(),
    stats: {
      totalFiles: files.length,
      routeFiles: files.filter((f) => !!f.route).length,
      exportedSymbols: files.reduce((n, f) => n + f.exports.length, 0),
      functions: files.reduce((n, f) => n + f.functions.length, 0),
      internalImportEdges: internalImportEdges.length,
      callGraphEdges: callGraph.length,
      storageKeys: allStorage.length,
      firestorePaths: allFirestore.length,
      events: allEvents.length,
    },
    storageKeys: allStorage,
    firestorePaths: allFirestore,
    events: allEvents,
    internalImportEdges,
    callGraph,
    files,
  };
  model.criticalPaths = buildCriticalPaths(model);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "atlas.full.json"), JSON.stringify(model, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "atlas.claude.md"), makeClaudeMarkdown(model));
  fs.writeFileSync(path.join(OUT_DIR, "atlas.critical.md"), makeCriticalMarkdown(model));
  fs.writeFileSync(path.join(OUT_DIR, "atlas.critical.json"), JSON.stringify(model.criticalPaths, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "atlas.viewer.html"), makeHtml(model));

  const summary = [
    "Generated atlas:",
    `- docs/atlas/atlas.viewer.html`,
    `- docs/atlas/atlas.claude.md`,
    `- docs/atlas/atlas.critical.md`,
    `- docs/atlas/atlas.critical.json`,
    `- docs/atlas/atlas.full.json`,
    "",
    `Stats: ${JSON.stringify(model.stats)}`,
  ].join("\n");

  console.log(summary);
}

run();
