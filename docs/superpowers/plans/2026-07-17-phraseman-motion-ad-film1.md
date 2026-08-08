# Phraseman Motion Ad Film 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, sound-design, render, and verify the first 9.5-second Phraseman advertising insert as the approved reference film for the trilogy.

**Architecture:** Keep a version-controlled canonical Motion Graphic source, cue manifest, and sound prompt pack under `tools/phraseman_motion_ads/film1/`. Build the actual review film in a fresh 1920×1080/30 fps Motion MCP project: one deterministic full-frame code-authored Motion Graphic, separate official icon and QR assets, and a layered set of original generated SFX placed from the cue manifest. Treat the 1080p film as the creative reference; produce 4K and Films 2–3 only after the user approves this reference.

**Tech Stack:** React/JSX Motion Graphics, ChatCut Motion MCP, Jest contract tests, ElevenLabs custom SFX through ChatCut, FFmpeg/FFprobe, MCP video design-quality analysis.

---

## Scope boundary

This plan builds:

- the reusable visual and sonic foundation;
- Film 1 only;
- one 1080p review master with final-quality custom sound;
- separately layered motion and SFX sources so clean/stem deliveries remain
  possible after the reference is approved;
- automated and human QA evidence.

This plan does not build:

- Film 2 or Film 3;
- 9:16 adaptations;
- insertion into a specific lesson timeline;
- production deployment;
- app or website behaviour changes;
- new QR codes;
- OpenAI-generated media of any kind.

Films 2 and 3 receive their own extension plan after Film 1 is visually and
sonically approved.

## File map

Create:

- `tools/phraseman_motion_ads/README.md` — local source-of-truth and build workflow.
- `tools/phraseman_motion_ads/film1/film1.cues.json` — frame-accurate visual/audio contract.
- `tools/phraseman_motion_ads/film1/film1.motion.jsx` — canonical code sent inline to Motion MCP.
- `tools/phraseman_motion_ads/film1/film1.motion-properties.json` — editable text, palette, and font defaults sent with the Motion Graphic.
- `tools/phraseman_motion_ads/film1/film1.sound-prompts.json` — exactly ten approved custom SFX jobs.
- `tools/phraseman_motion_ads/qa-film1.ps1` — local render metadata and loudness checks.
- `tests/phraseman_motion_ad_film1_contract.test.ts` — exact-copy, timing, QR, sound coverage, and anti-pattern guards.

Read without modifying:

- `docs/superpowers/specs/2026-07-17-phraseman-motion-ad-trilogy-design.md`
- `assets/images/icon.png`
- `knowly-www/assets/phraseman-icon.png`
- `knowly-www/assets/qr-download.svg`
- `knowly-www/assets/phraseman-screen-home.webp`
- `assets/fonts/Inter-Regular.ttf`
- `assets/fonts/Inter-SemiBold.ttf`
- `assets/fonts/Inter-Bold.ttf`

Temporary QA artifacts go only to:

- `.codex-tmp/phraseman-motion-ads/film1/`

The completed review MP4 goes to the user's Downloads folder with
collision-safe naming. Do not commit generated MP4, WAV, frames, contact
sheets, cloud IDs, tokens, or download URLs.

---

### Task 1: Establish the frame-accurate Film 1 contract

**Files:**

- Create: `tools/phraseman_motion_ads/README.md`
- Create: `tools/phraseman_motion_ads/film1/film1.cues.json`
- Create: `tests/phraseman_motion_ad_film1_contract.test.ts`

- [ ] **Step 1: Write the initial failing contract test**

Create `tests/phraseman_motion_ad_film1_contract.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const TOOL_ROOT = path.join(ROOT, 'tools', 'phraseman_motion_ads');
const CUES_PATH = path.join(TOOL_ROOT, 'film1', 'film1.cues.json');
const MOTION_PATH = path.join(TOOL_ROOT, 'film1', 'film1.motion.jsx');
const MOTION_PROPERTIES_PATH = path.join(
  TOOL_ROOT,
  'film1',
  'film1.motion-properties.json',
);
const SOUND_PROMPTS_PATH = path.join(
  TOOL_ROOT,
  'film1',
  'film1.sound-prompts.json',
);

type Cue = {
  id: string;
  frame: number;
  visualChange: string;
  soundId: string;
};

type CueManifest = {
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  copy: {
    question: string[];
    answer: string;
    brand: string;
    cta: string;
  };
  qr: {
    entryFromFrame: number;
    fromFrame: number;
    toFrame: number;
    minimumHoldFrames: number;
    sourceUrl: string;
  };
  icon: {
    sourceUrl: string;
  };
  cues: Cue[];
};

function readManifest(): CueManifest {
  return JSON.parse(fs.readFileSync(CUES_PATH, 'utf8')) as CueManifest;
}

describe('Phraseman Film 1 motion-ad contract', () => {
  test('declares the source manifest', () => {
    expect(fs.existsSync(CUES_PATH)).toBe(true);
  });

  test('uses the approved delivery geometry and timing', () => {
    const manifest = readManifest();
    expect(manifest).toMatchObject({
      width: 1920,
      height: 1080,
      fps: 30,
      durationFrames: 285,
    });
  });

  test('keeps the approved copy exact', () => {
    const manifest = readManifest();
    expect(manifest.copy).toEqual({
      question: ['А что, если язык', 'не нужно заучивать?'],
      answer: 'Им можно просто пользоваться.',
      brand: 'Phraseman',
      cta: 'Сканируй, чтобы попробовать',
    });
  });

  test('holds the official QR still for at least 3.5 seconds', () => {
    const manifest = readManifest();
    const holdFrames = manifest.qr.toFrame - manifest.qr.fromFrame;
    expect(manifest.qr.minimumHoldFrames).toBe(105);
    expect(manifest.qr.entryFromFrame).toBe(155);
    expect(manifest.qr.fromFrame).toBe(166);
    expect(holdFrames).toBeGreaterThanOrEqual(manifest.qr.minimumHoldFrames);
    expect(manifest.qr.toFrame).toBe(manifest.durationFrames);
    expect(manifest.qr.sourceUrl).toBe(
      'https://knowlyapps.com/assets/qr-download.svg',
    );
  });

  test('uses only the official public icon', () => {
    const manifest = readManifest();
    expect(manifest.icon.sourceUrl).toBe(
      'https://knowlyapps.com/assets/phraseman-icon.png',
    );
  });

  test('assigns a sound to every declared visual change', () => {
    const manifest = readManifest();
    expect(manifest.cues.length).toBeGreaterThanOrEqual(12);
    expect(new Set(manifest.cues.map((cue) => cue.id)).size).toBe(
      manifest.cues.length,
    );
    for (const cue of manifest.cues) {
      expect(cue.visualChange.trim()).not.toBe('');
      expect(cue.soundId.trim()).not.toBe('');
      expect(cue.frame).toBeGreaterThanOrEqual(0);
      expect(cue.frame).toBeLessThan(manifest.durationFrames);
    }
  });

  test('keeps cues in chronological order', () => {
    const manifest = readManifest();
    const frames = manifest.cues.map((cue) => cue.frame);
    expect(frames).toEqual([...frames].sort((a, b) => a - b));
  });

  test('eventually provides canonical motion and sound sources', () => {
    expect(fs.existsSync(MOTION_PATH)).toBe(true);
    expect(fs.existsSync(MOTION_PROPERTIES_PATH)).toBe(true);
    expect(fs.existsSync(SOUND_PROMPTS_PATH)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx jest tests/phraseman_motion_ad_film1_contract.test.ts --runInBand
```

