import ExpoModulesCore
import WidgetKit

// App Group + storage key. MUST match constants.ts and the widget extension.
private let kAppGroup = "group.app.phraseman.widget"
private let kStorageKey = "phrase_of_the_day_v1"

/**
 * Bridges the JS widget payload into the App Group UserDefaults container that
 * the WidgetKit extension reads, and asks WidgetKit to refresh its timelines.
 *
 * RN is the sole writer; the widget extension only ever reads.
 */
public final class PhraseWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhraseWidget")

    // Persist the snapshot. We re-serialize to JSON so the stored value is a
    // single self-describing string the Swift widget can decode independently.
    AsyncFunction("setData") { (payload: [String: Any]) in
      guard let defaults = UserDefaults(suiteName: kAppGroup) else {
        throw Exception(name: "AppGroupUnavailable",
                        description: "App Group \(kAppGroup) is not configured")
      }
      let data = try JSONSerialization.data(withJSONObject: payload, options: [])
      let json = String(decoding: data, as: UTF8.self)
      defaults.set(json, forKey: kStorageKey)
      // Read back immediately. If the App Group capability is declared in the
      // build but NOT provisioned on Apple's side, iOS silently hands each target
      // its own private suite: the write "succeeds" here but the widget extension
      // reads nil and shows the placeholder forever. Surfacing a thrown error
      // turns that silent, build-only failure into something the JS bridge logs.
      guard defaults.string(forKey: kStorageKey) == json else {
        throw Exception(name: "AppGroupWriteNotShared",
                        description: "Wrote to \(kAppGroup) but read-back failed — App Group is not actually shared (provisioning?)")
      }
    }

    // Diagnostic the JS side can call to confirm the shared container is real and
    // currently holds a snapshot. Returns true only when a value round-trips.
    AsyncFunction("hasSharedSnapshot") { () -> Bool in
      guard let defaults = UserDefaults(suiteName: kAppGroup) else { return false }
      return defaults.string(forKey: kStorageKey) != nil
    }

    // Ask the OS to rebuild all widget timelines on iOS 14+.
    AsyncFunction("reloadAll") {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
