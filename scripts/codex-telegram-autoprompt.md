# Deprecated Telegram Autoprompt Notes

The old standalone Telegram prompt queue bot is deprecated.

Do not use:

- `scripts/codex-telegram-prompt-queue-bot.ps1`
- `scripts/start-codex-telegram-bot.ps1`
- `scripts/stop-codex-telegram-bot.ps1`
- `scripts/status-codex-telegram-bot.ps1`

Use the Node bridge instead:

```powershell
npm run telegram:start
npm run telegram:status
npm run telegram:audit
npm run telegram:control-center
```

The active bridge writes per-session visible queues under:

```text
.codex-tmp/codex-visible-queues/<session>/
```

The control center is:

```text
.codex-tmp/codex-control-center/control-center.html
```

The only remaining PowerShell sender in the active path is `scripts/codex-chat-queue-sender.ps1`. It is launched by the Node bridge with a session-specific queue path and foreground-window safety checks.
