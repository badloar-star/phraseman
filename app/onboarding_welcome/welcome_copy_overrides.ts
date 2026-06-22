// ════════════════════════════════════════════════════════════════════════════
// welcome_copy_overrides.ts — наложение РЕДАКТИРУЕМЫХ из «Пульта» текстов
// приветствия поверх встроенных (welcome_steps.ts).
//
// Источник правок — RemoteTextKey 'welcome_copy_overrides' (JSON), который админ
// меняет в admin/index.html ПОСЛЕ релиза без пересборки. Любое поле, которого
// нет/пустое в оверрайде, берётся из кода (безопасный фолбэк). Парсинг защищён:
// мусор тихо отбрасывается, приложение не падает.
//
// Формат JSON (все поля опциональны):
// {
//   "free": {
//     "intro": { "title": "...", "body": "...", "primary": "...", "secondary": "..." },
//     "outro": { "title": "...", "body": "...", "primary": "..." },
//     "steps": { "<targetKey>": { "title": "...", "body": "..." }, ... }
//   },
//   "plan": { ... то же ... }
// }
// Шаги адресуются по ПЕРВОМУ target-ключу шага (стабильный id блока).
// ════════════════════════════════════════════════════════════════════════════
import { getRemoteText } from '../remote_flags';
import type { WelcomeBranch } from './welcome_gate';
import type { WelcomeScript } from './welcome_steps';

interface IntroOverride {
  title?: string;
  body?: string;
  primary?: string;
  secondary?: string;
}
interface OutroOverride {
  title?: string;
  body?: string;
  primary?: string;
}
interface StepOverride {
  title?: string;
  body?: string;
}
interface BranchOverride {
  intro?: IntroOverride;
  outro?: OutroOverride;
  steps?: Record<string, StepOverride>;
}
export type WelcomeCopyOverrides = Partial<Record<WelcomeBranch, BranchOverride>>;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Непустая строка после trim, иначе undefined (пустое поле = фолбэк из кода). */
function str(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? v : undefined;
}

/** Защищённый разбор JSON-оверрайдов приветствия. Мусор → {}. */
export function parseWelcomeCopyOverrides(raw: string): WelcomeCopyOverrides {
  if (!raw || !raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isObj(parsed)) return {};

  const out: WelcomeCopyOverrides = {};
  (['free', 'plan'] as const).forEach((branch) => {
    const b = parsed[branch];
    if (!isObj(b)) return;
    const bo: BranchOverride = {};

    if (isObj(b.intro)) {
      bo.intro = {
        title: str(b.intro.title),
        body: str(b.intro.body),
        primary: str(b.intro.primary),
        secondary: str(b.intro.secondary),
      };
    }
    if (isObj(b.outro)) {
      bo.outro = {
        title: str(b.outro.title),
        body: str(b.outro.body),
        primary: str(b.outro.primary),
      };
    }
    if (isObj(b.steps)) {
      const steps: Record<string, StepOverride> = {};
      Object.keys(b.steps).forEach((k) => {
        const s = (b.steps as Record<string, unknown>)[k];
        if (isObj(s)) steps[k] = { title: str(s.title), body: str(s.body) };
      });
      bo.steps = steps;
    }
    out[branch] = bo;
  });
  return out;
}

/** Наложить оверрайды на встроенный сценарий. Возвращает НОВЫЙ объект (immutable). */
export function applyWelcomeOverrides(
  branch: WelcomeBranch,
  base: WelcomeScript,
  overrides: WelcomeCopyOverrides,
): WelcomeScript {
  const ov = overrides[branch];
  if (!ov) return base;

  return {
    intro: {
      title: ov.intro?.title ?? base.intro.title,
      body: ov.intro?.body ?? base.intro.body,
      primary: ov.intro?.primary ?? base.intro.primary,
      secondary: ov.intro?.secondary ?? base.intro.secondary,
    },
    outro: {
      title: ov.outro?.title ?? base.outro.title,
      body: ov.outro?.body ?? base.outro.body,
      primary: ov.outro?.primary ?? base.outro.primary,
    },
    steps: base.steps.map((step) => {
      const stepKey = step.targets[0];
      const so = stepKey ? ov.steps?.[stepKey] : undefined;
      if (!so) return step;
      return { ...step, title: so.title ?? step.title, body: so.body ?? step.body };
    }),
  };
}

/** Прочитать живые оверрайды из Remote Config и наложить на встроенный сценарий. */
export function resolveWelcomeScript(branch: WelcomeBranch, base: WelcomeScript): WelcomeScript {
  const overrides = parseWelcomeCopyOverrides(getRemoteText('welcome_copy_overrides'));
  return applyWelcomeOverrides(branch, base, overrides);
}

// ─── Слайды-знакомство: тот же JSON оверрайдов, но слайды адресуются по id ────
import type { WelcomeSlidesScript, WelcomeSlide } from './welcome_slides';

function applySlidesOverrides(branch: WelcomeBranch, base: WelcomeSlidesScript, ov: WelcomeCopyOverrides): WelcomeSlidesScript {
  const b = ov[branch];
  if (!b) return base;
  const overSlide = (s: WelcomeSlide): WelcomeSlide => {
    const so = b.steps?.[s.id];
    if (!so) return s;
    return { ...s, title: so.title ?? s.title, body: so.body ?? s.body };
  };
  return {
    ...base,
    intro: { ...base.intro, title: b.intro?.title ?? base.intro.title, body: b.intro?.body ?? base.intro.body },
    slides: base.slides.map(overSlide),
    outro: { title: b.outro?.title ?? base.outro.title, body: b.outro?.body ?? base.outro.body },
    primaryStart: b.outro?.primary ?? base.primaryStart,
  };
}

/** Живые оверрайды Remote Config поверх встроенного сценария слайдов. */
export function resolveWelcomeSlides(branch: WelcomeBranch, base: WelcomeSlidesScript): WelcomeSlidesScript {
  const overrides = parseWelcomeCopyOverrides(getRemoteText('welcome_copy_overrides'));
  return applySlidesOverrides(branch, base, overrides);
}
