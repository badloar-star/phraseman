import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['app', 'components', 'hooks'];
const ALLOWLIST_START = '-- ANALYTICS_EVENT_ALLOWLIST_START';
const ALLOWLIST_END = '-- ANALYTICS_EVENT_ALLOWLIST_END';
const EXCLUDED_DIRECTORIES = new Set([
  '.git', '.worktrees', '.claude', '.codex', 'node_modules', 'build', 'dist',
  'coverage', 'generated', '__generated__',
]);

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function sourceFiles(relativeRoot) {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name)) visit(path.join(directory, entry.name));
        continue;
      }
      if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        files.push(path.join(directory, entry.name));
      }
    }
  };
  visit(absoluteRoot);
  return files.sort();
}

function parseGovernance() {
  return JSON.parse(readText('app/product_analytics_governance.json'));
}

function calledEvents() {
  const names = new Set();
  const callPattern = /\b(?:trackEvent|logEvent)\(\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g;
  for (const relativeRoot of SOURCE_ROOTS) {
    for (const file of sourceFiles(relativeRoot)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(callPattern)) names.add(match[1]);
    }
  }
  return [...names].sort();
}

function dynamicRuntimeEvidence() {
  const contractSource = readText('app/product_analytics_contract.ts');
  const runtimeSource = readText('app/product_analytics_runtime.ts');
  const observerSource = readText('app/product_analytics_runtime_observer.tsx');
  const union = contractSource.match(/export type ProductRuntimeEventName\s*=([\s\S]*?);/)?.[1] ?? '';
  const declaredRuntimeEvents = [...union.matchAll(/'([A-Za-z][A-Za-z0-9_]*)'/g)].map(match => match[1]);
  const emittedRuntimeEvents = new Set(
    [...runtimeSource.matchAll(/\bemit\(\s*'([A-Za-z][A-Za-z0-9_]*)'/g)].map(match => match[1]),
  );
  const bridgePresent = /trackEvent\(event\.eventName\s*,/.test(observerSource);
  const errors = [];
  if (!bridgePresent) errors.push('runtime_analytics_bridge_missing');
  for (const name of declaredRuntimeEvents) {
    if (!emittedRuntimeEvents.has(name)) errors.push(`runtime_event_without_emit:${name}`);
  }
  return {
    events: bridgePresent
      ? declaredRuntimeEvents.filter(name => emittedRuntimeEvents.has(name))
      : [],
    errors,
  };
}

function onboardingWrapperEvidence() {
  const source = readText('components/CleanOnboarding.tsx');
  const bridgePresent = /function\s+trackOnboarding\([^)]*\)[\s\S]*?trackEvent\(action\s*,/.test(source);
  const events = bridgePresent
    ? [...source.matchAll(/\btrackOnboarding\(\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g)].map(match => match[1])
    : [];
  return {
    events: [...new Set(events)].sort(),
    errors: bridgePresent ? [] : ['onboarding_analytics_bridge_missing'],
  };
}

function warehousedEvents() {
  const source = readText('functions/src/admin_product_analytics.ts');
  const start = source.indexOf(ALLOWLIST_START);
  const end = source.indexOf(ALLOWLIST_END, start + ALLOWLIST_START.length);
  if (start < 0 || end <= start) return [];
  const boundedSource = source.slice(start + ALLOWLIST_START.length, end);
  const list = boundedSource.match(/event_name\s+IN\s*\(([\s\S]*?)\n\s*\)/)?.[1];
  if (!list) return [];
  return [...list.matchAll(/'([A-Za-z][A-Za-z0-9_]*)'/g)]
    .map(match => match[1])
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
}

function warehouseRowKinds() {
  const source = readText('functions/src/admin_product_analytics.ts');
  return new Set(
    [...source.matchAll(/SELECT\s+'([a-z][a-z0-9_]*)'\s+AS\s+row_kind/g)].map(match => match[1]),
  );
}

function warehouseEventParamFields() {
  const source = readText('functions/src/admin_product_analytics.ts');
  return [...new Set(
    [...source.matchAll(/WHERE\s+key\s*=\s*'([a-z][a-z0-9_]*)'/g)].map(match => match[1]),
  )].sort();
}

function buildReport() {
  const governance = parseGovernance();
  const catalog = governance.events;
  const declared = new Set(catalog.map(event => event.name));
  const aliases = new Map();
  for (const event of catalog) {
    for (const alias of event.aliases ?? []) aliases.set(alias, event.name);
  }
  const canonical = value => aliases.get(value) ?? value;
  const literalCalled = calledEvents();
  const runtimeEvidence = dynamicRuntimeEvidence();
  const onboardingEvidence = onboardingWrapperEvidence();
  const warehoused = warehousedEvents();
  const rowKinds = warehouseRowKinds();
  const canonicalCalled = new Set([
    ...literalCalled.map(canonical),
    ...runtimeEvidence.events.map(canonical),
    ...onboardingEvidence.events.map(canonical),
  ].filter(name => declared.has(name)));
  const unknownCalled = [...new Set([...literalCalled, ...onboardingEvidence.events])]
    .filter(name => !declared.has(canonical(name)))
    .sort();
  const unknownWarehoused = warehoused.filter(name => !declared.has(canonical(name)));
  const catalogWarehouse = new Set(
    catalog.filter(event => event.warehouse === 'product').map(event => event.name),
  );
  const warehouseSet = new Set(warehoused.map(canonical));
  const catalogWarehouseMissingFromSql = [...catalogWarehouse]
    .filter(name => !warehouseSet.has(name))
    .sort();
  const declaredWithoutCallSite = [...declared].filter(name => !canonicalCalled.has(name)).sort();
  const validMeasuredEvents = new Set();
  const metricErrors = [];
  for (const metric of governance.metrics) {
    const missingRows = metric.rowKinds.filter(rowKind => !rowKinds.has(rowKind));
    for (const rowKind of missingRows) metricErrors.push(`metric_row_kind_missing:${metric.id}:${rowKind}`);
    for (const eventName of metric.events) {
      if (!declared.has(eventName)) {
        metricErrors.push(`metric_event_unknown:${metric.id}:${eventName}`);
      } else if (missingRows.length === 0) {
        validMeasuredEvents.add(eventName);
      }
    }
  }
  const warehousedWithoutMetric = [...catalogWarehouse]
    .filter(name => !validMeasuredEvents.has(name))
    .sort();
  const warehouseFields = warehouseEventParamFields();
  const unknownWarehouseFields = warehouseFields
    .filter(field => !governance.fields[field])
    .sort();
  const errors = [
    ...runtimeEvidence.errors,
    ...onboardingEvidence.errors,
    ...unknownWarehoused.map(name => `unknown_warehouse_event:${name}`),
    ...catalogWarehouseMissingFromSql.map(name => `catalog_event_missing_from_sql:${name}`),
    ...declaredWithoutCallSite.map(name => `declared_event_without_call_evidence:${name}`),
    ...warehousedWithoutMetric.map(name => `warehouse_event_without_metric:${name}`),
    ...unknownWarehouseFields.map(name => `warehouse_field_not_governed:${name}`),
    ...metricErrors,
  ];
  if (process.argv.includes('--strict-all-events')) {
    errors.push(...unknownCalled.map(name => `unknown_called_event:${name}`));
  }
  return {
    schemaVersion: 1,
    summary: {
      declared: declared.size,
      called: canonicalCalled.size,
      literalCallSites: literalCalled.length,
      warehoused: warehoused.length,
      measured: validMeasuredEvents.size,
    },
    unknownCalled,
    unknownWarehoused,
    catalogWarehouseMissingFromSql,
    declaredWithoutCallSite,
    warehousedWithoutMetric,
    unknownWarehouseFields,
    errors,
  };
}

const report = buildReport();
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(`Analytics contract: ${JSON.stringify(report.summary)}\n`);
  if (report.unknownCalled.length) {
    process.stdout.write(`Warnings: ${report.unknownCalled.length} non-governed call-site events\n`);
  }
  for (const error of report.errors) process.stderr.write(`${error}\n`);
}
process.exitCode = report.errors.length ? 1 : 0;
