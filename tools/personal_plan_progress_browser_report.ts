import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export const PERSONAL_PLANS_PROGRESS_BROWSER_REPORT_PATH = path.join(
  process.cwd(),
  'docs',
  'reports',
  'personal-plans-progress-browser-report.html',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type PersonalPlansProgressLayer = {
  id: string;
  label: string;
  percent: number;
  status: string;
};

export type PersonalPlansProgressBrowserReportInput = {
  generatedAt: string;
  handoverPath: string;
  latestCheckpoint: string;
  overallPercent: number;
  layers: PersonalPlansProgressLayer[];
  completedPasses: string[];
  blockers: string[];
  verification: string[];
};

export type PersonalPlansProgressBrowserReportIssueCode =
  | 'invalid_overall_percent'
  | 'invalid_layer_percent'
  | 'missing_layers'
  | 'missing_latest_checkpoint'
  | 'fake_production_ready_progress_claim'
  | 'target_path_not_allowed';

export type PersonalPlansProgressBrowserReportIssue = {
  code: PersonalPlansProgressBrowserReportIssueCode;
  detail: string;
};

export type PersonalPlansProgressBrowserReportSummary = {
  overallPercent: number;
  layerCount: number;
  completedPassCount: number;
  blockerCount: number;
  productionReady: false;
};

export type PersonalPlansProgressBrowserReportBuildResult = {
  valid: boolean;
  issues: PersonalPlansProgressBrowserReportIssue[];
  html?: string;
  summary?: PersonalPlansProgressBrowserReportSummary;
};

export type PersonalPlansProgressBrowserReportWriteResult =
  PersonalPlansProgressBrowserReportBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: PersonalPlansProgressBrowserReportIssueCode,
  detail: string,
): PersonalPlansProgressBrowserReportIssue {
  return { code, detail };
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isPersonalPlansProgressBrowserReportTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function validateInput(
  input: PersonalPlansProgressBrowserReportInput,
): PersonalPlansProgressBrowserReportIssue[] {
  const issues: PersonalPlansProgressBrowserReportIssue[] = [];

  if (!isPercent(input.overallPercent)) {
    issues.push(issue(
      'invalid_overall_percent',
      'Overall progress must be a number between 0 and 100.',
    ));
  }

  if (!hasText(input.latestCheckpoint)) {
    issues.push(issue(
      'missing_latest_checkpoint',
      'Browser progress report needs the latest checkpoint label.',
    ));
  }

  if (input.layers.length === 0) {
    issues.push(issue(
      'missing_layers',
      'Browser progress report needs at least one progress layer.',
    ));
  }

  if (input.layers.some((layer) => !isPercent(layer.percent))) {
    issues.push(issue(
      'invalid_layer_percent',
      'Every progress layer needs a percent between 0 and 100.',
    ));
  }

  if (input.overallPercent >= 100 && input.blockers.length > 0) {
    issues.push(issue(
      'fake_production_ready_progress_claim',
      'Overall progress cannot be 100 while explicit blockers remain.',
    ));
  }

  return issues;
}

function renderList(items: string[], className: string): string {
  return items
    .map((item) => `<li class="${className}">${escapeHtml(item)}</li>`)
    .join('\n');
}

function renderLayers(layers: PersonalPlansProgressLayer[]): string {
  return layers.map((layer) => {
    const percent = Math.round(layer.percent);
    return `
      <article class="layer" data-layer="${escapeHtml(layer.id)}">
        <div class="layer__head">
          <strong>${escapeHtml(layer.label)}</strong>
          <span>${percent}%</span>
        </div>
        <div class="bar" aria-label="${escapeHtml(layer.label)} ${percent}%">
          <div class="bar__fill" style="width: ${percent}%"></div>
        </div>
        <p>${escapeHtml(layer.status)}</p>
      </article>`;
  }).join('\n');
}

function renderHtml(
  input: PersonalPlansProgressBrowserReportInput,
  summary: PersonalPlansProgressBrowserReportSummary,
): string {
  const overallPercent = Math.round(summary.overallPercent);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Personal Plans Progress</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #1c2329;
      --muted: #5f6b75;
      --line: #d9dee3;
      --paper: #f6f7f9;
      --panel: #ffffff;
      --accent: #28705f;
      --warn: #a14d18;
      --block: #9b2d30;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 20px 40px;
    }
    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: end;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 28px; line-height: 1.1; }
    h2 { font-size: 16px; margin-bottom: 12px; }
    .subtle { color: var(--muted); margin-top: 8px; }
    .badge {
      border: 1px solid var(--block);
      color: var(--block);
      background: #fff5f3;
      padding: 8px 10px;
      border-radius: 6px;
      font-weight: 700;
      white-space: nowrap;
    }
    .overall {
      display: grid;
      grid-template-columns: 180px minmax(0, 1fr);
      gap: 20px;
      align-items: center;
      padding: 24px 0;
    }
    .meter {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: conic-gradient(var(--accent) ${overallPercent}%, #dfe5e8 0);
    }
    .meter span {
      width: 108px;
      height: 108px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--panel);
      font-size: 24px;
      font-weight: 700;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
    }
    .layer, section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
    }
    .layer__head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      min-height: 38px;
    }
    .bar {
      height: 10px;
      background: #e4e8eb;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .bar__fill {
      height: 100%;
      background: var(--accent);
    }
    .layer p { color: var(--muted); font-size: 13px; }
    .columns {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    ul {
      margin: 0;
      padding-left: 18px;
    }
    li { margin: 7px 0; }
    .blocker { color: var(--block); }
    .check { color: var(--accent); }
    .verify { color: var(--warn); }
    footer {
      margin-top: 18px;
      color: var(--muted);
      font-size: 13px;
    }
    @media (max-width: 860px) {
      header, .overall, .columns { grid-template-columns: 1fr; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .badge { white-space: normal; }
    }
    @media (max-width: 520px) {
      main { padding: 20px 12px 28px; }
      .grid { grid-template-columns: 1fr; }
      h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Personal Plans Progress</h1>
        <p class="subtle">${escapeHtml(input.latestCheckpoint)}</p>
      </div>
      <div class="badge">Not production-ready yet</div>
    </header>

    <section class="overall" aria-label="Overall progress">
      <div class="meter" aria-label="Overall ${overallPercent}%"><span>${overallPercent}%</span></div>
      <div>
        <h2>Overall ${overallPercent}%</h2>
        <p>Progress is based on verified non-live implementation layers. Scaffold, draft, candidate, dry-run, preflight, handoff, and generated evidence do not count as production-ready.</p>
      </div>
    </section>

    <div class="grid" aria-label="Progress layers">
      ${renderLayers(input.layers)}
    </div>

    <div class="columns">
      <section>
        <h2>Completed Passes</h2>
        <ul>
          ${renderList(input.completedPasses, 'check')}
        </ul>
      </section>
      <section>
        <h2>Open Blockers</h2>
        <ul>
          ${renderList(input.blockers, 'blocker')}
        </ul>
      </section>
      <section>
        <h2>Verification</h2>
        <ul>
          ${renderList(input.verification, 'verify')}
        </ul>
      </section>
    </div>

    <footer>
      Generated at ${escapeHtml(input.generatedAt)} from ${escapeHtml(input.handoverPath)}.
    </footer>
  </main>
</body>
</html>
`;
}

export function buildPersonalPlansProgressBrowserReport(
  input: PersonalPlansProgressBrowserReportInput,
): PersonalPlansProgressBrowserReportBuildResult {
  const issues = validateInput(input);

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  const summary: PersonalPlansProgressBrowserReportSummary = {
    overallPercent: input.overallPercent,
    layerCount: input.layers.length,
    completedPassCount: input.completedPasses.length,
    blockerCount: input.blockers.length,
    productionReady: false,
  };

  return {
    valid: true,
    issues: [],
    html: renderHtml(input, summary),
    summary,
  };
}

export function writePersonalPlansProgressBrowserReport(
  input: PersonalPlansProgressBrowserReportInput,
  options: { targetPath: string },
): PersonalPlansProgressBrowserReportWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isPersonalPlansProgressBrowserReportTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Personal Plans browser progress report can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const result = buildPersonalPlansProgressBrowserReport(input);
  if (!result.valid || !result.html) {
    return result;
  }

  const serialized = result.html;
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    ...result,
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
  };
}
