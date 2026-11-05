# Task packet: dev-переопределение ползунков «Оформление» + монета ранга в оставшихся местах + акценты в окраске языка

Governance-ID: TG-5A0657B68408
Governance-ID: TG-09A303CAA938
Status: Planned
Owner: 2 · ДИЗАЙН
Related epic/enabler: PhraseMan 2.0, слово владельца 05.11 («монета строго по рангу»), флаг theme_sliders_v1

## Outcome

1. Эмулятор может снять экран «Оформление» с ползунками без смены боевого флага: в dev-сборке флаг включается переменной окружения, в стор-сборке всегда выключен; журнал `[THEME-SLIDERS] {flag, source}`.
2. Монета ранга в оставшихся местах из аудита Диспетчера: PracticeRuneCounter (свой require), FriendTogetherSheet, NotificationCenterButton (AvatarView без coinRank), settings.tsx (мелькание бронзы).
3. Окраска изучаемого языка видит латиницу с акцентами (à é ê ñ ü ß ç œ…).
4. Заставка: выяснить `[SPLASH-COIN] end finished:false`.

## Scope

In scope: constants/theme_sliders_flag.ts, components/PracticeRuneCounter.tsx, components/**/FriendTogetherSheet.tsx, NotificationCenterButton.tsx, app/(tabs)/settings.tsx, components/learn_lang_text.tsx, components/startup/SplashCoin.tsx, тесты-сторожа.

Out of scope: включение флага в боевом коде (остаётся false), удаление старых тем, удаленный Remote Config, экзамены глав (Learning V2), Пик (Ядро), авторы Наборов (Темы).

## Architecture

No architecture change: флаг остаётся константой, читаемой на старте; добавляется только dev-условие, не доступное в стор-сборке (`__DEV__`/DEV_MODE и `EXPO_PUBLIC_STORE_RELEASE !== '1'`). Монета — через существующие hooks/use_my_rank_coin и AvatarView coinRank.

## Security and privacy

Данных не собираем, новых сервисов и разрешений нет. Стор-сборка не может включить dev-флаг (двойная защита: STORE_RELEASE и __DEV__).

## Technical debt

Contain: dev-переопределение временное, живёт до включения флага владельцем; затем удаляется вместе с флагом отдельным коммитом.

## Verification

Тесты theme_tune_flag_off, settings_appearance_contract, rank_coin_everywhere, новый сторож латиницы; typecheck по затронутым файлам; кадры «Оформление» от эмулятора.

## Rollback

Откатить коммит; боевой флаг не менялся.
