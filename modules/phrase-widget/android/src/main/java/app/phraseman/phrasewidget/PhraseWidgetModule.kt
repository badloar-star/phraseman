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

      // Validate the boundary: require the essential string fields before persisting.
      val english = (payload["english"] as? String)?.trim().orEmpty()
      val deepLink = (payload["deepLink"] as? String)?.trim().orEmpty()
      require(english.isNotEmpty()) { "widget payload missing 'english'" }
      require(deepLink.isNotEmpty()) { "widget payload missing 'deepLink'" }

      val json = JSONObject(payload).toString()
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
    }

    OnDestroy {
      scope.cancel()
    }
  }

  companion object {
    const val PREFS_NAME = "app.phraseman.widget"
    const val STORAGE_KEY = "phrase_of_the_day_v1"
    private const val TAG = "PhraseWidget"
  }
}
