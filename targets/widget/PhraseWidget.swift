import SwiftUI
import WidgetKit

/// SwiftUI view for the phrase-of-the-day widget. Palette comes from the active
/// app theme (carried in the snapshot), so it matches the in-app Daily Phrase
/// card: a diagonal 3-stop gradient, a soft top-right accent bloom, a hairline
/// border and a rounded identity chip — the lit, dimensional surface of the card,
/// not a flat rectangle. Adapts to the widget family:
///   - systemSmall:          chip + kicker + phrase + meaning
///   - systemMedium:         + transcription, with a play affordance
///   - accessoryRectangular: branded compact lock-screen line (iOS 16+)
///
/// Text stays inside the family height: line budgets plus minimumScaleFactor
/// win over an unconstrained intrinsic height, so larger Dynamic Type cannot
/// push the last line below the widget crop.
struct PhraseWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: PhraseEntry

  private var theme: PhraseTheme { entry.payload.theme }
  private var accent: Color { Color(phraseHex: theme.accent, fallback: .green) }
  private var titleColor: Color { Color(phraseHex: theme.titleColor, fallback: accent) }
  private var phraseColor: Color { Color(phraseHex: theme.phraseColor, fallback: .white) }
  private var subColor: Color { Color(phraseHex: theme.subColor, fallback: .secondary) }
  private var chipBg: Color { Color(phraseHex: theme.chipBg, fallback: accent.opacity(0.15)) }
  private var chipBorder: Color { Color(phraseHex: theme.chipBorder, fallback: accent.opacity(0.22)) }
  private var borderColor: Color { Color(phraseHex: theme.border, fallback: accent.opacity(0.28)) }
  private var isStale: Bool { entry.payload.isStale }

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

  /// Rounded identity chip echoing the in-app card's icon plaque.
  private func iconChip(size: CGFloat) -> some View {
    Image(systemName: "text.quote")
      .font(.system(size: size * 0.5, weight: .bold))
      .foregroundStyle(accent)
      .frame(width: size, height: size)
      .background(chipBg)
      .clipShape(RoundedRectangle(cornerRadius: size * 0.3, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
          .strokeBorder(chipBorder, lineWidth: 1)
      )
  }

  private func kicker(showChip: Bool, chipSize: CGFloat) -> some View {
    HStack(spacing: 8) {
      if showChip { iconChip(size: chipSize) }
      Text(entry.payload.kicker)
        .font(.caption2.weight(.heavy))
        .tracking(0.6)
        .foregroundStyle(titleColor)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
      if isStale {
        // Quiet "previous day" dot — honest, not alarming.
        Image(systemName: "arrow.clockwise")
          .font(.system(size: 9, weight: .bold))
          .foregroundStyle(subColor.opacity(0.7))
      }
    }
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 7) {
      kicker(showChip: true, chipSize: 22)
      Text(entry.payload.english)
        .font(.title3.weight(.bold))
        .foregroundStyle(phraseColor)
        .lineLimit(2)
        .minimumScaleFactor(0.6)
        .layoutPriority(2)
      Text(entry.payload.meaning)
        .font(.footnote)
        .foregroundStyle(subColor)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
        .layoutPriority(1)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: entry.payload.deepLink))
  }

  private var medium: some View {
    VStack(alignment: .leading, spacing: 7) {
      HStack(alignment: .center) {
        kicker(showChip: true, chipSize: 26)
        Spacer(minLength: 6)
        Link(destination: URL(string: entry.payload.playDeepLink) ?? Self.homeURL) {
          Image(systemName: "play.fill")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(accent)
            .padding(9)
            .background(chipBg)
            .clipShape(Circle())
            .overlay(Circle().strokeBorder(chipBorder, lineWidth: 1))
        }
      }
      Text(entry.payload.english)
        .font(.title2.weight(.bold))
        .foregroundStyle(phraseColor)
        .lineLimit(2)
        .minimumScaleFactor(0.6)
        .layoutPriority(2)
      Text(entry.payload.meaning)
        .font(.subheadline)
        .foregroundStyle(subColor)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
        .layoutPriority(1)
      if !entry.payload.transcription.isEmpty {
        Text(entry.payload.transcription)
          .font(.caption)
          .foregroundStyle(subColor.opacity(0.85))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: entry.payload.deepLink))
  }

  private var lockScreen: some View {
    HStack(spacing: 8) {
      Image(systemName: "text.quote")
        .font(.system(size: 16, weight: .semibold))
        .widgetAccentable()
      VStack(alignment: .leading, spacing: 1) {
        Text(entry.payload.kicker)
          .font(.system(size: 9, weight: .semibold))
          .tracking(0.4)
          .opacity(0.7)
          .lineLimit(1)
        Text(entry.payload.english)
          .font(.headline)
          .lineLimit(2)
          .minimumScaleFactor(0.7)
          .layoutPriority(1)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .widgetURL(URL(string: entry.payload.deepLink))
  }

  private static let homeURL = URL(string: "phraseman://home")!
}

/// Diagonal 3-stop gradient matching the in-app card (locations 0 / 0.56 / 1,
/// top-leading → bottom-trailing).
private func phraseGradient(_ theme: PhraseTheme) -> LinearGradient {
  LinearGradient(
    stops: [
      .init(color: Color(phraseHex: theme.gradientTop, fallback: .black), location: 0.0),
      .init(color: Color(phraseHex: theme.gradientMid, fallback: .black), location: 0.56),
      .init(color: Color(phraseHex: theme.gradientBottom, fallback: .black), location: 1.0),
    ],
    startPoint: .topLeading, endPoint: .bottomTrailing
  )
}

/// The card surface: gradient + a soft top-right accent bloom + hairline border.
private func phraseSurface(_ theme: PhraseTheme) -> some View {
  ZStack {
    phraseGradient(theme)
    GeometryReader { geo in
      Circle()
        .fill(Color(phraseHex: theme.glow, fallback: .clear))
        .frame(width: geo.size.width * 0.8, height: geo.size.width * 0.8)
        .blur(radius: 38)
        .offset(x: geo.size.width * 0.42, y: -geo.size.width * 0.34)
    }
  }
}

struct PhraseWidget: Widget {
  private let kind = "PhraseWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PhraseProvider()) { entry in
      if #available(iOS 17.0, *) {
        PhraseWidgetView(entry: entry)
          .containerBackground(for: .widget) {
            phraseSurface(entry.payload.theme)
              .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                  .strokeBorder(
                    Color(phraseHex: entry.payload.theme.border, fallback: .clear),
                    lineWidth: 1
                  )
              )
          }
      } else {
        PhraseWidgetView(entry: entry)
          .padding()
          .background(phraseSurface(entry.payload.theme))
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
