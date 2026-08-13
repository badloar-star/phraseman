#!/bin/zsh

set -u
cd "$(dirname "$0")"

echo "Phraseman: собираю свежий development build для физического iPhone…"
echo "После завершения открой ссылку/QR от EAS на iPhone и установи приложение."
echo ""

npm run iphone:dev-build
status=$?

if [[ $status -ne 0 ]]; then
  echo ""
  echo "Сборка завершилась с ошибкой $status. Нажми Enter, чтобы закрыть окно."
  read
fi

exit $status
