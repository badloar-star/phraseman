param(
  [string]$BotToken = $env:TELEGRAM_BOT_TOKEN,
  [string]$AllowedChatId = $env:TELEGRAM_ALLOWED_CHAT_ID,
  [string]$QueuePath = ".codex-tmp\codex-prompt-queue.txt",
  [string]$PromptPath = ".codex-tmp\codex-next-prompt.txt",
  [string]$QueueToken = "__CODEX_NEXT_PROMPT__",
  [string]$TargetTitle = "phraseman",
  [string]$SessionRoot = (Join-Path $env:USERPROFILE ".codex\sessions"),
  [string]$SessionPreviewDir = ".codex-tmp\session-previews",
  [int]$RawSessionOpenMaxBytes = 20000000,
  [string]$ScreenshotPath = ".codex-tmp\codex-vscode-report-screenshot.png",
  [string]$PromptText = "",
  [int]$PollTimeoutSeconds = 25
)

$ErrorActionPreference = "Stop"

function TextFromCodepoints {
  param([int[]]$Codepoints)

  $chars = foreach ($codepoint in $Codepoints) { [char]$codepoint }
  return [string]::Concat($chars)
}

$NEXT_TEXT = TextFromCodepoints @(0x0434, 0x0430, 0x043B, 0x044C, 0x0448, 0x0435)
$FORWARD_TEXT = TextFromCodepoints @(0x0434, 0x0430, 0x043B, 0x0435, 0x0435)
$QUEUE_TEXT = TextFromCodepoints @(0x043E, 0x0447, 0x0435, 0x0440, 0x0435, 0x0434, 0x044C)
$SESSIONS_TEXT = TextFromCodepoints @(0x0441, 0x0435, 0x0441, 0x0441, 0x0438, 0x0438)
$NEW_CHAT_TEXT = TextFromCodepoints @(0x043D, 0x043E, 0x0432, 0x044B, 0x0439, 0x0020, 0x0447, 0x0430, 0x0442)
$REPORT_TEXT = TextFromCodepoints @(0x0441, 0x043A, 0x0440, 0x0438, 0x043D, 0x0020, 0x043E, 0x0442, 0x0447, 0x0435, 0x0442, 0x0430)

if (-not $PromptText) {
  $PromptText = $NEXT_TEXT
}

if (-not $BotToken) {
  throw "Bot token is required. Pass -BotToken or set TELEGRAM_BOT_TOKEN."
}

