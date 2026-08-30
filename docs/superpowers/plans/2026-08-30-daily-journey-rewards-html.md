# Daily Journey Rewards HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained interactive HTML prototype of Phraseman's 50-day daily-reward journey with square gifts, real local assets, automatic cinematic reveal, deferred energy, and accessible playback controls.

**Architecture:** One persistent HTML artifact owns the prototype reward catalog, render functions, and deterministic animation controller. The same file is copied into the already-running visual-companion session; a local asset junction lets both locations use the original Phraseman WebP files without duplicating bundled assets. No production storage, economy code, network request, or real grant path is touched.

**Tech Stack:** Semantic HTML, CSS custom properties, CSS Grid/Flexbox, Web Animations API, vanilla JavaScript, local Phraseman WebP assets.

---

### Task 1: Create the static 50-day journey artifact

**Files:**
- Create: `docs/design/daily-journey-rewards-prototype.html`
- Reference: `docs/superpowers/specs/2026-08-30-daily-journey-rewards-design.md`

- [ ] **Step 1: Write the source-contract check and confirm it fails before the file exists**

Run:

```powershell
node -e "const fs=require('fs');const p='docs/design/daily-journey-rewards-prototype.html';if(!fs.existsSync(p))throw new Error('prototype_missing')"
```

Expected: command exits non-zero with `prototype_missing`.

- [ ] **Step 2: Create the HTML shell and the exact reward catalog**

The document must define the 50 rewards as data and use only these kinds:

```js
const rewards = Object.freeze([
  ['pearls',10],['runes',100],['energy_full',1],['spins',1],['freeze',1],
  ['pearls',20],['runes',200],['energy_plus',2],['spins',2],['runes',500],
  ['pearls',20],['runes',200],['energy_plus',2],['spins',1],['freeze',1],
  ['pearls',50],['runes',300],['energy_full',1],['spins',2],['runes',600],
  ['pearls',50],['runes',300],['energy_plus',3],['spins',2],['freeze',1],
  ['pearls',100],['runes',400],['energy_full',1],['spins',3],['runes',700],
  ['pearls',100],['runes',400],['energy_plus',3],['spins',2],['freeze',2],
  ['pearls',150],['runes',500],['energy_full',1],['spins',3],['runes',800],
  ['pearls',150],['runes',500],['energy_plus',3],['spins',3],['freeze',2],
  ['pearls',250],['runes',750],['energy_full',1],['spins',5],['runes',1000],
].map(([kind, amount], index) => Object.freeze({ day: index + 1, kind, amount })));
```

The artifact must reference real project assets:

```js
const artByKind = Object.freeze({
  pearls: '../../assets/images/level-spin-rewards/pearls_100.webp',
  runes: '../../assets/images/level-spin-rewards/wasabiInk/rune.webp',
  energy_full: '../../assets/images/level-spin-rewards/energy_full.webp',
  energy_plus: '../../assets/images/level-spin-rewards/energy_plus3.webp',
  spins: '../../assets/images/spin/wasabiInk/spin-ticket.webp',
  freeze: '../../assets/images/streak_icons/wasabiInk/streak-freeze-wasabiInk.webp',
});
```

- [ ] **Step 3: Render five chapter markers and ten square gifts**

Use a single renderer with these state rules:

```js
function rewardState(reward, selectedDay) {
  if (reward.day < selectedDay) return 'received';
  if (reward.day === selectedDay) return 'today';
  return 'future';
}

function chapterRewards(selectedDay) {
  const start = Math.floor((selectedDay - 1) / 10) * 10;
  return rewards.slice(start, start + 10);
}
```

Gift tiles must use `aspect-ratio: 1`, never a fixed unequal width/height pair. Container hierarchy uses tonal surfaces and shadows, not borders.

- [ ] **Step 4: Run the static contract**

Run:

```powershell
node -e "const fs=require('fs');const s=fs.readFileSync('docs/design/daily-journey-rewards-prototype.html','utf8');for(const x of ['const rewards','aspect-ratio: 1','prefers-reduced-motion','energy_full','runes'])if(!s.includes(x))throw new Error('missing:'+x);if(/avatar|aura/i.test(s))throw new Error('cosmetic_reward_forbidden');console.log('static_contract_ok')"
```

