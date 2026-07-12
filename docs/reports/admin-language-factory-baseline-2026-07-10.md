# Admin Control Plane + Language Factory Baseline

Date: 2026-07-10
Branch: `codex/admin-language-factory`
Worktree: `C:\Users\badlo\.config\superpowers\worktrees\phraseman\admin-language-factory`

## Scope

This is a read-only baseline for the approved Admin Control Plane and Language Factory program. No application, admin, rules, functions, or generated-content source files were changed for this report.

## Current admin artifact

The current canonical admin entry point is the monolithic `admin/index.html`.

Measured in this worktree:

| Measure | Result |
|---|---:|
| File size | 2,319,036 bytes |
| File lines | 39,950 |
| Top-level tab entries detected | 53 |
| `<button>` elements detected | 436 |
| Firestore write call sites detected | 149 |
| `admin/v2/` directory | absent |
| `admin/v2/index.html` | absent |

The button count and write count are static call-site counts, not proof that every control is reachable at runtime. The legacy button audit is the authoritative detailed inventory for the current baseline.

## Baseline commands

### Dependency installation

Command:

```powershell
npm install --ignore-scripts
```

Result: completed successfully; 1,470 packages added and 52 dependency vulnerabilities reported by npm audit. No dependency remediation was attempted in this baseline task.

### Legacy button/function audit

Command:

```powershell
node scripts/admin-legacy-button-audit.mjs
```

Result: completed successfully with the following summary:

```text
sections: 54
buttons.total: 441
buttons.write: 126
buttons.danger: 133
buttons.noTitle: 363
buttons.emoji: 194
buttons.directWriteCandidate: 126
functions.functions: 936
functions.writingFunctions: 149
functions.confirmFunctions: 129
functions.auditFunctions: 144
functions.callableFunctions: 24
functions.linkedActions: 355
functions.linkedWrites: 121
functions.linkedWritesNoConfirm: 20
functions.linkedWritesNoAudit: 23
functions.missingFunctions: 94
```

This confirms that the current interface is still a large legacy surface, not the seven-section Admin v2 described by the June readiness documents.

### Admin v2 smoke

Command:

```powershell
node scripts/admin-v2-smoke.mjs
```

Result: failed before running assertions because the expected file does not exist:

```text
ENOENT: no such file or directory
admin/v2/index.html
```

This is a pre-existing repository state and is not caused by this task.

## Runtime language baseline

The current runtime is not yet a fully generic language runtime. The approved roadmap must account for a bootstrap application release before server-only addition of arbitrary future languages:

- `app/study_target.ts` currently constrains `StudyTarget` to the existing target union.
- Target-scoped storage and loaders still contain English/French-specific assumptions.
- Unknown targets must be changed from silent English fallback to explicit fail-closed behavior.
- Existing course-pack seams must remain the only delivery seam for future packs.

Therefore, “new languages without app release” means: one universal runtime/bootstrap release first, followed by content-pack additions without new binary releases.

## Risks carried into Phase 1

1. The current working tree outside this worktree contains unrelated user changes and must not be reset or copied into implementation work without an ownership manifest.
2. The legacy admin contains many direct browser write paths and best-effort audit calls.
3. The current `admin=true` claim is not a complete least-privilege RBAC model.
4. June Admin v2 readiness documents describe files that are absent from the current repository state.
5. No production generation, upload, pack activation, or Firebase mutation is authorized by this baseline task.

## Baseline decision

Phase 0 evidence is captured. The next implementation dependency is the server command/security spine, not language generation or production admin cutover.
