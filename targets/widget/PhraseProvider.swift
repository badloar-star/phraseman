import WidgetKit

/// Timeline entry carrying one phrase snapshot.
struct PhraseEntry: TimelineEntry {
  let date: Date
  let payload: PhrasePayload
}

/// Supplies WidgetKit with the current phrase. The snapshot itself is refreshed
/// by the app (RN writes to the App Group); here we just re-read it and schedule
/// the next reload shortly after midnight so the widget flips to the new day's
/// phrase even if the app has not been opened.
struct PhraseProvider: TimelineProvider {
  func placeholder(in context: Context) -> PhraseEntry {
    PhraseEntry(date: Date(), payload: .placeholder)
  }

  func getSnapshot(in context: Context, completion: @escaping (PhraseEntry) -> Void) {
    let payload = PhrasePayload.current() ?? .placeholder
    completion(PhraseEntry(date: Date(), payload: payload))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PhraseEntry>) -> Void) {
    let payload = PhrasePayload.current() ?? .placeholder
    let entry = PhraseEntry(date: Date(), payload: payload)

    // Refresh just after the next local midnight.
    let calendar = Calendar.current
    let nextMidnight = calendar.nextDate(
      after: Date(),
      matching: DateComponents(hour: 0, minute: 5),
      matchingPolicy: .nextTime
    ) ?? Date().addingTimeInterval(60 * 60 * 6)

    completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
  }
}
