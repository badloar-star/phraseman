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
}

/** Snapshot written to shared storage and read by the native widgets. */
export interface WidgetPayload {
  schemaVersion: 2;
  phraseId: string;
  english: string;
  meaning: string;
  literal: string;
  transcription: string;
  kicker: string;
  deepLink: string;
  playDeepLink: string;
  lang: string;
  theme: WidgetThemePayload;
  date: string;
  updatedAt: number;
}
