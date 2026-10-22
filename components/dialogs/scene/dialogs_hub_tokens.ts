// ═══════════════════════════════════════════════════════════════════════════
// dialogs_hub_tokens.ts — токены хаба Диалогов (макет docs/design/v2-app/dialogs-hub.html, коммит 556e3086c) в оттенках ТЕКУЩЕЙ темы.
//
// зачем (координатор 22.10: «подготовь токены под хаб Диалогов — плитки, карточки тем в оттенках, как seasonThemedArt, «таблетка»-переключатель тем»; закон владельца: цвета строго оттенки текущей темы):
// 4 «мира» (Общение, Дела, Поездки, Повседневное) красятся ОДНИМ оттенком — оттенком темы; миры различаются светлотой и насыщенностью, как в макете (TONES: l1 .46/.36/.52/.41, l2 .34/.25/.38/.30,
// множитель насыщенности .95/.7/1.3/.85), поэтому «свой цвет мира» не нужен. Остальное — токены темы: плитка = opaqueControl, значок accentGraphic, таблетка-переключатель = дорожка opaqueControl
// + выбранный пункт «текст на фоне» (как primary-кнопка списков хаба уроков), карточка диалога = opaqueCard (текущая — с 14 % акцента, закрытая — смесь с фоном).
// Реализация экрана — после выбора владельца (3 варианта макета).
// ═══════════════════════════════════════════════════════════════════════════
import { lv2Mix } from '../../learning-v2/learning_v2_task_theme_tokens';
import { oklchToHex } from '../../learning-v2/season/season_art';

/** Тона миров из макета: светлота начала/конца градиента (160°) и множитель насыщенности. Порядок миров: social, work, travel, everyday. */
export const DIALOGS_WORLD_TONES: readonly Readonly<{ l1: number; l2: number; cm: number }>[] = Object.freeze([
  { l1: 0.46, l2: 0.34, cm: 0.95 },
  { l1: 0.36, l2: 0.25, cm: 0.7 },
  { l1: 0.52, l2: 0.38, cm: 1.3 },
  { l1: 0.41, l2: 0.3, cm: 0.85 },
]);

export type DialogsWorldArt = Readonly<{ from: string; to: string; glow: string }>;

const worldCache = new Map<string, DialogsWorldArt>();

/**
 * Градиент карточки мира: `from` → `to` по диагонали 160°, `glow` — световое пятно (радиал 60 % × 45 % в точке 90 % 0, непрозрачность 0,45 даёт экран).
 * themeHue = hexHue(g.accent) (components/learning-v2/season/season_art). Белый текст на `from`/`to` ≥ 4,5 во всех темах (тест dialogs_hub_tokens).
 */
export function dialogsWorldArt(themeHue: number, worldIndex: number, appearance: 'light' | 'dark'): DialogsWorldArt {
  const i = ((Math.round(worldIndex) % DIALOGS_WORLD_TONES.length) + DIALOGS_WORLD_TONES.length) % DIALOGS_WORLD_TONES.length;
  const key = `${Math.round(themeHue)}:${i}:${appearance}`;
  const hit = worldCache.get(key);
  if (hit) return hit;
  const tone = DIALOGS_WORLD_TONES[i]!;
  const baseChroma = appearance === 'dark' ? 0.085 : 0.15; // --cc макета
  const chroma = baseChroma * tone.cm;
  const hue = ((themeHue % 360) + 360) % 360;
  const next: DialogsWorldArt = Object.freeze({
    from: oklchToHex(tone.l1, chroma, hue),
    to: oklchToHex(tone.l2, chroma, hue),
    glow: oklchToHex(0.6, chroma, hue),
  });
  worldCache.set(key, next);
  return next;
}

type HubGlass = Readonly<{
  text: string; secondary: string; bg: string; accent: string; accentInk: string; accentGraphic: string; accentTextSafe: string;
  opaqueCard: string; opaqueControl: string;
}>;

export type DialogsHubTokens = Readonly<{
  /** Плитка-кнопка (Все диалоги, Свободный диалог, Пройденные): фон, подпись, значок, счётчик. */
  tile: Readonly<{ bg: string; label: string; icon: string; count: string }>;
  /** Значок «Plus» на плитке «Свободный диалог». */
  plus: Readonly<{ bg: string; ink: string }>;
  /** «Таблетка»-переключатель тем: дорожка, неактивный пункт, выбранный пункт. */
  pill: Readonly<{ track: string; idleInk: string; selectedBg: string; selectedInk: string }>;
  /** Карточка диалога в списке/сетке: заливка по состоянию, подписи, чип уровня. */
  card: Readonly<{ fill: string; fillCurrent: string; fillLocked: string; title: string; sub: string; levelBg: string; levelInk: string; doneInk: string; icon: string }>;
}>;

const hubCache = new WeakMap<object, DialogsHubTokens>();

export function dialogsHubTokens(g: HubGlass): DialogsHubTokens {
  const hit = hubCache.get(g);
  if (hit) return hit;
  const next: DialogsHubTokens = Object.freeze({
    tile: Object.freeze({ bg: g.opaqueControl, label: g.text, icon: g.accentGraphic, count: g.secondary }),
    plus: Object.freeze({ bg: g.accent, ink: g.accentInk }),
    pill: Object.freeze({ track: g.opaqueControl, idleInk: g.secondary, selectedBg: g.text, selectedInk: g.bg }),
    card: Object.freeze({
      fill: g.opaqueCard,
      fillCurrent: lv2Mix(g.opaqueCard, g.accent, 0.14),
      fillLocked: lv2Mix(g.opaqueCard, g.bg, 0.45),
      title: g.text,
      sub: g.secondary,
      levelBg: g.opaqueControl,
      levelInk: g.text,
      doneInk: g.accentTextSafe,
      icon: g.accentGraphic,
    }),
  });
  hubCache.set(g, next);
  return next;
}
