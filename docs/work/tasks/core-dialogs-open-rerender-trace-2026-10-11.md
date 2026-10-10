# Task packet: [DIALOGS-OPEN] — кто перерисовывает хаб «Диалогов» на первом коммите

Governance-ID: TG-C2D80A4BBF63
Status: In progress (шаг «сперва логи»)
Owner: 1 · ЯДРО
Related epic/enabler: [DIALOGS-OPEN] (53a0e6d87), координатор 05:00 п.2

## Outcome

Понять по фактам, почему `hub:first_commit` холодного входа в «Диалоги» вырос 445 → 680 мс (Сверка 22:46), и
только потом сократить. Логи cold3 показывают: первое монтирование каталога дешёвое (< 16 мс, в лог не попало),
затем вложенная перерисовка `nested-update` на 126 мс до first_commit; ещё две перерисовки (36 и 47 мс) идут вслед
за перерисовками всего экрана (`home:render`). Цель шага — увидеть, какой вход меняется на каждой перерисовке.

## Scope

In scope: временная трассировка в `components/dialogs/DialogueV2CatalogueContainer.tsx` (`hub:render`) и
`app/ai_dialog_home.tsx` (`home:rerender`): номер перерисовки и список изменившихся входов.

Out of scope: сама правка производительности (после логов), каталог/сеть, вёрстка.

## Architecture

No architecture change: только console.log с префиксом [DIALOGS-OPEN] и ref-счётчик, без влияния на данные/вид.

## Security and privacy

В лог идут только имена изменившихся входов и номера перерисовок — без uid, текстов и значений квоты.

## Technical debt

Contain: трассировка временная, снимается вместе с остальными [DIALOGS-OPEN] после правки (пост-релизный список
INBOX Ядра). Выход — коммит правки с удалением строк `hub:render`/`home:rerender`.

## Verification

babel_check обоих файлов; точечный tsc по ним; Сверка воспроизводит холодный вход и присылает строки
`[DIALOGS-OPEN] hub:render` / `home:rerender`.

## Rollback

`git revert` коммита трассировки; поведение экрана не меняется.
