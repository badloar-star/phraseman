/**
 * Wire contract for the phrase-widget native bridge.
 *
 * Owned by the module (the lower layer) so the dependency direction is correct:
 * app/widget_bridge.ts imports THIS, not the other way round. Intentionally
 * self-contained — only primitive/string fields, since the payload is just
 * serialized into platform shared storage and read by native code. No app
 * domain types leak across the bridge.
 */

/** Theme palette so native renders the same look as the in-app card. */
export interface WidgetThemePayload {
  mode: string;
  gradientTop: string;
  gradientMid: string;
  gradientBottom: string;
  border: string;
  titleColor: string;
  phraseColor: string;
  subColor: string;
  accent: string;
  chipBg: string;
  chipBorder: string;
  glow: string;
}

export type WidgetDeckSource = 'saved' | 'created';

export interface WidgetDeckCardPayload {
  id: string;
  english: string;
  meaning: string;
  transcription: string;
  deepLink: string;
}

export interface WidgetDeckPayload {
  empty: boolean;
  cards: WidgetDeckCardPayload[];
}

/** Snapshot written to shared storage and read by the native widgets. */
export interface WidgetPayload {
  schemaVersion: 3;
  /** Fail-closed entitlement state, calculated by RN before native rendering. */
  access: 'plus' | 'free';
  /** Every widget instance chooses one of these independent personal collections. */
  decks: Record<WidgetDeckSource, WidgetDeckPayload>;
  lang: string;
  theme: WidgetThemePayload;
  updatedAt: number;
}
