#!/usr/bin/env node
/**
 * Zero-dependency secret scanner.
 *
 * Two modes:
 *   --staged   Scan only git-staged files (used by the pre-commit hook).
 *   (default)  Scan the whole working tree (used in CI as a fast pre-check
 *              before the authoritative gitleaks action).
 *
 * Exit code 1 if any high-confidence secret is found, 0 otherwise.
 *
 * This is intentionally a small, dependency-free first line of defence so it
 * works on a fresh clone without `npm install`. The authoritative scan is the
 * gitleaks GitHub Action (see .github/workflows/secret-scan.yml).
 *
 * Rationale: the security audit (SECURITY_AUDIT_2026-06-07.md, finding H6)
 * flagged that .env.local holds live keys and the ONLY guard against an
 * accidental commit was .gitignore. This adds a real safety net.
 */

import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const ROOT = process.cwd();

// ── Secret detectors ────────────────────────────────────────────────────────
// Each rule: { id, regex, note }. Regexes target the concrete key formats that
// matter for this project plus common provider formats. Keep them specific to
// avoid noisy false positives — this gate must not cry wolf.
const RULES = [
  { id: 'openai-key',        regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,            note: 'OpenAI API key' },
  { id: 'elevenlabs/rc-key', regex: /\bsk_[a-f0-9]{40,}\b/,                           note: 'ElevenLabs / RevenueCat-style secret key' },
  { id: 'revenuecat-secret', regex: /\bsk_[A-Za-z0-9]{24,}\b/,                        note: 'RevenueCat secret API key' },
  { id: 'stripe-live',       regex: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/,            note: 'Stripe live secret key' },
  { id: 'aws-access-key',    regex: /\bAKIA[0-9A-Z]{16}\b/,                           note: 'AWS access key id' },
  { id: 'google-api-key',    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,                      note: 'Google API key' },
  { id: 'slack-token',       regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,              note: 'Slack token' },
  { id: 'github-pat',        regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/,   note: 'GitHub personal access token' },
  { id: 'private-key-block', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, note: 'Private key block' },
  { id: 'generic-bearer',    regex: /\b(?:authorization|bearer)\s*[:=]\s*["']?[A-Za-z0-9._-]{32,}["']?/i, note: 'Hardcoded bearer/authorization token' },
];

// ── Assignment-context detector (handled specially, not a plain regex) ───────
// Catches opaque provider keys with no distinctive value prefix (Pexels,
// Pixabay, generic *_API_KEY / *_SECRET / *_TOKEN named in H6) that only reveal
// themselves through a NAME = <opaque-literal> assignment. Implemented as a
// function rather than a single regex so it can reject CODE values (function
// calls, process.env refs, ternaries, identifiers) which caused mass false
// positives. It fires ONLY when the right-hand side is a hardcoded literal.
const SECRET_NAME = /\b[A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE[_-]?KEY|ACCESS[_-]?KEY)\b/i;
// A high-entropy-ish opaque literal: >=16 chars, mixes letters+digits, not a
// recognisable placeholder. Used for the value side of the assignment.
const OPAQUE_LITERAL = /^[A-Za-z0-9][A-Za-z0-9._-]{15,}$/;
const PLACEHOLDER = /^(?:x{3,}|changeme|your[_-]?|placeholder|example|test[_-]?key|dummy|fake|sample|none|null|undefined|true|false|<.*>|\$\{.*\}|process\.env)/i;
function namedSecretAssignmentHit(line) {
  // Match: NAME = "value"  |  NAME = 'value'  |  NAME=value   (env style)
  const m = /\b([A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE[_-]?KEY|ACCESS[_-]?KEY))\s*[:=]\s*(["']?)([^"'\s;,)]+)\2/i.exec(line);
  if (!m) return null;
  const name = m[0];
  const quote = m[2];
  const value = m[3];
  if (!SECRET_NAME.test(name)) return null;
  if (PLACEHOLDER.test(value)) return null;
  // Reject obvious CODE values: function calls, member access, env refs, ternary.
  if (/[()]/.test(value)) return null;            // foo()
  if (value.includes('process.env')) return null; // env ref
  // Unquoted RHS that looks like a JS identifier / member expression (no quotes)
  // is almost always code, not a literal secret — require it to look opaque.
  if (!OPAQUE_LITERAL.test(value)) return null;
  // A bare identifier the codebase assigns (e.g. resolveKey) reads as Capitalised
  // camelCase with no digits — opaque keys almost always contain digits.
  if (!quote && !/[0-9]/.test(value)) return null;
  // Must contain at least one digit OR be quoted+long — opaque API keys do.
  if (!/[0-9]/.test(value) && value.length < 24) return null;
  return value;
}

// ── Path allow / deny ───────────────────────────────────────────────────────
// Never scan these (binaries, deps, build output, and the env templates which
// legitimately contain placeholder key SHAPES but no real values).
const IGNORE_DIR_PARTS = new Set([
  'node_modules', '.git', 'android', 'ios', 'builds', 'dist', 'build',
  '.expo', '.firebase', 'qa-artifacts', 'maestro-results', 'exports',
  'store_release_stubs', '.codex-tmp', 'coverage',
  // Vendored AI-agent/tooling trees — not phraseman source.
  '.claude', '.claude-flow', '.agents', '.hive-mind', '.ruflo',
  '.superpowers', '.cursor', '.obsidian', '.idea', '.planning', '.codex',
]);

// Files explicitly allowed to contain key-shaped placeholders (templates/docs
// that the audit reviewed). The scanner skips these by exact relative path.
const ALLOWLIST_FILES = new Set([
  '.env.local.template',
  'subscription-recovery/.env.example',
  'SECURITY_AUDIT_2026-06-07.md', // documents redacted/example key prefixes
  'scripts/scan_secrets.mjs',     // this file contains the regexes themselves
  '.gitleaks.toml',
  // Firebase CLIENT config files — the AIza… key is a public project identifier,
  // not a secret. Access is gated by Firestore rules + API-key restrictions, not
  // by hiding this value. (Reviewed in SECURITY_AUDIT_2026-06-07.md.)
  'GoogleService-Info.plist',
  'google-services.json',
  '.codex-tmp-admin-live.html', // codex scratch copy of the admin panel
  'tools/telegram-premium-bot/README.md', // setup docs: placeholder secrets only
  // Uses firebase-tools' public OAuth desktop client credentials with the
  // developer's local firebase login; it is not a production app secret.
  'scripts/_mint_fb_token.mjs',
  // Test fixture: a FAKE service-account private key ('secret-private-key' placeholder)
  // used to exercise the credential-preflight guard. Not a real key.
  'tests/gustav_french_server_remote_credential_preflight_v2_packet.test.ts',
]);

// Files where a Firebase WEB/CLIENT Google API key (AIza…) is public by design
// (the project's own admin panel + Firebase init). We exempt the google-api-key
// rule ONLY in these specific files AND only on a recognisable Firebase-config
// line — so an AIza server key leaked anywhere else (or in a non-config line
// here) is still caught. This is deliberately narrow: line-content alone is NOT
// enough to exempt, because any attacker-chosen line could include "apiKey".
const FIREBASE_CLIENT_CONFIG_FILES = new Set([
  'admin/index.html',
  'admin/testers.html',
  'admin/beta_testers.html',
  'admin/full.html',
  'admin/site.html',
]);
const FIREBASE_CLIENT_KEY_CONTEXT = /\b(?:apiKey|api_key|current_key)\s*[:=]/;
// Auto-generated maps of PUBLIC Firebase Storage download URLs for bundled
// learning audio. The "?alt=media&token=<uuid>" values are per-file public read
// tokens for already-public assets the client must stream — not secrets. Exempt
// the assignment detector ONLY in these generated files AND only on a line that is
// a firebasestorage download URL with such a token (so a real key on another line
// is still caught).
const PUBLIC_STORAGE_URL_MAP_FILES = new Set([
  'app/plan_audio_url_map.generated.ts',
  'app/phrase_audio_url_map.generated.ts',
  'app/collectibles/collectible_image_url_map.generated.ts',
]);
const FIREBASE_STORAGE_DOWNLOAD_URL = /firebasestorage\.googleapis\.com\/.*[?&]alt=media&token=/;
function isExemptFinding(ruleId, line, relPath) {
  // The Firebase web apiKey (AIza…) in the admin panel is public client config.
  // Exempt both the google-api-key rule and the assignment detector — but ONLY
  // in the known config files AND only on an apiKey-config line.
  if (
    (ruleId === 'google-api-key' || ruleId === 'named-secret-assign') &&
    FIREBASE_CLIENT_CONFIG_FILES.has(relPath) &&
    FIREBASE_CLIENT_KEY_CONTEXT.test(line)
  ) {
    return true;
  }
  // Public Firebase Storage download tokens in generated client media URL maps.
  if (
    ruleId === 'named-secret-assign' &&
    PUBLIC_STORAGE_URL_MAP_FILES.has(relPath) &&
    FIREBASE_STORAGE_DOWNLOAD_URL.test(line)
  ) {
    return true;
  }
  return false;
}

const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|env|html|css|md|yml|yaml|sh|ps1|txt|xml|plist|properties|gradle|kt|java|rb|py|toml|ini|cfg|conf)$/i;
// Dotenv-family files: .env, .env.local, .env.production.local, run.env, foo.env …
// These are the HIGHEST-priority targets (they hold real keys) but don't always
// end in a TEXT_EXT extension, so match them explicitly by basename.
const DOTENV_FILE = /(^|[/\\.])\.?env(\.[A-Za-z0-9_.-]+)?$/i;
const MAX_BYTES = 2 * 1024 * 1024; // skip files larger than 2MB

function isScannableTextFile(relPath) {
  const base = relPath.split(/[/\\]/).pop() || relPath;
  return TEXT_EXT.test(relPath) || DOTENV_FILE.test(base);
}

function isIgnoredPath(relPath) {
  const parts = relPath.split(/[/\\]/);
  return parts.some((p) => IGNORE_DIR_PARTS.has(p));
}

// 64MB buffer — this repo tracks large tooling trees (.claude, .agents, etc.)
// that overflow execSync's default 1MB buffer.
const EXEC_OPTS = { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };

function listStagedFiles() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACM', EXEC_OPTS);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function listTrackedFiles() {
  const out = execSync('git ls-files', EXEC_OPTS);
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function scanFile(relPath) {
  const abs = join(ROOT, relPath);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return []; // staged-but-deleted, or unreadable
  }
  if (!st.isFile() || st.size > MAX_BYTES) return [];
  if (!isScannableTextFile(relPath)) return [];

  let content;
  try {
    content = readFileSync(abs, 'utf8');
  } catch {
    return [];
  }

  const hits = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      const m = rule.regex.exec(line);
      if (m) {
        if (isExemptFinding(rule.id, line, relPath)) continue;
        hits.push({
          file: relPath,
          line: i + 1,
          rule: rule.id,
          note: rule.note,
          // Redact the actual match so we never echo a real secret to logs.
          preview: redact(m[0]),
        });
      }
    }
    // Assignment-context detector (literal-only; rejects code values).
    const assignVal = namedSecretAssignmentHit(line);
    if (assignVal && !isExemptFinding('named-secret-assign', line, relPath)) {
      hits.push({
        file: relPath,
        line: i + 1,
        rule: 'named-secret-assign',
        note: 'Hardcoded secret in NAME=value assignment (API key / secret / token)',
        preview: redact(assignVal),
      });
    }
  }
  return hits;
}

function redact(s) {
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}…${s.slice(-2)} (${s.length} chars)`;
}

function main() {
  const staged = process.argv.includes('--staged');
  const candidates = (staged ? listStagedFiles() : listTrackedFiles())
    .map((f) => f.split(sep).join('/'))
    .filter((f) => !ALLOWLIST_FILES.has(f))
    .filter((f) => !isIgnoredPath(f));

  const findings = [];
  for (const f of candidates) findings.push(...scanFile(f));

  if (findings.length === 0) {
    if (!staged) console.log(`✓ secret scan clean (${candidates.length} files)`);
    process.exit(0);
  }

  console.error('\n\x1b[31m✖ Potential secret(s) detected — commit blocked:\x1b[0m\n');
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}  [${f.rule}] ${f.note}`);
    console.error(`      match: ${f.preview}`);
  }
  console.error(`\n${findings.length} finding(s).`);
  console.error('If this is a FALSE POSITIVE, add the path to ALLOWLIST_FILES in scripts/scan_secrets.mjs');
  console.error('or, to bypass once (NOT recommended for real keys): git commit --no-verify\n');
  console.error('If it is a REAL key: remove it, rotate the key, and store it in .env.local (gitignored).\n');
  process.exit(1);
}

main();
