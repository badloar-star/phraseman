# Telegram Testers Admin Safe Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the protected `Тестеры` admin page to Firebase Hosting without overwriting the locally cleaned `admin/index.html`.

**Architecture:** Keep the current working tree untouched for `admin/index.html`. Build an isolated hosting bundle under `.codex-tmp/` from the known complete git version of `admin/`, then add the new `admin/testers.html` page into that bundle. Deploy admin hosting from a temporary Firebase config whose `public` directory points at the safe bundle.

**Tech Stack:** Firebase Hosting, Firebase Auth custom admin claims, Firestore, static HTML/ES modules, Jest, TypeScript.

---

### Task 1: Confirm The Risk

**Files:**
- Read: `admin/index.html`
- Read: `firebase.json`
- Read: `admin/testers.html`

- [x] **Step 1: Check local admin index completeness**

Run:

```powershell
rg -n "</html>|script type=\"module\"|initializeApp|getFirestore" admin/index.html
```

Expected: local `admin/index.html` has no closing `</html>` and no Firebase module script, so normal hosting deploy from `admin/` is unsafe.

- [x] **Step 2: Check new testers page completeness**

Run:

```powershell
rg -n "</html>|initializeApp|getFirestore" admin/testers.html
```

Expected: `admin/testers.html` has Firebase init/imports and closing `</html>`.

### Task 2: Build Safe Hosting Bundle

**Files:**
- Create: `.codex-tmp/admin-hosting-safe-20260602-v2/admin/`
- Copy from working tree: `admin/**`
- Replace in staging from git: `admin/index.html`
- Copy from working tree: `admin/testers.html`

- [x] **Step 1: Avoid `git archive | tar` on Windows PowerShell**

The binary tar stream was corrupted by the shell pipeline. Do not use it for this task.

- [ ] **Step 2: Copy admin folder into staging**

Run:

```powershell
$staging = Join-Path (Get-Location) ".codex-tmp\admin-hosting-safe-20260602-v2"
$stagingAdmin = Join-Path $staging "admin"
New-Item -ItemType Directory -Force -Path $stagingAdmin | Out-Null
Copy-Item -LiteralPath "admin\*" -Destination $stagingAdmin -Recurse -Force
```

Expected: `.codex-tmp/admin-hosting-safe-20260602-v2/admin/testers.html` exists.

- [ ] **Step 3: Replace only staging index with complete git version**

Run:

```powershell
git show HEAD:admin/index.html | Set-Content -LiteralPath ".codex-tmp\admin-hosting-safe-20260602-v2\admin\index.html" -Encoding UTF8
```

Expected: `.codex-tmp/admin-hosting-safe-20260602-v2/admin/index.html` exists and contains closing `</html>`.

### Task 3: Create Temporary Deploy Config

**Files:**
- Create: `.codex-tmp/firebase-admin-testers-safe.json`

- [ ] **Step 1: Point admin hosting target to the safe bundle**

Create `.codex-tmp/firebase-admin-testers-safe.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": [
    {
      "target": "admin",
      "public": ".codex-tmp/admin-hosting-safe-20260602-v2/admin",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "headers": [
        {
          "source": "**",
          "headers": [
            { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate, max-age=0" },
            { "key": "Pragma", "value": "no-cache" }
          ]
        }
      ]
    }
  ],
  "functions": {
    "source": "functions",
    "runtime": "nodejs22"
  }
}
```

Expected: normal `firebase.json` remains unchanged, and future deploy can explicitly use the temporary config.

### Task 4: Verify

**Files:**
- Test: `tests/telegram_premium_bot_core.test.ts`
- Test: `tests/telegram_testers_admin_contract.test.ts`
- Compile: `functions/tsconfig.json`

- [ ] **Step 1: Run bot/admin contract tests**

Run:

```powershell
npx jest --runTestsByPath tests/telegram_premium_bot_core.test.ts tests/telegram_testers_admin_contract.test.ts --no-cache
```

Expected: `2 passed`, `14 passed`.

- [ ] **Step 2: Run Functions TypeScript compile**

Run:

```powershell
npx tsc -p functions/tsconfig.json
```

Expected: exit code `0`.

- [ ] **Step 3: Verify safe bundle HTML**

Run:

```powershell
rg -n "</html>|initializeApp|getFirestore" .codex-tmp/admin-hosting-safe-20260602-v2/admin/index.html .codex-tmp/admin-hosting-safe-20260602-v2/admin/testers.html
```

Expected: both files contain closing `</html>`; `testers.html` contains Firebase imports/init.

### Task 5: Deploy When Network Is Available

**Files:**
- Use: `.codex-tmp/firebase-admin-testers-safe.json`

- [ ] **Step 1: Deploy only admin hosting from safe bundle**

Run:

```powershell
firebase deploy --config .codex-tmp/firebase-admin-testers-safe.json --only hosting:admin
```

Expected: Firebase Hosting deploy succeeds and publishes `/testers.html` while preserving a complete `index.html` in the uploaded bundle.

- [ ] **Step 2: Open the page**

URL:

```text
https://phraseman-ea0b3.web.app/testers.html
```

Expected: admin-only page loads, signs in with Google, and shows tester records without visible payment/money wording.
