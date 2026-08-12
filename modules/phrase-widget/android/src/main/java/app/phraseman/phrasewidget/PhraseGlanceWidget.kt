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
 * the hero, the meaning, an IPA transcription on taller sizes, and a compact
 * ▶ chip whenever the widget has room for the header. Short one-row widgets use
 * a deliberately reduced layout so system font scaling cannot cut the phrase.
 * Tapping the card opens the phrase; ▶ opens it with auto-speak (the widget
 * itself never plays audio — on-device speech needs the app process).
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
    val context = LocalContext.current
    val tiny = size.height < 84.dp
    val compact = size.height < 116.dp
    val mediumHeight = size.height < 170.dp
    val showTranscription = size.height >= 190.dp
    val showBottomPlay = size.height >= 230.dp
    val expanded = size.height >= 260.dp

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
    val playLink = snapshot.playDeepLink.ifEmpty { snapshot.deepLink }
    val playIntent = actionStartActivity(deepLinkIntent(playLink))

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
        // One-row launchers may give only ~80dp. The previous fixed 16dp
        // vertical padding left too little room for two independently wrapping
        // texts, especially with Android's system font scale above 100%.
        .padding(
          horizontal = if (compact) 14.dp else 18.dp,
          vertical = when {
            tiny -> 6.dp
            compact -> 8.dp
            mediumHeight -> 10.dp
            else -> 14.dp
          },
        )
        .clickable(openIntent),
    ) {
      if (!compact) {
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
          Spacer(GlanceModifier.defaultWeight())
          // Keep audio available on every non-compact size, but place it in the
          // header instead of spending another full row in a medium widget.
          Box(
            modifier = GlanceModifier
              .size(30.dp)
              .cornerRadius(15.dp)
              .background(ColorProvider(strengthen(chipBg, accent)))
              .clickable(playIntent),
            contentAlignment = Alignment.Center,
          ) {
            Text(
              "▶",
              style = TextStyle(
                color = ColorProvider(accent),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
              ),
              maxLines = 1,
            )
          }
        }
        Spacer(GlanceModifier.height(if (mediumHeight) 6.dp else 10.dp))
      }

      // Hero phrase gets the vertical budget first. Compact widgets cap both
      // text blocks so their measured height can never overflow the host cell.
      Text(
        snapshot.english,
        style = TextStyle(
          color = ColorProvider(phrase),
          fontSize = when {
            tiny -> 15.sp
            compact -> 17.sp
            mediumHeight -> 17.sp
            expanded -> 23.sp
            else -> 21.sp
          },
          fontWeight = FontWeight.Bold,
        ),
        maxLines = if (expanded) 3 else 2,
      )

      Spacer(GlanceModifier.height(if (compact) 3.dp else 5.dp))

      Text(
        snapshot.meaning,
        style = TextStyle(
          color = ColorProvider(sub),
          fontSize = when {
            tiny -> 10.sp
            compact || mediumHeight -> 11.sp
            else -> 13.sp
          },
        ),
        maxLines = when {
          expanded -> 3
          showTranscription -> 2
          else -> 1
        },
      )

      if (showTranscription && snapshot.transcription.isNotEmpty()) {
        Spacer(GlanceModifier.height(4.dp))
        Text(
          snapshot.transcription,
          style = TextStyle(color = ColorProvider(sub), fontSize = 12.sp),
          maxLines = 1,
        )
      }

      // A labeled duplicate is useful only on a genuinely tall widget. Audio is
      // still available from the header chip at ordinary medium heights.
      if (showBottomPlay) {
        Spacer(GlanceModifier.defaultWeight())
        Row(
          modifier = GlanceModifier.fillMaxWidth(),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          Box(
            modifier = GlanceModifier
              .cornerRadius(20.dp)
              .background(ColorProvider(strengthen(chipBg, accent)))
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
  }

  /** Localized "Listen" label paired with the ▶ glyph, derived from the kicker locale. */
  private fun tapHint(kicker: String): String = when {
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

  private fun readSnapshot(context: Context): Snapshot? {
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
      Snapshot(
        english = o.optString("english"),
        meaning = o.optString("meaning"),
        transcription = o.optString("transcription"),
        kicker = o.optString("kicker"),
        deepLink = o.optString("deepLink"),
        playDeepLink = o.optString("playDeepLink"),
        date = o.optString("date"),
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

  private companion object {
    const val MAX_SCHEMA_VERSION = 2
  }
}
