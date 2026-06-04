# Personal Plan UI Design Audit

Date: 2026-05-31

## Goal

Make the personal plan screen feel like a premium daily learning route, not a developer list. The winning design must make the next action obvious in one glance: what today's plan is, how far the learner is, which task is next, and where to tap.

## Research Notes

- Apple HIG materials guidance supports depth and material effects when they clarify hierarchy, not when they become decoration.
- Material Design elevation guidance supports using elevation to separate surfaces by importance and interaction.
- Nielsen Norman Group's visual hierarchy guidance emphasizes contrast, scale, and grouping: the user should know where to look first, second, and third.
- UI Pro Max audit for mobile learning recommends large touch targets, clear spacing, and avoiding flat text-heavy cards.
- UI Pro Max design-system search chose Liquid Glass as the closest premium style, with a warning: contrast and performance must stay under control.
- UI Pro Max mobile UX search flags 44x44 minimum touch targets, 8px spacing between controls, and vertical-first navigation as non-negotiable.
- React Native implementation audit prefers simple native pressables now; heavy gesture animation should wait until the layout is stable.

## Winning Direction

1. Header carries the day title and progress; the screen must go straight into daily tasks.
2. Task cards are physical glass blocks, not flat bordered rows.
3. The primary action button is the strongest tappable object in each task.
4. Timeline dots show order without extra explanation.
5. Generated task art communicates source and mood before the user reads.
6. Text stays short: title, one useful subtitle, time, action.
7. Theme accent controls the whole surface; no random extra palette.

## Design That Should Win

- The user sees the current day title first, then the ordered task stack.
- Every task has one dominant action button. No arrows, no secondary labels inside the button, no tiny chips pretending to be useful.
- Art is a functional marker: lesson, plan phrase, recall, quiz, trainer, practice, and cards must look different before the text is read.
- Depth comes from layered surfaces: dark base, translucent panel, highlight sheen, bottom shade, border glow, and soft elevation.
- The timeline stays calm: one vertical rail, numbered/checked dots, no extra decorations competing with task cards.
- Copy is product text, not implementation notes. It explains the benefit of the task in one sentence.
- Plan themes may change accent and artwork, but they must not introduce a second unrelated palette inside the same app theme.

## Checklist

- [x] Generated task art exists for all current task sources.
- [x] Plan-specific route art exists for all five plans.
- [x] Task cards use large image panels.
- [x] Buttons are full-width and at least 56px high.
- [x] Task cards have elevation, shadow, top sheen, and bottom shade.
- [x] Removed the extra top hero summary card from the plan screen.
- [x] Timeline dots have visible depth.
- [x] User-mode task buttons are large, simple, and free of decorative symbols.
- [x] Task art is wired through a contract instead of hardcoded per card.
- [x] Main task actions use 62px height and extra tap area.
- [x] Home route card uses plan-specific DALL-E route art, not only icon/watermark.
- [x] Plan screen starts from daily tasks after the header.
- [ ] Generate separate full hero art for each plan when final art direction is locked.
- [ ] Tune card text length after week 1 content exists.
- [ ] Add visual snapshot regression for the plan screen once the emulator baseline is stable.
- [ ] Generate distinct art for future new task sources before adding them to content.
- [ ] Add a visual QA pass for 360px, 390px, and tall Pixel layouts before shipping the plan screen.
- [ ] Add reduced-motion rules before adding animated glass or moving highlights.

## Current Design Problems Found

- The old cards had good structure but looked flat because border and fill were doing too much of the visual work.
- The first DALL-E integration helped task identity, but the UI around it did not yet share the same premium material language.
- The removed hero card duplicated the header and pushed daily tasks too far down.
- Text chips like "Урок · 6 фраз" made the cards feel technical; the card should explain itself through title, art, and one button.

## Implementation Notes

- Keep the DALL-E task art in `assets/images/personal_plan_tasks/`.
- Keep visual mapping in `app/personal_plan_task_visuals.ts`; do not import random task art directly in screens.
- Keep glass/depth styles in the plan screen styles so the same material language is shared by hero, task cards, art panels, and buttons.
- Do not add a separate top hero card above daily tasks unless the user explicitly asks to bring it back.
- Home route card is approved as-is for now; avoid changing it during plan-screen polish.
- When a new task source appears, first add the asset and contract test, then use it in content.
- If a future card needs more explanation, open a detail surface; do not crowd the daily task list.

## Rules For Future Plan UI

- Any new `PlanTaskKind` must map to a visual source and asset before it ships.
- Any new plan route task should use plan-specific art when the task is a plan phrase task.
- No DEV wording in user mode.
- No decorative symbols inside buttons.
- No small primary buttons on task cards; task CTAs must be at least 62px high with extra tap area.
- No flat bordered cards for plan tasks.
- No extra explanatory badges unless they answer "what do I do next?"