function Ensure-ParentDirectory {
  param([string]$Path)

  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

function Invoke-Telegram {
  param(
    [string]$Method,
    [hashtable]$Body
  )

  $uri = "https://api.telegram.org/bot$BotToken/$Method"
  return Invoke-RestMethod `
    -Uri $uri `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body ($Body | ConvertTo-Json -Depth 16)
}

function Invoke-TelegramPhoto {
  param(
    [string]$ChatId,
    [string]$PhotoPath,
    [string]$Caption
  )

  $uri = "https://api.telegram.org/bot$BotToken/sendPhoto"
  $resolved = (Resolve-Path -LiteralPath $PhotoPath).Path
  $result = & curl.exe -sS -X POST $uri `
    -F "chat_id=$ChatId" `
    -F "caption=$Caption" `
    -F "photo=@$resolved"

  return $result
}

function Test-AllowedChat {
  param([string]$ChatId)

  if (-not $AllowedChatId) {
    return $true
  }
  return [string]$ChatId -eq [string]$AllowedChatId
}

function Get-CurrentPrompt {
  if ($PromptPath -and (Test-Path -LiteralPath $PromptPath)) {
    $text = (Get-Content -LiteralPath $PromptPath -Raw).Trim()
    if ($text) {
      return $text
    }
  }

  if ($PromptText) {
    return $PromptText
  }

  return $NEXT_TEXT
}

function Get-QueueCount {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return 0
  }

  return @([System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $Path)) | Where-Object { $_.Trim().Length -gt 0 }).Count
}

function Get-RecentSessions {
  param([int]$Count = 10)

  if (-not (Test-Path -LiteralPath $SessionRoot)) {
    return @()
  }

  return @(Get-ChildItem -LiteralPath $SessionRoot -Recurse -File -Filter "*.jsonl" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First $Count)
}

function Format-SessionList {
  param([object[]]$Sessions)

  if ($Sessions.Count -eq 0) {
    return "No Codex sessions found."
  }

  $lines = New-Object System.Collections.Generic.List[string]
  $index = 1
  foreach ($session in $Sessions) {
    $lines.Add(("{0}. {1} | {2}" -f $index, $session.LastWriteTime.ToString("yyyy-MM-dd HH:mm"), $session.Name))
    $index++
  }

  return ($lines -join "`n")
}

function Add-PromptsToQueue {
  param(
    [string]$Path,
    [string]$Text,
    [int]$Count
  )

  Ensure-ParentDirectory -Path $Path
  $items = for ($i = 0; $i -lt $Count; $i++) { $Text }
  Add-Content -LiteralPath $Path -Value $items -Encoding UTF8
}

function Send-Menu {
  param(
    [string]$ChatId,
    [string]$Text
  )

  $keyboard = @{
    inline_keyboard = @(
      @(
        @{ text = $FORWARD_TEXT; callback_data = "enqueue:1" },
        @{ text = "$FORWARD_TEXT x10"; callback_data = "enqueue:10" }
      ),
      @(
        @{ text = "$FORWARD_TEXT x100"; callback_data = "enqueue:100" },
        @{ text = $QUEUE_TEXT; callback_data = "status" }
      ),
      @(
        @{ text = $SESSIONS_TEXT; callback_data = "sessions" },
        @{ text = $NEW_CHAT_TEXT; callback_data = "new_chat" }
      ),
      @(
        @{ text = $REPORT_TEXT; callback_data = "report_screenshot" }
      )
    )
  }

  Invoke-Telegram -Method "sendMessage" -Body @{
    chat_id = $ChatId
    text = $Text
    reply_markup = $keyboard
  } | Out-Null
}

function Send-SessionsMenu {
  param([string]$ChatId)

  $sessions = Get-RecentSessions -Count 10
  $buttons = New-Object System.Collections.Generic.List[object]
  for ($i = 0; $i -lt $sessions.Count; $i += 2) {
    $row = New-Object System.Collections.Generic.List[hashtable]
    $row.Add(@{ text = [string]($i + 1); callback_data = "open_session:$i" })
    if ($i + 1 -lt $sessions.Count) {
      $row.Add(@{ text = [string]($i + 2); callback_data = "open_session:$($i + 1)" })
    }
    $buttons.Add($row.ToArray())
  }

  $keyboard = @{ inline_keyboard = $buttons.ToArray() }
  Invoke-Telegram -Method "sendMessage" -Body @{
    chat_id = $ChatId
    text = (Format-SessionList -Sessions $sessions)
    reply_markup = $keyboard
  } | Out-Null
}

function Open-SessionInVsCode {
  param([int]$Index)

  $sessions = Get-RecentSessions -Count 10
  if ($Index -lt 0 -or $Index -ge $sessions.Count) {
    throw "Session index is out of range."
  }

  $session = $sessions[$Index]
  $openPath = $session.FullName

  if ($session.Length -gt $RawSessionOpenMaxBytes) {
    if (-not (Test-Path -LiteralPath $SessionPreviewDir)) {
      New-Item -ItemType Directory -Path $SessionPreviewDir -Force | Out-Null
    }

    $previewPath = Join-Path $SessionPreviewDir ("session-{0}-preview.md" -f ($Index + 1))
    $tail = Get-Content -LiteralPath $session.FullName -Tail 80 -Encoding UTF8 -ErrorAction SilentlyContinue
    $updatedAt = $session.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    $preview = @(
      "# Codex session preview",
      "",
      ("Name: {0}" -f $session.Name),
      ("Path: {0}" -f $session.FullName),
      ("Updated: {0}" -f $updatedAt),
      ("Size: {0} bytes" -f $session.Length),
      "",
      "This session is too large for safe raw opening from Telegram. The last 80 lines are shown below.",
      "",
      '```jsonl',
      $tail,
      '```'
    )
    Set-Content -LiteralPath $previewPath -Value $preview -Encoding UTF8
    $openPath = (Resolve-Path -LiteralPath $previewPath).Path
  }

  Start-Process -FilePath "code" -ArgumentList @("-r", $openPath) -WindowStyle Hidden
  return $openPath
}

function Invoke-NewChat {
  $script = Join-Path $PSScriptRoot "codex-vscode-new-chat.ps1"
  & $env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -TargetTitle $TargetTitle | Out-Null
}

function Send-ReportScreenshot {
  param([string]$ChatId)

  $script = Join-Path $PSScriptRoot "codex-vscode-report-screenshot.ps1"
  & $env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -TargetTitle $TargetTitle -OutputPath $ScreenshotPath | Out-Null
  Invoke-TelegramPhoto -ChatId $ChatId -PhotoPath $ScreenshotPath -Caption "VS Code report screenshot" | Out-Null
}

function Send-Text {
  param(
    [string]$ChatId,
    [string]$Text
  )

  Invoke-Telegram -Method "sendMessage" -Body @{
    chat_id = $ChatId
    text = $Text
  } | Out-Null
}

function Answer-Callback {
  param(
    [string]$CallbackQueryId,
    [string]$Text
  )

  Invoke-Telegram -Method "answerCallbackQuery" -Body @{
    callback_query_id = $CallbackQueryId
    text = $Text
    show_alert = $false
  } | Out-Null
}

function Handle-Enqueue {
  param(
    [string]$ChatId,
    [int]$Count
  )

  if ($Count -lt 1) {
    $Count = 1
  }
  if ($Count -gt 100) {
    $Count = 100
  }

  Add-PromptsToQueue -Path $QueuePath -Text $QueueToken -Count $Count
  $queueCount = Get-QueueCount -Path $QueuePath
  Send-Menu -ChatId $ChatId -Text "Added steps: $Count. Queue: $queueCount."
}

Ensure-ParentDirectory -Path $QueuePath

Write-Host "Codex Telegram prompt queue bot started."
Write-Host "Queue path: $QueuePath"
Write-Host "Prompt path: $PromptPath"
Write-Host "Queue token: $QueueToken"
Write-Host "Target title: $TargetTitle"
Write-Host "Session root: $SessionRoot"
Write-Host "Screenshot path: $ScreenshotPath"
Write-Host "Fallback prompt text: $(Get-CurrentPrompt)"
if ($AllowedChatId) {
  Write-Host "Allowed chat id: $AllowedChatId"
} else {
  Write-Host "Allowed chat id: not set. First run /start, copy chat id from logs, then restart with -AllowedChatId."
}

$offset = 0
$nextPattern = [regex]::Escape($NEXT_TEXT)
$forwardPattern = [regex]::Escape($FORWARD_TEXT)
$queuePattern = [regex]::Escape($QUEUE_TEXT)

while ($true) {
  try {
    $updates = Invoke-Telegram -Method "getUpdates" -Body @{
      offset = $offset
      timeout = $PollTimeoutSeconds
      allowed_updates = @("message", "callback_query")
    }

    foreach ($update in $updates.result) {
      $offset = [int]$update.update_id + 1

      if ($update.message) {
        $chatId = [string]$update.message.chat.id
        $text = [string]$update.message.text
        Write-Host "Message from chat ${chatId}: $text"

        if (-not (Test-AllowedChat -ChatId $chatId)) {
          Send-Text -ChatId $chatId -Text "This chat is not allowed to control the queue."
          continue
        }

        if ($text -match '^/start' -or $text -match '^/menu') {
          Send-Menu -ChatId $chatId -Text "Codex queue. Press a button to add prompts."
          continue
        }

        if ($text -match '^/sessions' -or $text -match $SESSIONS_TEXT) {
          Send-SessionsMenu -ChatId $chatId
          continue
        }

        if ($text -match '^/newchat' -or $text -match $NEW_CHAT_TEXT) {
          Invoke-NewChat
          Send-Menu -ChatId $chatId -Text "New Codex chat command sent to VS Code."
          continue
        }

        if ($text -match '^/report' -or $text -match $REPORT_TEXT) {
          Send-ReportScreenshot -ChatId $chatId
          continue
        }

        if ($text -match "$nextPattern\s*x?100" -or $text -match "$forwardPattern\s*x?100") {
          Handle-Enqueue -ChatId $chatId -Count 100
          continue
        }

        if ($text -match "$nextPattern\s*x?10" -or $text -match "$forwardPattern\s*x?10") {
          Handle-Enqueue -ChatId $chatId -Count 10
          continue
        }

        if ($text -match $nextPattern -or $text -match $forwardPattern) {
          Handle-Enqueue -ChatId $chatId -Count 1
          continue
        }

        if ($text -match $queuePattern) {
          Send-Menu -ChatId $chatId -Text "Queue: $(Get-QueueCount -Path $QueuePath)."
          continue
        }

        Send-Menu -ChatId $chatId -Text "Commands: $FORWARD_TEXT, $FORWARD_TEXT x10, $FORWARD_TEXT x100."
        continue
      }

      if ($update.callback_query) {
        $callbackId = [string]$update.callback_query.id
        $chatId = [string]$update.callback_query.message.chat.id
        $data = [string]$update.callback_query.data
        Write-Host "Callback from chat ${chatId}: $data"

        if (-not (Test-AllowedChat -ChatId $chatId)) {
          Answer-Callback -CallbackQueryId $callbackId -Text "Chat is not allowed."
          continue
        }

        if ($data -eq "status") {
          $count = Get-QueueCount -Path $QueuePath
          Answer-Callback -CallbackQueryId $callbackId -Text "Queue: $count"
          Send-Menu -ChatId $chatId -Text "Queue: $count."
          continue
        }

        if ($data -eq "sessions") {
          Answer-Callback -CallbackQueryId $callbackId -Text "Opening sessions list."
          Send-SessionsMenu -ChatId $chatId
          continue
        }

        if ($data -eq "new_chat") {
          Invoke-NewChat
          Answer-Callback -CallbackQueryId $callbackId -Text "New chat command sent."
          Send-Menu -ChatId $chatId -Text "New Codex chat command sent to VS Code."
          continue
        }

        if ($data -eq "report_screenshot") {
          Answer-Callback -CallbackQueryId $callbackId -Text "Capturing VS Code screenshot."
          Send-ReportScreenshot -ChatId $chatId
          continue
        }

        if ($data -match '^open_session:(\d+)$') {
          $index = [int]$Matches[1]
          $path = Open-SessionInVsCode -Index $index
          Answer-Callback -CallbackQueryId $callbackId -Text "Opened session $($index + 1)."
          Send-Menu -ChatId $chatId -Text "Opened session in VS Code: $path"
          continue
        }

        if ($data -match '^enqueue:(\d+)$') {
          $count = [int]$Matches[1]
          Add-PromptsToQueue -Path $QueuePath -Text $QueueToken -Count $count
          $queueCount = Get-QueueCount -Path $QueuePath
          Answer-Callback -CallbackQueryId $callbackId -Text "Added: $count"
          Send-Menu -ChatId $chatId -Text "Added steps: $count. Queue: $queueCount."
          continue
        }

        Answer-Callback -CallbackQueryId $callbackId -Text "Unknown command."
      }
    }
  } catch {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $message = $_.Exception.Message
    Write-Host ("[{0}] Telegram loop error: {1}" -f $stamp, $message)
    Start-Sleep -Seconds 5
  }
}
