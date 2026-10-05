# Task packet: dev-флаг «вести себя как Free» для доступа к урокам

Governance-ID: TG-17BFA1055E23
Status: In progress (координатор 05.10: «ДА, с условиями: только __DEV__, в релизе ключ не читается (тест), по умолчанию выкл,
включается из Dev Hub, влияет ТОЛЬКО на isPremium и devMode при проверке доступа к урокам, лог [DEV-AS-FREE]»)
Owner: сессия 1 · ЯДРО

## Outcome

На эмуляторе dev-сборка всегда даёт devMode=true (DEV_CONTENT_UNLOCK) → Free видит «Ещё рано» вместо пейвола, Сверка не может
проверить пейвол уроков. Флаг в Dev Hub переключает проверку доступа к урокам на «как Free в проде»: isPremium=false,
devMode=false.

## Scope

app/dev_as_free_flag.ts (новый, только __DEV__), components/dev/devToolRegistry.ts + DevHubSheet.tsx (две кнопки),
app/(tabs)/lessons.tsx (оба обработчика тапа урока). Покупки, кошелёк, сервер, Plus в других разделах — не трогаются.

## Architecture

Флаг в памяти модуля; под __DEV__ — загрузка с диска при импорте и запись при переключении (AsyncStorage, локальный
ключ dev_as_free_lessons_v1). В релизе (__DEV__=false) все функции — ранний выход, ключ не читается и не пишется.

## Security and privacy

Только dev-сборка, локальный флаг, без данных пользователя.

## Technical debt

noLimits (тестер без ограничений) флаг не трогает по условию координатора — у тестера урок всё равно откроется.

## Verification

Тест: __DEV__=false → флаг игнорируется, ключ не читается/не пишется; __DEV__=true → применение подменяет только isPremium
и devMode, лог [DEV-AS-FREE]. Сторожа lessons/dev hub.

## Rollback

git revert коммита.
