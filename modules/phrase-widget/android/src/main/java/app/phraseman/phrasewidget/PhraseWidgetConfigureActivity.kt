package app.phraseman.phrasewidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView

/** Per-widget source selection. Phrase data remains owned by RN's snapshot. */
class PhraseWidgetConfigureActivity : Activity() {
  private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
    setResult(RESULT_CANCELED)
    setContentView(LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(48, 56, 48, 56)
      addView(choice("Saved", "saved"))
      addView(choice("My phrases", "created"))
    })
  }

  private fun choice(label: String, source: String) = TextView(this).apply {
    text = label; textSize = 20f; setPadding(0, 36, 0, 36)
    setOnClickListener {
      getSharedPreferences(PhraseWidgetModule.PREFS_NAME, MODE_PRIVATE).edit()
        .putString(PhraseGlanceWidget.sourceForWidget(widgetId), source).apply()
      setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
      finish()
    }
  }
}
