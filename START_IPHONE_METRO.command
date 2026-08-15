#!/bin/zsh

set -u
cd "$(dirname "$0")"

NODE_BIN="$(command -v node)"

echo "Phraseman: запускаю Metro для iPhone…"
echo "Не закрывайте это окно: закрытие Terminal выключит Metro."
echo "Остановка вручную: Ctrl+C."
echo ""

launcher_args=(--lan)
if [[ " $* " != *" --clear "* ]]; then
  launcher_args+=(--clear)
fi
launcher_args+=("$@")

"$NODE_BIN" scripts/start-iphone-metro.mjs "${launcher_args[@]}"
exit_code=$?

if [[ $exit_code -ne 0 && $exit_code -ne 129 && $exit_code -ne 130 && $exit_code -ne 143 ]]; then
  echo ""
  echo "Запуск завершился с ошибкой $exit_code. Нажмите Enter, чтобы закрыть окно."
  read -r
fi

exit "$exit_code"
