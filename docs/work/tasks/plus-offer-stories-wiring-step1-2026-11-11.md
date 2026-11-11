# Task packet: три кадра-предложения Plus — подключение к реестру и фотостудии (шаг 1)

Governance-ID: TG-DE709D49C709
Status: In progress
Owner: сессия Claude «аудит мотивации к покупке Plus», 2026-11-11
Related epic/enabler: кадры `components/stories/templates/frames_plus.tsx` (коммит 91329bc62), макет `docs/design/v2-app/stories-plus-offers.html`; подключение кадров «вместо окон» соседней сессией — da893b1c1

## Outcome

Три кадра-предложения Plus (защита серии, итог недели, диалоги без счётчика) записаны в общий реестр шаблонов историй
и открываются в фотостудии историй под номерами 49…51 — их вид можно сверить с макетом на устройстве. Кнопка
«Посмотреть Plus» закрывает просмотр и открывает окно покупки готовым действием `open_plus`.
К игроку кадры на этом шаге НЕ попадают: событий-источников ещё нет.

## Scope

In scope:
- новый `components/stories/templates/story_plus_offer_registry.ts` — id, типы данных, примеры;
- `story_template_registry.ts` — подключение списка в конец `STORY_ALL_TEMPLATE_IDS`, типов, примеров и трёх кнопок;
- `StoryTemplateSlide.tsx` — три ветки выбора кадра;
- `story_template_strings.ts` — ключ `ctaSeePlus` («Посмотреть Plus», 9 языков); из `story_plus_offer_strings.ts` дубль убран;
- тесты: `tests/story_plus_offer_frames_2026_11_11.test.ts` (кадры подключены), `tests/story_templates_v1_2026_10_28.test.ts`
  (48 → 51), одна строка в `tests/story_instead_frames_2026_11_11.test.ts` (разрешена её автором — сессией «аудит всплывающих окон»).

Out of scope (шаг 2): события-источники, показ следом за личным кадром (серия 7/14/30, итог недели, второй диалог),
правило «только бесплатному аккаунту», свой контекст окна покупки для каждого кадра (сейчас общий `generic`).

## Architecture

Тем же способом, что кадры «вместо окон»: свой список в своём файле, в общий реестр — только подключение, новые id
строго в конец (номера прежних кадров в фотостудии не сдвигаются). Просмотр (`StoryViewer.tsx`) не меняется: кнопка
берётся из `STORY_TEMPLATE_CTA` по id кадра.

## Security and privacy

Новых данных нет. На этом шаге кадры видны только в фотостудии (dev-маршрут).

## Technical debt

- Accept temporarily: кнопка открывает окно покупки с общим контекстом `generic` и источником `story_announcement` —
  в аналитике три кадра не отличить от объявления Plus. Владелец — эта сессия; exit — шаг 2 (свои контекст и источник).
- Accept temporarily: переводы кадров на 8 языков сделаны сессией, переводчик не смотрел. Exit — проверка до шага 2.

## Verification

`npm run test:one -- tests/story_plus_offer_frames_2026_11_11.test.ts tests/story_templates_v1_2026_10_28.test.ts
tests/story_instead_frames_2026_11_11.test.ts tests/story_contest_intro_2026_10_29.test.ts
tests/story_contest_winner_2026_10_29.test.tsx tests/story_referral_ladder_2026_10_29.test.ts` — смотреть текст вывода.
На устройстве: фотостудия историй, кадры 49…51, склейка «макет | эмулятор».

## Rollback

`git revert` коммита: кадры остаются в своих файлах неподключёнными, фотостудия возвращается к 48 кадрам.