Expected: FAIL because `film1.cues.json`, `film1.motion.jsx`,
`film1.motion-properties.json`, and `film1.sound-prompts.json` do not exist.

- [ ] **Step 3: Create the cue manifest**

Create `tools/phraseman_motion_ads/film1/film1.cues.json`:

```json
{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "durationFrames": 285,
  "copy": {
    "question": [
      "А что, если язык",
      "не нужно заучивать?"
    ],
    "answer": "Им можно просто пользоваться.",
    "brand": "Phraseman",
    "cta": "Сканируй, чтобы попробовать"
  },
  "qr": {
    "entryFromFrame": 155,
    "fromFrame": 166,
    "toFrame": 285,
    "minimumHoldFrames": 105,
    "sourceUrl": "https://knowlyapps.com/assets/qr-download.svg"
  },
  "icon": {
    "sourceUrl": "https://knowlyapps.com/assets/phraseman-icon.png"
  },
  "cues": [
    {
      "id": "cut-to-ivory",
      "frame": 0,
      "visualChange": "Lesson cuts to the empty ivory studio",
      "soundId": "air-gate"
    },
    {
      "id": "lens-roll-start",
      "frame": 6,
      "visualChange": "Golden lens rolls in from the left",
      "soundId": "gold-roll"
    },
    {
      "id": "question-line-one-reveal",
      "frame": 23,
      "visualChange": "First question line begins its optical reveal",
      "soundId": "glass-reveal"
    },
    {
      "id": "question-line-one-lock",
      "frame": 45,
      "visualChange": "First question line settles",
      "soundId": "magnetic-lock"
    },
    {
      "id": "question-line-two-reveal",
      "frame": 60,
      "visualChange": "Second question line begins its optical reveal",
      "soundId": "glass-reveal"
    },
    {
      "id": "question-mark-accent",
      "frame": 82,
      "visualChange": "Question mark receives a gold optical accent",
      "soundId": "glass-sparkle"
    },
    {
      "id": "lens-edge-turn",
      "frame": 100,
      "visualChange": "Lens rotates edge-on and the gold control emerges",
      "soundId": "gold-turn"
    },
    {
      "id": "control-press",
      "frame": 119,
      "visualChange": "Lens presses the gold control",
      "soundId": "tactile-press"
    },
    {
      "id": "response-wave",
      "frame": 127,
      "visualChange": "One controlled response wave expands",
      "soundId": "air-response"
    },
    {
      "id": "answer-reveal",
      "frame": 130,
      "visualChange": "Answer statement becomes visible",
      "soundId": "glass-reveal"
    },
    {
      "id": "answer-final-word",
      "frame": 143,
      "visualChange": "Final word reaches full clarity",
      "soundId": "glass-sparkle"
    },
    {
      "id": "lens-dock",
      "frame": 155,
      "visualChange": "Lens docks into the end-card composition",
      "soundId": "magnetic-lock"
    },
    {
      "id": "end-card-reveal",
      "frame": 161,
      "visualChange": "Brand and CTA settle",
      "soundId": "glass-reveal"
    },
    {
      "id": "qr-lock",
      "frame": 166,
      "visualChange": "Official QR reaches its fixed position",
      "soundId": "magnetic-lock"
    },
    {
      "id": "brand-mnemonic",
      "frame": 176,
      "visualChange": "Brand lockup completes",
      "soundId": "brand-mnemonic"
    }
  ]
}
```

- [ ] **Step 4: Create the workflow README**

Create `tools/phraseman_motion_ads/README.md`:

```markdown
# Phraseman Motion Ads

Canonical source for the Phraseman short advertising inserts.

## Rules

- The committed files are the source of truth.
- Motion MCP receives `film1.motion.jsx` inline; never pass a local path.
- Motion MCP receives the parsed `film1.motion-properties.json` array with the
  code; visible copy, brand palette, and font stay editable.
- The official icon and QR are imported from `knowlyapps.com`.
- Generated audio and video stay in ChatCut or `.codex-tmp/`.
- Do not commit renders, stems, cloud IDs, tokens, or temporary frames.
- Every cue in `film1.cues.json` must have a matching audible event.
- Film 1 is the reference. Do not build Films 2–3 until Film 1 is approved.

## Review format

- 1920×1080
- 30 fps
- 285 frames / 9.5 seconds
- H.264 review master
- 48 kHz stereo audio
```

- [ ] **Step 5: Run the focused test**

Run:

```powershell
npx jest tests/phraseman_motion_ad_film1_contract.test.ts --runInBand
```

Expected: only `eventually provides canonical motion and sound sources` fails.

- [ ] **Step 6: Commit the contract**

```powershell
git add tools/phraseman_motion_ads/README.md tools/phraseman_motion_ads/film1/film1.cues.json tests/phraseman_motion_ad_film1_contract.test.ts
git commit -m "test: define Film 1 motion ad contract"
```

---

### Task 2: Author the deterministic Motion Graphic

**Files:**

- Create: `tools/phraseman_motion_ads/film1/film1.motion.jsx`
- Create: `tools/phraseman_motion_ads/film1/film1.motion-properties.json`
- Modify: `tests/phraseman_motion_ad_film1_contract.test.ts`

- [ ] **Step 1: Add source-level design guards to the contract test**

Insert these tests before the final `});` in
`tests/phraseman_motion_ad_film1_contract.test.ts`:

