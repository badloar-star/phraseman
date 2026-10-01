#!/usr/bin/env bash
# зачем (владелец 01.10): одна команда для ключей «Взять расшифровку из YouTube».
# Скрипт НЕ знает значений: открывает страницу OAuth-клиентов и по очереди спрашивает
# Client ID и Client secret через штатный ввод firebase (значения видит только владелец).
set -euo pipefail
URL="https://console.cloud.google.com/apis/credentials?project=phraseman-ea0b3"
echo "[YT-OAUTH] Открываю страницу ключей Google: $URL"
(start "" "$URL" 2>/dev/null || cmd.exe /c start "" "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null || open "$URL" 2>/dev/null) || echo "[YT-OAUTH] Откройте ссылку вручную: $URL"
echo
echo "[YT-OAUTH] Шаг 1 из 2: нажмите на OAuth-клиента (Web application), скопируйте Client ID и вставьте ниже."
npx firebase functions:secrets:set YOUTUBE_OAUTH_CLIENT_ID --project phraseman-ea0b3
echo
echo "[YT-OAUTH] Шаг 2 из 2: скопируйте Client secret и вставьте ниже."
npx firebase functions:secrets:set YOUTUBE_OAUTH_CLIENT_SECRET --project phraseman-ea0b3
echo
echo "[YT-OAUTH] Готово. Координатор выложит сервер сам примерно за 20 секунд."
