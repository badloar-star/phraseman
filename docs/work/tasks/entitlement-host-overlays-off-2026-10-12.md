# Task packet: окно «Plus закончился» гасится overlays=off; слот-кадры настроек тоже с overlays=off

Governance-ID: TG-CD783A9756EC
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: components/EntitlementExpiredHost.tsx, app/dev_overlays_off.ts, scripts/dev_links_r1_generate.py

## Outcome

settings-gap-008: журнал кадра показал holder=entitlementExpired — окно «Plus закончился» (после plus=on → plus=off между кадрами) закрыло экран, и шаг #settings-clear-cache-row не нашёл элемент. overlays=off теперь гасит и это окно (только dev, память); строки со слотом сообщений (007/008/009/029) больше не исключены из overlays=off — слот не окно.

## Scope

In scope: условие показа окна, список исключений генератора. Out of scope: поведение окна у людей.

## Architecture

No architecture change: подписка на уже существующий dev-флаг.

## Security and privacy

Данных не касается; в стор-сборке флаг всегда выключен.

## Technical debt

Pay now: кадры настроек падали из-за чужого окна.

## Verification

Сторож, срез типов.

## Rollback

Откат коммита.
