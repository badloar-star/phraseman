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

  static let fallback = PhraseTheme(
    gradientTop: "#193025", gradientMid: "#13241C", gradientBottom: "#09110D",
    border: "rgba(116,232,156,0.28)", titleColor: "#D9FFE5", phraseColor: "#FFFFFF",
    subColor: "#B8D9C2", accent: "#58CC89", chipBg: "rgba(116,232,156,0.13)",
    chipBorder: "rgba(116,232,156,0.22)"
  )
}

/// Decoded snapshot the WidgetKit extension reads from the App Group container.
/// Mirrors the JS `WidgetPayload` written by widget_bridge.ts.
struct PhrasePayload: Decodable {
  let english: String
  let meaning: String
  let literal: String
  let transcription: String
  let kicker: String
  let deepLink: String
  let playDeepLink: String
  let theme: PhraseTheme

  static let appGroup = "group.app.phraseman.widget"
  static let storageKey = "phrase_of_the_day_v1"

  enum CodingKeys: String, CodingKey {
    case english, meaning, literal, transcription, kicker, deepLink, playDeepLink, theme
  }

  init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    english = (try? c.decode(String.self, forKey: .english)) ?? ""
    meaning = (try? c.decode(String.self, forKey: .meaning)) ?? ""
    literal = (try? c.decode(String.self, forKey: .literal)) ?? ""
    transcription = (try? c.decode(String.self, forKey: .transcription)) ?? ""
    kicker = (try? c.decode(String.self, forKey: .kicker)) ?? "PHRASE OF THE DAY"
    deepLink = (try? c.decode(String.self, forKey: .deepLink)) ?? "phraseman://home"
    playDeepLink = (try? c.decode(String.self, forKey: .playDeepLink)) ?? "phraseman://home"
    theme = (try? c.decode(PhraseTheme.self, forKey: .theme)) ?? .fallback
  }

  init(english: String, meaning: String, literal: String, transcription: String,
       kicker: String, deepLink: String, playDeepLink: String, theme: PhraseTheme) {
    self.english = english; self.meaning = meaning; self.literal = literal
    self.transcription = transcription; self.kicker = kicker
    self.deepLink = deepLink; self.playDeepLink = playDeepLink; self.theme = theme
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
    theme: .fallback
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
