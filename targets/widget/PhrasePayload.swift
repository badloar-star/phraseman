import Foundation
import SwiftUI

/// Per-theme palette carried in the snapshot so the widget matches the in-app card.
struct PhraseTheme: Decodable {
  let gradientTop: String
  let gradientMid: String
  let gradientBottom: String
  let border: String
  let titleColor: String
  let phraseColor: String
  let subColor: String
  let accent: String
  let chipBg: String
  let chipBorder: String
  /// Soft top-right accent bloom, mirrors the in-app card's `chrome.glow`.
  let glow: String

  enum CodingKeys: String, CodingKey {
    case gradientTop, gradientMid, gradientBottom, border, titleColor,
         phraseColor, subColor, accent, chipBg, chipBorder, glow
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    gradientTop = (try? c.decode(String.self, forKey: .gradientTop)) ?? PhraseTheme.fallback.gradientTop
    gradientMid = (try? c.decode(String.self, forKey: .gradientMid)) ?? PhraseTheme.fallback.gradientMid
    gradientBottom = (try? c.decode(String.self, forKey: .gradientBottom)) ?? PhraseTheme.fallback.gradientBottom
    border = (try? c.decode(String.self, forKey: .border)) ?? PhraseTheme.fallback.border
    titleColor = (try? c.decode(String.self, forKey: .titleColor)) ?? PhraseTheme.fallback.titleColor
    phraseColor = (try? c.decode(String.self, forKey: .phraseColor)) ?? PhraseTheme.fallback.phraseColor
    subColor = (try? c.decode(String.self, forKey: .subColor)) ?? PhraseTheme.fallback.subColor
    accent = (try? c.decode(String.self, forKey: .accent)) ?? PhraseTheme.fallback.accent
    chipBg = (try? c.decode(String.self, forKey: .chipBg)) ?? PhraseTheme.fallback.chipBg
    chipBorder = (try? c.decode(String.self, forKey: .chipBorder)) ?? PhraseTheme.fallback.chipBorder
    // `glow` is newer than schema v2's first ship; tolerate its absence so an
    // older snapshot still decodes (we just lose the bloom, not the whole card).
    glow = (try? c.decode(String.self, forKey: .glow)) ?? PhraseTheme.fallback.glow
  }

  init(gradientTop: String, gradientMid: String, gradientBottom: String, border: String,
       titleColor: String, phraseColor: String, subColor: String, accent: String,
       chipBg: String, chipBorder: String, glow: String) {
    self.gradientTop = gradientTop; self.gradientMid = gradientMid
    self.gradientBottom = gradientBottom; self.border = border
    self.titleColor = titleColor; self.phraseColor = phraseColor
    self.subColor = subColor; self.accent = accent
    self.chipBg = chipBg; self.chipBorder = chipBorder; self.glow = glow
  }

  static let fallback = PhraseTheme(
    gradientTop: "#193025", gradientMid: "#13241C", gradientBottom: "#09110D",
    border: "rgba(116,232,156,0.28)", titleColor: "#D9FFE5", phraseColor: "#FFFFFF",
    subColor: "#B8D9C2", accent: "#58CC89", chipBg: "rgba(116,232,156,0.13)",
    chipBorder: "rgba(116,232,156,0.22)", glow: "rgba(71,200,112,0.22)"
  )
}

/// Highest snapshot schema this widget build understands. Snapshots written by a
/// newer app (e.g. v3 with renamed/removed fields) are rejected so we show the
/// clean placeholder instead of a half-decoded card.
let kMaxWidgetSchemaVersion = 3

struct PhraseDeckCard: Decodable {
  let id: String
  let english: String
  let meaning: String
  let transcription: String
  let deepLink: String
}

struct PhraseDeck: Decodable {
  let empty: Bool
  let cards: [PhraseDeckCard]
}

/// Decoded snapshot the WidgetKit extension reads from the App Group container.
/// Mirrors the JS `WidgetPayload` written by widget_bridge.ts.
struct PhrasePayload: Decodable {
  let access: String
  let decks: [String: PhraseDeck]
  let english: String
  let meaning: String
  let literal: String
  let transcription: String
  let kicker: String
  let deepLink: String
  let playDeepLink: String
  let theme: PhraseTheme
  /// ISO date (YYYY-MM-DD) the snapshot represents — used to detect a stale day.
  let date: String

  static let appGroup = "group.app.phraseman.widget"
  static let storageKey = "phrase_of_the_day_v1"
  private static let cursorKeyPrefix = "personal_deck_cursor_"

  enum CodingKeys: String, CodingKey {
    case schemaVersion, access, decks, english, meaning, literal, transcription, kicker,
         deepLink, playDeepLink, theme, date
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    // Reject snapshots from a newer schema than this build understands.
    let version = (try? c.decode(Int.self, forKey: .schemaVersion)) ?? kMaxWidgetSchemaVersion
    guard version <= kMaxWidgetSchemaVersion else {
      throw DecodingError.dataCorrupted(
        .init(codingPath: [CodingKeys.schemaVersion],
              debugDescription: "Unsupported widget schemaVersion \(version)")
      )
    }
    access = (try? c.decode(String.self, forKey: .access)) ?? "free"
    decks = (try? c.decode([String: PhraseDeck].self, forKey: .decks)) ?? [:]
    let first = decks["saved"]?.cards.first ?? decks["created"]?.cards.first
    english = first?.english ?? (try? c.decode(String.self, forKey: .english)) ?? ""
    meaning = first?.meaning ?? (try? c.decode(String.self, forKey: .meaning)) ?? ""
    literal = (try? c.decode(String.self, forKey: .literal)) ?? ""
    transcription = first?.transcription ?? (try? c.decode(String.self, forKey: .transcription)) ?? ""
    kicker = (try? c.decode(String.self, forKey: .kicker)) ?? "ФРАЗА ДНЯ"
    deepLink = first?.deepLink ?? (try? c.decode(String.self, forKey: .deepLink)) ?? "phraseman://home"
    playDeepLink = (try? c.decode(String.self, forKey: .playDeepLink)) ?? "phraseman://home"
    theme = (try? c.decode(PhraseTheme.self, forKey: .theme)) ?? .fallback
    date = (try? c.decode(String.self, forKey: .date)) ?? ""
  }

