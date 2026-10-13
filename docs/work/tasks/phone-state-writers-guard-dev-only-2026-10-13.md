# Task packet: сторож guard_phone_state_portable_writers зелёный — dev-подмены пишут локально осознанно (координатор 13.10 ~11:30)

Governance-ID: TG-60430AE80BE4
Status: Done — сторож 0 нарушений; обратная проверка: probe-файл в app/ ловится, dev-файл из списка нет
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`node scripts/guard_phone_state_portable_writers.mjs` выходит с кодом 0. Красными были три старых нарушения, все в dev-only коде:
- `app/dev_state_fixtures.ts:643` — `setItem('onboarding_done', '1')`, подмена `dev_state?onboarding=done`;
- `app/dev_streak_restore_jump.ts:79` и `:85` — `setItem('streak_count', …)`, воспроизведение гонки «серия 12→5».

## Scope

In scope: `scripts/guard_phone_state_portable_writers.mjs` — явный список dev-only файлов с причиной.

Out of scope:
- `app/dev_state_fixtures.ts` (в нём чужая незакоммиченная работа) и `app/dev_streak_restore_jump.ts` — их не трогаю;
- код приложения.

## Architecture

Сторож требует, чтобы portable-ключи прогресса писались через фасад (`persistPortableProgressRegister` и домены phone-state).
Фасад кладёт операцию в phone-state store и запускает синк, то есть отправляет запись в облако.

Для dev-подмен это неверно: правило проекта запрещает писать подставные значения в Firestore. Сам повтор гонки «серия 12→5» обязан писать мимо синка, иначе выдуманная серия 5 уехала бы в облачный профиль тестового аккаунта.

Поэтому правильная починка — не перевести эти записи на фасад, а явно разрешить в стороже список dev-only файлов:
- маршрут `dev_state` вырезан из стор-сборки регуляркой `router.ctx.js`;
- `dev_streak_restore_jump` импортируется только из `dev_state_fixtures`.

Обходить регулярку константой вместо литерала не стал: так сторож ослеп бы молча.

## Security and privacy

Ничего не пишется в облако. Правка только делает видимым осознанное исключение.

## Technical debt

- Список dev-only файлов нужно держать коротким. Новый dev-файл, который пишет portable-ключ прогресса, должен попасть сюда осознанно, с причиной.
- Сторож не проверяет, что файл из списка действительно вырезан из стор-сборки. Это держит гейт `store_route_reachability`.

## Verification

- сторож выходит с кодом 0 и `violations: 0`;
- проверка от обратного: временная запись `setItem('streak_count'…)` в не-dev файле по-прежнему ловится — проверяется на копии в scratchpad.

## Rollback

`git revert` коммита.
