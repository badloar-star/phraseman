import {
  nextLiveStoryIndex,
  type StoryEvent,
} from "../modules/story_events/story_events_core";
import { strict as assert } from "node:assert";

import {
  normalizeAnnouncement,
  liveAnnouncements,
} from "../modules/story_events/story_announcements_contract";
const base = {
  templateId: "leaf",
  badge: "",
  title: "",
  blocks: [{ text: "Новости", size: 16, style: "normal" }],
  titleSize: 34,
  align: "left",
  decoration: true,
  lifetime: 3,
  unit: "days",
  durationMs: 8000,
};
test("body-only, title-only and badge-only accepted; whitespace-only rejected", () => {
  assert.equal(normalizeAnnouncement(base).blocks[0].text, "Новости");
  assert.equal(
    normalizeAnnouncement({ ...base, blocks: [], title: "Заголовок" }).title,
    "Заголовок",
  );
  assert.equal(
    normalizeAnnouncement({ ...base, blocks: [], badge: "Метка" }).badge,
    "Метка",
  );
  assert.throws(() =>
    normalizeAnnouncement({ ...base, blocks: [], title: "  ", badge: "\n" }),
  );
});
test("rejects invalid template, size, timing, extra blocks and hidden action fields", () => {
  for (const patch of [
    { templateId: "orbit" },
    { durationMs: 0 },
    { lifetime: 0 },
    { lifetime: 1.5 },
    { lifetime: 366 },
    { unit: "minutes" },
    { titleSize: 400 },
    { blocks: Array(5).fill(base.blocks[0]) },
    { cta: "Click" },
    { background: "#fff" },
  ])
    assert.throws(() => normalizeAnnouncement({ ...base, ...patch }));
});
test("expiration is inclusive and future/draft/malformed entries stay out", () => {
  const a = {
    ...base,
    id: "a",
    revision: 1,
    status: "published",
    publishedAtMs: 100,
    expiresAtMs: 200,
  };
  assert.equal(liveAnnouncements([a], 100).length, 1);
  assert.equal(liveAnnouncements([a], 199).length, 1);
  assert.equal(liveAnnouncements([a], 200).length, 0);
  assert.equal(liveAnnouncements([a], 99).length, 0);
  assert.equal(
    liveAnnouncements(
      [
        { ...a, status: "draft" },
        { ...a, expiresAtMs: NaN },
        { ...a, revision: 0 },
      ],
      150,
    ).length,
    0,
  );
});


test("withdrawn middle frame is skipped in both directions", () => {
  const events = ["a", "b", "c"].map((id) => ({
    id,
    type: "announcement",
    atMs: 1,
    payload: {},
    seen: false,
  })) as StoryEvent[];
  assert.equal(nextLiveStoryIndex(events, 1, 2, ["a", "c"]), 0);
  assert.equal(nextLiveStoryIndex(events, 1, 0, ["a", "c"]), 2);
  assert.equal(nextLiveStoryIndex(events, 0, 2, ["c"]), -1);
});
