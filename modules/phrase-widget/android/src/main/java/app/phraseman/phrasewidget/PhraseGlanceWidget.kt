package app.phraseman.phrasewidget

import android.content.Context
import android.content.Intent
import android.graphics.Color as AndroidColor
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalSize
import androidx.glance.action.clickable
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

/**
 * Phrase-of-the-day home-screen widget (Jetpack Glance).
 *
 * Renders a premium card whose palette is driven entirely by the active app
 * theme (carried in the snapshot RN writes), so the widget is a pixel-faithful
 * extension of the in-app Daily Phrase card across all 7 themes.
 *
 * Layout: themed solid base + a soft accent header strip, an accent kicker
 * ("ФРАЗА ДНЯ"), the phrase (bold, primary), the meaning (sub), and a round
 * accent ▶ chip. Tapping the card opens the phrase; the ▶ opens it with
 * auto-speak (the widget itself never plays audio — on-device speech needs the
 * app process).
 */
class PhraseGlanceWidget : GlanceAppWidget() {

  override val sizeMode = SizeMode.Exact

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshot = readSnapshot(context)
    provideContent {
      GlanceTheme {
        WidgetBody(snapshot)
      }
    }
  }

  @Composable
  private fun WidgetBody(snapshot: Snapshot?) {
    val size = LocalSize.current
    val compact = size.height < 116.dp
    val tiny = size.height < 84.dp

    if (snapshot == null) {
      EmptyState()
      return
    }

    val t = snapshot.theme
    val base = parse(t.gradientMid, 0xFF152019)
    val accent = parse(t.accent, 0xFF58CC89)
    val phrase = parse(t.phraseColor, 0xFFFFFFFF)
    val sub = parse(t.subColor, 0xFFB8D9C2)
    val chipBg = parse(t.chipBg, 0x2258CC89)

    val openIntent = actionStartActivity(deepLinkIntent(snapshot.deepLink))
    val playLink = snapshot.playDeepLink.ifEmpty { snapshot.deepLink }
    val playIntent = actionStartActivity(deepLinkIntent(playLink))

    // Clean minimalist card: one solid themed surface, generous padding, quiet
    // uppercase kicker, the phrase as the hero, meaning + ▶ on a single baseline
    // row. No header strip, no dangling button.
    Column(
      modifier = GlanceModifier
        .fillMaxSize()
        .cornerRadius(24.dp)
        .background(ColorProvider(base))
        .padding(horizontal = 18.dp, vertical = 16.dp)
        .clickable(openIntent),
    ) {
      if (!tiny) {
        Text(
          snapshot.kicker.ifEmpty { "PHRASE OF THE DAY" },
          style = TextStyle(
            color = ColorProvider(accent),
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
          ),
          maxLines = 1,
        )
        Spacer(GlanceModifier.height(10.dp))
      }

      // Hero phrase.
      Text(
        snapshot.english,
        style = TextStyle(
          color = ColorProvider(phrase),
          fontSize = if (compact) 18.sp else 23.sp,
          fontWeight = FontWeight.Bold,
        ),
        maxLines = if (compact) 1 else 2,
      )

      Spacer(GlanceModifier.height(6.dp))

      Text(
        snapshot.meaning,
        style = TextStyle(color = ColorProvider(sub), fontSize = 14.sp),
        maxLines = if (tiny) 1 else 2,
      )

      if (!compact && snapshot.transcription.isNotEmpty()) {
        Spacer(GlanceModifier.height(4.dp))
        Text(
          snapshot.transcription,
          style = TextStyle(color = ColorProvider(sub), fontSize = 12.sp),
          maxLines = 1,
        )
      }

      // Push the action row to the bottom, balanced — ▶ + a hairline of breathing room.
      Spacer(GlanceModifier.defaultWeight())

      Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Box(
          modifier = GlanceModifier
            .cornerRadius(20.dp)
            .background(ColorProvider(chipBg))
            .padding(horizontal = 14.dp, vertical = 8.dp)
            .clickable(playIntent),
          contentAlignment = Alignment.Center,
        ) {
          Text(
            "▶  ${tapHint(snapshot.kicker)}",
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

  /** Localized "Listen" label paired with the ▶ glyph, derived from the kicker locale. */
  private fun tapHint(kicker: String): String = when {
    kicker.contains("ФРАЗА") -> "Слушать"
    kicker.contains("ВИСЛІВ") -> "Слухати"
    kicker.contains("FRASE") -> "Escuchar"
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

  private fun parse(value: String, fallback: Long): Color =
    try {
      if (value.isBlank()) Color(fallback) else Color(AndroidColor.parseColor(normalizeColor(value)))
    } catch (_: Throwable) {
      Color(fallback)
    }

  /** Android's parseColor accepts #RRGGBB / #AARRGGBB but not rgba(); convert. */
  private fun normalizeColor(raw: String): String {
    val s = raw.trim()
    if (s.startsWith("#")) return s
    val rgba = Regex("""rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)""")
      .find(s) ?: return s
    val (r, g, b) = rgba.destructured
    val a = rgba.groupValues.getOrNull(4)?.toFloatOrNull() ?: 1f
    val ai = (a.coerceIn(0f, 1f) * 255).toInt()
    return String.format("#%02X%02X%02X%02X", ai, r.toInt(), g.toInt(), b.toInt())
  }

  private fun deepLinkIntent(url: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

  private fun readSnapshot(context: Context): Snapshot? {
    val raw = context
      .getSharedPreferences(PhraseWidgetModule.PREFS_NAME, Context.MODE_PRIVATE)
      .getString(PhraseWidgetModule.STORAGE_KEY, null) ?: return null
    return try {
      val o = JSONObject(raw)
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
      )
      Snapshot(
        english = o.optString("english"),
        meaning = o.optString("meaning"),
        transcription = o.optString("transcription"),
        kicker = o.optString("kicker"),
        deepLink = o.optString("deepLink"),
        playDeepLink = o.optString("playDeepLink"),
        theme = theme,
      ).takeIf { it.english.isNotEmpty() && it.deepLink.isNotEmpty() }
    } catch (_: Throwable) {
      null
    }
  }

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
  )

  private data class Snapshot(
    val english: String,
    val meaning: String,
    val transcription: String,
    val kicker: String,
    val deepLink: String,
    val playDeepLink: String,
    val theme: SnapshotTheme,
  )
}
