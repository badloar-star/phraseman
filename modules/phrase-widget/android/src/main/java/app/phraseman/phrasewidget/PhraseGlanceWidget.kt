package app.phraseman.phrasewidget

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Color as AndroidColor
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import org.json.JSONObject
import kotlin.math.roundToInt

/**
 * Phrase-of-the-day home-screen widget (Jetpack Glance).
 *
 * Renders a premium card whose palette is driven entirely by the active app
 * theme (carried in the snapshot RN writes), so the widget is a faithful
 * extension of the in-app Daily Phrase card across all 8 themes.
 *
 * Surface: a diagonal 3-stop gradient (top-leading → bottom-trailing, mid held
 * to ~56%) + a soft top-right accent bloom + a hairline border — drawn into a
 * Bitmap and used as the card background, because Glance has no gradient brush.
 * This matches the in-app card and the iOS widget instead of the old flat fill.
 *
 * Content: a rounded identity chip + accent kicker ("ФРАЗА ДНЯ"), the phrase as
 * the hero (wraps fully — never an ellipsis-truncated single line), the meaning,
 * an IPA transcription on larger sizes, and on medium a round accent ▶ chip.
 * Tapping the card opens the phrase; ▶ opens it with auto-speak (the widget
 * itself never plays audio — on-device speech needs the app process).
 */
class PhraseGlanceWidget : GlanceAppWidget() {

