#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const MARKER = '<!-- phraseman-ai-pr-review -->';
const DEFAULT_MAX_CHARS = 120000;
const MAX_FILES = 300;
const DEFAULT_BLOCKING_SEVERITIES = ['critical'];
const REVIEW_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'sensitive_touches',
    'findings',
    'tests_to_run',
    'canary_guidance',
    'merge_decision',
  ],
  properties: {
    summary: { type: 'string' },
    sensitive_touches: {
      type: 'array',
      items: { type: 'string' },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'severity',
          'title',
          'file',
          'evidence',
          'production_impact',
          'recommended_action',
        ],
        properties: {
          severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
          title: { type: 'string' },
          file: { type: 'string' },
          evidence: { type: 'string' },
          production_impact: { type: 'string' },
          recommended_action: { type: 'string' },
        },
      },
    },
    tests_to_run: {
      type: 'array',
      items: { type: 'string' },
    },
    canary_guidance: { type: 'string' },
    merge_decision: { type: 'string', enum: ['pass', 'fail'] },
  },
};

const requiredEnv = ['GITHUB_REPOSITORY', 'GITHUB_EVENT_PATH', 'GITHUB_TOKEN'];

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function fail(message) {
  console.error(`AI PR reviewer failed: ${message}`);
  process.exit(1);
}

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function clampPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBlockingSeverities() {
  const configured = env('AI_REVIEW_BLOCKING_SEVERITIES');
  if (!configured) {
    return DEFAULT_BLOCKING_SEVERITIES;
  }

  return configured
    .split(',')
    .map((severity) => severity.trim().toLowerCase())
    .filter(Boolean);
}

function detectSensitiveTouches(files) {
  const sensitivePattern = /(^|[/\\_-])(auth|login|logout|sign[-_]?in|sign[-_]?up|account|delete|deletion|remove|payment|payments|purchase|purchases|subscription|subscriptions|billing|invoice|refund|permission|permissions|privacy|personal[-_]?data|firestore|rules|functions|storage)([/\\_.-]|$)/i;

  return files
    .filter((file) => sensitivePattern.test(file.filename))
    .map((file) => file.filename);
}

