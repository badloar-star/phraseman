# Task packet: deliver the Today «Неделя» card (variant A) — commit, Сверка frames, lessons kept in memory

Governance-ID: TG-B55FFA5273BC
Status: Done — 49e363ecf (week card); Сверка frames requested; memory notes kept
Owner: 3 · МАКЕТЫ (coordinator 22.10 ~14:40: «Неделя» — вариант А; шапку не трогать до ответа владельца)
Related epic/enabler: TG-3E4DD900AAA3 (week card implementation), 767196a6f (Today parity 1–3), 8c48481f0 (Dialogs v2 mockup)

## Outcome

The week card work (today_tasks_week + TodayWeekCard, checks green) lands in one commit in a code window; the coordinator and 6 · СВЕРКА
get the hash and the frames to capture (dev preview with the mockup's 15–20 Oct data, and the real screen after a day rollover);
two lessons of this session are kept in the session memory (mockup class collision with the phone theme class; mockup colours from
the app tokens). The Today header stays «‹ Сегодня» until the owner answers.

## Scope

In scope: the commit of the already checked files, messages to the coordinator and Сверка, memory notes outside the repo.
Out of scope: new app code, the Today header, Home.

## Architecture

No architecture change in this step: delivery only.

## Security and privacy

No new data beyond TG-3E4DD900AAA3 (on-device daily task progress, covered by the privacy policy's «daily tasks … on your device»).

## Technical debt

- Accept temporarily: days before the release have no record and show empty rings — by design (no invented history); owner of the
  decision: coordinator.

## Verification

safe_commit numstat equals the dry run of own files only; types clean and 17 + 3 suites green (logged in the check outputs).

## Rollback

Revert the week commit: the scene shows «История» again; the week key on the phone is simply not read.