  init(access: String = "plus", decks: [String: PhraseDeck] = [:], english: String, meaning: String, literal: String, transcription: String,
       kicker: String, deepLink: String, playDeepLink: String, theme: PhraseTheme,
       date: String) {
    self.access = access; self.decks = decks; self.english = english; self.meaning = meaning; self.literal = literal
    self.transcription = transcription; self.kicker = kicker
    self.deepLink = deepLink; self.playDeepLink = playDeepLink
    self.theme = theme; self.date = date
  }

  func card(for source: String, cursor: Int = 0) -> PhrasePayload {
    guard access == "plus", let deck = decks[source], !deck.empty, !deck.cards.isEmpty else {
      return PhrasePayload(
        access: "free", decks: decks, english: "Personal deck", meaning: "Open Phraseman to use your Plus deck.",
        literal: "", transcription: "", kicker: "PLUS", deepLink: "phraseman://flashcards",
        playDeepLink: "phraseman://flashcards", theme: theme, date: ""
      )
    }
    let card = deck.cards[abs(cursor) % deck.cards.count]
    return PhrasePayload(access: access, decks: decks, english: card.english, meaning: card.meaning, literal: "", transcription: card.transcription, kicker: source == "saved" ? "SAVED" : "MY PHRASES", deepLink: card.deepLink, playDeepLink: card.deepLink, theme: theme, date: "")
  }

  static func cursor(for source: String) -> Int {
    UserDefaults(suiteName: appGroup)?.integer(forKey: cursorKeyPrefix + source) ?? 0
  }

  static func advanceCursor(for source: String, by delta: Int) {
    guard let defaults = UserDefaults(suiteName: appGroup) else { return }
    let key = cursorKeyPrefix + source
    defaults.set(defaults.integer(forKey: key) + delta, forKey: key)
  }

  /// A free or empty fallback must remain a single tappable card, never pretend
  /// that it can move through a deck.
  var canNavigate: Bool {
    access == "plus" && decks.values.contains { !$0.empty && !$0.cards.isEmpty }
  }

  /// True when the snapshot's day is not today (the app has not run since the day
  /// rolled over, so the widget is showing a previous day's phrase).
  var isStale: Bool {
    guard !date.isEmpty else { return false }
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    let today = f.string(from: Date())
    return date != today
  }

  /// Reads and decodes the current snapshot, or nil if absent/invalid.
  static func current() -> PhrasePayload? {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let json = defaults.string(forKey: storageKey),
      let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(PhrasePayload.self, from: data)
  }

  /// Placeholder shown in the widget gallery and while data loads.
  static let placeholder = PhrasePayload(
    english: "Break the ice",
    meaning: "Растопить лёд",
    literal: "Разбить лёд",
    transcription: "/breɪk ðə aɪs/",
    kicker: "ФРАЗА ДНЯ",
    deepLink: "phraseman://home",
    playDeepLink: "phraseman://home",
    theme: .fallback,
    date: ""
  )

  /// Gallery state for the personal-deck widget before the host app publishes a
  /// snapshot. It deliberately does not masquerade as the old daily phrase.
  static let personalPlaceholder = PhrasePayload(
    access: "free",
    decks: [:],
    english: "Your personal deck",
    meaning: "Saved and created phrases from Phraseman.",
    literal: "",
    transcription: "",
    kicker: "PERSONAL DECK",
    deepLink: "phraseman://flashcards",
    playDeepLink: "phraseman://flashcards",
    theme: .fallback,
    date: ""
  )
}

/// Parses "#RRGGBB", "#AARRGGBB" or "rgba(r,g,b,a)" into a SwiftUI Color.
extension Color {
  init(phraseHex raw: String, fallback: Color = .green) {
    let s = raw.trimmingCharacters(in: .whitespaces)
    if s.hasPrefix("#") {
      let hex = String(s.dropFirst())
      var value: UInt64 = 0
      guard Scanner(string: hex).scanHexInt64(&value) else { self = fallback; return }
      let r, g, b, a: Double
      if hex.count == 8 {
        a = Double((value & 0xFF00_0000) >> 24) / 255
        r = Double((value & 0x00FF_0000) >> 16) / 255
        g = Double((value & 0x0000_FF00) >> 8) / 255
        b = Double(value & 0x0000_00FF) / 255
      } else {
        a = 1
        r = Double((value & 0xFF0000) >> 16) / 255
        g = Double((value & 0x00FF00) >> 8) / 255
        b = Double(value & 0x0000FF) / 255
      }
      self = Color(.sRGB, red: r, green: g, blue: b, opacity: a)
      return
    }
    let nums = s
      .replacingOccurrences(of: "rgba(", with: "")
      .replacingOccurrences(of: "rgb(", with: "")
      .replacingOccurrences(of: ")", with: "")
      .split(separator: ",")
      .compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
    if nums.count >= 3 {
      let a = nums.count >= 4 ? nums[3] : 1
      self = Color(.sRGB, red: nums[0] / 255, green: nums[1] / 255, blue: nums[2] / 255, opacity: a)
    } else {
      self = fallback
    }
  }
}
