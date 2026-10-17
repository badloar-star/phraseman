# Главная: 4 плитки с Пиком — варианты эталона
Governance-ID: TG-CFB9A088E0ED

## Outcome
Слово владельца 17.10 (через координатора): на Главной в языковом контуре, где доступны все 4 раздела, — плитки Уроки, Диалоги, Карточки, Пик. В эталоне home-by-language-mockup.html блок #four-tiles: (а) 4 в ряд, (б) 2×2, (в) лучший вариант; 360 и 430 dp; «Сумерки» (светлая) и «Океан» (тёмная пара). Попутно: убрать «Хотя бы минуту» у задания «Посмотреть видео» (сделано c91052029).
## Scope
Только docs/design/v2-app/home-by-language-mockup.html (+ кадр в previews). Код не трогаем.
## Architecture
Самостоятельный блок со своими классами h4-*, токены тем как в voice-limit-session-start.html, арт из assets/v2art/{light,dark}.
## Security and privacy
Нет данных и сервисов.
## Technical debt
Нет; варианты отбросятся после выбора владельца.
## Verification
Снимок playwright блока, подписи не обрезаны на 360 dp.
## Rollback
git revert коммита макета.
