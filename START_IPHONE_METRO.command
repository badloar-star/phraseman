#!/bin/zsh

set -u
cd "$(dirname "$0")"

echo "Phraseman: запускаю Metro для физического iPhone…"
echo "LAN используется по умолчанию. Для туннеля выполните:"
echo "  npm run metro:iphone:mac:tunnel"
echo ""

npm run metro:iphone:mac
status=$?

if [[ $status -ne 0 ]]; then
  echo ""
  echo "Запуск завершился с ошибкой $status. Нажмите Enter, чтобы закрыть окно."
  read
fi

exit $status
