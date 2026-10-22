# Task packet: Dialogs mockup «choose» v2 — the app's scene on top, a calm carousel of dialogs below

Governance-ID: TG-70CB924AA0A7
Status: Done — mockup ready for the owner (three carousel densities × three frames, light and dark)
Owner: 3 · МАКЕТЫ (coordinator 22.10 ~14:40, owner's words on dialogs-scene-choose 34b0caae2)
Related epic/enabler: 34b0caae2 (dialogs-scene-choose v1), 8922e9ca5 (Dialogs scene 46 %), TG-3E4DD900AAA3 (Peak numbers, same batch)

## Outcome

Owner: «вариант карусель интересный вроде, но нет — сразу с самого начала, как первый взгляд кидаешь, то куча всего. Мне нравится
текущая сцена, верхняя часть, что в приложении, но нижняя часть — вот там надо добавить карусель, наверное, и общий экран тоже, чтобы
было видно и можно было выбирать диалоги. Попробуй ещё сделать». Deliverable: docs/design/v2-app/dialogs-scene-choose-v2.html —
top = the current Dialogs scene of the app 1:1 (DialogsSceneStage at 46 %, from code and Сверка captures), bottom = a calm carousel of
dialog cards (one topic, the next dialog in focus, done / locked at the sides, minimal text: title + partner + ✓ / 🔒), the whole screen
visible without scrolling on 390×844, 2–3 density variants, each «first look → choosing → started», light and dark, real data only.
Success: the coordinator can show the owner one page where every variant reads calm at first glance.

## Scope

In scope: the new mockup HTML (kit.css phone frames, Inter, Ionicons font, real dialog data from the app's content). Out of scope: app
code, the Dialogs list screen, other mockups.

## Architecture

Static mockup, no app code. Data: the app's dialog catalogue (titles, partners, worlds, goal counts) as already used in v1.

## Security and privacy

None: a design page with product content only, no personal data.

## Technical debt

None created: the page is a design artifact; the choice goes to the owner.

## Verification

Headless capture of every frame (light and dark) at 390×844 with the capture tools; every screen checked for overflow and that nothing
needs scrolling; text only from the app's data.

## Rollback

Delete the page; v1 (34b0caae2) stays.
