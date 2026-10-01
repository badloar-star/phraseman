# Task packet: Account V2 — iOS: Swift не компилирует вызов flock в патче expo-sqlite

Governance-ID: TG-EE9FC73E11A5
Status: Done (ждёт подтверждения новой EAS-сборкой)
Owner: Claude session (Account V2), команда владельца «разберись, исправь»

## Outcome

EAS-сборка iOS-пробы a610b454 (первая, дошедшая до компиляции) упала: `node_modules/expo-sqlite/ios/SQLiteModule.swift:186/201/673` — `Darwin.flock(fd, LOCK_*)` Swift разрешает как инициализатор структуры `flock` (struct из того же модуля Darwin), а не функцию: «argument passed to call that takes no arguments», «'flock' conform to 'BinaryInteger'». Исправить в `patches/expo-sqlite+16.0.10.patch`: объявить C-функцию под своим именем (`@_silgen_name("flock") private func phrasemanSystemFlock(_ fd: Int32, _ operation: Int32) -> Int32`) и вызывать её в трёх местах. Пересобрать пробу.

## Scope

patches/expo-sqlite+16.0.10.patch (только эти 3 вызова + одно объявление), node_modules/expo-sqlite/ios/SQLiteModule.swift (локальное применение патча). Out of scope: Android-часть патча, логика аренды/блокировки.

## Architecture

Поведение блокировки не меняется — тот же системный вызов flock(2), только однозначное имя.

## Security and privacy

Без изменений.

## Technical debt

Accept temporarily: другие ошибки компиляции Swift/ObjC могут проявиться следующей сборкой (компилятор остановился на этом файле) — чиним по одной сборке.

## Verification

Патч применяется (`npx patch-package --error-on-fail` / `git apply --check` по свежему архиву), Android-тесты области не задеты (файл iOS-only), новая EAS-сборка пробы.

## Rollback

git revert коммита патча.