```ts
  test('motion properties contain the exact approved copy and brand tokens', () => {
    const properties = JSON.parse(
      fs.readFileSync(MOTION_PROPERTIES_PATH, 'utf8'),
    ) as Array<{
      key: string;
      label: string;
      type: string;
      defaultValue: unknown;
    }>;
    const defaults = Object.fromEntries(
      properties.map((property) => [property.key, property.defaultValue]),
    );

    expect(properties).toHaveLength(12);
    expect(new Set(properties.map((property) => property.key)).size).toBe(12);
    expect(defaults).toMatchObject({
      questionLineOne: 'А что, если язык',
      questionLineTwo: 'не нужно заучивать?',
      answerText: 'Им можно просто пользоваться.',
      brandText: 'Phraseman',
      ctaText: 'Сканируй, чтобы попробовать',
      backgroundColor: '#F7F6F2',
      textColor: '#17151D',
      accentColor: '#E6A928',
      fontFamily: 'Inter',
      transparentBackground: false,
    });
  });

  test('motion source follows the direct-authoring runtime contract', () => {
    const source = fs.readFileSync(MOTION_PATH, 'utf8');
    expect(source).not.toMatch(/^import /m);
    expect(source).not.toMatch(/\bexport\b/);
    expect(source).toContain('const Component = ({ item }) =>');
    expect(source).toContain('const frame = useCurrentFrame()');
    expect(source).toContain('<div style={rootStyle}>');

    for (const key of [
      'questionLineOne',
      'questionLineTwo',
      'answerText',
      'brandText',
      'ctaText',
      'backgroundColor',
      'textColor',
      'accentColor',
      'accentLightColor',
      'accentDeepColor',
      'fontFamily',
      'transparentBackground',
    ]) {
      expect(source).toContain(`props.${key}`);
    }
  });

  test('motion source rejects known visual anti-patterns', () => {
    const source = fs.readFileSync(MOTION_PATH, 'utf8');
    expect(source).not.toMatch(/typewriter/i);
    expect(source).not.toMatch(/keyboard/i);
    expect(source).not.toMatch(/confetti/i);
    expect(source).not.toMatch(/emoji/i);
    expect(source).not.toContain('#47C870');
    expect(source).not.toContain('SF Pro');
  });

  test('motion source exposes the exact duration', () => {
    const source = fs.readFileSync(MOTION_PATH, 'utf8');
    expect(source).toContain('FILM_ONE_DURATION_FRAMES = 285');
  });
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npx jest tests/phraseman_motion_ad_film1_contract.test.ts --runInBand
```

Expected: FAIL because `film1.motion.jsx` does not exist.

- [ ] **Step 3: Create the editable Motion Graphic property schema**

Create
`tools/phraseman_motion_ads/film1/film1.motion-properties.json`:

```json
[
  {
    "key": "questionLineOne",
    "label": "Question · line 1",
    "type": "text",
    "defaultValue": "А что, если язык"
  },
  {
    "key": "questionLineTwo",
    "label": "Question · line 2",
    "type": "text",
    "defaultValue": "не нужно заучивать?"
  },
  {
    "key": "answerText",
    "label": "Answer",
    "type": "text",
    "defaultValue": "Им можно просто пользоваться."
  },
  {
    "key": "brandText",
    "label": "Brand",
    "type": "text",
    "defaultValue": "Phraseman"
  },
  {
    "key": "ctaText",
    "label": "CTA",
    "type": "text",
    "defaultValue": "Сканируй, чтобы попробовать"
  },
  {
    "key": "backgroundColor",
    "label": "Ivory background",
    "type": "color",
    "defaultValue": "#F7F6F2"
  },
  {
    "key": "textColor",
    "label": "Graphite text",
    "type": "color",
    "defaultValue": "#17151D"
  },
  {
    "key": "accentColor",
    "label": "Phraseman gold",
    "type": "color",
    "defaultValue": "#E6A928"
  },
  {
    "key": "accentLightColor",
    "label": "Gold highlight",
    "type": "color",
    "defaultValue": "#FFD56A"
  },
  {
    "key": "accentDeepColor",
    "label": "Gold shadow",
    "type": "color",
    "defaultValue": "#9B6112"
  },
  {
    "key": "fontFamily",
    "label": "Typeface",
    "type": "font",
    "defaultValue": "Inter"
  },
  {
    "key": "transparentBackground",
    "label": "Transparent background",
    "type": "boolean",
    "defaultValue": false
  }
]
```

- [ ] **Step 4: Create the canonical Motion Graphic source**

Create `tools/phraseman_motion_ads/film1/film1.motion.jsx`:

