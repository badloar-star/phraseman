// Static audit: find JSX components whose import resolves to a non-function export.
// Catches "Component is not a function (it is Object)" render errors.
import fs from 'fs';
import path from 'path';

const ROOTS = ['app', 'components', 'contexts', 'hooks'];
const exts = ['.tsx', '.ts', '.jsx', '.js'];

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (exts.includes(path.extname(e.name))) out.push(full);
  }
  return out;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null; // only local
  const base = path.resolve(path.dirname(fromFile), spec);
  const cands = [];
  for (const ext of exts) cands.push(base + ext);
  for (const ext of exts) cands.push(path.join(base, 'index' + ext));
  // also bare path if it already has extension
  cands.unshift(base);
  for (const c of cands) {
    try { if (fs.statSync(c).isFile()) return c; } catch {}
  }
  return null;
}

// What does `name` export resolve to in `file`? returns 'function' | 'object' | 'unknown' | 'missing' | 'reexport'
function classifyExport(file, name) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch { return 'missing'; }

  if (name === 'default') {
    // export default function / class / arrow / memo / forwardRef / styled
    if (/export\s+default\s+function\b/.test(src)) return 'function';
    if (/export\s+default\s+class\b/.test(src)) return 'function';
    const m = src.match(/export\s+default\s+([A-Za-z0-9_$.]+)\s*;?/);
    if (m) {
      const ref = m[1];
      // default export of a named binding -> look up that binding
      if (/^(React\.)?(memo|forwardRef)$/.test(ref)) return 'function';
      return classifyLocal(src, ref);
    }
    if (/export\s+default\s+\(/.test(src)) return 'function'; // arrow/HOC call
    if (/export\s+default\s+(React\.)?(memo|forwardRef|styled)/.test(src)) return 'function';
    if (/export\s+default\s+\{/.test(src)) return 'object';
    if (/export\s+default\s+\[/.test(src)) return 'object';
    if (/export\s+default\b/.test(src)) return 'unknown';
    return 'missing';
  }

  // named export forms
  const reExport = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from`);
  if (reExport.test(src)) return 'reexport';
  if (new RegExp(`export\\s+(async\\s+)?function\\s+${name}\\b`).test(src)) return 'function';
  if (new RegExp(`export\\s+class\\s+${name}\\b`).test(src)) return 'function';
  if (new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(React\\.)?(memo|forwardRef|styled)`).test(src)) return 'function';
  if (new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(async\\s*)?\\(`).test(src)) return 'function';
  if (new RegExp(`export\\s+const\\s+${name}\\s*=\\s*[A-Za-z0-9_$]+\\s*=>`).test(src)) return 'function';
  if (new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\{`).test(src)) return 'object';
  if (new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\[`).test(src)) return 'object';
  // local const then exported in a list: export { name }
  const exportList = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`);
  if (exportList.test(src)) return classifyLocal(src, name);
  // exported but value unclear
  if (new RegExp(`export\\s+const\\s+${name}\\b`).test(src)) return 'unknown';
  return 'missing';
}

function classifyLocal(src, name) {
  if (new RegExp(`function\\s+${name}\\b`).test(src)) return 'function';
  if (new RegExp(`class\\s+${name}\\b`).test(src)) return 'function';
  if (new RegExp(`const\\s+${name}\\s*=\\s*(React\\.)?(memo|forwardRef|styled)`).test(src)) return 'function';
  if (new RegExp(`const\\s+${name}\\s*=\\s*(async\\s*)?\\(`).test(src)) return 'function';
  if (new RegExp(`const\\s+${name}\\s*=\\s*[A-Za-z0-9_$]+\\s*=>`).test(src)) return 'function';
  if (new RegExp(`const\\s+${name}\\s*=\\s*\\{`).test(src)) return 'object';
  if (new RegExp(`const\\s+${name}\\s*=\\s*\\[`).test(src)) return 'object';
  return 'unknown';
}

const files = ROOTS.flatMap(r => walk(r));
const findings = [];

const importRe = /import\s+(?:([A-Za-z0-9_$]+)\s*,\s*)?(?:\{([^}]*)\})?\s*(?:([A-Za-z0-9_$]+)\s+)?from\s+['"]([^'"]+)['"]/g;
// simpler: handle default + named separately
const defRe = /import\s+([A-Za-z0-9_$]+)\s*(?:,\s*\{([^}]*)\})?\s*from\s+['"]([^'"]+)['"]/g;
const namedOnlyRe = /import\s+\{([^}]*)\}\s*from\s+['"]([^'"]+)['"]/g;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  // collect imports: map localName -> {file, exportName}
  const imports = {};
  let m;
  // capture full import statements to detect `import type`
  const stmtRe = /import\s+(type\s+)?([A-Za-z0-9_$]+)?\s*,?\s*(?:\{([^}]*)\})?\s*from\s+['"]([^'"]+)['"]/g;
  while ((m = stmtRe.exec(src))) {
    const [, typeKw, defName, named, spec] = m;
    const resolved = resolveImport(file, spec);
    if (!resolved) continue;
    const isTypeImport = !!typeKw;
    if (defName && !isTypeImport) imports[defName] = { resolved, exportName: 'default', spec, isType: false };
    if (named) {
      for (let n of named.split(',')) {
        n = n.trim(); if (!n) continue;
        const memberType = /^type\s+/.test(n);
        n = n.replace(/^type\s+/, '');
        const parts = n.split(/\s+as\s+/);
        const orig = parts[0].trim(); const local = (parts[1] || parts[0]).trim();
        if (!imports[local]) imports[local] = { resolved, exportName: orig, spec, isType: isTypeImport || memberType };
      }
    }
  }

  // find genuine JSX usages: <LocalName followed by whitespace+prop, or /successive >, but NOT TS generic <T> in type position.
  for (const local of Object.keys(imports)) {
    if (!/^[A-Z]/.test(local)) continue; // components are PascalCase
    if (imports[local].isType) continue; // `import type` — never a runtime value
    // real JSX: <Name prop=... | <Name> | <Name/> | <Name\n  preceded by ( return >, {, ( or start
    const jsxRe = new RegExp(`(^|[(\\s={>?:&|,])<${local}(\\s+[A-Za-z{]|\\s*/?>|\\s*\\n)`, 'm');
    const usedAsJsx = jsxRe.test(src);
    // exclude pure generic usage like useState<Name>(), Array<Name>, : <Name>
    if (!usedAsJsx) continue;
    const info = imports[local];
    const kind = classifyExport(info.resolved, info.exportName);
    if (kind === 'object' || kind === 'missing') {
      findings.push({
        file: path.relative('.', file),
        local,
        exportName: info.exportName,
        target: path.relative('.', info.resolved),
        kind,
      });
    }
  }
}

if (!findings.length) {
  console.log('NO_COMPONENT_OBJECT_MISMATCH_FOUND');
} else {
  console.log(`FOUND ${findings.length} suspicious component import(s):\n`);
  for (const f of findings) {
    console.log(`[${f.kind.toUpperCase()}] <${f.local}> in ${f.file}`);
    console.log(`    imports '${f.exportName}' from ${f.target}`);
  }
}
