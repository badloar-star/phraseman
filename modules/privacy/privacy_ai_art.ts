import type { ThemedArtName } from '../../components/theme/themed_art_registry';

/** AI-off art replaces the ordinary feature glyph only while that feature is disabled. */
export function privacyAiStateArt(enabled: boolean): Extract<ThemedArtName, 'ai_off'> | null {
  return enabled ? null : 'ai_off';
}
