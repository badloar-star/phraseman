package app.phraseman.phrasewidget

import android.content.Context
import android.util.Log
import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * Bridges the JS widget payload into SharedPreferences that the Glance widget
 * reads, and triggers a Glance update. RN is the sole writer.
 *
 * Shared identifiers MUST match constants.ts and PhraseGlanceWidget.kt:
 *   prefs file: app.phraseman.widget
 *   key:        phrase_of_the_day_v1
 *
 * Single-process invariant: the GlanceAppWidgetReceiver runs in the default app
 * process (no android:process), so MODE_PRIVATE SharedPreferences are shared
 * safely with this module. Do not give the receiver a separate process.
 */
class PhraseWidgetModule : Module() {

  // Module-scoped, lifecycle-bound scope (structured concurrency). Cancelled in
  // OnDestroy so background updates never outlive the module.
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  override fun definition() = ModuleDefinition {
    Name("PhraseWidget")

    AsyncFunction("setData") { payload: Map<String, Any?> ->
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("React context unavailable")

      // Validate the boundary against the CURRENT schema (v3 personal decks).
      // зачем: раньше здесь требовались плоские поля english/deepLink из схемы v2.
      // Виджет переехал на личные колоды (decks/access), этих полей в снимке больше
      // нет — и каждый setData падал, поэтому Android-виджет вечно показывал
      // заглушку, а отказ был немым (ошибку глушил catch в widget_bridge).
      // Проверяем только то, что схема действительно шлёт.
      val schemaVersion = (payload["schemaVersion"] as? Number)?.toInt() ?: 0
      val access = (payload["access"] as? String)?.trim().orEmpty()
      require(schemaVersion > 0) { "widget payload missing 'schemaVersion'" }
      require(access.isNotEmpty()) { "widget payload missing 'access'" }
      require(payload["decks"] != null) { "widget payload missing 'decks'" }

      // зачем: org.json.JSONObject(Map) НЕ конвертирует вложенные Map/List — кладёт
      // их как чужие объекты, и читатель виджета (optJSONObject("decks"),
      // optJSONArray("cards")) получил бы null. В схеме v2 вложенным был только
      // theme и это прощалось; у v3 вложены и колоды, и массив карточек,
      // поэтому конвертируем дерево явно.
      val json = toJsonObject(payload).toString()
      context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(STORAGE_KEY, json)
        .apply()
    }

    AsyncFunction("reloadAll") {
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("React context unavailable")
      // updateAll is suspend; run on the module scope so it is cancellable and
      // tied to the module lifecycle rather than a throwaway scope.
      scope.launch {
        try {
          PhraseGlanceWidget().updateAll(context)
        } catch (e: CancellationException) {
          throw e
        } catch (e: Throwable) {
          // No widget instances placed yet, or Glance unavailable — log, don't crash.
          Log.w(TAG, "reloadAll failed", e)
        }
      }
      Unit
    }

    OnDestroy {
      scope.cancel()
    }
  }

  /** Recursively turns the JS payload tree into real JSON nodes the widget can read. */
  private fun toJsonObject(map: Map<*, *>): JSONObject {
    val json = JSONObject()
    for ((key, value) in map) {
      json.put(key.toString(), toJsonValue(value))
    }
    return json
  }

  private fun toJsonArray(list: List<*>): JSONArray {
    val json = JSONArray()
    for (value in list) json.put(toJsonValue(value))
    return json
  }

  private fun toJsonValue(value: Any?): Any = when (value) {
    null -> JSONObject.NULL
    is Map<*, *> -> toJsonObject(value)
    is List<*> -> toJsonArray(value)
    is Array<*> -> toJsonArray(value.toList())
    else -> value
  }

  companion object {
    const val PREFS_NAME = "app.phraseman.widget"
    const val STORAGE_KEY = "phrase_of_the_day_v1"
    private const val TAG = "PhraseWidget"
  }
}
