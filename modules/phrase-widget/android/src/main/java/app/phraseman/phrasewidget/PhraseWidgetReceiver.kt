package app.phraseman.phrasewidget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Manifest entry point for the phrase-of-the-day Glance widget. Registered by
 * the Android config plugin (withAndroidDailyPhraseWidget.js).
 */
class PhraseWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = PhraseGlanceWidget()
}
