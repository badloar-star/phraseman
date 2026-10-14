# Task packet: самопроверка WelcomeBackMoment по эталону m21 (координатор 15.10)

Governance-ID: TG-42749AD123A5
Status: Правка отступов — к окну 00:30
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Сверка `components/moments/WelcomeBackMoment.tsx` с исходником эталона (`docs/design/v2-app/engagement-moments-v3-all.html` m21,
`engagement-moments.css`, `engagement-moments-app.css`, `engagement-moments-v3.css`, `engagement-moments-app.js`) и кадрами
`docs/phraseman-2.0/evidence/etalon_v3/m21/*`.

| Пункт | Эталон | Код | Итог |
|---|---|---|---|
| Тексты ru/uk | «С возвращением» / «9 дней — ничего не сгорело: 412 фраз, ранг 5, энергия полная.» / «5 карточек — 1 минута» / «На Главную» | `welcome_back_strings.ts` дословно; uk — перевод | ✅ |
| Заголовок | `.h-xl` 34/40/800, −0,6, отступ 22 | 34/40/800, −0,6, 22 | ✅ |
| Текст | `.p` 16/22, `--sc`, отступ 8 | 16/22, `p.textSecondary`, 8 | ✅ |
| Монета | 110, sleep + zz | 110, sleep + zz (zz только во сне) | ✅ |
| Кнопки | `.cta` 52/26, 16/22/700, стрелка 20 за текстом; ghost = btn + nested shadow; зазор 12 | `V2Button` large 52/26, иконка 20; secondary = buttonFill + nested; `gap: 12` | ✅ |
| Тайм-лист | 1,0 с peek + «!» ×1, хаптик medium, звук tap; 1,8 с cheer + сердца ×5, success, new_week; строки по 300 мс, emUp 500 мс `.2,1,.3,1`, сдвиг 18 | то же; звуки через `tryPlayV2Event` (learn → null) | ✅ |
| Финал | cheer один раз (emCcCheer 1100 мс both), три строки видны | `MomentCoin` cheer один раз | ✅ |
| Отступы `.full` | 76 сверху / 36 снизу от края телефона (кадр 412×915 со статус-баром и полосой жестов) | `insets.top + 76` / `insets.bottom + 36` — безопасная зона прибавлялась СВЕРХ, кнопки выше эталона на высоту полосы жестов | ❌ → правка |
| Появление окна | `emFade 420ms` без кривой = CSS `ease` | `MomentFullScreen`: `Easing.out(cubic)` | ⚠️ спорное, общий файл Пика — координатору |
| Основная кнопка | в образце всегда | только если карточек > 0 (настоящие данные, D193) | ⚠️ спорное — координатору |

## Scope

In scope: отступы в `components/moments/WelcomeBackMoment.tsx` — та же формула, что у соседних моментов
(`MomentPromotion`/`MomentDown`): сверху `Math.max(insets.top + 28, 76)`, снизу `Math.max(insets.bottom, 12) + 24`.
Out of scope: `components/spire/moments/moments_layout.tsx` (общий, кривая появления), логика показа.

## Architecture

Только числа отступов.

## Security and privacy

Не касается.

## Technical debt

- Кривая `emFade` и показ основной кнопки при 0 карточек — решение координатора.

## Verification

- `tests/welcome_back_ui_contract.test.ts` зелёный; babel-парс файла.

## Rollback

`git revert`.