Expected: `static_contract_ok`.

### Task 2: Implement the cinematic reward timeline

**Files:**
- Modify: `docs/design/daily-journey-rewards-prototype.html`

- [ ] **Step 1: Add a deterministic scene controller**

The controller owns one clock and exposes play, pause, seek, replay, skip, and destroy:

```js
function createSceneController({ onFrame, onFinish }) {
  const duration = 6200;
  let elapsed = 0;
  let startedAt = 0;
  let playing = false;
  let raf = 0;

  const frame = (now) => {
    if (!playing) return;
    elapsed = Math.min(duration, elapsed + now - startedAt);
    startedAt = now;
    onFrame(elapsed, duration);
    if (elapsed >= duration) {
      playing = false;
      onFinish();
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  return Object.freeze({
    play() { if (playing) return; playing = true; startedAt = performance.now(); raf = requestAnimationFrame(frame); },
    pause() { playing = false; cancelAnimationFrame(raf); },
    seek(ms) { elapsed = Math.max(0, Math.min(duration, ms)); onFrame(elapsed, duration); },
    replay() { elapsed = 0; onFrame(0, duration); this.play(); },
    skip() { playing = false; cancelAnimationFrame(raf); elapsed = duration; onFrame(duration, duration); onFinish(); },
    dismiss() { playing = false; cancelAnimationFrame(raf); },
    destroy() { playing = false; cancelAnimationFrame(raf); },
  });
}
```

- [ ] **Step 2: Map the approved timings to visual variables**

Use one interpolation helper and the approved segments:

```js
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const range = (time, start, end) => clamp01((time - start) / (end - start));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function sceneValues(time) {
  const intro = easeOut(range(time, 0, 600));
  const pulseTime = range(time, 2800, 4100);
  const pulse = pulseTime > 0 && pulseTime < 1 ? Math.sin(pulseTime * Math.PI * 6) : 0;
  const dissolve = easeOut(range(time, 4100, 4700));
  const hero = easeOut(range(time, 4700, 5600));
  const detail = easeOut(range(time, 5600, 6200));
  return { intro, pulse, dissolve, hero, detail };
}
```

All animated CSS properties must be `transform` or `opacity`. The square hero remains square while scaling.

- [ ] **Step 3: Add correct final-card semantics**

Use readable body-sized text, without micro-explanation labels:

```js
function rewardCopy(reward) {
  const spinWord = reward.amount === 1 ? 'спин' : reward.amount < 5 ? 'спина' : 'спинов';
  const freezeWord = reward.amount === 1 ? 'заморозка' : 'заморозки';
  if (reward.kind === 'energy_full') return ['Полная энергия в запасе', 'Используй, когда энергия закончится.'];
  if (reward.kind === 'energy_plus') return [`+${reward.amount} энергии в запасе`, 'Используй в нужный момент.'];
  if (reward.kind === 'spins') return [`${reward.amount} ${spinWord} в запасе`, 'Открой колесо, когда захочешь.'];
  if (reward.kind === 'freeze') return [`${reward.amount} ${freezeWord} в запасе`, 'Она защитит следующий пропуск.'];
  if (reward.kind === 'runes') return [`${reward.amount} рун уже у тебя`, 'Награда начислена автоматически.'];
  return [`${reward.amount} жемчужин уже у тебя`, 'Награда начислена автоматически.'];
}
```

- [ ] **Step 4: Add reduced-motion behavior**

When `matchMedia('(prefers-reduced-motion: reduce)').matches` or the prototype toggle is enabled, render the final detail state immediately with no pulse, rays, impact, or translation. Do not schedule automatic closing.

- [ ] **Step 5: Make the reward modal the permanent final station**

At `6200 ms`, stop the controller and keep the gift-detail modal visible. Add full-width `Применить` and `Позже` actions with touch targets at least 44 px high. Remove the intermediate `Твой язык сегодня` screen. `Пропустить` must synchronously render this same final state and stop; it must not resume the timeline.

