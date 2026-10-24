# Снимок незакоммиченного пакета «объявления администратора в историях» (24.10)

Зачем: координатор 24.10 — перед работой над историями (слово владельца: «истории должны открываться, каждая ≥10 с,
удержание = пауза, как в Инстаграме») сохранить чужой незакоммиченный пакет, чтобы его не потерять.
Источник: рабочее дерево 24.10 (копия коммита 5169f85d6, ветка release/story-announcements); модули
modules/story_events/* уже в HEAD.

- `../story_announcements_snapshot_2026-10-24.patch` — правки StoryAvatarSlot, StorySlides, StoryViewer, story_strings,
  app/dev_state_fixtures (git diff против HEAD на момент снимка).
- `AnnouncementSlide.tsx.txt` — новый файл components/stories/AnnouncementSlide.tsx (расширение .txt, чтобы не попасть в сборку).

Вернуть: `git apply docs/work/story_announcements_snapshot_2026-10-24.patch` и скопировать AnnouncementSlide обратно.
