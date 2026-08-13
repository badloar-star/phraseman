#!/bin/zsh

# Phraseman — сборка свежего development build для физического iPhone (EAS).
# Итог: ссылка/QR на установку на телефон. После установки QR от Metro
# начнёт открывать приложение сразу, без ручного ввода адреса.
#
# Нужны: аккаунт Expo и доступ к Apple Developer аккаунту.
# Время: обычно 15–25 минут на серверах Expo.
#
# Опции:
#   --register   отдельно зарегистрировать новое устройство (eas device:create)

set -u

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$HOME/.npm-global/bin:$PATH"
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
LOG_DIR="$HOME/Library/Logs/Phraseman"
LOG_FILE="$LOG_DIR/ios-devclient-build.log"
REGISTER_ONLY=0

for arg in "$@"; do
  [[ "$arg" == "--register" ]] && REGISTER_ONLY=1
done

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

say() { print -r -- "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

die() {
  say "$1"
  print
  read -r "?Нажми Enter, чтобы закрыть окно..."
  exit 1
}

clear
print '──────────────────────────────────────────────────────'
print '  Phraseman — свежий development build для iPhone (EAS)'
print '──────────────────────────────────────────────────────'
print

[[ -f "$PROJECT_ROOT/package.json" ]] || die "Не найден проект: $PROJECT_ROOT"
[[ -f "$PROJECT_ROOT/eas.json" ]] || die "Не найден eas.json в $PROJECT_ROOT"
command -v node >/dev/null 2>&1 || die "Не найден Node.js. Установи его и повтори."

cd "$PROJECT_ROOT" || die "Не удалось перейти в $PROJECT_ROOT"

# ── eas-cli ставим ОДИН раз глобально ───────────────────────────────────────
# Через npx он бы перекачивался на каждый вызов — это и есть те полторы минуты
# ожидания на каждой команде.
if ! command -v eas >/dev/null 2>&1; then
  say "eas-cli не установлен — ставлю глобально (один раз, ~1–2 минуты)..."
  if ! npm install -g eas-cli >>"$LOG_FILE" 2>&1; then
    die "Не удалось установить eas-cli. Подробности: $LOG_FILE"
  fi
  hash -r
fi
command -v eas >/dev/null 2>&1 || die "eas-cli установлен, но не найден в PATH. Открой новый Terminal и повтори."

say "eas-cli: $(eas --version 2>/dev/null | head -n 1)"
say "Проект: $PROJECT_ROOT"

# ── аккаунт Expo ────────────────────────────────────────────────────────────
if ! eas whoami >/dev/null 2>&1; then
  print
  say "Не залогинен в Expo — открываю вход."
  print
  eas login || die "Вход в Expo не выполнен."
fi
say "Аккаунт Expo: $(eas whoami 2>/dev/null | tail -n 1)"
print

# ── режим «только регистрация устройства» ───────────────────────────────────
if (( REGISTER_ONLY )); then
  say "Регистрация нового устройства. Дальше следуй подсказкам eas."
  print
  eas device:create
  print
  read -r "?Готово. Нажми Enter, чтобы закрыть окно..."
  exit 0
fi

# ── сборка ──────────────────────────────────────────────────────────────────
print '  Сейчас начнётся сборка. Что важно:'
print '    • eas может спросить про Apple-аккаунт и provisioning profile;'
print '    • если у профиля нет зарегистрированных устройств — предложит'
print '      зарегистрировать iPhone прямо в процессе, соглашайся;'
print '    • дальше сборка уходит на серверы Expo, это 15–25 минут;'
print '    • в конце появится ссылка и QR — открой их с iPhone и поставь app.'
print
print '  Окно можно свернуть, но не закрывать. Прервать: Ctrl+C.'
print '──────────────────────────────────────────────────────'
print

say "Запускаю: eas build --profile development --platform ios"
print

if ! eas build --profile development --platform ios; then
  print
  die "Сборка завершилась ошибкой. Лог сессии: $LOG_FILE"
fi

print
say "Готово. Открой ссылку на сборку с iPhone и установи приложение."
say "Потом: «Запустить Phraseman на iPhone (QR)» → скан камерой."
print
read -r "?Нажми Enter, чтобы закрыть окно..."
