/**
 * Shared identifiers for the phrase-of-the-day widget bridge.
 *
 * These MUST stay in sync with the native code:
 *   - iOS:     APP_GROUP / STORAGE_KEY in PhraseWidgetModule.swift + the widget extension
 *   - Android: PREFS_NAME / STORAGE_KEY in PhraseWidgetModule.kt + the Glance widget
 *
 * Centralizing them here is documentation only — native cannot import TS — so any
 * change here requires the same edit on both native sides. The values are chosen
 * to derive from the app id (app.phraseman) for clarity.
 */

/** iOS App Group container shared between the app and the widget extension. */
export const IOS_APP_GROUP = 'group.app.phraseman.widget';

/** Android SharedPreferences file shared between the app and the widget. */
export const ANDROID_PREFS_NAME = 'app.phraseman.widget';

/** Key under which the JSON snapshot (WidgetPayload) is stored on both platforms. */
export const STORAGE_KEY = 'phrase_of_the_day_v1';