```jsx
const FILM_ONE_DURATION_FRAMES = 285;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const mix = (from, to, amount) => from + (to - from) * amount;
const progress = (frame, start, duration) =>
  clamp01((frame - start) / duration);
const easeOut = (value) => 1 - Math.pow(1 - clamp01(value), 3);
const withAlpha = (hex, alpha) => {
  const value = hex.replace('#', '');
  const full = value.length === 3
    ? value.split('').map((character) => character + character).join('')
    : value;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
};
const easeInOut = (value) => {
  const t = clamp01(value);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const revealStyle = (frame, start, duration = 18) => {
  const p = easeOut(progress(frame, start, duration));
  return {
    opacity: p,
    transform: `translateX(${mix(22, 0, p)}px)`,
    clipPath: `inset(0 ${mix(100, 0, p)}% 0 0)`,
  };
};

const revealFromCentreStyle = (frame, start, duration = 18) => {
  const p = easeOut(progress(frame, start, duration));
  return {
    opacity: p,
    transform: `translateY(${mix(12, 0, p)}px)`,
    clipPath:
      `inset(0 ${mix(46, 0, p)}% 0 ${mix(54, 0, p)}%)`,
  };
};

const revealFromRightStyle = (frame, start, duration = 18) => {
  const p = easeOut(progress(frame, start, duration));
  return {
    opacity: p,
    transform: `translateX(${mix(-22, 0, p)}px)`,
    clipPath: `inset(0 0 0 ${mix(100, 0, p)}%)`,
  };
};

const fadeBetween = (frame, start, end, duration = 12) => {
  const enter = easeOut(progress(frame, start, duration));
  const exit = easeOut(progress(frame, end, duration));
  return clamp01(enter - exit);
};

const lensPose = (frame) => {
  if (frame < 6) {
    return { x: -220, y: 470, rotation: -50, scaleX: 1, scaleY: 1 };
  }
  if (frame < 60) {
    const p = easeOut(progress(frame, 6, 54));
    return {
      x: mix(-220, 810, p),
      y: mix(470, 425, p),
      rotation: mix(-50, 190, p),
      scaleX: 1,
      scaleY: 1,
    };
  }
  if (frame < 100) {
    const p = easeInOut(progress(frame, 60, 40));
    return {
      x: mix(810, 1010, p),
      y: mix(425, 585, p),
      rotation: mix(190, 230, p),
      scaleX: 1,
      scaleY: 1,
    };
  }
  if (frame < 119) {
    const p = easeInOut(progress(frame, 100, 19));
    return {
      x: mix(1010, 1120, p),
      y: mix(585, 640, p),
      rotation: mix(230, 270, p),
      scaleX: mix(1, 0.14, p),
      scaleY: 1,
    };
  }
  if (frame < 137) {
    const down = easeOut(progress(frame, 119, 8));
    const up = easeOut(progress(frame, 127, 10));
    return {
      x: 1120,
      y: mix(640, 658, clamp01(down - up)),
      rotation: 270,
      scaleX: mix(0.14, 1, up),
      scaleY: mix(1, 0.94, clamp01(down - up)),
    };
  }
  if (frame < 166) {
    const p = easeInOut(progress(frame, 137, 29));
    return {
      x: mix(1120, 1260, p),
      y: mix(640, 520, p),
      rotation: mix(270, 360, p),
      scaleX: 1,
      scaleY: 1,
    };
  }
  return { x: 1260, y: 520, rotation: 360, scaleX: 1, scaleY: 1 };
};

const GoldenLens = ({ frame, colors }) => {
  const pose = lensPose(frame);
  const shadowP = easeOut(progress(frame, 6, 24));
  const shadowStyle = {
    position: 'absolute',
    left: pose.x - 106,
    top: pose.y + 86,
    width: 212,
    height: 34,
    borderRadius: '50%',
    background: 'rgba(42,26,7,0.16)',
    boxShadow: '0 0 22px rgba(42,26,7,0.2)',
    opacity: shadowP * 0.72,
    transform: `scaleX(${pose.scaleX})`,
  };
  const rimStyle = {
    position: 'absolute',
    left: pose.x - 94,
    top: pose.y - 94,
    width: 188,
    height: 188,
    borderRadius: '50%',
    padding: 13,
    background:
      `linear-gradient(135deg, #FFF2AF 0%, ${colors.goldLight} 23%, ` +
      `${colors.goldDeep} 58%, ${colors.goldLight} 78%, ${colors.goldDeep} 100%)`,
    boxShadow:
      'inset 0 2px 5px rgba(255,255,255,0.72), 0 18px 34px rgba(78,45,3,0.22)',
    transform:
      `rotate(${pose.rotation}deg) scaleX(${pose.scaleX}) ` +
      `scaleY(${pose.scaleY})`,
    transformOrigin: '50% 50%',
  };
  const glassStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    overflow: 'hidden',
    background:
      'radial-gradient(circle at 32% 24%, rgba(255,255,255,0.66), ' +
      'rgba(244,218,154,0.34) 25%, rgba(90,60,24,0.24) 72%), ' +
      'linear-gradient(135deg, rgba(255,255,255,0.34), rgba(128,79,17,0.22))',
    border: '1px solid rgba(255,255,255,0.56)',
    boxShadow: `inset 0 0 24px ${withAlpha(colors.gold, 0.2)}`,
  };

  return (
    <>
      <div style={shadowStyle} />
      <div style={rimStyle}>
        <div style={glassStyle} />
      </div>
    </>
  );
};

