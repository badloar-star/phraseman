import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from "../../app/account_generation";
import {
  ANNOUNCEMENTS_CONFIG_WAIT_MS,
  decideAnnouncementFetch,
  parseAnnouncementsCache,
  serializeAnnouncementsCache,
  storyFeedRevFromConfigRaw,
  type AnnouncementFetchTrigger,
} from "./announcement_fetch_policy";
import {
  liveAnnouncements,
  announcementSeenKey,
  storyFeedRevOf,
  STORY_FEED_REV_CONFIG_KEY,
  type PublishedAnnouncement,
} from "./story_announcements_contract";
import { onAppEvent } from "../../app/events";
import { readRemoteConfigCacheRaw } from "../../app/remote_config_client";
import type { StoryEventList } from "./story_events_core";
const EMPTY: StoryEventList = Object.freeze([]);
// зачем (координатор 28.10, «сперва логи»): [STORY-POST] — сквозной префикс пути «опубликовали → дошло до человека»; [STORY-ANNOUNCE] оставлен для старых поисков
const LOG = "[STORY-ANNOUNCE] [STORY-POST]";
/** Короткая сводка истории для журнала: начало id (UUID, не данные человека), ревизия, когда опубликована и когда истечёт. */
const brief = (a: PublishedAnnouncement) => `${a.id.slice(0, 8)}@r${a.revision} pub=${new Date(a.publishedAtMs).toISOString()} exp=${new Date(a.expiresAtMs).toISOString()}`;
/**
 * Separate from personal events: announcement expiry is server-defined, never the seven-day TTL.
 *
 * зачем (Ревизор 24.10, Firebase-экономия): прежний опрос раз в 60 с у всех пользователей заменён кэшем на телефоне + запросом при входе и при
 * возвращении в приложение. С 28.10 решение — по версии ленты в конфиге (decideAnnouncementFetch): совпала с копией — 0 запросов,
 * новая история — запрос сразу; без версии — прежнее правило «кроме повтора в пределах минуты». Кэш показывается с первого кадра.
 */
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
      offset = 0,
      lastFetchedAtMs: number | null = null,
      feedRev = 0;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let entryTimer: ReturnType<typeof setTimeout> | undefined;
    let writes = Promise.resolve();
    const key = `story_announcements_seen_v1:${token.stableId}`;
    const cacheKey = `story_announcements_cache_v1:${token.stableId}`;
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
    // зачем (координатор 28.10, дешёвый путь): идти ли в сеть — по версии ленты в уже прочитанном конфиге (decideAnnouncementFetch)
    const consider = async (trigger: AnnouncementFetchTrigger, why: string) => {
      if (trigger === "config" && entryTimer) {
        clearTimeout(entryTimer);
        entryTimer = undefined;
      }
      if (!valid() || inFlight || AppState.currentState !== "active") return;
      let configRaw: string | null = null;
      try {
        configRaw = await readRemoteConfigCacheRaw();
      } catch (error) {
        console.warn(LOG, "кэш конфига не прочитан — версия ленты неизвестна", String(error));
      }
      if (!valid()) return;
      const decision = decideAnnouncementFetch({
        trigger,
        remoteRev: storyFeedRevFromConfigRaw(configRaw, STORY_FEED_REV_CONFIG_KEY),
        local: lastFetchedAtMs === null ? null : { fetchedAtMs: lastFetchedAtMs, feedRev },
        nowMs: Date.now(),
      });
      console.log(LOG, "решение", JSON.stringify({ why, ...decision, trigger, rows: rows.length })); // guard-ok: ветка и значения, которые её решили
      if (decision.wait) {
        if (entryTimer) clearTimeout(entryTimer);
        entryTimer = setTimeout(() => {
          entryTimer = undefined;
          void consider("entry_timeout", "вход: свежий конфиг не пришёл");
        }, ANNOUNCEMENTS_CONFIG_WAIT_MS);
        return;
      }
      if (decision.fetch) await fetch(why);
    };
    const fetch = async (why: string) => {
      if (!valid() || inFlight || AppState.currentState !== "active") return;
      inFlight = true;
      const startedAt = Date.now();
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
          { items: unknown[]; nowMs: number; feedRev?: number }
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
        const before = new Map(rows.map((a) => [a.id, a.revision]));
        rows = liveAnnouncements(response.data.items, response.data.nowMs);
        const revBefore = feedRev;
        feedRev = storyFeedRevOf({ rev: response.data.feedRev });
        const fetchedAtMs = Date.now();
        const sinceLastMs = lastFetchedAtMs === null ? null : fetchedAtMs - lastFetchedAtMs;
        lastFetchedAtMs = fetchedAtMs;
        // зачем (28.10): видно, пришли ли НОВЫЕ истории (id, которого не было), обновилась ли старая (тот же id, новая ревизия — так выглядит «замена»)
        console.log(LOG, "ответ получен", JSON.stringify({ why, items: response.data.items.length, live: rows.length, tookMs: Date.now() - startedAt, sinceLastFetchMs: sinceLastMs, clockOffsetMs: offset, feedRevBefore: revBefore, feedRev,
          added: rows.filter((a) => !before.has(a.id)).map(brief), revised: rows.filter((a) => before.has(a.id) && before.get(a.id) !== a.revision).map(brief),
          gone: [...before.keys()].filter((id) => !rows.some((a) => a.id === id)).map((id) => id.slice(0, 8)), all: rows.map(brief) })); // guard-ok: что вернулось и сколько заняло
        const cacheValue = serializeAnnouncementsCache({ fetchedAtMs, serverNowMs: response.data.nowMs, items: response.data.items, ...(feedRev > 0 ? { feedRev } : {}) });
        writes = writes
          .then(() => AsyncStorage.setItem(cacheKey, cacheValue))
          .catch((error) => console.warn(LOG, "кэш не записан", String(error)));
        emit();
      } catch (error) {
        if (valid()) console.warn(LOG, "запрос в сеть не удался (кэш остаётся)", String(error));
      } finally {
        inFlight = false;
      }
    };
    const ready = Promise.all([
      AsyncStorage.getItem(key),
      AsyncStorage.getItem(cacheKey),
    ])
      .catch((error) => {
        if (valid()) console.warn(LOG, "чтение памяти телефона не удалось", String(error));
        return [null, null] as [string | null, string | null];
      })
      .then(([raw, cacheRaw]) => {
        if (!valid()) return;
        try {
          const parsed: unknown = JSON.parse(raw ?? "[]");
          if (Array.isArray(parsed))
            seen = new Set(
              parsed
                .filter((x): x is string => typeof x === "string")
                .slice(-1000),
            );
        } catch (error) {
          // зачем: испорченный список «просмотрено» сбрасывается; причина — в журнале (без идентификатора человека)
          console.warn(LOG, "список просмотренного повреждён — сброшен", String(error));
        }
        const cache = parseAnnouncementsCache(cacheRaw);
        if (cache) {
          lastFetchedAtMs = cache.fetchedAtMs;
          feedRev = cache.feedRev ?? 0;
          offset = cache.serverNowMs - cache.fetchedAtMs;
          rows = liveAnnouncements(cache.items, Date.now() + offset);
          console.log(LOG, "кэш прочитан", JSON.stringify({ ageMs: Date.now() - cache.fetchedAtMs, live: rows.length, feedRev, all: rows.map(brief) })); // guard-ok: показываем кэш с первого кадра
          emit();
        } else if (cacheRaw) {
          console.warn(LOG, "кэш объявлений повреждён — игнорируем, идём в сеть");
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
              console.warn(LOG, "запись «просмотрено» не удалась", String(error)),
            );
        };
        return consider("entry", "вход");
      })
      .catch((error) => {
        if (valid()) console.warn(LOG, "сбой инициализации", String(error));
      });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void ready.then(() => {
          emit();
          void consider("return", "возвращение в приложение");
        });
    });
    // зачем (28.10): свежий конфиг (холодный старт читает его из сети) несёт версию ленты — решаем сразу, не дожидаясь таймера входа
    const configSubscription = onAppEvent("remote_config_changed", () => {
      void ready.then(() => consider("config", "пришёл конфиг"));
    });
    return () => {
      disposed = true;
      markRef.current = () => undefined;
      if (expiry) clearTimeout(expiry);
      if (entryTimer) clearTimeout(entryTimer);
      subscription.remove();
      configSubscription.remove();
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