### Task 3: Add prototype controls and deliver to the visual companion

**Files:**
- Modify: `docs/design/daily-journey-rewards-prototype.html`
- Create browser-preview copy: `.superpowers/brainstorm/8698-1788080522/content/daily-journey-final-station-v3.html`
- Create junction if absent: `.superpowers/brainstorm/8698-1788080522/assets` → `assets`

- [ ] **Step 1: Add playback controls**

Provide visible prototype-only controls outside the phone:

```html
<button id="playPause" type="button">Пауза</button>
<button id="replay" type="button">Повторить</button>
<input id="scrubber" type="range" min="0" max="6200" value="0" aria-label="Таймлайн анимации">
```

The in-modal `Пропустить` and close buttons remain 44×44 px or larger and never change reward state. `Пропустить` immediately stops on the final gift modal; the final `Применить` and `Позже` buttons remain visible until the user chooses one.

- [ ] **Step 2: Add the hidden Tweaks panel**

The panel opens from one floating button and contains:

```html
<select id="intensity" aria-label="Интенсивность">
  <option value="calm">Спокойная</option>
  <option value="cinematic" selected>Кинематографичная</option>
  <option value="epic">Эпическая</option>
</select>
<input id="dayPicker" type="range" min="1" max="50" value="3" aria-label="День цикла">
<input id="reduceMotion" type="checkbox">
```

The three intensity choices alter ray opacity, hero scale, and impact strength; they do not recolor the interface or change layout.

- [ ] **Step 3: Copy the finished artifact and expose project assets**

Run:

```powershell
$session = 'C:\appsprojects\phraseman\.superpowers\brainstorm\8698-1788080522'
if (-not (Test-Path "$session\assets")) {
  New-Item -ItemType Junction -Path "$session\assets" -Target 'C:\appsprojects\phraseman\assets' | Out-Null
}
Copy-Item -LiteralPath 'docs\design\daily-journey-rewards-prototype.html' -Destination "$session\content\daily-journey-final-station-v3.html" -Force
```

If the visual-companion server does not serve the asset junction, mechanically replace only the six local WebP path strings in the preview copy with `data:image/webp;base64` values read from those same project files. Keep the persistent source HTML on repository-relative paths.

- [ ] **Step 4: Run the final deterministic checks**

Run:

```powershell
node -e "const fs=require('fs');const p='docs/design/daily-journey-rewards-prototype.html';const s=fs.readFileSync(p,'utf8');const checks=[[/aspect-ratio:\s*1/,'square'],[/max=\"50\"/,'50-day'],[/prefers-reduced-motion/,'reduced-motion'],[/const duration = 6200;/,'timeline'],[/id=\"applyGift\"/,'apply'],[/id=\"laterGift\"/,'later'],[/reward-assets|assets\/images/,'assets']];for(const [re,n] of checks)if(!re.test(s))throw new Error(n);if(/Твой язык сегодня|OpenAI|fetch\(|XMLHttpRequest/.test(s))throw new Error('forbidden-surface-or-api');console.log('final_contract_ok')"
```

Expected: `final_contract_ok`.

- [ ] **Step 5: Show the result**

Open `http://localhost:64610`, confirm the final screen is the newest visual-companion artifact, and provide the persistent HTML path to the user.

### Task 4: Commit only owned files

**Files:**
- Add: `docs/design/daily-journey-rewards-prototype.html`
- Add: `docs/superpowers/plans/2026-08-30-daily-journey-rewards-html.md`

- [ ] **Step 1: Verify the staged scope**

Run:

```powershell
git add -- docs/design/daily-journey-rewards-prototype.html docs/superpowers/plans/2026-08-30-daily-journey-rewards-html.md
git diff --cached --check
git diff --cached --name-only
```

Expected: exactly the two owned files, with no unrelated workspace changes.

- [ ] **Step 2: Commit**

Run:

```powershell
git commit -m "feat: prototype daily journey rewards"
```

Expected: one commit containing only the prototype and implementation plan.
