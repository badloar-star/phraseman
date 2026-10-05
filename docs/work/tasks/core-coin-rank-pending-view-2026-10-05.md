# Task packet: 65(в) — карточка «Проверяем повышение» (coin_rank) по coins.html: системный спиннер и кегли status-card

Governance-ID: TG-5AB25D0BBB00
Status: In progress (решено по рекомендации, владелец 11:10; координатор: «65(в) — только вид по coins.html»)
Owner: сессия 1 · ЯДРО

## Outcome

Состояние «Проверяем повышение» (coins.html №4) уже есть в app/coin_rank.tsx, но вид отличается от макета:
- спиннер — системный ActivityIndicator. В макете `.spin`: кольцо 22, линия 2.5, дорожка rgba(255,255,255,.18),
  верх белый, оборот 0.8 с линейно. Стиль `.spin` в coins.html не подключён (пустой div — дефект макета), поэтому
  эталон — общий `.spin` кита (cards-states.html, system.html, dialogs.html, video.html — один и тот же);
- `.status-card` (общий для «Не хватает…» и «Проверяем…»): отступы 14/16, заголовок 15 жирный, текст 14/20,
  отступ под заголовком 2. В приложении: 16/16, 16/21 и 13/18.
Новый компонент components/v2/KitSpinner.tsx — общий спиннер кита (Animated на нативном драйвере, без
React-рендеров на кадр). Логика экрана, тексты и трата не меняются.

## Scope

components/v2/KitSpinner.tsx (новый), app/coin_rank.tsx (замена ActivityIndicator, стили statusCard/statusTitle/
statusNote с пометкой d145-mockup).

## Architecture

KitSpinner — отдельный маленький компонент. Другие экраны на него можно переводить потом, отдельными задачами.

## Security and privacy

Не затрагивает.

## Technical debt

Остальные ActivityIndicator в приложении не тронуты — кандидаты на KitSpinner по Сверке.

## Verification

Синтаксис; сторожа coin_rank_screen_*, typography_two_sizes_ratchet (пометки d145-mockup), motion_allowlist;
узкая проверка типов; Сверка coins-004 (вид «Проверяем повышение»).

## Rollback

git revert коммита.
