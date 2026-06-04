# Telegram Bridge for Local Codex Sessions

This bridge keeps Telegram quiet and uses it as a remote control for local Codex work.

## Current Behavior

- Each Codex session report is sent as one Telegram message: a PNG screenshot plus a short caption.
- Report buttons are limited to `Дальше`, `Дальше 10`, `Дальше 100`.
- `Материалы` appears only when the report has generated files. Files are sent only after pressing that button.
- Reports are relayed from all Codex sessions when `relayAllSessions` is `true`.
- Prompt queues are stored per Codex session under `.codex-tmp/codex-visible-queues/<session>/`.
- The local control center is written to `.codex-tmp/codex-control-center/control-center.html`.
- Interactive controls run through `http://127.0.0.1:3999/`.
- The bridge now starts the local Control Center server automatically on launch.

## Telegram Commands

Visible command:

```text
/inbox
/control
инбокс
меню
панель
контроль
```

`/inbox` shows a compact session inbox. Each button opens a short summary for that session.
`/control` starts/checks the local dashboard and sends the PC URL plus queue status.

Hidden control commands:

```text
стоп
пауза
продолжить
очистить очередь
статус
последний отчет
режим обычный
режим осторожно
режим быстро
режим без вопросов
режим только аудит
```

These commands are text-only so report messages do not become cluttered with admin buttons.
The same mode controls are also available in the local Control Center.

## Desktop Queue Safety

The desktop sender uses `Ctrl+V` + `Enter`, so it now verifies the foreground window before pasting:

- foreground process must be VS Code (`Code` or `Code - Insiders`);
- foreground window title must contain the configured `desktopQueueTargetTitle`;
- if the guard fails, the prompt is returned to the queue and the sender status is written to the session queue status file.

This prevents blind paste into the wrong app or wrong project window.

## Commands

```powershell
npm run telegram:status
npm run telegram:audit
npm run telegram:control-center
npm run telegram:control-server
npm run telegram:start
npm run telegram:restart
npm run telegram:stop
```

## Config

Useful local config fields:

```json
{
  "relayAllSessions": true,
  "desktopQueueDir": ".codex-tmp/codex-visible-queues",
  "desktopQueueTargetTitle": "phraseman",
  "desktopQueueIntervalSeconds": 300,
  "controlCenterDir": ".codex-tmp/codex-control-center",
  "controlCenterPort": 3999
}
```

The bot token is local only and must not be committed.