const Component = ({ item }) => {
  const frame = useCurrentFrame();
  const props = item.props || {};
  const colors = {
    ivory: props.backgroundColor,
    graphite: props.textColor,
    graphiteSoft: withAlpha(props.textColor, 0.58),
    goldLight: props.accentLightColor,
    gold: props.accentColor,
    goldDeep: props.accentDeepColor,
  };
  const fontFamily = props.fontFamily;
  const questionOpacity = fadeBetween(frame, 20, 148, 14);
  const answerOpacity = fadeBetween(frame, 119, 153, 12);
  const endCardP = easeOut(progress(frame, 155, 11));
  const sparkleP = fadeBetween(frame, 82, 98, 5);
  const controlOpacity = fadeBetween(frame, 100, 150, 10);
  const pressP = easeOut(progress(frame, 119, 8));
  const responseP = easeOut(progress(frame, 127, 20));
  const rootStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: props.transparentBackground ? 'transparent' : colors.ivory,
    color: colors.graphite,
    fontFamily,
  };
  const studioLightStyle = {
    position: 'absolute',
    inset: 0,
    opacity: props.transparentBackground ? 0 : 1,
    background:
      'radial-gradient(circle at 55% 42%, rgba(255,255,255,0.76), ' +
      'rgba(247,246,242,0) 47%)',
  };
  const questionBlockStyle = {
    position: 'absolute',
    left: 180,
    top: 300,
    width: 1160,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    opacity: questionOpacity,
  };
  const questionLineOneStyle = {
    ...revealStyle(frame, 23, 22),
    fontSize: 88,
    fontWeight: 600,
    lineHeight: 1.08,
    letterSpacing: -3.4,
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  };
  const questionLineTwoStyle = {
    ...revealFromCentreStyle(frame, 60, 22),
    fontSize: 96,
    fontWeight: 700,
    lineHeight: 1.06,
    letterSpacing: -4.2,
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  };
  const questionAccentStyle = {
    position: 'absolute',
    left: 1130,
    top: 366,
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: `2px solid ${colors.gold}`,
    opacity: sparkleP,
    transform: `scale(${mix(0.5, 2.1, sparkleP)})`,
    boxShadow: `0 0 24px rgba(230,169,40,${sparkleP * 0.58})`,
  };
  const answerStyle = {
    position: 'absolute',
    left: 180,
    top: 520,
    width: 1050,
    opacity: controlOpacity,
    ...revealFromRightStyle(frame, 130, 13),
    fontSize: 74,
    fontWeight: 600,
    lineHeight: 1.12,
    letterSpacing: -2.8,
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  };
  const controlStyle = {
    position: 'absolute',
    left: 1070,
    top: 620,
    width: 100,
    height: 100,
    borderRadius: '50%',
    background:
      `linear-gradient(145deg, ${colors.goldLight}, ${colors.gold} 62%, ` +
      `${colors.goldDeep})`,
    boxShadow:
      'inset 0 2px 4px rgba(255,255,255,0.72), ' +
      '0 12px 26px rgba(95,55,4,0.2)',
    opacity: answerOpacity,
    transform:
      `translateY(${pressP * 8}px) scale(${mix(1, 0.94, pressP)})`,
  };
  const responseStyle = {
    position: 'absolute',
    left: 1070 - responseP * 130,
    top: 620 - responseP * 130,
    width: 100 + responseP * 260,
    height: 100 + responseP * 260,
    borderRadius: '50%',
    border:
      `2px solid rgba(230,169,40,${(1 - responseP) * 0.48})`,
    opacity: answerOpacity,
  };
  const endCardStyle = {
    position: 'absolute',
    inset: 0,
    opacity: endCardP,
    transform: `translateY(${mix(24, 0, endCardP)}px)`,
  };
  const brandStyle = {
    position: 'absolute',
    left: 386,
    top: 420,
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: -3,
  };
  const ctaStyle = {
    position: 'absolute',
    left: 390,
    top: 510,
    maxWidth: 720,
    fontSize: 30,
    fontWeight: 500,
    color: colors.graphiteSoft,
    letterSpacing: -0.4,
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  };
  const qrBackingStyle = {
    position: 'absolute',
    left: 1394,
    top: 334,
    width: 332,
    height: 332,
    borderRadius: 30,
    background: 'rgba(255,255,255,0.72)',
    boxShadow:
      '0 22px 55px rgba(23,21,29,0.08), ' +
      'inset 0 0 0 1px rgba(23,21,29,0.05)',
  };

  return (
    <div style={rootStyle}>
      <div style={studioLightStyle} />

      <div style={questionBlockStyle}>
        <div style={questionLineOneStyle}>{props.questionLineOne}</div>
        <div style={questionLineTwoStyle}>{props.questionLineTwo}</div>
      </div>

      <div style={questionAccentStyle} />

      <div style={answerStyle}>{props.answerText}</div>

      <div style={controlStyle} />

      <div style={responseStyle} />

      <GoldenLens frame={frame} colors={colors} />

      <div style={endCardStyle}>
        <div style={brandStyle}>{props.brandText}</div>
        <div style={ctaStyle}>{props.ctaText}</div>
        <div style={qrBackingStyle} />
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Run the focused contract**

Run:

```powershell
npx jest tests/phraseman_motion_ad_film1_contract.test.ts --runInBand
```

Expected: only the sound prompt file existence check fails.

- [ ] **Step 6: Commit the canonical Motion source**

```powershell
git add tools/phraseman_motion_ads/film1/film1.motion.jsx tools/phraseman_motion_ads/film1/film1.motion-properties.json tests/phraseman_motion_ad_film1_contract.test.ts
git commit -m "feat: author Film 1 motion graphic"
```

---

### Task 3: Create the Motion MCP project and validate the visual asset

**Files:**

- Read: `tools/phraseman_motion_ads/film1/film1.motion.jsx`
- Read: `tools/phraseman_motion_ads/film1/film1.motion-properties.json`
- No committed file changes.

- [ ] **Step 1: Create a fresh Motion project**

Call `create_project`:

```json
{
  "name": "Phraseman · Golden Lens · Film 1",
  "description": "9.5-second reference film for the Phraseman motion-ad trilogy",
  "compositionWidth": 1920,
  "compositionHeight": 1080,
  "fps": 30
}
```

Expected: a new `projectId`, one active 1920×1080 timeline, and an editor URL.
Record the opaque `projectId` only in the current task state; do not commit it.
Immediately call `target_project`:

```json
{
  "projectId": "<projectId>"
}
```

Surface the returned live project card/link and open the returned in-app
browser handoff when available so the user can watch the editable build.
Preserve every query parameter in the internal-browser URL.

- [ ] **Step 2: Confirm the exact font**

Call `search_fonts`:

```json
{
  "projectId": "<projectId>",
  "query": "Inter"
}
```

Expected: canonical family `Inter`.

If Inter is unavailable, stop and ask the user before accepting any font
fallback. Do not use `confirmFontFallback`.

- [ ] **Step 3: Create one representative Motion Graphic**

Read the complete contents of
`tools/phraseman_motion_ads/film1/film1.motion.jsx` and the parsed array from
`film1.motion-properties.json`. Pass both inline to
`create_motion_graphic_from_code`:

```json
{
  "projectId": "<projectId>",
  "name": "Film 1 · Golden Lens",
  "description": "Belief-change insert: language can be used instead of memorised",
  "width": 1920,
  "height": 1080,
  "durationInFrames": 285,
  "code": "<complete inline contents of film1.motion.jsx>",
  "properties": "<parsed array from film1.motion-properties.json>"
}
```

In the actual call, `properties` is the parsed JSON array itself, not the
placeholder string shown above.

Expected: one Motion Graphic asset with a stable asset ID.

- [ ] **Step 4: Inspect the validated source**

Call `read_project` with the returned Motion Graphic asset ID and `code: true`.

Expected:

- duration 285 frames;
- natural size 1920×1080;
- exact Cyrillic copy;
- twelve editable properties with their exact committed defaults;
- no font validation error;
- no external asset dependency inside the Motion Graphic.

- [ ] **Step 5: Place the Motion Graphic with a dry run**

Call `edit_item` with `validateOnly: true`:

```json
{
  "projectId": "<projectId>",
  "validateOnly": true,
  "adds": [
    {
      "type": "motion-graphic",
      "assetId": "<motionGraphicAssetId>",
      "fromFrame": 0,
      "durationInFrames": 285,
      "fit": "cover"
    }
  ]
}
```

Expected: validation succeeds with no overlap.

- [ ] **Step 6: Commit the Motion Graphic placement**

Repeat the same `edit_item` call without `validateOnly`.

- [ ] **Step 7: Import the official icon and QR**

Call `download_media` twice:

```json
{
  "projectId": "<projectId>",
  "url": "https://knowlyapps.com/assets/phraseman-icon.png",
  "type": "image",
  "name": "Phraseman Official Icon"
}
```

```json
{
  "projectId": "<projectId>",
  "url": "https://knowlyapps.com/assets/qr-download.svg",
  "type": "svg",
  "name": "Phraseman Official Download QR"
}
```

Expected: one image asset ID and one SVG asset ID.

- [ ] **Step 8: Place official end-card assets with a dry run**

Call `edit_item` with `validateOnly: true`:

```json
{
  "projectId": "<projectId>",
  "validateOnly": true,
  "adds": [
    {
      "type": "image",
      "assetId": "<iconAssetId>",
      "fromFrame": 155,
      "durationInFrames": 130,
      "left": 220,
      "top": 402,
      "width": 128,
      "height": 128,
      "fit": "contain",
      "fadeIn": 0.3666667
    },
    {
      "type": "svg",
      "assetId": "<qrAssetId>",
      "fromFrame": 155,
      "durationInFrames": 130,
      "left": 1420,
      "top": 360,
      "width": 280,
      "height": 280,
      "fit": "contain",
      "fadeIn": 0.3666667
    }
  ]
}
```

Expected: both overlays fit the canvas, enter over frames 155–165, and remain
fully settled for frames 166–284.

- [ ] **Step 9: Commit the official end-card assets**

Repeat the same `edit_item` call without `validateOnly`.

- [ ] **Step 10: Inspect the timeline**

Call `read_project` with `view: "timeline"`.

Expected:

- full-frame Motion Graphic: frames 0–284;
- icon and QR entry: frames 155–165;
- icon and QR fully settled: frames 166–284;
- no visual item begins after frame 155;
- no QR movement, scale, blur, glow, refraction, or fade after frame 166.

- [ ] **Step 11: Render exact composed-frame proof**

Call `view_timeline_frames`:

```json
{
  "projectId": "<projectId>",
  "timelineId": "<timelineId>",
  "frames": [0, 24, 60, 82, 100, 119, 130, 155, 166, 176, 284]
}
```

Inspect the returned labeled contact sheet. Verify:

- the lens reads as optical glass in a precision gold rim, never as a coin;
- each copy state is legible at normal video scale;
- the question reveal visually follows the lens;
- frame 119 reads as a deliberate edge-on press, not a disappearing object;
- official icon and QR overlays align with their reserved end-card geometry;
- the QR quiet zone is complete and unobstructed at frames 166, 176, and 284.

If any frame fails, patch the canonical source first, update the existing asset
through `edit_asset` with full inline replacement code, and repeat structural
and frame proof. Do not continue to paid sound generation from a visually
rejected reference.

- [ ] **Step 12: Obtain the representative-visual checkpoint**

Show the contact sheet or the live editor reference to the user and obtain
approval of the visual language for Film 1. This is the representative Motion
Graphic gate for the trilogy. Approval permits sound production for Film 1;
it does not permit building Films 2–3 yet.

---

### Task 4: Define and generate the original sound pack

**Files:**

- Create: `tools/phraseman_motion_ads/film1/film1.sound-prompts.json`
- Modify: `tests/phraseman_motion_ad_film1_contract.test.ts`

- [ ] **Step 1: Add a sound-ID coverage test**

Insert this test before the final `});` in
`tests/phraseman_motion_ad_film1_contract.test.ts`:

```ts
  test('defines one approved generation prompt for every referenced sound', () => {
    const manifest = readManifest();
    const prompts = JSON.parse(
      fs.readFileSync(SOUND_PROMPTS_PATH, 'utf8'),
    ) as Array<{
      id: string;
      durationSeconds: number;
      promptInfluence: number;
      prompt: string;
    }>;

    const referenced = [...new Set(manifest.cues.map((cue) => cue.soundId))].sort();
    const defined = prompts.map((item) => item.id).sort();

    expect(defined).toEqual(referenced);
    expect(prompts).toHaveLength(10);

    for (const item of prompts) {
      expect(item.durationSeconds).toBeGreaterThanOrEqual(0.5);
      expect(item.durationSeconds).toBeLessThanOrEqual(1.5);
      expect(item.promptInfluence).toBeGreaterThanOrEqual(0);
      expect(item.promptInfluence).toBeLessThanOrEqual(1);
      expect(item.prompt).toMatch(/isolated/i);
      expect(item.prompt).toMatch(/no (voice|speech)/i);
    }
  });
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npx jest tests/phraseman_motion_ad_film1_contract.test.ts --runInBand
```

Expected: FAIL because `film1.sound-prompts.json` does not exist.

- [ ] **Step 3: Create the exact custom SFX prompt pack**

Create `tools/phraseman_motion_ads/film1/film1.sound-prompts.json`:

```json
[
  {
    "id": "air-gate",
    "durationSeconds": 0.7,
    "promptInfluence": 0.62,
    "prompt": "Isolated 0.7-second premium product-film air-pressure transition: a controlled low breath of air, clean front edge, subtle sub weight, fast elegant decay, designed for a hard cut into a white studio. No voice, no speech, no music, no generic whoosh, no boom, no long reverb."
  },
  {
    "id": "gold-roll",
    "durationSeconds": 1.3,
    "promptInfluence": 0.68,
    "prompt": "Isolated 1.3-second close-miked roll of a precision-made small gold-and-glass lens across a flawless matte studio surface, travelling clearly from left toward centre in stereo. Fine metallic rim contacts, real physical weight, smooth deceleration, luxurious and restrained. No voice, no speech, no coin sound, no rattle, no cartoon roll, no music."
  },
  {
    "id": "glass-reveal",
    "durationSeconds": 0.8,
    "promptInfluence": 0.65,
    "prompt": "Isolated 0.8-second premium optical reveal sound: soft air movement fused with one tempered-glass harmonic that blooms cleanly and settles quickly. Expensive product-launch character, clear on phone speakers. No voice, no speech, no notification ding, no magic sparkle cliché, no music."
  },
  {
    "id": "magnetic-lock",
    "durationSeconds": 0.5,
    "promptInfluence": 0.72,
    "prompt": "Isolated 0.5-second precision magnetic docking sound: a felt-covered mechanical click, tiny metal body, satisfying firm lock, restrained low-frequency confirmation. No voice, no speech, no plastic button, no gun mechanism, no beep, no music."
  },
  {
    "id": "glass-sparkle",
    "durationSeconds": 0.5,
    "promptInfluence": 0.6,
    "prompt": "Isolated 0.5-second single matte-glass glint, one refined high harmonic with a warm body and very short tail, suitable for a punctuation or meaning accent. No voice, no speech, no fairy sparkle, no notification chime, no music."
  },
  {
    "id": "gold-turn",
    "durationSeconds": 0.6,
    "promptInfluence": 0.68,
    "prompt": "Isolated 0.6-second close-up rotation of a precision gold ring turning edge-on: subtle metal tension, soft air displacement, controlled friction, premium studio Foley. No voice, no speech, no squeak, no coin spin, no music."
  },
  {
    "id": "tactile-press",
    "durationSeconds": 0.8,
    "promptInfluence": 0.7,
    "prompt": "Isolated 0.8-second luxury tactile press: soft fingertip-like pressure on a dense glass-and-gold control, gentle low body, crisp mechanical confirmation, tiny warm release. No voice, no speech, no keyboard, no phone tap, no arcade button, no music."
  },
  {
    "id": "air-response",
    "durationSeconds": 0.8,
    "promptInfluence": 0.58,
    "prompt": "Isolated 0.8-second circular air-response pulse spreading outward from one touch, soft low centre, smooth stereo expansion, clean restrained tail. No voice, no speech, no sci-fi sonar, no laser, no bass drop, no music."
  },
  {
    "id": "brand-mnemonic",
    "durationSeconds": 1.2,
    "promptInfluence": 0.74,
    "prompt": "Isolated 1.2-second three-note ascending mnemonic for a premium language-learning brand: tempered glass and celesta, subtle warm harp body, confident upward motion with a soft resolved final note, memorable but restrained. No voice, no speech, no full melody, no corporate jingle, no arcade sound, no long reverb."
  },
  {
    "id": "quiet-room-tone",
    "durationSeconds": 1.5,
    "promptInfluence": 0.45,
    "prompt": "Isolated 1.5-second nearly silent premium studio room tone, warm clean air, extremely subtle depth, no audible hum, no voice, no speech, no melody, no hiss, no environmental events."
  }
]
```

The cue manifest currently references nine active sounds. Add
`quiet-room-tone` to the cue manifest as a low-level bed cue at frame 0:

```json
{
  "id": "studio-room-tone",
  "frame": 0,
  "visualChange": "Ivory studio acoustic space becomes present",
  "soundId": "quiet-room-tone"
}
```

Place it before `cut-to-ivory` so the cue list remains sorted by frame.

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npx jest tests/phraseman_motion_ad_film1_contract.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit the sound contract**

```powershell
git add tools/phraseman_motion_ads/film1/film1.cues.json tools/phraseman_motion_ads/film1/film1.sound-prompts.json tests/phraseman_motion_ad_film1_contract.test.ts
git commit -m "feat: define Film 1 sonic identity"
```

- [ ] **Step 6: Generate exactly one asset per approved prompt**

For each of the ten objects in `film1.sound-prompts.json`, call `submit_sound`
once with:

```json
{
  "projectId": "<projectId>",
  "name": "Film 1 · <id>",
  "durationSeconds": "<durationSeconds>",
  "promptInfluence": "<promptInfluence>",
  "prompt": "<prompt>"
}
```

This is an intentional paid generation batch already covered by the user's
request for original, highly noticeable SFX. Generate exactly ten assets, one
variant each. Do not silently request alternates.

Expected: ten asynchronous job IDs.

- [ ] **Step 7: Wait for the ten sound jobs**

Call `track_progress` with:

```json
{
  "projectId": "<projectId>",
  "target": "generation",
  "action": "wait",
  "jobIds": "<comma-separated job IDs>",
  "timeoutSeconds": 90
}
```

Repeat only for jobs that remain non-terminal.

Expected: ten audio asset IDs. If any job fails, inspect its error and stop.
Do not retry blindly or substitute stock SFX.

- [ ] **Step 8: Verify asset identity**

Call `read_project` with `view: "assets"`.

Expected: one uniquely named audio asset for every ID in
`film1.sound-prompts.json`.

---

### Task 5: Assemble the frame-synchronised sound timeline

**Files:**

- Read: `tools/phraseman_motion_ads/film1/film1.cues.json`
- No committed file changes.

- [ ] **Step 1: Create dedicated audio tracks**

Use `edit_track` to create five audio tracks named:

1. `Room Tone`
2. `Air and Motion`
3. `Mechanical Contacts`
4. `Glass Harmonics`
5. `Brand Mnemonic`

Store the returned stable track IDs in current task state.

- [ ] **Step 2: Build the audio placement batch**

Map cue IDs to track and level:

| Sound ID | Track | Decibel adjustment |
|---|---|---:|
| quiet-room-tone | Room Tone | -22 dB |
| air-gate | Air and Motion | -5 dB |
| gold-roll | Air and Motion | -4 dB |
| gold-turn | Air and Motion | -5 dB |
| air-response | Air and Motion | -7 dB |
| magnetic-lock | Mechanical Contacts | -2 dB |
| tactile-press | Mechanical Contacts | -2 dB |
| glass-reveal | Glass Harmonics | -3 dB |
| glass-sparkle | Glass Harmonics | -4 dB |
| brand-mnemonic | Brand Mnemonic | -2 dB |

Place one audio item for every cue in `film1.cues.json` at the cue's exact
`frame`. Reuse the same generated asset when a sound ID repeats. The room-tone
asset may loop by placing sequential copies until frame 285; do not stretch it.

- [ ] **Step 3: Dry-run the complete audio placement**

Call `edit_item` with all audio `adds` and `validateOnly: true`.

Each add has this shape:

```json
{
  "type": "audio",
  "assetId": "<generated sound asset ID>",
  "fromFrame": 23,
  "trackId": "<stable audio track ID>",
  "decibelAdjustment": -3
}
```

Expected:

- no same-track overlap validation errors;
- every cue is represented;
- no audio begins outside frames 0–284.

If same-track source tails overlap, move only the later event to a new track in
the same sound family. Do not change its frame.

- [ ] **Step 4: Commit the complete audio placement**

Repeat the validated `edit_item` call without `validateOnly`.

- [ ] **Step 5: Inspect the finished timeline**

Call `read_project` with `view: "timeline"`.

Expected:

- 285-frame Motion Graphic;
- official icon and QR enter at frame 155 and are fully settled by frame 166;
- one audio placement for every cue;
- room tone covers the full film;
- mnemonic begins at frame 176;
- no audio extends so far past frame 285 that it masks the return to the lesson.

---

### Task 6: Export and run automated QA

**Files:**

- Create: `tools/phraseman_motion_ads/qa-film1.ps1`

- [ ] **Step 1: Write the verification script**

Create `tools/phraseman_motion_ads/qa-film1.ps1`:

```powershell
param(
  [Parameter(Mandatory = $true)]
  [string]$InputVideo,

  [string]$OutputDirectory = ".codex-tmp/phraseman-motion-ads/film1"
)

$ErrorActionPreference = "Stop"
$resolvedVideo = (Resolve-Path -LiteralPath $InputVideo).Path
$resolvedRoot = (Resolve-Path -LiteralPath ".").Path
$outputPath = Join-Path $resolvedRoot $OutputDirectory
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

$probePath = Join-Path $outputPath "ffprobe.json"
$loudnessPath = Join-Path $outputPath "loudness.txt"
$framesPath = Join-Path $outputPath "frames"
New-Item -ItemType Directory -Force -Path $framesPath | Out-Null

ffprobe -v error `
  -show_entries format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels `
  -of json `
  $resolvedVideo | Set-Content -Encoding utf8 $probePath

ffmpeg -hide_banner -i $resolvedVideo `
  -filter_complex "ebur128=peak=true" `
  -f null NUL 2>&1 | Set-Content -Encoding utf8 $loudnessPath

$timestamps = @("0.0", "0.8", "2.2", "4.3", "5.5", "8.8")
for ($i = 0; $i -lt $timestamps.Count; $i++) {
  $framePath = Join-Path $framesPath ("frame-{0:D2}.png" -f $i)
  ffmpeg -hide_banner -loglevel error -ss $timestamps[$i] -i $resolvedVideo `
    -frames:v 1 -y $framePath
}

Write-Host "Probe: $probePath"
Write-Host "Loudness: $loudnessPath"
Write-Host "Frames: $framesPath"
```

- [ ] **Step 2: Commit the QA script**

```powershell
git add tools/phraseman_motion_ads/qa-film1.ps1
git commit -m "test: add Film 1 render verification"
```

- [ ] **Step 3: Submit the 1080p review export**

Call `submit_export`:

```json
{
  "projectId": "<projectId>",
  "timelineId": "<timelineId>",
  "format": "video",
  "codec": "h264",
  "resolution": "1080p",
  "fps": 30,
  "startFrame": 0,
  "endFrameExclusive": 285,
  "name": "phraseman-golden-lens-film1-review.mp4"
}
```

Expected: one durable render ID.

- [ ] **Step 4: Wait for the export**

Call `track_export`:

```json
{
  "projectId": "<projectId>",
  "action": "wait",
  "renderIds": "<renderId>",
  "timeoutSeconds": 90
}
```

Repeat only while the job remains non-terminal.

Expected: status `complete` and a download URL.

- [ ] **Step 5: Download the completed review master**

Resolve `%USERPROFILE%\Downloads`. Before initiating another download, check
for a fresh matching completed file or `.crdownload` artifact. If a matching
Chrome download is already active, wait for it to finish instead of starting a
duplicate. Otherwise download the returned URL into Downloads with a
collision-safe name:

```text
phraseman-golden-lens-film1-review.mp4
```

Never overwrite an existing file; use ` (1)`, ` (2)`, and so on. Record the
final absolute path in current task state as `<reviewMasterPath>`. Generated QA
reports and frames still belong under
`.codex-tmp/phraseman-motion-ads/film1/`.

- [ ] **Step 6: Run metadata, loudness, and frame extraction**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tools/phraseman_motion_ads/qa-film1.ps1 -InputVideo "<reviewMasterPath>"
```

Expected:

- duration approximately 9.5 seconds;
- 1920×1080 H.264 video;
- 30 fps;
- stereo audio at 48 kHz;
- integrated loudness close to `-14 LUFS-I`;
- true peak no higher than `-1 dBTP`;
- six extracted review frames.

- [ ] **Step 7: Run strict video design analysis**

Call `video_design_quality_check`:

```json
{
  "input_path": "<reviewMasterPath>",
  "auto_fix": false,
  "strict": true
}
```

Expected: no critical layout, typography, contrast, motion, or composition
errors. Do not auto-fix source from the QA tool.

- [ ] **Step 8: Inspect the extracted frames**

Use `view_image` on all six extracted PNG files.

Verify:

- Cyrillic is exact and undamaged;
- text never collides with the lens;
- gold object reads as a precision lens, not a coin;
- the answer remains readable;
- the official icon is not distorted;
- the QR has a complete white quiet zone;
- the final frame has no motion blur or overlay over the QR.

---

### Task 7: Human proof and reference-film decision

**Files:**

- No source changes unless the review identifies a specific issue.

- [ ] **Step 1: Perform real-device QR tests**

Display the final 1080p film at normal size on:

1. a laptop screen;
2. a television or second large display where available.

Scan with:

1. an iPhone;
2. an Android phone.

Expected:

- scan succeeds while the film is playing;
- scan succeeds from the paused end card;
- iOS reaches the App Store destination;
- Android reaches Google Play;
- no manual zoom is required.

If either platform fails, stop. Fix the canonical smart-link QR or end-card
geometry before approval; do not generate a replacement QR inside the motion
project.

- [ ] **Step 2: Perform speaker translation checks**

Listen on:

1. phone speaker;
2. laptop speaker;
3. headphones.

Verify:

- every declared change is audible;
- the mix feels deliberate rather than noisy;
- glass accents are clear but not piercing;
- the lens does not sound like a coin;
- mechanical locks do not sound like weapons;
- the mnemonic is recognisable after one viewing;
- the final tail does not interfere with the lesson resuming.

- [ ] **Step 3: Show the review master to the user**

Present the MP4 inline with:

- the exact local file link;
- the ChatCut project link;
- the strict design-QA status;
- loudness and peak values;
- QR test results by platform;
- a short list of any remaining subjective choices.

- [ ] **Step 4: Record the approval decision**

If approved:

- mark Film 1 as the visual/sonic reference;
- write a separate implementation plan for Films 2 and 3 plus 4K delivery.

If changes are requested:

- patch the canonical source first;
- update the Motion Graphic through `edit_asset` using complete inline source;
- re-export and repeat Tasks 6–7;
- do not build Films 2 and 3 from a rejected reference.

---

## Final completion gate

The Film 1 reference is complete only when all of the following are true:

- focused Jest contract passes;
- Motion MCP validates the canonical source;
- exact Inter font renders;
- official icon and QR are used unchanged;
- every declared visual change has an audible cue, and room tone covers the
  complete film;
- no generated audio job silently failed;
- duration is 285 frames at 30 fps;
- QR is fully settled and still for at least 119 frames;
- strict video design QA has no critical failure;
- loudness and true peak meet the target;
- QR works on iOS and Android;
- the user explicitly approves the rendered reference film.
