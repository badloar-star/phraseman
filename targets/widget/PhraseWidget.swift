import SwiftUI
import WidgetKit

/// SwiftUI view for the phrase-of-the-day widget. Palette comes from the active
/// app theme (carried in the snapshot), so it matches the in-app Daily Phrase
/// card. Adapts to the widget family:
///   - systemSmall:          kicker + phrase + meaning
///   - systemMedium:         + transcription, with a play affordance
///   - accessoryRectangular: compact lock-screen line (iOS 16+)
struct PhraseWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PhraseEntry

  private var theme: PhraseTheme { entry.payload.theme }
  private var accent: Color { Color(phraseHex: theme.accent, fallback: .green) }
  private var phraseColor: Color { Color(phraseHex: theme.phraseColor, fallback: .white) }
  private var subColor: Color { Color(phraseHex: theme.subColor, fallback: .secondary) }

  var body: some View {
    switch family {
    case .accessoryRectangular:
      lockScreen
    case .systemMedium:
      medium
    default:
      small
    }
  }

  private var kicker: some View {
    HStack(spacing: 5) {
      Circle().fill(accent).frame(width: 6, height: 6)
      Text(entry.payload.kicker)
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(accent)
        .lineLimit(1)
    }
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 6) {
      kicker
      Text(entry.payload.english)
        .font(.system(size: 18, weight: .bold))
        .foregroundStyle(phraseColor)
        .lineLimit(2)
        .minimumScaleFactor(0.7)
      Text(entry.payload.meaning)
        .font(.system(size: 13))
        .foregroundStyle(subColor)
        .lineLimit(2)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: entry.payload.deepLink))
  }

  private var medium: some View {
    VStack(alignment: .leading, spacing: 7) {
      HStack(alignment: .center) {
        kicker
        Spacer()
        Link(destination: URL(string: entry.payload.playDeepLink) ?? Self.homeURL) {
          Image(systemName: "play.fill")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(accent)
            .padding(8)
            .background(Color(phraseHex: theme.chipBg, fallback: accent.opacity(0.15)))
            .clipShape(Circle())
        }
      }
      Text(entry.payload.english)
        .font(.system(size: 21, weight: .bold))
        .foregroundStyle(phraseColor)
        .lineLimit(2)
        .minimumScaleFactor(0.7)
      Text(entry.payload.meaning)
        .font(.system(size: 14))
        .foregroundStyle(subColor)
        .lineLimit(2)
      if !entry.payload.transcription.isEmpty {
        Text(entry.payload.transcription)
          .font(.system(size: 12))
          .foregroundStyle(subColor.opacity(0.85))
          .lineLimit(1)
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: entry.payload.deepLink))
  }

  private var lockScreen: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(entry.payload.english)
        .font(.headline)
        .lineLimit(1)
      Text(entry.payload.meaning)
        .font(.caption2)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .widgetURL(URL(string: entry.payload.deepLink))
  }

  private static let homeURL = URL(string: "phraseman://home")!
}

private func phraseGradient(_ theme: PhraseTheme) -> LinearGradient {
  LinearGradient(
    colors: [
      Color(phraseHex: theme.gradientTop, fallback: .black),
      Color(phraseHex: theme.gradientMid, fallback: .black),
      Color(phraseHex: theme.gradientBottom, fallback: .black),
    ],
    startPoint: .top, endPoint: .bottom
  )
}

struct PhraseWidget: Widget {
  private let kind = "PhraseWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PhraseProvider()) { entry in
      if #available(iOS 17.0, *) {
        PhraseWidgetView(entry: entry)
          .containerBackground(for: .widget) {
            phraseGradient(entry.payload.theme)
          }
      } else {
        PhraseWidgetView(entry: entry)
          .padding()
          .background(phraseGradient(entry.payload.theme))
      }
    }
    .configurationDisplayName("Фраза дня")
    .description("Сегодняшняя фраза из Phraseman.")
    .supportedFamilies(supportedFamilies)
  }

  private var supportedFamilies: [WidgetFamily] {
    if #available(iOS 16.0, *) {
      return [.systemSmall, .systemMedium, .accessoryRectangular]
    } else {
      return [.systemSmall, .systemMedium]
    }
  }
}

@main
struct PhraseWidgetBundle: WidgetBundle {
  var body: some Widget {
    PhraseWidget()
  }
}
