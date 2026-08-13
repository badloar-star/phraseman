import WidgetKit

/// Timeline entry carrying one phrase snapshot.
struct PhraseEntry: TimelineEntry {
  let date: Date
  let payload: PhrasePayload
  let source: String
}

/// Supplies WidgetKit with the current phrase. The snapshot itself is refreshed
/// by the app (RN writes to the App Group); here we just re-read it and schedule
/// the next reload shortly after midnight so the widget flips to the new day's
/// phrase even if the app has not been opened.
@available(iOS 17.0, *)
struct PhraseProvider: AppIntentTimelineProvider {
  typealias Intent = PersonalDeckConfiguration
  func placeholder(in context: Context) -> PhraseEntry {
    PhraseEntry(date: Date(), payload: .personalPlaceholder, source: "saved")
  }

  func snapshot(for configuration: PersonalDeckConfiguration, in context: Context) async -> PhraseEntry {
    let payload = (PhrasePayload.current() ?? .placeholder).card(
      for: configuration.source.rawValue,
      cursor: PhrasePayload.cursor(for: configuration.source.rawValue)
    )
    return PhraseEntry(date: Date(), payload: payload, source: configuration.source.rawValue)
  }

  func timeline(for configuration: PersonalDeckConfiguration, in context: Context) async -> Timeline<PhraseEntry> {
    let payload = (PhrasePayload.current() ?? .placeholder).card(
      for: configuration.source.rawValue,
      cursor: PhrasePayload.cursor(for: configuration.source.rawValue)
    )
    let entry = PhraseEntry(date: Date(), payload: payload, source: configuration.source.rawValue)

    // Refresh just after the next local midnight.
    let calendar = Calendar.current
    let nextMidnight = calendar.nextDate(
      after: Date(),
      matching: DateComponents(hour: 0, minute: 5),
      matchingPolicy: .nextTime
    ) ?? Date().addingTimeInterval(60 * 60 * 6)

    return Timeline(entries: [entry], policy: .after(nextMidnight))
  }
}

/// iOS 16 keeps the existing WidgetKit surface as a Saved-deck fallback. Widget
/// configuration and interactive App Intents are available only from iOS 17.
struct LegacyPhraseProvider: TimelineProvider {
  private func entry() -> PhraseEntry {
    let payload = (PhrasePayload.current() ?? .personalPlaceholder).card(
      for: "saved", cursor: PhrasePayload.cursor(for: "saved")
    )
    return PhraseEntry(date: Date(), payload: payload, source: "saved")
  }

  func placeholder(in context: Context) -> PhraseEntry {
    PhraseEntry(date: Date(), payload: .personalPlaceholder, source: "saved")
  }

  func getSnapshot(in context: Context, completion: @escaping (PhraseEntry) -> Void) {
    completion(entry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PhraseEntry>) -> Void) {
    let next = Calendar.current.nextDate(
      after: Date(), matching: DateComponents(hour: 0, minute: 5), matchingPolicy: .nextTime
    ) ?? Date().addingTimeInterval(60 * 60 * 6)
    completion(Timeline(entries: [entry()], policy: .after(next)))
  }
}
