Governance-ID: TG-9E1452A7D9EC

# Task packet: профиль отправки Android в Play Console — внутренний трек, черновик

## Outcome
По вердикту Fable (через координатора): AAB собирается и попадает в Play Console только во ВНУТРЕННИЙ трек; в ревью и боевой трек ночью не отправляем. В `eas.json` добавлен профиль `submit.internal` (`track: internal`, `releaseStatus: draft`); профиль `production` не меняется.

## Scope
`eas.json` — новый блок `submit.internal`. Вне объёма: сама отправка (по команде координатора), iOS (в App Store Connect без ревью, как раньше).

## Architecture
No architecture change: только профиль EAS Submit.

## Security and privacy
Использует тот же `service-account.json`, что и профиль `production`; нового доступа не вводит.

## Technical debt
Contain: профиль нужен только на ночь выпуска; утром владелец сам двигает релиз в Play Console.

## Verification
`JSON.parse` файла, тесты, читающие `eas.json` (шлюзы версий и плана Б).

## Rollback
`git revert` коммита.
