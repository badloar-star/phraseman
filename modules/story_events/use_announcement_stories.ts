import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from "../../app/account_generation";
import { DebugLogger } from "../../app/debug-logger";
import {
  liveAnnouncements,
  announcementSeenKey,
  type PublishedAnnouncement,
} from "./story_announcements_contract";
import type { StoryEventList } from "./story_events_core";
const EMPTY: StoryEventList = Object.freeze([]);
/** Separate from personal events: announcement expiry is server-defined, never the seven-day TTL. */
export function useAnnouncementStories(enabled: boolean) {
  const [token, setToken] = useState(captureAccountGeneration);
  const [snapshot, setSnapshot] = useState<{
    generation: number;
    stories: StoryEventList;
  }>({ generation: -1, stories: EMPTY });
  const markRef = useRef<(id: string) => void>(() => undefined);
  useEffect(() => {
    const subscription = subscribeAccountGeneration(setToken);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    markRef.current = () => undefined;
    if (!enabled || token.phase !== "active" || !token.stableId) return;
    let disposed = false,
      inFlight = false,
      rows: PublishedAnnouncement[] = [],
      seen = new Set<string>(),
      offset = 0;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let writes = Promise.resolve();
    const key = `story_announcements_seen_v1:${token.stableId}`;
    const valid = () => !disposed && isCurrentAccountGeneration(token);
    const emit = () => {
      if (!valid()) return;
      const now = Date.now() + offset;
      rows = liveAnnouncements(rows, now);
      const stories = rows.map((a) => ({
        id: announcementSeenKey(a),
        type: "announcement" as const,
        payload: {
          contentJson: JSON.stringify(a),
          durationMs: a.durationMs,
          expiresAtMs: a.expiresAtMs,
        },
        atMs: a.publishedAtMs,
        seen: seen.has(announcementSeenKey(a)),
      }));
      setSnapshot({ generation: token.generation, stories });
      if (expiry) clearTimeout(expiry);
      if (rows.length)
        expiry = setTimeout(
          emit,
          Math.max(
            1,
            Math.min(
              2147483647,
              Math.min(...rows.map((a) => a.expiresAtMs)) - now + 1,
            ),
          ),
        );
    };
    const fetch = async () => {
      if (!valid() || inFlight || AppState.currentState !== "active") return;
      inFlight = true;
      try {
        const [{ getApp }, { getFunctions, httpsCallable }] = await Promise.all(
          [
            import("@react-native-firebase/app"),
            import("@react-native-firebase/functions"),
          ],
        );
        if (!valid()) return;
        const response = await httpsCallable<
          Record<string, never>,
          { items: unknown[]; nowMs: number }
        >(getFunctions(getApp(), "us-central1"), "storyAnnouncementsGet", {
          timeout: 15000,
        })({});
        if (!valid()) return;
        if (
          !Array.isArray(response.data.items) ||
          !Number.isFinite(response.data.nowMs)
        )
          throw new Error("invalid_story_response");
        offset = response.data.nowMs - Date.now();
        rows = liveAnnouncements(response.data.items, response.data.nowMs);
        emit();
      } catch (error) {
        if (valid()) DebugLogger.warn("[STORY-ANNOUNCEMENTS]", String(error));
      } finally {
        inFlight = false;
      }
    };
    const ready = AsyncStorage.getItem(key)
      .catch((error) => {
        if (valid()) DebugLogger.warn("[STORY-ANNOUNCEMENTS]", String(error));
        return null;
      })
      .then((raw) => {
        if (!valid()) return;
        try {
          const parsed: unknown = JSON.parse(raw ?? "[]");
          if (Array.isArray(parsed))
            seen = new Set(
              parsed
                .filter((x): x is string => typeof x === "string")
                .slice(-1000),
            );
        } catch {
          /* corrupt seen cache is reset */
        }
        markRef.current = (id) => {
          if (!valid() || !rows.some((a) => announcementSeenKey(a) === id))
            return;
          seen.add(id);
          seen = new Set([...seen].slice(-1000));
          emit();
          const value = JSON.stringify([...seen]);
          writes = writes
            .then(() => AsyncStorage.setItem(key, value))
            .catch((error) =>
              DebugLogger.warn("[STORY-ANNOUNCEMENTS]", String(error)),
            );
        };
        return fetch();
      })
      .catch((error) => {
        if (valid()) DebugLogger.warn("[STORY-ANNOUNCEMENTS]", String(error));
      });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void ready.then(() => {
          emit();
          void fetch();
        });
    });
    const refresh = setInterval(() => {
      void ready.then(fetch);
    }, 60000);
    return () => {
      disposed = true;
      markRef.current = () => undefined;
      clearInterval(refresh);
      if (expiry) clearTimeout(expiry);
      subscription.remove();
    };
  }, [enabled, token]);
  const markSeen = useCallback((id: string) => markRef.current(id), []);
  const current = captureAccountGeneration();
  return {
    stories:
      enabled &&
      current.phase === "active" &&
      snapshot.generation === current.generation
        ? snapshot.stories
        : EMPTY,
    markSeen,
  };
}
