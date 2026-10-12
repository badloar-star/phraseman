// ═════════════════════════════════════════════════════════════════════
// lessonCardLightSurface.ts — светлая плашка урока для светлого оформления (решение владельца 12.10, журнал п.81 (11): «карточки уроков при СВЕТЛОМ оформлении — сделать светлые»).
//
// зачем: плашка урока (LessonCard на карте курса) по замыслу была ВСЕГДА тёмной с белым текстом (палитра уровня, затемнённая на 0,52…0,38), и на светлой теме это был тёмный брусок среди белых карточек.
// Светлая ветка строится из токенов активной темы, своих hex нет: основа — `opaqueCard` темы, тон уровня — `levelXX` ТЕМНЫХ чернил светлого оформления (они читаются на светлой поверхности ≥ 4,5),
// смешанные с основой в малой доле; текст — `text` темы. Чистый модуль без react-native: контраст проверяется тестом по всем темам × ступеням ползунка.
// ═════════════════════════════════════════════════════════════════════

/** Токены, нужные светлой плашке (подмножество GlassTokens). */
export type LessonCardLightTokens = {
  readonly text: string;
  readonly secondary: string;
  readonly opaqueCard: string;
};

export type LessonCardLightSurface = {
  /** Три остановки градиента открытой плашки (низ-лево → верх-право, как у тёмной). */
  readonly fill: readonly [string, string, string];
  /** Остановки градиента закрытой (ещё не открытой) плашки — почти нейтральные. */
  readonly lockedFill: readonly [string, string, string];
  /** Заливка пройденной части плашки (слева направо). */
  readonly progress: readonly [string, string];
  /** Цвет основного текста (название урока, метка, процент). */
  readonly text: string;
  /** Цвет текста на закрытой плашке (приглушённый, но ≥ 4,5). */
  readonly lockedText: string;
  /** Верхняя кромка заливки прогресса. */
  readonly edge: string;
};

function channel(hex: string, from: number): number {
  return parseInt(hex.slice(from, from + 2), 16);
}

function hexOf(r: number, g: number, b: number): string {
  const part = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Смесь двух #rrggbb: доля `amount` от `top` поверх `base`. */
export function mixHex(base: string, top: string, amount: number): string {
  const a = Math.max(0, Math.min(1, amount));
  return hexOf(
    channel(base, 1) * (1 - a) + channel(top, 1) * a,
    channel(base, 3) * (1 - a) + channel(top, 3) * a,
    channel(base, 5) * (1 - a) + channel(top, 5) * a,
  );
}

// Доли тона уровня: у открытой плашки заливка лёгкая (текст остаётся тёмным и читаемым), у пройденной части — плотнее, у закрытой — едва заметный оттенок.
const FILL_AMOUNTS = [0.1, 0.14, 0.18] as const;
const LOCKED_AMOUNTS = [0.03, 0.045, 0.06] as const;
const PROGRESS_AMOUNTS = [0.22, 0.32] as const;

const cache = new Map<string, LessonCardLightSurface>();

/** Светлая плашка урока: `ink` — чернила уровня светлого оформления (`levelXX` токенов), `tokens` — токены той же темы. Результат кэшируется (стабильные ссылки для memo плашки). */
export function lessonCardLightSurface(ink: string, tokens: LessonCardLightTokens): LessonCardLightSurface {
  const key = `${ink}|${tokens.opaqueCard}|${tokens.text}|${tokens.secondary}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = tokens.opaqueCard;
  const made: LessonCardLightSurface = Object.freeze({
    fill: Object.freeze([mixHex(base, ink, FILL_AMOUNTS[0]), mixHex(base, ink, FILL_AMOUNTS[1]), mixHex(base, ink, FILL_AMOUNTS[2])]) as readonly [string, string, string],
    lockedFill: Object.freeze([mixHex(base, ink, LOCKED_AMOUNTS[0]), mixHex(base, ink, LOCKED_AMOUNTS[1]), mixHex(base, ink, LOCKED_AMOUNTS[2])]) as readonly [string, string, string],
    progress: Object.freeze([mixHex(base, ink, PROGRESS_AMOUNTS[0]), mixHex(base, ink, PROGRESS_AMOUNTS[1])]) as readonly [string, string],
    text: tokens.text,
    lockedText: tokens.secondary,
    edge: mixHex(base, ink, 0.5),
  });
  cache.set(key, made);
  return made;
}