  /** Keys are deliberately widget-instance scoped; configuration never leaks. */
  companion object {
    private const val MAX_SCHEMA_VERSION = 3

    fun sourceForWidget(appWidgetId: Int) = "personal_deck_source_$appWidgetId"
    fun cursorForWidget(appWidgetId: Int) = "personal_deck_cursor_$appWidgetId"
  }

  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val appWidgetId = androidx.glance.appwidget.GlanceAppWidgetManager(context).getAppWidgetId(id)
    val snapshot = readSnapshot(context, appWidgetId)
    provideContent {
      GlanceTheme {
        WidgetBody(snapshot)
      }
    }
  }

  @Composable
  private fun WidgetBody(snapshot: Snapshot?) {
    val size = LocalSize.current
    val context = LocalContext.current
    val compact = size.height < 116.dp
    val tiny = size.height < 84.dp

    if (snapshot == null) {
      EmptyState()
      return
    }

    val t = snapshot.theme
    val accent = parse(t.accent, 0xFF58CC89)
    val title = parse(t.titleColor, 0xFFD9FFE5)
    val phrase = parse(t.phraseColor, 0xFFFFFFFF)
    val sub = parse(t.subColor, 0xFFB8D9C2)
    val chipBg = parse(t.chipBg, 0x2258CC89)

    val openIntent = actionStartActivity(deepLinkIntent(snapshot.deepLink))

    // Lit, dimensional surface: gradient + glow + hairline border baked into a
    // bitmap so it matches the in-app card and the iOS widget.
    val wPx = (size.width.value * context.resources.displayMetrics.density).roundToInt().coerceIn(1, 2000)
    val hPx = (size.height.value * context.resources.displayMetrics.density).roundToInt().coerceIn(1, 2000)
    val radiusPx = 24f * context.resources.displayMetrics.density
    val surface = surfaceBitmap(wPx, hPx, radiusPx, t)

    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .cornerRadius(24.dp)
        .background(ImageProvider(surface))
        .padding(horizontal = 18.dp, vertical = 16.dp)
        .clickable(openIntent),
    ) {
      if (!tiny) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          // Identity chip — the in-app card's icon plaque.
          Box(
            modifier = GlanceModifier
              .size(22.dp)
              .cornerRadius(7.dp)
              .background(ColorProvider(chipBg)),
            contentAlignment = Alignment.Center,
          ) {
            Text(
              "“",
              style = TextStyle(color = ColorProvider(accent), fontSize = 16.sp, fontWeight = FontWeight.Bold),
              maxLines = 1,
            )
          }
          Spacer(GlanceModifier.width(8.dp))
          Text(
            snapshot.kicker.ifEmpty { "ФРАЗА ДНЯ" },
            style = TextStyle(
              color = ColorProvider(title),
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
            ),
            maxLines = 1,
          )
          if (snapshot.isStale) {
            Spacer(GlanceModifier.width(6.dp))
            Text(
              "·",
              style = TextStyle(color = ColorProvider(sub), fontSize = 14.sp, fontWeight = FontWeight.Bold),
              maxLines = 1,
            )
          }
        }
        Spacer(GlanceModifier.height(10.dp))
      }

      // Hero phrase — wraps to multiple lines; never an ellipsis-clipped one-liner.
      Text(
        snapshot.english,
        style = TextStyle(
          color = ColorProvider(phrase),
          fontSize = if (compact) 19.sp else 23.sp,
          fontWeight = FontWeight.Bold,
        ),
        maxLines = if (tiny) 2 else 3,
      )

      Spacer(GlanceModifier.height(6.dp))

      Text(
        snapshot.meaning,
        style = TextStyle(color = ColorProvider(sub), fontSize = 14.sp),
        maxLines = if (tiny) 2 else 3,
      )

      if (!compact && snapshot.transcription.isNotEmpty()) {
        Spacer(GlanceModifier.height(4.dp))
        Text(
          snapshot.transcription,
          style = TextStyle(color = ColorProvider(sub), fontSize = 12.sp),
          maxLines = 1,
        )
      }

      // Play affordance only when there is room (medium-ish), matching iOS which
      // shows it on medium only. A round accent chip, clearly tappable.
      if (!compact && snapshot.canNavigate) {
        Spacer(GlanceModifier.defaultWeight())
        Row(
          modifier = GlanceModifier.fillMaxWidth(),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Box(
            modifier = GlanceModifier
              .cornerRadius(20.dp)
              .background(ColorProvider(strengthen(chipBg, accent)))
              .padding(horizontal = 16.dp, vertical = 12.dp)
              .clickable(actionRunCallback<PreviousPhraseAction>()),
            contentAlignment = Alignment.Center,
          ) {
            Text(
              tapHint(snapshot.kicker),
              style = TextStyle(
                color = ColorProvider(accent),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
              ),
              maxLines = 1,
            )
          }
          Spacer(GlanceModifier.defaultWeight())
          Box(
            modifier = GlanceModifier
              .cornerRadius(20.dp)
              .background(ColorProvider(strengthen(chipBg, accent)))
              .padding(horizontal = 16.dp, vertical = 12.dp)
              .clickable(actionRunCallback<NextPhraseAction>()),
            contentAlignment = Alignment.Center,
          ) {
            Text(
              "Next",
              style = TextStyle(
                color = ColorProvider(accent),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
              ),
              maxLines = 1,
            )
          }
        }
      }
    }
  }

  /** Localized "Listen" label paired with the ▶ glyph, derived from the kicker locale. */
  private fun tapHint(@Suppress("UNUSED_PARAMETER") kicker: String): String = "Previous"

  private fun legacyTapHint(kicker: String): String = when {
    kicker.contains("ФРАЗА") -> "Слушать"
    kicker.contains("ВИСЛІВ") -> "Слухати"
    kicker.contains("FRASE DEL") -> "Escuchar"   // es
    kicker.contains("FRASE DO") -> "Ouvir"        // pt-BR
    kicker.contains("CỤM TỪ") -> "Nghe"           // vi
    kicker.contains("FRASA") -> "Dengar"          // id
    kicker.contains("İFADE") -> "Dinle"           // tr
    kicker.contains("FRAZA") -> "Słuchaj"         // pl
    else -> "Listen"
  }

  @Composable
  private fun EmptyState() {
    Box(
      modifier = GlanceModifier
        .fillMaxSize()
        .cornerRadius(24.dp)
        .background(ColorProvider(Color(0xFF152019))),
      contentAlignment = Alignment.Center,
    ) {
      Text(
        "Phraseman",
        style = TextStyle(
          color = ColorProvider(Color(0xFF8AB49A)),
          fontWeight = FontWeight.Medium,
        ),
      )
    }
  }

  /**
   * Bakes the card surface — diagonal 3-stop gradient + top-right accent bloom +
   * 1dp hairline border — into a rounded bitmap. Glance has no gradient brush, so
   * a bitmap background is the portable way to match the in-app card / iOS.
   */
  private fun surfaceBitmap(w: Int, h: Int, radius: Float, t: SnapshotTheme): Bitmap {
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val rect = RectF(0f, 0f, w.toFloat(), h.toFloat())

    val top = colorInt(t.gradientTop, 0xFF193025.toInt())
    val mid = colorInt(t.gradientMid, 0xFF13241C.toInt())
    val bottom = colorInt(t.gradientBottom, 0xFF09110D.toInt())

    val gradPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    gradPaint.shader = LinearGradient(
      0f, 0f, w.toFloat(), h.toFloat(),
      intArrayOf(top, mid, bottom),
      floatArrayOf(0f, 0.56f, 1f),
      Shader.TileMode.CLAMP,
    )
    canvas.drawRoundRect(rect, radius, radius, gradPaint)

    // Soft top-right accent bloom.
    val glow = colorInt(t.glow, 0x3347C870)
    if (AndroidColor.alpha(glow) > 0) {
      val gx = w * 0.92f
      val gy = h * -0.08f
      val gr = w * 0.55f
      val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
      glowPaint.shader = RadialGradient(
        gx, gy, gr,
        intArrayOf(glow, glow and 0x00FFFFFF),
        floatArrayOf(0f, 1f),
        Shader.TileMode.CLAMP,
      )
      canvas.drawRoundRect(rect, radius, radius, glowPaint)
    }

    // Hairline border.
    val borderColor = colorInt(t.border, 0x4774E89C)
    if (AndroidColor.alpha(borderColor) > 0) {
      val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG)
      borderPaint.style = Paint.Style.STROKE
      borderPaint.strokeWidth = 1.5f
      borderPaint.color = borderColor
      val inset = 0.75f
      canvas.drawRoundRect(
        RectF(inset, inset, w - inset, h - inset),
        radius - inset, radius - inset, borderPaint,
      )
    }
    return bmp
  }

  /** Stronger pill fill so the Listen affordance reads as a button, not a ghost. */
  private fun strengthen(chipBg: Color, accent: Color): Color {
    // Blend the (faint) chip background toward the accent for a clearer button.
    val a = 0.20f
    val r = accent.red * a + chipBg.red * (1 - a)
    val g = accent.green * a + chipBg.green * (1 - a)
    val b = accent.blue * a + chipBg.blue * (1 - a)
    val alpha = (chipBg.alpha + 0.10f).coerceAtMost(0.32f)
    return Color(red = r, green = g, blue = b, alpha = alpha)
  }

  private fun parse(value: String, fallback: Long): Color =
    try {
      if (value.isBlank()) Color(fallback) else Color(AndroidColor.parseColor(normalizeColor(value)))
    } catch (_: Throwable) {
      Color(fallback)
    }

  private fun colorInt(value: String, fallback: Int): Int =
    try {
      if (value.isBlank()) fallback else AndroidColor.parseColor(normalizeColor(value))
    } catch (_: Throwable) {
      fallback
    }

  /** Android's parseColor accepts #RRGGBB / #AARRGGBB but not rgba(); convert. */
  private fun normalizeColor(raw: String): String {
    val s = raw.trim()
    if (s.startsWith("#")) return s
    val rgba = Regex("""rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)""")
      .find(s) ?: return s
    val (r, g, b) = rgba.destructured
    val a = rgba.groupValues.getOrNull(4)?.toFloatOrNull() ?: 1f
    val ai = (a.coerceIn(0f, 1f) * 255).roundToInt()
    return String.format("#%02X%02X%02X%02X", ai, r.toInt(), g.toInt(), b.toInt())
  }

  private fun deepLinkIntent(url: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

  private fun readSnapshot(context: Context, appWidgetId: Int): Snapshot? {
    val raw = context
      .getSharedPreferences(PhraseWidgetModule.PREFS_NAME, Context.MODE_PRIVATE)
      .getString(PhraseWidgetModule.STORAGE_KEY, null) ?: return null
    return try {
      val o = JSONObject(raw)
      // Reject snapshots from a newer schema than this build understands.
      val version = o.optInt("schemaVersion", MAX_SCHEMA_VERSION)
      if (version > MAX_SCHEMA_VERSION) return null
      val themeObj = o.optJSONObject("theme")
      val theme = SnapshotTheme(
        gradientTop = themeObj?.optString("gradientTop").orEmpty(),
        gradientMid = themeObj?.optString("gradientMid").orEmpty(),
        gradientBottom = themeObj?.optString("gradientBottom").orEmpty(),
        border = themeObj?.optString("border").orEmpty(),
        titleColor = themeObj?.optString("titleColor").orEmpty(),
        phraseColor = themeObj?.optString("phraseColor").orEmpty(),
        subColor = themeObj?.optString("subColor").orEmpty(),
        accent = themeObj?.optString("accent").orEmpty(),
        chipBg = themeObj?.optString("chipBg").orEmpty(),
        chipBorder = themeObj?.optString("chipBorder").orEmpty(),
        glow = themeObj?.optString("glow").orEmpty(),
      )
      // Free users must never see a stale Plus deck snapshot after entitlement
      // changes. Native has no entitlement authority; RN publishes this state.
      if (o.optString("access", "free") != "plus") {
        return fallbackSnapshot(theme, plusRequired = true)
      }
      val source = context.getSharedPreferences(PhraseWidgetModule.PREFS_NAME, Context.MODE_PRIVATE)
        .getString(sourceForWidget(appWidgetId), "saved") ?: "saved"
      val deck = o.optJSONObject("decks")?.optJSONObject(source)
        ?: return fallbackSnapshot(theme, plusRequired = false)
      val cards = deck.optJSONArray("cards")
        ?: return fallbackSnapshot(theme, plusRequired = false)
      if (deck.optBoolean("empty", cards.length() == 0) || cards.length() == 0) {
        return fallbackSnapshot(theme, plusRequired = false)
      }
      val cursor = context.getSharedPreferences(PhraseWidgetModule.PREFS_NAME, Context.MODE_PRIVATE)
        .getInt(cursorForWidget(appWidgetId), 0)
      val card = cards.optJSONObject(Math.floorMod(cursor, cards.length())) ?: return null
      Snapshot(
        english = card.optString("english"),
        meaning = card.optString("meaning"),
        transcription = card.optString("transcription"),
        kicker = if (source == "saved") "SAVED" else "MY PHRASES",
        deepLink = card.optString("deepLink"),
        playDeepLink = card.optString("deepLink"),
        date = "",
        theme = theme,
        canNavigate = true,
      ).takeIf { it.english.isNotEmpty() && it.deepLink.isNotEmpty() }
    } catch (_: Throwable) {
      null
    }
  }

  private fun fallbackSnapshot(theme: SnapshotTheme, plusRequired: Boolean) = Snapshot(
    english = if (plusRequired) "Personal deck requires Plus" else "Your selected deck is empty",
    meaning = if (plusRequired) "Open Phraseman to unlock your saved and created phrases." else "Open Phraseman to add cards, then refresh this widget.",
    transcription = "",
    kicker = if (plusRequired) "PLUS" else "PERSONAL DECK",
    deepLink = "phraseman://flashcards",
    playDeepLink = "phraseman://flashcards",
    date = "",
    theme = theme,
    canNavigate = false,
  )

  private data class SnapshotTheme(
    val gradientTop: String,
    val gradientMid: String,
    val gradientBottom: String,
    val border: String,
    val titleColor: String,
    val phraseColor: String,
    val subColor: String,
    val accent: String,
    val chipBg: String,
    val chipBorder: String,
    val glow: String,
  )

  private data class Snapshot(
    val english: String,
    val meaning: String,
    val transcription: String,
    val kicker: String,
    val deepLink: String,
    val playDeepLink: String,
    val date: String,
    val theme: SnapshotTheme,
    val canNavigate: Boolean,
  ) {
    /** True when the snapshot's day is not the current local day. */
    val isStale: Boolean
      get() {
        if (date.isEmpty()) return false
        val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
          .format(java.util.Date())
        return date != today
      }
  }
}

abstract class ChangePhraseAction(private val delta: Int) : ActionCallback {
  override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
    val widgetId = androidx.glance.appwidget.GlanceAppWidgetManager(context).getAppWidgetId(glanceId)
    val prefs = context.getSharedPreferences(PhraseWidgetModule.PREFS_NAME, Context.MODE_PRIVATE)
    val key = PhraseGlanceWidget.cursorForWidget(widgetId)
    prefs.edit().putInt(key, prefs.getInt(key, 0) + delta).apply()
    PhraseGlanceWidget().update(context, glanceId)
  }
}

class PreviousPhraseAction : ChangePhraseAction(-1)
class NextPhraseAction : ChangePhraseAction(1)