async function githubRequest(path, { method = 'GET', body } = {}) {
  const [owner, repo] = env('GITHUB_REPOSITORY').split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env('GITHUB_TOKEN')}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub ${method} ${path} returned ${response.status}: ${details}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function pagedGithubRequest(path, limitPages = 30) {
  const results = [];
  for (let page = 1; page <= limitPages; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const pageResults = await githubRequest(`${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(pageResults) || pageResults.length === 0) {
      break;
    }
    results.push(...pageResults);
    if (pageResults.length < 100) {
      break;
    }
  }
  return results;
}

async function setCommitStatus(sha, state, description) {
  const runUrl = env('GITHUB_RUN_ID')
    ? `${env('GITHUB_SERVER_URL', 'https://github.com')}/${env('GITHUB_REPOSITORY')}/actions/runs/${env('GITHUB_RUN_ID')}`
    : undefined;

  await githubRequest(`/statuses/${sha}`, {
    method: 'POST',
    body: {
      state,
      context: 'ai-pr-review/pass',
      description: description.slice(0, 140),
      target_url: runUrl,
    },
  });
}

function buildDiffDigest(files, maxChars) {
  let truncated = false;
  const truncationReasons = [];
  const missingPatchFiles = [];
  const sections = [];
  let currentLength = 0;

  for (const file of files.slice(0, MAX_FILES)) {
    const hasTextualPatch = typeof file.patch === 'string' && file.patch.trim().length > 0;
    if (!hasTextualPatch) {
      missingPatchFiles.push(file.filename);
    }

    const patch = hasTextualPatch
      ? file.patch
      : '[No textual patch available. The file may be binary, renamed, or too large for GitHub patch output.]';
    const section = [
      `diff -- ${file.filename}`,
      `status: ${file.status}; additions: ${file.additions}; deletions: ${file.deletions}`,
      patch,
    ].join('\n');

    const nextLength = currentLength + section.length + (sections.length ? 2 : 0);
    if (nextLength > maxChars) {
      truncated = true;
      truncationReasons.push(`diff exceeded AI_REVIEW_MAX_CHARS=${maxChars}`);
      break;
    }

    sections.push(section);
    currentLength = nextLength;
  }

  if (files.length > MAX_FILES) {
    truncated = true;
    truncationReasons.push(`file count exceeded MAX_FILES=${MAX_FILES}`);
  }

  return {
    text: sections.join('\n\n'),
    truncated,
    truncationReasons,
    missingPatchFiles,
    reviewedFileCount: sections.length,
  };
}

function buildIncompleteCoverageReview({ files, diffDigest, sensitiveFiles }) {
  const findings = [];
  if (diffDigest.truncated) {
    findings.push({
      severity: 'critical',
      title: 'AI review coverage is truncated',
      file: 'pull request',
      evidence: [
        `Reviewed textual patches: ${diffDigest.reviewedFileCount}/${files.length}.`,
        ...diffDigest.truncationReasons,
      ].join(' '),
      production_impact: 'A required merge gate cannot prove production safety when part of the PR diff was omitted from review.',
      recommended_action: 'Split the PR or reduce the diff until the AI reviewer can inspect every changed file before merge.',
    });
  }

  if (diffDigest.missingPatchFiles.length) {
    findings.push({
      severity: 'critical',
      title: 'AI review coverage is missing textual patches',
      file: 'pull request',
      evidence: `GitHub did not provide textual patches for: ${diffDigest.missingPatchFiles.join(', ')}`,
      production_impact: 'The reviewer cannot assess hidden or binary changes for production risk, including generated config, lockfile, asset, or data-contract regressions.',
      recommended_action: 'Provide a reviewable textual diff, split the files into a separately approved PR, or get explicit owner approval before changing the gate configuration.',
    });
  }

  return {
    summary: 'AI reviewer blocked this PR because the review coverage is incomplete.',
    sensitive_touches: sensitiveFiles,
    findings,
    tests_to_run: [
      'Reduce or split the PR until every changed file has a complete textual patch available to the AI reviewer.',
      'Re-run the AI reviewer gate after the diff is fully reviewable.',
    ],
    canary_guidance: 'Do not use canary rollout to compensate for incomplete pre-merge review coverage.',
    merge_decision: 'fail',
  };
}

function buildPrompt({ pr, files, diff, truncated, sensitiveFiles }) {
  const fileSummary = files
    .map((file) => `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`)
    .join('\n');

  const sensitiveSummary = sensitiveFiles.length
    ? sensitiveFiles.map((filename) => `- ${filename}`).join('\n')
    : '- None detected by filename/path heuristics. Still inspect the diff for sensitive behavior.';

  return [
    `Pull request: #${pr.number} ${pr.title}`,
    `Author: ${pr.user?.login || 'unknown'}`,
    `Base: ${pr.base?.ref || 'unknown'} @ ${pr.base?.sha || 'unknown'}`,
    `Head: ${pr.head?.ref || 'unknown'} @ ${pr.head?.sha || 'unknown'}`,
    '',
    'Changed files:',
    fileSummary || '- No files reported by GitHub.',
    '',
    'Sensitive surfaces detected by filename/path heuristics:',
    sensitiveSummary,
    '',
    truncated
      ? 'The diff below is truncated. Mention that large or omitted files may need owner review.'
      : 'The full available GitHub textual patch is included below.',
    '',
    'Diff:',
    diff || '[No textual diff available.]',
  ].join('\n');
}

async function requestOpenAiReview(prompt) {
  const apiKey = env('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required. Configure it as a repository secret before making AI review a required merge check.');
  }

  const model = env('OPENAI_MODEL', 'gpt-5-mini');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: [
        'You are an automated pull request reviewer for the Phraseman React Native/TypeScript repository.',
        'Review architecture, business logic correctness, security, data integrity, performance, and release risk. Do not act as a linter, syntax checker, or style reviewer.',
        'Your win condition is catching what can break in production: incorrect product behavior, broken user flows, regressions, data loss, privacy leaks, billing mistakes, weak authorization, missing validation, missing tests, unsafe workflow changes, and release/canary risks.',
        'Actively look for SQL injection or query-injection vectors, unsafe dynamic filters, untrusted input reaching persistence APIs, authorization bypasses, unhandled edge cases, race conditions, null/undefined failures, state drift, N+1 queries, repeated network/database calls in loops, cache invalidation mistakes, and broken retry/error behavior.',
        'Do not ignore anything that touches authentication, payments, subscriptions, account deletion, data deletion, permissions, personal data, user identity, Firestore/Functions rules, or persistent storage contracts. Every such touch must be explicitly flagged in the review. Escalate even medium-confidence concerns in these areas and explain what evidence the repository owner should check.',
        'Severity policy: critical means the PR may break production behavior, weaken security/privacy, corrupt/delete data, break auth, create payment/subscription risk, introduce query injection, or lacks necessary evidence for a sensitive change. warning means meaningful risk or missing evidence that should be reviewed but is not clearly merge-blocking. info means context-only observation.',
        'Owner approval gate: do not recommend or imply automatic fixes by Codex, AI agents, bots, CI, or any automation. The reviewer may identify risks and recommended actions only. No code changes, config changes, migrations, or data fixes should be applied until the repository owner has fully reviewed the AI review and explicitly approved the next step.',
        'Ignore style preferences, formatting, naming taste, import ordering, minor syntax preferences, and subjective readability comments unless they hide a concrete correctness, security, performance, or maintainability risk.',
        'Respect the project rule that existing functionality must not be removed or bypassed unless explicitly requested.',
        'Return only valid JSON. Do not wrap it in Markdown. The JSON shape must be: {"summary": string, "sensitive_touches": string[], "findings": [{"severity": "critical" | "warning" | "info", "title": string, "file": string, "evidence": string, "production_impact": string, "recommended_action": string}], "tests_to_run": string[], "canary_guidance": string, "merge_decision": "pass" | "fail"}.',
        'Set merge_decision to fail if there is any critical finding. Warnings and info are informational unless they reveal a critical risk. If there are no high-confidence issues, return merge_decision pass and list residual risks instead of inventing problems.',
      ].join('\n'),
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'phraseman_ai_pr_review',
          strict: true,
          schema: REVIEW_JSON_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI response returned ${response.status}: ${details}`);
  }

  const data = await response.json();
  const outputText = typeof data.output_text === 'string' && data.output_text.trim()
    ? data.output_text.trim()
    : data.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text || '')
    ?.join('\n')
    ?.trim();

  if (!outputText) {
    throw new Error('OpenAI review completed, but no text output was returned.');
  }

  return parseReviewJson(outputText);
}

function parseReviewJson(outputText) {
  const normalized = outputText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(normalized);
    if (!Array.isArray(parsed.findings)) {
      throw new Error('missing findings array');
    }
    if (parsed.merge_decision !== 'pass' && parsed.merge_decision !== 'fail') {
      throw new Error('merge_decision must be pass or fail');
    }
    return parsed;
  } catch (error) {
    throw new Error(`AI review returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function reviewHasBlockingFinding(review, blockingSeverities) {
  const blocking = new Set(blockingSeverities);
  return review.findings.some((finding) => blocking.has(String(finding.severity || '').toLowerCase()));
}

function formatFinding(finding, index) {
  return [
    `${index + 1}. **${String(finding.severity || 'info').toUpperCase()}: ${finding.title || 'Untitled finding'}**`,
    `   - File: \`${finding.file || 'not specified'}\``,
    `   - Evidence: ${finding.evidence || 'Not provided.'}`,
    `   - Production impact: ${finding.production_impact || 'Not provided.'}`,
    `   - Recommended action: ${finding.recommended_action || 'Not provided.'}`,
  ].join('\n');
}

function buildCommentBody({ review, files, sensitiveFiles, blockingSeverities, blocked }) {
  const generatedAt = new Date().toISOString();
  const findings = review.findings.length
    ? review.findings.map(formatFinding).join('\n\n')
    : 'No high-confidence production risks found.';

  const sensitiveTouches = [
    ...new Set([...(sensitiveFiles || []), ...(review.sensitive_touches || [])]),
  ];

  const header = [
    MARKER,
    '## AI Pull Request Review',
    '',
    `Generated at: ${generatedAt}`,
    `Files considered: ${files.length}`,
    `Merge gate: ${blocked ? 'BLOCKED' : 'PASSED'}`,
    `Blocking severities: ${blockingSeverities.join(', ')}`,
    '',
  ].join('\n');

  return [
    header,
    '### Summary',
    review.summary || 'No summary provided.',
    '',
    '### Sensitive Touches',
    sensitiveTouches.length ? sensitiveTouches.map((item) => `- ${item}`).join('\n') : '- None flagged.',
    '',
    '### Findings',
    findings,
    '',
    '### Tests To Run',
    review.tests_to_run?.length ? review.tests_to_run.map((test) => `- ${test}`).join('\n') : '- No additional tests suggested.',
    '',
    '### Canary Guidance',
    review.canary_guidance || 'No canary-specific guidance provided.',
    '',
    '### Merge Guidance',
    blocked
      ? 'Do not merge until all critical findings are resolved and the AI reviewer gate passes.'
      : 'AI reviewer gate passed. Treat warnings as informational review notes before canary rollout.',
  ].join('\n');
}

async function upsertPrComment(prNumber, body) {
  const comments = await pagedGithubRequest(`/issues/${prNumber}/comments`, 10);
  const existing = comments.find((comment) => comment.body?.includes(MARKER));

  if (existing) {
    await githubRequest(`/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body: { body },
    });
    return 'updated';
  }

  await githubRequest(`/issues/${prNumber}/comments`, {
    method: 'POST',
    body: { body },
  });
  return 'created';
}

async function main() {
  for (const name of requiredEnv) {
    if (!env(name)) {
      fail(`missing required environment variable ${name}`);
    }
  }

  const event = readJsonFile(env('GITHUB_EVENT_PATH'));
  const pr = event.pull_request;
  if (!pr?.number) {
    fail('this reviewer only supports pull_request_target events');
  }

  const headSha = pr.head?.sha;
  if (!headSha) {
    fail('pull request head sha is missing');
  }

  await setCommitStatus(headSha, 'pending', 'AI production-risk review is running');

  try {
    const files = await pagedGithubRequest(`/pulls/${pr.number}/files`, 30);
    const sensitiveFiles = detectSensitiveTouches(files);
    const maxChars = clampPositiveInt(env('AI_REVIEW_MAX_CHARS'), DEFAULT_MAX_CHARS);
    const diffDigest = buildDiffDigest(files, maxChars);
    const review = diffDigest.truncated || diffDigest.missingPatchFiles.length
      ? buildIncompleteCoverageReview({ files, diffDigest, sensitiveFiles })
      : await requestOpenAiReview(buildPrompt({
        pr,
        files,
        diff: diffDigest.text,
        truncated: diffDigest.truncated,
        sensitiveFiles,
      }));
    const blockingSeverities = parseBlockingSeverities();
    const blocked = review.merge_decision === 'fail' || reviewHasBlockingFinding(review, blockingSeverities);
    const body = buildCommentBody({
      review,
      files,
      sensitiveFiles,
      blockingSeverities,
      blocked,
    });

    const action = await upsertPrComment(pr.number, body);
    console.log(`AI PR review comment ${action} for PR #${pr.number}. Gate: ${blocked ? 'blocked' : 'passed'}.`);

    if (blocked) {
      await setCommitStatus(headSha, 'failure', 'AI review found critical production risk');
      throw new Error('AI reviewer found blocking critical production risk. See the PR comment for details.');
    }

    await setCommitStatus(headSha, 'success', 'AI review passed critical-risk gate');
  } catch (error) {
    await setCommitStatus(
      headSha,
      'failure',
      error instanceof Error ? error.message : 'AI review failed',
    );
    throw error;
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
